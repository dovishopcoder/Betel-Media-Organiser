"use client";

import { FilePlus, Library } from "lucide-react";
import { useState } from "react";
import { useLiveMedia } from "@/hooks/useLiveMedia";

function detectMediaTypeFromFile(file: File): "audio" | "video" | "presentation" | null {
  const extension = file.name.toLowerCase().split(".").pop() || "";
  if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(extension) || file.type.startsWith("audio/")) return "audio";
  if (["mp4", "webm", "mov", "mkv", "avi"].includes(extension) || file.type.startsWith("video/")) return "video";
  if (["ppt", "pptx", "pps", "ppsx", "pdf"].includes(extension)) return "presentation";
  return null;
}

export default function LibrarySettingsPage() {
  const { loading, refresh, api } = useLiveMedia();
  const [mediaType, setMediaType] = useState<"audio" | "video" | "presentation">("presentation");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaStatus, setMediaStatus] = useState("");

  function handleMediaFileChange(file: File | null) {
    setMediaFile(file);
    if (!file) return;

    const detectedType = detectMediaTypeFromFile(file);
    if (detectedType) {
      setMediaType(detectedType);
      setMediaStatus(`Tip detectat automat: ${detectedType === "presentation" ? "prezentare" : detectedType}.`);
    }
  }

  async function handleMediaUpload() {
    if (!mediaFile) {
      setMediaStatus("Alege mai intai un fisier.");
      return;
    }

    setMediaStatus("Se copiaza fisierul si se adauga in programul activ...");
    const response = await api.createMediaProgramItem({
      file: mediaFile,
      mediaType,
      title: mediaTitle.trim() || mediaFile.name
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Nu s-a putut copia fisierul." }));
      setMediaStatus(error.error);
      return;
    }

    setMediaFile(null);
    setMediaTitle("");
    await refresh();
    setMediaStatus("Fisierul a fost adaugat in programul activ.");
  }

  if (loading) {
    return <div className="settings-card muted">Se incarca biblioteca...</div>;
  }

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <div>
          <h2 className="title">Biblioteca media</h2>
          <p className="muted">Pregatesti fisiere audio, video si prezentari pentru programul activ.</p>
        </div>
        <Library size={22} />
      </div>

      <div className="settings-card">
        <div className="media-picker-grid settings-media-grid">
          <label>
            <span className="item-type">Tip</span>
            <select value={mediaType} onChange={(event) => setMediaType(event.target.value as typeof mediaType)}>
              <option value="presentation">Prezentare</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
            </select>
          </label>
          <label>
            <span className="item-type">Titlu</span>
            <input value={mediaTitle} onChange={(event) => setMediaTitle(event.target.value)} placeholder="Titlu pentru program" />
          </label>
          <label className="primary-btn file-picker-btn">
            <FilePlus size={16} /> Alege fisier
            <input accept=".ppt,.pptx,.pdf,audio/*,video/*" type="file" onChange={(event) => handleMediaFileChange(event.target.files?.[0] || null)} />
          </label>
          <button className="primary-btn" onClick={handleMediaUpload}>Adauga</button>
        </div>
        <div className="muted">{mediaStatus || (mediaFile ? mediaFile.name : "Alege un fisier de pe calculator.")}</div>
      </div>
    </section>
  );
}
