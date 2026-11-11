// The demo student's Degree Works audit for a term. Suggested sections avoid the cart's times,
// so it refetches when the cart changes.
import { useEffect, useState } from "react";
import { api } from "../api.js";

export function useDegreeAudit(term, cartCrns) {
  const [audit, setAudit] = useState({ status: "loading" });
  const key = cartCrns.join(",");

  useEffect(() => {
    if (!term) return;
    let live = true;
    api.degree(term, cartCrns)
      .then((data) => live && setAudit({ status: "done", data }))
      .catch((e) => live && setAudit({ status: "error", error: e.message }));
    return () => { live = false; };
  }, [term, key]); // eslint-disable-line react-hooks/exhaustive-deps

  return audit;
}
