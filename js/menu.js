// ---------- Menús (DOM) y arranque ----------
const game = new Game(document.getElementById('game'));
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const CHAR_IDS = Object.keys(CHARACTERS);
const portraitURL = (id, variant) => `assets/sprites/${id}_${variant || 'base'}_face.png`;
$('#title-faces').innerHTML = CHAR_IDS.map((id, i) => {
  const c = CHARACTERS[id].colors;
  return `<img src="${portraitURL(id)}" alt="${CHARACTERS[id].name}" style="border-color:${c.main};box-shadow:0 0 22px ${c.main};background:linear-gradient(${shade(c.main, 60)},${shade(c.main, -40)});animation-delay:${-i * 0.35}s">`;
}).join('');
Sprites.load(() => {});
Items.load(() => {});

const UI = {
  cfg: { mode: 'cpu', chars: ['railly', 'anthony'], stage: 'station', stocks: 3, cpuLevel: 5, cpu: [false, true] },
  current: 'title',
  focusIdx: 0,

  show(id) {
    $$('.screen').forEach((s) => s.classList.remove('active'));
    if (id) $('#screen-' + id).classList.add('active');
    this.current = id;
    this.focusIdx = 0;
    if (['title', 'select', 'controls'].includes(id)) Sound.playMusic('menu');
    this.updateFocus();
  },
  buttons() { return this.current ? $$(`#screen-${this.current} .btn`) : []; },
  updateFocus() {
    const bs = this.buttons();
    bs.forEach((b, i) => b.classList.toggle('focus', i === this.focusIdx));
  },

  // ----- Selección de personaje estilo Smash -----
  sel: [{ cur: 0, chosen: false }, { cur: 1, chosen: true }],
  variantOf(p) { return p === 1 && this.cfg.chars[0] === this.cfg.chars[1] && this.sel[0].chosen ? 'alt' : 'base'; },
  buildGrid() {
    const g = $('#css-grid');
    g.innerHTML = CHAR_IDS.map((id, i) => {
      const c = CHARACTERS[id].colors;
      return `<div class="css-char" data-i="${i}" style="background:linear-gradient(180deg, ${shade(c.main, 20)}, ${shade(c.main, -70)})"><img src="${portraitURL(id)}" alt=""><div class="nm">${CHARACTERS[id].name}</div></div>`;
    }).join('') + '<div class="css-token" id="tok-0"></div><div class="css-token" id="tok-1"></div><div class="css-cursor" id="cur-0">👆<b>P1</b></div><div class="css-cursor" id="cur-1">👆<b>P2</b></div>';
    const pickAt = (e, p) => { const box = e.target.closest('.css-char'); if (!box) return; this.sel[p].cur = +box.dataset.i; this.choose(p); };
    g.onclick = (e) => pickAt(e, 0);
    g.oncontextmenu = (e) => { e.preventDefault(); pickAt(e, 1); };
    g.onmousemove = (e) => { const box = e.target.closest('.css-char'); if (box && !this.sel[0].chosen && +box.dataset.i !== this.sel[0].cur) { this.sel[0].cur = +box.dataset.i; this.render(); } };
    $('#css-ready').onclick = () => this.fight();
    this.gridBuilt = true;
  },
  moveCursor(p, d) {
    const n = CHAR_IDS.length;
    this.sel[p].cur = (this.sel[p].cur + d + n) % n;
    Sound.sfx.move(); this.render();
  },
  choose(p) {
    this.cfg.chars[p] = CHAR_IDS[this.sel[p].cur];
    this.sel[p].chosen = true;
    Sound.sfx.medallion(); Sound.voice('name_' + this.cfg.chars[p]);
    this.render();
  },
  unchoose(p) {
    if (!this.sel[p].chosen) { if (p === 0) this.show('title'); return; }
    this.sel[p].chosen = false; Sound.sfx.back(); this.render();
  },
  ready() { return this.sel[0].chosen && this.sel[1].chosen; },
  toggleCPU(p) {
    if (p !== 1 || this.cfg.mode === 'training') return;
    this.cfg.cpu[1] = !this.cfg.cpu[1];
    this.cfg.mode = this.cfg.cpu[1] ? 'cpu' : '2p';
    Sound.sfx.select(); this.render();
  },
  render() {
    if (!this.gridBuilt) this.buildGrid();
    const boxes = $$('.css-char');
    boxes.forEach((b, i) => { b.classList.toggle('hover-0', this.sel[0].cur === i); b.classList.toggle('hover-1', this.sel[1].cur === i); });
    for (let p = 0; p < 2; p++) {
      const s = this.sel[p], cpu = this.cfg.cpu[p];
      const tok = $('#tok-' + p), cur = $('#cur-' + p);
      const box = boxes[s.cur];
      tok.className = 'css-token ' + (cpu ? 'cpu' : 't' + p);
      tok.textContent = cpu ? 'CPU' : 'P' + (p + 1);
      const chosenBox = boxes[CHAR_IDS.indexOf(this.cfg.chars[p])];
      if (s.chosen) { tok.style.left = (chosenBox.offsetLeft + 4 + p * 30) + 'px'; tok.style.top = (chosenBox.offsetTop + 4) + 'px'; }
      else { tok.style.left = (box.offsetLeft + box.offsetWidth / 2 - 10 + p * 18) + 'px'; tok.style.top = (box.offsetTop + box.offsetHeight - 58) + 'px'; }
      cur.style.left = (box.offsetLeft + box.offsetWidth / 2 - 6 + p * 22) + 'px';
      cur.style.top = (box.offsetTop + box.offsetHeight - 34) + 'px';
      cur.querySelector('b').textContent = cpu ? 'P2' : 'P' + (p + 1);
      cur.style.filter = `drop-shadow(2px 2px 0 #0d0b1a) hue-rotate(${p ? 180 : 0}deg)`;
      this.renderPanel(p);
    }
    $('#css-ready').hidden = !this.ready();
    $('#css-mode').textContent = this.cfg.mode === 'training' ? 'ENTRENAMIENTO' : this.cfg.cpu[1] ? '1P vs CPU' : '2 JUGADORES';
    $('#opt-cpu').style.display = this.cfg.cpu[1] && this.cfg.mode !== 'training' ? '' : 'none';
    $('[data-opt="stocks"]').parentElement.style.display = this.cfg.mode === 'training' ? 'none' : '';
    $('[data-opt="stocks"] span').textContent = this.cfg.stocks;
    $('[data-opt="cpuLevel"] span').textContent = this.cfg.cpuLevel;
    $$('.stage-btn').forEach((b) => b.classList.toggle('selected', b.dataset.stage === this.cfg.stage));
  },
  renderPanel(p) {
    const el = $('#panel-' + p), s = this.sel[p], cpu = this.cfg.cpu[p];
    const id = s.chosen ? this.cfg.chars[p] : CHAR_IDS[s.cur];
    const key = `${id}|${s.chosen}|${cpu}|${this.variantOf(p)}|${this.cfg.mode}`;
    el.className = 'css-panel ' + (cpu ? 'cpu' : 'p' + p);
    if (el.dataset.key === key) return;
    el.dataset.key = key;
    const c = CHARACTERS[id], col = this.variantOf(p) === 'alt' ? c.alt : c.colors;
    const tag = cpu ? 'CPU' : 'P' + (p + 1);
    const tip = p === 1 && this.cfg.mode !== 'training' ? ' title="Clic: cambiar CPU / Jugador"' : '';
    el.innerHTML = `<div class="pn-tag"${tip}>${tag}${p === 1 && this.cfg.mode !== 'training' ? ' ⇄' : ''}</div>
      <canvas width="85" height="95" style="opacity:${s.chosen ? 1 : 0.45}"></canvas>
      <div class="pn-info">
        <div class="pn-name" style="color:${shade(col.main, 50)}">${s.chosen ? c.name : '¿' + c.name + '?'}</div>
        <div class="pn-title">${c.title}</div>
        <div class="pn-moves">${c.moveList.map(([k, v]) => `<div><b>${k}</b> ${v}</div>`).join('')}</div>
      </div>`;
    el.querySelector('.pn-tag').onclick = () => this.toggleCPU(p);
    el.canvas = el.querySelector('canvas'); el.charId = id; el.variant = this.variantOf(p);
  },
  drawPanels(t) {
    for (let p = 0; p < 2; p++) {
      const el = $('#panel-' + p); const cv = el.canvas; if (!cv) continue;
      const D = SPRITE_DATA[el.charId]; const img = Sprites.img[el.charId + el.variant];
      const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height);
      if (!D || !img || !img.width) continue;
      const A = D.anims.idle, fr = D.frames[A.f[Math.floor(t / (A.loop || 7)) % A.f.length]];
      const [sx, sy, w, h, ax] = fr;
      const sc = Math.min(1.35, 88 / D.idleH);
      x.imageSmoothingEnabled = false;
      x.save(); x.translate(42, 92); x.scale(p === 1 ? -sc : sc, sc);
      x.drawImage(img, sx, sy, w, h, -ax, -h, w, h); x.restore();
    }
  },
  selectMode(mode) {
    this.cfg.mode = mode;
    this.cfg.cpu = mode === '2p' ? [false, false] : [false, true];
    this.sel = [{ cur: CHAR_IDS.indexOf(this.cfg.chars[0]), chosen: false }, { cur: CHAR_IDS.indexOf(this.cfg.chars[1]), chosen: this.cfg.cpu[1] }];
    this.show('select');
    this.render();
    Sound.voice('choose');
  },
  fight() {
    if (!this.ready()) { Sound.sfx.back(); return; }
    Sound.sfx.select();
    this.show(null);
    game.onEnd = (r) => this.showResults(r);
    game.start({ ...this.cfg, chars: this.cfg.chars.slice(), cpu: this.cfg.cpu.slice() });
  },
  pause(on) {
    if (!game.running || game.phase === 'gameover') return;
    game.paused = on;
    Sound.sfx.pause();
    if (on) this.show('pause'); else this.show(null);
  },
  quitToMenu() { game.stop(); game.paused = false; this.show('title'); },
  showResults(r) {
    const w = r.winner;
    game.paused = true;
    $('#winner-img').src = w ? portraitURL(w.charId, w.variant) : '';
    $('#winner-img').style.background = w ? `linear-gradient(${shade(w.c.main, 60)},${shade(w.c.main, -40)})` : '';
    $('#winner-img').style.borderColor = w ? w.c.main : '#888';
    $('#winner-name').textContent = w ? w.char.name : 'EMPATE';
    $('#winner-name').style.color = w ? w.c.main : '#fff';
    const fs = r.fighters;
    const row = (label, fn) => `<tr><td>${label}</td>${fs.map((f) => `<td>${fn(f)}</td>`).join('')}</tr>`;
    const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');
    $('#stats-table').innerHTML =
      `<tr><th></th>${fs.map((f) => `<th style="color:${f.c.main}">${f.char.name}${f.isCPU ? ' (CPU)' : ''}</th>`).join('')}</tr>` +
      row('KOs', (f) => f.record.kos) +
      row('Caídas', (f) => f.record.falls) +
      row('Autodestrucciones', (f) => f.record.sd) +
      row('Daño hecho', (f) => Math.round(f.record.dealt) + '%') +
      row('Daño recibido', (f) => Math.round(f.record.taken) + '%') +
      row('Combo máximo', (f) => f.record.maxCombo + ' hits') +
      row('L-Cancel', (f) => `${f.record.lcOk}/${f.record.lcTotal} (${pct(f.record.lcOk, f.record.lcTotal)})`) +
      row('Wavedashes', (f) => f.record.wavedash) +
      row('Techs', (f) => f.record.techs) +
      row('Parries', (f) => f.record.parries);
    this.show('results');
    Sound.playMusic(w ? 'victory_' + w.charId : null);
    Sound.voice('winnerIs');
    if (w) setTimeout(() => Sound.voice('name_' + w.charId), 1450);
  },
};

