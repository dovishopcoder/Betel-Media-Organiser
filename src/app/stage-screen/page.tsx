"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { getLiveMediaSocket, useLiveMedia } from "@/hooks/useLiveMedia";

type VideoCommand = {
  target: "main" | "stage" | "both";
  action: "play" | "pause" | "restart" | "seek";
  seconds?: number;
};

export default function StageScreenPage() {
  const { background, liveState, loading } = useLiveMedia();
  const output = liveState?.outputs?.stage || liveState;
  const slide = output?.currentSlide;
  const blank = loading || output?.activeOutput === "background" || !slide || slide.type === "audio";
  const idleBackgroundUrl = slide?.type === "audio" && slide.backgroundFilePath ? slide.backgroundFilePath : background.url;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (slide?.type !== "video" || !video) return;

    video.currentTime = 0;
    video.play().catch(() => undefined);
  }, [slide?.filePath, slide?.type]);

  useEffect(() => {
    const mediaSocket = getLiveMediaSocket();
    const handleVideoCommand = (command: VideoCommand) => {
      if (command.target !== "both" && command.target !== "stage") return;

      const video = videoRef.current;
      if (!video) return;

      if (command.action === "pause") {
        video.pause();
        return;
      }

      if (command.action === "seek") {
        video.currentTime = Math.max(0, Number(command.seconds || 0));
        return;
      }

      if (command.action === "restart") {
        video.currentTime = 0;
      }

      video.play().catch(() => undefined);
    };

    mediaSocket.on("video:control", handleVideoCommand);
    return () => {
      mediaSocket.off("video:control", handleVideoCommand);
    };
  }, []);

  function handleVideoEnded() {
    if (output?.currentItem?.type !== "offering" || slide?.type !== "video") return;

    fetch("/api/live/advance-current", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: output.currentItem.id, slideId: slide.id })
    }).catch(() => undefined);
  }

  return (
    <main className={`screen main-output-screen ${blank ? "is-idle" : "is-live"}`}>
      {blank ? (
        <>
          <div
            className="main-background"
            style={{ "--main-background-url": `url("${idleBackgroundUrl}")` } as CSSProperties}
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
            <video ref={videoRef} className="media-output-video" src={slide.filePath} autoPlay playsInline onEnded={handleVideoEnded} />
          ) : slide.type === "presentation" && slide.filePath ? (
            <img className="media-output-presentation" src={slide.filePath} alt={slide.body || slide.title} />
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
