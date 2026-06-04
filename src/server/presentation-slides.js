const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");
const AdmZip = require("adm-zip");

function decodeXmlText(value) {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function naturalSlideSort(a, b) {
  const slideNumber = (name) => Number(name.match(/slide(\d+)\.xml$/)?.[1] || 0);
  return slideNumber(a.entryName) - slideNumber(b.entryName);
}

function absoluteMediaPath(filePath) {
  const cleanPath = String(filePath || "").replace(/^\/+/, "");
  return path.join(process.cwd(), cleanPath);
}

function generatedPresentationDir(item) {
  const sourcePath = absoluteMediaPath(item.filePath);
  const parsed = path.parse(sourcePath);
  const safeBaseName = parsed.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || `presentation-${item.id}`;
  return path.join(process.cwd(), "media", "generated", "presentations", safeBaseName);
}

function relativeMediaPath(absolutePath) {
  return `/${path.relative(process.cwd(), absolutePath).replace(/\\/g, "/")}`;
}

function listExportedSlideImages(outputDir) {
  if (!fs.existsSync(outputDir)) return [];

  return fs.readdirSync(outputDir)
    .filter((fileName) => /^slide-\d+\.png$/i.test(fileName))
    .sort((a, b) => Number(a.match(/\d+/)?.[0] || 0) - Number(b.match(/\d+/)?.[0] || 0))
    .map((fileName) => path.join(outputDir, fileName));
}

function exportPresentationImages(item) {
  if (!item?.filePath || !/\.(pptx|ppt|ppsx|pps)$/i.test(item.filePath)) {
    return [];
  }

  const inputPath = absoluteMediaPath(item.filePath);
  if (!fs.existsSync(inputPath)) return [];

  const outputDir = generatedPresentationDir(item);
  const existingImages = listExportedSlideImages(outputDir);
  if (existingImages.length > 0) {
    return existingImages;
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const result = spawnSync("powershell", [
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(process.cwd(), "scripts", "export-pptx-slides.ps1"),
    "-InputPath",
    inputPath,
    "-OutputDir",
    outputDir,
    "-Width",
    "1920",
    "-Height",
    "1080"
  ], {
    encoding: "utf8",
    windowsHide: true
  });

  if (result.status !== 0) {
    return [];
  }

  return listExportedSlideImages(outputDir);
}

function extractPresentationSlides(item) {
  const slideImages = exportPresentationImages(item);
  if (slideImages.length > 0) {
    return slideImages.map((imagePath, index) => ({
      id: `${item.id}-presentation-image-${index + 1}`,
      type: "presentation",
      label: `Slide ${index + 1}`,
      title: item.title,
      body: `Slide ${index + 1}`,
      filePath: relativeMediaPath(imagePath),
      notes: item.notes || "",
      sortOrder: index
    }));
  }

  return extractPptxTextSlides(item);
}

function extractTextFromSlideXml(xml) {
  const textRuns = Array.from(xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g))
    .map((match) => decodeXmlText(match[1].trim()))
    .filter(Boolean);

  return textRuns.join("\n");
}

function extractPptxTextSlides(item) {
  if (!item?.filePath || !String(item.filePath).toLowerCase().endsWith(".pptx")) {
    return [];
  }

  try {
    const zip = new AdmZip(absoluteMediaPath(item.filePath));
    const slideEntries = zip
      .getEntries()
      .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry.entryName))
      .sort(naturalSlideSort);

    return slideEntries.map((entry, index) => {
      const body = extractTextFromSlideXml(entry.getData().toString("utf8"));
      return {
        id: `${item.id}-pptx-${index + 1}`,
        type: "presentation",
        label: `Slide ${index + 1}`,
        title: item.title,
        body: body || `Slide ${index + 1}`,
        filePath: item.filePath,
        notes: item.notes || "",
        sortOrder: index
      };
    });
  } catch (_error) {
    return [];
  }
}

module.exports = {
  extractPresentationSlides,
  extractPptxTextSlides
};
