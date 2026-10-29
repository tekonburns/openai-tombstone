/*!
 * qr.js — small, dependency-free QR Code encoder (ISO/IEC 18004): byte mode (UTF-8), versions
 * 1–40, ECC levels L/M/Q/H, penalty-based or forced mask. Modelled on Project Nayuki's reference
 * QR Code generator (MIT). Classic script (no import/export, no build step, works from file://):
 * <script src="js/qr.js"></script> defines window.QR; in Node, require() returns the same object.
 *
 * QR.encode(text, ecl = 'M', opts = {}) → { version, size, ecl, mask, modules }
 *   opts: boostEcl (true) raise ECC while the data still fits the same version · minVersion (1)
 *         · mask (-1 = auto, 0–7 = forced). `ecl` is the final level; modules[y][x] true = dark.
 *   Throws a RangeError if the text does not fit in a version-40 symbol.
 * QR.toSVG(text, opts = {}) · QR.toSVGFromMatrix(encodeResult, opts = {}) → '<svg …>' string
 *   opts: ecl ('M') · border (4) · dark ('#000') · light ('#fff'; null/'' = no background rect)
 *         · className. toSVG forwards opts to encode(). viewBox only — size it with CSS.
 */
(function (root) {
  'use strict';

  const ECL_NAMES = ['L', 'M', 'Q', 'H'];
  const ECL_FORMAT_BITS = [1, 0, 3, 2]; // 2-bit codes of L, M, Q, H in the format information

  // ISO/IEC 18004 Table 9, indexed [ecl][version] (index 0 unused).
  // Version:  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23  24  25  26  27  28  29  30  31  32  33  34  35  36  37  38  39  40
  const ECC_CODEWORDS_PER_BLOCK = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // L
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28], // M
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // Q
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // H
  ];
  const NUM_ERROR_CORRECTION_BLOCKS = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25], // L
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49], // M
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68], // Q
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81], // H
  ];

  // Data-mask conditions (x = column, y = row): non-function modules where it holds are inverted.
  const MASKS = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x, y) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];

  // ---- Capacity ------------------------------------------------------------------------------
  // Modules left for codewords once function patterns and format/version information are placed.
  function numRawDataModules(ver) {
    let n = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      const numAlign = Math.floor(ver / 7) + 2;
      n -= (25 * numAlign - 10) * numAlign - 55;
      if (ver >= 7) n -= 36;
    }
    return n;
  }

  const numDataCodewords = (ver, ecl) => Math.floor(numRawDataModules(ver) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ecl][ver] * NUM_ERROR_CORRECTION_BLOCKS[ecl][ver];

  // ---- Reed–Solomon over GF(2^8), reducing polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11D) -------
  function gfMul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }

  // Generator (x − α^0)(x − α^1)…(x − α^(degree−1)): coefficients from the highest power down,
  // leading 1 omitted.
  function rsGenerator(degree) {
    const poly = new Array(degree).fill(0);
    poly[degree - 1] = 1; // start from the constant polynomial 1
    for (let i = 0, root = 1; i < degree; i++, root = gfMul(root, 2)) {
      for (let j = 0; j < degree; j++) poly[j] = gfMul(poly[j], root) ^ (j + 1 < degree ? poly[j + 1] : 0);
    }
    return poly;
  }

  // A block's ECC codewords: the remainder of data(x) · x^degree divided by the generator.
  function rsRemainder(data, gen) {
    const rem = gen.map(() => 0);
    for (const b of data) {
      const factor = b ^ rem.shift();
      rem.push(0);
      gen.forEach((coef, i) => { rem[i] ^= gfMul(coef, factor); });
    }
    return rem;
  }

  // Split the data into blocks (the last few are one codeword longer), add each block's ECC,
  // then interleave: data codewords column by column, followed by ECC codewords column by column.
  function addEccAndInterleave(data, ver, ecl) {
    const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecl][ver], eccLen = ECC_CODEWORDS_PER_BLOCK[ecl][ver];
    const rawCodewords = Math.floor(numRawDataModules(ver) / 8);
    const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
    const shortLen = Math.floor(rawCodewords / numBlocks) - eccLen; // data codewords per short block
    const gen = rsGenerator(eccLen), blocks = [], out = [];
    for (let i = 0, k = 0; i < numBlocks; i++) {
      const len = shortLen + (i < numShortBlocks ? 0 : 1);
      const block = data.slice(k, k + len);
      k += len;
      blocks.push({ data: block, ecc: rsRemainder(block, gen) });
    }
    for (let i = 0; i <= shortLen; i++) for (const b of blocks) if (i < b.data.length) out.push(b.data[i]);
    for (let i = 0; i < eccLen; i++) for (const b of blocks) out.push(b.ecc[i]);
    return out;
  }

  // ---- Symbol construction -------------------------------------------------------------------
  // Centre coordinates of the alignment patterns along each axis (none for version 1).
  function alignmentPositions(ver) {
    if (ver === 1) return [];
    const count = Math.floor(ver / 7) + 2;
    const step = Math.floor((ver * 8 + count * 3 + 5) / (count * 4 - 4)) * 2;
    const pos = [6];
    for (let p = ver * 4 + 10; pos.length < count; p -= step) pos.splice(1, 0, p);
    return pos;
  }

  // 15-bit format information — ECC level (2 bits) + mask (3 bits), BCH(15,5) code with generator
  // 0x537, XORed with 0x5412 — written in both of its places, plus the always-dark module.
  function drawFormatBits(set, size, ecl, mask) {
    const data = (ECL_FORMAT_BITS[ecl] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    const bit = (i) => ((bits >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i)); // copy 1, around the top-left finder
    set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i)); // copy 2, under the top-right finder…
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i)); // …and beside the bottom-left one
    set(8, size - 8, true); // the dark module
  }

  // Draw all function patterns and place the (unmasked) codewords. isFn marks the function
  // modules, which masking must leave alone.
  function buildBase(ver, codewords) {
    const size = ver * 4 + 17;
    const grid = () => Array.from({ length: size }, () => new Array(size).fill(false));
    const modules = grid(), isFn = grid();
    const set = (x, y, dark) => { modules[y][x] = dark; isFn[y][x] = true; };

    // Timing patterns along row 6 and column 6 (partly overdrawn by the finders below).
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }

    // Finder patterns with their one-module light separators, clipped at the symbol edge.
    for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy, ring = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, ring !== 2 && ring !== 4);
      }
    }

    // Alignment patterns on the grid of centres, except the three corners occupied by finders.
    const pos = alignmentPositions(ver), last = pos.length - 1;
    pos.forEach((cy, i) => pos.forEach((cx, j) => {
      if ((i === 0 && (j === 0 || j === last)) || (i === last && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }));

    // Reserve the format-information modules (the real bits are written once the mask is known).
    drawFormatBits(set, size, 0, 0);

    // Version information (v7+): 6-bit version + 12-bit BCH code (generator 0x1F25), as a 3×6
    // block left of the top-right finder and the transposed copy above the bottom-left finder.
    if (ver >= 7) {
      let rem = ver;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      const bits = (ver << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const dark = ((bits >>> i) & 1) === 1, a = size - 11 + (i % 3), b = Math.floor(i / 3);
        set(a, b, dark); set(b, a, dark);
      }
    }

    // Codeword bits, MSB first, in a zigzag of two-module-wide columns: start bottom-right, go up,
    // then down the next pair, …, skipping the vertical timing column and all function modules.
    // Leftover remainder bits stay light (0).
    for (let right = size - 1, i = 0; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      const upward = ((right + 1) & 2) === 0;
      for (let v = 0; v < size; v++) {
        const y = upward ? size - 1 - v : v;
        for (let x = right; x > right - 2; x--) {
          if (isFn[y][x] || i >= codewords.length * 8) continue;
          modules[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
          i++;
        }
      }
    }
    return { size, modules, isFn };
  }

  // A copy of the base symbol with the mask applied and the matching format information written.
  function applyMask(base, ecl, mask) {
    const cond = MASKS[mask];
    const m = base.modules.map((row, y) => row.map((dark, x) => (base.isFn[y][x] ? dark : dark !== cond(x, y))));
    drawFormatBits((x, y, dark) => { m[y][x] = dark; }, base.size, ecl, mask);
    return m;
  }

  // Mask penalty score per the four rules of ISO/IEC 18004 §7.8.3 (lower is better).
  function penalty(m) {
    const size = m.length;
    let score = 0, dark = 0;
    // line[from..to) is all light; modules outside the symbol (quiet zone) count as light.
    const isLight = (line, from, to) => line.slice(Math.max(from, 0), to).every((c) => !c);
    for (let i = 0; i < size; i++) {
      for (const line of [m[i], m.map((row) => row[i])]) { // row i, then column i
        // Rule 1: each run of k >= 5 same-coloured modules scores 3 + (k − 5).
        for (let x = 0, k; x < size; x += k) {
          k = 1;
          while (x + k < size && line[x + k] === line[x]) k++;
          if (k >= 5) score += k - 2;
        }
        // Rule 3: each 1:1:3:1:1 finder-like pattern (dark-light-dark-dark-dark-light-dark)
        // scores 40 for each side of it with 4 light modules.
        for (let x = 0; x + 7 <= size; x++) {
          if (line[x] && !line[x + 1] && line[x + 2] && line[x + 3] && line[x + 4] && !line[x + 5] && line[x + 6]) {
            score += (isLight(line, x - 4, x) ? 40 : 0) + (isLight(line, x + 7, x + 11) ? 40 : 0);
          }
        }
      }
    }
    // Rule 2: each 2×2 block of one colour scores 3. (Dark modules are counted for rule 4.)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const c = m[y][x];
      if (c) dark++;
      if (x + 1 < size && y + 1 < size && c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
    }
    // Rule 4: 10 × the smallest k >= 0 such that (45 − 5k)% <= dark share <= (55 + 5k)%.
    const total = size * size;
    return score + (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
  }

  // ---- Public API ----------------------------------------------------------------------------
  function toUtf8(text) {
    if (typeof TextEncoder !== 'undefined') return Array.from(new TextEncoder().encode(text));
    return Array.from(unescape(encodeURIComponent(text)), (c) => c.charCodeAt(0));
  }

  function encode(text, ecl = 'M', opts = {}) {
    opts = opts || {};
    let e = ECL_NAMES.indexOf(String(ecl == null ? 'M' : ecl).toUpperCase());
    const minVersion = opts.minVersion == null ? 1 : opts.minVersion;
    const forcedMask = opts.mask == null ? -1 : opts.mask;
    if (e < 0) throw new RangeError('QR: ecl must be L, M, Q or H');
    if (!(Number.isInteger(minVersion) && minVersion >= 1 && minVersion <= 40)) throw new RangeError('QR: minVersion must be 1–40');
    if (!(Number.isInteger(forcedMask) && forcedMask >= -1 && forcedMask <= 7)) throw new RangeError('QR: mask must be -1 (auto) or 0–7');

    // Byte mode: 4-bit mode indicator, character count (8 bits for v1–9, 16 for v10–40), payload.
    const bytes = toUtf8(String(text == null ? '' : text));
    const fits = (ver, level) => 4 + (ver < 10 ? 8 : 16) + bytes.length * 8 <= numDataCodewords(ver, level) * 8;
    let ver = minVersion;
    while (!fits(ver, e)) {
      if (++ver > 40) throw new RangeError(`QR: data too long (${bytes.length} bytes) for ECC level ${ECL_NAMES[e]}`);
    }
    if (opts.boostEcl == null || opts.boostEcl) while (e < 3 && fits(ver, e + 1)) e++;

    // Bit stream: header + payload, terminator (up to 4 zero bits), zero-fill to a byte boundary,
    // then pad codewords 0xEC, 0x11, 0xEC, … up to the data capacity.
    const capacity = numDataCodewords(ver, e) * 8, bits = [];
    const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(0b0100, 4);
    put(bytes.length, ver < 10 ? 8 : 16);
    bytes.forEach((b) => put(b, 8));
    put(0, Math.min(4, capacity - bits.length));
    put(0, (8 - (bits.length % 8)) % 8);
    for (let pad = 0xEC; bits.length < capacity; pad ^= 0xEC ^ 0x11) put(pad, 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((acc, b) => (acc << 1) | b, 0));

    // Build the symbol, then keep the forced mask or the one with the lowest penalty score.
    const base = buildBase(ver, addEccAndInterleave(data, ver, e));
    let best = null;
    for (let mask = 0; mask < 8; mask++) {
      if (forcedMask >= 0 && mask !== forcedMask) continue;
      const modules = applyMask(base, e, mask);
      const score = forcedMask >= 0 ? 0 : penalty(modules);
      if (!best || score < best.score) best = { score, mask, modules };
    }
    return { version: ver, size: base.size, ecl: ECL_NAMES[e], mask: best.mask, modules: best.modules };
  }

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function toSVGFromMatrix(qr, opts = {}) {
    opts = opts || {};
    const border = opts.border == null ? 4 : opts.border;
    if (!(Number.isInteger(border) && border >= 0)) throw new RangeError('QR: border must be a non-negative integer');
    const dark = opts.dark == null ? '#000' : opts.dark;
    const light = opts.light === undefined ? '#fff' : opts.light;
    const size = qr.modules.length, n = size + border * 2;
    // One <path> for all dark modules: a closed sub-path per horizontal run.
    let d = '';
    qr.modules.forEach((row, y) => {
      for (let x = 0; x < size;) {
        if (!row[x]) { x++; continue; }
        const start = x;
        while (x < size && row[x]) x++;
        d += `M${start + border},${y + border}h${x - start}v1h-${x - start}z`;
      }
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}"` +
      (opts.className ? ` class="${esc(opts.className)}"` : '') + ' shape-rendering="crispEdges">' +
      (light == null || light === '' ? '' : `<rect width="${n}" height="${n}" fill="${esc(light)}"/>`) +
      `<path fill="${esc(dark)}" d="${d}"/></svg>`;
  }

  function toSVG(text, opts = {}) {
    return toSVGFromMatrix(encode(text, opts && opts.ecl, opts), opts);
  }

  const QR = { encode, toSVG, toSVGFromMatrix };
  root.QR = QR;
  if (typeof module !== 'undefined' && module.exports) module.exports = QR;
})(typeof window !== 'undefined' ? window : globalThis);
