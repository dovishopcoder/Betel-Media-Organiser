"use client";

import type { CSSProperties } from "react";
import { useLiveMedia } from "@/hooks/useLiveMedia";

export default function StageScreenPage() {
  const { background, liveState, loading } = useLiveMedia();
  const output = liveState?.outputs?.stage || liveState;
  const slide = output?.currentSlide;
  const blank = loading || output?.activeOutput === "background" || !slide || slide.type === "audio";

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
        <div className="main-output-content" aria-label="Ecran scena in repaus" />
      ) : (
        <section className="main-output-content">
          {slide.type === "video" && slide.filePath ? (
            <video className="media-output-video" src={slide.filePath} controls autoPlay />
          ) : slide.type === "presentation" && slide.filePath ? (
            <>
              <div className="main-slide-title">Prezentare atasata</div>
              <div className="main-slide-body">{slide.title}</div>
            </>
          ) : (
            <>
              <div className="main-slide-title">{slide.title}</div>
              <div className="main-slide-body">{slide.body}</div>
            </>
          )}
        </section>
      )}
    </main>
  );
}
