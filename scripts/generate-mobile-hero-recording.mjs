import { mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const width = 1080;
const height = 360;
const fps = 6;
const seconds = 9;
const frameCount = fps * seconds;
const frameDelay = Math.round(1000 / fps);
const frameDir = new URL("../.tmp/hero-mobile-frames/", import.meta.url);
const outDir = new URL("../public/hero/", import.meta.url);
const outWebp = fileURLToPath(new URL("hero-mobile.webp", outDir));
const outPoster = fileURLToPath(new URL("hero-mobile-poster.png", outDir));

const ease = (x) => 0.5 - Math.cos(Math.PI * x) / 2;

function sample(values, duration, t) {
  const local = (t % duration) / duration;
  const segment = Math.min(values.length - 2, Math.floor(local * (values.length - 1)));
  const segmentStart = segment / (values.length - 1);
  const segmentProgress = (local - segmentStart) * (values.length - 1);
  const a = values[segment];
  const b = values[segment + 1];
  return a + (b - a) * ease(segmentProgress);
}

function frameSvg(t) {
  const mainRx = sample([420, 480, 390, 420], seconds, t);
  const mainRy = sample([340, 310, 365, 340], seconds, t);
  const softRx = sample([300, 340, 270, 300], seconds, t);

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 1440 480" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="blob-main" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="55" result="blur"/>
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="5" result="noise"/>
          <feComposite in="noise" in2="blur" operator="arithmetic" k1="0" k2="1" k3="1" k4="-0.5" result="mixed"/>
          <feColorMatrix type="matrix" in="mixed" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 28 -8" result="dots"/>
          <feFlood flood-color="#5838A0" result="col"/>
          <feComposite in="col" in2="dots" operator="in"/>
        </filter>
        <filter id="blob-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="40" result="blur"/>
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="23" result="noise"/>
          <feComposite in="noise" in2="blur" operator="arithmetic" k1="0" k2="1" k3="1" k4="-0.5" result="mixed"/>
          <feColorMatrix type="matrix" in="mixed" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 28 -9" result="dots"/>
          <feFlood flood-color="#C098D0" result="col"/>
          <feComposite in="col" in2="dots" operator="in"/>
        </filter>
      </defs>
      <ellipse cx="1100" cy="160" rx="${mainRx}" ry="${mainRy}" fill="#5838A0" filter="url(#blob-main)"/>
      <ellipse cx="1250" cy="390" rx="${softRx}" ry="240" fill="#C098D0" filter="url(#blob-soft)"/>
    </svg>
  `;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

await rm(frameDir, { recursive: true, force: true });
await mkdir(frameDir, { recursive: true });
await mkdir(outDir, { recursive: true });

const framePaths = [];
for (let index = 0; index < frameCount; index += 1) {
  const file = fileURLToPath(new URL(`${String(index).padStart(3, "0")}.png`, frameDir));
  framePaths.push(file);
  await sharp(Buffer.from(frameSvg(index / fps)))
    .png({ compressionLevel: 9 })
    .toFile(file);
}

await sharp(framePaths[0]).png({ compressionLevel: 9 }).toFile(outPoster);

const args = ["-loop", "0", "-lossy", "-q", "82", "-m", "4"];
for (const framePath of framePaths) {
  args.push("-d", String(frameDelay), framePath);
}
args.push("-o", outWebp);

try {
  await run("img2webp", args);
} catch (error) {
  console.warn(`${error.message}; writing a static WebP fallback instead.`);
  await sharp(outPoster).webp({ quality: 82 }).toFile(outWebp);
}

await rm(frameDir, { recursive: true, force: true });
