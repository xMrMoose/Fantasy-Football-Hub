// Generates the PWA icon set (public/icons/) from an inline SVG placeholder
// mark. Re-run this after swapping in real branding: replace iconSvg() below
// (or point it at a real source file) and run `node scripts/generate-icons.mjs`.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
const BG = "#0b2545"; // deep blue
const BADGE = "#4fc3ff"; // light blue
const FOOTBALL = "#0b2545"; // deep blue (same as bg, reads as a silhouette on the badge)
const LACE = "#ffffff";

// Placeholder mark: a light-blue badge on a deep-blue background with a
// centered cartoon football silhouette (laces included). Content sits inside
// the central ~80% safe zone so it survives Android's maskable-icon cropping.
function iconSvg(size) {
  const cx = size / 2;
  const cy = size / 2;
  const badgeR = size * 0.34;
  const ballRx = badgeR * 0.78;
  const ballRy = badgeR * 0.46;
  const laceHalf = ballRx * 0.42;
  const tick = ballRy * 0.28;
  const tickGap = laceHalf * 0.42;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <circle cx="${cx}" cy="${cy}" r="${badgeR}" fill="${BADGE}"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${ballRx}" ry="${ballRy}" fill="${FOOTBALL}"/>
  <line x1="${cx - laceHalf}" y1="${cy}" x2="${cx + laceHalf}" y2="${cy}" stroke="${LACE}" stroke-width="${size * 0.016}" stroke-linecap="round"/>
  <line x1="${cx - tickGap}" y1="${cy - tick}" x2="${cx - tickGap}" y2="${cy + tick}" stroke="${LACE}" stroke-width="${size * 0.014}" stroke-linecap="round"/>
  <line x1="${cx}" y1="${cy - tick}" x2="${cx}" y2="${cy + tick}" stroke="${LACE}" stroke-width="${size * 0.014}" stroke-linecap="round"/>
  <line x1="${cx + tickGap}" y1="${cy - tick}" x2="${cx + tickGap}" y2="${cy + tick}" stroke="${LACE}" stroke-width="${size * 0.014}" stroke-linecap="round"/>
</svg>`;
}

async function render(size, filename) {
  await sharp(Buffer.from(iconSvg(size))).resize(size, size).png().toFile(join(OUT_DIR, filename));
  console.log(`wrote icons/${filename}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await render(192, "icon-192.png");
  await render(512, "icon-512.png");
  await render(512, "icon-512-maskable.png");
  await render(180, "apple-touch-icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
