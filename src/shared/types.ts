export type Song = {
  id: number;
  title: string;
  author?: string;
  sections: Record<string, string>;
  displayOrder: string[];
};

export type Slide = {
  id: string;
  type: string;
  label: string;
  title: string;
  body: string;
  notes?: string;
  sortOrder: number;
};

export type ProgramItem = {
  id: number;
  programId: number;
  type: string;
  title: string;
  songId?: number;
  filePath?: string;
  notes?: string;
  sortOrder: number;
  song?: Song | null;
};

export type Program = {
  id: number;
  title: string;
  service_date: string;
  status: string;
  items: ProgramItem[];
};

export type LiveState = {
  currentItem: ProgramItem | null;
  currentSlideIndex: number;
  currentSlide: Slide | null;
  nextSlide: Slide | null;
  activeOutput: "program" | "background";
  outputs?: {
    main: ScreenOutput;
    stage: ScreenOutput;
  };
  timer: {
    startedAt: string | null;
    durationSeconds: number | null;
  };
  programOrder: Program | null;
  libraryVersion: number;
  updatedAt: string;
};

export type ScreenOutput = {
  currentItem: ProgramItem | null;
  currentSlideIndex: number;
  currentSlide: Slide | null;
  nextSlide: Slide | null;
  activeOutput: "program" | "background";
};
