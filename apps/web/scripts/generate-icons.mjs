// Generates the PWA icon set (public/icons/) from an inline SVG placeholder
// mark. Re-run this after swapping in real branding: replace ICON_SVG below
// (or point it at a real source file) and run `node scripts/generate-icons.mjs`.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
const BG = "#0a0d11";
const ACCENT = "#e63946";

// Simple placeholder mark: a red badge with a bold "F" on the app's dark
// background. Content sits inside the central ~80% safe zone so it survives
// Android's maskable-icon cropping.
function iconSvg({ size, badgeOnly }) {
  const cx = size / 2;
  const cy = size / 2;
  const badgeR = size * 0.32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${badgeOnly ? "" : `<rect width="${size}" height="${size}" fill="${BG}"/>`}
  <circle cx="${cx}" cy="${cy}" r="${badgeR}" fill="${ACCENT}"/>
  <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"
    font-family="Arial, sans-serif" font-weight="800" font-size="${badgeR * 1.15}"
    fill="#ffffff">F</text>
</svg>`;
}

async function render(svg, size, filename) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(OUT_DIR, filename));
  console.log(`wrote icons/${filename}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await render(iconSvg({ size: 192, badgeOnly: false }), 192, "icon-192.png");
  await render(iconSvg({ size: 512, badgeOnly: false }), 512, "icon-512.png");
  // Maskable: background fills the full square, badge stays within the safe zone.
  await render(iconSvg({ size: 512, badgeOnly: false }), 512, "icon-512-maskable.png");
  await render(iconSvg({ size: 180, badgeOnly: false }), 180, "apple-touch-icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