// --- Eventos de botones ---
$$('[data-mode]').forEach((b) => b.addEventListener('click', () => { Sound.init(); Sound.sfx.select(); UI.selectMode(b.dataset.mode); }));
$$('[data-go]').forEach((b) => b.addEventListener('click', () => { Sound.init(); Sound.sfx.select(); UI.show(b.dataset.go); }));
$$('.stepper').forEach((st) => {
  const [minus, plus] = st.querySelectorAll('button');
  const key = st.dataset.opt;
  const lim = key === 'stocks' ? [1, 9] : [1, 9];
  minus.addEventListener('click', () => { UI.cfg[key] = clamp(UI.cfg[key] - 1, ...lim); Sound.sfx.move(); UI.render(); });
  plus.addEventListener('click', () => { UI.cfg[key] = clamp(UI.cfg[key] + 1, ...lim); Sound.sfx.move(); UI.render(); });
});
$$('.stage-btn').forEach((b) => b.addEventListener('click', () => { UI.cfg.stage = b.dataset.stage; Sound.sfx.move(); UI.render(); }));
$('#btn-resume').addEventListener('click', () => UI.pause(false));
$('#btn-restart').addEventListener('click', () => { game.paused = false; UI.fight(); });
$('#btn-quit').addEventListener('click', () => UI.quitToMenu());
$('#btn-rematch').addEventListener('click', () => { game.paused = false; UI.fight(); });
$('#btn-reselect').addEventListener('click', () => { game.stop(); game.paused = false; UI.show('select'); UI.sel.forEach((q, i) => { q.cur = CHAR_IDS.indexOf(UI.cfg.chars[i]); }); UI.sel[0].chosen = false; UI.render(); });
$('#btn-menu').addEventListener('click', () => UI.quitToMenu());
let greeted = false;
document.addEventListener('pointerdown', () => { Sound.init(); if (!greeted) { greeted = true; setTimeout(() => Sound.voice('name_crafter_smash'), 200); } });

