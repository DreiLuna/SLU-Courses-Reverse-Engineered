// Small inline SVG icons (stand-ins for the Font Awesome icons on the real site).
const base = { viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false };

export const BackIcon = () => (<svg {...base}><path d="M10 3 5 8l5 5" /></svg>);
export const ChevronIcon = () => (<svg {...base}><path d="m6 3 5 5-5 5" /></svg>);
export const CalendarIcon = () => (<svg {...base}><rect x="2" y="3" width="12" height="11" rx="1" /><path d="M2 7h12M5 1v3M11 1v3" /></svg>);
export const LinkIcon = () => (<svg {...base}><path d="M7 9a3 3 0 0 0 4 0l2-2a3 3 0 0 0-4-4l-1 1" /><path d="M9 7a3 3 0 0 0-4 0L3 9a3 3 0 0 0 4 4l1-1" /></svg>);
export const HomeIcon = () => (<svg {...base}><path d="M2 8 8 2l6 6M4 6.5V14h8V6.5" /></svg>);
export const ThemeIcon = ({ theme }) =>
  theme === "dark" ? (
    <svg {...base}><path d="M13 9.5A5.5 5.5 0 0 1 6.5 3 5.5 5.5 0 1 0 13 9.5Z" /></svg>
  ) : theme === "light" ? (
    <svg {...base}><circle cx="8" cy="8" r="3" /><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1" /></svg>
  ) : (
    <svg {...base}><circle cx="8" cy="8" r="6" /><path d="M8 2a6 6 0 0 0 0 12Z" fill="currentColor" /></svg>
  );
