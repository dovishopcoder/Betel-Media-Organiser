"use client";

import { ChevronLeft, ChevronRight, FilePlus, ImageUp, Monitor, Pause, Play, RotateCcw, Square, Tv } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLiveMedia } from "@/hooks/useLiveMedia";
import type { ProgramItem, Slide } from "@/shared/types";

const itemLabels: Record<string, string> = {
  song: "Cantare",
  prayer: "Rugaciune",
  sermon: "Predica",
  presentation: "Prezentare",
  announcements: "Anunturi",
  video: "Video",
  pause: "Pauza",
  special: "Moment special"
};

function slidesForItem(item: ProgramItem | null) {
  if (!item) return [];
  if (item.type === "song" && item.song) {
    return item.song.displayOrder.map((key, index) => ({
      id: `${item.id}-${key}-${index}`,
      title: item.song?.title || item.title,
      label: key,
      body: item.song?.sections[key] || "",
      sortOrder: index
    }));
  }

  return [{
    id: `${item.id}-single`,
    title: item.title,
    label: item.type,
    body: item.notes || item.title,
    sortOrder: 0
  }];
}

function detectMediaTypeFromFile(file: File): "audio" | "video" | "presentation" | null {
  const extension = file.name.toLowerCase().split(".").pop() || "";
  if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(extension) || file.type.startsWith("audio/")) {
    return "audio";
  }
  if (["mp4", "webm", "mov", "mkv", "avi"].includes(extension) || file.type.startsWith("video/")) {
    return "video";
  }
  if (["ppt", "pptx", "pps", "ppsx", "pdf"].includes(extension)) {
    return "presentation";
  }
  return null;
}

