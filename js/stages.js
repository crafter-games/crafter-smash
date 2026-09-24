// ---------- Escenarios en pixel art (estilo Super Smash Flash) ----------
function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
const OUT = '#1a1020';

// Región del mundo que cubre la capa del escenario (en baja resolución)
const WX0 = -300, WY0 = 0, WW = 2200, WH = 1200;
const toL = (v) => Math.round(v / PX);

// Dibuja una capa de fondo que cubre la pantalla con parallax
function drawLayer(ctx, layer, W, H, cam, par, anchorY) {
  const sc = Math.max(W / layer.width, H / layer.height) * 1.12;
  const lw = layer.width * sc, lh = layer.height * sc;
  const ox = clamp(-(cam.x - 800) * par * cam.zoom, -(lw - W) / 2, (lw - W) / 2);
  const oy = clamp(-(cam.y - 450) * par * 0.6 * cam.zoom, -(lh - H) / 2, (lh - H) / 2);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(layer, Math.round((W - lw) / 2 + ox), Math.round((H - lh) * (anchorY ?? 0.5) + oy), Math.round(lw), Math.round(lh));
}

// ======== TEMPLO CRAFTER ========
function bakeTemple(st) {
  const r = seeded(9);
  // cielo + montañas
  const [bg, b] = mkCanvas(400, 240);
  const sky = b.createLinearGradient(0, 0, 0, 240);
  sky.addColorStop(0, '#2a55c8'); sky.addColorStop(0.6, '#5b8ff0'); sky.addColorStop(1, '#a9d0ff');
  b.fillStyle = sky; b.fillRect(0, 0, 400, 240);
  // bandas de color (dithering simple)
  for (let y = 0; y < 240; y += 2) for (let x = (y / 2) % 2; x < 400; x += 2) if (r() < 0.05) { b.fillStyle = 'rgba(255,255,255,.08)'; b.fillRect(x, y, 1, 1); }
  // montañas moradas
  const mount = (base, col, dark, peaks, seed) => {
    const rr = seeded(seed);
    b.fillStyle = col;
    let pts = [];
    for (let x = 0; x <= 400; x += 4) {
      let h = 0; for (const [px, ph, pw] of peaks) h = Math.max(h, ph * Math.max(0, 1 - Math.abs(x - px) / pw));
      pts.push([x, base - h + Math.floor(rr() * 3)]);
    }
    for (const [x, y] of pts) b.fillRect(x, y, 4, 240 - y);
    b.fillStyle = dark; for (const [x, y] of pts) if ((x / 4) % 3 === 0) b.fillRect(x, y + 6, 2, 240 - y);
    b.fillStyle = shade(col, 30); for (const [x, y] of pts) b.fillRect(x, y, 4, 2);
  };
  mount(170, '#8e6fc9', '#7a5cb5', [[60, 110, 90], [170, 140, 80], [300, 120, 100], [390, 90, 60]], 3);
  // cascadas
  b.fillStyle = '#bfe6ff'; b.fillRect(58, 70, 5, 110); b.fillRect(300, 60, 4, 110);
  b.fillStyle = '#ffffff'; b.fillRect(59, 70, 2, 110); b.fillRect(301, 60, 1, 110);
  mount(200, '#6b4fa8', '#5a4192', [[110, 80, 90], [250, 95, 110], [360, 70, 70]], 5);
  // bosque
  const [mid, m] = mkCanvas(500, 240);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * 520) - 10, y = 150 + Math.floor(r() * 30), s = 10 + Math.floor(r() * 16);
    m.fillStyle = '#1f6b3a'; m.fillRect(x - s, y, s * 2, 240 - y);
    for (let k = 0; k < s; k += 2) { m.fillStyle = k < 4 ? '#3f9a4c' : '#2c7f40'; m.fillRect(x - s + k, y - Math.floor(Math.sqrt(s * s - (s - k) * (s - k)) * 0.8), 2, 3); m.fillRect(x + s - k - 2, y - Math.floor(Math.sqrt(s * s - (s - k) * (s - k)) * 0.8), 2, 3); }
    m.fillStyle = '#2c7f40'; m.fillRect(x - s + 2, y - s * 0.6, s * 2 - 4, s);
    m.fillStyle = '#56b35a'; m.fillRect(x - s + 4, y - s * 0.6, s - 4, 2);
  }
  m.fillStyle = '#175a30'; m.fillRect(0, 200, 500, 40);
  // pirámide / templo lejano
  m.fillStyle = '#b8a7d8'; for (let i = 0; i < 26; i++) m.fillRect(240 - i * 2, 120 + i * 2, i * 4, 2);
  m.fillStyle = '#9d8cc4'; for (let i = 0; i < 26; i++) m.fillRect(240, 120 + i * 2, i * 2, 2);

  // capa del escenario (mundo)
  const [fg, g] = mkCanvas(WW / PX, WH / PX);
  const X = (v) => toL(v - WX0), Y = (v) => toL(v - WY0);
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const p = st.main;
  const x1 = X(p.x1), x2 = X(p.x2), y1 = Y(p.y), y2 = Y(p.bottom) + 34;
  // pilares de fondo
  const pillar = (cx, top, broken) => {
    const w = 18;
    R(cx - w / 2 - 1, top - 1, w + 2, y1 - top + 1, OUT);
    R(cx - w / 2, top, w, y1 - top, '#e9cf68');
    for (let i = 2; i < w; i += 4) R(cx - w / 2 + i, top, 1, y1 - top, '#c9a948');
    R(cx - w / 2, top, 3, y1 - top, '#f7e7a1');
    R(cx - w / 2 - 3, y1 - 6, w + 6, 6, '#d8bb55'); R(cx - w / 2 - 3, y1 - 6, w + 6, 1, OUT);
    if (!broken) { R(cx - w / 2 - 3, top - 5, w + 6, 5, '#d8bb55'); R(cx - w / 2 - 4, top - 6, w + 8, 1, OUT); }
    else { for (let i = 0; i < w; i += 3) R(cx - w / 2 + i, top - (i % 2 ? 4 : 1), 3, 4, '#e9cf68'); }
    // enredaderas
    for (let k = 0; k < 5; k++) { const vy = top + 10 + k * 22; R(cx - 4 + (k % 2) * 6, vy, 2, 8, '#3f9a4c'); R(cx - 6 + (k % 2) * 6, vy + 4, 4, 2, '#56b35a'); }
  };
  pillar(X(p.x1 + 40), y1 - 150, true); pillar(X(p.x2 - 40), y1 - 170, false); pillar(X(p.x2 - 120), y1 - 120, true);
  // pedestales con orbes (como el templo de la referencia)
  for (const ox of [700, 900]) {
    const cx = X(ox);
    R(cx - 5, y1 - 40, 10, 40, OUT); R(cx - 4, y1 - 39, 8, 39, '#3a3f86');
    for (let i = 0; i < 40; i += 4) R(cx - 4, y1 - 39 + i, 8, 1, '#5a61b8');
    R(cx - 7, y1 - 44, 14, 5, '#5a61b8');
    R(cx - 6, y1 - 56, 12, 12, OUT); R(cx - 5, y1 - 55, 10, 10, '#bfe9ff'); R(cx - 3, y1 - 53, 3, 3, '#fff');
  }
  // bloque de arenisca con damero
  R(x1 - 1, y1 - 1, x2 - x1 + 2, y2 - y1 + 2, OUT);
  for (let yy = y1; yy < y2; yy += 6) for (let xx = x1; xx < x2; xx += 6) {
    const on = ((xx - x1) / 6 + (yy - y1) / 6) % 2 === 0;
    R(xx, yy, Math.min(6, x2 - xx), Math.min(6, y2 - yy), on ? '#f0dc84' : '#d6bd5c');
  }
  // columnas frontales del bloque
  for (let cx = x1 + 22; cx < x2 - 10; cx += 58) {
    R(cx - 5, y1 + 14, 10, y2 - y1 - 14, '#e2c25e'); R(cx - 5, y1 + 14, 2, y2 - y1 - 14, '#f7e7a1'); R(cx + 3, y1 + 14, 2, y2 - y1 - 14, '#b9983e');
    R(cx - 6, y1 + 14, 1, y2 - y1 - 14, OUT); R(cx + 5, y1 + 14, 1, y2 - y1 - 14, OUT);
  }
  // borde inferior roto con raíces
  for (let xx = x1; xx < x2; xx += 3) { const d = 2 + Math.floor(r() * 6); R(xx, y2, 3, d, '#b9983e'); R(xx, y2 + d, 3, 1, OUT); if (r() < 0.12) R(xx + 1, y2 + d, 1, 6 + Math.floor(r() * 10), '#6b4a2a'); }
  // césped superior con goteo
  R(x1 - 2, y1 - 1, x2 - x1 + 4, 7, '#5fb13a'); R(x1 - 2, y1 - 1, x2 - x1 + 4, 2, '#8fdc5a');
  for (let xx = x1 - 2; xx < x2 + 2; xx += 2) { const d = r() < 0.3 ? 4 + Math.floor(r() * 10) : Math.floor(r() * 4); R(xx, y1 + 6, 2, d, '#5fb13a'); R(xx, y1 + 6 + d, 2, 1, '#3d8a26'); }
  for (let xx = x1; xx < x2; xx += 5) if (r() < 0.5) R(xx, y1 - 3, 1, 2, '#8fdc5a');
  R(x1 - 3, y1 - 2, x2 - x1 + 6, 1, OUT);
  // plataformas flotantes (losas)
  for (const q of st.platforms) {
    if (!q.soft) continue;
    const a = X(q.x1), bb = X(q.x2), yy = Y(q.y);
    R(a - 1, yy - 1, bb - a + 2, 9, OUT);
    R(a, yy, bb - a, 7, '#e9cf68'); R(a, yy, bb - a, 2, '#8fdc5a');
    for (let xx = a; xx < bb; xx += 8) R(xx, yy + 3, 1, 4, '#c9a948');
    for (let xx = a; xx < bb; xx += 2) if (r() < 0.35) R(xx, yy + 7, 2, 2 + Math.floor(r() * 4), '#5fb13a');
  }
  return { bg, mid, fg };
}

