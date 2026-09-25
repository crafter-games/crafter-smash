// ---------- Entrada: teclado + mandos ----------
const Keys = new Set();
const KeysTapped = new Set(); // teclas presionadas desde el último frame (para toques muy rápidos)
const KeyPressHandlers = [];
window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (!e.repeat) KeyPressHandlers.forEach((h) => h(e));
  Keys.add(e.code);
  KeysTapped.add(e.code);
});
window.addEventListener('keyup', (e) => Keys.delete(e.code));
window.addEventListener('blur', () => Keys.clear());

const KEYMAP_ACTIONS = ['up', 'down', 'left', 'right', 'jump', 'attack', 'special', 'shield', 'grab', 'taunt'];
const KEYMAP_STORAGE = 'crafter-smash-keymaps-v2';
const INPUT_OPTS_STORAGE = 'crafter-smash-input-opts';

const DEFAULT_KEYMAPS = [
  { // P1
    up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
    jump: 'Space', attack: 'KeyF', special: 'KeyG', shield: 'KeyH', grab: 'KeyR', taunt: 'KeyV',
  },
  { // P2
    up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
    jump: 'KeyJ', attack: 'KeyK', special: 'KeyL', shield: 'Semicolon', grab: 'KeyI', taunt: 'KeyO',
  },
];

/** Saltar con Arriba (tap jump). Default ON = más fácil para principiantes. */
const DEFAULT_TAP_JUMP = [true, true];
const TAP_JUMP = [...DEFAULT_TAP_JUMP];

const cloneMaps = (maps) => maps.map((m, p) => {
  const o = {};
  for (const a of KEYMAP_ACTIONS) {
    const v = m[a];
    const fallback = DEFAULT_KEYMAPS[p][a];
    o[a] = Array.isArray(v) ? (v[0] || fallback) : (v || fallback);
  }
  return o;
});

const KEYMAPS = cloneMaps(DEFAULT_KEYMAPS);

const KEY_LABELS = {
  Space: 'Espacio', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Semicolon: 'Ñ', Quote: "'", Backquote: '`', Minus: '-', Equal: '=',
  BracketLeft: '[', BracketRight: ']', Backslash: '\\', Comma: ',', Period: '.', Slash: '/',
  Numpad0: 'Num0', Numpad1: 'Num1', Numpad2: 'Num2', Numpad3: 'Num3', Numpad4: 'Num4',
  Numpad5: 'Num5', Numpad6: 'Num6', Numpad7: 'Num7', Numpad8: 'Num8', Numpad9: 'Num9',
  NumpadDecimal: 'Num.', NumpadAdd: 'Num+', NumpadSubtract: 'Num-', NumpadMultiply: 'Num*',
  NumpadDivide: 'Num/', NumpadEnter: 'NumEnter', Escape: 'Esc', Tab: 'Tab',
  ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl',
  AltLeft: 'Alt', AltRight: 'Alt', MetaLeft: 'Cmd', MetaRight: 'Cmd',
  Backspace: '⌫', Enter: 'Enter', CapsLock: 'Caps',
};

function keyLabel(code) {
  if (!code) return '?';
  if (KEY_LABELS[code]) return KEY_LABELS[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num' + code.slice(6);
  return code;
}

function applyKeymaps(maps) {
  const next = cloneMaps(maps);
  for (let p = 0; p < 2; p++) {
    for (const a of KEYMAP_ACTIONS) KEYMAPS[p][a] = next[p][a];
  }
}

function loadKeymaps() {
  try {
    const raw = localStorage.getItem(KEYMAP_STORAGE);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length < 2) return;
    applyKeymaps(parsed);
  } catch (_) { /* ignore */ }
}

function saveKeymaps() {
  try { localStorage.setItem(KEYMAP_STORAGE, JSON.stringify(KEYMAPS)); } catch (_) { /* ignore */ }
}

function loadInputOpts() {
  try {
    const raw = localStorage.getItem(INPUT_OPTS_STORAGE);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.tapJump) && parsed.tapJump.length >= 2) {
      TAP_JUMP[0] = !!parsed.tapJump[0];
      TAP_JUMP[1] = !!parsed.tapJump[1];
    }
  } catch (_) { /* ignore */ }
}

