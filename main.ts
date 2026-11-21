// news-image-20261120 — "One Day in One Image — Friday 20 November 2026"
// Node 22, standard library only. Draws the whole front page programmatically
// and writes entry.png (1024x1024, deterministic, no network, no randomness).
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const C = {
  paper: [247, 241, 227],
  paper2: [238, 231, 210],
  ink: [26, 26, 26],
  ink2: [70, 70, 70],
  red: [139, 30, 30],
  redBright: [185, 28, 28],
  navy: [31, 56, 100],
  navyLight: [58, 90, 150],
  gold: [176, 141, 60],
  white: [255, 255, 255],
  mapSea: [214, 228, 233],
  mapLand: [232, 220, 195],
  mapLand2: [222, 208, 178],
  europe: [37, 99, 235],
  middleEast: [217, 119, 6],
  asia: [124, 58, 237],
  americas: [220, 38, 38],
  africa: [21, 128, 61],
  oceania: [13, 148, 136],
  global: [107, 114, 128],
  cardBg: [255, 253, 247],
  line: [190, 175, 145],
  night: [18, 28, 58],
  sky: [186, 214, 235],
  green: [22, 101, 52],
} as const;
type RGB = readonly number[];

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows of 5 bits, '#' = on.
const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  a: ['00000', '00000', '01110', '00001', '01111', '10001', '01111'],
  b: ['10000', '10000', '11110', '10001', '10001', '10001', '11110'],
  c: ['00000', '00000', '01110', '10000', '10000', '10001', '01110'],
  d: ['00001', '00001', '01111', '10001', '10001', '10001', '01111'],
  e: ['00000', '00000', '01110', '10001', '11111', '10000', '01110'],
  f: ['00110', '01001', '01000', '11110', '01000', '01000', '01000'],
  g: ['00000', '01111', '10001', '10001', '01111', '00001', '01110'],
  h: ['10000', '10000', '11110', '10001', '10001', '10001', '10001'],
  i: ['00100', '00000', '01100', '00100', '00100', '00100', '01110'],
  j: ['00010', '00000', '00110', '00010', '00010', '10010', '01100'],
  k: ['10000', '10000', '10010', '10100', '11000', '10100', '10010'],
  l: ['01100', '00100', '00100', '00100', '00100', '00100', '01110'],
  m: ['00000', '00000', '11010', '10101', '10101', '10101', '10101'],
  n: ['00000', '00000', '11110', '10001', '10001', '10001', '10001'],
  o: ['00000', '00000', '01110', '10001', '10001', '10001', '01110'],
  p: ['00000', '00000', '11110', '10001', '10001', '11110', '10000', '10000'].slice(0, 7),
  q: ['00000', '00000', '01111', '10001', '10001', '01111', '00001'],
  r: ['00000', '00000', '10110', '11001', '10000', '10000', '10000'],
  s: ['00000', '00000', '01111', '10000', '01110', '00001', '11110'],
  t: ['01000', '01000', '11110', '01000', '01000', '01001', '00110'],
  u: ['00000', '00000', '10001', '10001', '10001', '10011', '01101'],
  v: ['00000', '00000', '10001', '10001', '10001', '01010', '00100'],
  w: ['00000', '00000', '10001', '10101', '10101', '10101', '01010'],
  x: ['00000', '00000', '10001', '01010', '00100', '01010', '10001'],
  y: ['00000', '00000', '10001', '10001', '01111', '00001', '01110'],
  z: ['00000', '00000', '11111', '00010', '00100', '01000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '–': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '—': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '’': ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '"': ['01010', '01010', '01010', '00000', '00000', '00000', '00000'],
  '“': ['01010', '01010', '01010', '00000', '00000', '00000', '00000'],
  '”': ['01010', '01010', '01010', '00000', '00000', '00000', '00000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '·': ['00000', '00000', '00000', '01100', '01100', '00000', '00000'],
  '•': ['00000', '01100', '11100', '11100', '01100', '00000', '00000'],
  '$': ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '#': ['01010', '01010', '11111', '01010', '11111', '01010', '01010'],
  '*': ['00000', '00100', '10101', '01110', '10101', '00100', '00000'],
  '_': ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
  '[': ['01110', '01000', '01000', '01000', '01000', '01000', '01110'],
  ']': ['01110', '00010', '00010', '00010', '00010', '00010', '01110'],
  '<': ['00010', '00100', '01000', '10000', '01000', '00100', '00010'],
  '>': ['01000', '00100', '00010', '00001', '00010', '00100', '01000'],
  '~': ['00000', '00000', '01001', '10110', '00000', '00000', '00000'],
};

// ---------------------------------------------------------------- canvas
class Canvas {
  data = Buffer.alloc(W * H * 3);
  constructor() {
    for (let i = 0; i < W * H; i++) {
      this.data[i * 3] = C.paper[0];
      this.data[i * 3 + 1] = C.paper[1];
      this.data[i * 3 + 2] = C.paper[2];
    }
  }
  px(x: number, y: number, c: RGB) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.data[i] = c[0]; this.data[i + 1] = c[1]; this.data[i + 2] = c[2];
  }
  rect(x: number, y: number, w: number, h: number, c: RGB) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) {
        const i = (yy * W + xx) * 3;
        this.data[i] = c[0]; this.data[i + 1] = c[1]; this.data[i + 2] = c[2];
      }
    }
  }
  border(x: number, y: number, w: number, h: number, c: RGB, t = 1) {
    this.rect(x, y, w, t, c);
    this.rect(x, y + h - t, w, t, c);
    this.rect(x, y, t, h, c);
    this.rect(x + w - t, y, t, h, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy, x = x0, y = y0;
    for (let n = 0; n < 4000; n++) {
      if (t <= 1) this.px(x, y, c);
      else this.rect(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }
  circle(cx: number, cy: number, r: number, c: RGB) {
    for (let y = -r; y <= r; y++) {
      const dx = Math.floor(Math.sqrt(r * r - y * y));
      for (let x = -dx; x <= dx; x++) this.px(cx + x, cy + y, c);
    }
  }
  ring(cx: number, cy: number, r: number, c: RGB, t = 2) {
    for (let a = 0; a < 360; a += 2) {
      const rad = (a * Math.PI) / 180;
      for (let k = 0; k < t; k++) {
        this.px(cx + Math.round((r - k) * Math.cos(rad)), cy + Math.round((r - k) * Math.sin(rad)), c);
      }
    }
  }
  tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB) {
    const minX = Math.floor(Math.min(x0, x1, x2)), maxX = Math.ceil(Math.max(x0, x1, x2));
    const minY = Math.floor(Math.min(y0, y1, y2)), maxY = Math.ceil(Math.max(y0, y1, y2));
    const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
    if (d === 0) return;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d;
        const b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d;
        const cc = 1 - a - b;
        if (a >= 0 && b >= 0 && cc >= 0) this.px(x, y, c);
      }
    }
  }
  poly(pts: Array<[number, number]>, c: RGB) {
    // Even-odd scanline fill.
    let minY = Infinity, maxY = -Infinity;
    for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) this.px(x, y, c);
      }
    }
  }
  // ---- text ----
  textWidth(s: string, scale: number, bold = false): number {
    let w = 0;
    for (const ch of s) w += 6 * scale + (bold ? 1 : 0);
    return w - scale; // no trailing gap
  }
  text(x: number, y: number, s: string, scale: number, c: RGB, bold = false) {
    let cx = Math.round(x);
    for (const ch of s) {
      const g = FONT[ch] ?? FONT['?'];
      for (let r = 0; r < 7; r++) {
        for (let col = 0; col < 5; col++) {
          if (g[r][col] === '1') {
            this.rect(cx + col * scale, y + r * scale, scale, scale, c);
            if (bold) this.rect(cx + col * scale + 1, y + r * scale, scale, scale, c);
          }
        }
      }
      cx += 6 * scale + (bold ? 1 : 0);
    }
  }
  textCenter(cx: number, y: number, s: string, scale: number, c: RGB, bold = false) {
    this.text(cx - Math.floor(this.textWidth(s, scale, bold) / 2), y, s, scale, c, bold);
  }
  wrap(s: string, maxW: number, scale: number, bold = false): string[] {
    const words = s.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = '';
    const adv = 6 * scale + (bold ? 1 : 0);
    for (const word of words) {
      const w = word;
      // Hard-split a single over-long word.
      let rest = w;
      while (rest.length * adv > maxW) {
        const take = Math.max(1, Math.floor(maxW / adv));
        if (cur) { lines.push(cur); cur = ''; }
        lines.push(rest.slice(0, take));
        rest = rest.slice(take);
      }
      const trial = cur ? cur + ' ' + rest : rest;
      if (trial.length * adv - scale <= maxW) cur = trial;
      else { if (cur) lines.push(cur); cur = rest; }
    }
    if (cur) lines.push(cur);
    return lines;
  }
  para(x: number, y: number, s: string, maxW: number, scale: number, c: RGB, bold = false, lh?: number): number {
    const lines = this.wrap(s, maxW, scale, bold);
    const step = lh ?? 7 * scale + 2;
    lines.forEach((ln, i) => this.text(x, y + i * step, ln, scale, c, bold));
    return lines.length;
  }
}