// ======== DESTINO FINAL ========
function bakeFinal(st) {
  const r = seeded(21);
  const [bg, b] = mkCanvas(400, 240);
  b.fillStyle = '#05030f'; b.fillRect(0, 0, 400, 240);
  const blob = (cx, cy, rad, cols) => { for (let i = 0; i < 900; i++) { const a = r() * TAU, d = Math.sqrt(r()) * rad; const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d * 0.6); b.fillStyle = cols[Math.floor((d / rad) * cols.length)]; b.fillRect(x, y, 2, 2); } };
  blob(110, 90, 80, ['#6a2fb0', '#4b1f86', '#2e1459', '#1a0c35']);
  blob(300, 150, 90, ['#1f6fd6', '#1a4fa0', '#12306a', '#0b1a3a']);
  for (let i = 0; i < 180; i++) { b.fillStyle = r() < 0.2 ? '#bfe9ff' : '#ffffff'; b.fillRect(Math.floor(r() * 400), Math.floor(r() * 240), 1, 1); }
  // planeta
  for (let y = -26; y <= 26; y++) for (let x = -26; x <= 26; x++) if (x * x + y * y <= 26 * 26) { b.fillStyle = x + y < -10 ? '#7fd6ff' : x + y < 14 ? '#3a8fd8' : '#20528f'; b.fillRect(330 + x, 50 + y, 1, 1); }
  b.fillStyle = '#c9f0ff'; for (let x = -40; x <= 40; x++) b.fillRect(330 + x, 50 + Math.round(x * 0.2), 1, 1);
  const [mid, m] = mkCanvas(500, 240);
  for (let i = 0; i < 60; i++) { m.fillStyle = '#ffffff'; m.fillRect(Math.floor(r() * 500), Math.floor(r() * 240), 2, 2); }
  const [fg, g] = mkCanvas(WW / PX, WH / PX);
  const X = (v) => toL(v - WX0), Y = (v) => toL(v - WY0);
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const p = st.main, x1 = X(p.x1), x2 = X(p.x2), y1 = Y(p.y), y2 = Y(p.bottom);
  // parte inferior escalonada
  const cx = (x1 + x2) / 2;
  for (let i = 0; i < 70; i++) {
    const half = Math.max(8, (x2 - x1) / 2 - 12 - i * 3.6);
    R(Math.round(cx - half) - 1, y2 + i, Math.round(half * 2) + 2, 1, OUT);
    R(Math.round(cx - half), y2 + i, Math.round(half * 2), 1, i % 10 < 1 ? '#2f3a78' : '#141a3e');
    if (i % 10 === 5) { R(Math.round(cx - half) + 4, y2 + i, 3, 1, '#4fd2ff'); R(Math.round(cx + half) - 7, y2 + i, 3, 1, '#4fd2ff'); }
  }
  R(cx - 4, y2 + 30, 8, 12, '#4fd2ff'); R(cx - 2, y2 + 32, 4, 8, '#e8fbff');
  R(x1 - 1, y1 - 1, x2 - x1 + 2, y2 - y1 + 2, OUT);
  R(x1, y1, x2 - x1, y2 - y1, '#262d63');
  R(x1, y1, x2 - x1, 3, '#9fe8ff'); R(x1, y1 + 3, x2 - x1, 2, '#4fa8e0');
  for (let xx = x1 + 8; xx < x2 - 8; xx += 20) { R(xx, y1 + 9, 10, 2, '#3a4590'); R(xx + 2, y1 + 13, 6, 1, '#1b2150'); }
  R(x1, y2 - 3, x2 - x1, 3, '#161b44');
  return { bg, mid, fg };
}

