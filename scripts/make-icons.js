// Genera los iconos PNG sin dependencias (solo Node).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'public', 'icons');
fs.mkdirSync(OUT, { recursive: true });

function crc32(buf) {
  let crc = ~0;
  for (const byte of buf) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (~crc) >>> 0;
}
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function insideRoundRect(x, y, rx, ry, w, h, radius) {
  if (x < rx || x > rx + w || y < ry || y > ry + h) return false;
  const cx = Math.min(Math.max(x, rx + radius), rx + w - radius);
  const cy = Math.min(Math.max(y, ry + radius), ry + h - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

// Estilo sobrio: fondo tinta plano, dos barras claras y la tercera en verde pino suave.
const BG_START = [28, 28, 30];
const BG_END = [28, 28, 30];
const BARS = [[245, 245, 247], [245, 245, 247], [134, 187, 168]];

function render(size, maskable) {
  const SS = 4;
  const W = size * SS;
  const samples = new Float32Array(W * W * 4);
  const corner = maskable ? 0 : W * 0.227;
  const barW = W * (54 / 512);
  const gap = W * (35 / 512);
  const startX = (W - (barW * 3 + gap * 2)) / 2;
  const heights = [W * (92 / 512), W * (152 / 512), W * (222 / 512)];
  const baseY = W * (392 / 512);
  const radius = barW / 2;
  const opacities = [0.45, 0.72, 1];

  for (let y = 0; y < W; y += 1) {
    for (let x = 0; x < W; x += 1) {
      let r = 0, g = 0, b = 0, a = 0;
      if (insideRoundRect(x, y, 0, 0, W, W, corner)) {
        const t = Math.min(1, (x / W) * 0.45 + (y / W) * 0.55);
        r = BG_START[0] + (BG_END[0] - BG_START[0]) * t;
        g = BG_START[1] + (BG_END[1] - BG_START[1]) * t;
        b = BG_START[2] + (BG_END[2] - BG_START[2]) * t;
        a = 255;
      }
      for (let i = 0; i < 3; i += 1) {
        const bx = startX + i * (barW + gap);
        const by = baseY - heights[i];
        if (insideRoundRect(x, y, bx, by, barW, heights[i], radius)) {
          const BAR = BARS[i];
          r = BAR[0] * opacities[i] + r * (1 - opacities[i]);
          g = BAR[1] * opacities[i] + g * (1 - opacities[i]);
          b = BAR[2] * opacities[i] + b * (1 - opacities[i]);
          a = 255;
        }
      }
      const idx = (y * W + x) * 4;
      samples[idx] = r;
      samples[idx + 1] = g;
      samples[idx + 2] = b;
      samples[idx + 3] = a;
    }
  }

  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const idx = ((y * SS + sy) * W + (x * SS + sx)) * 4;
          r += samples[idx];
          g += samples[idx + 1];
          b += samples[idx + 2];
          a += samples[idx + 3];
          n += 1;
        }
      }
      const alpha = a / n;
      const outIdx = (y * size + x) * 4;
      if (alpha > 0) {
        const covered = a / 255;
        out[outIdx] = Math.round(r / covered);
        out[outIdx + 1] = Math.round(g / covered);
        out[outIdx + 2] = Math.round(b / covered);
      }
      out[outIdx + 3] = Math.round(alpha);
    }
  }
  return encodePng(size, size, out);
}

const targets = [
  [192, false, 'icon-192.png'],
  [512, false, 'icon-512.png'],
  [512, true, 'icon-maskable-512.png'],
  [180, true, 'apple-touch-icon.png']
];
for (const [size, maskable, name] of targets) {
  fs.writeFileSync(path.join(OUT, name), render(size, maskable));
  console.log(`escrito public/icons/${name}`);
}
