import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const outDir = new URL("../public/masks/", import.meta.url);

const masks = [
  {
    file: "hero-blob-main.png",
    stdDeviation: 55,
    seed: 5,
    threshold: "28 -8",
    ellipse: { cx: 1100, cy: 160, rx: 420, ry: 340 }
  },
  {
    file: "hero-blob-soft.png",
    stdDeviation: 40,
    seed: 23,
    threshold: "28 -9",
    ellipse: { cx: 1250, cy: 390, rx: 300, ry: 240 }
  }
];

function maskSvg({ stdDeviation, seed, threshold, ellipse }) {
  return `
    <svg width="1440" height="480" viewBox="0 0 1440 480" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="stipple" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="${stdDeviation}" result="blur"/>
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="${seed}" result="noise"/>
          <feComposite in="noise" in2="blur" operator="arithmetic" k1="0" k2="1" k3="1" k4="-0.5" result="mixed"/>
          <feColorMatrix type="matrix" in="mixed" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${threshold}" result="dots"/>
          <feFlood flood-color="#ffffff" result="col"/>
          <feComposite in="col" in2="dots" operator="in"/>
        </filter>
      </defs>
      <rect width="1440" height="480" fill="transparent"/>
      <ellipse cx="${ellipse.cx}" cy="${ellipse.cy}" rx="${ellipse.rx}" ry="${ellipse.ry}" fill="#ffffff" filter="url(#stipple)"/>
    </svg>
  `;
}

await mkdir(outDir, { recursive: true });

await Promise.all(
  masks.map(async (mask) => {
    await sharp(Buffer.from(maskSvg(mask)))
      .png({ compressionLevel: 9, palette: true })
      .toFile(fileURLToPath(new URL(mask.file, outDir)));
  })
);
