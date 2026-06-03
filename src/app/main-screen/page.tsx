"use client";

import type { CSSProperties } from "react";
import { useLiveMedia } from "@/hooks/useLiveMedia";

export default function MainScreenPage() {
  const { background, liveState, loading } = useLiveMedia();
  const slide = liveState?.currentSlide;
  const blank = loading || liveState?.activeOutput === "blank" || !slide;

  return (
    <main className={`screen main-output-screen ${blank ? "is-idle" : "is-live"}`}>
      {blank ? (
        <>
          <div
            className="main-background"
            style={{ "--main-background-url": `url("${background.url}")` } as CSSProperties}
            aria-hidden="true"
          />
          <div className="main-background-overlay" aria-hidden="true" />
        </>
      ) : null}
      {blank ? (
        <div className="main-output-content" aria-label="Ecran in repaus" />
      ) : (
        <section className="main-output-content">
          <div className="main-slide-title">{slide.title}</div>
          <div className="main-slide-body">{slide.body}</div>
        </section>
      )}
    </main>
  );
}
