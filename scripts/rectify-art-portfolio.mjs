import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const workspace = process.cwd();
const sourceRoot = process.env.ART_SOURCE_ROOT ?? "/private/tmp/mysite_original_photos_backup_workspace";
const heicRenderRoot = process.env.ART_HEIC_RENDER_ROOT ?? "/private/tmp/mysite_large";
const outputRoot = process.env.ART_OUTPUT_ROOT ?? path.join(workspace, "art_porfolio");
const debugRoot = process.env.ART_DEBUG_ROOT ?? "";
const removeBorderRegions = process.env.ART_REMOVE_BORDER_REGIONS === "1";

const jobs = [
  ["watercolor/8B35D428-174B-4231-A4F0-D4D0CB6F871C.JPG", "watercolor/city_view.jpg"],
  ["watercolor/IMG_0704.HEIC", "watercolor/capybara.jpg"],
  ["watercolor/IMG_0776.HEIC", "watercolor/girl_portrait.jpg"],
  ["watercolor/IMG_3377.HEIC", "watercolor/bear_study.jpg"],
  ["watercolor/IMG_3378.HEIC", "watercolor/wave_study.jpg"],
  ["watercolor/IMG_5489.HEIC", "watercolor/shrine.jpg"],
  ["watercolor/IMG_6297.HEIC", "watercolor/purple_figure.jpg"],
  ["watercolor/IMG_6298.HEIC", "watercolor/green_tree.jpg"],
  ["watercolor/IMG_6299.HEIC", "watercolor/street_steps.jpg"],
  ["watercolor/IMG_6300.HEIC", "watercolor/blue_harbor.jpg"],
  ["watercolor/IMG_6301.HEIC", "watercolor/gray_hills.jpg"],
  ["watercolor/IMG_6302.HEIC", "watercolor/night_tent.jpg"],
  ["watercolor/IMG_6303.HEIC", "watercolor/curly_dog.jpg"],
  ["watercolor/IMG_6304.HEIC", "watercolor/purple_notes.jpg"],
  ["watercolor/IMG_6305.HEIC", "watercolor/yellow_house.jpg"],
  ["watercolor/IMG_6306.HEIC", "watercolor/blue_pattern.jpg"],
  ["watercolor/IMG_6308.HEIC", "watercolor/ink_village.jpg"],
  ["watercolor/IMG_6309.HEIC", "watercolor/golden_gate.jpg"],
  ["watercolor/IMG_6310.HEIC", "watercolor/rainy_road.jpg"],
  ["watercolor/IMG_6311.HEIC", "watercolor/open_sky.jpg"],
  ["watercolor/IMG_6313.HEIC", "watercolor/beach_pair.jpg"],
  ["watercolor/IMG_6314.HEIC", "watercolor/green_branches.jpg"],
  ["watercolor/IMG_7879.JPG", "watercolor/picnic_field.jpg"],
  ["paintings/IMG_1952.HEIC", "paintings/bird_study.jpg"],
  ["paintings/IMG_6262.HEIC", "paintings/sea_cliffs.jpg"],
  ["paintings/dad.JPG", "paintings/dad.jpg"]
];

function sourceFor(rel) {
  if (/\.heic$/i.test(rel)) {
    return path.join(heicRenderRoot, `${path.basename(rel)}.png`);
  }
  return path.join(sourceRoot, rel);
}

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function loadForDetection(file) {
  const max = 900;
  const { data, info } = await sharp(file, { limitInputPixels: false })
    .rotate()
    .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

function buildPaperMask({ data, width, height, channels }) {
  const mask = new Uint8Array(width * height);
  const lumas = [];
  for (let i = 0, p = 0; i < data.length; i += channels, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const y = luminance(r, g, b);
    if (p % 11 === 0) lumas.push(y);
  }
  lumas.sort((a, b) => a - b);
  const p55 = lumas[Math.floor(lumas.length * 0.55)] ?? 145;
  const threshold = Math.max(118, Math.min(188, p55 + 18));

  for (let i = 0, p = 0; i < data.length; i += channels, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const y = luminance(r, g, b);
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (y > threshold || (y > 105 && chroma < 42)) mask[p] = 1;
  }

  const closed = erode(dilate(mask, width, height, 9), width, height, 5);
  return removeBorderRegions ? removeBorderConnected(closed, width, height) : closed;
}

function removeBorderConnected(mask, width, height) {
  const out = new Uint8Array(mask);
  const queue = [];
  const push = (x, y) => {
    const index = y * width + x;
    if (out[index]) {
      out[index] = 0;
      queue.push([x, y]);
    }
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }
  return out;
}

function dilate(mask, width, height, radius) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let on = 0;
      for (let yy = Math.max(0, y - radius); yy <= Math.min(height - 1, y + radius) && !on; yy++) {
        for (let xx = Math.max(0, x - radius); xx <= Math.min(width - 1, x + radius); xx++) {
          if (mask[yy * width + xx]) {
            on = 1;
            break;
          }
        }
      }
      out[y * width + x] = on;
    }
  }
  return out;
}

