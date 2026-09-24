// ---------- CPU ----------
class CPUController {
  constructor(level) {
    this.isCPU = true;
    this.level = level; // 0 = muñeco de entrenamiento
    this.queue = [];
    this.cool = 0;
    this.ledgeWait = 0;
  }
  seq(...steps) { for (const [f, i] of steps) this.queue.push({ f, i }); }
  read(me, g) {
    const out = emptyInput();
    if (this.level === 0) { // muñeco de entrenamiento
      if (this.dummy === 'escudo' && me.state !== 'hitstun') out.shield = true;
      if (this.dummy === 'salta' && g.frame % 50 < 2) out.jump = true;
      return out;
    }
    if (this.queue.length) {
      const s = this.queue[0];
      Object.assign(out, typeof s.i === 'function' ? s.i(me, g) : s.i);
      if (--s.f <= 0) this.queue.shift();
      // si nos golpean, abandonar el plan
      if (['hitstun', 'tumble', 'grabbed', 'ledge', 'down', 'dead'].includes(me.state)) this.queue.length = 0;
      return out;
    }
    this.think(me, g, out);
    return out;
  }
  think(me, g, out) {
    const lvl = this.level;
    const op = g.fighters.find((f) => f !== me && f.state !== 'dead');
    const st = g.stage, m = st.main;
    const center = (m.x1 + m.x2) / 2;
    const toCenter = sgn(center - me.x) || 1;
    const s = me.state;
    const fr = g.frame;

    if (s === 'grabbed' || s === 'dizzy') { if (fr % 3 === 0) { out.attack = true; out.x = fr % 6 ? 1 : -1; } return; }
    if (s === 'hitstun' || s === 'tumble') {
      if (chance(lvl / 10)) { out.x = toCenter; out.y = me.kvy < -6 ? 0 : 1; }
      // tech
      if (!me.ground && me.vy + me.kvy > 0 && chance(lvl * 0.06)) {
        for (const p of st.platforms) if (me.x > p.x1 && me.x < p.x2 && p.y - me.y < 60 && p.y - me.y > 0) { out.shield = fr % 2 === 0; out.x = chance(0.5) ? pick([-1, 1]) : 0; }
      }
      if (s === 'tumble') this.recover(me, g, out, toCenter);
      return;
    }
    if (s === 'down') { if (me.sf > 14 + randi(0, 30 - lvl * 2)) this.seq([1, pick([{ y: 1 }, { x: -1 }, { x: 1 }, { attack: true }])], [2, {}]); return; }
    if (s === 'ledge') {
      if (!this.ledgeWait) this.ledgeWait = randi(8, 50 - lvl * 3);
      if (me.sf >= this.ledgeWait) {
        this.ledgeWait = 0;
        const L = me.ledge; const inx = L ? -L.side : 1;
        this.seq([1, pick([{ x: inx }, { jump: true }, { shield: true }, { attack: true }, { jump: true }])], [4, {}]);
      }
      return;
    }
    if (!op) return;
    const offstage = !me.ground && (me.x < m.x1 - 5 || me.x > m.x2 + 5 || me.y > m.y + 5);
    if (offstage || s === 'fall' || (me.state === 'air' && me.y > m.y - 20 && (me.x < m.x1 + 20 || me.x > m.x2 - 20))) {
      this.recover(me, g, out, toCenter);
      return;
    }
    if (s === 'respawn') { if (me.sf > 40) out.x = toCenter; return; }

    // L-cancel automático
    if (s === 'attack' && me.move && me.move.aerial && me.vy > 0 && chance(lvl * 0.08)) {
      for (const p of st.platforms) if (me.x > p.x1 && me.x < p.x2 && p.y - me.y < 28 && p.y - me.y > 0) out.shield = true;
    }
    if (!['idle', 'walk', 'dash', 'run', 'crouch', 'air', 'shield', 'land'].includes(s)) return;
    if (s === 'shield') { if (chance(0.3)) this.seq([1, { shield: true, attack: true }], [2, {}]); return; }
    if (this.cool > 0) { this.cool--; out.x = me.ground && Math.abs(op.x - me.x) > 160 ? sgn(op.x - me.x) : 0; return; }

    const dx = op.x - me.x, adx = Math.abs(dx), dy = me.y - op.y;
    const face = sgn(dx) || me.facing;
    const opOff = !op.ground && (op.x < m.x1 - 10 || op.x > m.x2 + 10);
    const rail = me.charId === 'railly';
    this.cool = randi(0, Math.max(0, (9 - lvl) * 4));

    // Súper
    if (me.meter >= 100 && adx < 350 && me.ground) { this.seq([1, { special: true }], [3, {}]); return; }

    // escudo reactivo
    if (me.ground && op.state === 'attack' && op.move && !op.move.special && adx < 140 && op.sf < op.move.as && chance(lvl * 0.07)) {
      const n = randi(10, 20);
      this.seq([n, { shield: true }]);
      if (chance(0.5)) this.seq([1, { shield: true, attack: true }], [2, {}]);
      return;
    }
    // edgeguard
    if (opOff && lvl >= 4 && me.ground) {
      const L = op.x < center ? st.ledges[0] : st.ledges[1];
      const tx = L.x - L.side * 50;
      if (Math.abs(me.x - tx) > 30) { this.seq([6, { x: sgn(tx - me.x) }]); return; }
      if (Math.abs(op.x - me.x) < 170 && op.y > me.y - 40) { this.seq([1, { x: face, attack: true }], [randi(0, 10), { attack: true }], [10, {}]); return; }
      if (chance(0.3)) this.seq([1, { special: true, x: 0 }], [16, {}]);
      return;
    }
    if (!me.ground) { // en el aire sobre el escenario
      if (adx < 90 && Math.abs(dy) < 90 && chance(0.5)) {
        const a = dy > 40 ? { y: 1 } : dy < -40 ? { y: -1 } : { x: dx * me.facing > 0 ? me.facing : -me.facing };
        this.seq([1, Object.assign({ attack: true }, a)], [3, {}]);
      } else out.x = face;
      return;
    }
    // cerca
    if (adx < 95 && Math.abs(dy) < 70) {
      const opts = [];
      const w = (n, steps) => { for (let i = 0; i < n; i++) opts.push(steps); };
      const turn = me.facing !== face ? [[1, { x: face * 0.5 }]] : [];
      w(2, [...turn, [1, { attack: true }], [4, {}], [1, { attack: true }], [6, {}]]);
      w(2, [[1, { x: face * 0.5 }], [1, { x: face * 0.5, attack: true }], [12, {}]]);
      w(2, [[1, { y: -0.6 }], [1, { y: -0.6, attack: true }], [10, {}]]);
      w(op.state === 'shield' ? 6 : 2, [...turn, [1, { grab: true }], [14, {}]]);
      w(op.percent > 90 ? 4 : 1, [[1, { x: face, attack: true }], [randi(0, 25), { attack: true }], [16, {}]]);
      w(1, [[1, { y: 1, attack: true }], [randi(0, 15), { attack: true }], [16, {}]]);
      w(1, [[1, { y: -1, attack: true }], [12, {}]]);
      if (rail) w(2, [[1, { y: -1, special: true }], [5, {}], [1, { jump: true }], [2, {}], [1, { shield: true, x: face, y: -1 }], [8, {}]]);
      else w(1, [[1, { x: face, special: true }], [24, {}]]);
      if (lvl >= 6 && rail) w(1, [[1, { jump: true }], [3, {}], [1, { attack: true }], [16, {}]]);
      this.seq(...pick(opts));
      return;
    }
    // rival arriba
    if (dy > 70 && adx < 90) {
      this.seq(...pick([
        [[1, { y: 1, attack: true }], [randi(0, 10), { attack: true }], [16, {}]],
        [[1, { y: 0.6 }], [1, { y: 0.6, attack: true }], [12, {}]],
        [[1, { jump: true }], [6, { jump: true }], [1, { y: 1, attack: true }], [22, {}]],
      ]));
      return;
    }
    // media distancia
    if (adx < 260) {
      const opts = [
        [[6, { x: face }]],
        [[1, { jump: true, x: face }], [3, { x: face }], [1, { attack: true, x: face }], [20, { x: face * 0.3 }]],
        [[1, { jump: true, x: face }], [8, { x: face }], [1, { attack: true, y: -1 }], [3, {}], [10, { y: -1 }]],
        [[5, { x: -face }], [5, { x: face }], [5, { x: -face }]],
      ];
      if (lvl >= 5) opts.push([[1, { jump: true }], [me.stats.jumpsquat - 1, {}], [1, { shield: true, x: face, y: -1 }], [10, {}]]);
      if (!rail && chance(0.3)) opts.push([[1, { x: face, special: true }], [30, {}]]);
      this.seq(...pick(opts));
      return;
    }
    // lejos
    if (chance(rail ? 0.35 : 0.25)) {
      if (me.facing !== face) this.seq([1, { x: face * 0.5 }]);
      if (rail) this.seq([1, { jump: true }], [2, {}], [1, { special: true }], [16, {}]);
      else this.seq([1, { special: true }], [randi(0, 40), { special: true }], [20, {}]);
      return;
    }
    this.seq([randi(8, 20), { x: face }]);
  }
  recover(me, g, out, toCenter) {
    const st = g.stage;
    const L = me.x < (st.main.x1 + st.main.x2) / 2 ? st.ledges[0] : st.ledges[1];
    const below = me.y - L.y, dxL = Math.abs(me.x - L.x);
    // si está debajo del escenario, primero salir hacia afuera para no chocar con el techo
    const tgtX = below > 40 ? L.x + L.side * 40 : (st.main.x1 + st.main.x2) / 2;
    out.x = sgn(tgtX - me.x) || toCenter;
    if (['air', 'tumble'].includes(me.state)) {
      if (me.jumps > 0 && me.vy > -1 && (below > -30 || dxL > 220)) { this.seq([1, { jump: true, x: out.x }], [8, { x: out.x, jump: true }]); return; }
      if (me.jumps === 0 && me.vy > 0 && (below > -60 || dxL > 140)) {
        const aim = (me2) => {
          const tx = L.x + L.side * 34, ty = L.y - 20;
          const vx = tx - me2.x, vy = me2.y - ty, mm = Math.hypot(vx, vy) || 1;
          return { x: vx / mm, y: vy / mm };
        };
        this.seq([1, { special: true, y: 1 }], [60, aim]);
        return;
      }
      // Anthony: flotar cuando está alto
      if (me.charId === 'anthony' && me.vy > 0 && below < -40 && dxL < 200) out.jump = true;
    }
  }
}
