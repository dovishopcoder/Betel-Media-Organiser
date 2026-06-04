"use client";

import { FilePlus, ImageUp, Library, Monitor, Settings, Tv } from "lucide-react";
import { useState } from "react";
import { useLiveMedia } from "@/hooks/useLiveMedia";
import { serviceTemplateBlocks, serviceTemplates } from "@/shared/catalog";

function detectMediaTypeFromFile(file: File): "audio" | "video" | "presentation" | null {
  const extension = file.name.toLowerCase().split(".").pop() || "";
  if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(extension) || file.type.startsWith("audio/")) return "audio";
  if (["mp4", "webm", "mov", "mkv", "avi"].includes(extension) || file.type.startsWith("video/")) return "video";
  if (["ppt", "pptx", "pps", "ppsx", "pdf"].includes(extension)) return "presentation";
  return null;
}

export default function SettingsPage() {
  const { program, background, loading, refresh, api } = useLiveMedia();
  const [selectedServiceType, setSelectedServiceType] = useState(program?.serviceType || "serviciul_divin");
  const [serviceStatus, setServiceStatus] = useState("");
  const [backgroundStatus, setBackgroundStatus] = useState("");
  const [mediaType, setMediaType] = useState<"audio" | "video" | "presentation">("presentation");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaStatus, setMediaStatus] = useState("");

  const selectedService = serviceTemplates.find((service) => service.type === selectedServiceType) || serviceTemplates[2];

  async function handleCreateService() {
    setServiceStatus(`Se creeaza programul curent pentru ${selectedService.title}...`);
    const today = new Date().toISOString().slice(0, 10);
    const response = await api.createProgram({
      title: `${selectedService.title} - ${today}`,
      serviceDate: today,
      serviceType: selectedService.type
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Nu s-a putut crea serviciul." }));
      setServiceStatus(error.error);
      return;
    }

    await refresh();
    setServiceStatus(`${selectedService.title} este acum programul curent.`);
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

  function handleMediaFileChange(file: File | null) {
    setMediaFile(file);
    if (!file) return;

    const detectedType = detectMediaTypeFromFile(file);
    if (detectedType) {
      setMediaType(detectedType);
      setMediaStatus(`Tip detectat automat: ${detectedType === "presentation" ? "prezentare" : detectedType}.`);
    }
  }

  async function handleMediaUpload() {
    if (!mediaFile) {
      setMediaStatus("Alege mai intai un fisier.");
      return;
    }

    setMediaStatus("Se copiaza fisierul si se adauga in programul activ...");
    const response = await api.createMediaProgramItem({
      file: mediaFile,
      mediaType,
      title: mediaTitle.trim() || mediaFile.name
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Nu s-a putut copia fisierul." }));
      setMediaStatus(error.error);
      return;
    }

    setMediaFile(null);
    setMediaTitle("");
    await refresh();
    setMediaStatus("Fisierul a fost adaugat in programul activ.");
  }

  if (loading) {
    return <main className="settings-shell"><div className="blank-output">Se incarca setarile...</div></main>;
  }

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
          <a href="#servicii">Servicii</a>
          <a href="#biblioteca">Biblioteca</a>
          <a href="#ecrane">Ecrane</a>
        </nav>
      </aside>

      <section className="settings-content">
        <section className="settings-section" id="servicii">
          <div className="settings-section-header">
            <div>
              <h2 className="title">Servicii si template-uri</h2>
              <p className="muted">Alegi tipul de serviciu si creezi programul curent din template.</p>
            </div>
            <button className="primary-btn" onClick={handleCreateService}>Creeaza program curent</button>
          </div>

          <div className="settings-two-column">
            <div className="settings-card">
              <div className="item-type">Tip serviciu</div>
              <div className="service-type-list large">
                {serviceTemplates.map((service) => (
                  <button
                    className={selectedServiceType === service.type ? "active" : ""}
                    key={service.type}
                    onClick={() => setSelectedServiceType(service.type)}
                  >
                    <span>{service.title}</span>
                    <small>template</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-card">
              <div className="item-type">Template: {selectedService.title}</div>
              <div className="template-preview-list">
                {(serviceTemplateBlocks[selectedService.type] || []).length ? (
                  serviceTemplateBlocks[selectedService.type].map((title, index) => (
                    <div key={`${title}-${index}`}>
                      <span>{index + 1}</span>
                      <strong>{title}</strong>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">Serviciul custom porneste fara puncte implicite.</div>
                )}
              </div>
              <div className="muted">{serviceStatus || `${program?.title || "Fara serviciu activ"} este serviciul activ.`}</div>
            </div>
          </div>
        </section>

        <section className="settings-section" id="biblioteca">
          <div className="settings-section-header">
            <div>
              <h2 className="title">Biblioteca media</h2>
              <p className="muted">Pregatesti fisiere audio, video si prezentari. Pentru moment ele se copiaza local si se adauga in programul activ.</p>
            </div>
            <Library size={22} />
          </div>
          <div className="settings-card">
            <div className="media-picker-grid settings-media-grid">
              <label>
                <span className="item-type">Tip</span>
                <select value={mediaType} onChange={(event) => setMediaType(event.target.value as typeof mediaType)}>
                  <option value="presentation">Prezentare</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                </select>
              </label>
              <label>
                <span className="item-type">Titlu</span>
                <input value={mediaTitle} onChange={(event) => setMediaTitle(event.target.value)} placeholder="Titlu pentru program" />
              </label>
              <label className="primary-btn file-picker-btn">
                <FilePlus size={16} /> Alege fisier
                <input accept=".ppt,.pptx,.pdf,audio/*,video/*" type="file" onChange={(event) => handleMediaFileChange(event.target.files?.[0] || null)} />
              </label>
              <button className="primary-btn" onClick={handleMediaUpload}>Adauga</button>
            </div>
            <div className="muted">{mediaStatus || (mediaFile ? mediaFile.name : "Alege un fisier de pe calculator.")}</div>
          </div>
        </section>

        <section className="settings-section" id="ecrane">
          <div className="settings-section-header">
            <div>
              <h2 className="title">Ecrane si fundal repaus</h2>
              <p className="muted">Aplicatia afiseaza continut prin browser; fullscreen-ul si monitoarele sunt gestionate de Windows.</p>
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

      </section>
    </main>
  );
}
