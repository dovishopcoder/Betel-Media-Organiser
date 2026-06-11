const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const dataDir = path.join(__dirname, "..", "..", "data");
const settingsPath = path.join(dataDir, "display-settings.json");

const defaultSettings = {
  main: "",
  stage: "",
  control: ""
};

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function getDisplaySettings() {
  ensureDataDir();
  if (!fs.existsSync(settingsPath)) {
    return { ...defaultSettings };
  }

  try {
    return { ...defaultSettings, ...JSON.parse(fs.readFileSync(settingsPath, "utf8")) };
  } catch (_error) {
    return { ...defaultSettings };
  }
}

function saveDisplaySettings(input = {}) {
  ensureDataDir();
  const settings = {
    main: String(input.main || ""),
    stage: String(input.stage || ""),
    control: String(input.control || "")
  };
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  return settings;
}

function detectDisplays() {
  const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Screen]::AllScreens | ForEach-Object {
  [PSCustomObject]@{
    deviceName = $_.DeviceName
    primary = $_.Primary
    x = $_.Bounds.X
    y = $_.Bounds.Y
    width = $_.Bounds.Width
    height = $_.Bounds.Height
  }
} | ConvertTo-Json -Depth 3
`;

  const output = execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    encoding: "utf8",
    windowsHide: true
  }).trim();

  if (!output) return [];
  const parsed = JSON.parse(output);
  return Array.isArray(parsed) ? parsed : [parsed];
}

module.exports = {
  detectDisplays,
  getDisplaySettings,
  saveDisplaySettings
};
