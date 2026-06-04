const path = require("path");
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

function extractTextFromSlideXml(xml) {
  const textRuns = Array.from(xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g))
    .map((match) => decodeXmlText(match[1].trim()))
    .filter(Boolean);

  return textRuns.join("\n");
}

function extractPptxSlides(item) {
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
  extractPptxSlides
};
