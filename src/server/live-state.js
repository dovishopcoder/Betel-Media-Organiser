const idleSlide = {
  id: "idle-background",
  type: "idle",
  label: "fundal",
  title: "Imagine de fundal",
  body: "Ecran in repaus",
  notes: "",
  sortOrder: 9999
};

function getNextSlide(slides, currentIndex) {
  return slides[currentIndex + 1] || idleSlide;
}

function createOutputState(item, slides, slideIndex) {
  const index = Math.max(0, Math.min(Number(slideIndex), Math.max(slides.length - 1, 0)));

  return {
    currentItem: item,
    currentSlideIndex: index,
    currentSlide: slides[index] || null,
    nextSlide: getNextSlide(slides, index),
    activeOutput: slides[index] ? "program" : "background"
  };
}

function createIdleOutputState() {
  return {
    currentItem: null,
    currentSlideIndex: 0,
    currentSlide: null,
    nextSlide: null,
    activeOutput: "background"
  };
}

function createInitialLiveState(repos) {
  const activeProgram = repos.programs.getActiveWithItems();
  const idleOutput = createIdleOutputState();

  return {
    ...idleOutput,
    outputs: {
      main: idleOutput,
      stage: idleOutput
    },
    timer: {
      startedAt: null,
      durationSeconds: null
    },
    programOrder: activeProgram,
    libraryVersion: 1,
    updatedAt: new Date().toISOString()
  };
}

module.exports = {
  createOutputState,
  createIdleOutputState,
  createInitialLiveState,
  getNextSlide,
  idleSlide
};
