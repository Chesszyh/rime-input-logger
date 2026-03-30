import type { ReactNode } from "react";

interface AppShellProps {
  sidebar: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
}

export const AppShell = ({ sidebar, topbar, children }: AppShellProps) => (
  <div className="app-shell">
    <div className="app-shell__frame">
      <aside className="app-shell__sidebar">{sidebar}</aside>
      <div className="app-shell__main">
        <header className="app-shell__topbar">{topbar}</header>
        <div className="app-shell__content">{children}</div>
      </div>
    </div>
  </div>
);
