"use client";

import { useLiveMedia } from "@/hooks/useLiveMedia";

export default function MainScreenPage() {
  const { liveState, loading } = useLiveMedia();
  const slide = liveState?.currentSlide;
  const blank = loading || liveState?.activeOutput === "blank" || !slide;

  return (
    <main className="screen main-output-screen">
      <div className="main-background" aria-hidden="true" />
      <div className="main-background-overlay" aria-hidden="true" />
      {blank ? (
        <div className="blank-output main-output-content">BETEL</div>
      ) : (
        <section className="main-output-content">
          <div className="main-slide-title">{slide.title}</div>
          <div className="main-slide-body">{slide.body}</div>
        </section>
      )}
    </main>
  );
}
