const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..", "..");
const dataDir = path.join(rootDir, "data");
const templatesPath = path.join(dataDir, "service-templates.json");

const defaultServiceProgramTemplates = {
  vineri_seara: [
    { type: "song", title: "Cantare deschidere", notes: "Cuvinte + fonograma" },
    { type: "prayer", title: "Rugaciune", notes: "Moment de rugaciune" },
    { type: "sermon", title: "Mesaj", notes: "Predica / devotional" },
    { type: "song", title: "Cantare incheiere", notes: "Cuvinte + fonograma" }
  ],
  scoala_sabat: [
    { type: "song", title: "Cantare deschidere", notes: "Cuvinte + fonograma" },
    { type: "prayer", title: "Rugaciune", notes: "Moment de rugaciune" },
    { type: "special", title: "Studiu biblic", notes: "Lectie / clasa" },
    { type: "announcements", title: "Anunturi", notes: "Anunturi pentru biserica" }
  ],
  serviciul_divin: [
    { type: "song", title: "Cantare deschidere", notes: "Cuvinte + fonograma" },
    { type: "prayer", title: "Rugaciune", notes: "Moment de rugaciune" },
    { type: "announcements", title: "Anunturi", notes: "Anunturi pentru biserica" },
    { type: "song", title: "Cantare speciala", notes: "Cuvinte + fonograma" },
    { type: "sermon", title: "Predica", notes: "Mesaj / timer" },
    { type: "song", title: "Cantare finala", notes: "Cuvinte + fonograma" }
  ],
  serviciul_seara: [
    { type: "song", title: "Cantare deschidere", notes: "Cuvinte + fonograma" },
    { type: "prayer", title: "Rugaciune", notes: "Moment de rugaciune" },
    { type: "sermon", title: "Mesaj", notes: "Predica / devotional" },
    { type: "special", title: "Moment special", notes: "Marturie / muzica" },
    { type: "song", title: "Cantare finala", notes: "Cuvinte + fonograma" }
  ],
  sfanta_cina: [
    { type: "song", title: "Cantare deschidere", notes: "Cuvinte + fonograma" },
    { type: "prayer", title: "Rugaciune", notes: "Moment de rugaciune" },
    { type: "sermon", title: "Meditatie", notes: "Mesaj scurt" },
    { type: "special", title: "Sfanta cina", notes: "Moment special" },
    { type: "song", title: "Cantare finala", notes: "Cuvinte + fonograma" }
  ],
  custom: []
};

function normalizeTemplateItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      type: typeof item.type === "string" ? item.type : "special",
      title: typeof item.title === "string" && item.title.trim() ? item.title.trim() : "Punct program",
      notes: typeof item.notes === "string" ? item.notes : ""
    }))
    .slice(0, 80);
}

function ensureTemplateFile() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(templatesPath)) {
    fs.writeFileSync(templatesPath, JSON.stringify(defaultServiceProgramTemplates, null, 2));
  }
}

function readTemplates() {
  ensureTemplateFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(templatesPath, "utf8"));
    return {
      ...defaultServiceProgramTemplates,
      ...Object.fromEntries(Object.entries(parsed || {}).map(([key, value]) => [key, normalizeTemplateItems(value)]))
    };
  } catch (_error) {
    return { ...defaultServiceProgramTemplates };
  }
}

function writeTemplates(templates) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2));
}

function getServiceProgramTemplates() {
  return readTemplates();
}

function getServiceProgramTemplate(serviceType) {
  const templates = readTemplates();
  return templates[serviceType] || templates.custom || [];
}

function saveServiceProgramTemplate(serviceType, items) {
  const templates = readTemplates();
  templates[serviceType || "custom"] = normalizeTemplateItems(items);
  writeTemplates(templates);
  return templates;
}

module.exports = {
  defaultServiceProgramTemplates,
  getServiceProgramTemplate,
  getServiceProgramTemplates,
  saveServiceProgramTemplate
};
