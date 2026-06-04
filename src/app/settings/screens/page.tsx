"use client";

import { ImageUp, Monitor } from "lucide-react";
import { useState } from "react";
import { useLiveMedia } from "@/hooks/useLiveMedia";

export default function ScreensSettingsPage() {
  const { background, loading, api } = useLiveMedia();
  const [backgroundStatus, setBackgroundStatus] = useState("");

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
          <p className="muted">Configurezi imaginea de repaus si deschizi rutele pentru sala si scena.</p>
        </div>
        <Monitor size={22} />
      </div>

      <div className="settings-two-column">
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