// ---------------------------------------------------------------- PNG writer
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function encodePNG(cv: Canvas): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    cv.data.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- data
type Region = 'europe' | 'middleEast' | 'asia' | 'americas' | 'africa' | 'oceania' | 'global';
const REGION_COLOR: Record<Region, RGB> = {
  europe: C.europe, middleEast: C.middleEast, asia: C.asia, americas: C.americas,
  africa: C.africa, oceania: C.oceania, global: C.global,
};
const REGION_NAME: Record<Region, string> = {
  europe: 'EUROPE', middleEast: 'MIDDLE EAST', asia: 'ASIA', americas: 'AMERICAS',
  africa: 'AFRICA', oceania: 'OCEANIA', global: 'GLOBAL',
};

interface Featured { n: number; region: Region; topic: string; src: string; head: string; deck: string; illo: number; }
const FEATURED: Featured[] = [
  { n: 1, region: 'europe', topic: 'JUSTICE', src: 'CONFIRMED · ICJ', head: 'World Court: Myanmar committed genocide against the Rohingya', deck: 'The Hague rules 9-6 that Myanmar forces committed state-sponsored genocide; refugees must be allowed back.', illo: 1 },
  { n: 2, region: 'europe', topic: 'SECURITY', src: 'CONFIRMED · AP', head: 'Russian missiles hit Poland; NATO calls it a grave violation', deck: 'Two missiles and a suspected drone came down in Poland; NATO calls it a grave violation of allied airspace.', illo: 2 },
  { n: 3, region: 'asia', topic: 'DIPLOMACY', src: 'CONFIRMED · AP', head: 'Trump, Xi and Putin leave Shenzhen summit with few results', deck: 'First-ever trilateral ends with a declaration but no breakthrough on Ukraine, Iran or nuclear arms.', illo: 3 },
  { n: 4, region: 'europe', topic: 'UKRAINE WAR', src: 'CLAIM · KYIV', head: 'Russia launches massive overnight strike on Kyiv', deck: 'Missiles and drones hit strategic infrastructure; debris strikes a building in Obolonskyi district.', illo: 4 },
  { n: 5, region: 'global', topic: 'MARKETS', src: 'CONFIRMED · DOW JONES', head: 'S&P 500 sinks 3.7% and enters correction', deck: 'AI sell-off drags world markets down: Nasdaq goes negative for the year, Nikkei drops 5.06%.', illo: 5 },
  { n: 6, region: 'americas', topic: 'TECH', src: 'CONFIRMED · DOW JONES', head: 'Anthropic shares slide on day two after record IPO', deck: 'Retail traders face losses as shares dive 13% the day after the debut; the AI rout deepens.', illo: 6 },
  { n: 7, region: 'middleEast', topic: 'CONFLICT', src: 'CONFIRMED · AP', head: 'Houthi missiles over Riyadh intercepted; Saudi strikes back', deck: 'Saudi Arabia intercepts a Houthi missile and drones over Riyadh; coalition hits Hodeidah.', illo: 7 },
  { n: 8, region: 'asia', topic: 'DISASTER', src: 'CONFIRMED · AP', head: 'Cyclone Akvan makes landfall in Odisha', deck: 'Comes ashore on India east coast after days of evacuations; heavy rain and winds batter the coast.', illo: 8 },
  { n: 9, region: 'europe', topic: 'DIPLOMACY', src: 'CONFIRMED · AP', head: 'UK and EU sign deals on food, carbon and youth mobility', deck: 'Britain and the EU sign agreements in Brussels; PM Burnham floats "Breturn" - rejoining the EU.', illo: 9 },
  { n: 10, region: 'middleEast', topic: 'ENERGY', src: 'CLAIM · AP', head: 'Oil tanker on fire in the Strait of Hormuz', deck: 'A tanker burns in the strait as supply worries linger; Brent crude holds near $90 a barrel.', illo: 10 },
  { n: 11, region: 'europe', topic: 'TRANSPORT', src: 'CONFIRMED · AP', head: 'Kerch Bridge rail traffic resumes after strikes', deck: 'Trains cross the Crimea bridge again days after the span was hit.', illo: 11 },
  { n: 12, region: 'americas', topic: 'SECURITY', src: 'CONFIRMED · POLICE', head: 'Haitian forces kill 34 suspected gang members', deck: 'National police report 34 suspected gang members killed in Port-au-Prince operations.', illo: 12 },
  { n: 13, region: 'americas', topic: 'DISASTER', src: 'CONFIRMED · USGS', head: 'Magnitude 6.7 earthquake hits central Peru', deck: 'A strong quake strikes near Cerro de Pasco; no tsunami warning follows.', illo: 13 },
  { n: 14, region: 'global', topic: 'SPACE', src: 'CONFIRMED · ESA', head: 'BepiColombo reaches Mercury after eight years', deck: 'The European-Japanese spacecraft arrives at Mercury after an eight-year journey.', illo: 14 },
  { n: 15, region: 'europe', topic: 'SPORT', src: 'CONFIRMED · BBC', head: 'Lauren Price becomes undisputed welterweight champion', deck: 'The Welsh boxer unifies the division in front of a home crowd.', illo: 15 },
  { n: 16, region: 'americas', topic: 'POLITICS', src: 'CONFIRMED · AP', head: 'Senate passes energy-permitting bill, 62-33', deck: 'Speeds approvals for power plants, transmission lines, mines and data centres; goes to the House.', illo: 16 },
];

