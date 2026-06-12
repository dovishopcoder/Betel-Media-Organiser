"use client";

import { ImageUp, Monitor, Play, RefreshCw, Save, Square } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLiveMedia } from "@/hooks/useLiveMedia";

type ScreenConfig = {
  operator: number;
  main: number;
  stage: number;
};

type DetectedScreen = {
  deviceName: string;
  displayIndex: number;
  label: string;
  primary: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  product?: string;
  manufacturer?: string;
  connection?: string;
};

type DisplaySettings = {
  config: ScreenConfig;
  screens: DetectedScreen[];
};

export default function ScreensSettingsPage() {
  const { background, loading, api } = useLiveMedia();
  const [backgroundStatus, setBackgroundStatus] = useState("");
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings | null>(null);
  const [screenConfig, setScreenConfig] = useState<ScreenConfig>({ operator: 1, main: 2, stage: 3 });
  const [displayStatus, setDisplayStatus] = useState("");

  const screenOptions = useMemo(() => {
    return displaySettings?.screens || [];
  }, [displaySettings]);

  async function loadDisplaySettings() {
    setDisplayStatus("Se citesc monitoarele...");
    const response = await fetch("/api/display-settings");
    const data = await response.json();
    if (!response.ok) {
      setDisplayStatus(data.error || "Nu s-au putut citi monitoarele.");
      return;
    }
    setDisplaySettings(data);
    setScreenConfig(data.config);
    setDisplayStatus("Monitoarele au fost actualizate.");
  }

  useEffect(() => {
    loadDisplaySettings();
  }, []);

  function updateScreenRole(role: keyof ScreenConfig, value: string) {
    setScreenConfig((current) => ({ ...current, [role]: Number(value) }));
  }

  async function saveDisplaySettings() {
    setDisplayStatus("Se salveaza setarea monitoarelor...");
    const response = await fetch("/api/display-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(screenConfig)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setDisplayStatus(data.error || "Nu s-a putut salva setarea.");
      return;
    }
    setDisplaySettings(data);
    setScreenConfig(data.config);
    setDisplayStatus("Setarea monitoarelor a fost salvata.");
  }

  async function launchScreen(target: "main" | "stage" | "operator") {
    const label = target === "main" ? "Sala" : target === "stage" ? "Scena" : "Operator";
    setDisplayStatus(`Se porneste ${label}...`);
    const response = await fetch("/api/display-settings/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target })
    });
    const data = await response.json().catch(() => ({}));
    setDisplayStatus(response.ok ? `${label} a fost pornit.` : data.error || `Nu s-a putut porni ${label}.`);
  }

  async function closeScreens() {
    setDisplayStatus("Se inchid ferestrele de ecran...");
    const response = await fetch("/api/display-settings/close", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setDisplayStatus(response.ok ? "Ferestrele de ecran au fost inchise." : data.error || "Nu s-au putut inchide ferestrele.");
  }

  async function handleBackgroundUpload(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setBackgroundStatus("Alege un fisier imagine.");
      return;
    }

    setBackgroundStatus("Se salveaza fundalul de repaus...");
    const reader = new FileReader();
    reader.onload = async () => {
      const response = await api.setMainBackground(String(reader.result));
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Nu s-a putut salva imaginea." }));
        setBackgroundStatus(error.error);
        return;
      }
      setBackgroundStatus("Fundalul de repaus a fost actualizat.");
    };
    reader.onerror = () => setBackgroundStatus("Nu s-a putut citi fisierul.");
    reader.readAsDataURL(file);
  }

  if (loading) {
    return <div className="settings-card muted">Se incarca ecranele...</div>;
  }

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <div>
          <h2 className="title">Ecrane si fundal repaus</h2>
          <p className="muted">Configurezi rolurile monitoarelor, pornirea fullscreen si imaginea de repaus.</p>
        </div>
        <Monitor size={22} />
      </div>

      <div className="settings-two-column">
        <div className="settings-card display-settings-card">
          <div className="item-type">Monitoare</div>
          <div className="display-role-grid">
            <label>
              <span>Operator</span>
              <select value={screenConfig.operator} onChange={(event) => updateScreenRole("operator", event.target.value)}>
                {screenOptions.map((screen) => (
                  <option key={`operator-${screen.displayIndex}`} value={screen.displayIndex}>{screen.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Sala</span>
              <select value={screenConfig.main} onChange={(event) => updateScreenRole("main", event.target.value)}>
                {screenOptions.map((screen) => (
                  <option key={`main-${screen.displayIndex}`} value={screen.displayIndex}>{screen.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Scena</span>
              <select value={screenConfig.stage} onChange={(event) => updateScreenRole("stage", event.target.value)}>
                {screenOptions.map((screen) => (
                  <option key={`stage-${screen.displayIndex}`} value={screen.displayIndex}>{screen.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="display-action-row">
            <button className="primary-btn" onClick={saveDisplaySettings}><Save size={16} /> Salveaza</button>
            <button className="ghost-btn" onClick={loadDisplaySettings}><RefreshCw size={16} /> Reciteste</button>
          </div>

          <div className="detected-screen-list">
            {screenOptions.map((screen) => (
              <div className="detected-screen" key={screen.deviceName}>
                <strong>{screen.label}</strong>
                <span>{screen.connection || "conexiune necunoscuta"} {screen.primary ? "- principal" : ""}</span>
                <small>{[screen.product, screen.manufacturer].filter(Boolean).join(" / ") || "monitor detectat"} - {screen.width}x{screen.height} la {screen.x},{screen.y}</small>
              </div>
            ))}
          </div>

          <div className="display-action-row">
            <button className="primary-btn" onClick={() => launchScreen("main")}><Play size={16} /> Porneste Sala</button>
            <button className="primary-btn" onClick={() => launchScreen("stage")}><Play size={16} /> Porneste Scena</button>
            <button className="ghost-btn" onClick={() => launchScreen("operator")}><Monitor size={16} /> Operator</button>
            <button className="ghost-btn" onClick={closeScreens}><Square size={16} /> Inchide</button>
          </div>
          <div className="muted">{displayStatus || "Alege rolul fiecarui monitor, salveaza, apoi porneste ecranele."}</div>
        </div>

        <div className="settings-card">
          <div className="item-type">Fundal repaus</div>
          <div className="background-preview settings-background-preview" style={{ backgroundImage: `url("${background.url}")` }} />
          <label className="primary-btn file-picker-btn">
            <ImageUp size={16} /> Alege imagine
            <input accept="image/jpeg,image/png,image/webp" type="file" onChange={(event) => handleBackgroundUpload(event.target.files?.[0] || null)} />
          </label>
          <div className="muted">{backgroundStatus || "Acest fundal apare cand ecranul nu primeste continut live."}</div>
        </div>

        <div className="settings-card">
          <div className="item-type">Linkuri ecrane</div>
          <div className="screen-link-list">
            <a href="/main-screen" target="_blank">Deschide ecran sala</a>
            <a href="/stage-screen" target="_blank">Deschide ecran scena</a>
          </div>
          <div className="muted">Aceste linkuri deschid rutele in browser. Pentru fullscreen pe monitorul ales foloseste butoanele de mai sus.</div>
        </div>
      </div>
    </section>
  );
}
