import { useId, useState } from "react";
import { ChevronIcon } from "./Icons.jsx";

/** Collapsible section with the tan header bar. `count` shows how many fields inside are set. */
export default function Accordion({ title, count = 0, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="accordion">
      <button
        type="button"
        className="accordion-header"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <span>
          {title}
          {count > 0 && <span className="count">({count} set)</span>}
        </span>
        <ChevronIcon />
      </button>
      <div id={id} className="accordion-body" hidden={!open}>
        {children}
      </div>
    </div>
  );
}
