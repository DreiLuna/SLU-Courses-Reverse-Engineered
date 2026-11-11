// "Notify me when a seat opens" for full sections. Prototype only: nothing is sent; the CRNs are
// remembered in localStorage so the button keeps saying "Notified".
import { useCallback, useEffect, useState } from "react";

const KEY = "courseSearch.notify";
const EVENT = "course-search-notify";

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function useNotify() {
  const [crns, setCrns] = useState(read);

  useEffect(() => {
    const sync = () => setCrns(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);

  const toggle = useCallback((crn) => {
    const cur = read();
    const next = cur.includes(crn) ? cur.filter((c) => c !== crn) : [...cur, crn];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage blocked */
    }
    setCrns(next);
    window.dispatchEvent(new Event(EVENT));
    return next.includes(crn);
  }, []);

  return { has: (crn) => crns.includes(crn), toggle };
}
