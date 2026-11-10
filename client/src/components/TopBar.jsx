export const SITE_NAME = "Saint Louis University Course Search";

export default function TopBar({ user }) {
  return (
    <header className="topbar">
      <h1 className="topbar-title">
        {SITE_NAME}
        <small>class project, sample data</small>
      </h1>
      {user && <span className="topbar-user">Welcome, {user.name}</span>}
    </header>
  );
}
