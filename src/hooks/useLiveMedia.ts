"use client";

import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { LiveState, Program, Song } from "@/shared/types";

type Bootstrap = {
  songs: Song[];
  activeProgram: Program | null;
  background: {
    url: string;
    exists: boolean;
  };
  liveState: LiveState;
};

let socket: Socket | null = null;

function getSocket() {
  if (!socket) socket = io();
  return socket;
}

export function useLiveMedia() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [program, setProgram] = useState<Program | null>(null);
  const [background, setBackground] = useState({ url: "/media/backgrounds/main.jpg", exists: false });
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetch("/api/bootstrap")
      .then((res) => res.json())
      .then((data: Bootstrap) => {
        if (!mounted) return;
        setSongs(data.songs);
        setProgram(data.activeProgram);
        setBackground(data.background);
        setLiveState(data.liveState);
        setLoading(false);
      });

    const mediaSocket = getSocket();
    mediaSocket.on("live:update", setLiveState);
    mediaSocket.on("program:update", setProgram);
    mediaSocket.on("library:update", (payload: { songs: Song[] }) => setSongs(payload.songs));
    mediaSocket.on("background:update", setBackground);

    return () => {
      mounted = false;
      mediaSocket.off("live:update", setLiveState);
      mediaSocket.off("program:update", setProgram);
      mediaSocket.off("library:update");
      mediaSocket.off("background:update");
    };
  }, []);

  const api = useMemo(() => ({
    goLive(itemId: number, slideIndex = 0, target: "main" | "stage" | "both" = "main") {
      return fetch("/api/live/go-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, slideIndex, target })
      });
    },
    next() {
      return fetch("/api/live/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "next" })
      });
    },
    previous() {
      return fetch("/api/live/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "previous" })
      });
    },
    clear(target: "main" | "stage" | "both" = "both") {
      return fetch("/api/live/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target })
      });
    },
    createSong(input: { title: string; author?: string; lyrics: string }) {
      return fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
    },
    setMainBackground(dataUrl: string) {
      return fetch("/api/backgrounds/main", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl })
      });
    },
    createMediaProgramItem(input: {
      dataUrl: string;
      fileName: string;
      mediaType: "audio" | "video" | "presentation";
      title: string;
      notes?: string;
    }) {
      return fetch("/api/media/program-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
    }
  }), []);

  return { songs, program, background, liveState, loading, api };
}
