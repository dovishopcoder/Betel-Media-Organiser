"use client";

import { ChevronLeft, ChevronRight, ImageUp, Monitor, Square, Tv } from "lucide-react";
import { useMemo, useState } from "react";
import { useLiveMedia } from "@/hooks/useLiveMedia";
import type { ProgramItem } from "@/shared/types";

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

export default function ControlPage() {
  const { program, background, liveState, loading, api } = useLiveMedia();
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [backgroundStatus, setBackgroundStatus] = useState("");

  const selectedItem = useMemo(() => {
    const items = program?.items || [];
    return items.find((item) => item.id === selectedItemId) || liveState?.currentItem || items[0] || null;
  }, [program, selectedItemId, liveState]);

  const selectedSlides = useMemo(() => slidesForItem(selectedItem), [selectedItem]);

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
              <button
                className={`program-item ${liveState?.currentItem?.id === item.id ? "live" : ""}`}
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
              >
                <div className="item-type">{itemLabels[item.type] || item.type}</div>
                <strong>{item.title}</strong>
                {item.song ? <div className="muted">{item.song.title}</div> : null}
              </button>
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
            <div className="muted">{backgroundStatus || "Imagine folosita cand ecranul este Blank."}</div>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <div className="top-row">
          <div>
            <h2 className="title">{selectedItem?.title || "Selecteaza un element"}</h2>
            <div className="muted">{selectedItem?.notes || "Slide-urile apar aici."}</div>
          </div>
          <button className="primary-btn" onClick={() => selectedItem && api.goLive(selectedItem.id, 0)}>
            <Tv size={17} /> Go Live
          </button>
        </div>

        <div className="toolbar">
          <button className="ghost-btn" onClick={() => api.previous()} title="Previous">
            <ChevronLeft size={18} /> Previous
          </button>
          <button className="primary-btn" onClick={() => api.next()} title="Next">
            Next <ChevronRight size={18} />
          </button>
          <button className="danger-btn" onClick={() => api.clear()} title="Blank">
            <Square size={16} /> Blank
          </button>
        </div>

        <div className="slide-grid">
          {selectedSlides.map((slide, index) => (
            <button
              className={`slide-tile ${liveState?.currentItem?.id === selectedItem?.id && liveState.currentSlideIndex === index ? "active" : ""}`}
              key={slide.id}
              onClick={() => selectedItem && api.goLive(selectedItem.id, index)}
            >
              <div className="item-type">{slide.label}</div>
              <strong>{slide.title}</strong>
              <div className="slide-body-preview">{slide.body}</div>
            </button>
          ))}
        </div>
      </section>

      <aside className="live-panel">
        <div className="top-row">
          <h2 className="title">Ecrane</h2>
          <Monitor size={20} />
        </div>
        <p className="muted">Output: {liveState?.activeOutput}</p>

        <div className="screen-monitor-grid">
          <section className="screen-monitor">
            <div className="screen-monitor-header">
              <span className="item-type">Ecran principal</span>
              <a className="muted" href="/main-screen" target="_blank">Deschide</a>
            </div>
            <div className={`screen-preview main-preview ${liveState?.activeOutput === "blank" ? "idle" : ""}`}>
              {liveState?.activeOutput === "blank" || !liveState?.currentSlide ? (
                <div
                  className="screen-preview-background"
                  style={{ backgroundImage: `url("${background.url}")` }}
                />
              ) : (
                <>
                  <strong>{liveState.currentSlide.title}</strong>
                  <div>{liveState.currentSlide.body}</div>
                </>
              )}
            </div>
          </section>

          <section className="screen-monitor">
            <div className="screen-monitor-header">
              <span className="item-type">Ecran scena</span>
              <a className="muted" href="/stage-screen" target="_blank">Deschide</a>
            </div>
            <div className={`screen-preview main-preview ${liveState?.activeOutput === "blank" ? "idle" : ""}`}>
              {liveState?.activeOutput === "blank" || !liveState?.currentSlide ? (
                <div
                  className="screen-preview-background"
                  style={{ backgroundImage: `url("${background.url}")` }}
                />
              ) : (
                <>
                  <strong>{liveState.currentSlide.title}</strong>
                  <div>{liveState.currentSlide.body}</div>
                </>
              )}
            </div>
          </section>
        </div>

        <h3 className="title" style={{ marginTop: 24 }}>Urmeaza</h3>
        <div className={`program-item ${liveState?.nextSlide?.type === "idle" ? "idle-next" : ""}`}>
          <strong>{liveState?.nextSlide?.title || "Final element"}</strong>
          <div className="muted">
            {liveState?.nextSlide?.type === "idle"
              ? "Next va afisa imaginea de fundal."
              : liveState?.nextSlide?.body || "Nu exista slide urmator."}
          </div>
        </div>
      </aside>
    </main>
  );
}
