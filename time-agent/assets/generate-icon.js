/**
 * Run this script once to generate the tray icon: node assets/generate-icon.js
 * Creates a simple 32x32 green circle PNG.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

const w = 32;
const h = 32;
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(w, 0);
ihdr.writeUInt32BE(h, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // RGBA color type

const raw = [];
for (let y = 0; y < h; y++) {
  raw.push(0); // filter: none
  for (let x = 0; x < w; x++) {
    const cx = x - 15.5;
    const cy = y - 15.5;
    const dist = Math.sqrt(cx * cx + cy * cy);
    if (dist < 14) {
      // Green circle
      raw.push(76, 175, 80, 255);
    } else if (dist < 15) {
      // Anti-aliased edge
      const alpha = Math.round((15 - dist) * 255);
      raw.push(76, 175, 80, alpha);
    } else {
      raw.push(0, 0, 0, 0);
    }
  }
}

const compressed = zlib.deflateSync(Buffer.from(raw));

const png = Buffer.concat([
  signature,
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
]);

const outPath = path.join(__dirname, 'icon.png');
fs.writeFileSync(outPath, png);
console.log('Created ' + outPath + ' (' + png.length + ' bytes)');
