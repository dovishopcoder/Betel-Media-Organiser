export const itemLabels: Record<string, string> = {
  song: "Cantare comuna",
  solo_song: "Cantare Solo/grup",
  prayer: "Rugaciune",
  sermon: "Predica",
  presentation: "Prezentare",
  announcements: "Anunturi",
  video: "Video",
  audio: "Audio",
  pause: "Pauza",
  special: "Moment special"
};

export const serviceTemplates = [
  { type: "vineri_seara", title: "Vineri seara" },
  { type: "scoala_sabat", title: "Scoala de sabat" },
  { type: "serviciul_divin", title: "Serviciul Divin" },
  { type: "serviciul_seara", title: "Serviciul seara" },
  { type: "sfanta_cina", title: "Sfanta cina" },
  { type: "custom", title: "Serviciu custom" }
];

export const blockTemplates = [
  { type: "song", title: "Cantare comuna", notes: "Text din librarie / text + fonograma / video karaoke" },
  { type: "solo_song", title: "Cantare Solo/grup", notes: "Text din librarie / text + fonograma / audio fisier" },
  { type: "prayer", title: "Rugaciune", notes: "Moment de rugaciune" },
  { type: "sermon", title: "Predica", notes: "Mesaj / timer" },
  { type: "presentation", title: "Prezentare", notes: "PowerPoint / PDF" },
  { type: "announcements", title: "Anunturi", notes: "Anunturi pentru biserica" },
  { type: "video", title: "Video", notes: "Fisier video" },
  { type: "audio", title: "Audio", notes: "Sunet fara continut pe ecrane" },
  { type: "pause", title: "Pauza", notes: "Fundal / repaus" },
  { type: "special", title: "Moment special", notes: "Moment special" }
];
