// Small inline SVG icons (stand-ins for the Font Awesome icons on the real site).
const base = { viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false };

export const BackIcon = () => (<svg {...base}><path d="M10 3 5 8l5 5" /></svg>);
export const ChevronIcon = () => (<svg {...base}><path d="m6 3 5 5-5 5" /></svg>);
export const CalendarIcon = () => (<svg {...base}><rect x="2" y="3" width="12" height="11" rx="1" /><path d="M2 7h12M5 1v3M11 1v3" /></svg>);
export const LinkIcon = () => (<svg {...base}><path d="M7 9a3 3 0 0 0 4 0l2-2a3 3 0 0 0-4-4l-1 1" /><path d="M9 7a3 3 0 0 0-4 0L3 9a3 3 0 0 0 4 4l1-1" /></svg>);
export const HomeIcon = () => (<svg {...base}><path d="M2 8 8 2l6 6M4 6.5V14h8V6.5" /></svg>);
export const BellIcon = () => (<svg {...base}><path d="M4 11V7a4 4 0 0 1 8 0v4l1.5 1.5h-11Z" /><path d="M6.5 14a1.5 1.5 0 0 0 3 0" /></svg>);
export const WarnIcon = () => (<svg {...base}><path d="M8 2 1.5 13.5h13Z" /><path d="M8 6.5v3M8 11.5v.5" /></svg>);
export const DegreeIcon = () => (<svg {...base}><path d="M1 6 8 3l7 3-7 3Z" /><path d="M4 7.5V11c1 1 2.5 1.5 4 1.5s3-.5 4-1.5V7.5M15 6v4" /></svg>);

/** Pie showing how full a section is (Figma "seat indicator"). Decorative: callers add text for screen readers. */
export function SeatIcon({ enrolled, capacity, status }) {
  const f = status === "C" || !capacity ? 0 : Math.min(enrolled / capacity, 1);
  const level = status === "C" ? "c" : f >= 1 ? "full" : f >= 0.75 ? "most" : "open";
  const a = f * 2 * Math.PI;
  const x = 8 + 6 * Math.sin(a), y = 8 - 6 * Math.cos(a);
  return (
    <svg className={`seat-icon seat-${level}`} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.5" className="seat-ring" />
      {f >= 1 ? (
        <circle cx="8" cy="8" r="6" className="seat-fill" />
      ) : f > 0 ? (
        <path d={`M8 8V2A6 6 0 ${f > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}Z`} className="seat-fill" />
      ) : null}
    </svg>
  );
}

export const ThemeIcon = ({ theme }) =>
  theme === "dark" ? (
    <svg {...base}><path d="M13 9.5A5.5 5.5 0 0 1 6.5 3 5.5 5.5 0 1 0 13 9.5Z" /></svg>
  ) : theme === "light" ? (
    <svg {...base}><circle cx="8" cy="8" r="3" /><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1" /></svg>
  ) : (
    <svg {...base}><circle cx="8" cy="8" r="6" /><path d="M8 2a6 6 0 0 0 0 12Z" fill="currentColor" /></svg>
  );
