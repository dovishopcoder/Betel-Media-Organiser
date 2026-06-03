"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { getLiveMediaSocket, useLiveMedia } from "@/hooks/useLiveMedia";

type VideoCommand = {
  target: "main" | "stage" | "both";
  action: "play" | "pause" | "restart";
};

export default function StageScreenPage() {
  const { background, liveState, loading } = useLiveMedia();
  const output = liveState?.outputs?.stage || liveState;
  const slide = output?.currentSlide;
  const blank = loading || output?.activeOutput === "background" || !slide || slide.type === "audio";
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
            <video ref={videoRef} className="media-output-video" src={slide.filePath} autoPlay playsInline />
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
