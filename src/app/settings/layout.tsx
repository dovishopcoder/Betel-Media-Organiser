import type { ReactNode } from "react";
import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="settings-shell">
      <SettingsNav />
      <section className="settings-content">{children}</section>
    </main>
  );
}
