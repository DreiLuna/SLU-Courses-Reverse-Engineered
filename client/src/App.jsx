import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "./api.js";
import { EMPTY_CRITERIA, toParams, describe } from "./criteria.js";
import { toQuery, fromQuery } from "./urlState.js";
import { useCart } from "./hooks/useCart.js";
import { copyText } from "./clipboard.js";
import TopBar from "./components/TopBar.jsx";
import SearchPanel from "./components/SearchPanel.jsx";
import ResultsPanel from "./components/ResultsPanel.jsx";
import DetailsPanel from "./components/DetailsPanel.jsx";
import WelcomeCard from "./components/WelcomeCard.jsx";
import Slide from "./components/Slide.jsx";

const isStacked = () => window.matchMedia("(max-width: 900px)").matches;
const EMPTY_RESULT = { count: 0, sectionCount: 0, results: [] };

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [boot, setBoot] = useState({ status: "loading" }); // terms, options, user
  const [term, setTerm] = useState("");
  const [criteria, setCriteria] = useState(EMPTY_CRITERIA); // the form (may differ from the URL until SEARCH)
  const [results, setResults] = useState({ status: "idle" });
  const [details, setDetails] = useState({ status: "idle" });
  const [nonce, setNonce] = useState(0); // bump to re-run the same search
  const [toast, setToast] = useState("");
  const reqId = useRef(0);
  const lastCode = useRef(null); // keeps the details panel filled while it slides out
  const resultsHeading = useRef(null);
  const detailsHeading = useRef(null);
  const cart = useCart(term);

  const ready = boot.status === "ready";
  const url = useMemo(() => fromQuery(location.search), [location.search]);
  // A term from the URL is only trusted if it exists.
  const urlTerm = ready ? (boot.terms.some((t) => t.code === url.term) ? url.term : boot.defaultTerm) : "";
  const view = url.mode === "home" ? "home" : "results";
  const detailsOpen = view === "results" && Boolean(url.code);
  if (url.code) lastCode.current = url.code;
  const selected = url.code ? { code: url.code, crn: url.crn } : lastCode.current ? { code: lastCode.current, crn: null } : null;

  /* ---------- boot ---------- */
  useEffect(() => {
    Promise.all([api.terms(), api.options(), api.me().catch(() => null)])
      .then(([t, options, user]) => {
        setBoot({ status: "ready", terms: t.terms, defaultTerm: t.defaultTerm, options, user });
        // Only fill in the default; a term from the URL (set by the effect below) must win.
        setTerm((cur) => cur || t.defaultTerm);
      })
      .catch((e) => setBoot({ status: "error", error: e.message }));
  }, []);

  /* ---------- URL -> form state (page load, back/forward, our own navigation) ---------- */
  useEffect(() => {
    if (!ready || url.mode === "home") return;
    setTerm(urlTerm);
    if (url.mode === "search") setCriteria(url.criteria);
  }, [ready, location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- URL -> results ---------- */
  const cartKey = cart.crns.join(",");
  const runKey = JSON.stringify([url.mode, urlTerm, url.mode === "search" ? url.criteria : url.shared ?? cartKey, nonce]);
  useEffect(() => {
    if (!ready) return;
    if (url.mode === "home") {
      reqId.current++;
      setResults({ status: "idle" });
      return;
    }
    if (term !== urlTerm) return; // wait for the term (and that term's cart) to catch up

    const termName = boot.terms.find((t) => t.code === urlTerm)?.name ?? urlTerm;
    if (url.mode === "cart") {
      const crns = url.shared ?? cart.crns;
      const meta = url.shared
        ? { title: "Shared Cart", rows: [["Term", termName], ["Cart", "Shared with you"]], emptyMessage: "None of the shared sections exist in this term.", isCart: true }
        : { title: "Primary Cart", rows: [["Term", termName], ["Cart", "Primary"]], emptyMessage: "Your cart is empty. Open a course and use ADD TO CART.", isCart: true };
      if (!crns.length) {
        reqId.current++;
        setResults({ status: "done", data: EMPTY_RESULT, ...meta });
      } else {
        runSearch({ term: urlTerm, crns: crns.join(",") }, meta);
      }
      return;
    }
    runSearch(toParams(url.criteria, urlTerm, cart.crns), {
      title: "Search Results",
      rows: describe(url.criteria, { options: boot.options, termName }),
    });
  }, [ready, runKey, term]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- course details ---------- */
  const selectedCode = selected?.code;
  useEffect(() => {
    if (!selectedCode || !term || !detailsOpen || term !== urlTerm) return;
    let live = true;
    setDetails((d) => (d.data?.course.code === selectedCode ? { ...d, status: "loading" } : { status: "loading" }));
    api.course(selectedCode, term)
      .then((data) => live && setDetails({ status: "done", data }))
      .catch((e) => live && setDetails({ status: "error", error: e.message }));
    return () => { live = false; };
  }, [selectedCode, term, urlTerm, detailsOpen]);

  // Move focus into the details panel when it opens, so keyboard and screen reader users land there.
  useEffect(() => {
    if (detailsOpen) detailsHeading.current?.focus({ preventScroll: true });
  }, [detailsOpen, selectedCode]);

  // Stacked (phone) layout: bring the details into view once they've loaded.
  const detailsReady = details.status === "done";
  useEffect(() => {
    if (detailsOpen && detailsReady && isStacked()) {
      detailsHeading.current?.closest(".panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [detailsOpen, detailsReady, selectedCode]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const taken = useMemo(() => new Set(boot.user?.taken ?? []), [boot.user]);
  const cartSet = useMemo(() => new Set(cart.crns), [cart.crns]);

  if (boot.status === "loading") return <p style={{ color: "#fff", padding: 16 }}>Loading...</p>;
  if (boot.status === "error") {
    return <p className="error-box" style={{ margin: 16 }} role="alert">Could not reach the course API: {boot.error}. Is the server running?</p>;
  }

  const { terms, options, user } = boot;
  const termName = (code) => terms.find((t) => t.code === code)?.name ?? code;

  // Ignores responses from older requests if the user searches again quickly.
  async function runSearch(params, meta) {
    const id = ++reqId.current;
    setResults((r) => ({ ...meta, status: "loading", data: r.data }));
    try {
      const data = await api.search(params);
      if (id === reqId.current) setResults({ ...meta, status: "done", data });
    } catch (e) {
      if (id === reqId.current) setResults({ ...meta, status: "error", error: e.message });
    }
  }

  /* ---------- actions: each one just changes the URL ---------- */
  const go = (state, { replace = false } = {}) => {
    const q = toQuery(state);
    if (q === location.search || (q === "" && location.search === "")) {
      setNonce((n) => n + 1); // same URL: run it again
      return;
    }
    navigate({ pathname: "/", search: q }, { replace });
  };
  const here = { mode: url.mode, term: urlTerm, criteria: url.criteria, shared: url.shared };

  function search(c = criteria, t = term) {
    go({ mode: "search", term: t, criteria: c });
  }

  function reset() {
    setCriteria(EMPTY_CRITERIA);
    if (location.search) navigate("/");
  }

  function showCart() {
    go({ mode: "cart", term });
  }

  function changeTerm(t) {
    setTerm(t);
    if (url.mode === "search") go({ mode: "search", term: t, criteria });
    else if (url.mode === "cart") go({ mode: "cart", term: t });
  }

  function pickSuggestion(code) {
    const c = { ...EMPTY_CRITERIA, q: code };
    setCriteria(c);
    search(c);
  }

  function openCourse(code, crn = null) {
    // New course: new history entry (Back closes it). Same course, other section: replace.
    navigate({ search: toQuery({ ...here, code, crn }) }, { replace: code === url.code });
  }

  function selectSection(crn) {
    navigate({ search: toQuery({ ...here, code: url.code, crn }) }, { replace: true });
  }

  function closeDetails() {
    navigate({ search: toQuery(here) });
    resultsHeading.current?.focus({ preventScroll: true });
  }

  async function copyLink(withCourse) {
    // Your own cart is shared by putting its CRNs in the link (otherwise the other person sees their own cart).
    const ownCart = url.mode === "cart" && !url.shared;
    const base = ownCart ? { ...here, shared: cart.crns } : here;
    const q = toQuery(withCourse ? { ...base, code: url.code, crn: url.crn } : base);
    const ok = await copyText(window.location.origin + "/" + q);
    const what = withCourse ? "this course" : url.mode === "cart" ? "this cart" : "this search";
    setToast(ok ? `Link to ${what} copied` : "Could not copy. Use the address bar instead.");
  }

  // Cart totals come from the cart view's own results (all cart sections are in it).
  const cartSections = results.isCart && results.data ? results.data.results.flatMap((c) => c.sections) : [];
  const credits = cartSections.reduce((sum, s) => sum + s.credits, 0);
  let cartSummary = null;
  if (results.isCart && url.shared) {
    const missing = cartSections.filter((s) => !cart.has(s.crn));
    cartSummary = {
      shared: true,
      count: cartSections.length,
      credits,
      missing: missing.length,
      onAddAll: () => {
        missing.forEach((s) => cart.add(s.crn));
        setToast(`Added ${missing.length} section${missing.length === 1 ? "" : "s"} to your cart`);
      },
    };
  } else if (results.isCart) {
    cartSummary = {
      count: cart.crns.length,
      credits,
      onClear: () => {
        if (window.confirm(`Remove all ${cart.crns.length} sections from your ${termName(term)} cart?`)) cart.clear();
      },
    };
  }

  return (
    <div className="app">
      <TopBar user={user} />
      <main className={`panels${detailsOpen ? " details-open" : ""}`}>
        <SearchPanel
          terms={terms}
          term={term}
          onTermChange={changeTerm}
          options={options}
          criteria={criteria}
          setCriteria={setCriteria}
          onSearch={() => search()}
          onReset={reset}
          onShowCart={showCart}
          cartCount={cart.crns.length}
          searching={results.status === "loading"}
        />
        {view === "home" && <WelcomeCard term={term} termName={termName(term)} onPick={pickSuggestion} />}
        <Slide show={view === "results"} className="slide-results">
          <ResultsPanel
            ref={resultsHeading}
            state={results}
            title={results.title}
            criteriaRows={results.rows}
            onBack={() => navigate("/")}
            onCopyLink={() => copyLink(false)}
            selected={detailsOpen ? selected : null}
            onSelect={openCourse}
            taken={taken}
            inCart={cartSet}
            cartSummary={cartSummary}
          />
        </Slide>
        <Slide show={detailsOpen} className="slide-details">
          <DetailsPanel
            ref={detailsHeading}
            state={details}
            crn={selected?.crn}
            termName={termName(term)}
            onSelectSection={selectSection}
            onOpenCourse={(code) => openCourse(code)}
            onClose={closeDetails}
            onCopyLink={() => copyLink(true)}
            cart={cart}
            taken={taken}
          />
        </Slide>
      </main>
      <div className={`toast${toast ? " show" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