// ======== AZOTEA LIMA ========
function bakeLima(st) {
  const r = seeded(33);
  const [bg, b] = mkCanvas(400, 240);
  const bands = ['#2b1b5a', '#4a2370', '#7a2f7e', '#b54783', '#e0607c', '#f58a6e', '#ffb36b', '#ffd28a'];
  bands.forEach((c, i) => { b.fillStyle = c; b.fillRect(0, i * 20, 400, 20); });
  // dithering entre bandas
  for (let i = 1; i < bands.length; i++) for (let x = 0; x < 400; x += 2) { b.fillStyle = bands[i]; b.fillRect(x + (i % 2), i * 20 - 2, 1, 1); b.fillStyle = bands[i - 1]; b.fillRect(x, i * 20 + 1, 1, 1); }
  // sol
  for (let y = -22; y <= 22; y++) for (let x = -22; x <= 22; x++) if (x * x + y * y <= 22 * 22) { b.fillStyle = y > 8 && y % 4 < 2 ? '#ffb36b' : '#fff1c1'; b.fillRect(200 + x, 150 + y, 1, 1); }
  // mar
  b.fillStyle = '#5a3f7a'; b.fillRect(0, 165, 400, 75);
  for (let y = 168; y < 240; y += 4) for (let x = 0; x < 400; x += 12) if (r() < 0.5) { b.fillStyle = Math.abs(x - 200) < 40 ? '#ffd28a' : '#7a5c9a'; b.fillRect(x + Math.floor(r() * 6), y, 6, 1); }
  // acantilado Costa Verde
  b.fillStyle = '#6b3d5a'; for (let x = 0; x < 130; x += 2) { const h = 30 + Math.floor(Math.sin(x * 0.08) * 6) + Math.floor(r() * 3); b.fillRect(x, 165 - h, 2, 75 + h); }
  b.fillStyle = '#4f2c44'; for (let x = 0; x < 130; x += 6) b.fillRect(x, 150, 2, 90);
  const [mid, m] = mkCanvas(500, 240);
  let x = 0;
  while (x < 500) {
    const w = 20 + Math.floor(r() * 30), h = 40 + Math.floor(r() * 90);
    m.fillStyle = '#3d2346'; m.fillRect(x, 240 - h, w, h);
    m.fillStyle = '#2c1834'; m.fillRect(x + w - 3, 240 - h, 3, h);
    for (let wy = 240 - h + 5; wy < 236; wy += 7) for (let wx = x + 3; wx < x + w - 5; wx += 5) if (r() < 0.4) { m.fillStyle = r() < 0.7 ? '#ffe39a' : '#ffb36b'; m.fillRect(wx, wy, 2, 3); }
    x += w + 2;
  }
  const [fg, g] = mkCanvas(WW / PX, WH / PX);
  const X = (v) => toL(v - WX0), Y = (v) => toL(v - WY0);
  const R = (xx, y, w, h, c) => { g.fillStyle = c; g.fillRect(xx, y, w, h); };
  const p = st.main, x1 = X(p.x1), x2 = X(p.x2), y1 = Y(p.y), y2 = Y(p.bottom);
  // edificio
  R(x1 + 6, y2, x2 - x1 - 12, 250, '#4a3350');
  for (let yy = y2 + 10; yy < y2 + 250; yy += 20) for (let xx = x1 + 16; xx < x2 - 20; xx += 22) { R(xx, yy, 11, 12, OUT); R(xx + 1, yy + 1, 9, 10, r() < 0.5 ? '#ffe39a' : '#6d4d74'); }
  // tanque de agua y antena
  const tx = X(1080);
  R(tx - 1, y1 - 44, 32, 30, OUT); R(tx, y1 - 43, 30, 28, '#6d4d74'); R(tx, y1 - 43, 30, 3, '#8e6a93');
  R(tx + 3, y1 - 15, 3, 15, OUT); R(tx + 24, y1 - 15, 3, 15, OUT);
  const ax = X(470); R(ax, y1 - 34, 2, 34, OUT); R(ax - 1, y1 - 36, 4, 3, '#ff3355');
  // azotea
  R(x1 - 1, y1 - 1, x2 - x1 + 2, y2 - y1 + 2, OUT);
  R(x1, y1, x2 - x1, y2 - y1, '#7d5a78'); R(x1, y1, x2 - x1, 3, '#d9a4be'); R(x1, y1 + 3, x2 - x1, 1, '#a07590');
  for (let xx = x1 + 4; xx < x2 - 4; xx += 10) R(xx, y1 + 7, 6, 2, '#5f4260');
  // barandas
  for (const [a, bb] of [[x1, x1 + 26], [x2 - 26, x2]]) { R(a, y1 - 9, bb - a, 2, OUT); for (let xx = a; xx < bb; xx += 5) R(xx, y1 - 9, 1, 9, OUT); }
  // plataformas de madera
  for (const q of st.platforms) {
    if (!q.soft || q.gondola) continue;
    const a = X(q.x1), bb = X(q.x2), yy = Y(q.y);
    R(a - 1, yy - 1, bb - a + 2, 6, OUT); R(a, yy, bb - a, 4, '#c98a45'); R(a, yy, bb - a, 1, '#eab26a');
    R(a + 3, yy + 4, 3, 12, OUT); R(bb - 6, yy + 4, 3, 12, OUT);
  }
  return { bg, mid, fg };
}

