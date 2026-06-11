"use client";

import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { DisplayInfo, DisplaySettings, LiveState, Program, ServiceTemplateItem, Slide, Song } from "@/shared/types";

type Bootstrap = {
  songs: Song[];
  programs: Program[];
  activeProgram: Program | null;
  background: {
    url: string;
    exists: boolean;
  };
  serviceProgramTemplates: Record<string, ServiceTemplateItem[]>;
  displaySettings: DisplaySettings;
  liveState: LiveState;
  appVersion?: string;
};

let socket: Socket | null = null;

function getSocket() {
  if (!socket) socket = io();
  return socket;
}

export function getLiveMediaSocket() {
  return getSocket();
}

export function useLiveMedia() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [program, setProgram] = useState<Program | null>(null);
  const [background, setBackground] = useState({ url: "/media/backgrounds/main.jpg", exists: false });
  const [serviceProgramTemplates, setServiceProgramTemplates] = useState<Record<string, ServiceTemplateItem[]>>({});
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({ main: "", stage: "", control: "" });
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [appVersion, setAppVersion] = useState("versiune necunoscuta");
  const [loading, setLoading] = useState(true);

  async function loadBootstrap(mounted = true) {
    return fetch("/api/bootstrap")
      .then((res) => res.json())
      .then((data: Bootstrap) => {
        if (!mounted) return;
        setSongs(data.songs);
        setPrograms(data.programs);
        setProgram(data.activeProgram);
        setBackground(data.background);
        setServiceProgramTemplates(data.serviceProgramTemplates || {});
        setDisplaySettings(data.displaySettings || { main: "", stage: "", control: "" });
        setLiveState(data.liveState);
        setAppVersion(data.appVersion || "versiune necunoscuta");
        setLoading(false);
      });
  }

  useEffect(() => {
    let mounted = true;

    loadBootstrap(mounted);

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
    clear(target: "main" | "stage" | "both" = "both", finish = false) {
      return fetch("/api/live/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, finish })
      });
    },
    resetLive() {
      return fetch("/api/live/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
    },
    async getDisplays(): Promise<{ displays: DisplayInfo[]; settings: DisplaySettings }> {
      const response = await fetch("/api/displays");
      if (!response.ok) return { displays: [], settings: displaySettings };
      return response.json();
    },
    async saveDisplaySettings(settings: DisplaySettings) {
      const response = await fetch("/api/display-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (response.ok) {
        const payload = await response.json();
        setDisplaySettings(payload.settings || settings);
      }
      return response;
    },
    async getProgramItemSlides(itemId: number): Promise<Slide[]> {
      const response = await fetch(`/api/program-items/${itemId}/slides`);
      if (!response.ok) return [];
      const payload = await response.json();
      return payload.slides || [];
    },
    attachProgramItemAudio(itemId: number, file: File) {
      const formData = new FormData();
      formData.append("file", file);

      return fetch(`/api/program-items/${itemId}/audio`, {
        method: "POST",
        body: formData
      });
    },
    attachProgramItemVisual(itemId: number, file: File) {
      const formData = new FormData();
      formData.append("file", file);

      return fetch(`/api/program-items/${itemId}/visual`, {
        method: "POST",
        body: formData
      });
    },
    clearProgramItemAudio(itemId: number) {
      return fetch(`/api/program-items/${itemId}/audio`, {
        method: "DELETE"
      });
    },
    clearProgramItemVisual(itemId: number) {
      return fetch(`/api/program-items/${itemId}/visual`, {
        method: "DELETE"
      });
    },
    attachOfferingVideo(itemId: number, file: File) {
      const formData = new FormData();
      formData.append("file", file);

      return fetch(`/api/program-items/${itemId}/offering-video`, {
        method: "POST",
        body: formData
      });
    },
    attachOfferingBackground(itemId: number, file: File) {
      const formData = new FormData();
      formData.append("file", file);

      return fetch(`/api/program-items/${itemId}/offering-background`, {
        method: "POST",
        body: formData
      });
    },
    updateProgramItem(itemId: number, input: { title?: string; songId?: number | null; notes?: string }) {
      return fetch(`/api/program-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
    },
    videoControl(target: "main" | "stage" | "both", action: "play" | "pause" | "restart" | "seek", seconds?: number) {
      return fetch("/api/live/video-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, action, seconds })
      });
    },
    createSong(input: { title: string; author?: string; lyrics: string }) {
      return fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
    },
    createProgram(input: { title: string; serviceDate?: string; serviceType?: string }) {
      return fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
    },
    updateServiceTemplate(serviceType: string, items: ServiceTemplateItem[]) {
      return fetch(`/api/service-templates/${serviceType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
    },
    activateProgram(programId: number) {
      return fetch(`/api/programs/${programId}/activate`, {
        method: "POST"
      });
    },
    addProgramItem(programId: number, input: { type: string; title: string; notes?: string }) {
      return fetch(`/api/programs/${programId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
    },
    reorderProgramItems(programId: number, itemIds: number[]) {
      return fetch(`/api/programs/${programId}/items/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds })
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
      file: File;
      mediaType: "audio" | "video" | "presentation";
      title: string;
      notes?: string;
    }) {
      const formData = new FormData();
      formData.append("file", input.file);
      formData.append("mediaType", input.mediaType);
      formData.append("title", input.title);
      if (input.notes) formData.append("notes", input.notes);

      return fetch("/api/media/program-item/upload", {
        method: "POST",
        body: formData
      });
    }
  }), []);

  return { songs, programs, program, background, serviceProgramTemplates, displaySettings, liveState, appVersion, loading, refresh: loadBootstrap, api };
}
