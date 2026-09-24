// ---------- Efectos visuales ----------
class Effects {
  constructor(game) {
    this.g = game;
    this.parts = [];
    this.texts = [];
    this.ghosts = [];
    this.rings = [];
    this.beams = [];
  }
  clear() { this.stars = []; this.parts.length = 0; this.texts.length = 0; this.ghosts.length = 0; this.rings.length = 0; this.beams.length = 0; }

  p(o) { this.parts.push(Object.assign({ vx: 0, vy: 0, life: 20, max: 20, size: 4, color: '#fff', grav: 0, drag: 0.92, kind: 'dot' }, o)); }

  spark(x, y, power = 1, color = '#fff') {
    const n = Math.floor(6 + power * 6);
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(3, 9) * (0.6 + power * 0.5);
      this.p({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: randi(10, 18), size: rand(2, 4) + power, color: i % 2 ? '#fff' : color, kind: 'line' });
    }
    this.rings.push({ x, y, r: 6, max: 26 + power * 26, life: 12, maxLife: 12, color, w: 4 + power * 2 });
  }
  hitSpark(x, y, kb, color, type) {
    const power = clamp(kb / 70, 0.3, 3.2);
    this.spark(x, y, power, color);
    if (type === 'fire') this.fire(x, y, 6 + power * 4);
    if (type === 'meteor') for (let i = 0; i < 14; i++) this.p({ x, y, vx: rand(-3, 3), vy: rand(4, 14), life: 22, size: 5, color: '#ffd23f', kind: 'line' });
    if (type === 'peace') for (let i = 0; i < 6; i++) this.text(x + rand(-30, 30), y + rand(-30, 30), '✌', '#b8ff3a', 22, { vy: rand(-3, -1), life: 30 });
    if (type === 'flash') this.rings.push({ x, y, r: 10, max: 140, life: 16, maxLife: 16, color: '#fff', w: 10 });
    if (type === 'shine') this.rings.push({ x, y, r: 10, max: 70, life: 10, maxLife: 10, color: '#7cf6ff', w: 6, hex: true });
    if (power > 1.6) {
      this.rings.push({ x, y, r: 20, max: 200 * power * 0.6, life: 20, maxLife: 20, color: '#fff', w: 3 });
      for (let i = 0; i < 4; i++) {
        const a = rand(0, TAU);
        this.beams.push({ x, y, a, len: rand(160, 320) * power * 0.6, life: 10, maxLife: 10, color: '#fff', w: rand(6, 14) });
      }
    }
  }
  dust(x, y, dir = 0, n = 5, color = 'rgba(230,220,255,.7)') {
    for (let i = 0; i < n; i++) this.p({ x: x + rand(-10, 10), y: y - rand(0, 6), vx: dir * rand(1, 4) + rand(-1.5, 1.5), vy: rand(-2.5, -0.5), life: randi(16, 28), size: rand(5, 11), color, kind: 'puff', drag: 0.9 });
  }
  fire(x, y, n = 2) {
    for (let i = 0; i < n; i++) this.p({ x: x + rand(-14, 14), y: y + rand(-14, 14), vx: rand(-1.5, 1.5), vy: rand(-3.5, -1), life: randi(14, 24), size: rand(6, 13), color: pick(['#ffd23f', '#ff8c1a', '#ff4d2e']), kind: 'puff', drag: 0.95 });
  }
  sparkle(x, y, color = '#fff') { this.p({ x: x + rand(-10, 10), y: y + rand(-10, 10), vx: rand(-1, 1), vy: rand(-2, 0), life: 16, size: rand(3, 6), color, kind: 'star' }); }
  swirl(x, y, color) {
    for (let i = 0; i < 3; i++) { const a = rand(0, TAU); this.p({ x: x + Math.cos(a) * 36, y: y + Math.sin(a) * 36, vx: -Math.sin(a) * 4, vy: Math.cos(a) * 4, life: 14, size: 4, color, kind: 'line' }); }
  }
  text(x, y, str, color = '#fff', size = 20, extra = {}) {
    this.texts.push(Object.assign({ x, y, str, color, size, life: 50, max: 50, vy: -1.2 }, extra));
  }
  afterimage(f) { this.ghosts.push({ x: f.x, y: f.y, facing: f.facing, pose: f.pose, f, life: 12, color: f.c.glow }); }
  koBlast(x, y, ang, color) {
    for (let i = 0; i < 7; i++) {
      this.beams.push({ x, y, a: ang + rand(-0.35, 0.35), len: rand(600, 1300), life: 40, maxLife: 40, color: i % 2 ? '#fff' : color, w: rand(20, 70) });
    }
    this.rings.push({ x, y, r: 30, max: 500, life: 30, maxLife: 30, color, w: 18 });
    for (let i = 0; i < 40; i++) {
      const a = ang + rand(-0.7, 0.7), s = rand(6, 24);
      this.p({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: randi(20, 50), size: rand(4, 10), color: pick([color, '#fff', '#ffd23f']), kind: 'line', drag: 0.96 });
    }
  }
  starKO(x, y, f) {
    this.stars = this.stars || [];
    this.stars.push({ x, y, f, t: 0 });
  }
  shockwave(x, y, color = '#fff', max = 90) { this.rings.push({ x, y, r: 8, max, life: 14, maxLife: 14, color, w: 5 }); }

  update() {
    for (const p of this.parts) { p.x += p.vx; p.y += p.vy; p.vx *= p.drag; p.vy = p.vy * p.drag + p.grav; p.life--; }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const t of this.texts) { t.y += t.vy; t.vy *= 0.96; t.life--; }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const r of this.rings) { r.life--; r.r = lerp(r.r, r.max, 0.25); }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const b of this.beams) b.life--;
    this.beams = this.beams.filter((b) => b.life > 0);
    if (this.stars) { for (const st of this.stars) st.t++; this.stars = this.stars.filter((st) => st.t < 90); }
    for (const gh of this.ghosts) gh.life--;
    this.ghosts = this.ghosts.filter((g) => g.life > 0);
  }

  drawBack(ctx) {
    if (this.stars) for (const st of this.stars) {
      const k = st.t / 90;
      if (k < 0.7) {
        const sc = 1 - k / 0.7 * 0.9;
        ctx.save(); ctx.translate(st.x, st.y + k * 40); ctx.scale(sc, sc); ctx.rotate(st.t * 0.4);
        drawSpriteWorld(ctx, st.f, mergePose(BASE_POSE, { armF: [170, 0], armB: [-170, 0], legF: [30, 0], legB: [-30, 0] }), 0, 55, 1, 1, null);
        ctx.restore();
      } else {
        const a = (k - 0.7) / 0.3, s2 = 40 * Math.sin(a * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(st.x, st.y + 28 - s2); ctx.lineTo(st.x + s2 * 0.25, st.y + 28); ctx.lineTo(st.x, st.y + 28 + s2); ctx.lineTo(st.x - s2 * 0.25, st.y + 28); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(st.x - s2, st.y + 28); ctx.lineTo(st.x, st.y + 28 + s2 * 0.25); ctx.lineTo(st.x + s2, st.y + 28); ctx.lineTo(st.x, st.y + 28 - s2 * 0.25); ctx.closePath(); ctx.fill();
      }
    }
    for (const gh of this.ghosts) drawFighterBody(ctx, gh.f, gh.pose, gh.x, gh.y, gh.facing, (gh.life / 12) * 0.45, gh.color);
  }
  draw(ctx) {
    for (const b of this.beams) {
      const k = b.life / b.maxLife;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
      ctx.globalAlpha = k;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.moveTo(0, -b.w * k / 2); ctx.lineTo(b.len, 0); ctx.lineTo(0, b.w * k / 2); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    for (const r of this.rings) {
      ctx.globalAlpha = r.life / r.maxLife;
      ctx.strokeStyle = r.color; ctx.lineWidth = r.w * (r.life / r.maxLife) + 1;
      ctx.beginPath();
      if (r.hex) { for (let i = 0; i <= 6; i++) { const a = i * TAU / 6; const px = r.x + Math.cos(a) * r.r, py = r.y + Math.sin(a) * r.r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } }
      else ctx.arc(r.x, r.y, r.r, 0, TAU);
      ctx.stroke();
    }
    for (const p of this.parts) {
      const k = p.life / p.max;
      ctx.globalAlpha = clamp(k * 1.4, 0, 1);
      ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
      if (p.kind === 'line') {
        ctx.lineWidth = p.size; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); ctx.stroke();
      } else if (p.kind === 'puff') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + (1 - k) * 0.8), 0, TAU); ctx.fill();
      } else if (p.kind === 'star') {
        const s = p.size;
        ctx.beginPath(); ctx.moveTo(p.x, p.y - s * 2); ctx.lineTo(p.x + s * 0.5, p.y - s * 0.5); ctx.lineTo(p.x + s * 2, p.y); ctx.lineTo(p.x + s * 0.5, p.y + s * 0.5);
        ctx.lineTo(p.x, p.y + s * 2); ctx.lineTo(p.x - s * 0.5, p.y + s * 0.5); ctx.lineTo(p.x - s * 2, p.y); ctx.lineTo(p.x - s * 0.5, p.y - s * 0.5); ctx.closePath(); ctx.fill();
      } else { ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      const k = t.life / t.max;
      ctx.globalAlpha = clamp(k * 2, 0, 1);
      const sc = 1 + Math.max(0, (t.life - t.max + 6)) * 0.08;
      ctx.font = `${Math.round(t.size * sc)}px Bangers, Impact, sans-serif`;
      ctx.lineWidth = 5; ctx.strokeStyle = '#0d0b1a'; ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color; ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