const STAGES = {
  station: {
    id: 'station', name: 'Templo Crafter', music: 'battlefield',
    platforms: [
      { x1: 360, x2: 1240, y: 600, bottom: 660, main: true },
      { x1: 470, x2: 670, y: 460, soft: true },
      { x1: 930, x2: 1130, y: 460, soft: true },
      { x1: 700, x2: 900, y: 330, soft: true },
    ],
    blast: { l: -480, r: 2080, t: -460, b: 1330 },
    spawns: [{ x: 560, y: 600 }, { x: 1040, y: 600 }],
    bake: bakeTemple,
    drawBg(ctx, W, H, cam, t) {
      drawLayer(ctx, this.art.bg, W, H, cam, 0.04, 0.5);
      // nubes
      ctx.imageSmoothingEnabled = false;
      const sc = Math.max(W / 400, H / 240);
      for (let i = 0; i < 5; i++) {
        const cx = ((t * 0.15 * (1 + i * 0.3) + i * 260) % (W + 400)) - 200, cy = H * (0.08 + i * 0.06);
        ctx.fillStyle = '#ffffff';
        for (const [dx, dy, w, h] of [[0, 4, 26, 6], [4, 0, 12, 6], [14, 2, 8, 4], [-4, 7, 34, 4]]) ctx.fillRect(cx + dx * sc, cy + dy * sc, w * sc, h * sc);
        ctx.fillStyle = '#d7e8ff'; ctx.fillRect(cx - 4 * sc, cy + 10 * sc, 34 * sc, 1 * sc);
      }
      drawLayer(ctx, this.art.mid, W, H, cam, 0.12, 0.62);
    },
  },
  final: {
    id: 'final', name: 'Destino Final', music: 'final_destination',
    platforms: [{ x1: 360, x2: 1240, y: 600, bottom: 650, main: true }],
    blast: { l: -480, r: 2080, t: -460, b: 1330 },
    spawns: [{ x: 540, y: 600 }, { x: 1060, y: 600 }],
    bake: bakeFinal,
    drawBg(ctx, W, H, cam, t) {
      drawLayer(ctx, this.art.bg, W, H, cam, 0.03, 0.5);
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 0.05);
      drawLayer(ctx, this.art.mid, W, H, cam, 0.08, 0.5);
      ctx.globalAlpha = 1;
    },
  },
  lima: {
    id: 'lima', name: 'Azotea Lima', music: 'big_blue',
    platforms: [
      { x1: 380, x2: 1220, y: 600, bottom: 660, main: true },
      { x1: 440, x2: 630, y: 465, soft: true },
      { x1: 970, x2: 1160, y: 465, soft: true },
      { x1: 720, x2: 880, y: 320, soft: true, move: { ax: 250, ay: 20, period: 720 }, gondola: true },
    ],
    blast: { l: -480, r: 2080, t: -460, b: 1330 },
    spawns: [{ x: 540, y: 600 }, { x: 1060, y: 600 }],
    bake: bakeLima,
    drawBg(ctx, W, H, cam, t) {
      drawLayer(ctx, this.art.bg, W, H, cam, 0.03, 0.5);
      // parapentes
      const sc = Math.max(W / 400, H / 240);
      for (let i = 0; i < 3; i++) {
        const px = ((t * (0.25 + i * 0.1) + i * 700) % (W + 400)) - 200, py = H * (0.16 + i * 0.09) + Math.round(Math.sin(t * 0.02 + i) * 3) * sc;
        ctx.fillStyle = ['#e8323f', '#2f8fe8', '#ffd23f'][i];
        ctx.fillRect(px - 8 * sc, py, 16 * sc, 2 * sc); ctx.fillRect(px - 6 * sc, py - sc, 12 * sc, sc);
        ctx.fillStyle = '#2a1640'; ctx.fillRect(px - 7 * sc, py + 2 * sc, sc, 6 * sc); ctx.fillRect(px + 6 * sc, py + 2 * sc, sc, 6 * sc); ctx.fillRect(px - sc, py + 8 * sc, 2 * sc, 3 * sc);
      }
      drawLayer(ctx, this.art.mid, W, H, cam, 0.15, 0.75);
    },
  },
};

