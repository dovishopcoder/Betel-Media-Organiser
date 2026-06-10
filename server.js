const http = require("http");
const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const next = require("next");
const { Server } = require("socket.io");
const { ensureDatabase, getDb } = require("./src/server/db");
const { createRepositories } = require("./src/server/repositories");
const { createInitialLiveState, createOutputState, getNextSlide } = require("./src/server/live-state");
const { getMainBackground, saveMainBackground } = require("./src/server/backgrounds");
const { detectMediaType, ensureLibraryDir, isAllowedMedia, sanitizeName, saveMediaFile } = require("./src/server/media-files");
const { getServiceProgramTemplates, saveServiceProgramTemplate } = require("./src/server/service-templates");

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const hostname = "0.0.0.0";
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

ensureDatabase();
ensureLibraryDir();

const mediaUpload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      ensureLibraryDir();
      cb(null, path.join(__dirname, "media", "library"));
    },
    filename(_req, file, cb) {
      cb(null, `${Date.now()}-${sanitizeName(file.originalname)}`);
    }
  }),
  limits: {
    fileSize: 1024 * 1024 * 1024
  }
});

app.prepare().then(() => {
  const expressApp = express();
  const server = http.createServer(expressApp);
  const io = new Server(server);
  const db = getDb();
  const repos = createRepositories(db);
  let liveState = createInitialLiveState(repos);

  function refreshProgramOrder() {
    liveState = {
      ...liveState,
      programOrder: repos.programs.getActiveWithItems(),
      updatedAt: new Date().toISOString()
    };
    io.emit("program:update", liveState.programOrder);
  }

  function refreshLiveProgramItem(updatedItem) {
    const refreshOutput = (output) => {
      if (!output?.currentItem || output.currentItem.id !== updatedItem.id) return output;

      const slides = repos.slides.forProgramItem(updatedItem);
      const slideIndex = Math.max(0, Math.min(output.currentSlideIndex || 0, Math.max(slides.length - 1, 0)));
      return {
        ...output,
        currentItem: updatedItem,
        currentSlideIndex: slideIndex,
        currentSlide: output.activeOutput === "program" ? slides[slideIndex] || null : output.currentSlide,
        nextSlide: output.activeOutput === "program" ? getNextSlide(slides, slideIndex) : output.nextSlide,
        activeOutput: output.activeOutput === "program" && slides[slideIndex] ? "program" : output.activeOutput
      };
    };

    const outputs = {
      main: refreshOutput(liveState.outputs.main),
      stage: refreshOutput(liveState.outputs.stage)
    };

    liveState = {
      ...liveState,
      outputs,
      ...(outputs.main || {}),
      programOrder: repos.programs.getActiveWithItems(),
      updatedAt: new Date().toISOString()
    };
    io.emit("program:update", liveState.programOrder);
    io.emit("live:update", liveState);
  }

  expressApp.use(express.json({ limit: "350mb" }));
  expressApp.use("/media", express.static(path.join(__dirname, "media")));

  expressApp.get("/api/bootstrap", (_req, res) => {
    res.json({
      songs: repos.songs.list(),
      programs: repos.programs.list(),
      activeProgram: repos.programs.getActiveWithItems(),
      screens: repos.screens.list(),
      background: getMainBackground(),
      serviceProgramTemplates: getServiceProgramTemplates(),
      liveState
    });
  });

  expressApp.put("/api/service-templates/:serviceType", (req, res) => {
    try {
      const templates = saveServiceProgramTemplate(req.params.serviceType, req.body?.items || []);
      res.json({ serviceProgramTemplates: templates });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  expressApp.post("/api/backgrounds/main", (req, res) => {
    try {
      const background = saveMainBackground(req.body);
      io.emit("background:update", background);
      res.json(background);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  expressApp.post("/api/songs", (req, res) => {
    const song = repos.songs.create(req.body);
    liveState.libraryVersion += 1;
    io.emit("library:update", { songs: repos.songs.list() });
    res.status(201).json(song);
  });

  expressApp.post("/api/programs", (req, res) => {
    const program = repos.programs.create(req.body || {});
    liveState = {
      ...liveState,
      programOrder: repos.programs.getActiveWithItems(),
      updatedAt: new Date().toISOString()
    };
    io.emit("program:update", liveState.programOrder);
    res.status(201).json({ program, activeProgram: liveState.programOrder, programs: repos.programs.list() });
  });

  expressApp.post("/api/programs/:programId/activate", (req, res) => {
    const activeProgram = repos.programs.activate(Number(req.params.programId));
    if (!activeProgram) return res.status(404).json({ error: "Program not found" });

    liveState = {
      ...liveState,
      programOrder: activeProgram,
      updatedAt: new Date().toISOString()
    };
    io.emit("program:update", activeProgram);
    res.json({ activeProgram, programs: repos.programs.list() });
  });

  expressApp.post("/api/programs/:programId/items", (req, res) => {
    const item = repos.programs.addItem(Number(req.params.programId), req.body);
    liveState.programOrder = repos.programs.getActiveWithItems();
    io.emit("program:update", liveState.programOrder);
    res.status(201).json(item);
  });

  expressApp.post("/api/programs/:programId/items/reorder", (req, res) => {
    const activeProgram = repos.programs.reorderItems(Number(req.params.programId), req.body?.itemIds || []);
    liveState = {
      ...liveState,
      programOrder: activeProgram,
      updatedAt: new Date().toISOString()
    };
    io.emit("program:update", activeProgram);
    res.json({ program: activeProgram });
  });

  expressApp.get("/api/program-items/:itemId/slides", (req, res) => {
    const item = repos.programs.getItem(Number(req.params.itemId));
    if (!item) return res.status(404).json({ error: "Program item not found" });

    res.json({ slides: repos.slides.forProgramItem(item) });
  });

  expressApp.patch("/api/program-items/:itemId", (req, res) => {
    const updatedItem = repos.programs.updateItem(Number(req.params.itemId), req.body || {});
    if (!updatedItem) return res.status(404).json({ error: "Program item not found" });

    refreshProgramOrder();
    res.json({ item: updatedItem, program: liveState.programOrder });
  });

  expressApp.post("/api/program-items/:itemId/audio", mediaUpload.single("file"), (req, res) => {
    try {
      const item = repos.programs.getItem(Number(req.params.itemId));
      if (!item) return res.status(404).json({ error: "Program item not found" });
      if (!["song", "solo_song", "offering"].includes(item.type)) return res.status(400).json({ error: "Fisierul audio poate fi atasat doar la o cantare sau Daruri." });
      if (!req.file) return res.status(400).json({ error: "Alege un fisier audio." });

      if (!isAllowedMedia({ fileName: req.file.originalname, mediaType: "audio", mimeType: req.file.mimetype })) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Alege un fisier audio acceptat." });
      }

      const updatedItem = repos.programs.attachAudio(item.id, {
        filePath: `/media/library/${req.file.filename}`
      });
      refreshProgramOrder();
      res.json({ item: updatedItem, program: liveState.programOrder });
    } catch (error) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(400).json({ error: error.message });
    }
  });

  expressApp.delete("/api/program-items/:itemId/audio", (req, res) => {
    const item = repos.programs.getItem(Number(req.params.itemId));
    if (!item) return res.status(404).json({ error: "Program item not found" });
    if (!["song", "solo_song", "offering"].includes(item.type)) return res.status(400).json({ error: "Fisierul audio poate fi sters doar de la o cantare sau Daruri." });

    const updatedItem = repos.programs.clearAudio(item.id);
    refreshProgramOrder();
    res.json({ item: updatedItem, program: liveState.programOrder });
  });

  expressApp.post("/api/program-items/:itemId/visual", mediaUpload.single("file"), (req, res) => {
    try {
      const item = repos.programs.getItem(Number(req.params.itemId));
      if (!item) return res.status(404).json({ error: "Program item not found" });
      if (item.type !== "song") return res.status(400).json({ error: "Video karaoke poate fi atasat doar la o cantare." });
      if (!req.file) return res.status(400).json({ error: "Alege fisierul video karaoke." });

      const detectedMediaType = detectMediaType({ fileName: req.file.originalname, mimeType: req.file.mimetype });
      if (detectedMediaType !== "video" || !isAllowedMedia({ fileName: req.file.originalname, mediaType: "video", mimeType: req.file.mimetype })) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Pentru cantare alege un fisier video karaoke." });
      }

      const updatedItem = repos.programs.attachFile(item.id, {
        filePath: `/media/library/${req.file.filename}`
      });
      refreshProgramOrder();
      res.json({ item: updatedItem, program: liveState.programOrder });
    } catch (error) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(400).json({ error: error.message });
    }
  });

  expressApp.delete("/api/program-items/:itemId/visual", (req, res) => {
    const item = repos.programs.getItem(Number(req.params.itemId));
    if (!item) return res.status(404).json({ error: "Program item not found" });
    if (item.type !== "song") return res.status(400).json({ error: "Video karaoke poate fi sters doar de la o cantare." });

    const updatedItem = repos.programs.clearFile(item.id);
    refreshProgramOrder();
    res.json({ item: updatedItem, program: liveState.programOrder });
  });

  expressApp.post("/api/program-items/:itemId/offering-video", mediaUpload.single("file"), (req, res) => {
    try {
      const item = repos.programs.getItem(Number(req.params.itemId));
      if (!item) return res.status(404).json({ error: "Program item not found" });
      if (item.type !== "offering") return res.status(400).json({ error: "Video-ul poate fi atasat doar la blocul Daruri." });
      if (!req.file) return res.status(400).json({ error: "Alege fisierul video." });

      if (!isAllowedMedia({ fileName: req.file.originalname, mediaType: "video", mimeType: req.file.mimetype })) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Alege un fisier video acceptat." });
      }

      const updatedItem = repos.programs.attachVideo(item.id, {
        filePath: `/media/library/${req.file.filename}`
      });
      refreshProgramOrder();
      res.json({ item: updatedItem, program: liveState.programOrder });
    } catch (error) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(400).json({ error: error.message });
    }
  });

  expressApp.post("/api/program-items/:itemId/offering-background", mediaUpload.single("file"), (req, res) => {
    try {
      const item = repos.programs.getItem(Number(req.params.itemId));
      if (!item) return res.status(404).json({ error: "Program item not found" });
      if (item.type !== "offering") return res.status(400).json({ error: "Fundalul poate fi atasat doar la blocul Daruri." });
      if (!req.file) return res.status(400).json({ error: "Alege imaginea de fundal." });

      if (!isAllowedMedia({ fileName: req.file.originalname, mediaType: "image", mimeType: req.file.mimetype })) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Alege o imagine acceptata." });
      }

      const updatedItem = repos.programs.attachBackground(item.id, {
        filePath: `/media/library/${req.file.filename}`
      });
      refreshProgramOrder();
      res.json({ item: updatedItem, program: liveState.programOrder });
    } catch (error) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(400).json({ error: error.message });
    }
  });

  expressApp.post("/api/media/program-item", (req, res) => {
    try {
      const activeProgram = repos.programs.getActiveWithItems();
      if (!activeProgram) return res.status(404).json({ error: "Nu exista program activ." });

      const media = saveMediaFile(req.body);
      const item = repos.programs.addItem(activeProgram.id, {
        type: req.body.mediaType,
        title: req.body.title || media.originalName,
        filePath: media.filePath,
        notes: req.body.notes || media.originalName
      });

      liveState.programOrder = repos.programs.getActiveWithItems();
      io.emit("program:update", liveState.programOrder);
      res.status(201).json({ item, media, program: liveState.programOrder });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  expressApp.post("/api/media/program-item/upload", mediaUpload.single("file"), (req, res) => {
    try {
      const activeProgram = repos.programs.getActiveWithItems();
      if (!activeProgram) return res.status(404).json({ error: "Nu exista program activ." });
      if (!req.file) return res.status(400).json({ error: "Alege un fisier." });

      const detectedMediaType = detectMediaType({ fileName: req.file.originalname, mimeType: req.file.mimetype });
      const mediaType = detectedMediaType || req.body.mediaType;
      if (!isAllowedMedia({ fileName: req.file.originalname, mediaType, mimeType: req.file.mimetype })) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Tip de fisier neacceptat. Alege audio, video, prezentare sau foloseste o extensie acceptata." });
      }

      const item = repos.programs.addItem(activeProgram.id, {
        type: mediaType,
        title: req.body.title || req.file.originalname,
        filePath: `/media/library/${req.file.filename}`,
        notes: req.file.originalname
      });

      liveState.programOrder = repos.programs.getActiveWithItems();
      io.emit("program:update", liveState.programOrder);
      res.status(201).json({
        item,
        media: {
          filePath: `/media/library/${req.file.filename}`,
          mimeType: req.file.mimetype,
          originalName: req.file.originalname,
          size: req.file.size
        },
        program: liveState.programOrder
      });
    } catch (error) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(400).json({ error: error.message });
    }
  });

  expressApp.post("/api/live/go-live", (req, res) => {
    const { itemId, slideIndex = 0, target = "main" } = req.body;
    const item = repos.programs.getItem(Number(itemId));
    if (!item) return res.status(404).json({ error: "Program item not found" });

    const slides = repos.slides.forProgramItem(item);
    const output = createOutputState(item, slides, slideIndex);
    const backgroundOutput = {
      currentItem: null,
      currentSlideIndex: 0,
      currentSlide: null,
      nextSlide: null,
      activeOutput: "background"
    };
    const outputs = target === "both"
      ? { main: output, stage: output }
      : target === "stage"
        ? { main: backgroundOutput, stage: output }
        : { main: output, stage: backgroundOutput };

    liveState = {
      ...liveState,
      outputs,
      ...(outputs.main || output),
      updatedAt: new Date().toISOString()
    };
    io.emit("live:update", liveState);
    res.json(liveState);
  });

  expressApp.post("/api/live/step", (req, res) => {
    const direction = req.body.direction === "previous" ? -1 : 1;
    const stepOutput = (output) => {
      if (!output?.currentItem) {
        return output;
      }

      const slides = repos.slides.forProgramItem(output.currentItem);
      if (direction < 0 && output.activeOutput === "background") {
        const lastIndex = Math.max(slides.length - 1, 0);
        return {
          ...output,
          currentSlideIndex: lastIndex,
          currentSlide: slides[lastIndex] || null,
          nextSlide: getNextSlide(slides, lastIndex),
          activeOutput: slides[lastIndex] ? "program" : "background"
        };
      }

      if (output.activeOutput !== "program") {
        return output;
      }

      if (direction > 0 && output.currentSlideIndex >= slides.length - 1) {
        return {
          ...output,
          currentSlide: null,
          nextSlide: null,
          activeOutput: "background"
        };
      }

      const nextIndex = Math.max(0, Math.min(output.currentSlideIndex + direction, slides.length - 1));
      return {
        ...output,
        currentSlideIndex: nextIndex,
        currentSlide: slides[nextIndex] || null,
        nextSlide: getNextSlide(slides, nextIndex),
        activeOutput: slides[nextIndex] ? "program" : "background"
      };
    };

    const outputs = {
      main: stepOutput(liveState.outputs.main),
      stage: stepOutput(liveState.outputs.stage)
    };

    liveState = {
      ...liveState,
      outputs,
      ...(outputs.main || {}),
      updatedAt: new Date().toISOString()
    };
    io.emit("live:update", liveState);
    res.json(liveState);
  });

  expressApp.post("/api/live/advance-current", (req, res) => {
    const { itemId, slideId } = req.body || {};
    const expectedItemId = Number(itemId);

    const advanceOutput = (output) => {
      if (!output?.currentItem || output.activeOutput !== "program") {
        return output;
      }

      if (output.currentItem.id !== expectedItemId || output.currentSlide?.id !== slideId) {
        return output;
      }

      const slides = repos.slides.forProgramItem(output.currentItem);
      if (output.currentSlideIndex >= slides.length - 1) {
        return {
          ...output,
          currentSlide: null,
          nextSlide: null,
          activeOutput: "background"
        };
      }

      const nextIndex = output.currentSlideIndex + 1;
      return {
        ...output,
        currentSlideIndex: nextIndex,
        currentSlide: slides[nextIndex] || null,
        nextSlide: getNextSlide(slides, nextIndex),
        activeOutput: slides[nextIndex] ? "program" : "background"
      };
    };

    const outputs = {
      main: advanceOutput(liveState.outputs.main),
      stage: advanceOutput(liveState.outputs.stage)
    };

    liveState = {
      ...liveState,
      outputs,
      ...(outputs.main || {}),
      updatedAt: new Date().toISOString()
    };
    io.emit("live:update", liveState);
    res.json(liveState);
  });

  expressApp.post("/api/live/clear", (req, res) => {
    const { target = "both", finish = false } = req.body || {};
    const targets = target === "both" ? ["main", "stage"] : [target === "stage" ? "stage" : "main"];
    const outputs = { ...liveState.outputs };
    for (const screen of targets) {
      outputs[screen] = {
        ...outputs[screen],
        currentItem: finish ? null : outputs[screen].currentItem,
        currentSlideIndex: finish ? 0 : outputs[screen].currentSlideIndex,
        currentSlide: null,
        nextSlide: null,
        activeOutput: "background"
      };
    }

    liveState = {
      ...liveState,
      outputs,
      ...(outputs.main || {}),
      updatedAt: new Date().toISOString()
    };
    io.emit("live:update", liveState);
    res.json(liveState);
  });

  expressApp.post("/api/live/video-control", (req, res) => {
    const { target = "both", action, seconds } = req.body || {};
    const validTargets = ["main", "stage", "both"];
    const validActions = ["play", "pause", "restart", "seek"];

    if (!validTargets.includes(target) || !validActions.includes(action)) {
      return res.status(400).json({ error: "Comanda video invalida." });
    }

    if (action === "seek" && !Number.isFinite(Number(seconds))) {
      return res.status(400).json({ error: "Pozitia video este invalida." });
    }

    const command = {
      target,
      action,
      seconds: action === "seek" ? Number(seconds) : undefined,
      issuedAt: new Date().toISOString()
    };

    io.emit("video:control", command);
    res.json(command);
  });

  io.on("connection", (socket) => {
    socket.emit("live:update", liveState);
    socket.emit("program:update", repos.programs.getActiveWithItems());
    socket.emit("library:update", { songs: repos.songs.list() });
  });

  expressApp.use((req, res) => handle(req, res));

  server.listen(port, () => {
    console.log(`Betel Media Organiser ready at http://localhost:${port}`);
  });
});
