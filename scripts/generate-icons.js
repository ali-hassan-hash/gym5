import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPng(width, height, drawFn) {
  const rowBytes = width * 4;
  const rawData = Buffer.alloc((rowBytes + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowBytes + 1);
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const crc = crc32(body);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, body, crcBuf]);
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // Color type 6: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Logo drawer for G5MEKA (Dark Zinc Background + Geometric G Mark)
function drawG5MekaLogo(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  // Background: Zinc 950 (#09090b) with subtle radial highlight
  const dx = nx - 0.5;
  const dy = ny - 0.5;
  const dist = Math.sqrt(dx * dx + dy * dy);

  let bgR = 15;
  let bgG = 15;
  let bgB = 18;

  if (dist < 0.45) {
    const glow = (1 - dist / 0.45) * 20;
    bgR = Math.min(255, bgR + glow);
    bgG = Math.min(255, bgG + glow);
    bgB = Math.min(255, bgB + glow + 5);
  }

  // Draw Geometric G mark in normalized space [0.25 to 0.75]
  const inTopBar = nx >= 0.28 && nx <= 0.72 && ny >= 0.26 && ny <= 0.38;
  const inLeftSpine = nx >= 0.28 && nx <= 0.40 && ny >= 0.26 && ny <= 0.74;
  const inBottomBar = nx >= 0.28 && nx <= 0.72 && ny >= 0.62 && ny <= 0.74;
  const inRightLower = nx >= 0.60 && nx <= 0.72 && ny >= 0.46 && ny <= 0.74;
  const inCrossBar = nx >= 0.46 && nx <= 0.72 && ny >= 0.46 && ny <= 0.56;

  if (inTopBar || inLeftSpine || inBottomBar || inRightLower || inCrossBar) {
    // Silver / metallic gradient
    const silverRatio = (nx + ny) / 1.5;
    const s = 180 + silverRatio * 65;
    return [Math.round(s), Math.round(s + 5), Math.round(s + 10), 255];
  }

  // Border outline
  if (nx <= 0.02 || nx >= 0.98 || ny <= 0.02 || ny >= 0.98) {
    return [39, 39, 42, 255]; // Zinc 800
  }

  return [Math.round(bgR), Math.round(bgG), Math.round(bgB), 255];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, drawG5MekaLogo));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, drawG5MekaLogo));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, drawG5MekaLogo));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(64, 64, drawG5MekaLogo));

console.log('Successfully generated PWA PNG icons and favicon.');
