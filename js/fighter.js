// ---------- Luchador: máquina de estados + física estilo Melee ----------
const BUFFER = 6;           // frames de buffer para inputs
const KB_SCALE = 0.13;      // knockback -> px/frame
const KB_DECAY = 0.24;      // desaceleración del knockback por frame
const TUMBLE_KB = 80;       // knockback a partir del cual se entra en tumble
const HURT_W = 44 * SZ, HURT_H = 108 * SZ, CROUCH_H = 70 * SZ;
const LCANCEL_WIN = 7, TECH_WIN = 20;

// Caras recortadas en círculo
const Faces = {};
function loadFaces(done) {
  const ids = Object.keys(CHARACTERS);
  let left = ids.length;
  for (const id of ids) {
    const c = CHARACTERS[id];
    const img = new Image();
    img.onload = () => {
      const S = 160;
      const cv = document.createElement('canvas'); cv.width = cv.height = S;
      const x = cv.getContext('2d');
      x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, TAU); x.clip();
      const f = c.face;
      x.filter = 'contrast(1.1) saturate(1.1)';
      x.drawImage(img, f.cx - f.r, f.cy - f.r, f.r * 2, f.r * 2, 0, 0, S, S);
      Faces[id] = cv; Faces[id + '_img'] = img;
      if (--left === 0) done();
    };
    img.onerror = () => { if (--left === 0) done(); };
    img.src = c.img;
  }
}

class Fighter {
  constructor(game, charId, port, controller, alt = false) {
    this.game = game;
    this.char = CHARACTERS[charId];
    this.charId = charId;
    this.c = alt ? this.char.alt : this.char.colors;
    this.variant = alt ? 'alt' : 'base';
    this.stats = this.char.stats;
    this.port = port;
    this.ctrl = controller;
    this.isCPU = !!controller.isCPU;
    this.stocks = 3;
    this.percent = 0;
    this.meter = 0;
    this.record = { dealt: 0, taken: 0, kos: 0, falls: 0, lcOk: 0, lcTotal: 0, wavedash: 0, techs: 0, parries: 0, maxCombo: 0, sd: 0 };
    this.prevRaw = emptyInput();
    this.inp = emptyInput();
    this.buf = { attack: -999, special: -999, jump: -999, shield: -999, grab: -999, taunt: -999, c: -999 };
    this.cdir = { x: 0, y: 0 };
    this.tapX = { dir: 0, age: 99 }; this.tapY = { dir: 0, age: 99 };
    this.lastShieldPress = -999;
    this.staleQueue = [];
    this.dynHB = [];
    this.hitGroups = {};
    this.pose = mergePose(BASE_POSE);
    this.reset(0, 0, 1);
  }

