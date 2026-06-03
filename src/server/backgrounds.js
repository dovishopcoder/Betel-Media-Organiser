const fs = require("fs");
const path = require("path");

const mediaDir = path.join(__dirname, "..", "..", "media");
const backgroundDir = path.join(mediaDir, "backgrounds");
const supportedTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

function ensureBackgroundDir() {
  fs.mkdirSync(backgroundDir, { recursive: true });
}

function getMainBackground() {
  ensureBackgroundDir();
  const file = fs.readdirSync(backgroundDir).find((name) => /^main\.(jpg|jpeg|png|webp)$/i.test(name));
  if (!file) {
    return {
      url: "/media/backgrounds/main.jpg",
      exists: false
    };
  }

  return {
    url: `/media/backgrounds/${file}?v=${Date.now()}`,
    exists: true
  };
}

function saveMainBackground({ dataUrl }) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl || "");
  if (!match) {
    throw new Error("Unsupported image format. Use JPG, PNG, or WEBP.");
  }

  const mimeType = match[1];
  const extension = supportedTypes[mimeType];
  const buffer = Buffer.from(match[2], "base64");
  const maxBytes = 8 * 1024 * 1024;

  if (buffer.length > maxBytes) {
    throw new Error("Background image is too large. Maximum size is 8 MB.");
  }

  ensureBackgroundDir();
  for (const name of fs.readdirSync(backgroundDir)) {
    if (/^main\.(jpg|jpeg|png|webp)$/i.test(name)) {
      fs.unlinkSync(path.join(backgroundDir, name));
    }
  }

  const fileName = `main.${extension}`;
  fs.writeFileSync(path.join(backgroundDir, fileName), buffer);

  return {
    url: `/media/backgrounds/${fileName}?v=${Date.now()}`,
    exists: true
  };
}

module.exports = {
  getMainBackground,
  saveMainBackground
};
