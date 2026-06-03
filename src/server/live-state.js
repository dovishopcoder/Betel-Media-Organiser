const { createSlidesForItem } = require("./repositories");

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

function createInitialLiveState(repos) {
  const activeProgram = repos.programs.getActiveWithItems();
  const firstItem = activeProgram?.items?.[0] || null;
  const slides = firstItem ? createSlidesForItem(firstItem) : [];

  return {
    currentItem: firstItem,
    currentSlideIndex: 0,
    currentSlide: slides[0] || null,
    nextSlide: getNextSlide(slides, 0),
    activeOutput: firstItem ? "program" : "blank",
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
  createInitialLiveState,
  getNextSlide,
  idleSlide
};