function erode(mask, width, height, radius) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let on = 1;
      for (let yy = Math.max(0, y - radius); yy <= Math.min(height - 1, y + radius) && on; yy++) {
        for (let xx = Math.max(0, x - radius); xx <= Math.min(width - 1, x + radius); xx++) {
          if (!mask[yy * width + xx]) {
            on = 0;
            break;
          }
        }
      }
      out[y * width + x] = on;
    }
  }
  return out;
}

function largestComponent(mask, width, height) {
  const seen = new Uint8Array(mask.length);
  const components = [];
  const qx = new Int32Array(mask.length);
  const qy = new Int32Array(mask.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x;
      if (!mask[start] || seen[start]) continue;
      let head = 0;
      let tail = 0;
      let area = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      const points = [];
      seen[start] = 1;
      qx[tail] = x;
      qy[tail++] = y;
      while (head < tail) {
        const cx = qx[head];
        const cy = qy[head++];
        area++;
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);
        if (cx === 0 || cy === 0 || cx === width - 1 || cy === height - 1) {
          points.push([cx, cy]);
        } else if (!mask[cy * width + cx - 1] || !mask[cy * width + cx + 1] || !mask[(cy - 1) * width + cx] || !mask[(cy + 1) * width + cx]) {
          points.push([cx, cy]);
        }
        const neighbors = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const n = ny * width + nx;
          if (mask[n] && !seen[n]) {
            seen[n] = 1;
            qx[tail] = nx;
            qy[tail++] = ny;
          }
        }
      }
      components.push({ area, minX, maxX, minY, maxY, points });
    }
  }

  const cx = width / 2;
  const cy = height / 2;
  return components
    .filter((c) => c.area > width * height * 0.035)
    .sort((a, b) => componentScore(b, cx, cy) - componentScore(a, cx, cy))[0];
}

function componentScore(c, cx, cy) {
  const bx = (c.minX + c.maxX) / 2;
  const by = (c.minY + c.maxY) / 2;
  const dist = Math.hypot((bx - cx) / cx, (by - cy) / cy);
  return c.area * (1.4 - Math.min(1.1, dist));
}

function cornersFromComponent(component, width, height) {
  const inset = 2;
  const points = component.points.filter(([x, y]) => (
    x > inset && y > inset && x < width - inset && y < height - inset
  ));
  if (points.length < 40) return null;

  const corner = (score) => points.reduce((best, p) => (score(p) > score(best) ? p : best), points[0]);
  const tl = corner(([x, y]) => -x - y);
  const tr = corner(([x, y]) => x - y);
  const br = corner(([x, y]) => x + y);
  const bl = corner(([x, y]) => -x + y);
  const quad = [tl, tr, br, bl].map(([x, y]) => ({ x, y }));
  const area = polygonArea(quad);
  const bboxArea = (component.maxX - component.minX + 1) * (component.maxY - component.minY + 1);
  if (area < width * height * 0.05 || area < bboxArea * 0.42) return null;
  return expandQuad(quad, width, height, 0.018);
}

function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area / 2);
}

function expandQuad(points, width, height, amount) {
  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  return points.map((p) => ({
    x: Math.max(0, Math.min(width - 1, p.x + (p.x - cx) * amount)),
    y: Math.max(0, Math.min(height - 1, p.y + (p.y - cy) * amount))
  }));
}

function solveHomography(src, dst) {
  const a = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = dst[i];
    const u = src[i].x;
    const v = src[i].y;
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = gaussianSolve(a, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

function gaussianSolve(a, b) {
  const n = b.length;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    [a[col], a[pivot]] = [a[pivot], a[col]];
    [b[col], b[pivot]] = [b[pivot], b[col]];
    const div = a[col][col] || 1e-12;
    for (let j = col; j < n; j++) a[col][j] /= div;
    b[col] /= div;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let j = col; j < n; j++) a[row][j] -= factor * a[col][j];
      b[row] -= factor * b[col];
    }
  }
  return b;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