// --- Teclado ---
KeyPressHandlers.push((e) => {
  Sound.init();
  const k = e.code;
  if (k === 'KeyM') { const on = Sound.toggleMusic(); $('#mute-ind').textContent = on ? '' : '🔇 música silenciada (M)'; return; }
  if (UI.current === null) { // en juego
    if (k === 'Escape' || k === 'KeyP') UI.pause(true);
    if (k === 'Tab') game.debug = !game.debug;
    if (game.training) {
      if (k === 'KeyT') game.resetTraining();
      if (k === 'KeyY') game.cycleDummy();
      if (k === 'KeyU') game.fighters[0].meter = 100;
    }
    return;
  }
  if (UI.current === 'pause' && (k === 'Escape' || k === 'KeyP')) { UI.pause(false); return; }
  if (UI.current === 'select') {
    if (k === 'KeyA' || k === 'KeyW') UI.moveCursor(0, -1);
    if (k === 'KeyD' || k === 'KeyS') UI.moveCursor(0, 1);
    if (k === 'KeyF') UI.choose(0);
    if (k === 'KeyG') UI.unchoose(0);
    if (k === 'ArrowLeft' || k === 'ArrowUp') UI.moveCursor(1, -1);
    if (k === 'ArrowRight' || k === 'ArrowDown') UI.moveCursor(1, 1);
    if (k === 'KeyK') UI.choose(1);
    if (k === 'KeyL') UI.unchoose(1);
    if (k === 'Enter' || k === 'Space') { e.preventDefault(); UI.fight(); }
    if (k === 'Escape') UI.show('title');
    return;
  }
  if (k === 'Escape' && UI.current === 'controls') { UI.show('title'); return; }
  const bs = UI.buttons();
  if (!bs.length) return;
  if (k === 'ArrowDown' || k === 'KeyS' || k === 'ArrowRight') { UI.focusIdx = (UI.focusIdx + 1) % bs.length; UI.updateFocus(); Sound.sfx.move(); }
  if (k === 'ArrowUp' || k === 'KeyW' || k === 'ArrowLeft') { UI.focusIdx = (UI.focusIdx - 1 + bs.length) % bs.length; UI.updateFocus(); Sound.sfx.move(); }
  if (k === 'Enter' || k === 'Space') { e.preventDefault(); bs[UI.focusIdx] && bs[UI.focusIdx].click(); }
});

// Pausa con Start del mando
let padStartPrev = false;
setInterval(() => {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  const start = pads.some((p) => p.buttons[9] && p.buttons[9].pressed);
  if (start && !padStartPrev) {
    if (UI.current === null) UI.pause(true);
    else if (UI.current === 'pause') UI.pause(false);
    else if (UI.current === 'select') UI.fight();
  }
  padStartPrev = start;
}, 50);

UI.show('title');
(function menuLoop(t) { if (UI.current === 'select') UI.drawPanels(Math.floor(t / 16.7)); requestAnimationFrame(menuLoop); })(0);
window.addEventListener('resize', () => { if (UI.current === 'select') UI.render(); });