export default function ControlPage() {
  const { program, background, liveState, loading, api } = useLiveMedia();
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [backgroundStatus, setBackgroundStatus] = useState("");
  const [mediaType, setMediaType] = useState<"audio" | "video" | "presentation">("presentation");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaStatus, setMediaStatus] = useState("");
  const [serverSlides, setServerSlides] = useState<Slide[] | null>(null);

  const selectedItem = useMemo(() => {
    const items = program?.items || [];
    return items.find((item) => item.id === selectedItemId) || liveState?.currentItem || items[0] || null;
  }, [program, selectedItemId, liveState]);

  const fallbackSlides = useMemo(() => slidesForItem(selectedItem), [selectedItem]);
  const selectedSlides = serverSlides || fallbackSlides;
  const mainOutput = liveState?.outputs?.main || liveState;
  const stageOutput = liveState?.outputs?.stage || liveState;
  const activeAudio = mainOutput?.currentSlide?.type === "audio" && mainOutput.currentSlide.filePath
    ? mainOutput.currentSlide
    : stageOutput?.currentSlide?.type === "audio" && stageOutput.currentSlide.filePath
      ? stageOutput.currentSlide
      : null;
  const mainVideoLive = mainOutput?.activeOutput === "program" && mainOutput.currentSlide?.type === "video" && mainOutput.currentSlide.filePath;
  const stageVideoLive = stageOutput?.activeOutput === "program" && stageOutput.currentSlide?.type === "video" && stageOutput.currentSlide.filePath;
  const activeVideo = mainVideoLive
    ? mainOutput.currentSlide
    : stageVideoLive
      ? stageOutput.currentSlide
      : null;
  const activeVideoTarget = mainVideoLive && stageVideoLive ? "both" : mainVideoLive ? "main" : "stage";

  useEffect(() => {
    let mounted = true;
    setServerSlides(null);

    if (!selectedItem) return;

    api.getProgramItemSlides(selectedItem.id).then((slides) => {
      if (mounted) setServerSlides(slides.length ? slides : null);
    });

    return () => {
      mounted = false;
    };
  }, [api, selectedItem]);

  async function handleBackgroundUpload(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setBackgroundStatus("Alege un fisier imagine.");
      return;
    }

    setBackgroundStatus("Se incarca imaginea...");
    const reader = new FileReader();
    reader.onload = async () => {
      const response = await api.setMainBackground(String(reader.result));
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Nu s-a putut salva imaginea." }));
        setBackgroundStatus(error.error);
        return;
      }
      setBackgroundStatus("Imaginea de fundal a fost actualizata.");
    };
    reader.onerror = () => setBackgroundStatus("Nu s-a putut citi fisierul.");
    reader.readAsDataURL(file);
  }

  async function handleMediaUpload() {
    if (!mediaFile) {
      setMediaStatus("Alege mai intai un fisier local.");
      return;
    }

    setMediaStatus("Se copiaza fisierul in biblioteca aplicatiei...");
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
    setMediaStatus("Fisierul a fost copiat si adaugat in program.");
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

  if (loading) {
    return <main className="screen"><div className="blank-output">Se incarca panoul media...</div></main>;
  }

  return (
    <main className="control-shell">
      <aside className="sidebar">
        <div className="sidebar-main">
          <div className="top-row">
            <h1 className="title">Program serviciu</h1>
            <a className="muted" href="/main-screen" target="_blank">Main</a>
            <a className="muted" href="/stage-screen" target="_blank">Stage</a>
          </div>
          <p className="muted">{program?.title || "Fara program activ"} - {program?.service_date}</p>
          <div className="item-list">
            {program?.items.map((item) => (
              <div
                className={`program-item ${liveState?.currentItem?.id === item.id ? "live" : ""}`}
                key={item.id}
              >
                <button className="program-select" onClick={() => setSelectedItemId(item.id)}>
                  <div className="item-type">{itemLabels[item.type] || item.type}</div>
                  <strong>{item.title}</strong>
                  {item.song ? <div className="muted">{item.song.title}</div> : null}
                </button>
                <div className="program-send-actions">
                  <button onClick={() => api.goLive(item.id, 0, "main")}>Sala</button>
                  <button onClick={() => api.goLive(item.id, 0, "stage")}>Scena</button>
                  <button onClick={() => api.goLive(item.id, 0, "both")}>Ambele</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <h3 className="title">Fundal repaus</h3>
          <div className="background-picker">
            <div
              className="background-preview"
              style={{ backgroundImage: `url("${background.url}")` }}
            />
            <label className="primary-btn file-picker-btn">
              <ImageUp size={16} /> Alege imagine
              <input
                accept="image/jpeg,image/png,image/webp"
                type="file"
                onChange={(event) => handleBackgroundUpload(event.target.files?.[0] || null)}
              />
            </label>
            <div className="muted">{backgroundStatus || "Imagine folosita cand ecranul este pe Fundal."}</div>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <div className="top-row">
          <div>
            <h2 className="title">{selectedItem?.title || "Selecteaza un element"}</h2>
            <div className="muted">{selectedItem?.notes || "Slide-urile apar aici."}</div>
          </div>
          <button className="primary-btn" onClick={() => selectedItem && api.goLive(selectedItem.id, 0, "both")}>
            <Tv size={17} /> Go Live ambele
          </button>
        </div>

        <div className="toolbar">
          <button className="ghost-btn" onClick={() => api.previous()} title="Previous">
            <ChevronLeft size={18} /> Previous
          </button>
          <button className="primary-btn" onClick={() => api.next()} title="Next">
            Next <ChevronRight size={18} />
          </button>
          <button className="danger-btn" onClick={() => api.clear("both")} title="Fundal">
            <Square size={16} /> Fundal ambele
          </button>
        </div>

        <div className="slide-grid">
          {selectedSlides.map((slide, index) => (
            <button
              className={`slide-tile ${liveState?.currentItem?.id === selectedItem?.id && liveState.currentSlideIndex === index ? "active" : ""}`}
              key={slide.id}
              onClick={() => selectedItem && api.goLive(selectedItem.id, index, "both")}
            >
              <div className="item-type">{slide.label}</div>
              <strong>{slide.title}</strong>
              <div className="slide-body-preview">{slide.body}</div>
            </button>
          ))}
        </div>

        <section className="media-picker-panel">
          <div className="top-row">
            <div>
              <h3 className="title">Alege fisier local</h3>
              <div className="muted">Audio, video sau prezentare. Aplicatia pastreaza automat o copie pentru program.</div>
            </div>
            <FilePlus size={20} />
          </div>
          <div className="media-picker-grid">
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
              <input
                placeholder="Titlu afisat in program"
                value={mediaTitle}
                onChange={(event) => setMediaTitle(event.target.value)}
              />
            </label>
            <div className="media-file-field">
              <span className="item-type">Fisier local</span>
              <label className="primary-btn file-picker-btn">
                <FilePlus size={16} /> Alege fisier
                <input
                  accept=".ppt,.pptx,.pdf,audio/*,video/*"
                  type="file"
                  onChange={(event) => handleMediaFileChange(event.target.files?.[0] || null)}
                />
              </label>
            </div>
            <button className="primary-btn" onClick={handleMediaUpload}>
              Adauga in program
            </button>
          </div>
          <div className="muted">{mediaStatus || (mediaFile ? mediaFile.name : "Alege un fisier de pe calculator; aplicatia il copiaza local.")}</div>
        </section>
      </section>

      <aside className="live-panel">
        <div className="top-row">
          <h2 className="title">Ecrane</h2>
          <Monitor size={20} />
        </div>
        <p className="muted">Alege separat ce apare pe fiecare ecran.</p>

        {activeAudio ? (
          <section className="audio-control-panel">
            <div className="item-type">Redare audio</div>
            <strong>{activeAudio.title}</strong>
            <audio key={activeAudio.filePath} src={activeAudio.filePath || ""} controls autoPlay />
            <div className="muted">Ecranele raman pe fundal; sunetul se reda din panoul operator.</div>
          </section>
        ) : null}

        {activeVideo ? (
          <section className="video-control-panel">
            <div className="item-type">Control video</div>
            <strong>{activeVideo.title}</strong>
            <div className="video-control-actions">
              <button className="primary-btn" onClick={() => api.videoControl(activeVideoTarget, "play")}>
                <Play size={16} /> Play
              </button>
              <button className="ghost-btn" onClick={() => api.videoControl(activeVideoTarget, "pause")}>
                <Pause size={16} /> Pause
              </button>
              <button className="ghost-btn" onClick={() => api.videoControl(activeVideoTarget, "restart")}>
                <RotateCcw size={16} /> Restart
              </button>
            </div>
            <div className="muted">Video-ul ruleaza pe ecranul selectat; comenzile se trimit din panoul operator.</div>
          </section>
        ) : null}

        <div className="screen-monitor-grid">
          <section className="screen-monitor">
            <div className="screen-monitor-header">
              <span className="item-type">Ecran principal</span>
              <a className="muted" href="/main-screen" target="_blank">Deschide</a>
            </div>
            <div className={`screen-preview main-preview ${mainOutput?.activeOutput === "background" ? "idle" : ""}`}>
              {mainOutput?.activeOutput === "background" || !mainOutput?.currentSlide ? (
                <div
                  className="screen-preview-background"
                  style={{ backgroundImage: `url("${background.url}")` }}
                />
              ) : (
                <>
                  <strong>{mainOutput.currentSlide.title}</strong>
                  <div>{mainOutput.currentSlide.body}</div>
                </>
              )}
            </div>
            <div className="screen-actions">
              <button className="ghost-btn" onClick={() => selectedItem && api.goLive(selectedItem.id, 0, "main")}>Trimite selectia</button>
              <button className="ghost-btn" onClick={() => api.clear("main")}>Fundal</button>
            </div>
          </section>

          <section className="screen-monitor">
            <div className="screen-monitor-header">
              <span className="item-type">Ecran scena</span>
              <a className="muted" href="/stage-screen" target="_blank">Deschide</a>
            </div>
            <div className={`screen-preview main-preview ${stageOutput?.activeOutput === "background" ? "idle" : ""}`}>
              {stageOutput?.activeOutput === "background" || !stageOutput?.currentSlide ? (
                <div
                  className="screen-preview-background"
                  style={{ backgroundImage: `url("${background.url}")` }}
                />
              ) : (
                <>
                  <strong>{stageOutput.currentSlide.title}</strong>
                  <div>{stageOutput.currentSlide.body}</div>
                </>
              )}
            </div>
            <div className="screen-actions">
              <button className="ghost-btn" onClick={() => selectedItem && api.goLive(selectedItem.id, 0, "stage")}>Trimite selectia</button>
              <button className="ghost-btn" onClick={() => api.clear("stage")}>Fundal</button>
            </div>
          </section>
        </div>

        <h3 className="title" style={{ marginTop: 24 }}>Urmeaza</h3>
        <div className={`program-item ${mainOutput?.nextSlide?.type === "idle" ? "idle-next" : ""}`}>
          <strong>{mainOutput?.nextSlide?.title || "Final element"}</strong>
          <div className="muted">
            {mainOutput?.nextSlide?.type === "idle"
              ? "Next va afisa imaginea de fundal."
              : mainOutput?.nextSlide?.body || "Nu exista slide urmator."}
          </div>
        </div>
      </aside>
    </main>
  );
}
