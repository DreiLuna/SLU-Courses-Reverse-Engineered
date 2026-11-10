// Small inline SVG icons (stand-ins for the Font Awesome icons on the real site).
const base = { viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false };

export const BackIcon = () => (<svg {...base}><path d="M10 3 5 8l5 5" /></svg>);
export const ChevronIcon = () => (<svg {...base}><path d="m6 3 5 5-5 5" /></svg>);
export const CalendarIcon = () => (<svg {...base}><rect x="2" y="3" width="12" height="11" rx="1" /><path d="M2 7h12M5 1v3M11 1v3" /></svg>);
export const LinkIcon = () => (<svg {...base}><path d="M7 9a3 3 0 0 0 4 0l2-2a3 3 0 0 0-4-4l-1 1" /><path d="M9 7a3 3 0 0 0-4 0L3 9a3 3 0 0 0 4 4l1-1" /></svg>);
export const HomeIcon = () => (<svg {...base}><path d="M2 8 8 2l6 6M4 6.5V14h8V6.5" /></svg>);
