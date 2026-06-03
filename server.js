const http = require("http");
const path = require("path");
const express = require("express");
const next = require("next");
const { Server } = require("socket.io");
const { ensureDatabase, getDb } = require("./src/server/db");
const { createRepositories } = require("./src/server/repositories");
const { createInitialLiveState, getNextSlide } = require("./src/server/live-state");

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

  expressApp.use(express.json({ limit: "2mb" }));
  expressApp.use("/media", express.static(path.join(__dirname, "media")));

  expressApp.get("/api/bootstrap", (_req, res) => {
    res.json({
      songs: repos.songs.list(),
      programs: repos.programs.list(),
      activeProgram: repos.programs.getActiveWithItems(),
      screens: repos.screens.list(),
      liveState
    });
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
    const { itemId, slideIndex = 0 } = req.body;
    const item = repos.programs.getItem(Number(itemId));
    if (!item) return res.status(404).json({ error: "Program item not found" });

    const slides = repos.slides.forProgramItem(item);
    liveState = {
      ...liveState,
      currentItem: item,
      currentSlideIndex: Math.max(0, Math.min(Number(slideIndex), slides.length - 1)),
      currentSlide: slides[Math.max(0, Math.min(Number(slideIndex), slides.length - 1))] || null,
      nextSlide: getNextSlide(slides, Number(slideIndex)),
      activeOutput: "program",
      updatedAt: new Date().toISOString()
    };
    io.emit("live:update", liveState);
    res.json(liveState);
  });

  expressApp.post("/api/live/step", (req, res) => {
    const direction = req.body.direction === "previous" ? -1 : 1;
    if (!liveState.currentItem) return res.json(liveState);
    const slides = repos.slides.forProgramItem(liveState.currentItem);

    if (direction > 0 && liveState.currentSlideIndex >= slides.length - 1) {
      liveState = {
        ...liveState,
        currentSlide: null,
        nextSlide: null,
        activeOutput: "blank",
        updatedAt: new Date().toISOString()
      };
      io.emit("live:update", liveState);
      return res.json(liveState);
    }

    const targetIndex = liveState.activeOutput === "blank" && direction < 0
      ? slides.length - 1
      : liveState.currentSlideIndex + direction;
    const nextIndex = Math.max(0, Math.min(targetIndex, slides.length - 1));
    liveState = {
      ...liveState,
      currentSlideIndex: nextIndex,
      currentSlide: slides[nextIndex] || null,
      nextSlide: getNextSlide(slides, nextIndex),
      activeOutput: slides[nextIndex] ? "program" : "blank",
      updatedAt: new Date().toISOString()
    };
    io.emit("live:update", liveState);
    res.json(liveState);
  });

  expressApp.post("/api/live/clear", (_req, res) => {
    liveState = {
      ...liveState,
      currentSlide: null,
      nextSlide: null,
      activeOutput: "blank",
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
