const fs = require("fs");
const path = require("path");

const libraryDir = path.join(__dirname, "..", "..", "media", "library");
const allowedTypes = {
  audio: [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/mp4"
  ],
  video: [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime"
  ],
  presentation: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
    "application/pdf"
  ]
};
const allowedExtensions = {
  audio: [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"],
  video: [".mp4", ".webm", ".ogg", ".mov", ".mkv", ".avi"],
  presentation: [".ppt", ".pptx", ".pps", ".ppsx", ".pdf"]
};

function ensureLibraryDir() {
  fs.mkdirSync(libraryDir, { recursive: true });
}

function sanitizeName(name) {
  return String(name || "media-file")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

function saveMediaFile({ dataUrl, fileName, mediaType }) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || "");
  if (!match) {
    throw new Error("Fisierul nu a putut fi citit.");
  }

  const mimeType = match[1];
  const extension = path.extname(fileName || "").toLowerCase();
  const typeAllowed = allowedTypes[mediaType]?.includes(mimeType);
  const extensionAllowed = allowedExtensions[mediaType]?.includes(extension);

  if (!typeAllowed && !extensionAllowed) {
    throw new Error("Tip de fisier neacceptat pentru acest compartiment.");
  }

  const buffer = Buffer.from(match[2], "base64");
  const maxBytes = 250 * 1024 * 1024;
  if (buffer.length > maxBytes) {
    throw new Error("Fisierul este prea mare. Limita este 250 MB.");
  }

  ensureLibraryDir();
  const safeName = sanitizeName(fileName);
  const storedName = `${Date.now()}-${safeName}`;
  const relativePath = `/media/library/${storedName}`;
  fs.writeFileSync(path.join(libraryDir, storedName), buffer);

  return {
    filePath: relativePath,
    mimeType,
    originalName: fileName,
    size: buffer.length
  };
}

module.exports = {
  saveMediaFile
};