  reset(x, y, facing) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.kvx = 0; this.kvy = 0;
    this.facing = facing;
    this.state = 'idle'; this.sf = 0;
    this.ground = null;
    this.jumps = this.stats.airJumps;
    this.move = null; this.mv = {};
    this.hitlag = 0; this.hitstun = 0; this.tumble = false; this.pendingKB = null;
    this.shieldHP = 60;
    this.invincible = 0;
    this.ledge = null; this.ledgeCooldown = 0; this.ledgeInvUsed = false; this.ledgeHang = 0;
    this.grabbedBy = null; this.grabbing = null; this.grabTimer = 0;
    this.fastfall = false; this.airdodgeUsed = false; this.floatLeft = this.stats.float; this.jumpHeld = false;
    this.dropT = 0; this.lag = 0; this.chargeT = 0; this.poseRot = 0; this.djumpT = 0;
    this.drawOff = { x: 0, y: 0 }; this.hurtFlash = 0; this.dizzyT = 0; this.deadT = 0;
    this.combo = 0; this.comboT = 0;
    this.beam = 0; this.chargeFlash = false; this.lcFlash = 0;
    this.reflecting = false; this.countering = false; this.superArmor = false;
    this.walkT = 0;
  }

  // ---------- Entrada ----------
  readInput() {
    const g = this.game;
    const r = g.inputLocked ? emptyInput() : this.ctrl.read(this, g);
    const p = this.prevRaw;
    const i = this.inp;
    Object.assign(i, r);
    i.attackP = r.attack && !p.attack;
    i.specialP = r.special && !p.special;
    i.shieldP = r.shield && !p.shield;
    i.grabP = r.grab && !p.grab;
    i.jumpP = r.jump && !p.jump;
    i.tauntP = r.taunt && !p.taunt;
    const f = g.frame;
    if (i.attackP) this.buf.attack = f;
    if (i.specialP) this.buf.special = f;
    if (i.shieldP) { this.buf.shield = f; this.lastShieldPress = f; this.shieldDir = { x: r.x, y: r.y }; }
    if (i.grabP) this.buf.grab = f;
    if (i.jumpP) { this.buf.jump = f; this.jumpHeld = true; }
    if (i.tauntP) this.buf.taunt = f;
    if (!r.jump) this.jumpHeld = false;
    // taps (inputs "smash" del stick)
    if (Math.abs(r.x) >= 0.8 && (Math.abs(p.x) < 0.5 || sgn(p.x) !== sgn(r.x))) this.tapX = { dir: sgn(r.x), age: 0 };
    else this.tapX.age++;
    if (Math.abs(r.y) >= 0.8 && (Math.abs(p.y) < 0.5 || sgn(p.y) !== sgn(r.y))) this.tapY = { dir: sgn(r.y), age: 0 };
    else this.tapY.age++;
    // C-stick
    if ((r.cx || r.cy) && !(p.cx || p.cy)) { this.buf.c = f; this.cdir = { x: r.cx, y: r.cy }; }
    this.prevRaw = r;
  }
  consume(k) {
    if (this.game.frame - this.buf[k] <= BUFFER) { this.buf[k] = -999; return true; }
    return false;
  }
  anyPress() { const i = this.inp; return i.attackP || i.specialP || i.jumpP || i.shieldP || i.grabP || this.tapX.age === 0 || this.tapY.age === 0; }

  setState(s) {
    if (this.state === 'ledge' && s !== 'ledge' && this.ledge) { this.ledge.occupant = null; this.ledge = null; }
    if (this.state === 'grabbing' && !['pummel', 'throw', 'grabbing'].includes(s) && this.grabbing) {
      const t = this.grabbing; this.grabbing = null;
      if (t.grabbedBy === this) { t.grabbedBy = null; if (t.state === 'grabbed') t.setState('air'); }
    }
    this.state = s; this.sf = 0; this.poseRot = 0;
    if (s !== 'attack') { this.move = null; this.chargeFlash = false; this.beam = 0; }
  }

  // ---------- Update principal ----------
  update() {
    const g = this.game;
    this.readInput();
    if (this.state === 'dead') return;
    if (this.invincible > 0) this.invincible--;
    if (this.ledgeCooldown > 0) this.ledgeCooldown--;
    if (this.hurtFlash > 0) this.hurtFlash--;
    if (this.dropT > 0) this.dropT--;
    if (this.djumpT > 0) this.djumpT--;
    if (this.lcFlash > 0) this.lcFlash--;
    if (this.comboT > 0 && --this.comboT === 0) this.combo = 0;
    this.drawOff.x *= 0.7; this.drawOff.y *= 0.7;
    if (!['shield', 'shieldstun'].includes(this.state)) this.shieldHP = Math.min(60, this.shieldHP + 0.08);

    if (this.hitlag > 0) {
      this.hitlag--;
      if (this.hitlag === 0 && this.pendingKB) this.applyLaunch();
      return;
    }
    this.noGrav = false;
    this.dynHB.length = 0;
    this.reflecting = false; this.countering = false; this.superArmor = false;
    this.sf++;
    const fn = this['st_' + this.state];
    if (fn) fn.call(this);
    this.physics();
  }

  // ---------- Acciones ----------
  groundActions() {
    if (this.consume('c')) { this.cstickGround(); return true; }
    if (this.consume('special')) { this.doSpecial(); return true; }
    if (this.consume('attack')) { this.groundAttack(); return true; }
    if (this.consume('grab')) { this.startMove(['dash', 'run'].includes(this.state) ? 'dashgrab' : 'grab'); return true; }
    if (this.consume('jump')) { this.startJumpsquat(); return true; }
    if (this.consume('taunt') && ['idle', 'walk', 'crouch'].includes(this.state)) {
      this.startMove('taunt'); return true;
    }
    if (this.inp.shield) { this.buf.shield = -999; this.setState('shield'); Sound.sfx.shieldUp(); return true; }
    return false;
  }
  airActions() {
    if (this.consume('c')) { this.doAerial(this.cdir.x, this.cdir.y); return true; }
    if (this.consume('special')) { this.doSpecial(); return true; }
    if (this.consume('attack')) { this.doAerial(this.inp.x, this.inp.y); return true; }
    if (this.jumps > 0 && this.consume('jump')) { this.doubleJump(); return true; }
    if (!this.airdodgeUsed && this.consume('shield')) { this.startAirdodge(this.shieldDir); return true; }
    return false;
  }
  smashDir() {
    const lim = 4;
    const tx = this.tapX.age <= lim && Math.abs(this.inp.x) > 0.6 ? this.tapX : null;
    const ty = this.tapY.age <= lim && Math.abs(this.inp.y) > 0.6 ? this.tapY : null;
    if (tx && ty) return tx.age <= ty.age ? { x: tx.dir, y: 0 } : { x: 0, y: ty.dir };
    if (tx) return { x: tx.dir, y: 0 };
    if (ty) return { x: 0, y: ty.dir };
    return null;
  }
  startSmash(d) {
    if (d.y > 0) this.startMove('usmash');
    else if (d.y < 0) this.startMove('dsmash');
    else { this.facing = d.x; this.startMove('fsmash'); }
  }
  cstickGround() { this.startSmash(this.cdir.y ? { x: 0, y: this.cdir.y } : { x: this.cdir.x, y: 0 }); this.cHold = true; }
  groundAttack() {
    const d = this.smashDir();
    if (d && !(this.state === 'run')) { this.startSmash(d); return; }
    const i = this.inp;
    if (this.state === 'dash' || this.state === 'run') { this.startMove('dashattack'); return; }
    if (i.y > 0.5) this.startMove('utilt');
    else if (i.y < -0.5) this.startMove('dtilt');
    else if (Math.abs(i.x) > 0.3) { this.facing = sgn(i.x); this.startMove('ftilt'); }
    else this.startMove('jab');
  }
  doAerial(x, y) {
    let id = 'nair';
    if (Math.abs(y) > 0.5 && Math.abs(y) >= Math.abs(x)) id = y > 0 ? 'uair' : 'dair';
    else if (Math.abs(x) > 0.5) id = x * this.facing > 0 ? 'fair' : 'bair';
    this.startMove(id);
  }
  doSpecial() {
    const i = this.inp;
    if (this.meter >= 100 && Math.abs(i.x) < 0.3 && Math.abs(i.y) < 0.3) {
      this.meter = 0; this.startMove('final'); return;
    }
    if (i.y > 0.5) this.startMove('uspecial');
    else if (i.y < -0.5) this.startMove('dspecial');
    else if (Math.abs(i.x) > 0.3) { this.facing = sgn(i.x); this.startMove('sspecial'); }
    else this.startMove('nspecial');
  }
  startMove(id) {
    const m = this.char.moves[id];
    if (!m) return;
    this.setState('attack');
    this.move = m; this.mv = {}; this.hitGroups = {}; this.chargeT = 0; this.cHold = false;
    this.moveHit = false;
    if (m.aerial) this.game.stat(this, 'aerial');
  }
  endMove() {
    const m = this.move;
    if (this.ground) this.setState('idle');
    else this.setState(m && m.helplessAir ? 'fall' : 'air');
  }
  startJumpsquat() { this.setState('jumpsquat'); this.jsqStart = this.game.frame; this.jsqDodge = false; }
  doJump(full) {
    const s = this.stats;
    this.ground = null;
    this.y -= 1;
    this.vy = -(full ? s.jump : s.shortHop);
    this.vx = clamp(this.vx * 0.85 + this.inp.x * 1.8, -s.jumpMaxVX, s.jumpMaxVX);
    this.fastfall = false;
    this.setState('air');
    Sound.sfx.jump();
    this.game.fx.dust(this.x, this.y, 0, 4);
    if (!full) this.game.callout(this, 'short hop', '#9ff', true);
    if (this.jsqDodge) this.startAirdodge(this.jsqDir);
  }
  doubleJump() {
    this.jumps--;
    this.vy = -this.stats.djump;
    this.vx = this.inp.x * this.stats.airSpeed;
    if (Math.abs(this.inp.x) > 0.3) this.facing = this.facing; // (sin giro, como en Melee)
    this.fastfall = false;
    this.setState('air');
    this.djumpT = 18;
    Sound.sfx.djump();
    this.game.fx.shockwave(this.x, this.y, this.c.glow, 40);
  }
  startAirdodge(dir) {
    this.airdodgeUsed = true;
    this.setState('airdodge');
    let dx = this.inp.x, dy = this.inp.y;
    if (dir && Math.hypot(dx, dy) < 0.3) { dx = dir.x; dy = dir.y; }
    const m = Math.hypot(dx, dy);
    if (m > 0.3) {
      this.mv.dir = true;
      this.vx = (dx / m) * this.stats.airdodge;
      this.vy = -(dy / m) * this.stats.airdodge;
    } else { this.mv.dir = false; this.vx *= 0.3; this.vy = Math.min(this.vy, 0) * 0.3; }
    this.fastfall = false;
    Sound.sfx.airdodge();
    this.game.fx.afterimage(this);
  }
  airDrift(mult = 1) {
    const s = this.stats, x = this.inp.x;
    const target = x * s.airSpeed;
    if (Math.abs(x) > 0.2) {
      if ((target > 0 && this.vx < target) || (target < 0 && this.vx > target)) this.vx = approach(this.vx, target, s.airAccel * mult);
      else if (Math.abs(this.vx) > s.airSpeed) this.vx = approach(this.vx, sgn(this.vx) * s.airSpeed, s.airFriction);
    } else this.vx = approach(this.vx, 0, s.airFriction);
  }
  checkFastfall() {
    if (!this.fastfall && this.vy > -1.5 && this.tapY.age === 0 && this.tapY.dir < 0) {
      this.fastfall = true; this.vy = this.stats.fastFall; Sound.sfx.fastfall();
      this.game.fx.sparkle(this.x, this.y - 130, '#fff');
    }
  }
  checkFloat() {
    if (this.stats.float && this.jumpHeld && !this.fastfall && this.vy >= 0 && this.floatLeft > 0 && !this.ground) {
      this.vy = 0; this.noGrav = true; this.floatLeft--;
      if (this.game.frame % 4 === 0) this.game.fx.sparkle(this.x + rand(-20, 20), this.y + 4, this.c.accent);
      return true;
    }
    return false;
  }

  // ---------- Estados ----------
  st_idle() {
    this.vx = approach(this.vx, 0, this.stats.traction);
    if (this.groundActions()) return;
    const i = this.inp;
    if (i.y < -0.6) {
      if (this.ground && this.ground.soft && this.tapY.age <= 2) { this.dropThrough(); return; }
      this.setState('crouch'); return;
    }
    if (Math.abs(i.x) > 0.3) {
      if (this.tapX.age <= 3 && this.tapX.dir === sgn(i.x)) this.startDash(sgn(i.x));
      else { this.setState('walk'); this.walkT = 0; }
    }
  }
  st_walk() {
    const i = this.inp, s = this.stats;
    if (this.groundActions()) return;
    if (Math.abs(i.x) < 0.3) { this.setState('idle'); return; }
    if (i.y < -0.6) { this.setState('crouch'); return; }
    this.facing = sgn(i.x);
    this.vx = approach(this.vx, s.walk * i.x, 0.6);
    if (Math.abs(i.x) > 0.9) this.walkT++; else this.walkT = 0;
    if ((this.tapX.age <= 2 && this.tapX.dir === sgn(i.x)) || this.walkT > 8) this.startDash(sgn(i.x));
  }
  startDash(dir) {
    this.facing = dir; this.setState('dash');
    this.vx = dir * this.stats.dashInit;
    this.game.fx.dust(this.x - dir * 10, this.y, -dir, 4);
    Sound.sfx.dash();
  }
  st_dash() {
    const i = this.inp, s = this.stats;
    this.vx = approach(this.vx, this.facing * s.dash, 1.2);
    if (this.groundActions()) return;
    if (i.x * this.facing < -0.5) { this.startDash(-this.facing); this.game.stat(this, 'dashdance'); return; }
    if (i.y < -0.6) { this.setState('crouch'); return; }
    if (this.sf >= s.dashFrames) this.setState(i.x * this.facing > 0.5 ? 'run' : 'idle');
  }
  st_run() {
    const i = this.inp, s = this.stats;
    this.vx = approach(this.vx, this.facing * s.run, 0.8);
    if (this.game.frame % 9 === 0) this.game.fx.dust(this.x - this.facing * 14, this.y, -this.facing, 1);
    if (this.groundActions()) return;
    if (i.x * this.facing < -0.5) { this.setState('turn'); return; }
    if (i.y < -0.6) { this.setState('crouch'); return; }
    if (Math.abs(i.x) < 0.3) this.setState('idle');
  }
  st_turn() {
    this.vx = approach(this.vx, 0, this.stats.traction * 1.3);
    if (this.consume('jump')) { this.facing *= -1; this.startJumpsquat(); return; }
    if (this.sf >= 10) {
      this.facing *= -1;
      this.setState(this.inp.x * this.facing > 0.5 ? 'run' : 'idle');
    }
  }
  st_crouch() {
    this.vx = approach(this.vx, 0, this.stats.traction);
    if (this.groundActions()) return;
    if (this.inp.y > -0.5) this.setState('idle');
  }
  dropThrough() {
    this.ground = null; this.dropT = 12; this.y += 2; this.vy = 1;
    this.setState('air');
  }
  st_jumpsquat() {
    if (this.buf.shield > this.jsqStart - 1 && this.consume('shield')) { this.jsqDodge = true; this.jsqDir = { x: this.inp.x, y: this.inp.y }; }
    if (this.jsqDodge && (this.inp.x || this.inp.y)) this.jsqDir = { x: this.inp.x, y: this.inp.y };
    if (this.consume('grab')) { this.startMove('grab'); return; }
    if (this.inp.y > 0.5 && this.consume('attack')) { this.startMove('usmash'); return; }
    if (this.inp.y > 0.5 && this.consume('special')) { this.startMove('uspecial'); return; }
    if (this.sf >= this.stats.jumpsquat) this.doJump(this.inp.jump);
  }
  st_air() {
    this.airDrift();
    this.checkFastfall();
    this.checkFloat();
    this.airActions();
  }
  st_tumble() { this.st_air(); }
  st_fall() { this.airDrift(0.6); this.checkFastfall(); }
  st_airdodge() {
    const dir = this.mv.dir;
    this.noGrav = dir ? this.sf < 24 : this.sf < 10;
    if (dir) { this.vx *= 0.91; this.vy *= 0.91; }
    if (this.sf % 3 === 0 && this.sf < 18) this.game.fx.afterimage(this);
    if (this.sf >= 30) this.setState(dir ? 'fall' : 'air');
  }
  st_land() {
    this.vx = approach(this.vx, 0, this.stats.traction * (this.mv.wd ? 0.85 : 1));
    if (this.mv.wd && Math.abs(this.vx) > 3 && this.game.frame % 2 === 0) this.game.fx.dust(this.x, this.y, -sgn(this.vx), 1);
    if (this.sf >= this.lag) { this.setState('idle'); this.st_idle(); }
  }
  st_attack() {
    const m = this.move, g = this.game;
    if (!m) { this.endMove(); return; }
    // carga de smash
    if (m.charge && this.sf === m.charge && (this.inp.attack || (this.cHold && (this.inp.cx || this.inp.cy))) && this.chargeT < 60) {
      this.chargeT++; this.sf--; this.chargeFlash = true;
      if (this.chargeT === 1) Sound.sfx.charge();
      if (this.ground) this.vx = approach(this.vx, 0, this.stats.traction);
      return;
    }
    this.chargeFlash = false;
    if (this.ground) { if (!m.slideOff || !m.update) this.vx = approach(this.vx, 0, this.stats.traction); }
    else { this.airDrift(m.special ? 0.5 : 1); if (m.aerial) { this.checkFastfall(); this.checkFloat(); } }
    if (this.sf === m.as && !m.special) { if (m.smash) Sound.sfx.heavyWhiff(); else Sound.sfx.whiff(); }
    if (m.update) {
      m.update(this, this.sf, g);
      if (this.state !== 'attack' || this.move !== m) return;
    }
    if (m.next && this.sf >= m.nextWin[0] && this.sf <= m.nextWin[1] && this.consume('attack')) { this.startMove(m.next); return; }
    if (m.iasa && this.sf >= m.iasa) {
      if (this.ground ? this.groundActions() : this.airActions()) return;
    }
    if (this.sf >= m.frames) this.endMove();
  }
  st_shield() {
    this.vx = approach(this.vx, 0, this.stats.traction);
    this.shieldHP -= 0.13;
    if (this.shieldHP <= 0) { this.shieldBreak(); return; }
    const i = this.inp;
    if (this.consume('jump') || (TAP_JUMP[this.port] && this.tapY.age === 0 && this.tapY.dir > 0)) { this.startJumpsquat(); return; }
    if (i.y > 0.5 && this.consume('special')) { this.startMove('uspecial'); return; }
    if (this.consume('attack') || this.consume('grab')) { this.startMove('grab'); return; }
    if (this.tapX.age <= 1 && Math.abs(i.x) > 0.7) { this.startRoll(sgn(i.x)); return; }
    if (this.tapY.age <= 1 && i.y < -0.7) {
      if (this.ground && this.ground.soft) { this.dropThrough(); return; }
      this.setState('spotdodge'); Sound.sfx.airdodge(); return;
    }
    if (!i.shield) this.setState('shielddrop');
  }
  st_shieldstun() {
    this.vx = approach(this.vx, 0, this.stats.traction);
    if (this.sf >= this.lag) this.setState(this.inp.shield ? 'shield' : 'shielddrop');
  }
  st_shielddrop() {
    this.vx = approach(this.vx, 0, this.stats.traction);
    if (this.sf >= 7) this.setState('idle');
  }
  shieldBreak() {
    this.shieldHP = 30;
    this.setState('dizzy');
    this.dizzyT = 200;
    this.ground = null; this.vy = -16; this.y -= 2;
    Sound.sfx.shieldBreak();
    this.game.fx.spark(this.x, this.y - 60, 2.5, this.c.main);
    this.game.fx.text(this.x, this.y - 170 * SZ, '¡ESCUDO ROTO!', '#ff5', 30);
    this.game.shake(10);
  }
  st_dizzy() {
    if (this.ground) {
      this.vx = approach(this.vx, 0, this.stats.traction);
      this.dizzyT -= this.anyPress() ? 6 : 1;
      if (this.dizzyT <= 0) this.setState('idle');
    }
  }
  startRoll(dir) { this.setState('roll'); this.mv.dir = dir; Sound.sfx.roll(); }
  st_roll() {
    const dir = this.mv.dir;
    this.vx = this.sf >= 3 && this.sf <= 18 ? dir * 7 : approach(this.vx, 0, 1);
    if (this.sf >= 26) { if (dir === this.facing) this.facing *= -1; this.setState(this.inp.shield ? 'shield' : 'idle'); }
  }
  st_spotdodge() { this.vx = approach(this.vx, 0, 1); if (this.sf >= 22) this.setState(this.inp.shield ? 'shield' : 'idle'); }
  st_hitstun() {
    if (!this.ground) this.airDrift(0.2);
    else this.vx = approach(this.vx, 0, this.stats.traction);
    if (--this.hitstun <= 0) {
      if (this.ground) this.setState('idle');
      else this.setState(this.tumble ? 'tumble' : 'air');
    }
  }
  st_down() {
    this.vx = approach(this.vx, 0, this.stats.traction);
    this.kvx = approach(this.kvx, 0, 0.8);
    if (this.sf < 14) return;
    const i = this.inp;
    if (this.consume('attack')) { this.startMove('getupattack'); return; }
    if (Math.abs(i.x) > 0.6) { this.setState('getroll'); this.mv.dir = sgn(i.x); Sound.sfx.roll(); return; }
    if (i.y > 0.5 || this.consume('jump') || this.consume('shield') || this.sf > 100) this.setState('getup');
  }
  st_getup() { this.vx = 0; if (this.sf >= 28) this.setState('idle'); }
  st_getroll() {
    this.vx = this.sf >= 4 && this.sf <= 24 ? this.mv.dir * 6 : 0;
    if (this.sf >= 34) { this.facing = -this.mv.dir; this.setState('idle'); }
  }
  st_tech() {
    const d = this.mv.dir || 0;
    this.vx = d && this.sf >= 2 && this.sf <= 20 ? d * 6.5 : approach(this.vx, 0, 1);
    if (this.sf >= 26) this.setState('idle');
  }
  st_ledge() {
    const L = this.ledge;
    if (!L) { this.setState('air'); return; }
    this.noGrav = true;
    this.vx = this.vy = this.kvx = this.kvy = 0;
    this.x = L.x + L.side * 24 * SZ; this.y = L.y + 88 * SZ;
    this.ledgeHang++;
    if (this.ledgeHang > 360) { this.ledgeDrop(); return; }
    if (this.sf < 8) return;
    const i = this.inp;
    if (this.consume('jump') || (this.tapY.age <= 1 && i.y > 0.7)) {
      this.setState('air');
      this.x = L.x + L.side * 6; this.y = L.y - 4; this.vy = -this.stats.jump * 0.95; this.vx = -L.side * 2.5;
      this.ledgeCooldown = 20; Sound.sfx.jump();
      return;
    }
    if (this.consume('attack')) { this.climb(L); this.startMove('ledgeattack'); return; }
    if (this.consume('shield')) { this.climb(L); this.setState('ledgeroll'); this.mv.dir = -L.side; return; }
    if (i.x * -L.side > 0.6 || (i.y > 0.6 && this.tapY.age > 1)) { this.climb(L); this.setState('ledgeup'); return; }
    if (i.y < -0.6 || i.x * L.side > 0.6) { this.ledgeDrop(); }
  }
  ledgeDrop() {
    const L = this.ledge;
    this.setState('air');
    if (L) this.x = L.x + L.side * 30;
    this.vy = 1; this.ledgeCooldown = 30;
  }
  climb(L) {
    const ox = this.x, oy = this.y;
    this.setState('idle');
    this.x = L.x - L.side * 28; this.y = L.y; this.ground = this.game.stage.main;
    this.facing = -L.side;
    this.drawOff = { x: ox - this.x, y: oy - this.y };
  }
  st_ledgeup() { this.vx = 0; if (this.sf >= 30) this.setState('idle'); }
  st_ledgeroll() {
    this.vx = this.sf >= 8 && this.sf <= 30 ? this.mv.dir * 5.5 : 0;
    if (this.sf >= 38) this.setState('idle');
  }
  grabLedge(L) {
    this.setState('ledge');
    this.ledge = L; L.occupant = this; this.ledgeHang = 0;
    this.facing = -L.side;
    this.x = L.x + L.side * 24 * SZ; this.y = L.y + 88 * SZ;
    this.vx = this.vy = this.kvx = this.kvy = 0;
    this.jumps = this.stats.airJumps; this.airdodgeUsed = false; this.fastfall = false; this.floatLeft = this.stats.float;
    if (!this.ledgeInvUsed) { this.invincible = Math.max(this.invincible, 34); this.ledgeInvUsed = true; }
    Sound.sfx.ledge();
  }
  st_grabbing() {
    const t = this.grabbing;
    this.vx = approach(this.vx, 0, this.stats.traction);
    if (!t || t.grabbedBy !== this) { this.grabbing = null; this.setState('idle'); return; }
    this.holdVictim();
    if (t.grabTimer <= 0) { this.game.grabRelease(this, t); return; }
    if (this.sf < 6) return;
    const i = this.inp;
    let dir = null;
    if (this.consume('c')) dir = this.cdir.y ? (this.cdir.y > 0 ? 'u' : 'd') : (this.cdir.x * this.facing > 0 ? 'f' : 'b');
    else if (Math.abs(i.x) > 0.6) dir = i.x * this.facing > 0 ? 'f' : 'b';
    else if (Math.abs(i.y) > 0.6) dir = i.y > 0 ? 'u' : 'd';
    if (dir) { this.setState('throw'); this.mv.dir = dir; this.grabbing = t; return; }
    if (this.consume('attack') || this.consume('grab')) { this.setState('pummel'); this.grabbing = t; }
  }
  holdVictim() {
    const t = this.grabbing;
    t.x = this.x + this.facing * 48 * SZ; t.y = this.y; t.vx = t.vy = t.kvx = t.kvy = 0;
    t.facing = -this.facing; t.ground = this.ground;
  }
  st_pummel() {
    const t = this.grabbing;
    if (!t) { this.setState('idle'); return; }
    this.holdVictim();
    if (this.sf === 6) {
      t.percent += 2; t.hurtFlash = 6; t.hitlag = 5; this.hitlag = 5;
      this.game.fx.spark(t.x, t.y - 60, 0.6, this.c.glow); Sound.sfx.hit(0.5);
      this.game.addDamage(this, t, 2);
    }
    if (this.sf >= 18) { this.setState('grabbing'); this.grabbing = t; this.sf = 6; }
  }
  st_throw() {
    const t = this.grabbing, dir = this.mv.dir;
    if (!t) { this.setState('idle'); return; }
    if (this.sf < 12) {
      if (dir === 'b' && this.sf === 6) this.facing *= -1;
      this.holdVictim();
      if (dir === 'u') t.y = this.y - this.sf * 5;
      if (dir === 'd') { t.x = this.x + this.facing * 30; }
    }
    if (this.sf === 12) {
      const th = this.char.throws[dir];
      this.grabbing = null; t.grabbedBy = null;
      t.setState('air');
      Sound.sfx.throw();
      const hb = H(0, 0, 0, 0, 0, th.d, dir === 'b' ? 180 - th.a : th.a, th.b, th.k, { throw: true, unblockable: true });
      this.game.resolveHit(this, t, hb, this.x, this.facing, null, true);
    }
    if (this.sf >= 30) this.setState('idle');
  }
  st_grabbed() {
    if (!this.grabbedBy) { this.setState('air'); return; }
    this.grabTimer -= 1 + (this.anyPress() ? 5 : 0);
  }
  st_locked() {
    const by = this.lockedBy;
    if (!by || by.state !== 'attack' || !by.move || !by.move.final) { this.lockedBy = null; this.setState('air'); }
  }
  st_respawn() {
    this.noGrav = true; this.vx = this.vy = 0;
    const i = this.inp;
    if (this.sf > 30 && (Math.abs(i.x) > 0.5 || i.y < -0.5 || i.jumpP || i.attackP || i.specialP || this.sf > 300)) {
      this.setState('air');
      this.ground = null;
    }
  }

  // ---------- Física ----------
  canSlideOff() {
    const s = this.state;
    if (['idle', 'walk', 'dash', 'run', 'turn', 'land', 'crouch', 'shielddrop', 'hitstun', 'down', 'dizzy', 'tech'].includes(s)) return s !== 'tech';
    if (s === 'attack' && this.move && this.move.slideOff) return true;
    return false;
  }
  decayKB() {
    const s = Math.hypot(this.kvx, this.kvy);
    if (s > 0) { const ns = Math.max(0, s - KB_DECAY); this.kvx *= ns / s; this.kvy *= ns / s; }
  }
  physics() {
    const st = this.game.stage;
    if (['ledge', 'grabbed', 'locked', 'dead', 'respawn'].includes(this.state)) return;
    if (this.ground) {
      const p = this.ground;
      this.x += this.vx + this.kvx;
      this.decayKB();
      this.y = p.y;
      if (this.kvy < -0.5) { this.ground = null; }
      else if (this.x < p.x1 || this.x > p.x2) {
        if (this.canSlideOff()) {
          this.ground = null;
          if (['idle', 'walk', 'dash', 'run', 'turn', 'land', 'crouch', 'shielddrop'].includes(this.state)) this.setState('air');
          if (this.state === 'down') this.setState('air');
        } else {
          this.x = clamp(this.x, p.x1, p.x2);
          if (this.state === 'hitstun' || this.state === 'shieldstun') this.kvx = 0;
        }
      }
      if (this.ground) return;
    }
    // aire
    if (!this.noGrav) {
      if (this.fastfall) this.vy = this.stats.fastFall;
      else this.vy = Math.min(this.vy + this.stats.gravity, this.stats.maxFall);
    }
    const px = this.x, py = this.y;
    this.x += this.vx + this.kvx;
    this.y += this.vy + this.kvy;
    this.decayKB();
    const movingDown = this.y - py >= 0;
    if (movingDown) {
      for (const p of st.platforms) {
        if (p.soft && this.dropT > 0) continue;
        if (py <= p.y - p.dy + 0.5 && this.y >= p.y && this.x >= p.x1 - 3 && this.x <= p.x2 + 3) {
          this.y = p.y; this.x = clamp(this.x, p.x1, p.x2); this.land(p); return;
        }
      }
    }
    // bloque sólido principal
    const m = st.main, hw = 18, hh = 96;
    if (this.x + hw > m.x1 && this.x - hw < m.x2 && this.y > m.y && this.y - hh < m.bottom) {
      if (px + hw <= m.x1 + 1) { this.x = m.x1 - hw; this.hitWall(-1); }
      else if (px - hw >= m.x2 - 1) { this.x = m.x2 + hw; this.hitWall(1); }
      else if (py - hh >= m.bottom - 2) { this.y = m.bottom + hh; this.vy = Math.max(this.vy, 0); this.kvy = Math.max(this.kvy, 0) * 0.3; }
      else { this.y = m.y; this.land(m); return; }
    }
    // borde
    if (this.canGrabLedge()) {
      for (const L of st.ledges) {
        if (L.occupant && L.occupant !== this) continue;
        const hx = L.x + L.side * 24 * SZ;
        if (Math.abs(this.x - hx) < 38 && this.y - L.y > 26 && this.y - L.y < 150 * SZ) { this.grabLedge(L); break; }
      }
    }
  }
  canGrabLedge() {
    if (this.ledgeCooldown > 0) return false;
    const s = this.state;
    const falling = this.vy + this.kvy >= 0;
    if ((s === 'air' || s === 'tumble' || s === 'fall') && falling && this.inp.y > -0.6) return true;
    if (s === 'attack' && this.move && this.move.ledgeFrom && this.sf >= this.move.ledgeFrom) return true;
    return false;
  }
  hitWall(side) {
    const g = this.game;
    if ((this.state === 'hitstun' || this.state === 'tumble') && Math.abs(this.kvx) > 3) {
      if (g.frame - this.lastShieldPress <= TECH_WIN) {
        this.kvx = this.kvy = 0; this.vx = side * 2; this.vy = -4;
        this.setState('air'); this.invincible = Math.max(this.invincible, 12);
        g.callout(this, 'WALL TECH!', '#7cf6ff'); Sound.sfx.tech(); this.record.techs++;
        return;
      }
      this.kvx *= -0.6; g.fx.dust(this.x, this.y - 50, side, 6); g.shake(4);
    } else { this.kvx = 0; if (sgn(this.vx) === -side) this.vx = 0; }
  }
  land(p) {
    const g = this.game, prev = this.state, m = this.move;
    const impact = this.kvy + this.vy;
    this.ground = p; this.vy = 0; this.kvy = 0;
    this.jumps = this.stats.airJumps; this.airdodgeUsed = false; this.fastfall = false;
    this.floatLeft = this.stats.float; this.ledgeInvUsed = false;
    if (prev === 'attack' && m) {
      if (m.aerial) {
        let lag = m.landLag;
        this.record.lcTotal++;
        if (g.frame - this.lastShieldPress <= LCANCEL_WIN) {
          lag = Math.ceil(lag / 2); this.record.lcOk++; this.lcFlash = 10;
          g.callout(this, 'L-CANCEL', '#fff', true); Sound.sfx.lcancel();
        }
        this.toLand(lag);
      } else if (m.special) {
        if (m.landKeep || m.final || m.id === 'dspecial' || m.id === 'counterHit' || (m.id === 'nspecial' && this.charId === 'anthony')) return;
        this.toLand(m.landLag || 8);
      }
      return;
    }
    switch (prev) {
      case 'airdodge': {
        this.toLand(10);
        if (Math.abs(this.vx) > 2.5) {
          this.mv.wd = true; this.record.wavedash++;
          g.callout(this, Math.abs(this.vx) > 5 ? 'WAVEDASH' : 'WAVELAND', '#7cf6ff', true);
          Sound.sfx.wavedash(); g.fx.dust(this.x, this.y, -sgn(this.vx), 8);
        }
        break;
      }
      case 'fall': this.toLand(14); break;
      case 'hitstun': case 'tumble': {
        if (this.tumble || prev === 'tumble') {
          if (g.frame - this.lastShieldPress <= TECH_WIN) {
            this.setState('tech'); this.mv.dir = Math.abs(this.inp.x) > 0.5 ? sgn(this.inp.x) : 0;
            this.kvx = 0; this.vx = 0; this.record.techs++;
            g.callout(this, this.mv.dir ? 'TECH ROLL!' : 'TECH!', '#7cf6ff'); Sound.sfx.tech();
          } else {
            if (impact > 9 && prev === 'hitstun') { // rebote en el piso
              this.ground = null; this.kvy = -impact * 0.45; this.y -= 2; g.fx.dust(this.x, this.y, 0, 10); g.shake(5);
              return;
            }
            this.setState('down'); this.kvx *= 0.5; g.fx.dust(this.x, this.y, 0, 8); Sound.sfx.land();
          }
        }
        break;
      }
      case 'dizzy': break;
      case 'respawn': break;
      default:
        this.toLand(4);
        Sound.sfx.land();
        g.fx.dust(this.x, this.y, 0, 3);
    }
  }
  toLand(lag) { this.setState('land'); this.lag = lag; }

  // ---------- Golpes ----------
  isIntangible() {
    if (this.invincible > 0) return true;
    const s = this.state, f = this.sf;
    switch (s) {
      case 'airdodge': return f >= 3 && f <= (this.mv.dir ? 22 : 26);
      case 'roll': return f >= 3 && f <= 18;
      case 'spotdodge': return f >= 2 && f <= 16;
      case 'tech': return f <= 20;
      case 'getup': case 'getroll': case 'ledgeup': return true;
      case 'ledgeroll': return f <= 30;
      case 'respawn': case 'dead': return true;
      case 'attack': { const m = this.move; return !!(m && m.intangible && f >= m.intangible[0] && f <= m.intangible[1]); }
    }
    return false;
  }
  hurtbox() {
    if (this.state === 'down') return { x: this.x - 55 * SZ, y: this.y - 36 * SZ, w: 110 * SZ, h: 36 * SZ };
    const crouch = this.state === 'crouch' || (this.state === 'attack' && this.move && this.move.crouchMove) || this.state === 'land' && this.lag > 6;
    const h = crouch ? CROUCH_H : HURT_H;
    return { x: this.x - HURT_W / 2, y: this.y - h, w: HURT_W, h };
  }
  activeHitboxes() {
    const out = [];
    if (this.hitlag > 0 && !this.dynHB.length && this.state !== 'attack') return out;
    if (this.state === 'attack' && this.move && this.move.hitboxes) {
      for (const h of this.move.hitboxes) if (this.sf >= h.s && this.sf <= h.e) out.push(h);
    }
    for (const h of this.dynHB) out.push(h);
    return out;
  }
  staleMul(id) {
    const n = this.staleQueue.filter((x) => x === id).length;
    return Math.max(0.55, 1 - n * 0.06);
  }
  pushStale(id) { this.staleQueue.push(id); if (this.staleQueue.length > 9) this.staleQueue.shift(); }

  applyLaunch() {
    const kb = this.pendingKB; this.pendingKB = null;
    let a = kb.ang * DEG;
    // DI: el stick perpendicular a la trayectoria la desvía hasta 18°
    const sx = this.inp.x, sy = this.inp.y;
    if (kb.speed > 3 && (sx || sy)) {
      const m = Math.hypot(sx, sy) || 1;
      const px = -Math.sin(a), py = Math.cos(a);
      const dot = (sx / m) * px + (sy / m) * py;
      a += dot * 18 * DEG;
      if (Math.abs(dot) > 0.5 && kb.speed > 10) this.game.callout(this, 'DI', '#ccc', true);
    }
    this.kvx = Math.cos(a) * kb.speed;
    this.kvy = -Math.sin(a) * kb.speed;
    this.vx = 0; this.vy = 0;
    if (this.ground) {
      if (this.kvy < -1) { this.ground = null; this.y -= 1; }
      else if (this.kvy > 0.5) {
        if (this.tumble) { this.kvy = -this.kvy * 0.8; this.ground = null; this.y -= 1; this.game.fx.dust(this.x, this.y, 0, 8); }
        else this.kvy = 0;
      }
    }
  }

  // ---------- Dibujo ----------
  getPose() {
    const t = this.game.frame, s = this.state, sf = this.sf;
    const air = !this.ground;
    const cycle = (spd, amp, lean) => {
      const ph = t * spd;
      const k1 = Math.sin(ph), k2 = Math.sin(ph + Math.PI);
      return mergePose(BASE_POSE, {
        lean, legF: [k1 * amp, -Math.max(0, Math.cos(ph)) * amp * 1.4 - 10], legB: [k2 * amp, -Math.max(0, -Math.cos(ph)) * amp * 1.4 - 10],
        armF: [-k1 * amp * 0.9 + 10, 60], armB: [-k2 * amp * 0.9 + 10, 60], yOff: -Math.abs(Math.cos(ph)) * 3,
      });
    };
    let p;
    switch (s) {
      case 'idle': case 'respawn': p = mergePose(BASE_POSE, { lean: 4 + Math.sin(t * 0.07) * 2, crouch: 1 + Math.sin(t * 0.07) * 1.5, armF: [22 + Math.sin(t * 0.07) * 4, 40] }); break;
      case 'walk': p = cycle(0.2, 28, 6); break;
      case 'dash': case 'run': p = cycle(0.34, 55, 20); break;
      case 'turn': p = mergePose(BASE_POSE, { lean: -20, legF: [50, -20], legB: [-30, -10], armF: [-40, 30], armB: [60, 30] }); break;
      case 'crouch': p = mergePose(BASE_POSE, { crouch: 16, lean: 25, legF: [80, -130], legB: [40, -120], armF: [50, 60], armB: [30, 60] }); break;
      case 'jumpsquat': p = mergePose(BASE_POSE, { crouch: 12, lean: 15, legF: [50, -90], legB: [20, -80] }); break;
      case 'land': p = mergePose(BASE_POSE, { crouch: this.lag > 6 ? 14 : 8, lean: 14, legF: [50, -90], legB: [20, -80], armF: [40, 30], armB: [-40, 30] }); break;
      case 'air': case 'fall': {
        const rising = this.vy < 0;
        p = mergePose(BASE_POSE, rising ? { legF: [60, -100], legB: [10, -60], armF: [140, 30], armB: [-30, 40], lean: 0 } : { legF: [20, -30], legB: [-15, -20], armF: [110, 20], armB: [-110, 20], lean: -4 });
        if (this.djumpT > 0) p.rot = (18 - this.djumpT) * 20;
        if (s === 'fall') { p.armF = [170, 10]; p.armB = [-170, 10]; p.lean = -10; }
        break;
      }
      case 'hitstun': case 'tumble': case 'grabbed': case 'locked':
        p = mergePose(BASE_POSE, { lean: -25, armF: [150 + Math.sin(t * 0.5) * 20, 20], armB: [-150, 20], legF: [40, -30], legB: [-20, -20], headTilt: 20 });
        if (s === 'tumble' || (s === 'hitstun' && this.tumble && !this.ground)) p.rot = -t * 18;
        break;
      case 'shield': case 'shieldstun': case 'shielddrop': p = mergePose(BASE_POSE, { crouch: 8, lean: 10, armF: [120, 110], armB: [100, 110], legF: [30, -40], legB: [-25, -20] }); break;
      case 'airdodge': case 'spotdodge': p = mergePose(BASE_POSE, { crouch: 10, legF: [80, -140], legB: [60, -140], armF: [60, 100], armB: [40, 100], lean: 20 }); break;
      case 'roll': case 'getroll': case 'ledgeroll':
        p = mergePose(BASE_POSE, { crouch: 20, legF: [100, -150], legB: [80, -150], armF: [60, 110], armB: [40, 110], lean: 30, rot: (this.mv.dir || 1) * this.facing * sf * 16, yOff: -6 }); break;
      case 'tech': p = mergePose(BASE_POSE, { crouch: 18, legF: [100, -150], legB: [80, -150], armF: [60, 110], lean: 30, rot: this.mv.dir ? this.mv.dir * this.facing * sf * 15 : 0 }); break;
      case 'down': p = mergePose(BASE_POSE, { rot: -90, yOff: 40, armF: [100, 10], armB: [80, 10], legF: [5, 0], legB: [-5, 0] }); break;
      case 'getup': case 'ledgeup': p = lerpPose(mergePose(BASE_POSE, { crouch: 20, lean: 40 }), BASE_POSE, sf / 28); break;
      case 'ledge': p = mergePose(BASE_POSE, { armF: [175, 0], armB: [170, 0], legF: [10, -20], legB: [-10, -10], lean: 12, yOff: 0 }); break;
      case 'grabbing': case 'pummel': {
        p = mergePose(BASE_POSE, { armF: [92, 0], armB: [80, 10], lean: 10, crouch: 4 });
        if (s === 'pummel' && sf >= 4 && sf <= 8) { p.armB = [95, 0]; p.lean = 16; }
        break;
      }
      case 'throw': {
        const d = this.mv.dir;
        const P = { f: { armF: [100, 0], armB: [90, 0], lean: 25 }, b: { armF: [-80, 0], armB: [-90, 0], lean: -20 }, u: { armF: [175, 0], armB: [170, 0], lean: -10 }, d: { armF: [40, 0], armB: [40, 0], lean: 35, crouch: 12 } }[d];
        p = lerpPose(mergePose(BASE_POSE, { armF: [92, 0], armB: [80, 10] }), mergePose(BASE_POSE, P), clamp(sf / 12, 0, 1));
        break;
      }
      case 'dizzy': p = mergePose(BASE_POSE, { lean: Math.sin(t * 0.1) * 18, armF: [30, 60], armB: [-30, 60], headTilt: Math.sin(t * 0.1) * 20 }); break;
      case 'attack': p = this.movePose(); break;
      default: p = mergePose(BASE_POSE);
    }
    if (this.poseRot) p.rot += this.poseRot;
    p.spr = spriteFrame(this);
    p.sprRot = this.poseRot;
    return p;
  }
  movePose() {
    const m = this.move, sf = this.sf;
    if (!m || !m.poses) return mergePose(BASE_POSE);
    const air = !this.ground && !m.special;
    const base = air ? mergePose(BASE_POSE, AIR_POSE) : mergePose(BASE_POSE);
    const wind = mergePose(base, m.poses.wind), hit = mergePose(base, m.poses.hit);
    let p;
    if (sf < m.as) p = lerpPose(base, wind, easeOut(clamp(sf / m.as, 0, 1)));
    else if (sf <= m.ae) p = lerpPose(wind, hit, clamp((sf - m.as + 1) / 2, 0, 1));
    else p = lerpPose(hit, base, clamp((sf - m.ae) / Math.max(1, m.frames - m.ae), 0, 1));
    if (this.chargeT > 0 && sf === m.charge) { p.lean += Math.sin(this.game.frame * 1.3) * 2; }
    if (m.anim) {
      const o = m.anim(this, sf);
      if (o) for (const k in o) p[k] = Array.isArray(o[k]) ? o[k].slice() : o[k];
    }
    return p;
  }

  draw(ctx) {
    if (this.state === 'dead') return;
    const g = this.game;
    this.pose = this.getPose();
    let x = this.x + this.drawOff.x, y = this.y + this.drawOff.y;
    if (this.hitlag > 0 && this.pendingKB) { x += rand(-4, 4); y += rand(-3, 3); }
    // sombra
    if (this.ground) {
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.ellipse(this.x, this.ground.y + 2, 28, 7, 0, 0, TAU); ctx.fill();
    }
    // plataforma de reaparición
    if (this.state === 'respawn') {
      ctx.fillStyle = this.c.main; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.ellipse(this.x, this.y + 6, 50, 10, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    }
    // aura de súper
    if (this.meter >= 100) {
      const r = 70 + Math.sin(g.frame * 0.2) * 6;
      const gr = ctx.createRadialGradient(x, y - 60 * SZ, 10, x, y - 60 * SZ, r);
      gr.addColorStop(0, 'transparent'); gr.addColorStop(0.7, this.c.glow + '55'); gr.addColorStop(1, 'transparent');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y - 60 * SZ, r, 0, TAU); ctx.fill();
    }
    let alpha = 1;
    if (this.isIntangible() && this.state !== 'respawn') alpha = this.invincible > 0 ? (g.frame % 6 < 3 ? 0.55 : 0.9) : 0.55;
    drawFighterBody(ctx, this, this.pose, x, y, this.facing, alpha, null);
    // efectos sobre el cuerpo
    if (this.state === 'attack' && this.move && this.move.id === 'dspecial' && this.reflecting && this.charId === 'railly') drawShine(ctx, x, y - 60 * SZ, g.frame);
    if (this.beam) drawBeam(ctx, this, x, y);
    if (this.lcFlash > 0 || (this.chargeFlash && g.frame % 8 < 4)) {
      ctx.globalAlpha = this.lcFlash > 0 ? this.lcFlash / 10 * 0.8 : 0.5;
      drawFighterBody(ctx, this, this.pose, x, y, this.facing, 1, '#fff');
      ctx.globalAlpha = 1;
    }
    if (this.hurtFlash > 0 && this.hurtFlash % 4 < 2) drawFighterBody(ctx, this, this.pose, x, y, this.facing, 0.6, '#ffffff');
    if (this.state === 'attack' && this.move) {
      if (this.move.drawOver) this.move.drawOver(ctx, this, g);
      if (this.charId === 'anthony' && this.move.id === 'fsmash') {
        const m = this.move, sf = this.sf;
        let ang;
        if (sf < m.as) ang = lerp(-0.4, -2.3, clamp(sf / m.as, 0, 1)) + (this.chargeT > 0 ? Math.sin(g.frame) * 0.05 : 0);
        else if (sf <= m.ae) ang = lerp(-2.3, 1.75, clamp((sf - m.as + 1) / 3, 0, 1));
        else ang = lerp(1.75, 1.2, clamp((sf - m.ae) / 12, 0, 1));
        ctx.save(); ctx.translate(x + this.facing * 16, y - 62 * SZ); ctx.scale(this.facing, 1);
        drawHammer(ctx, 0, 0, ang, 64);
        ctx.restore();
        if (sf === m.as) { g.fx.text(x + this.facing * 90, y - 140, '¡PUM!', '#ffd23f', 26, { life: 30, max: 30 }); }
      }
    }
    if (this.countering) {
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y - 60 * SZ, 66 + Math.sin(g.frame * 0.6) * 4, 0, TAU); ctx.stroke();
    }
    // escudo
    if (['shield', 'shieldstun'].includes(this.state)) {
      const r = (18 + 48 * (this.shieldHP / 60)) * SZ;
      const pw = g.frame - this.lastShieldPress <= 4;
      ctx.fillStyle = pw ? 'rgba(255,255,255,.55)' : this.c.main + '66';
      ctx.strokeStyle = pw ? '#fff' : this.c.main;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y - 60 * SZ, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(x - r * 0.35, y - 60 * SZ - r * 0.35, r * 0.25, 0, TAU); ctx.fill();
    }
    // mareado
    if (this.state === 'dizzy' && this.ground) {
      for (let i = 0; i < 3; i++) {
        const a = g.frame * 0.12 + (i * TAU) / 3;
        ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⭐', x + Math.cos(a) * 40, y - 150 * SZ + Math.sin(a) * 8);
      }
    }
    // indicador de jugador
    const label = this.isCPU ? 'CPU' : 'P' + (this.port + 1);
    const col = this.isCPU ? '#aaa' : ['#ff4d5e', '#3fa9ff'][this.port];
    const ty = y - 168 * SZ - (this.state === 'down' ? -70 : 0);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x - 8, ty); ctx.lineTo(x + 8, ty); ctx.lineTo(x, ty + 10); ctx.closePath(); ctx.fill();
    ctx.font = 'bold italic 16px "Arial Black", Impact, sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = '#0d0b1a'; ctx.strokeText(label, x, ty - 4); ctx.fillText(label, x, ty - 4);
  }
}

