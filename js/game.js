// ---------- Juego: loop, cámara, golpes, HUD ----------
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fx = new Effects(this);
    this.running = false;
    this.paused = false;
    this.debug = false;
    this.cam = { x: 800, y: 450, zoom: 1 };
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.last = 0; this.acc = 0;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.canvas.width = this.W * this.dpr; this.canvas.height = this.H * this.dpr;
  }

  start(cfg) {
    this.cfg = cfg;
    this.stage = makeStage(cfg.stage);
    this.frame = 0;
    this.fx.clear();
    this.projs = [];
    this.banners = [];
    this.flashA = 0; this.flashC = '#fff';
    this.shakeA = 0;
    this.slowmo = 0; this.slowTick = 0;
    this.fatalT = 0; this.focus = null;
    this.photo = null;
    this.phase = 'countdown'; this.phaseT = 0;
    this.inputLocked = true;
    this.training = cfg.mode === 'training';
    this.fighters = [];
    for (let i = 0; i < 2; i++) {
      const ctrl = cfg.cpu[i] ? new CPUController(cfg.mode === 'training' ? 0 : cfg.cpuLevel) : new HumanController(i);
      const alt = i === 1 && cfg.chars[0] === cfg.chars[1];
      const f = new Fighter(this, cfg.chars[i], i, ctrl, alt);
      const sp = this.stage.spawns[i];
      f.reset(sp.x, sp.y, i === 0 ? 1 : -1);
      f.ground = this.stage.main;
      f.stocks = this.training ? Infinity : cfg.stocks;
      this.fighters.push(f);
    }
    this.dummyMode = 0;
    this.cam = { x: 800, y: 450, zoom: this.baseZoom() };
    this.running = true;
    this.paused = false;
    Sound.playMusic(this.stage.music || 'battlefield');
  }
  stop() { this.running = false; }
  baseZoom() { return Math.min(this.W / 1300, this.H / 760); }

  loop(ts) {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, (ts - this.last) / 1000 || 0);
    this.last = ts;
    if (!this.running) { this.renderIdle(); return; }
    if (!this.paused) {
      this.acc += dt;
      let steps = 0;
      while (this.acc >= 1 / 60 && steps < 5) {
        this.acc -= 1 / 60; steps++;
        if (this.slowmo > 0) { this.slowmo--; if (++this.slowTick % 4 !== 0) { this.fx.update(); continue; } }
        this.tick();
      }
    }
    this.render();
  }

  // ---------- Simulación ----------
  tick() {
    this.frame++;
    this.phaseT++;
    if (this.phase === 'countdown') {
      if (this.phaseT === 1) { this.banner('3', '#fff', 60, true); Sound.voice('three'); }
      if (this.phaseT === 60) { this.banner('2', '#fff', 60, true); Sound.voice('two'); }
      if (this.phaseT === 120) { this.banner('1', '#fff', 60, true); Sound.voice('one'); }
      if (this.phaseT === 180) { this.banner('GO!', '#ffd23f', 50, true); Sound.voice('go'); this.phase = 'play'; this.inputLocked = false; }
    }
    if (this.phase === 'gameover' && this.phaseT === 160 && this.onEnd) this.onEnd(this.results());

    this.stage.update(this.frame);
    for (const f of this.fighters) {
      if (f.ground && f.ground.move && f.state !== 'ledge') { f.x += f.ground.dx; }
    }
    for (const f of this.fighters) {
      if (f.state === 'dead') { this.updateDead(f); f.readInput(); continue; }
      f.update();
    }
    KeysTapped.clear();
    this.updateProjectiles();
    this.detectHits();
    this.pushApart();
    this.checkKOs();
    if (this.training) this.trainingTick();
    this.fx.update();
    for (const b of this.banners) b.t++;
    this.banners = this.banners.filter((b) => b.t < b.dur);
    this.flashA *= 0.88;
    this.shakeA *= 0.85;
    if (this.fatalT > 0) this.fatalT--;
  }

  updateDead(f) {
    f.deadT++;
    if (f.stocks > 0 && f.deadT >= 80 && this.phase !== 'gameover') {
      const m = this.stage.main;
      f.reset((m.x1 + m.x2) / 2 + (f.port ? 60 : -60), m.y - 330, f.port ? -1 : 1);
      f.percent = 0;
      f.setState('respawn');
      f.invincible = 150;
    }
  }

  spawnProjectile(owner, o) {
    const p = Object.assign({ owner, maxLife: o.life, t: 0, g: 0, rot: 0, r: 10, d: 0, a: 45, b: 0, k: 0 }, o);
    if (p.pierce) p.hitSet = new Set();
    this.projs.push(p);
    return p;
  }
  // zona de golpe invisible (para invocaciones y ataques de área)
  zone(owner, x, y, r, props, life = 2) {
    return this.spawnProjectile(owner, Object.assign({ type: 'zone', x, y, vx: 0, vy: 0, r, life, pierce: true, noClash: true, noReflect: true }, props));
  }
  countProjs(owner, kind) { return this.projs.filter((p) => p.owner === owner && p.kind === kind && p.life > 0).length; }
  updateProjectiles() {
    const m = this.stage.main;
    for (const p of this.projs) {
      if (p.life <= 0) continue;
      p.t++;
      if (p.update) p.update(p, this);
      if (p.grav) p.vy = Math.min(p.vy + p.grav, 14);
      if (p.wave) p.vy = Math.cos(p.t * 0.16) * 2.4;
      const py = p.y;
      p.x += p.vx; p.y += p.vy; p.rot += p.spin || 0;
      if (p.grav || p.roll) {
        for (const pl of this.stage.platforms) {
          if (p.vy >= 0 && py + p.r <= pl.y + 2 && p.y + p.r >= pl.y && p.x > pl.x1 && p.x < pl.x2) {
            if (p.roll) { p.y = pl.y - p.r; p.vy = 0; }
            else if (p.bounce > 0) { p.y = pl.y - p.r; p.vy = -Math.abs(p.vy) * 0.62; p.bounce--; Sound.sfx.land(); }
            else if (!p.entity) { p.life = 0; }
            break;
          }
        }
      }
      if (!p.entity && p.type !== 'zone' && p.x > m.x1 && p.x < m.x2 && p.y > m.y + 4 && p.y < m.bottom) { p.life = 0; this.fx.spark(p.x, p.y, 0.4, '#fff'); }
      if (--p.life <= 0 && p.onEnd && !p.ended) { p.ended = true; p.onEnd(p, this); }
    }
    // choque entre proyectiles
    for (const a of this.projs) for (const b of this.projs) {
      if (a === b || a.owner === b.owner || a.life <= 0 || b.life <= 0 || a.entity || b.entity || a.noClash || b.noClash) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r) {
        a.life = b.life = 0; this.fx.spark((a.x + b.x) / 2, (a.y + b.y) / 2, 1, '#fff'); Sound.sfx.shield();
        for (const q of [a, b]) if (q.onEnd && !q.ended) { q.ended = true; q.onEnd(q, this); }
      }
    }
    for (const p of this.projs) {
      if (p.life <= 0 || p.entity || p.harmless) continue;
      for (const t of this.fighters) {
        if (t === p.owner || t.state === 'dead') continue;
        if (p.hitSet && p.hitSet.has(t)) continue;
        const h = t.hurtbox();
        const hit = p.rect ? rectRect(p.x - p.rect[0] / 2, p.y - p.rect[1] / 2, p.rect[0], p.rect[1], h.x, h.y, h.w, h.h) : circleRect(p.x, p.y, p.r, h.x, h.y, h.w, h.h);
        if (!hit || t.isIntangible()) continue;
        const pw = t.state === 'shield' && this.frame - t.lastShieldPress <= 4;
        if ((t.reflecting || pw) && !p.noReflect && p.vx) {
          p.vx = -p.vx * 1.15; p.owner = t; p.d *= 1.4; p.life = p.maxLife; if (p.hitSet) p.hitSet.clear();
          this.fx.hitSpark(p.x, p.y, 60, '#7cf6ff', 'shine'); Sound.sfx.shine();
          this.callout(t, pw ? 'PARRY!' : '¡REFLEJO!', '#7cf6ff');
          if (pw) t.record.parries++;
          continue;
        }
        const dir = sgn(p.vx) || p.dir || sgn(t.x - p.x) || 1;
        this.resolveHit(p.owner, t, p, p.x - dir * 20, dir, p);
        if (p.onHit) p.onHit(p, t, this);
        if (p.hitSet) { p.hitSet.add(t); continue; }
        p.life = 0;
        if (p.onEnd && !p.ended) { p.ended = true; p.onEnd(p, this); }
        break;
      }
    }
    const b = this.stage.blast;
    this.projs = this.projs.filter((p) => p.life > 0 && p.x > b.l && p.x < b.r && p.y > b.t && p.y < b.b);
  }

  hitboxWorld(att, hb) {
    if (hb.rect) {
      const x0 = att.x + hb.x * SZ * att.facing;
      const x1 = x0 + hb.w * att.facing;
      return { rect: true, x: Math.min(x0, x1), y: att.y - hb.y * SZ - hb.h * SZ / 2, w: hb.w, h: hb.h * SZ };
    }
    return { x: att.x + hb.x * SZ * att.facing, y: att.y - hb.y * SZ, r: hb.r * SZ };
  }
  detectHits() {
    const all = this.fighters.map((f) => (f.state === 'dead' ? [] : f.activeHitboxes()));
    this.fighters.forEach((att, ai) => {
      const hbs = all[ai];
      if (!hbs.length) return;
      for (const tgt of this.fighters) {
        if (tgt === att || tgt.state === 'dead' || tgt.state === 'grabbed' || tgt.state === 'locked') continue;
        const h = tgt.hurtbox();
        for (const hb of hbs) {
          const key = hb.g || 0;
          const set = att.hitGroups[key] || (att.hitGroups[key] = new Set());
          if (set.has(tgt)) continue;
          const w = this.hitboxWorld(att, hb);
          const hit = w.rect ? rectRect(w.x, w.y, w.w, w.h, h.x, h.y, h.w, h.h) : circleRect(w.x, w.y, w.r, h.x, h.y, h.w, h.h);
          if (!hit) continue;
          if (hb.grab) {
            if (att.state !== 'attack' || tgt.isIntangible() || (!tgt.ground && tgt.y < att.y - 50)) continue;
            set.add(tgt);
            this.startGrab(att, tgt);
            return;
          }
          if (tgt.isIntangible() && !hb.onHit) continue;
          if (hb.onHit) { if (tgt.isIntangible()) continue; set.add(tgt); if (hb.onHit(att, tgt, this)) break; }
          if (this.resolveHit(att, tgt, hb, att.x, att.facing, null)) { set.add(tgt); break; }
        }
      }
    });
  }

  resolveHit(att, tgt, hb, srcX, srcFacing, proj, isThrow) {
    if (tgt.state === 'dead') return false;
    if (!isThrow && tgt.isIntangible()) return false;
    const w = proj ? { x: proj.x, y: proj.y } : (hb.r ? this.hitboxWorld(att, hb) : { x: (att.x + tgt.x) / 2, y: tgt.y - 60 * SZ });
    const cx = w.rect ? tgt.x : lerp(w.x, tgt.x, 0.4), cy = w.rect ? w.y + w.h / 2 : lerp(w.y, tgt.y - 60 * SZ, 0.4);

    // Contraataque (Flash de Selfie)
    if (tgt.countering && !isThrow && !hb.unblockable) {
      const dmg = Math.max(8, hb.d * 1.35);
      tgt.facing = sgn(att.x - tgt.x) || tgt.facing;
      tgt.startMove('counterHit'); tgt.mv.dmg = dmg;
      tgt.invincible = 14;
      if (!proj) att.hitlag = 22;
      this.callout(tgt, 'COUNTER!', '#fff');
      return true;
    }
    // Escudo
    if (!isThrow && !hb.unblockable && (tgt.state === 'shield' || tgt.state === 'shieldstun')) {
      const d = hb.d;
      const push = sgn(tgt.x - srcX) || srcFacing;
      if (tgt.state === 'shield' && this.frame - tgt.lastShieldPress <= 4) {
        this.fx.hitSpark(cx, cy, 90, '#fff', 'flash'); Sound.sfx.parry();
        this.callout(tgt, 'PARRY!', '#fff'); tgt.record.parries++;
        if (!proj) { att.hitlag = 20; att.hurtFlash = 10; }
        tgt.hitlag = 3;
        return true;
      }
      tgt.shieldHP -= d * 1.15;
      const hl = clamp(Math.floor(d / 3 + 3), 3, 16);
      tgt.setState('shieldstun'); tgt.lag = Math.max(2, Math.floor(((d + 4.45) / 2.235) * 0.8));
      tgt.vx = push * Math.min(8, d * 0.35 + 1.5);
      tgt.hitlag = hl; if (!proj) att.hitlag = hl;
      if (!proj && att.ground) att.vx = -push * Math.min(4, d * 0.15);
      Sound.sfx.shield();
      this.fx.spark(cx, cy, 0.4, tgt.c.main);
      if (tgt.shieldHP <= 0) tgt.shieldBreak();
      return true;
    }
    // Daño
    const smash = !proj && att.move && att.move.smash;
    const stale = hb.noStale || proj || isThrow || !att.move ? 1 : att.staleMul(att.move.id);
    const charge = smash && att.chargeT ? 1 + (att.chargeT / 60) * 0.4 : 1;
    const d = Math.round(hb.d * stale * charge * 10) / 10;
    tgt.percent = Math.min(999, tgt.percent + d);
    this.addDamage(att, tgt, d);
    if (!proj && att.move && !att.moveHit && !isThrow) { att.moveHit = true; att.pushStale(att.move.id); }
    tgt.lastHitBy = att; tgt.lastHitFrame = this.frame;

    let kb;
    if (hb.fkb) kb = hb.fkb;
    else {
      const p = tgt.percent, wgt = tgt.stats.weight;
      kb = (((p / 10 + (p * d) / 20) * (200 / (wgt + 100)) * 1.4 + 18) * (hb.k / 100)) + hb.b;
    }
    if (hb.noFlinch || (!hb.b && !hb.k && !hb.fkb)) kb = 0;
    const crouching = tgt.state === 'crouch';
    if (crouching && kb > 0) { kb *= 0.67; if (kb < TUMBLE_KB) this.callout(tgt, 'CROUCH CANCEL', '#ccc', true); }

    if (kb <= 0 || (tgt.superArmor && !isThrow)) {
      tgt.hurtFlash = 6; tgt.hitlag = Math.max(tgt.hitlag, 2);
      this.fx.spark(cx, cy, 0.3, att.c.glow); Sound.sfx.hit(0.3, proj && proj.type === 'laser' ? null : hb.fx);
      return true;
    }
    let ang = hb.a;
    if (ang === 361) ang = tgt.ground && kb < 32 ? 0 : 44;
    const world = srcFacing > 0 ? ang : 180 - ang;
    const hl = clamp(Math.floor(d / 3 + 3 + (kb > 150 ? 5 : 0)), 3, 24);

    const wasStunned = tgt.state === 'hitstun' || tgt.state === 'tumble' || tgt.state === 'grabbed' || tgt.state === 'down';
    // soltar agarres
    if (tgt.grabbing) { const v = tgt.grabbing; tgt.grabbing = null; if (v.grabbedBy === tgt) { v.grabbedBy = null; v.setState('air'); } }
    if (tgt.grabbedBy && !isThrow) { const g = tgt.grabbedBy; tgt.grabbedBy = null; g.grabbing = null; g.setState('idle'); }

    tgt.setState('hitstun');
    tgt.hitstun = Math.floor(kb * 0.4);
    tgt.tumble = kb >= TUMBLE_KB;
    tgt.pendingKB = { speed: kb * KB_SCALE, ang: world };
    tgt.hitlag = crouching ? Math.floor(hl * 0.67) : hl;
    if (!proj && !isThrow) att.hitlag = hl;
    tgt.fastfall = false; tgt.vx = 0; tgt.vy = 0; tgt.kvx = 0; tgt.kvy = 0;
    tgt.hurtFlash = 8;
    // combos
    att.combo = wasStunned && att.comboT > 0 ? att.combo + 1 : 1;
    att.comboT = 90;
    if (att.combo >= 2) {
      att.record.maxCombo = Math.max(att.record.maxCombo, att.combo);
      this.fx.text(tgt.x, tgt.y - 175 * SZ, `${att.combo} HITS`, att.c.accent, 22 + Math.min(att.combo, 8) * 2, { life: 40, max: 40 });
    }
    this.fx.hitSpark(cx, cy, kb, att.c.glow, hb.fx);
    Sound.sfx.hit(kb / 80, hb.fx);
    this.shake(clamp(kb / 18, 1, 18));
    if (hb.fx === 'meteor' && tgt.pendingKB && !tgt.ground) this.callout(tgt, '¡METEORO!', '#ffd23f');
    if (kb > 100 && this.predictKO(tgt) && (tgt.stocks === 1 || kb > 200)) this.fatal(tgt);
    return true;
  }
  addDamage(att, tgt, d) {
    att.record.dealt += d; tgt.record.taken += d;
    tgt.hudShake = 12;
    const final = att.move && att.move.final;
    if (!final) {
      const was = att.meter < 100;
      att.meter = Math.min(100, att.meter + d * 0.8);
      if (was && att.meter >= 100) { Sound.sfx.smashReady(); this.callout(att, '¡SÚPER LISTO!', att.c.accent); }
    }
    const wasT = tgt.meter < 100;
    tgt.meter = Math.min(100, tgt.meter + d * 0.3);
    if (wasT && tgt.meter >= 100) { Sound.sfx.smashReady(); this.callout(tgt, '¡SÚPER LISTO!', tgt.c.accent); }
  }
  predictKO(t) {
    const kb = t.pendingKB; if (!kb) return false;
    const b = this.stage.blast, m = this.stage.main;
    let x = t.x, y = t.y, kvx = Math.cos(kb.ang * DEG) * kb.speed, kvy = -Math.sin(kb.ang * DEG) * kb.speed, vy = 0;
    for (let i = 0; i < 200; i++) {
      vy = Math.min(vy + t.stats.gravity, t.stats.maxFall);
      x += kvx; y += kvy + vy;
      const s = Math.hypot(kvx, kvy);
      if (s > 0) { const ns = Math.max(0, s - KB_DECAY); kvx *= ns / s; kvy *= ns / s; }
      if (x < b.l || x > b.r || y < b.t) return true;
      if (x > m.x1 && x < m.x2 && y > m.y && y < m.bottom) return false;
      if (s === 0) return false;
    }
    return false;
  }
  fatal(t) {
    this.slowmo = 45; this.fatalT = 60; this.focus = t;
    Sound.sfx.fatal();
    this.flash('#ff2244', 0.5);
  }
  startGrab(att, tgt) {
    if (tgt.grabbedBy) return;
    if (tgt.grabbing) { const v = tgt.grabbing; tgt.grabbing = null; v.grabbedBy = null; v.setState('air'); }
    tgt.setState('grabbed'); tgt.grabbedBy = att; tgt.grabTimer = 70 + tgt.percent * 0.9;
    tgt.kvx = tgt.kvy = tgt.vx = tgt.vy = 0;
    att.setState('grabbing'); att.grabbing = tgt;
    att.holdVictim();
    Sound.sfx.grab();
    this.fx.spark(tgt.x, tgt.y - 60 * SZ, 0.4, '#fff');
  }
  grabRelease(att, tgt) {
    att.grabbing = null; tgt.grabbedBy = null;
    att.setState('land'); att.lag = 14;
    tgt.setState('air'); tgt.ground = null; tgt.y -= 2; tgt.vy = -7; tgt.vx = sgn(tgt.x - att.x) * 4;
    this.callout(tgt, 'ESCAPE', '#fff', true);
  }
  pushApart() {
    const [a, b] = this.fighters;
    if (!a || !b) return;
    const skip = ['dead', 'grabbed', 'locked', 'ledge', 'respawn'];
    if (skip.includes(a.state) || skip.includes(b.state) || a.grabbing || b.grabbing) return;
    if (!a.ground || !b.ground || a.ground !== b.ground) return;
    const dx = b.x - a.x;
    if (Math.abs(dx) < 34) {
      const push = (34 - Math.abs(dx)) * 0.12 * (sgn(dx) || 1);
      a.x -= push; b.x += push;
    }
  }
  checkKOs() {
    const b = this.stage.blast;
    for (const f of this.fighters) {
      if (f.state === 'dead') continue;
      if (f.x < b.l || f.x > b.r || f.y > b.b || f.y < b.t) this.ko(f);
    }
  }
  ko(f) {
    const b0 = this.stage.blast;
    // posición visible de la explosión
    const v = this.viewRect();
    const x = clamp(f.x, v.x + 40, v.x + v.w - 40), y = clamp(f.y - 50, v.y + 40, v.y + v.h - 40);
    const m = this.stage.main;
    const ang = Math.atan2(m.y - 200 - y, (m.x1 + m.x2) / 2 - x);
    if (f.y < b0.t && chance(0.6)) { // Star KO: sale volando hacia el fondo
      this.fx.starKO(x, v.y + 60, f);
      Sound.sfx.starKO();
    } else {
      this.fx.koBlast(x, y, ang, f.c.main);
      Sound.sfx.ko(f.y > b0.b - 10); this.shake(22); this.flash(f.c.main, 0.35);
    }
    if (f.grabbing) { const t = f.grabbing; f.grabbing = null; t.grabbedBy = null; t.setState('air'); }
    if (f.grabbedBy) { const g = f.grabbedBy; g.grabbing = null; f.grabbedBy = null; g.setState('idle'); }
    f.setState('dead'); f.deadT = 0;
    f.record.falls++;
    if (f.lastHitBy && f.lastHitBy !== f && this.frame - f.lastHitFrame < 600) f.lastHitBy.record.kos++;
    else f.record.sd++;
    f.lastHitBy = null;
    f.stocks--;
    f.meter = Math.min(100, f.meter + 15);
    if (this.training) { f.stocks = Infinity; return; }
    const alive = this.fighters.filter((q) => q.stocks > 0);
    if (alive.length <= 1 && this.phase !== 'gameover') {
      this.phase = 'gameover'; this.phaseT = 0; this.slowmo = 70;
      this.winner = alive[0] || null;
      this.banner('¡GAME!', '#ffd23f', 150, true);
      Sound.voice('game'); Sound.duckMusic(0.3);
    }
  }
  results() {
    return { winner: this.winner, fighters: this.fighters, cfg: this.cfg };
  }
  trainingTick() {
    for (const f of this.fighters) if (f.isCPU) {
      const mode = ['quieto', 'escudo', 'salta', 'CPU nivel 5'][this.dummyMode];
      f.ctrl.level = this.dummyMode === 3 ? 5 : 0;
      f.ctrl.dummy = mode;
    }
  }
  cycleDummy() { this.dummyMode = (this.dummyMode + 1) % 4; }
  resetTraining() {
    this.fighters.forEach((f, i) => { const sp = this.stage.spawns[i]; f.reset(sp.x, sp.y, i ? -1 : 1); f.ground = this.stage.main; f.percent = 0; });
    this.projs = [];
  }

  // ---------- Utilidades de juego ----------
  callout(f, text, color = '#fff', small = false) {
    if (small && !this.training && !['L-CANCEL', 'WAVEDASH', 'WAVELAND'].includes(text)) return;
    this.fx.text(f.x, f.y - 140 * SZ, text, color, small ? 18 : 26, { life: small ? 36 : 50, max: small ? 36 : 50 });
  }
  stat(f, key) { f.record[key] = (f.record[key] || 0) + 1; }
  shake(a) { this.shakeA = Math.max(this.shakeA, a); }
  flash(c, a) { this.flashC = c; this.flashA = Math.max(this.flashA, a); }
  banner(text, color, dur = 90, big = false) { this.banners.push({ text, color, t: 0, dur, big }); }

  // ---------- Cámara ----------
  updateCamera() {
    const pts = this.fighters.filter((f) => f.state !== 'dead').map((f) => ({ x: f.x, y: f.y - 55 * SZ }));
    const m = this.stage.main;
    pts.push({ x: (m.x1 + m.x2) / 2, y: m.y - 120 });
    let minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
    let minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
    const b = this.stage.blast;
    minX = Math.max(minX, b.l + 150); maxX = Math.min(maxX, b.r - 150);
    minY = Math.max(minY, b.t + 150); maxY = Math.min(maxY, b.b - 250);
    const w = Math.max(maxX - minX + 520, 1180), h = Math.max(maxY - minY + 440, 690);
    let zoom = clamp(Math.min(this.W / w, this.H / h), this.W / 2600, this.W / 700);
    let tx = (minX + maxX) / 2, ty = (minY + maxY) / 2 + 20;
    let k = 0.08;
    if (this.fatalT > 0 && this.focus) { zoom = Math.min(this.W, this.H) / 420; tx = this.focus.x; ty = this.focus.y - 60; k = 0.25; }
    this.cam.x = lerp(this.cam.x, tx, k);
    this.cam.y = lerp(this.cam.y, ty, k);
    this.cam.zoom = lerp(this.cam.zoom, zoom, k * 0.7);
  }
  viewRect() {
    const z = this.cam.zoom;
    return { x: this.cam.x - this.W / 2 / z, y: this.cam.y - this.H / 2 / z, w: this.W / z, h: this.H / z };
  }
  toScreen(x, y) { return [(x - this.cam.x) * this.cam.zoom + this.W / 2, (y - this.cam.y) * this.cam.zoom + this.H / 2]; }

  // ---------- Render ----------
  renderIdle() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#07060f'; ctx.fillRect(0, 0, this.W, this.H);
  }
  render() {
    const ctx = this.ctx, W = this.W, H = this.H, dpr = this.dpr;
    this.updateCamera();
    const t = this.frame;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.stage.drawBg(ctx, W, H, this.cam, t);
    if (this.fatalT > 0) { ctx.fillStyle = `rgba(120,0,20,${Math.min(0.75, this.fatalT / 40)})`; ctx.fillRect(0, 0, W, H); }
    const sx = rand(-1, 1) * this.shakeA, sy = rand(-1, 1) * this.shakeA;
    const z = this.cam.zoom;
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (W / 2 - this.cam.x * z + sx), dpr * (H / 2 - this.cam.y * z + sy));
    this.stage.drawStage(ctx, t);
    this.fx.drawBack(ctx);
    const order = [...this.fighters].sort((a, b) => (a.state === 'attack') - (b.state === 'attack'));
    for (const f of order) f.draw(ctx);
    this.drawProjectiles(ctx);
    if (this.debug) this.drawDebug(ctx);
    this.fx.draw(ctx);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawOffscreen(ctx);
    if (this.photo) this.drawPhoto(ctx);
    this.drawHUD(ctx);
    this.drawBanners(ctx);
    if (this.flashA > 0.01) { ctx.globalAlpha = this.flashA; ctx.fillStyle = this.flashC; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }
  drawProjectiles(ctx) {
    for (const p of this.projs) {
      if (p.draw) { p.draw(ctx, p, this); continue; }
      switch (p.type) {
        case 'laser': {
          ctx.save(); ctx.lineCap = 'round';
          ctx.shadowColor = p.owner.c.glow; ctx.shadowBlur = 14;
          ctx.strokeStyle = p.owner.c.main; ctx.lineWidth = 8;
          ctx.beginPath(); ctx.moveTo(p.x - p.vx * 2.4, p.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
          ctx.restore(); break;
        }
        case 'vercel': {
          ctx.save(); ctx.globalAlpha = 0.35;
          for (let i = 1; i <= 3; i++) drawVercel(ctx, p.x - p.vx * i * 0.9, p.y, p.r * 2 * (1 - i * 0.18), p.rot - i * 0.2);
          ctx.restore();
          drawVercel(ctx, p.x, p.y, p.r * 2.2, p.rot, true); break;
        }
        case 'peace': {
          ctx.save(); ctx.translate(p.x, p.y);
          const gr = ctx.createRadialGradient(0, 0, 2, 0, 0, p.r * 1.6);
          gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.5, p.owner.c.accent + '88'); gr.addColorStop(1, 'transparent');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, p.r * 1.6, 0, TAU); ctx.fill();
          ctx.rotate(Math.sin(p.t * 0.2) * 0.4);
          ctx.font = `${Math.round(p.r * 2)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('✌️', 0, 0);
          ctx.restore();
          if (p.t % 3 === 0) this.fx.sparkle(p.x - p.vx * 2, p.y, p.owner.c.accent);
          break;
        }
        case 'img': {
          const name = p.frames ? p.frames[Math.floor(p.t / (p.fspd || 5)) % p.frames.length] : p.img;
          Items.draw(ctx, name, p.x, p.y, p.h || p.r * 2.4, { rot: p.rot, flip: p.flip });
          break;
        }
        case 'meme': Items.meme(ctx, p.img, p.x, p.y, p.h || 60, p.rot); break;
        case 'text': {
          const k = Math.min(1, p.t / 6);
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(0.5 + k * 0.5, 0.5 + k * 0.5);
          ctx.font = `900 ${p.size || 34}px Bangers, Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = '#1a1020'; ctx.strokeText(p.text, 0, 0);
          ctx.fillStyle = p.color || '#ffd23f'; ctx.fillText(p.text, 0, 0);
          ctx.restore(); break;
        }
        case 'note': {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.t * 0.25) * 0.3);
          ctx.font = `bold ${Math.round(p.r * 2.6)}px "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.shadowColor = '#39c5bb'; ctx.shadowBlur = 12;
          ctx.lineWidth = 4; ctx.strokeStyle = '#0c3b38'; ctx.strokeText(p.glyph || '♪', 0, 0);
          ctx.fillStyle = p.color || '#39c5bb'; ctx.fillText(p.glyph || '♪', 0, 0);
          ctx.restore(); break;
        }
      }
    }
  }
  drawDebug(ctx) {
    ctx.lineWidth = 2;
    for (const f of this.fighters) {
      if (f.state === 'dead') continue;
      const h = f.hurtbox();
      ctx.strokeStyle = f.isIntangible() ? '#5af' : '#ff0'; ctx.strokeRect(h.x, h.y, h.w, h.h);
      for (const hb of f.activeHitboxes()) {
        const w = this.hitboxWorld(f, hb);
        ctx.fillStyle = hb.grab ? 'rgba(160,0,255,.4)' : 'rgba(255,0,0,.4)';
        if (w.rect) ctx.fillRect(w.x, w.y, w.w, w.h);
        else { ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, TAU); ctx.fill(); }
      }
      ctx.fillStyle = '#fff'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`${f.state}${f.move ? ':' + f.move.id : ''} ${f.sf}`, f.x, f.y + 18);
    }
    for (const L of this.stage.ledges) { ctx.fillStyle = L.occupant ? '#f55' : '#5f5'; ctx.fillRect(L.x - 4, L.y - 4, 8, 8); }
  }
  drawOffscreen(ctx) {
    for (const f of this.fighters) {
      if (f.state === 'dead') continue;
      const [sx, sy] = this.toScreen(f.x, f.y - 55 * SZ);
      const m = 40;
      if (sx > -10 && sx < this.W + 10 && sy > -10 && sy < this.H + 10) continue;
      const cx = clamp(sx, m, this.W - m), cy = clamp(sy, m, this.H - m);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.strokeStyle = f.c.main; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx, cy, 30, 0, TAU); ctx.fill(); ctx.stroke();
      const hc = headCanvas(f.charId, null, null, f.variant);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(hc, cx - 26, cy - 24, 52, 46);
      const a = Math.atan2(sy - cy, sx - cx);
      ctx.fillStyle = f.c.main;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 42, cy + Math.sin(a) * 42);
      ctx.lineTo(cx + Math.cos(a + 0.5) * 30, cy + Math.sin(a + 0.5) * 30); ctx.lineTo(cx + Math.cos(a - 0.5) * 30, cy + Math.sin(a - 0.5) * 30); ctx.fill();
    }
  }
  drawPhoto(ctx) {
    const W = this.W, H = this.H, t = this.photo.t;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6;
    const m = 50, L = 80;
    for (const [x, y, dx, dy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(x, y + dy * L); ctx.lineTo(x, y); ctx.lineTo(x + dx * L, y); ctx.stroke();
    }
    if (t % 30 < 18) { ctx.fillStyle = '#ff2d2d'; ctx.beginPath(); ctx.arc(m + 40, m + 40, 10, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '22px Bangers, Impact'; ctx.textAlign = 'left'; ctx.fillText('REC', m + 58, m + 48); }
    const n = t < 50 ? 3 : t < 80 ? 2 : t < 110 ? 1 : null;
    if (n) {
      ctx.textAlign = 'center'; ctx.font = `${Math.round(H * 0.3)}px Bangers, Impact`;
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(n, W / 2, H * 0.55);
      ctx.font = '28px Bangers, Impact'; ctx.fillText('¡SONRÍAN! (o escóndanse detrás de Anthony)', W / 2, H * 0.68);
    }
  }
  drawBanners(ctx) {
    const W = this.W, H = this.H;
    for (const b of this.banners) {
      const k = b.t / b.dur;
      const sc = b.big ? 1 + Math.max(0, 1 - b.t / 8) * 1.5 : 1;
      ctx.save();
      ctx.globalAlpha = k > 0.8 ? (1 - k) * 5 : 1;
      if (!b.big) {
        const x = W / 2 + (k < 0.15 ? (1 - k / 0.15) * W : k > 0.85 ? -(k - 0.85) / 0.15 * W : 0);
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, H * 0.35 - 50, W, 90);
        ctx.fillStyle = b.color; ctx.fillRect(0, H * 0.35 - 54, W, 4); ctx.fillRect(0, H * 0.35 + 40, W, 4);
        ctx.font = `${Math.round(Math.min(64, W / 14))}px Bangers, Impact`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 8; ctx.strokeStyle = '#0d0b1a'; ctx.strokeText(b.text, x, H * 0.35); ctx.fillStyle = '#fff'; ctx.fillText(b.text, x, H * 0.35);
      } else {
        ctx.translate(W / 2, H * 0.42); ctx.scale(sc, sc); ctx.rotate(-0.05);
        ctx.font = `${Math.round(Math.min(180, W / 6))}px Bangers, Impact`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 16; ctx.strokeStyle = '#0d0b1a'; ctx.strokeText(b.text, 0, 0);
        ctx.fillStyle = b.color; ctx.fillText(b.text, 0, 0);
      }
      ctx.restore();
    }
  }
  drawHUD(ctx) {
    const W = this.W, H = this.H;
    const n = this.fighters.length;
    const sc = clamp(Math.min(W / 1100, H / 700), 0.7, 1.3);
    this.fighters.forEach((f, i) => {
      if (!f.portrait) f.portrait = portraitCanvas(f.charId, f.c, 64, true, f.variant);
      const cx = W * (i + 1) / (n + 1), cy = H - 70 * sc;
      if (f.hudShake > 0) f.hudShake--;
      const shx = f.hudShake ? rand(-1, 1) * f.hudShake * 0.7 : 0, shy = f.hudShake ? rand(-1, 1) * f.hudShake * 0.7 : 0;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
      ctx.imageSmoothingEnabled = false;
      // emblema difuminado
      ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#9aa0b8';
      ctx.font = 'bold 84px "Arial Black", Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText({ anthony: '✌', railly: '▲', jibaru: '◓', edward: '=^.^=', shiara: '★' }[f.charId] || '?', 50, -4);
      ctx.restore();
      // retrato
      const dead = f.state === 'dead';
      ctx.fillStyle = '#1a1020'; ctx.fillRect(-122, -58, 68, 68);
      ctx.drawImage(f.portrait, -120, -56, 64, 64);
      if (dead) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(-120, -56, 64, 64); }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(-121, -57, 66, 66);
      // cinta con el nombre
      const tag = f.isCPU ? '#8a8a8a' : ['#d8232a', '#2a5cd8'][f.port];
      ctx.fillStyle = '#1a1020';
      ctx.beginPath(); ctx.moveTo(-134, 30); ctx.lineTo(-6, 30); ctx.lineTo(-18, 6); ctx.lineTo(-124, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = tag;
      ctx.beginPath(); ctx.moveTo(-130, 27); ctx.lineTo(-11, 27); ctx.lineTo(-21, 9); ctx.lineTo(-121, 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-121, 9, 100, 3);
      ctx.font = 'italic 900 15px "Arial Black", Impact, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = 4; ctx.strokeStyle = '#1a1020'; ctx.strokeText(f.char.name, -114, 24);
      ctx.fillStyle = '#fff'; ctx.fillText(f.char.name, -114, 24);
      // porcentaje
      const p = Math.floor(f.percent);
      const col = p < 1 ? '#fff' : `hsl(${clamp(55 - p * 0.45, 0, 55)},100%,${clamp(92 - p * 0.28, 32, 92)}%)`;
      ctx.save(); ctx.translate(shx, shy);
      ctx.textAlign = 'right'; ctx.lineJoin = 'round';
      const big = dead ? '' : String(p);
      ctx.font = 'italic 900 50px "Arial Black", Impact, sans-serif';
      ctx.lineWidth = 9; ctx.strokeStyle = '#1a1020'; ctx.strokeText(big, 70, 20);
      ctx.fillStyle = col; ctx.fillText(big, 70, 20);
      ctx.font = 'italic 900 24px "Arial Black", Impact, sans-serif';
      if (!dead) { ctx.lineWidth = 6; ctx.strokeText('%', 98, 20); ctx.fillText('%', 98, 20); }
      ctx.restore();
      // vidas (mini cabezas)
      if (isFinite(f.stocks)) {
        const hc = headCanvas(f.charId, null, null, f.variant);
        for (let s = 0; s < f.stocks; s++) ctx.drawImage(hc, -44 + s * 26, -66, 26, 23);
      } else { ctx.font = 'bold 12px "Arial Black", sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText('∞', -40, -42); }
      // barra súper
      const full = f.meter >= 100;
      ctx.fillStyle = '#1a1020'; ctx.fillRect(-42, 30, 140, 9);
      ctx.fillStyle = full ? (this.frame % 10 < 5 ? '#fff' : f.c.glow) : f.c.glow;
      ctx.fillRect(-40, 32, 136 * f.meter / 100, 5);
      if (full) {
        ctx.font = 'italic 900 11px "Arial Black", sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
        ctx.lineWidth = 3; ctx.strokeStyle = '#1a1020'; ctx.strokeText('¡SÚPER! → ESPECIAL', -40, 52); ctx.fillText('¡SÚPER! → ESPECIAL', -40, 52);
      }
      ctx.restore();
    });
    if (this.training) {
      ctx.font = '16px Rubik, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.85)';
      const mode = ['quieto', 'escudo', 'salta', 'CPU nivel 5'][this.dummyMode];
      ctx.fillText(`ENTRENAMIENTO · [T] reiniciar · [Y] muñeco: ${mode} · [Tab] hitboxes · [U] llenar súper`, W / 2, 28);
      const p1 = this.fighters[0];
      ctx.fillText(`Wavedashes: ${p1.record.wavedash} · L-cancel: ${p1.record.lcOk}/${p1.record.lcTotal} · Techs: ${p1.record.techs} · Parries: ${p1.record.parries} · Combo máx: ${p1.record.maxCombo}`, W / 2, 52);
    }
  }
}
