import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api.js";
import { EMPTY_CRITERIA, toParams, describe } from "./criteria.js";
import { useCart } from "./hooks/useCart.js";
import TopBar from "./components/TopBar.jsx";
import SearchPanel from "./components/SearchPanel.jsx";
import ResultsPanel from "./components/ResultsPanel.jsx";
import DetailsPanel from "./components/DetailsPanel.jsx";
import WelcomeCard from "./components/WelcomeCard.jsx";
import Slide from "./components/Slide.jsx";

const isStacked = () => window.matchMedia("(max-width: 900px)").matches;

export default function App() {
  const [boot, setBoot] = useState({ status: "loading" }); // terms, options, user
  const [term, setTerm] = useState("");
  const [criteria, setCriteria] = useState(EMPTY_CRITERIA);
  const [view, setView] = useState("home"); // "home" | "results"
  const [results, setResults] = useState({ status: "idle" });
  const [run, setRun] = useState(null); // { title, rows } describing the last search
  const [selected, setSelected] = useState(null); // { code, crn } (kept while the panel slides out)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState({ status: "idle" });
  const reqId = useRef(0);
  const resultsHeading = useRef(null);
  const detailsHeading = useRef(null);
  const cart = useCart(term);

  useEffect(() => {
    Promise.all([api.terms(), api.options(), api.me().catch(() => null)])
      .then(([t, options, user]) => {
        setBoot({ status: "ready", terms: t.terms, options, user });
        setTerm(t.defaultTerm);
      })
      .catch((e) => setBoot({ status: "error", error: e.message }));
  }, []);

  // Load course details when the selected course or the term changes (switching sections reuses the data).
  const selectedCode = selected?.code;
  useEffect(() => {
    if (!selectedCode || !term || !detailsOpen) return;
    let live = true;
    setDetails((d) => ({ ...d, status: "loading" }));
    api.course(selectedCode, term)
      .then((data) => live && setDetails({ status: "done", data }))
      .catch((e) => live && setDetails({ status: "error", error: e.message }));
    return () => { live = false; };
  }, [selectedCode, term, detailsOpen]);

  // Move focus to a panel when it opens, so keyboard and screen reader users land in it.
  useEffect(() => {
    if (!detailsOpen) return;
    detailsHeading.current?.focus({ preventScroll: true });
  }, [detailsOpen, selectedCode]);

  // Stacked (phone) layout: bring the details into view once they've loaded (the panel is too short before that).
  const detailsReady = details.status === "done";
  useEffect(() => {
    if (detailsOpen && detailsReady && isStacked()) {
      detailsHeading.current?.closest(".panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [detailsOpen, detailsReady, selectedCode]);

  const taken = useMemo(() => new Set(boot.user?.taken ?? []), [boot.user]);

  if (boot.status === "loading") return <p style={{ color: "#fff", padding: 16 }}>Loading...</p>;
  if (boot.status === "error") {
    return <p className="error-box" style={{ margin: 16 }} role="alert">Could not reach the course API: {boot.error}. Is the server running?</p>;
  }

  const { terms, options, user } = boot;
  const termName = (code) => terms.find((t) => t.code === code)?.name ?? code;

  // Ignores responses from older requests if the user searches again quickly.
  async function runSearch(params, meta) {
    const id = ++reqId.current;
    setView("results");
    setDetailsOpen(false);
    setRun(meta);
    setResults({ status: "loading" });
    try {
      const data = await api.search(params);
      if (id === reqId.current) setResults({ status: "done", data, emptyMessage: meta.emptyMessage });
    } catch (e) {
      if (id === reqId.current) setResults({ status: "error", error: e.message });
    }
  }

  function search(c = criteria, t = term) {
    runSearch(toParams(c, t, cart.crns), {
      title: "Search Results",
      rows: describe(c, { options, termName: termName(t) }),
    });
  }

  function reset() {
    reqId.current++;
    setCriteria(EMPTY_CRITERIA);
    setView("home");
    setDetailsOpen(false);
    setResults({ status: "idle" });
  }

  function showCart() {
    const meta = {
      title: "Primary Cart",
      rows: [["Term", termName(term)], ["Cart", "Primary"]],
      emptyMessage: "Your cart is empty. Open a course and use ADD TO CART.",
    };
    if (!cart.crns.length) {
      reqId.current++;
      setView("results");
      setDetailsOpen(false);
      setRun(meta);
      setResults({ status: "done", data: { count: 0, sectionCount: 0, results: [] }, emptyMessage: meta.emptyMessage });
      return;
    }
    runSearch({ term, crns: cart.crns.join(",") }, meta);
  }

  function changeTerm(t) {
    setTerm(t);
    if (view === "results") search(criteria, t);
  }

  function pickSuggestion(code) {
    const c = { ...EMPTY_CRITERIA, q: code };
    setCriteria(c);
    search(c);
  }

  function openCourse(code, crn = null) {
    if (code !== selected?.code) setDetails({ status: "loading" });
    setSelected({ code, crn });
    setDetailsOpen(true);
  }

  function closeDetails() {
    setDetailsOpen(false);
    resultsHeading.current?.focus({ preventScroll: true });
  }

  function backToHome() {
    setDetailsOpen(false);
    setView("home");
  }

  return (
    <div className="app">
      <TopBar user={user} />
      <main className={`panels${view === "results" && detailsOpen ? " details-open" : ""}`}>
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
            title={run?.title}
            criteriaRows={run?.rows}
            onBack={backToHome}
            selected={detailsOpen ? selected : null}
            onSelect={openCourse}
            taken={taken}
          />
        </Slide>
        <Slide show={view === "results" && detailsOpen} className="slide-details">
          <DetailsPanel
            ref={detailsHeading}
            state={details}
            crn={selected?.crn}
            termName={termName(term)}
            onSelectSection={(crn) => setSelected((s) => ({ ...s, crn }))}
            onOpenCourse={(code) => openCourse(code)}
            onClose={closeDetails}
            cart={cart}
            taken={taken}
          />
        </Slide>
      </main>
    </div>
  );
}
