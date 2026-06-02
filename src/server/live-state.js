const { createSlidesForItem } = require("./repositories");

function getNextSlide(slides, currentIndex) {
  return slides[currentIndex + 1] || null;
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
  getNextSlide
};
