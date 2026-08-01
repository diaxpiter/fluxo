// Regenerates public/icons/*.png from a simple SVG monogram.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const BG = "#0a0a0a";
const FG = "#ededed";

const iconSvg = (size, padding) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${BG}" />
  <text
    x="50%"
    y="50%"
    dy=".08em"
    text-anchor="middle"
    dominant-baseline="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-weight="700"
    font-size="${(size - padding * 2) * 0.62}"
    fill="${FG}"
  >F</text>
</svg>`;

await mkdir("public/icons", { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192, padding: 0 },
  { file: "icon-512.png", size: 512, padding: 0 },
  // Maskable icons need extra padding so the glyph survives OS masking/cropping.
  { file: "icon-512-maskable.png", size: 512, padding: 96 },
];

for (const { file, size, padding } of targets) {
  await sharp(Buffer.from(iconSvg(size, padding)))
    .png()
    .toFile(`public/icons/${file}`);
  console.log(`wrote public/icons/${file}`);
}

await sharp(Buffer.from(iconSvg(180, 0)))
  .png()
  .toFile("public/icons/apple-touch-icon.png");
console.log("wrote public/icons/apple-touch-icon.png");
