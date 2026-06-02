"use client";

import { useLiveMedia } from "@/hooks/useLiveMedia";

export default function MainScreenPage() {
  const { liveState, loading } = useLiveMedia();
  const slide = liveState?.currentSlide;
  const blank = loading || liveState?.activeOutput === "blank" || !slide;

  return (
    <main className="screen">
      {blank ? (
        <div className="blank-output">BETEL</div>
      ) : (
        <section>
          <div className="main-slide-title">{slide.title}</div>
          <div className="main-slide-body">{slide.body}</div>
        </section>
      )}
    </main>
  );
}
