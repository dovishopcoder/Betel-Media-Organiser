"use client";

import { ChevronLeft, ChevronRight, Monitor, Search, Square, Tv } from "lucide-react";
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
  const { songs, program, liveState, loading, api } = useLiveMedia();
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const selectedItem = useMemo(() => {
    const items = program?.items || [];
    return items.find((item) => item.id === selectedItemId) || liveState?.currentItem || items[0] || null;
  }, [program, selectedItemId, liveState]);

  const selectedSlides = useMemo(() => slidesForItem(selectedItem), [selectedItem]);
  const filteredSongs = songs.filter((song) => song.title.toLowerCase().includes(query.toLowerCase()));

  if (loading) {
    return <main className="screen"><div className="blank-output">Se incarca panoul media...</div></main>;
  }

  return (
    <main className="control-shell">
      <aside className="sidebar">
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
          <h2 className="title">Live acum</h2>
          <Monitor size={20} />
        </div>
        <p className="muted">Output: {liveState?.activeOutput}</p>
        <div className="slide-tile active">
          <div className="item-type">{liveState?.currentSlide?.label || "blank"}</div>
          <strong>{liveState?.currentSlide?.title || "Ecran gol"}</strong>
          <div className="slide-body-preview">{liveState?.currentSlide?.body || ""}</div>
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

        <h3 className="title" style={{ marginTop: 24 }}>Biblioteca cantari</h3>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ left: 10, position: "absolute", top: 11 }} />
          <input
            className="search"
            placeholder="Cauta dupa titlu"
            style={{ paddingLeft: 34 }}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="item-list">
          {filteredSongs.slice(0, 8).map((song) => (
            <div className="song-item" key={song.id}>
              <strong>{song.title}</strong>
              <div className="muted">{song.displayOrder.length} slide-uri</div>
            </div>
          ))}
        </div>
      </aside>
    </main>
  );
}
