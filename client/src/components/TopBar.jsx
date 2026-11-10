import { useTheme } from "../hooks/useTheme.js";
import { ThemeIcon } from "./Icons.jsx";

export const SITE_NAME = "Saint Louis University Course Search";
const LABELS = { system: "System", light: "Light", dark: "Dark" };

export default function TopBar({ user }) {
  const { theme, cycle } = useTheme();
  return (
    <header className="topbar">
      <a className="skip-link" href="#main">Skip to main content</a>
      <h1 className="topbar-title">
        {SITE_NAME}
        <small>class project, sample data</small>
      </h1>
      {user && <span className="topbar-user">Welcome, {user.name}</span>}
      <button
        type="button"
        className="theme-btn"
        onClick={cycle}
        aria-label={`Color theme: ${LABELS[theme]}. Change theme`}
        title="Change color theme"
      >
        <ThemeIcon theme={theme} />
        <span className="theme-label">{LABELS[theme]}</span>
      </button>
    </header>
  );
}