const TIMELINE: Array<[string, string]> = [
  ['Overnight', 'Russia massive strike on Kyiv'],
  ['~06:15 UTC', 'Asian equities tumble as AI sell-off deepens'],
  ['~10:00 UTC', 'ICJ rules Myanmar committed genocide'],
  ['~14:30 UTC', 'Russian missiles land in Poland'],
  ['Day', 'UK and EU sign Brussels deals'],
  ['Evening', 'S&P 500 sinks 3.7%, enters correction'],
];

const ONELINERS: string[] = [
  'Russia invites Europeans to Moscow for talks; Zelensky calls Putin a killer',
  'Bangladesh: political violence ahead of Hasina return',
  'Estonia to close Russia border crossings after sabotage attack',
  'Texas: execution lasting an hour draws scrutiny',
  'Iraq: forces enter Jurf al-Nasr for first time in 12 years',
  'Los Angeles: jury convicts Rinderknecht of starting Palisades Fire',
  'Missouri: judge approves $7.25bn Bayer settlement over Roundup',
  'Gaza: Israeli strikes kill Palestinians',
  'New York: Indian man sentenced to 19 years in Sikh leader murder plot',
  'Nigeria: boat carrying funeral mourners capsizes',
  'Senegal: migrant boat capsizes off the coast',
  'Japan: core inflation rises to year high',
  'Argentina: bonds slide into distress',
  'Shenzhen: Philippines and Chile sign free trade agreement',
  'Germany: Lufthansa to cut up to 1,000 jobs over fuel costs',
  'Washington: Trump threatens "tremendous tax" on firms building AI data centres abroad',
  'El Salvador: Bukele registers for third term',
  'Washington: Iran war nears ninth month as Trump says he is not rushing decisions',
  'Riyadh/Tokyo: Saudi Arabia and Japan agree oil stockpile deal',
  'Kenya: begins 42-day countdown to an Ebola-free declaration',
  'Denmark: approves Greenland-US security agreement',
  'Germany: Merz rejects a new Yalta agreement over Europe future',
  'Pakistan: forces kill 22 militants near Afghan frontier',
  'Washington: White House cyber chief Cairncross steps down',
  'Rockstar: GTA VI sets record $3.79bn first-day retail sales',
  'New Jersey: Ford, Honda, Stellantis, VW sue state over repair law',
  'New York: Mayor Mamdani plans to close Rikers Island by 2032',
  'Turin: Alcaraz beats Cobolli, stays unbeaten in ATP Finals group',
  'Florida: A Lim Kim makes hole-in-one at LPGA season finale',
  'Rawalpindi: Pakistan beat Sri Lanka by 8 wickets, first Test series win in 2 years',
  'Doha: India A thrash Nepal by 306 runs in Asia Cup Rising Stars',
  'Wellington: Nicholls 175* and Phillips 118 put NZ on 368 vs India',
  'Cincinnati: FC Cincinnati beat Orlando City 3-1 in MLS Cup playoffs',
  'Bengaluru: Bengaluru FC beat Mumbai City 2-0, go top of ISL',
];

// Map pins: [lon, lat] for stories 1-16. PIN_OFF gives a display offset
// (lon/lat) for crowded clusters, drawn with a leader line to the true spot.
const PINS: Array<[number, number]> = [
  [4.3, 52.0], [19.0, 52.0], [114.0, 22.5], [30.5, 50.4],
  [-74.0, 40.7], [-95.0, 38.0], [46.7, 24.6], [85.0, 20.0],
  [4.35, 50.85], [56.0, 26.5], [36.5, 45.3], [-72.3, 18.5],
  [-76.0, -10.7], [8.65, 49.87], [-3.2, 51.5], [-77.0, 38.9],
];
const PIN_OFF: Record<number, [number, number]> = {
  1: [-4, 58], 2: [26, 57], 5: [-68, 46], 7: [42, 20],
  9: [-4, 45], 11: [44, 52], 15: [-14, 55], 16: [-82, 34],
};
// Dots for stories 17-50: [lon, lat].
const DOTS: Array<[number, number]> = [
  [37.6, 55.7], [90.4, 23.8], [24.7, 59.4], [-99.7, 30.0], [44.4, 33.0],
  [-118.2, 34.0], [-92.5, 38.5], [34.5, 31.5], [-74.0, 40.7], [91.0, 4.5],
  [-17.0, 14.5], [139.7, 35.7], [-58.4, -34.6], [114.0, 22.5], [8.7, 50.1],
  [-77.0, 38.9], [-89.2, 13.7], [-77.0, 38.9], [46.7, 24.6], [36.8, -1.3],
  [12.6, 55.7], [13.4, 52.5], [71.0, 33.0], [-77.0, 38.9], [-118.2, 34.0],
  [-74.5, 40.0], [-74.0, 40.7], [7.7, 45.1], [-81.8, 26.1], [73.0, 33.6],
  [51.5, 25.3], [174.8, -41.3], [-84.5, 39.1], [77.6, 13.0],
];

