"use client";

import { ChevronLeft, ChevronRight, FilePlus, ImageUp, Monitor, Pause, Play, RotateCcw, Square, Tv } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLiveMedia } from "@/hooks/useLiveMedia";
import { blockTemplates, itemLabels, serviceTemplates } from "@/shared/catalog";
import type { ProgramItem, Slide } from "@/shared/types";

function slidesForItem(item: ProgramItem | null): Slide[] {
  if (!item) return [];
  if (item.type === "song" && item.song) {
    return item.song.displayOrder.map((key, index) => ({
      id: `${item.id}-${key}-${index}`,
      type: "lyric",
      title: item.song?.title || item.title,
      label: key,
      body: item.song?.sections[key] || "",
      filePath: null,
      sortOrder: index
    }));
  }

  return [{
    id: `${item.id}-single`,
    type: item.type,
    title: item.title,
    label: item.type,
    body: item.notes || item.title,
    filePath: item.filePath || null,
    sortOrder: 0
  }];
}

function detectMediaTypeFromFile(file: File): "audio" | "video" | "presentation" | null {
  const extension = file.name.toLowerCase().split(".").pop() || "";
  if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(extension) || file.type.startsWith("audio/")) {
    return "audio";
  }
  if (["mp4", "webm", "mov", "mkv", "avi"].includes(extension) || file.type.startsWith("video/")) {
    return "video";
  }
  if (["ppt", "pptx", "pps", "ppsx", "pdf"].includes(extension)) {
    return "presentation";
  }
  return null;
}

