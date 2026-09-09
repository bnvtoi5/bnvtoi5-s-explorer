import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// CRC32 implementation for PNG chunks
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const body = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);

  return Buffer.concat([lenBuf, body, crcBuf]);
}

function createExplorerIconPNG(size) {
  // Create an RGBA buffer representing a Windows 11 style File Explorer icon:
  // Sleek Fluent folder in vibrant blue/azure gradient with a lighter front tab and subtle glow
  const rawScanlines = Buffer.alloc(size * (size * 4 + 1));

  for (let y = 0; y < size; y++) {
    const rowOffset = y * (size * 4 + 1);
    rawScanlines[rowOffset] = 0; // Filter: None

    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const nx = x / size;
      const ny = y / size;

      // Coordinate relative to center
      const cx = nx - 0.5;
      const cy = ny - 0.5;
      const distFromCenter = Math.sqrt(cx * cx + cy * cy);

      // Background backplate folder shape:
      // Rounded folder base: x from 0.12 to 0.88, y from 0.28 to 0.85
      // Back tab: x from 0.12 to 0.45, y from 0.18 to 0.28
      let r = 0, g = 0, b = 0, a = 0;

      // Soft rounded icon background (Windows 11 squircle)
      const inIconBox = nx >= 0.08 && nx <= 0.92 && ny >= 0.08 && ny <= 0.92;
      const cornerRadius = 0.20;
      let inSquircle = false;
      const dx = Math.max(0, Math.abs(nx - 0.5) - (0.42 - cornerRadius));
      const dy = Math.max(0, Math.abs(ny - 0.5) - (0.42 - cornerRadius));
      if (Math.sqrt(dx * dx + dy * dy) <= cornerRadius) {
        inSquircle = true;
      }

      if (inSquircle) {
        // App icon background: subtle deep navy/slate gradient
        const bgGrad = 0.15 + (1 - ny) * 0.15;
        r = Math.round(15 + bgGrad * 20);
        g = Math.round(23 + bgGrad * 30);
        b = Math.round(42 + bgGrad * 60);
        a = 255;

        // Front folder design
        // 1. Back flap:
        const inBackFlap = nx >= 0.22 && nx <= 0.48 && ny >= 0.26 && ny <= 0.38;
        if (inBackFlap) {
          r = 0x00; g = 0x78; b = 0xd4; // Windows Azure
        }

        // 2. Main folder body:
        const inFolderBody = nx >= 0.20 && nx <= 0.80 && ny >= 0.34 && ny <= 0.74;
        if (inFolderBody) {
          // Vibrant Fluent gradient (cyan to deep royal blue)
          const grad = (ny - 0.34) / 0.40;
          r = Math.round(14 * (1 - grad) + 0 * grad);
          g = Math.round(165 * (1 - grad) + 120 * grad);
          b = Math.round(233 * (1 - grad) + 212 * grad);

          // Subtle horizontal highlight in folder
          if (ny >= 0.35 && ny <= 0.37) {
            r = Math.min(255, r + 60);
            g = Math.min(255, g + 60);
            b = Math.min(255, b + 60);
          }

          // Inner front pocket / sheet
          if (nx >= 0.26 && nx <= 0.74 && ny >= 0.46 && ny <= 0.72) {
            const pocketGrad = (ny - 0.46) / 0.26;
            r = Math.round(56 * (1 - pocketGrad) + 14 * pocketGrad);
            g = Math.round(189 * (1 - pocketGrad) + 140 * pocketGrad);
            b = Math.round(248 * (1 - pocketGrad) + 220 * pocketGrad);

            // Clean white horizontal lines representing files
            if ((ny >= 0.52 && ny <= 0.54 && nx >= 0.32 && nx <= 0.62) ||
                (ny >= 0.58 && ny <= 0.60 && nx >= 0.32 && nx <= 0.54) ||
                (ny >= 0.64 && ny <= 0.66 && nx >= 0.32 && nx <= 0.48)) {
              r = 255; g = 255; b = 255;
              a = 240;
            }
          }
        }

        // Border accent
        if (Math.sqrt(dx * dx + dy * dy) >= cornerRadius - 0.02) {
          r = Math.round(r * 0.8 + 80 * 0.2);
          g = Math.round(g * 0.8 + 120 * 0.2);
          b = Math.round(b * 0.8 + 180 * 0.2);
        }
      }

      rawScanlines[pxOffset] = r;
      rawScanlines[pxOffset + 1] = g;
      rawScanlines[pxOffset + 2] = b;
      rawScanlines[pxOffset + 3] = a;
    }
  }

  // Deflate raw scanlines
  const deflated = zlib.deflateSync(rawScanlines, { level: 9 });

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', deflated);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createICO(pngBuffers) {
  // pngBuffers: array of { size, buffer }
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  let offset = 6 + count * 16;
  const dirEntries = [];
  const imageBuffers = [];

  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry[0] = item.size >= 256 ? 0 : item.size; // Width
    entry[1] = item.size >= 256 ? 0 : item.size; // Height
    entry[2] = 0; // Color count
    entry[3] = 0; // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // Size of image data
    entry.writeUInt32LE(offset, 12); // Offset to image data

    dirEntries.push(entry);
    imageBuffers.push(item.buffer);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...imageBuffers]);
}

// Ensure directories exist
const tauriIconsDir = path.resolve(projectRoot, 'src-tauri', 'icons');
const publicDir = path.resolve(projectRoot, 'public');
fs.mkdirSync(tauriIconsDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

console.log('Generating Windows icons...');
const png32 = createExplorerIconPNG(32);
const png128 = createExplorerIconPNG(128);
const png256 = createExplorerIconPNG(256);
const png512 = createExplorerIconPNG(512);

fs.writeFileSync(path.join(tauriIconsDir, '32x32.png'), png32);
fs.writeFileSync(path.join(tauriIconsDir, '128x128.png'), png128);
fs.writeFileSync(path.join(tauriIconsDir, '128x128@2x.png'), png256);
fs.writeFileSync(path.join(tauriIconsDir, 'icon.png'), png512);
fs.writeFileSync(path.join(publicDir, 'icon.png'), png512);

const icoBuffer = createICO([
  { size: 32, buffer: png32 },
  { size: 128, buffer: png128 },
  { size: 256, buffer: png256 },
]);
fs.writeFileSync(path.join(tauriIconsDir, 'icon.ico'), icoBuffer);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

console.log('Successfully generated all Windows 11 icon assets and .ico file!');