// ---------------------------------------------------------------- illo helpers
function flag(cv: Canvas, x: number, y: number, w: number, h: number, stripes: RGB[]) {
  const sh = Math.max(1, Math.floor(h / stripes.length));
  stripes.forEach((c, i) => cv.rect(x, y + i * sh, w, i === stripes.length - 1 ? h - i * sh : sh, c));
  cv.border(x, y, w, h, C.ink, 1);
}
function skyline(cv: Canvas, x: number, y: number, w: number, h: number, base: number, col: RGB, win: RGB) {
  // Deterministic pseudo-skyline from fixed heights.
  const hs = [0.55, 0.8, 0.45, 0.95, 0.65, 0.75, 0.5, 0.9, 0.6, 0.7];
  const bw = Math.max(4, Math.floor(w / hs.length));
  hs.forEach((f, i) => {
    const bh = Math.floor(h * f);
    cv.rect(x + i * bw + 1, base - bh, bw - 2, bh, col);
    for (let wy = base - bh + 3; wy < base - 3; wy += 5) {
      for (let wx = x + i * bw + 3; wx < x + (i + 1) * bw - 3; wx += 4) {
        if ((wx + wy) % 8 < 3) cv.px(wx, wy, win);
      }
    }
  });
}
function chart(cv: Canvas, x: number, y: number, w: number, h: number, pts: number[], col: RGB, fill: RGB) {
  // pts: 0..1 fractions of height (0 = top). Draw filled area + line.
  const px = pts.map((p, i) => [x + Math.round((i * w) / (pts.length - 1)), y + Math.round(p * h)] as [number, number]);
  const area: Array<[number, number]> = [...px, [x + w, y + h], [x, y + h]];
  cv.poly(area, fill);
  for (let i = 0; i + 1 < px.length; i++) cv.line(px[i][0], px[i][1], px[i + 1][0], px[i + 1][1], col, 2);
}
function burst(cv: Canvas, cx: number, cy: number, r: number, c1: RGB, c2: RGB) {
  cv.circle(cx, cy, r, c1);
  cv.circle(cx, cy, Math.floor(r * 0.55), c2);
  for (let a = 0; a < 8; a++) {
    const rad = (a * Math.PI) / 4;
    cv.line(cx + Math.round(r * 0.7 * Math.cos(rad)), cy + Math.round(r * 0.7 * Math.sin(rad)),
      cx + Math.round(r * 1.5 * Math.cos(rad)), cy + Math.round(r * 1.5 * Math.sin(rad)), c1, 2);
  }
}

