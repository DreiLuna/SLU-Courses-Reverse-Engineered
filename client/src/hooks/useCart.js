// Registration cart kept in localStorage, one list of CRNs per term.
// Phase 4 adds the ADD / REMOVE buttons and the cart view; the storage lives here already.
import { useCallback, useEffect, useState } from "react";

const key = (term) => `courseSearch.cart.${term}`;
const EVENT = "course-search-cart";

function read(term) {
  try {
    const v = JSON.parse(localStorage.getItem(key(term)) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(term, crns) {
  try {
    localStorage.setItem(key(term), JSON.stringify(crns));
  } catch {
    /* private mode or storage blocked: cart just won't persist */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { term } }));
}

export function useCart(term) {
  const [crns, setCrns] = useState(() => (term ? read(term) : []));

  useEffect(() => {
    if (!term) return;
    setCrns(read(term));
    const sync = (e) => { if (!e.detail || e.detail.term === term) setCrns(read(term)); };
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync); // other tabs
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, [term]);

  const add = useCallback((crn) => { const cur = read(term); if (!cur.includes(crn)) write(term, [...cur, crn]); }, [term]);
  const remove = useCallback((crn) => write(term, read(term).filter((c) => c !== crn)), [term]);
  const clear = useCallback(() => write(term, []), [term]);

  return { crns, add, remove, clear, has: (crn) => crns.includes(crn) };
}