function saveInputOpts() {
  try { localStorage.setItem(INPUT_OPTS_STORAGE, JSON.stringify({ tapJump: TAP_JUMP })); } catch (_) { /* ignore */ }
}

function setTapJump(port, on) {
  if (port < 0 || port > 1) return;
  TAP_JUMP[port] = !!on;
  saveInputOpts();
}

function resetKeymaps() {
  applyKeymaps(DEFAULT_KEYMAPS);
  TAP_JUMP[0] = DEFAULT_TAP_JUMP[0];
  TAP_JUMP[1] = DEFAULT_TAP_JUMP[1];
  saveKeymaps();
  saveInputOpts();
}

/** Busca si `code` ya está asignada (excepto el slot indicado). */
function findKeyConflict(code, exceptPort, exceptAction) {
  for (let p = 0; p < 2; p++) {
    for (const a of KEYMAP_ACTIONS) {
      if (p === exceptPort && a === exceptAction) continue;
      if (KEYMAPS[p][a] === code) return { port: p, action: a };
    }
  }
  return null;
}

/**
 * Asigna una tecla. Si ya está en uso, no cambia nada.
 * @returns {{ ok: true } | { ok: false, reason: string, conflict?: { port, action } }}
 */
function setKeyBinding(port, action, code) {
  if (!KEYMAP_ACTIONS.includes(action) || port < 0 || port > 1) {
    return { ok: false, reason: 'Acción inválida.' };
  }
  if (KEYMAPS[port][action] === code) return { ok: true }; // misma tecla, sin cambio
  const conflict = findKeyConflict(code, port, action);
  if (conflict) {
    return {
      ok: false,
      reason: 'duplicate',
      conflict,
    };
  }
  KEYMAPS[port][action] = code;
  saveKeymaps();
  return { ok: true };
}

const BIND_BLOCKED = new Set(['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']);

loadKeymaps();
loadInputOpts();

const emptyInput = () => ({ x: 0, y: 0, cx: 0, cy: 0, attack: false, special: false, shield: false, grab: false, jump: false, taunt: false });

class HumanController {
  constructor(port, keyboard = true) {
    this.port = port;
    this.keyboard = keyboard;
  }
  keyDown(code) { return Keys.has(code) || KeysTapped.has(code); }
  read() {
    const o = emptyInput();
    if (this.keyboard) {
      const m = KEYMAPS[this.port];
      o.x = (this.keyDown(m.right) ? 1 : 0) - (this.keyDown(m.left) ? 1 : 0);
      o.y = (this.keyDown(m.up) ? 1 : 0) - (this.keyDown(m.down) ? 1 : 0);
      o.attack = this.keyDown(m.attack);
      o.special = this.keyDown(m.special);
      o.shield = this.keyDown(m.shield);
      o.grab = this.keyDown(m.grab);
      o.jump = this.keyDown(m.jump);
      o.taunt = this.keyDown(m.taunt);
    }
    // Mando: el jugador N usa el mando N
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = [...pads].filter(Boolean)[this.port];
    if (pad) {
      const ax = pad.axes || [], b = (i) => pad.buttons[i] && pad.buttons[i].pressed;
      const dz = (v) => (Math.abs(v) < 0.25 ? 0 : v);
      let x = dz(ax[0] || 0), y = -dz(ax[1] || 0);
      if (b(14)) x = -1; if (b(15)) x = 1; if (b(12)) y = 1; if (b(13)) y = -1;
      if (Math.abs(x) > Math.abs(o.x)) o.x = x;
      if (Math.abs(y) > Math.abs(o.y)) o.y = y;
      const cx = dz(ax[2] || 0), cy = -dz(ax[3] || 0);
      o.cx = Math.abs(cx) > 0.6 ? Math.sign(cx) : 0;
      o.cy = Math.abs(cy) > 0.6 ? Math.sign(cy) : 0;
      o.attack = o.attack || b(0);
      o.special = o.special || b(1);
      o.jump = o.jump || b(2) || b(3);
      o.grab = o.grab || b(4) || b(5);
      o.shield = o.shield || b(6) || b(7);
      o.taunt = o.taunt || b(8); // Select / Back
      this.padStart = b(9);
    }
    // Tap jump: Arriba (teclado/stick) también cuenta como salto
    if (TAP_JUMP[this.port] && o.y >= 0.7) o.jump = true;
    return o;
  }
}
