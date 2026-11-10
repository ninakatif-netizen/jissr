// A small QR code generator written for Falaj (no external code): byte mode, error correction level M,
// versions 1 to 9 (up to about 180 bytes, enough for a link). Draws an inline SVG, so it works offline.
// Follows ISO/IEC 18004: Reed-Solomon over GF(256), finder, timing and alignment patterns, format and
// version information, zig-zag placement and the 8 masks (the one with the lowest penalty is used).

// Level M block structure per version: [ec codewords per block, [[blocks, data codewords], ...]]
const M = [null,
  [10, [[1, 16]]], [16, [[1, 28]]], [26, [[1, 44]]], [18, [[2, 32]]], [24, [[2, 43]]],
  [16, [[4, 27]]], [18, [[4, 31]]], [22, [[2, 38], [2, 39]]], [22, [[3, 36], [2, 37]]]];
const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46]];

const gmul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z & 0xff; };
function rsDivisor(deg) {
  const r = new Array(deg).fill(0); r[deg - 1] = 1; let root = 1;
  for (let i = 0; i < deg; i++) { for (let j = 0; j < deg; j++) { r[j] = gmul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; } root = gmul(root, 2); }
  return r;
}
function rsRemainder(data, div) {
  const r = new Array(div.length).fill(0);
  for (const b of data) { const f = b ^ r.shift(); r.push(0); for (let i = 0; i < div.length; i++) r[i] ^= gmul(div[i], f); }
  return r;
}
const utf8 = (s) => Array.from(new TextEncoder().encode(s));

function encode(text) {
  const bytes = utf8(text);
  let v = 1;
  for (; v <= 9; v++) { const cap = M[v][1].reduce((a, [n, d]) => a + n * d, 0); if (4 + 8 + bytes.length * 8 <= cap * 8) break; }
  if (v > 9) throw new Error('Text too long for this QR generator');
  const [ec, groups] = M[v];
  const capBytes = groups.reduce((a, [n, d]) => a + n * d, 0);
  const bits = [];
  const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, 8); bytes.forEach((b) => put(b, 8));
  put(0, Math.min(4, capBytes * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let p = 0; data.length < capBytes; p++) data.push(p % 2 ? 0x11 : 0xec);
  // split into blocks, add error correction, interleave
  const blocks = [], div = rsDivisor(ec);
  let k = 0;
  for (const [n, d] of groups) for (let i = 0; i < n; i++) { const dat = data.slice(k, k + d); k += d; blocks.push({ dat, ecc: rsRemainder(dat, div) }); }
  const out = [], maxD = Math.max(...blocks.map((b) => b.dat.length));
  for (let i = 0; i < maxD; i++) for (const b of blocks) if (i < b.dat.length) out.push(b.dat[i]);
  for (let i = 0; i < ec; i++) for (const b of blocks) out.push(b.ecc[i]);
  return { v, codewords: out };
}

function build(v, codewords) {
  const size = 17 + 4 * v;
  const mod = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, dark) => { mod[y][x] = dark; fn[y][x] = true; };
  // timing patterns
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  // finder patterns with separators
  const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= size || y >= size) continue; const d = Math.max(Math.abs(dx), Math.abs(dy)); set(x, y, d !== 2 && d !== 4); } };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  // alignment patterns
  const al = ALIGN[v];
  for (let i = 0; i < al.length; i++) for (let j = 0; j < al.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  // reserve format areas (drawn later) and the dark module
  const drawFormat = (mask) => {
    const data = (0 << 3) | mask; // level M = 0
    let rem = data; for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const b = ((data << 10) | rem) ^ 0x5412, bit = (i) => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  // version information (version 7 and up)
  if (v >= 7) {
    let rem = v; for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const b = (v << 12) | rem;
    for (let i = 0; i < 18; i++) { const d = ((b >>> i) & 1) === 1, a = size - 11 + (i % 3), c = Math.floor(i / 3); set(a, c, d); set(c, a, d); }
  }
  // place the codewords in the zig-zag order
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
      if (!fn[y][x] && i < codewords.length * 8) { mod[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; }
    }
  }
  const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
    (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0];
  const apply = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[m](x, y)) mod[y][x] = !mod[y][x]; };
  const penalty = () => {
    let p = 0, dark = 0;
    for (let y = 0; y < size; y++) for (const line of [mod[y], mod.map((r) => r[y])]) {
      let run = 1;
      for (let x = 1; x <= size; x++) { if (x < size && line[x] === line[x - 1]) run++; else { if (run >= 5) p += run - 2; run = 1; } }
    }
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const c = mod[y][x]; if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3; }
    for (const r of mod) for (const c of r) if (c) dark++;
    return p + Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
  };
  let best = 0, bestP = Infinity;
  for (let m = 0; m < 8; m++) { apply(m); drawFormat(m); const p = penalty(); if (p < bestP) { bestP = p; best = m; } apply(m); }
  apply(best); drawFormat(best);
  return mod;
}

export function qrMatrix(text) { const { v, codewords } = encode(text); return build(v, codewords); }

export function qrSvg(text, { size = 160, label = '' } = {}) {
  const mtx = qrMatrix(text), n = mtx.length, q = 4, cell = size / (n + q * 2);
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (mtx[y][x]) d += `M${((x + q) * cell).toFixed(2)} ${((y + q) * cell).toFixed(2)}h${cell.toFixed(2)}v${cell.toFixed(2)}h-${cell.toFixed(2)}z`;
  return `<svg class="qr" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label || 'QR code'}"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#0a1f2e" shape-rendering="crispEdges"/></svg>`;
}