async function warpToRect(file, quad) {
  const base = sharp(file, { limitInputPixels: false }).rotate().ensureAlpha();
  const meta = await base.metadata();
  const scaleX = meta.width / quad.detectWidth;
  const scaleY = meta.height / quad.detectHeight;
  const srcQuad = quad.points.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY }));
  const top = distance(srcQuad[0], srcQuad[1]);
  const right = distance(srcQuad[1], srcQuad[2]);
  const bottom = distance(srcQuad[2], srcQuad[3]);
  const left = distance(srcQuad[3], srcQuad[0]);
  const outW = Math.max(80, Math.round(Math.max(top, bottom)));
  const outH = Math.max(80, Math.round(Math.max(left, right)));
  const maxSide = 2200;
  const outScale = Math.min(1, maxSide / Math.max(outW, outH));
  const width = Math.round(outW * outScale);
  const height = Math.round(outH * outScale);
  const dstQuad = [
    { x: 0, y: 0 },
    { x: width - 1, y: 0 },
    { x: width - 1, y: height - 1 },
    { x: 0, y: height - 1 }
  ];
  const h = solveHomography(srcQuad, dstQuad);
  const { data, info } = await base.raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(width * height * 4, 255);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const den = h[6] * x + h[7] * y + h[8];
      const sx = (h[0] * x + h[1] * y + h[2]) / den;
      const sy = (h[3] * x + h[4] * y + h[5]) / den;
      sampleBilinear(data, info.width, info.height, info.channels, sx, sy, out, (y * width + x) * 4);
    }
  }
  return sharp(out, { raw: { width, height, channels: 4 } })
    .flatten({ background: "#f8f6f0" })
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .modulate({ brightness: 1.015, saturation: 1.025 })
    .linear(1.02, -1)
    .sharpen({ sigma: 0.45, m1: 0.35, m2: 0.7 });
}

function sampleBilinear(src, width, height, channels, x, y, out, offset) {
  const x0 = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(width - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(height - 1, y0 + 1));
  const dx = x - x0;
  const dy = y - y0;
  const weights = [
    (1 - dx) * (1 - dy),
    dx * (1 - dy),
    (1 - dx) * dy,
    dx * dy
  ];
  const idx = [
    (y0 * width + x0) * channels,
    (y0 * width + x1) * channels,
    (y1 * width + x0) * channels,
    (y1 * width + x1) * channels
  ];
  for (let c = 0; c < 4; c++) {
    let value = 0;
    for (let i = 0; i < 4; i++) value += (src[idx[i] + c] ?? 255) * weights[i];
    out[offset + c] = Math.max(0, Math.min(255, Math.round(value)));
  }
}

async function debugOverlay(file, dest, detected) {
  if (!debugRoot) return;
  const image = sharp(file, { limitInputPixels: false }).rotate();
  const meta = await image.metadata();
  const scaleX = meta.width / detected.detectWidth;
  const scaleY = meta.height / detected.detectHeight;
  const points = detected.points.map((p) => `${p.x * scaleX},${p.y * scaleY}`).join(" ");
  const svg = `<svg width="${meta.width}" height="${meta.height}" xmlns="http://www.w3.org/2000/svg"><polygon points="${points}" fill="none" stroke="#ff3b30" stroke-width="${Math.max(8, meta.width * 0.004)}"/></svg>`;
  const out = path.join(debugRoot, dest.replace(/[/.]/g, "_") + ".jpg");
  ensureDir(out);
  await image.composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).jpeg({ quality: 82 }).toFile(out);
}

async function detectQuad(file) {
  const detection = await loadForDetection(file);
  const mask = buildPaperMask(detection);
  const component = largestComponent(mask, detection.width, detection.height);
  if (!component) return null;
  const points = cornersFromComponent(component, detection.width, detection.height);
  if (!points) return null;
  return { points, detectWidth: detection.width, detectHeight: detection.height };
}

async function fallbackTrim(file) {
  return sharp(file, { limitInputPixels: false })
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .modulate({ brightness: 1.015, saturation: 1.025 })
    .linear(1.02, -1)
    .sharpen({ sigma: 0.45, m1: 0.35, m2: 0.7 });
}

for (const [sourceRel, destRel] of jobs) {
  const source = sourceFor(sourceRel);
  const dest = path.join(outputRoot, destRel);
  ensureDir(dest);
  const detected = await detectQuad(source);
  const image = detected ? await warpToRect(source, detected) : await fallbackTrim(source);
  await image.jpeg({ quality: 91, mozjpeg: true }).toFile(dest);
  if (detected) await debugOverlay(source, destRel, detected);
  console.log(`${detected ? "rectified" : "fallback"} ${sourceRel} -> ${destRel}`);
}