export default function ControlPage() {
  const { program, background, liveState, loading, refresh, api } = useLiveMedia();
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedServiceType, setSelectedServiceType] = useState("serviciul_divin");
  const [pendingServiceType, setPendingServiceType] = useState("");
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [backgroundStatus, setBackgroundStatus] = useState("");
  const [serviceStatus, setServiceStatus] = useState("");
  const [builderStatus, setBuilderStatus] = useState("");
  const [mediaType, setMediaType] = useState<"audio" | "video" | "presentation">("presentation");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaStatus, setMediaStatus] = useState("");
  const [serverSlides, setServerSlides] = useState<Slide[] | null>(null);
  const [itemFileStatus, setItemFileStatus] = useState<Record<number, string>>({});
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);

  const selectedItem = useMemo(() => {
    const items = program?.items || [];
    return items.find((item) => item.id === selectedItemId) || liveState?.currentItem || items[0] || null;
  }, [program, selectedItemId, liveState]);
  const selectedService = serviceTemplates.find((service) => service.type === selectedServiceType) || serviceTemplates[0];
  const pendingService = serviceTemplates.find((service) => service.type === pendingServiceType) || null;
  const fallbackSlides = useMemo(() => slidesForItem(selectedItem), [selectedItem]);
  const selectedSlides = serverSlides || fallbackSlides;
  const mainOutput = liveState?.outputs?.main || liveState;
  const stageOutput = liveState?.outputs?.stage || liveState;
  const mainSongPhonogram = mainOutput?.activeOutput === "program" && mainOutput.currentItem?.type === "song" && mainOutput.currentItem.audioFilePath
    ? {
        title: `Fonograma - ${mainOutput.currentItem.title}`,
        filePath: mainOutput.currentItem.audioFilePath
      }
    : null;
  const stageSongPhonogram = stageOutput?.activeOutput === "program" && stageOutput.currentItem?.type === "song" && stageOutput.currentItem.audioFilePath
    ? {
        title: `Fonograma - ${stageOutput.currentItem.title}`,
        filePath: stageOutput.currentItem.audioFilePath
      }
    : null;
  const activeAudio = mainSongPhonogram
    || stageSongPhonogram
    || (mainOutput?.currentSlide?.type === "audio" && mainOutput.currentSlide.filePath
      ? mainOutput.currentSlide
      : stageOutput?.currentSlide?.type === "audio" && stageOutput.currentSlide.filePath
        ? stageOutput.currentSlide
        : null);
  const selectedSongAudio = selectedItem?.type === "song" && selectedItem.audioFilePath
    ? {
        title: `Fonograma - ${selectedItem.title}`,
        filePath: selectedItem.audioFilePath
      }
    : null;
  const selectedBlockAudio = selectedItem?.type === "audio" && selectedItem.filePath
    ? {
        title: selectedItem.title,
        filePath: selectedItem.filePath
      }
    : null;
  const centerAudio = activeAudio || selectedSongAudio || selectedBlockAudio;
  const mainVideoLive = mainOutput?.activeOutput === "program" && mainOutput.currentSlide?.type === "video" && mainOutput.currentSlide.filePath;
  const stageVideoLive = stageOutput?.activeOutput === "program" && stageOutput.currentSlide?.type === "video" && stageOutput.currentSlide.filePath;
  const activeVideo = mainVideoLive
    ? mainOutput.currentSlide
    : stageVideoLive
      ? stageOutput.currentSlide
      : null;
  const activeVideoTarget = mainVideoLive && stageVideoLive ? "both" : mainVideoLive ? "main" : "stage";

  useEffect(() => {
    let mounted = true;
    setServerSlides(null);

    if (!selectedItem) return;

    api.getProgramItemSlides(selectedItem.id).then((slides) => {
      if (mounted) setServerSlides(slides.length ? slides : null);
    });

    return () => {
      mounted = false;
    };
  }, [api, selectedItem]);

  useEffect(() => {
    if (program?.serviceType) {
      setSelectedServiceType(program.serviceType);
      setPendingServiceType(program.serviceType);
    }
  }, [program?.serviceType]);

  async function handleBackgroundUpload(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setBackgroundStatus("Alege un fisier imagine.");
      return;
    }

    setBackgroundStatus("Se incarca imaginea...");
    const reader = new FileReader();
    reader.onload = async () => {
      const response = await api.setMainBackground(String(reader.result));
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Nu s-a putut salva imaginea." }));
        setBackgroundStatus(error.error);
        return;
      }
      setBackgroundStatus("Imaginea de fundal a fost actualizata.");
    };
    reader.onerror = () => setBackgroundStatus("Nu s-a putut citi fisierul.");
    reader.readAsDataURL(file);
  }

  async function handleMediaUpload() {
    if (!mediaFile) {
      setMediaStatus("Alege mai intai un fisier local.");
      return;
    }

    setMediaStatus("Se copiaza fisierul in biblioteca aplicatiei...");
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
    setMediaStatus("Fisierul a fost copiat si adaugat in program.");
  }

  function handleMediaFileChange(file: File | null) {
    setMediaFile(file);
    if (!file) return;

    const detectedType = detectMediaTypeFromFile(file);
    if (detectedType) {
      setMediaType(detectedType);
      setMediaStatus(`Tip detectat automat: ${detectedType === "presentation" ? "prezentare" : detectedType}.`);
    }
  }

  async function handleProgramItemFileUpload(item: ProgramItem, kind: "visual" | "audio", file: File | null) {
    if (!file) return;
    setItemFileStatus((current) => ({
      ...current,
      [item.id]: kind === "visual" ? "Se copiaza fisierul cu cuvinte..." : "Se copiaza fonograma..."
    }));

    const response = kind === "visual"
      ? await api.attachProgramItemVisual(item.id, file)
      : await api.attachProgramItemAudio(item.id, file);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Nu s-a putut salva fisierul." }));
      setItemFileStatus((current) => ({ ...current, [item.id]: error.error }));
      return;
    }

    setItemFileStatus((current) => ({
      ...current,
      [item.id]: kind === "visual" ? "Cuvintele au fost atasate." : "Fonograma a fost atasata."
    }));
  }

  async function handleCreateService(serviceType: string, title: string) {
    setServiceStatus(`Se creeaza ${title}...`);
    const today = new Date().toISOString().slice(0, 10);
    const response = await api.createProgram({
      title: `${title} - ${today}`,
      serviceDate: today,
      serviceType
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Nu s-a putut crea serviciul." }));
      setServiceStatus(error.error);
      return;
    }

    setSelectedItemId(null);
    await refresh();
    setServiceStatus(`${title} a fost creat si activat.`);
  }

  function handleServiceTemplateChange(serviceType: string) {
    setPendingServiceType(serviceType);
    setServiceStatus("");
  }

  async function handleConfirmServiceTemplate() {
    if (!pendingService) return;
    setServicePickerOpen(false);
    await handleCreateService(pendingService.type, pendingService.title);
  }

  async function handleAddBlock(template: typeof blockTemplates[number]) {
    if (!program) {
      setBuilderStatus("Creeaza mai intai un serviciu.");
      return;
    }

    setBuilderStatus(`Se adauga ${template.title}...`);
    const response = await api.addProgramItem(program.id, {
      type: template.type,
      title: template.title,
      notes: template.notes
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Nu s-a putut adauga punctul." }));
      setBuilderStatus(error.error);
      return;
    }

    await refresh();
    setBuilderStatus(`${template.title} a fost adaugat in program.`);
  }

  async function handleProgramItemDrop(targetItemId: number) {
    if (!program || draggedItemId === null || draggedItemId === targetItemId) {
      setDraggedItemId(null);
      setDropTargetId(null);
      return;
    }

    const items = program.items || [];
    const draggedIndex = items.findIndex((item) => item.id === draggedItemId);
    const targetIndex = items.findIndex((item) => item.id === targetItemId);
    if (draggedIndex < 0 || targetIndex < 0) {
      setDraggedItemId(null);
      setDropTargetId(null);
      return;
    }

    const nextItems = [...items];
    const [draggedItem] = nextItems.splice(draggedIndex, 1);
    nextItems.splice(targetIndex, 0, draggedItem);

    setBuilderStatus("Se salveaza ordinea programului...");
    const response = await api.reorderProgramItems(program.id, nextItems.map((item) => item.id));
    setDraggedItemId(null);
    setDropTargetId(null);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Nu s-a putut salva ordinea." }));
      setBuilderStatus(error.error);
      return;
    }

    await refresh();
    setBuilderStatus("Ordinea programului a fost salvata.");
  }

  if (loading) {
    return <main className="screen"><div className="blank-output">Se incarca panoul media...</div></main>;
  }

  return (
    <main className="control-shell">
      <aside className="sidebar control-placeholder-sidebar">
        <div className="top-row">
          <h1 className="title">Program</h1>
          <a className="muted" href="/settings">Setari</a>
        </div>
        <section className={`control-service-picker ${servicePickerOpen || pendingServiceType !== selectedServiceType ? "open" : ""}`}>
          <button className="service-compact-btn" onClick={() => setServicePickerOpen((value) => !value)}>
            <span>
              <span className="item-type">Serviciu</span>
              <strong>{selectedService.title}</strong>
            </span>
            <span>{servicePickerOpen ? "Inchide" : "Schimba"}</span>
          </button>
          {servicePickerOpen || pendingServiceType !== selectedServiceType ? (
            <label>
              <span className="item-type">Alege template</span>
              <select value={pendingServiceType || selectedServiceType} onChange={(event) => handleServiceTemplateChange(event.target.value)}>
                {serviceTemplates.map((service) => (
                  <option key={service.type} value={service.type}>{service.title}</option>
                ))}
              </select>
            </label>
          ) : null}
          {pendingServiceType !== selectedServiceType ? (
            <div className="service-confirm-box">
              <strong>Schimbi programul curent?</strong>
              <div className="muted">Aceasta va crea program nou din template-ul {pendingService?.title} si va inlocui programul curent.</div>
              <div className="confirm-actions">
                <button className="primary-btn" onClick={handleConfirmServiceTemplate}>Confirma</button>
                <button className="ghost-btn" onClick={() => {
                  setPendingServiceType(selectedServiceType);
                  setServicePickerOpen(false);
                }}>Renunta</button>
              </div>
            </div>
          ) : null}
          {serviceStatus ? <div className="muted">{serviceStatus}</div> : null}
        </section>
        <div className="sidebar-empty-state">
          <div className="item-type">Coloana stanga</div>
          <strong>Pregatita pentru constructie</strong>
          <div className="muted">Aici vom construi programul serviciului, pas cu pas.</div>
        </div>
      </aside>

      <section className="workspace">
        <div className="top-row">
          <div>
            <h2 className="title">{selectedItem?.title || "Selecteaza un element"}</h2>
            <div className="muted">{selectedItem?.notes || "Slide-urile apar aici."}</div>
          </div>
          <button className="primary-btn" onClick={() => selectedItem && api.goLive(selectedItem.id, 0, "both")}>
            <Tv size={17} /> Go Live ambele
          </button>
        </div>

        <div className="toolbar">
          <button className="ghost-btn" onClick={() => api.previous()} title="Previous">
            <ChevronLeft size={18} /> Previous
          </button>
          <button className="primary-btn" onClick={() => api.next()} title="Next">
            Next <ChevronRight size={18} />
          </button>
          <button className="danger-btn" onClick={() => api.clear("both")} title="Fundal">
            <Square size={16} /> Fundal ambele
          </button>
        </div>

        <div className="slide-grid">
          {selectedSlides.map((slide, index) => (
            <button
              className={`slide-tile ${liveState?.currentItem?.id === selectedItem?.id && liveState.currentSlideIndex === index ? "active" : ""}`}
              key={slide.id}
              onClick={() => selectedItem && api.goLive(selectedItem.id, index, "both")}
            >
              {slide.type === "presentation" && slide.filePath ? (
                <img className="slide-image-preview" src={slide.filePath} alt={slide.body || slide.title} />
              ) : null}
              <div className="item-type">{slide.label}</div>
              <strong>{slide.title}</strong>
              {slide.type === "presentation" && slide.filePath ? null : <div className="slide-body-preview">{slide.body}</div>}
            </button>
          ))}
        </div>

        {centerAudio ? (
          <section className="audio-control-panel center-audio-panel">
            <div className="item-type">Player audio</div>
            <strong>{centerAudio.title}</strong>
            <audio key={centerAudio.filePath} src={centerAudio.filePath || ""} controls autoPlay={Boolean(activeAudio)} />
            <div className="muted">
              {activeAudio ? "Audio-ul este live acum." : "Audio pregatit pentru blocul selectat."}
            </div>
          </section>
        ) : null}

        {false ? (
          <section className="media-picker-panel">
            <div className="top-row">
              <div>
                <h3 className="title">Alege fisier local</h3>
                <div className="muted">Audio, video sau prezentare. Aplicatia pastreaza automat o copie pentru program.</div>
              </div>
              <FilePlus size={20} />
            </div>
            <div className="media-picker-grid">
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
                <input
                  placeholder="Titlu afisat in program"
                  value={mediaTitle}
                  onChange={(event) => setMediaTitle(event.target.value)}
                />
              </label>
              <div className="media-file-field">
                <span className="item-type">Fisier local</span>
                <label className="primary-btn file-picker-btn">
                  <FilePlus size={16} /> Alege fisier
                  <input
                    accept=".ppt,.pptx,.pdf,audio/*,video/*"
                    type="file"
                    onChange={(event) => handleMediaFileChange(event.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <button className="primary-btn" onClick={handleMediaUpload}>
                Adauga in program
              </button>
            </div>
            <div className="muted">{mediaStatus || (mediaFile ? mediaFile.name : "Alege un fisier de pe calculator; aplicatia il copiaza local.")}</div>
          </section>
        ) : null}
      </section>

      <aside className="live-panel">
        <div className="top-row">
          <h2 className="title">Ecrane</h2>
          <Monitor size={20} />
        </div>
        <p className="muted">Alege separat ce apare pe fiecare ecran.</p>

        {activeVideo ? (
          <section className="video-control-panel">
            <div className="item-type">Control video</div>
            <strong>{activeVideo.title}</strong>
            <div className="video-control-actions">
              <button className="primary-btn" onClick={() => api.videoControl(activeVideoTarget, "play")}>
                <Play size={16} /> Play
              </button>
              <button className="ghost-btn" onClick={() => api.videoControl(activeVideoTarget, "pause")}>
                <Pause size={16} /> Pause
              </button>
              <button className="ghost-btn" onClick={() => api.videoControl(activeVideoTarget, "restart")}>
                <RotateCcw size={16} /> Restart
              </button>
            </div>
            <div className="muted">Video-ul ruleaza pe ecranul selectat; comenzile se trimit din panoul operator.</div>
          </section>
        ) : null}

        <div className="screen-monitor-grid">
          <section className="screen-monitor">
            <div className="screen-monitor-header">
              <span className="item-type">Ecran principal</span>
              <a className="muted" href="/main-screen" target="_blank">Deschide</a>
            </div>
            <div className={`screen-preview main-preview ${mainOutput?.activeOutput === "background" ? "idle" : ""}`}>
              {mainOutput?.activeOutput === "background" || !mainOutput?.currentSlide ? (
                <div
                  className="screen-preview-background"
                  style={{ backgroundImage: `url("${background.url}")` }}
                />
              ) : (
                mainOutput.currentSlide.type === "presentation" && mainOutput.currentSlide.filePath ? (
                  <img className="screen-preview-image" src={mainOutput.currentSlide.filePath} alt={mainOutput.currentSlide.body || mainOutput.currentSlide.title} />
                ) : (
                  <>
                    <strong>{mainOutput.currentSlide.title}</strong>
                    <div>{mainOutput.currentSlide.body}</div>
                  </>
                )
              )}
            </div>
            <div className="screen-actions">
              <button className="ghost-btn" onClick={() => selectedItem && api.goLive(selectedItem.id, 0, "main")}>Trimite selectia</button>
              <button className="ghost-btn" onClick={() => api.clear("main")}>Fundal</button>
            </div>
          </section>

          <section className="screen-monitor">
            <div className="screen-monitor-header">
              <span className="item-type">Ecran scena</span>
              <a className="muted" href="/stage-screen" target="_blank">Deschide</a>
            </div>
            <div className={`screen-preview main-preview ${stageOutput?.activeOutput === "background" ? "idle" : ""}`}>
              {stageOutput?.activeOutput === "background" || !stageOutput?.currentSlide ? (
                <div
                  className="screen-preview-background"
                  style={{ backgroundImage: `url("${background.url}")` }}
                />
              ) : (
                stageOutput.currentSlide.type === "presentation" && stageOutput.currentSlide.filePath ? (
                  <img className="screen-preview-image" src={stageOutput.currentSlide.filePath} alt={stageOutput.currentSlide.body || stageOutput.currentSlide.title} />
                ) : (
                  <>
                    <strong>{stageOutput.currentSlide.title}</strong>
                    <div>{stageOutput.currentSlide.body}</div>
                  </>
                )
              )}
            </div>
            <div className="screen-actions">
              <button className="ghost-btn" onClick={() => selectedItem && api.goLive(selectedItem.id, 0, "stage")}>Trimite selectia</button>
              <button className="ghost-btn" onClick={() => api.clear("stage")}>Fundal</button>
            </div>
          </section>
        </div>

        <h3 className="title" style={{ marginTop: 24 }}>Urmeaza</h3>
        <div className={`program-item ${mainOutput?.nextSlide?.type === "idle" ? "idle-next" : ""}`}>
          <strong>{mainOutput?.nextSlide?.title || "Final element"}</strong>
          <div className="muted">
            {mainOutput?.nextSlide?.type === "idle"
              ? "Next va afisa imaginea de fundal."
              : mainOutput?.nextSlide?.body || "Nu exista slide urmator."}
          </div>
        </div>
      </aside>
    </main>
  );
}
