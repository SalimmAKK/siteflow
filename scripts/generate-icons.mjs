// One-off, zero-dependency PWA icon generator.
//
// Renders the SiteFlow brand mark (black rounded square + amber flag, the same
// shape as src/components/Logo.tsx and .brand-mark in marketing.css) as raw
// PNGs using a hand-rolled encoder (Node's built-in zlib for DEFLATE + a
// manual CRC32), since no SVG rasterizer (sharp/rsvg-convert/imagemagick) is
// available in this environment. Run with: node scripts/generate-icons.mjs

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public');

const INK = [0x18, 0x18, 0x1a]; // near-black brand background
const HAZARD = [0xf2, 0xb7, 0x05]; // amber flag

// ---- tiny PNG encoder (truecolor + alpha, 8-bit) ---------------------------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Each scanline: 1 filter-type byte (0 = None) + width * 4 bytes RGBA.
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- brand-mark rasterizer --------------------------------------------------
// Proportions mirror Logo.tsx exactly:
//   horizontal bar: left 27%, top 30%, width 46%, height 11%
//   vertical bar:   left 30%, top 27%, width 11%, height 46%
function drawBrandMark(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const cornerRadius = maskable ? 0 : Math.round(size * 0.22);

  const insideRoundedSquare = (x, y) => {
    if (cornerRadius === 0) return true;
    const rx = Math.min(x, size - 1 - x);
    const ry = Math.min(y, size - 1 - y);
    if (rx >= cornerRadius || ry >= cornerRadius) return true;
    const dx = cornerRadius - rx;
    const dy = cornerRadius - ry;
    return dx * dx + dy * dy <= cornerRadius * cornerRadius;
  };

  const hBar = {
    x0: size * 0.27,
    y0: size * 0.3,
    x1: size * (0.27 + 0.46),
    y1: size * (0.3 + 0.11),
  };
  const vBar = {
    x0: size * 0.3,
    y0: size * 0.27,
    x1: size * (0.3 + 0.11),
    y1: size * (0.27 + 0.46),
  };
  const inBar = (x, y, b) => x >= b.x0 && x < b.x1 && y >= b.y0 && y < b.y1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (!insideRoundedSquare(x, y)) {
        rgba[i + 3] = 0; // fully transparent outside the rounded square
        continue;
      }
      const isFlag = inBar(x + 0.5, y + 0.5, hBar) || inBar(x + 0.5, y + 0.5, vBar);
      const [r, g, b] = isFlag ? HAZARD : INK;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

function writeIcon(name, size, opts) {
  const rgba = drawBrandMark(size, opts);
  const png = encodePNG(size, size, rgba);
  writeFileSync(path.join(OUT_DIR, name), png);
  console.log(`wrote public/${name} (${size}x${size}${opts?.maskable ? ', maskable/full-bleed' : ''})`);
}

writeIcon('pwa-192x192.png', 192);
writeIcon('pwa-512x512.png', 512);
writeIcon('pwa-maskable-512x512.png', 512, { maskable: true });
writeIcon('apple-touch-icon.png', 180, { maskable: true }); // iOS ignores transparency; full-bleed reads best

// ---- favicon.svg (vector, matches the same design) -------------------------
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#18181A"/>
  <rect x="27" y="30" width="46" height="11" fill="#F2B705"/>
  <rect x="30" y="27" width="11" height="46" fill="#F2B705"/>
</svg>
`;
writeFileSync(path.join(OUT_DIR, 'favicon.svg'), faviconSvg);
console.log('wrote public/favicon.svg');