// One original illustration per featured story, drawn in rect (x,y,w,h).
function drawIllo(cv: Canvas, id: number, x: number, y: number, w: number, h: number) {
  const cx = x + Math.floor(w / 2), cy = y + Math.floor(h / 2);
  switch (id) {
    case 1: { // scales of justice + courthouse
      cv.rect(x, y, w, h, C.navyLight);
      cv.rect(x, y + h - 12, w, 12, C.paper2);
      cv.tri(cx - 26, y + h - 12, cx + 26, y + h - 12, cx, y + 8, C.gold);
      cv.rect(cx - 2, y + 14, 4, h - 30, C.gold);
      cv.line(cx - 24, y + 18, cx + 24, y + 18, C.gold, 3);
      cv.line(cx - 24, y + 18, cx - 30, y + 32, C.gold, 2);
      cv.line(cx - 24, y + 18, cx - 18, y + 32, C.gold, 2);
      cv.tri(cx - 31, y + 32, cx - 17, y + 32, cx - 24, y + 38, C.gold);
      cv.line(cx + 24, y + 18, cx + 30, y + 32, C.gold, 2);
      cv.line(cx + 24, y + 18, cx + 18, y + 32, C.gold, 2);
      cv.tri(cx + 17, y + 32, cx + 31, y + 32, cx + 24, y + 38, C.gold);
      cv.circle(cx, y + 14, 3, C.gold);
      cv.rect(x + 4, y + h - 12, 3, 12, C.ink); cv.rect(x + w - 7, y + h - 12, 3, 12, C.ink);
      break;
    }
    case 2: { // missile streaks over Poland map + NATO compass
      cv.rect(x, y, w, h, C.sky);
      cv.poly([[x + 8, y + h - 8], [x + 14, y + 12], [x + w - 10, y + 10], [x + w - 6, y + h - 6]], C.green);
      cv.line(x + 6, y + 6, x + w - 30, y + h - 18, C.redBright, 3);
      cv.line(x + 20, y + 2, x + w - 12, y + h - 26, C.redBright, 2);
      cv.circle(x + w - 30, y + h - 18, 4, [255, 200, 60]);
      cv.circle(x + w - 12, y + h - 26, 3, [255, 200, 60]);
      cv.circle(x + w - 22, y + 18, 9, C.navy);
      for (let a = 0; a < 4; a++) {
        const rad = (a * Math.PI) / 2;
        cv.line(x + w - 22, y + 18, x + w - 22 + Math.round(9 * Math.cos(rad)), y + 18 + Math.round(9 * Math.sin(rad)), C.white, 1);
      }
      break;
    }
    case 3: { // three flags over summit table / skyline
      cv.rect(x, y, w, h, C.sky);
      skyline(cv, x, y + h - 26, w, 26, y + h, C.navy, [255, 220, 120]);
      const fw = Math.floor(w / 4);
      flag(cv, x + 6, y + 6, fw, 16, [C.redBright, C.white, C.navy]);
      flag(cv, cx - Math.floor(fw / 2), y + 2, fw, 16, [C.redBright, [255, 220, 60], C.redBright]);
      flag(cv, x + w - 6 - fw, y + 6, fw, 16, [C.white, C.navy, C.redBright]);
      cv.rect(x, y + h - 16, w, 5, [120, 72, 40]);
      break;
    }
    case 4: { // Kyiv skyline at night, explosions, defence trails
      cv.rect(x, y, w, h, C.night);
      for (let i = 0; i < 14; i++) cv.px(x + 4 + ((i * 37) % (w - 8)), y + 3 + ((i * 11) % 10), C.white);
      skyline(cv, x, y + 6, w, h - 6, y + h, [8, 14, 34], [255, 200, 90]);
      burst(cv, x + Math.floor(w * 0.3), y + 14, 6, [255, 140, 40], [255, 220, 90]);
      burst(cv, x + Math.floor(w * 0.75), y + 20, 5, [255, 140, 40], [255, 220, 90]);
      cv.line(x + 4, y + h - 4, cx, y + 8, [150, 200, 255], 1);
      cv.line(x + w - 4, y + h - 4, cx + 12, y + 10, [150, 200, 255], 1);
      break;
    }
    case 5: { // steep red falling chart
      cv.rect(x, y, w, h, C.white);
      cv.line(x + 4, y + 4, x + 4, y + h - 4, C.ink2, 1);
      cv.line(x + 4, y + h - 4, x + w - 4, y + h - 4, C.ink2, 1);
      chart(cv, x + 6, y + 6, w - 12, h - 14, [0.05, 0.15, 0.1, 0.3, 0.45, 0.55, 0.85, 0.95], C.redBright, [245, 200, 200]);
      cv.text(x + 8, y + h - 11, 'S&P 6,910  -3.7%', 1, C.redBright, true);
      break;
    }
    case 6: { // diving chart + AI chip
      cv.rect(x, y, w, h, C.white);
      chart(cv, x + 4, y + 4, Math.floor(w * 0.6), h - 8, [0.1, 0.2, 0.35, 0.3, 0.55, 0.8, 0.95], C.navy, [200, 210, 235]);
      const bx = x + Math.floor(w * 0.66), by = y + 8, bw = Math.floor(w * 0.3), bh = h - 16;
      cv.rect(bx, by, bw, bh, C.ink);
      cv.rect(bx + 4, by + 4, bw - 8, bh - 8, C.navyLight);
      cv.text(bx + 6, by + Math.floor(bh / 2) - 3, 'AI', 1, C.white, true);
      for (let i = 0; i < 3; i++) {
        cv.rect(bx - 3, by + 5 + i * 8, 3, 4, C.gold);
        cv.rect(bx + bw, by + 5 + i * 8, 3, 4, C.gold);
      }
      cv.text(x + 4, y + h - 10, '-13%', 1, C.redBright, true);
      break;
    }
    case 7: { // interceptor trails over Riyadh towers
      cv.rect(x, y, w, h, C.night);
      for (let i = 0; i < 10; i++) cv.px(x + 4 + ((i * 29) % (w - 8)), y + 3 + ((i * 7) % 8), C.white);
      cv.rect(x + 8, y + h - 34, 10, 34, [40, 50, 80]);
      cv.rect(x + 26, y + h - 44, 12, 44, [40, 50, 80]);
      cv.tri(x + 26, y + h - 52, x + 38, y + h - 52, cx - 2, y + h - 44, [40, 50, 80]);
      cv.rect(x + w - 22, y + h - 30, 10, 30, [40, 50, 80]);
      cv.line(x + 6, y + h - 2, cx, y + 4, [120, 220, 255], 2);
      cv.line(x + w - 6, y + h - 2, cx + 8, y + 6, [120, 220, 255], 2);
      burst(cv, cx, y + 8, 5, [255, 180, 60], [255, 240, 150]);
      break;
    }
    case 8: { // cyclone spiral over coast
      cv.rect(x, y, w, h, C.sky);
      cv.poly([[x, y + h], [x + Math.floor(w * 0.35), y + h - 14], [x + Math.floor(w * 0.6), y + h], [x + w, y + h - 8], [x + w, y + h], [x, y + h]], C.green);
      for (let r = 4; r <= Math.min(w, h) / 2; r += 5) {
        for (let a = 0; a < 300; a += 6) {
          const rad = (a * Math.PI) / 180;
          const rr = r + a / 40;
          cv.px(cx + Math.round(rr * Math.cos(rad)), cy + Math.round(rr * Math.sin(rad) * 0.8), C.white);
        }
      }
      cv.circle(cx, cy, 3, C.navy);
      break;
    }
    case 9: { // UK + EU flags, handshake
      cv.rect(x, y, w, h, C.paper2);
      flag(cv, x + 6, y + 6, Math.floor(w * 0.42), 18, [C.navy, C.white, C.redBright]);
      flag(cv, x + w - 6 - Math.floor(w * 0.42), y + 6, Math.floor(w * 0.42), 18, [C.europe]);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        cv.px(x + w - 6 - Math.floor(w * 0.21) + Math.round(7 * Math.cos(a)), y + 15 + Math.round(7 * Math.sin(a)), [255, 220, 60]);
      }
      // handshake: two clasped arcs
      cv.line(x + 10, y + h - 12, cx, y + h - 22, C.ink, 3);
      cv.line(x + w - 10, y + h - 12, cx, y + h - 22, C.ink, 3);
      cv.circle(cx, y + h - 20, 5, C.gold);
      break;
    }
    case 10: { // burning tanker in the strait
      cv.rect(x, y, w, h, C.sky);
      cv.rect(x, y + h - 16, w, 16, C.navy);
      cv.rect(x + 10, y + h - 30, w - 20, 14, [120, 40, 30]);
      cv.rect(x + 14, y + h - 40, 10, 10, C.white);
      cv.rect(x + w - 26, y + h - 38, 8, 8, C.white);
      burst(cv, cx, y + h - 38, 7, [255, 120, 30], [255, 210, 80]);
      cv.line(x + 2, y + 6, x + w - 2, y + 10, C.ink2, 1);
      break;
    }
    case 11: { // bridge over water + train
      cv.rect(x, y, w, h, C.sky);
      cv.rect(x, y + h - 12, w, 12, [70, 120, 160]);
      cv.line(x + 4, y + h - 22, x + w - 4, y + h - 22, C.ink, 3);
      cv.line(cx, y + 4, cx, y + h - 22, C.ink, 2);
      cv.line(cx - 18, y + 12, cx, y + h - 22, C.ink, 1);
      cv.line(cx + 18, y + 12, cx, y + h - 22, C.ink, 1);
      cv.rect(x + 6, y + h - 32, Math.floor(w * 0.5), 9, C.redBright);
      cv.rect(x + 10, y + h - 30, 6, 5, C.white);
      cv.rect(x + 20, y + h - 30, 6, 5, C.white);
      break;
    }
    case 12: { // Port-au-Prince street, police patrol
      cv.rect(x, y, w, h, [240, 220, 180]);
      cv.rect(x + 4, y + 8, 18, h - 20, [180, 120, 80]);
      cv.rect(x + 26, y + 14, 16, h - 26, [150, 100, 70]);
      cv.rect(x + w - 24, y + 10, 18, h - 22, [190, 130, 90]);
      cv.rect(x, y + h - 12, w, 12, C.ink2);
      cv.rect(x + 8, y + h - 22, 26, 9, C.navy);
      cv.rect(x + 36, y + h - 22, 20, 9, C.navy);
      cv.circle(x + 15, y + h - 11, 3, C.ink);
      cv.circle(x + 29, y + h - 11, 3, C.ink);
      cv.circle(x + 46, y + h - 11, 3, C.ink);
      cv.text(x + 10, y + h - 21, 'POLICE', 1, C.white);
      break;
    }
    case 13: { // cracked ground + seismograph + mountains
      cv.rect(x, y, w, h, C.sky);
      cv.tri(x, y + h - 18, x + 22, y + 6, x + 44, y + h - 18, [120, 130, 140]);
      cv.tri(x + 30, y + h - 18, x + 56, y + 2, x + 82, y + h - 18, [100, 112, 122]);
      cv.rect(x, y + h - 18, w, 18, [150, 110, 70]);
      cv.line(cx - 14, y + h - 4, cx - 6, y + h - 14, C.ink, 2);
      cv.line(cx - 6, y + h - 14, cx + 2, y + h - 6, C.ink, 2);
      cv.line(cx + 2, y + h - 6, cx + 12, y + h - 15, C.ink, 2);
      let px = x + 4;
      const base = y + Math.floor(h * 0.42);
      cv.line(x + 4, base, x + 14, base, C.redBright, 1);
      cv.line(x + 14, base, x + 18, base - 8, C.redBright, 1);
      cv.line(x + 18, base - 8, x + 22, base + 8, C.redBright, 1);
      cv.line(x + 22, base + 8, x + 28, base - 10, C.redBright, 1);
      cv.line(x + 28, base - 10, x + 32, base + 6, C.redBright, 1);
      cv.line(x + 32, base + 6, x + w - 4, base, C.redBright, 1);
      px = px; // keep linter calm
      cv.text(x + 4, y + 2, 'M 6.7', 1, C.redBright, true);
      break;
    }
    case 14: { // spacecraft + cratered Mercury
      cv.rect(x, y, w, h, C.night);
      for (let i = 0; i < 12; i++) cv.px(x + 4 + ((i * 41) % (w - 8)), y + 3 + ((i * 13) % 12), C.white);
      cv.circle(x + Math.floor(w * 0.72), y + h - 16, 14, [170, 150, 130]);
      cv.circle(x + Math.floor(w * 0.72) - 5, y + h - 18, 3, [140, 120, 100]);
      cv.circle(x + Math.floor(w * 0.72) + 5, y + h - 12, 2, [140, 120, 100]);
      cv.rect(x + 8, y + 10, 16, 8, [200, 200, 200]);
      cv.rect(x + 24, y + 12, 14, 4, C.navyLight);
      cv.rect(x + 2, y + 12, 6, 4, C.gold);
      cv.line(x + 24, y + 14, x + Math.floor(w * 0.72) - 12, y + h - 20, [255, 220, 120], 1);
      break;
    }
    case 15: { // boxing ring + belt + gloves
      cv.rect(x, y, w, h, [210, 225, 235]);
      cv.rect(x + 6, y + h - 16, w - 12, 10, [190, 80, 80]);
      cv.line(x + 4, y + 10, x + w - 4, y + 10, C.ink, 2);
      cv.line(x + 4, y + 18, x + w - 4, y + 18, C.ink, 2);
      cv.line(x + 4, y + 10, x + 4, y + h - 6, C.ink, 2);
      cv.line(x + w - 4, y + 10, x + w - 4, y + h - 6, C.ink, 2);
      // belt
      cv.rect(cx - 22, y + 24, 44, 10, C.gold);
      cv.circle(cx, y + 29, 6, C.redBright);
      cv.text(cx - 3, y + 26, '1', 1, C.white, true);
      cv.circle(cx - 30, y + 34, 6, C.redBright);
      cv.circle(cx + 30, y + 34, 6, C.redBright);
      break;
    }
    case 16: { // US Capitol dome
      cv.rect(x, y, w, h, C.sky);
      cv.rect(x + 6, y + h - 10, w - 12, 10, C.white);
      cv.rect(cx - 26, y + h - 22, 52, 12, C.white);
      cv.rect(cx - 16, y + h - 34, 32, 12, C.white);
      cv.tri(cx - 12, y + h - 34, cx + 12, y + h - 34, cx, y + 8, C.white);
      cv.circle(cx, y + 8, 3, C.gold);
      cv.line(cx, y + 2, cx, y + 8, C.gold, 1);
      cv.line(x + 6, y + h - 22, x + w - 6, y + h - 22, C.ink2, 1);
      cv.text(cx - 14, y + h - 20, '62-33', 1, C.navy, true);
      break;
    }
  }
  cv.border(x, y, w, h, C.line, 1);
}

