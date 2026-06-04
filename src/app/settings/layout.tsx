import { Settings, Tv } from "lucide-react";
import type { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="settings-shell">
      <aside className="settings-nav">
        <div className="brand-row">
          <Settings size={21} />
          <div>
            <h1 className="title">Setari</h1>
            <div className="muted">Pregatire inainte de serviciu</div>
          </div>
        </div>
        <a className="primary-btn settings-control-link" href="/control">
          <Tv size={17} /> Inapoi la Control Live
        </a>
        <nav className="settings-menu">
          <a href="/settings/services">Servicii</a>
          <a href="/settings/library">Biblioteca</a>
          <a href="/settings/screens">Ecrane</a>
        </nav>
      </aside>

      <section className="settings-content">{children}</section>
    </main>
  );
}
