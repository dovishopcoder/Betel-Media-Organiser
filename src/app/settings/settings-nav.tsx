"use client";

import { BookOpen, Monitor, Settings, Tv, Workflow } from "lucide-react";
import { usePathname } from "next/navigation";

const settingsLinks = [
  { href: "/settings/services", label: "Servicii", icon: Workflow },
  { href: "/settings/library", label: "Biblioteca", icon: BookOpen },
  { href: "/settings/screens", label: "Ecrane", icon: Monitor }
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <aside className="settings-nav">
      <div className="brand-row">
        <div className="brand-icon">
          <Settings size={19} />
        </div>
        <div>
          <h1 className="title">Setari</h1>
          <div className="muted">Pregatire</div>
        </div>
      </div>

      <a className="primary-btn settings-control-link" href="/control">
        <Tv size={17} /> Control Live
      </a>

      <nav className="settings-menu">
        {settingsLinks.map((link) => {
          const Icon = link.icon;
          return (
            <a className={pathname === link.href ? "active" : ""} href={link.href} key={link.href}>
              <Icon size={17} />
              <span>{link.label}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