// Instancia un escenario
function makeStage(id) {
  const def = STAGES[id];
  const st = Object.create(def);
  st.platforms = def.platforms.map((p) => ({ ...p, bx1: p.x1, bx2: p.x2, by: p.y, dx: 0, dy: 0 }));
  st.main = st.platforms.find((p) => p.main);
  st.ledges = [
    { x: st.main.x1, y: st.main.y, side: -1, occupant: null },
    { x: st.main.x2, y: st.main.y, side: 1, occupant: null },
  ];
  if (!def._art) def._art = def.bake(st);
  st.art = def._art;
  st.update = function (frame) {
    for (const p of this.platforms) {
      if (!p.move) continue;
      const ph = (frame / p.move.period) * TAU;
      const nx1 = p.bx1 + Math.sin(ph) * p.move.ax;
      const ny = p.by + Math.sin(ph * 2) * p.move.ay;
      p.dx = nx1 - p.x1; p.dy = ny - p.y;
      p.x2 += p.dx; p.x1 = nx1; p.y = ny;
    }
  };
  st.drawStage = function (ctx, t) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.art.fg, WX0, WY0, WW, WH);
    for (const p of this.platforms) {
      if (!p.gondola) continue;
      const x = Math.round(p.x1 / PX) * PX, y = Math.round(p.y / PX) * PX, w = p.x2 - p.x1;
      const cx = x + w / 2;
      ctx.fillStyle = OUT;
      for (let i = 0; i < 300; i += 3) { ctx.fillRect(x + 12 + (cx - x - 12) * (i / 300) - 1, y - i * 3, 3, 3); ctx.fillRect(x + w - 12 - (x + w - 12 - cx) * (i / 300) - 1, y - i * 3, 3, 3); }
      ctx.fillRect(x - 3, y - 3, w + 6, 42);
      ctx.fillStyle = '#e8b04a'; ctx.fillRect(x, y, w, 12);
      ctx.fillStyle = '#9c6c1e'; ctx.fillRect(x, y + 12, w, 24);
      ctx.fillStyle = '#ffd98a'; ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = OUT; ctx.font = '12px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillText('LIMPIEZA', cx, y + 30);
    }
  };
  return st;
}
