import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "./api.js";
import { EMPTY_CRITERIA, toParams, describe } from "./criteria.js";
import { toQuery, fromQuery } from "./urlState.js";
import { useCart, usePreviews } from "./hooks/useCart.js";
import { useCartSections } from "./hooks/useCartSections.js";
import CalendarPanel from "./components/CalendarPanel.jsx";
import { loadMessage } from "./load.js";
import { useNotify } from "./hooks/useNotify.js";
import { useDegreeAudit } from "./hooks/useDegreeAudit.js";
import DegreeWorksDock from "./components/DegreeWorksDock.jsx";
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
  const calendarHeading = useRef(null);
  const panelsRef = useRef(null);
  const cart = useCart(term);
  const myCartSections = useCartSections(term, cart.crns);
  const preview = usePreviews(term); // suggestions tried out on the calendar, not in the cart
  const previewSections = useCartSections(term, preview.crns);
  const notify = useNotify();
  const audit = useDegreeAudit(term, cart.crns);

  const ready = boot.status === "ready";
  const url = useMemo(() => fromQuery(location.search), [location.search]);
  // A term from the URL is only trusted if it exists.
  const urlTerm = ready ? (boot.terms.some((t) => t.code === url.term) ? url.term : boot.defaultTerm) : "";
  const view = url.mode === "home" ? "home" : "results";
  const detailsOpen = view === "results" && Boolean(url.code);
  const calendarOpen = url.mode === "cart" && url.cal && !url.code;
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
        ? { title: "Shared Cart", rows: [["Semester", termName], ["Cart", "Shared with you"]], emptyMessage: "None of the shared sections exist in this semester.", isCart: true }
        : { title: "Primary Cart", rows: [["Semester", termName], ["Cart", "Primary"]], emptyMessage: "Your cart is empty. Open a course and use ADD TO CART.", isCart: true };
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

  useEffect(() => {
    if (calendarOpen) calendarHeading.current?.focus({ preventScroll: true });
  }, [calendarOpen]);

  // Phone layout shows one panel at a time (see styles.css), so each step starts at the top,
  // except going back to the results list, which returns to where you were in it.
  const screenKey = `${view}|${detailsOpen ? selectedCode : ""}|${calendarOpen}`;
  const listKey = `results||false`;
  const prevScreen = useRef({ key: "", listScroll: 0 });
  useEffect(() => {
    const el = panelsRef.current;
    const prev = prevScreen.current;
    if (el && isStacked()) {
      el.scrollTop = screenKey === listKey && prev.key.startsWith("results|") ? prev.listScroll : 0;
    }
    prev.key = screenKey;
  }, [screenKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // A preview that made it into the cart (from anywhere) is no longer a preview.
  const previewKey = preview.crns.join(",");
  useEffect(() => {
    preview.crns.filter((c) => cart.crns.includes(c)).forEach((c) => preview.remove(c));
  }, [previewKey, cart.crns.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), typeof toast === "string" ? 2500 : 4500);
    return () => clearTimeout(id);
  }, [toast]);

  const taken = useMemo(() => new Set(boot.user?.taken ?? []), [boot.user]);
  const cartSet = useMemo(() => new Set(cart.crns), [cart.crns]);
  // course code -> "Degree core" / "Degree elective", for the badges in the results
  const degreeRole = useMemo(() => {
    const m = new Map();
    if (audit.data) {
      audit.data.core.items.forEach((i) => m.set(i.code, "Degree core"));
      audit.data.electives.items.forEach((i) => m.set(i.code, "Degree elective"));
    }
    return m;
  }, [audit.data]);

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
  const here = { mode: url.mode, term: urlTerm, criteria: url.criteria, shared: url.shared, cal: url.cal };

  // Leaving the results list on a phone: remember the scroll position to come back to.
  function rememberListScroll() {
    if (prevScreen.current.key === listKey && panelsRef.current) prevScreen.current.listScroll = panelsRef.current.scrollTop;
  }

  function setCalendar(on) {
    rememberListScroll();
    navigate({ search: toQuery({ ...here, cal: on }) });
    if (!on) resultsHeading.current?.focus({ preventScroll: true });
  }

  function search(c = criteria, t = term) {
    go({ mode: "search", term: t, criteria: c });
  }

  function reset() {
    setCriteria(EMPTY_CRITERIA);
    if (location.search) navigate("/");
  }

  function showCart() {
    // The calendar is the cart's default view: conflicts and load are the first things to check.
    go({ mode: "cart", term, cal: true });
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
    rememberListScroll();
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

  // From Degree Works or a recommendation: search for that course and open the suggested section.
  function openFromDegree(code, crn) {
    const c = { ...EMPTY_CRITERIA, q: code };
    setCriteria(c);
    go({ mode: "search", term, criteria: c, code, crn });
  }

  // Full class: "Notify me" (prototype only, nothing is sent). Toast text follows the Milestone 3 design.
  function toggleNotify(course, section) {
    const on = notify.toggle(section.crn);
    setToast(
      on
        ? { title: `Notification will send to ${user?.email ?? "your SLU email"}`, detail: "You can select a backup course for safety!" }
        : { title: `Notification canceled for ${course.code} ${section.section}` },
    );
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
      load: loadMessage(credits),
      onClear: () => {
        if (window.confirm(`Remove all ${cart.crns.length} sections from your ${termName(term)} cart?`)) cart.clear();
      },
    };
  }

  return (
    <div className="app">
      <TopBar user={user} />
      <main id="main" tabIndex={-1} ref={panelsRef} className={`panels view-${view}${detailsOpen || calendarOpen ? " details-open" : ""}`}>
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
          cartCredits={myCartSections.reduce((sum, s) => sum + s.credits, 0)}
          searching={results.status === "loading"}
        />
        {view === "home" && (
          <WelcomeCard
            term={term}
            termName={termName(term)}
            onPick={pickSuggestion}
            audit={audit}
            onOpenCourse={openFromDegree}
            preview={preview}
            cartCrns={cart.crns}
            onViewCalendar={showCart}
          />
        )}
        <Slide show={view === "results"} className="slide-results">
          <ResultsPanel
            ref={resultsHeading}
            state={results}
            title={results.title}
            criteriaRows={results.rows}
            onBack={() => navigate("/")}
            onCopyLink={() => copyLink(false)}
            onToggleCalendar={results.isCart ? () => setCalendar(!url.cal || Boolean(url.code)) : undefined}
            calendarOpen={calendarOpen}
            selected={detailsOpen ? selected : null}
            onSelect={openCourse}
            taken={taken}
            inCart={cartSet}
            cartSummary={cartSummary}
            notify={notify}
            onToggleNotify={toggleNotify}
            degreeRole={degreeRole}
          />
        </Slide>
        <Slide show={detailsOpen} className="slide-details">
          <DetailsPanel
            ref={detailsHeading}
            state={details}
            crn={selected?.crn}
            termName={termName(term)}
            onSelectSection={selectSection}
            onOpenCourse={(code, crn) => openCourse(code, crn)}
            onClose={closeDetails}
            onCopyLink={() => copyLink(true)}
            cart={cart}
            cartSections={myCartSections}
            taken={taken}
            notify={notify}
            onToggleNotify={toggleNotify}
          />
        </Slide>
        <Slide show={calendarOpen} className="slide-details">
          <CalendarPanel
            ref={calendarHeading}
            title={url.shared ? "Shared Cart: Week View" : "Primary Cart: Week View"}
            sections={cartSections}
            loading={results.status === "loading"}
            term={urlTerm}
            termName={termName(urlTerm)}
            onNotify={setToast}
            onClose={() => setCalendar(false)}
            onOpenSection={openCourse}
            previewSections={url.shared ? [] : previewSections}
            onPreviewAdd={(p) => {
              cart.add(p.crn);
              preview.remove(p.crn);
              setToast(`Added ${p.courseCode} ${p.section} to your cart`);
            }}
            onPreviewRemove={(p) => preview.remove(p.crn)}
            onPreviewClear={preview.clear}
          />
        </Slide>
      </main>
      <DegreeWorksDock
        audit={audit}
        term={term}
        termName={termName(term)}
        cart={cart}
        cartSections={myCartSections}
        onOpenCourse={openFromDegree}
        onNotify={setToast}
      />
      <div className={`toast${toast ? " show" : ""}`} role="status" aria-live="polite">
        {typeof toast === "string" ? toast : toast && (
          <>
            <strong>{toast.title}</strong>
            {toast.detail && <span className="toast-detail">{toast.detail}</span>}
          </>
        )}
      </div>
    </div>
  );
}
