"use client";

import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { LiveState, Program, Song } from "@/shared/types";

type Bootstrap = {
  songs: Song[];
  activeProgram: Program | null;
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
        setLiveState(data.liveState);
        setLoading(false);
      });

    const mediaSocket = getSocket();
    mediaSocket.on("live:update", setLiveState);
    mediaSocket.on("program:update", setProgram);
    mediaSocket.on("library:update", (payload: { songs: Song[] }) => setSongs(payload.songs));

    return () => {
      mounted = false;
      mediaSocket.off("live:update", setLiveState);
      mediaSocket.off("program:update", setProgram);
      mediaSocket.off("library:update");
    };
  }, []);

  const api = useMemo(() => ({
    goLive(itemId: number, slideIndex = 0) {
      return fetch("/api/live/go-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, slideIndex })
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
    clear() {
      return fetch("/api/live/clear", { method: "POST" });
    },
    createSong(input: { title: string; author?: string; lyrics: string }) {
      return fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
    }
  }), []);

  return { songs, program, liveState, loading, api };
}
