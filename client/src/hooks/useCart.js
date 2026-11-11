// Lists of CRNs kept in localStorage, one list per term:
//   useCart(term)      -> the registration cart   (courseSearch.cart.<term>)
//   usePreviews(term)  -> classes previewed on the calendar from the front-page suggestions
//                         (courseSearch.preview.<term>); not in the cart, just "what would this look like"
import { useCallback, useEffect, useState } from "react";

function makeStore(name) {
  const key = (term) => `courseSearch.${name}.${term}`;
  const EVENT = `course-search-${name}`;

  const read = (term) => {
    try {
      const v = JSON.parse(localStorage.getItem(key(term)) ?? "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };

  const write = (term, crns) => {
    try {
      localStorage.setItem(key(term), JSON.stringify(crns));
    } catch {
      /* private mode or storage blocked: the list just won't persist */
    }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { term } }));
  };

  return function useCrnList(term) {
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
    const toggle = useCallback((crn) => {
      const cur = read(term);
      const on = !cur.includes(crn);
      write(term, on ? [...cur, crn] : cur.filter((c) => c !== crn));
      return on;
    }, [term]);
    const clear = useCallback(() => write(term, []), [term]);

    return { crns, add, remove, toggle, clear, has: (crn) => crns.includes(crn) };
  };
}

export const useCart = makeStore("cart");
export const usePreviews = makeStore("preview");
