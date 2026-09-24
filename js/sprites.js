// ---------- Sprites animados (atlas generado por build_sprites.py) ----------
const PX = 2;               // escala de pixel de los escenarios
const SPR_H = 128 * SZ / 1.2; // alto en el mundo del frame idle

const Sprites = (() => {
  const img = {}, face = {}, tintCache = {};
  let pending = 0, onReady = null;
  function load(done) {
    onReady = done;
    for (const id in SPRITE_DATA) for (const v of ['base', 'alt']) {
      pending += 2;
      const a = new Image(); a.onload = a.onerror = tick; a.src = `assets/sprites/${id}_${v}.png`; img[id + v] = a;
      const b = new Image(); b.onload = b.onerror = tick; b.src = `assets/sprites/${id}_${v}_face.png`; face[id + v] = b;
    }
  }
  function tick() { if (--pending === 0 && onReady) onReady(); }
  // atlas teñido de un color (para destellos / fantasmas); no lee pixeles, funciona en file://
  function tinted(key, color) {
    const k = key + color;
    if (tintCache[k]) return tintCache[k];
    const src = img[key];
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    return (tintCache[k] = c);
  }
  return { load, img, face, tinted };
})();

// Frame actual de un luchador según su estado
function spriteFrame(f) {
  const A = SPRITE_DATA[f.charId].anims, t = f.game.frame, sf = f.sf;
  const loop = (name, spd) => { const a = A[name]; return { anim: name, i: Math.floor(t / (a.loop || spd || 6)) % a.f.length }; };
  const prog = (name, p) => { const a = A[name]; return { anim: name, i: clamp(Math.floor(p * a.f.length), 0, a.f.length - 1) }; };
  switch (f.state) {
    case 'idle': case 'respawn': return loop('idle');
    case 'walk': return loop('walk');
    case 'dash': case 'run': return loop('run');
    case 'turn': return prog('land', 0);
    case 'crouch': return prog('crouch', 0);
    case 'jumpsquat': return prog('jumpsquat', sf / Math.max(1, f.stats.jumpsquat));
    case 'land': return prog('land', sf / Math.max(1, f.lag));
    case 'air': {
      if (f.djumpT > 0) return prog('djump', (18 - f.djumpT) / 18);
      if (f.vy < -4) return prog('rise', clamp(1 - (-f.vy - 4) / 12, 0, 0.99));
      if (f.vy < 3) return loop('apex', 8);
      return loop('fall', 6);
    }
    case 'fall': return loop('helpless');
    case 'hitstun': return !f.ground && f.tumble ? loop('tumble') : prog('hurt', clamp(sf / 12, 0, 0.99));
    case 'tumble': return loop('tumble');
    case 'grabbed': case 'locked': return loop('grabbed');
    case 'shield': case 'shieldstun': case 'shielddrop': return prog('guard', 0);
    case 'airdodge': case 'spotdodge': return prog('dodge', sf / 22);
    case 'roll': case 'getroll': case 'ledgeroll': case 'tech': return prog('roll', sf / 26);
    case 'down': return prog('down', 0);
    case 'getup': case 'ledgeup': return prog('getup', sf / 28);
    case 'ledge': return loop('ledge');
    case 'grabbing': return loop('grabhold', 8);
    case 'pummel': return prog('pummel', sf / 18);
    case 'throw': return prog('throw_' + (f.mv.dir || 'f'), sf / 24);
    case 'dizzy': return f.ground ? loop('dizzy') : loop('tumble');
    case 'attack': return moveFrame(f);
  }
  return loop('idle');
}
function moveFrame(f) {
  const A = SPRITE_DATA[f.charId].anims, m = f.move, sf = f.sf, id = m.id, t = f.game.frame;
  const rail = f.charId === 'railly', anth = f.charId === 'anthony';
  // casos especiales
  if (rail && id === 'uspecial') {
    if (sf <= 42) return { anim: 'uspecial', i: 0 };
    if (sf <= 70) return { anim: 'uspecial', i: 1 + (Math.floor((sf - 43) / 4) % 4) };
    return { anim: 'uspecial', i: 5 };
  }
  if (rail && id === 'sspecial') return { anim: 'sspecial', i: sf <= 10 ? 0 : sf <= 22 ? 1 + (sf % 4 < 2 ? 0 : 1) : 3 };
  if (rail && id === 'dspecial') return { anim: 'dspecial', i: Math.floor(t / 4) % 2 };
  if (rail && id === 'final') {
    const mv = f.mv;
    if (mv.caught) return mv.ct >= 76 ? { anim: 'finalend', i: Math.min(2, Math.floor((mv.ct - 76) / 5)) } : { anim: 'finalcombo', i: Math.floor(t / 3) % 4 };
    if (sf <= 16) return { anim: 'final', i: Math.min(7, Math.floor(sf / 2)) };
    return { anim: 'dashattack', i: 1 };
  }
  if (anth && id === 'dsmash') return sf < 6 ? { anim: 'crouch', i: 0 } : { anim: 'pushups', i: ((sf - 8) % 12 + 12) % 12 < 6 ? 1 : 0 };
  if (anth && id === 'uspecial') return sf <= 5 ? { anim: 'crouch', i: 0 } : sf <= 36 ? { anim: 'uspecial', i: Math.floor(t / 3) % 4 } : { anim: 'helpless', i: Math.floor(t / 8) % 2 };
  if (anth && id === 'nspecial') return { anim: 'nspecial', i: sf < 9 ? 0 : f.chargeFlash ? 1 : sf < 16 ? 2 : 3 };
  if (anth && id === 'dspecial') return { anim: 'dspecial', i: Math.floor(t / 6) % 2 };
  if (anth && id === 'final') return sf >= 108 && sf < 125 ? { anim: 'finalflash', i: sf < 116 ? 0 : 1 } : { anim: 'final', i: Math.floor(t / 10) % 2 };
  let name = id;
  if (!A[name]) name = { jab2: 'jab', dashgrab: 'grab', counterHit: 'nspecial' }[id] || 'jab';
  const a = A[name], n = a.f.length;
  if (a.loop && a.hit === undefined) return { anim: name, i: Math.floor(t / a.loop) % n };
  const h = a.hit ?? Math.floor(n / 2);
  let i;
  if (m.charge && f.chargeT > 0 && sf === m.charge) i = Math.max(0, h - 1);
  else if (sf < m.as) i = h ? Math.min(h - 1, Math.floor((sf / m.as) * h)) : 0;
  else if (sf <= m.ae + 1) i = h;
  else i = Math.min(n - 1, h + 1 + Math.floor(((sf - m.ae - 1) / Math.max(1, m.frames - m.ae)) * (n - h - 1)));
  return { anim: name, i };
}