// ---------------------------------------------------------------- layout
const MX = 16;              // outer margin
const CW = W - 2 * MX;      // content width = 992

function drawMasthead(cv: Canvas) {
  cv.rect(MX, 8, CW, 3, C.red);
  cv.textCenter(W / 2, 16, 'Friday 20 November 2026', 3, C.ink, true);
  cv.textCenter(W / 2, 42, 'ONE DAY OF WORLD NEWS, ONE PICTURE', 1, C.red, true);
  cv.textCenter(W / 2, 54, '50 STORIES · 7 REGIONS', 1, C.navy, true);
  cv.rect(MX, 68, CW, 2, C.navy);
  cv.rect(MX, 72, CW, 1, C.red);
}

function drawTimeline(cv: Canvas) {
  const y = 78, h = 52, sw = Math.floor(CW / 6);
  cv.rect(MX, y, CW, h, C.paper2);
  cv.border(MX, y, CW, h, C.line, 1);
  TIMELINE.forEach(([t, ev], i) => {
    const x = MX + i * sw;
    if (i > 0) cv.line(x, y + 4, x, y + h - 4, C.line, 1);
    cv.text(x + 5, y + 5, t, 1, C.red, true);
    cv.para(x + 5, y + 16, ev, sw - 10, 1, C.ink, false, 9);
  });
}

