"use client";

import { useEffect, useState } from "react";
import { useLiveMedia } from "@/hooks/useLiveMedia";

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

export default function StageScreenPage() {
  const { liveState } = useLiveMedia();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const current = liveState?.currentSlide;
  const next = liveState?.nextSlide;

  return (
    <main className="stage-screen">
      <header className="stage-header">
        <div>
          <div className="item-type">Acum</div>
          <h1 className="title">{liveState?.currentItem?.song?.title || liveState?.currentItem?.title || "Fara element live"}</h1>
        </div>
        <div>
          <div className="item-type">Ora</div>
          <strong>{formatClock(now)}</strong>
        </div>
      </header>

      <section className="stage-box">
        <div className="item-type">Slide curent</div>
        <div className="stage-current">{current?.body || "Ecran gol"}</div>
      </section>

      <section className="stage-box">
        <div className="item-type">Slide urmator</div>
        <div className="stage-next">{next?.body || "Final / pauza"}</div>
      </section>

      <footer className="stage-footer">
        Note: {liveState?.currentItem?.notes || "Fara note pentru scena"}
      </footer>
    </main>
  );
}
