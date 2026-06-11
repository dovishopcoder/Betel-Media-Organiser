"use client";

import { ImageUp, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { useLiveMedia } from "@/hooks/useLiveMedia";
import type { DisplayInfo, DisplaySettings } from "@/shared/types";

export default function ScreensSettingsPage() {
  const { background, displaySettings, loading, api } = useLiveMedia();
  const [backgroundStatus, setBackgroundStatus] = useState("");
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [screenSettings, setScreenSettings] = useState<DisplaySettings>({ main: "", stage: "", control: "" });
  const [displayStatus, setDisplayStatus] = useState("");

  async function loadDisplays() {
    setDisplayStatus("Se detecteaza monitoarele...");
    const payload = await api.getDisplays();
    setDisplays(payload.displays || []);
    setScreenSettings(payload.settings || displaySettings || { main: "", stage: "", control: "" });
    setDisplayStatus(payload.displays?.length ? "Monitoarele au fost detectate." : "Nu s-au gasit monitoare prin aplicatie.");
  }

  useEffect(() => {
    if (!loading) {
      setScreenSettings(displaySettings || { main: "", stage: "", control: "" });
      loadDisplays();
    }
  }, [loading]);

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

  async function handleSaveDisplays() {
    setDisplayStatus("Se salveaza rolurile monitoarelor...");
    const response = await api.saveDisplaySettings(screenSettings);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Nu s-au putut salva monitoarele." }));
      setDisplayStatus(error.error);
      return;
    }
    setDisplayStatus("Rolurile monitoarelor au fost salvate.");
  }

  const displayOptions = [
    { value: "", label: "Alege monitor" },
    ...displays.map((display) => ({
      value: display.deviceName,
      label: `${display.deviceName.replace("\\\\.\\", "")}${display.primary ? " - principal" : ""} (${display.width}x${display.height}, ${display.x},${display.y})`
    }))
  ];

  if (loading) {
    return <div className="settings-card muted">Se incarca ecranele...</div>;
  }

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <div>
          <h2 className="title">Ecrane si fundal repaus</h2>
          <p className="muted">Configurezi imaginea de repaus si deschizi rutele pentru sala si scena.</p>
        </div>
        <Monitor size={22} />
      </div>

      <div className="settings-two-column">
        <div className="settings-card">
          <div className="item-type">Monitoare detectate</div>
          <div className="display-list">
            {displays.length ? displays.map((display) => (
              <div className="display-row" key={display.deviceName}>
                <strong>{display.deviceName.replace("\\\\.\\", "")}</strong>
                <span>{display.primary ? "Principal" : "Extins"} / {display.width}x{display.height} / pozitie {display.x},{display.y}</span>
              </div>
            )) : (
              <div className="muted">Nu sunt monitoare detectate inca.</div>
            )}
          </div>
          <button className="ghost-btn" onClick={loadDisplays}>Detecteaza din nou</button>
          <div className="muted">{displayStatus}</div>
        </div>

        <div className="settings-card">
          <div className="item-type">Roluri monitoare</div>
          <label className="settings-field">
            <span>Sala</span>
            <select value={screenSettings.main} onChange={(event) => setScreenSettings((current) => ({ ...current, main: event.target.value }))}>
              {displayOptions.map((option) => <option key={`main-${option.value}`} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="settings-field">
            <span>Scena</span>
            <select value={screenSettings.stage} onChange={(event) => setScreenSettings((current) => ({ ...current, stage: event.target.value }))}>
              {displayOptions.map((option) => <option key={`stage-${option.value}`} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="settings-field">
            <span>Operator</span>
            <select value={screenSettings.control} onChange={(event) => setScreenSettings((current) => ({ ...current, control: event.target.value }))}>
              {displayOptions.map((option) => <option key={`control-${option.value}`} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <button className="primary-btn" onClick={handleSaveDisplays}>Salveaza monitoarele</button>
          <div className="muted">Butoanele fullscreen vor folosi aceste roluri.</div>
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
          <div className="muted">Pentru sala se deschide fereastra pe monitorul dorit si se activeaza fullscreen/kiosk.</div>
        </div>
      </div>
    </section>
  );
}