function drawFeaturedCard(cv: Canvas, f: Featured, x: number, y: number, w: number, h: number, big: boolean) {
  const rc = REGION_COLOR[f.region];
  cv.rect(x, y, w, h, C.cardBg);
  cv.border(x, y, w, h, C.line, 1);
  // Header: number badge + region/topic tag + source label.
  // Big cards: one line with tight separators when it fits.
  // Small cards: tag on line 1, source on line 2.
  const tag = REGION_NAME[f.region] + '·' + f.topic;
  const srcT = f.src.replace(' · ', '·');
  const tagW = cv.textWidth(tag, 1, true);
  const srcW = cv.textWidth(srcT, 1, true);
  let ty: number;
  cv.rect(x, y, 20, 14, rc);
  cv.text(x + 4, y + 4, String(f.n), 1, C.white, true);
  if (big && 24 + tagW + 6 + srcW <= w - 6) {
    cv.text(x + 24, y + 4, tag, 1, rc, true);
    cv.text(x + w - srcW - 5, y + 4, srcT, 1, C.ink2, true);
    cv.line(x + 4, y + 17, x + w - 4, y + 17, C.line, 1);
    ty = y + 21;
  } else {
    cv.text(x + 24, y + 4, tag, 1, rc, true);
    cv.text(x + 5, y + 14, srcT, 1, C.ink2, true);
    cv.line(x + 4, y + 26, x + w - 4, y + 26, C.line, 1);
    ty = y + 30;
  }
  // illustration
  const ih = big ? 40 : 42;
  drawIllo(cv, f.illo, x + 5, ty, w - 10, ih);
  ty += ih + 4;
  // headline
  const hs = big ? 2 : 1;
  const hLines = cv.wrap(f.head, w - 10, hs, true);
  const maxH = 4;
  hLines.slice(0, maxH).forEach((ln, i) => cv.text(x + 5, ty + i * (7 * hs + 2), ln, hs, C.ink, true));
  ty += Math.min(hLines.length, maxH) * (7 * hs + 2) + 2;
  // deck: fill whatever vertical space is left, never overflow the card
  const dLines = cv.wrap(f.deck, w - 10, 1, false);
  const maxD = Math.max(1, Math.floor((y + h - 6 - ty) / 9));
  dLines.slice(0, maxD).forEach((ln, i) => cv.text(x + 5, ty + i * 9, ln, 1, C.ink2, false));
}

function drawFeatured(cv: Canvas) {
  // Row 1: 4 large cards. Rows 2-3: 6 small cards each.
  const y1 = 136, h1 = 168, gap = 6;
  const w1 = Math.floor((CW - 3 * gap) / 4);
  for (let i = 0; i < 4; i++) {
    drawFeaturedCard(cv, FEATURED[i], MX + i * (w1 + gap), y1, w1, h1, true);
  }
  const y2 = y1 + h1 + gap, h2 = 156;
  const w2 = Math.floor((CW - 5 * gap) / 6);
  for (let i = 0; i < 6; i++) {
    drawFeaturedCard(cv, FEATURED[4 + i], MX + i * (w2 + gap), y2, w2, h2, false);
  }
  const y3 = y2 + h2 + gap;
  for (let i = 0; i < 6; i++) {
    drawFeaturedCard(cv, FEATURED[10 + i], MX + i * (w2 + gap), y3, w2, h2, false);
  }
}

// World map (equirectangular) with numbered pins 1-16 and dots 17-50.
const CONTINENTS: Array<Array<[number, number]>> = [
  // North America
  [[-168, 66], [-140, 70], [-125, 72], [-110, 73], [-95, 80], [-85, 80], [-75, 73], [-65, 60], [-55, 47], [-60, 45], [-75, 35], [-80, 25], [-90, 21], [-97, 16], [-105, 20], [-117, 32], [-125, 40], [-124, 48], [-140, 60], [-155, 58], [-165, 60]],
  // South America
  [[-80, 9], [-72, 12], [-60, 8], [-50, 0], [-35, -8], [-40, -20], [-48, -28], [-58, -38], [-65, -45], [-70, -54], [-73, -40], [-72, -20], [-77, -12], [-81, -5], [-80, 9]],
  // Europe
  [[-10, 36], [-9, 43], [-2, 48], [-4, 50], [0, 51], [3, 53], [8, 57], [10, 59], [18, 56], [21, 55], [24, 58], [28, 60], [30, 62], [30, 70], [25, 71], [18, 69], [12, 65], [5, 60], [5, 58], [-5, 50], [-10, 43], [-10, 36]],
  // Africa
  [[-17, 15], [-16, 20], [-10, 30], [0, 36], [10, 37], [20, 32], [30, 31], [35, 28], [43, 12], [51, 11], [48, 2], [40, -10], [35, -20], [32, -28], [20, -35], [15, -30], [12, -18], [8, -2], [9, 4], [-8, 5], [-13, 8], [-17, 15]],
  // Asia
  [[30, 70], [40, 68], [50, 69], [60, 69], [70, 72], [80, 73], [90, 75], [100, 77], [110, 76], [120, 73], [130, 72], [140, 72], [150, 70], [160, 69], [170, 67], [178, 65], [170, 60], [162, 56], [158, 52], [150, 59], [142, 55], [140, 45], [135, 43], [130, 40], [127, 38], [122, 38], [120, 32], [115, 23], [108, 18], [105, 10], [100, 8], [97, 15], [92, 21], [88, 22], [80, 15], [75, 8], [72, 20], [65, 25], [60, 25], [57, 26], [52, 26], [48, 29], [44, 29], [40, 32], [36, 36], [30, 36], [30, 42], [35, 45], [40, 50], [35, 55], [30, 62]],
  // Australia
  [[113, -22], [114, -30], [115, -35], [120, -34], [129, -32], [132, -32], [135, -35], [137, -35], [140, -38], [145, -38], [150, -37], [153, -32], [153, -27], [150, -23], [146, -19], [142, -15], [142, -11], [137, -12], [135, -15], [132, -12], [130, -13], [126, -14], [122, -17], [118, -20], [113, -22]],
  // New Zealand
  [[167, -45], [170, -43], [173, -41], [176, -38], [178, -38], [175, -40], [172, -43], [168, -46], [167, -45]],
];

