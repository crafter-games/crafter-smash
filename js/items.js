// ---------- Ítems e invocaciones (Kirbys, Pokémon, Miku, memes de gatos) ----------
const ITEM_NAMES = [
  'kirby', 'kirby_happy', 'kirby_star', 'kirby_big', 'kirby_ball0', 'kirby_ball1', 'kirby_ball2', 'kirby_ball3',
  'pikachu', 'charmander', 'squirtle', 'bulbasaur', 'charizard', 'pokeball',
  'miku0', 'miku1', 'miku2', 'miku3', 'miku4', 'miku5', 'miku6',
  'cat_yelling', 'cat_nyan', 'cat_keyboard', 'cat_grumpy', 'cat_long', 'cat_bongo', 'cat_bub', 'cat_maru',
];
const CAT_MEMES = ['cat_grumpy', 'cat_yelling', 'cat_keyboard', 'cat_bongo', 'cat_bub', 'cat_maru', 'cat_nyan'];
const MEME_CAPTIONS = { cat_grumpy: 'NO.', cat_yelling: '¿¡QUÉ!?', cat_keyboard: '♪ PLAY HIM OFF', cat_bongo: 'BONK', cat_bub: ':3', cat_maru: 'if i fits...', cat_nyan: 'NYAN~' };

const Items = (() => {
  const img = {};
  function load(done) {
    let left = ITEM_NAMES.length;
    for (const n of ITEM_NAMES) {
      const i = new Image();
      i.onload = i.onerror = () => { if (--left === 0 && done) done(); };
      i.src = `assets/items/${n}.png`;
      img[n] = i;
    }
  }
  // dibuja una imagen centrada en (x, y); pixelada salvo los memes (fotos)
  function draw(ctx, name, x, y, h, opts = {}) {
    const im = img[name];
    if (!im || !im.width) return;
    const s = h / im.height, w = im.width * s;
    ctx.save();
    ctx.translate(x, y);
    if (opts.rot) ctx.rotate(opts.rot);
    ctx.scale(opts.flip ? -1 : 1, 1);
    if (opts.alpha !== undefined) ctx.globalAlpha *= opts.alpha;
    ctx.imageSmoothingEnabled = !!opts.smooth;
    const ay = opts.anchorBottom ? -h : -h / 2;
    ctx.drawImage(im, -w / 2, ay, w, h);
    ctx.restore();
  }
  // tarjeta de meme: foto con marco blanco y texto estilo impact
  function meme(ctx, name, x, y, size, rot) {
    const im = img[name];
    if (!im || !im.width) return;
    const ar = im.width / im.height;
    const h = size, w = Math.min(size * 1.6, size * ar);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.fillStyle = '#fff'; ctx.fillRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10);
    ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 2; ctx.strokeRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(im, -w / 2, -h / 2, w, h);
    const cap = MEME_CAPTIONS[name];
    if (cap) {
      ctx.font = `900 ${Math.round(size * 0.2)}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(cap, 0, h / 2 - 6);
      ctx.fillStyle = '#fff'; ctx.fillText(cap, 0, h / 2 - 6);
    }
    ctx.restore();
  }
  return { load, img, draw, meme };
})();

// Triángulo de Vercel
function drawVercel(ctx, x, y, s, rot, glow) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
  if (glow) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 14; }
  ctx.fillStyle = '#000'; ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, s * 0.12);
  ctx.beginPath(); ctx.moveTo(0, -s * 0.6); ctx.lineTo(s * 0.62, s * 0.45); ctx.lineTo(-s * 0.62, s * 0.45); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

// Martillo (Anthony estudió ingeniería civil)
function drawHammer(ctx, x, y, ang, len) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.imageSmoothingEnabled = false;
  // mango
  ctx.fillStyle = '#1a1020'; ctx.fillRect(-4, -len, 8, len + 6);
  ctx.fillStyle = '#b8732e'; ctx.fillRect(-2, -len, 4, len + 4);
  ctx.fillStyle = '#e39a50'; ctx.fillRect(-2, -len, 1.5, len + 4);
  ctx.fillStyle = '#5b3a1c'; ctx.fillRect(-3, -8, 6, 12);
  // cabeza
  const hw = len * 0.62, hh = len * 0.3;
  ctx.fillStyle = '#1a1020'; ctx.fillRect(-hw / 2 - 3, -len - hh - 3, hw + 6, hh + 6);
  ctx.fillStyle = '#8a929c'; ctx.fillRect(-hw / 2, -len - hh, hw, hh);
  ctx.fillStyle = '#c7ced6'; ctx.fillRect(-hw / 2, -len - hh, hw, hh * 0.3);
  ctx.fillStyle = '#5c636c'; ctx.fillRect(-hw / 2, -len - hh * 0.25, hw, hh * 0.25);
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(hw / 2 - 5, -len - hh, 5, hh); // cara del martillo
  ctx.restore();
}

// Logo de OpenAI (flor de 6 eslabones)
function drawOpenAI(ctx, x, y, s, rot, alpha = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.globalAlpha *= alpha;
  ctx.shadowColor = '#10a37f'; ctx.shadowBlur = 16;
  ctx.fillStyle = '#0d1117'; ctx.beginPath(); ctx.arc(0, 0, s * 0.95, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, s * 0.11); ctx.lineJoin = 'round';
  for (let i = 0; i < 6; i++) {
    ctx.save(); ctx.rotate(i * Math.PI / 3);
    const w = s * 0.36, h = s * 0.8, ox = s * 0.18, oy = -s * 0.62, r = w / 2;
    ctx.beginPath();
    ctx.moveTo(ox - w / 2, oy + r); ctx.arc(ox, oy + r, r, Math.PI, 0); ctx.lineTo(ox + w / 2, oy + h - r);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
// Terminal de Codex (proyectil de Railly)
function drawCodexTerminal(ctx, p) {
  const k = Math.min(1, p.t / 5), w = 120 * k, h = 76 * k;
  ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha *= p.alpha ?? 1;
  ctx.shadowColor = '#10a37f'; ctx.shadowBlur = 18;
  ctx.fillStyle = '#0d1117'; ctx.strokeStyle = '#10a37f'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-w / 2, -h / 2, w, h, 8) : ctx.rect(-w / 2, -h / 2, w, h); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  if (k >= 1) {
    ctx.fillStyle = '#1f2937'; ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, 12);
    ['#ff5f56', '#ffbd2e', '#27c93f'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-w / 2 + 10 + i * 9, -h / 2 + 8, 3, 0, TAU); ctx.fill(); });
    drawOpenAI(ctx, w / 2 - 10, -h / 2 + 8, 6, 0);
    ctx.font = 'bold 9px Menlo, monospace'; ctx.textAlign = 'left';
    let chars = p.t * 4;
    p.lines.forEach((ln, i) => {
      const n = Math.max(0, Math.min(ln.length, chars)); chars -= ln.length;
      ctx.fillStyle = ln[0] === '✓' ? '#27c93f' : ln[0] === '$' ? '#ffffff' : '#10a37f';
      ctx.fillText(ln.slice(0, n) + (n < ln.length && n > 0 ? '█' : ''), -w / 2 + 6, -h / 2 + 26 + i * 12);
    });
  }
  ctx.restore();
}
