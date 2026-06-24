#!/usr/bin/env node
const https = require("https");
const fs = require("fs");
const path = require("path");

const FONTS_DIR = path.join(__dirname, "..", "fonts");
const FONTS = [
  { name: "Poppins-Regular.ttf", url: "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Regular.ttf" },
  { name: "Poppins-SemiBold.ttf", url: "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-SemiBold.ttf" },
  { name: "Poppins-Bold.ttf", url: "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf" },
];

function download(url, dest, redirects = 0) {
  if (redirects > 5) throw new Error("Too many redirects");
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close(); fs.unlinkSync(dest);
        resolve(download(res.headers.location, dest, redirects + 1));
        return;
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode} for ${url}`)); return; }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
}

async function main() {
  if (!fs.existsSync(FONTS_DIR)) fs.mkdirSync(FONTS_DIR, { recursive: true });
  for (const font of FONTS) {
    const dest = path.join(FONTS_DIR, font.name);
    if (fs.existsSync(dest)) { console.log(`  ✓ ${font.name} already present`); continue; }
    process.stdout.write(`  ↓ Downloading ${font.name}…`);
    await download(font.url, dest);
    console.log(" done");
  }
}

main().catch((err) => { console.error("Font setup failed:", err.message); process.exit(1); });