// Dibuja el sprite en el mundo
function drawSpriteWorld(ctx, f, pose, x, y, facing, alpha, silhouette) {
  const D = SPRITE_DATA[f.charId];
  const spr = (pose && pose.spr) || { anim: 'tumble', i: Math.floor(f.game.frame / 4) % 4 };
  const a = D.anims[spr.anim] || D.anims.idle;
  const fr = D.frames[a.f[Math.min(spr.i, a.f.length - 1)]];
  if (!fr) return;
  const key = f.charId + (f.variant || 'base');
  const src = silhouette ? Sprites.tinted(key, silhouette) : Sprites.img[key];
  if (!src || !src.width) return;
  const [sx, sy, w, h, ax, ay] = fr;
  const sc = SPR_H / D.idleH;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= alpha;
  ctx.translate(Math.round(x), Math.round(y));
  const rot = pose && pose.sprRot;
  if (rot) { ctx.translate(0, -62 * SZ); ctx.rotate(rot * DEG * facing); ctx.translate(0, 62 * SZ); }
  ctx.scale(facing * (a.flip ? -1 : 1) * sc, sc);
  ctx.drawImage(src, sx, sy, w, h, -ax, -ay, w, h);
  ctx.restore();
}

// Cabeza para vidas / indicadores
function headCanvas(id, tint, expr, variant) { return Sprites.face[id + (variant || 'base')]; }
// Retrato para el HUD
function portraitCanvas(id, colors, size = 64, bg = true, variant) {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  if (bg) {
    const g = x.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, shade(colors.main, 60)); g.addColorStop(1, shade(colors.main, -40));
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    x.fillStyle = 'rgba(255,255,255,.18)';
    for (let i = -size; i < size; i += 8) { x.beginPath(); x.moveTo(i, size); x.lineTo(i + size, 0); x.lineTo(i + size + 3, 0); x.lineTo(i + 3, size); x.fill(); }
  }
  const fc = Sprites.face[id + (variant || 'base')];
  if (fc && fc.width) {
    const s = Math.floor(size / fc.width * 1.15) || 1;
    x.drawImage(fc, Math.round((size - fc.width * s) / 2), size - fc.height * s + s * 2, fc.width * s, fc.height * s);
  }
  return c;
}
