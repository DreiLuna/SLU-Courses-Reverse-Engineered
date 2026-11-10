// Full section data (with meeting times) for the CRNs in the cart, for drawing them on calendars.
import { useEffect, useState } from "react";
import { api } from "../api.js";

export function useCartSections(term, crns) {
  const key = crns.join(",");
  const [sections, setSections] = useState([]);

  useEffect(() => {
    if (!term || !key) {
      setSections([]);
      return;
    }
    let live = true;
    api.search({ term, crns: key })
      .then((r) => live && setSections(r.results.flatMap((c) => c.sections)))
      .catch(() => live && setSections([]));
    return () => { live = false; };
  }, [term, key]);

  return sections;
}
