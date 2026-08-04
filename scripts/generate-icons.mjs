// Regenerates public/icons/*.png from the "Ring Node" mark: a flat off-white
// ring with a single green node breaking the loop, on a black ground.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const BG = "#0a0a0a";
const RING = "#f4f5f4";
const ACCENT = "#10b981";

// `rounded` bakes in our own corner radius — only wanted for icons the OS
// won't mask itself (the plain manifest icons). `safeScale` shrinks the mark
// around its own center so it survives an arbitrary OS mask (maskable icons).
const ringMarkSvg = (size, { rounded = true, safeScale = 1 } = {}) => {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.28 * safeScale;
  const strokeWidth = size * 0.085 * safeScale;
  const notch = size * 0.18 * safeScale;
  const dot = size * 0.14 * safeScale;
  const dotRadius = dot * 0.214;
  const notchX = cx - notch / 2;
  const notchY = cy - r - notch / 2;
  const dotX = cx - dot / 2;
  const dotY = cy - r - dot / 2;
  const cornerRadius = rounded ? size * 0.22 : 0;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="${BG}" />
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${RING}" stroke-width="${strokeWidth}" />
  <rect x="${notchX}" y="${notchY}" width="${notch}" height="${notch}" fill="${BG}" />
  <rect x="${dotX}" y="${dotY}" width="${dot}" height="${dot}" rx="${dotRadius}" fill="${ACCENT}" />
</svg>`;
};

await mkdir("public/icons", { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192, opts: {} },
  { file: "icon-512.png", size: 512, opts: {} },
  // Maskable icons are cropped to an arbitrary shape by the OS/launcher, so
  // the background must be full-bleed and the mark shrunk to stay inside the
  // safe zone.
  { file: "icon-512-maskable.png", size: 512, opts: { rounded: false, safeScale: 0.85 } },
];

for (const { file, size, opts } of targets) {
  await sharp(Buffer.from(ringMarkSvg(size, opts)))
    .png()
    .toFile(`public/icons/${file}`);
  console.log(`wrote public/icons/${file}`);
}

// iOS applies its own corner mask to the apple touch icon, so ship a plain
// square — baking in our own radius would leave a faint ghost edge behind it.
await sharp(Buffer.from(ringMarkSvg(180, { rounded: false })))
  .png()
  .toFile("public/icons/apple-touch-icon.png");
console.log("wrote public/icons/apple-touch-icon.png");
