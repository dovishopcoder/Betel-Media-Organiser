const http = require("http");
const path = require("path");
const express = require("express");
const next = require("next");
const { Server } = require("socket.io");
const { ensureDatabase, getDb } = require("./src/server/db");
const { createRepositories } = require("./src/server/repositories");
const { createInitialLiveState, createOutputState, getNextSlide } = require("./src/server/live-state");
const { getMainBackground, saveMainBackground } = require("./src/server/backgrounds");

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const hostname = "0.0.0.0";
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

ensureDatabase();

app.prepare().then(() => {
  const expressApp = express();
  const server = http.createServer(expressApp);
  const io = new Server(server);
  const db = getDb();
  const repos = createRepositories(db);
  let liveState = createInitialLiveState(repos);

  expressApp.use(express.json({ limit: "12mb" }));
  expressApp.use("/media", express.static(path.join(__dirname, "media")));

  expressApp.get("/api/bootstrap", (_req, res) => {
    res.json({
      songs: repos.songs.list(),
      programs: repos.programs.list(),
      activeProgram: repos.programs.getActiveWithItems(),
      screens: repos.screens.list(),
      background: getMainBackground(),
      liveState
    });
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

  expressApp.post("/api/programs/:programId/items", (req, res) => {
    const item = repos.programs.addItem(Number(req.params.programId), req.body);
    liveState.programOrder = repos.programs.getActiveWithItems();
    io.emit("program:update", liveState.programOrder);
    res.status(201).json(item);
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

  expressApp.post("/api/live/clear", (req, res) => {
    const { target = "both" } = req.body || {};
    const targets = target === "both" ? ["main", "stage"] : [target === "stage" ? "stage" : "main"];
    const outputs = { ...liveState.outputs };
    for (const screen of targets) {
      outputs[screen] = {
        ...outputs[screen],
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