function drawMap(cv: Canvas, x: number, y: number, w: number, h: number) {
  cv.rect(x, y, w, h, C.mapSea);
  cv.border(x, y, w, h, C.line, 1);
  const toX = (lon: number) => x + Math.round(((lon + 180) / 360) * w);
  const toY = (lat: number) => y + Math.round(((90 - lat) / 180) * h);
  for (const cont of CONTINENTS) {
    cv.poly(cont.map(([lo, la]) => [toX(lo), toY(la)] as [number, number]), C.mapLand);
  }
  // graticule
  for (let lo = -150; lo <= 150; lo += 30) cv.line(toX(lo), y, toX(lo), y + h, [190, 205, 210], 1);
  for (let la = -60; la <= 60; la += 30) cv.line(x, toY(la), x + w, toY(la), [190, 205, 210], 1);
  // dots 17-50 first (under pins)
  for (const [lo, la] of DOTS) cv.circle(toX(lo), toY(la), 2, C.navy);
  // numbered pins 1-16 (small, with leader lines where offset)
  PINS.forEach(([lo, la], i) => {
    const off = PIN_OFF[i + 1];
    const dlo = off ? off[0] : lo, dla = off ? off[1] : la;
    const px = toX(dlo), py = toY(dla);
    if (off) cv.line(toX(lo), toY(la), px, py, C.ink2, 1);
    const col = REGION_COLOR[FEATURED[i].region];
    cv.circle(px, py, 6, col);
    cv.ring(px, py, 6, C.white, 1);
    const ns = String(i + 1);
    cv.text(px - Math.floor(cv.textWidth(ns, 1, true) / 2), py - 3, ns, 1, C.white, true);
  });
}

function drawBottom(cv: Canvas) {
  const top = 628;
  const leftW = 470, rightX = MX + leftW + 12, rightW = W - MX - rightX;
  // --- map block (left)
  cv.text(MX, top, 'WHERE IT HAPPENED', 1, C.navy, true);
  cv.text(MX + leftW - cv.textWidth('Pins 1-16  ·  dots 17-50', 1), top, 'Pins 1-16  ·  dots 17-50', 1, C.ink2);
  drawMap(cv, MX, top + 12, leftW, 190);
  // legend
  const leg: Array<[string, RGB]> = [
    ['Europe', C.europe], ['Middle East', C.middleEast], ['Asia', C.asia],
    ['Americas', C.americas], ['Africa', C.africa], ['Oceania', C.oceania], ['Global', C.global],
  ];
  let lx = MX;
  const ly = top + 12 + 190 + 6;
  for (const [name, col] of leg) {
    cv.rect(lx, ly, 8, 8, col);
    cv.text(lx + 10, ly + 1, name, 1, C.ink);
    lx += 10 + cv.textWidth(name, 1) + 10;
  }
  // --- date check box (left, below map)
  const dbY = ly + 16;
  const dbH = 1016 - 26 - dbY;
  cv.rect(MX, dbY, leftW, dbH, C.paper2);
  cv.border(MX, dbY, leftW, dbH, C.red, 2);
  cv.text(MX + 8, dbY + 6, 'DATE CHECK - LEFT OUT ON PURPOSE', 1, C.red, true);
  const dc1 = 'Left out because they broke on other days: Anthropic record IPO debut (19 Nov); the Shenzhen summit meeting itself (19 Nov); Kerch Bridge strikes (17-18 Nov); Cyclone Akvan nearing Odisha (17 Nov); DR Congo Ebola tally passing 11,000 (17 Nov); PAHO measles-free ruling for the US, Mexico and Bolivia (17 Nov).';
  const dc2 = 'Not yet: US House vote on the energy bill (Senate passed 20 Nov); Kenya Ebola-free declaration (42 days away); Spain general elections (next week); November flash PMI data (next week).';
  let dy = dbY + 18;
  dy += cv.para(MX + 8, dy, dc1, leftW - 16, 1, C.ink, false, 9) * 9 + 4;
  cv.para(MX + 8, dy, dc2, leftW - 16, 1, C.ink, false, 9);
  // --- one-liners (right)
  cv.text(rightX, top, 'THE REST OF THE DAY - 17 TO 50', 1, C.navy, true);
  const colW = Math.floor((rightW - 8) / 2);
  const slotH = 20;
  for (let col = 0; col < 2; col++) {
    const items = ONELINERS.slice(col * 17, col * 17 + 17);
    const cx0 = rightX + col * (colW + 8);
    items.forEach((s, i) => {
      const n = col * 17 + i + 17;
      const yy = top + 14 + i * slotH;
      cv.text(cx0, yy, String(n) + '.', 1, C.red, true);
      const lines = cv.wrap(s, colW - 22, 1, false).slice(0, 2);
      lines.forEach((ln, k) => cv.text(cx0 + 22, yy + k * 9, ln, 1, C.ink, false));
    });
  }
  // --- footer
  cv.rect(MX, 996, CW, 1, C.line);
  cv.textCenter(W / 2, 1001, 'Sources: OneTurn, AP, Reuters, AFP, Dow Jones, PBS NewsHour, IANS, ESA, USGS. Original drawings.', 1, C.ink2);
  cv.textCenter(W / 2, 1012, 'Every story here happened or was first reported on Friday 20 November 2026.', 1, C.navy, true);
}

// ---------------------------------------------------------------- main
function main() {
  const cv = new Canvas();
  drawMasthead(cv);
  drawTimeline(cv);
  drawFeatured(cv);
  drawBottom(cv);
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  fs.mkdirSync(outDir, { recursive: true });
  const png = encodePNG(cv);
  fs.writeFileSync(path.join(outDir, 'entry.png'), png);
  console.log('entry.png:', png.length, 'bytes, 1024x1024');
}
main();