// ---------- Render del cuerpo ----------
function limbDir(a) { const r = a * DEG; return [Math.sin(r), Math.cos(r)]; }
function drawFighterBody(ctx, f, pose, x, y, facing, alpha, silhouette) {
  drawSpriteWorld(ctx, f, pose, x, y, facing, alpha, silhouette);
}
function drawFighterBodyVec(ctx, f, pose, x, y, facing, alpha, silhouette) {
  const c = f.c;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y + (pose.yOff || 0));
  if (pose.rot) { ctx.translate(0, -55); ctx.rotate(pose.rot * DEG * facing); ctx.translate(0, 55); }
  ctx.scale(facing, 1);
  const hipY = -(34 - pose.crouch);
  const lean = pose.lean * DEG;
  const hip = [0, hipY];
  const neck = [Math.sin(lean) * 32, hipY - Math.cos(lean) * 32];
  const sh = [lerp(hip[0], neck[0], 0.86), lerp(hip[1], neck[1], 0.86)];
  const ht = (pose.lean + pose.headTilt) * DEG;
  const head = [neck[0] + Math.sin(ht) * 24, neck[1] - Math.cos(ht) * 24];
  const OUT = silhouette || '#0d0b1a';
  const seg = (a, b, w, col) => {
    ctx.lineCap = 'round';
    if (!silhouette) { ctx.strokeStyle = OUT; ctx.lineWidth = w + 5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    ctx.strokeStyle = silhouette || col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  };
  const limb = (o, ang, len1, len2, w, col, endCol, endR, withLean) => {
    const a1 = ang[0] + (withLean ? pose.lean : 0);
    const d1 = limbDir(a1);
    const j = [o[0] + d1[0] * len1, o[1] + d1[1] * len1];
    const d2 = limbDir(a1 + ang[1]);
    const e = [j[0] + d2[0] * len2, j[1] + d2[1] * len2];
    seg(o, j, w, col); seg(j, e, w - 1, col);
    if (endR) {
      ctx.fillStyle = silhouette || endCol;
      if (!silhouette) { ctx.strokeStyle = OUT; ctx.lineWidth = 3; }
      ctx.beginPath(); ctx.arc(e[0], e[1], endR, 0, TAU); ctx.fill(); if (!silhouette) ctx.stroke();
    }
    return { j, e, ang: a1 + ang[1] };
  };
  // brazo y pierna traseros
  limb(sh, pose.armB, 15, 15, 9, c.dark, c.skin, 5, true);
  const legB = limb(hip, pose.legB, 17, 17, 11, shade(c.pants, -15), '#111', 0, false);
  drawShoe(ctx, legB, silhouette || shade(c.accent, -30), silhouette);
  // torso
  seg(hip, neck, 24, c.main);
  if (!silhouette) {
    ctx.strokeStyle = c.accent; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(lerp(hip[0], neck[0], 0.1) + 5, lerp(hip[1], neck[1], 0.1)); ctx.lineTo(lerp(hip[0], neck[0], 0.8) + 5, lerp(hip[1], neck[1], 0.8)); ctx.stroke();
    ctx.fillStyle = c.pants; ctx.beginPath(); ctx.arc(hip[0], hip[1], 11, 0, TAU); ctx.fill();
  }
  const legF = limb(hip, pose.legF, 17, 17, 12, c.pants, '#111', 0, false);
  drawShoe(ctx, legF, silhouette || c.accent, silhouette);
  // cabeza
  const HR = 27;
  ctx.save();
  ctx.translate(head[0], head[1]);
  ctx.rotate(ht * 0.6);
  if (silhouette) {
    ctx.fillStyle = silhouette; ctx.beginPath(); ctx.arc(0, 0, HR, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(0, 0, HR + 4, 0, TAU); ctx.fill();
    const face = Faces[f.charId];
    if (face) ctx.drawImage(face, -HR, -HR, HR * 2, HR * 2);
    else { ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(0, 0, HR, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = c.main; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, HR + 1, 0, TAU); ctx.stroke();
    if (f.state === 'hitstun' || f.state === 'tumble' || f.state === 'locked') {
      ctx.fillStyle = 'rgba(255,40,60,.28)'; ctx.beginPath(); ctx.arc(0, 0, HR, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
  // brazo delantero + utilería
  const arm = limb(sh, pose.armF, 15, 15, 10, c.main, c.skin, 6, true);
  if (pose.prop && !silhouette) drawProp(ctx, pose.prop, arm, f);
  ctx.restore();
}
function drawShoe(ctx, leg, col, silhouette) {
  const d = limbDir(leg.ang + 90);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(leg.e[0] + d[0] * 4, leg.e[1] + d[1] * 4, 9, 5.5, Math.atan2(d[1], d[0]), 0, TAU); ctx.fill();
  if (!silhouette) { ctx.strokeStyle = '#0d0b1a'; ctx.lineWidth = 2.5; ctx.stroke(); }
}
function drawProp(ctx, prop, arm, f) {
  const [hx, hy] = arm.e, d = limbDir(arm.ang);
  if (prop === 'gun') {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(Math.atan2(d[1], d[0]));
    ctx.fillStyle = '#333'; ctx.fillRect(-2, -6, 26, 10); ctx.fillStyle = f.c.glow; ctx.fillRect(20, -4, 6, 6);
    ctx.restore();
  } else if (prop === 'fire') {
    const gr = ctx.createRadialGradient(hx, hy, 2, hx, hy, 26);
    gr.addColorStop(0, '#fff6b0'); gr.addColorStop(0.5, 'rgba(255,140,26,.8)'); gr.addColorStop(1, 'transparent');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(hx, hy, 26, 0, TAU); ctx.fill();
  } else if (prop === 'stick') {
    const ex = hx + d[0] * 62, ey = hy + d[1] * 62;
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(Math.atan2(d[1], d[0]));
    ctx.fillStyle = '#111'; ctx.fillRect(-4, -12, 10, 24); ctx.fillStyle = '#7cf6ff'; ctx.fillRect(-2, -9, 6, 18);
    ctx.restore();
  } else if (prop === 'peace') {
    ctx.save(); ctx.translate(hx, hy); ctx.scale(-1, 1);
    ctx.font = '28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✌️', 0, -6);
    ctx.restore();
  } else if (prop === 'phone') {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(Math.atan2(d[1], d[0]) + Math.PI / 2);
    ctx.fillStyle = '#111'; ctx.fillRect(-8, -16, 16, 28); ctx.fillStyle = '#9ff'; ctx.fillRect(-6, -13, 12, 20);
    if (f.countering || (f.game.frame % 20 < 10 && f.state === 'attack' && f.move.id === 'final')) {
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(0, -16, 10, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}
function drawShine(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.15);
  ctx.strokeStyle = '#bff8ff'; ctx.fillStyle = 'rgba(124,246,255,.25)'; ctx.lineWidth = 4;
  ctx.shadowColor = '#7cf6ff'; ctx.shadowBlur = 20;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) { const a = (i * TAU) / 6; const px = Math.cos(a) * 48, py = Math.sin(a) * 48; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawBeam(ctx, f, x, y) {
  const k = 1 - Math.abs(f.beam - 18.5) / 5;
  const bx = x + f.facing * 18 * SZ, by = y - 92 * SZ;
  const len = 400 * f.facing;
  const gr = ctx.createLinearGradient(bx, 0, bx + len, 0);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, f.c.glow); gr.addColorStop(1, 'transparent');
  ctx.save();
  ctx.shadowColor = f.c.glow; ctx.shadowBlur = 25;
  ctx.fillStyle = gr; ctx.globalAlpha = clamp(k + 0.3, 0, 1);
  ctx.fillRect(Math.min(bx, bx + len), by - 9, Math.abs(len), 18);
  ctx.fillStyle = '#fff'; ctx.fillRect(Math.min(bx, bx + len * 0.8), by - 3, Math.abs(len * 0.8), 6);
  ctx.restore();
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
