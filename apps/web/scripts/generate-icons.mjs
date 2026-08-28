// Generates the PWA icon set (public/icons/) from the source logo at
// apps/web/assets/logo-source.png. Re-run after swapping in a new logo:
// replace that file and run `node scripts/generate-icons.mjs`.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "assets", "logo-source.png");
const OUT_DIR = join(ROOT, "public", "icons");

async function render(size, filename) {
  await sharp(SOURCE).resize(size, size, { fit: "cover" }).png().toFile(join(OUT_DIR, filename));
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
