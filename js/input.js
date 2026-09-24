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

const KEYMAPS = [
  { // P1
    up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    jump: ['Space'], attack: ['KeyF'], special: ['KeyG'], shield: ['KeyH'], grab: ['KeyR'],
  },
  { // P2
    up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
    jump: ['KeyJ', 'Numpad0'], attack: ['KeyK', 'Numpad1'], special: ['KeyL', 'Numpad2'],
    shield: ['Semicolon', 'Numpad3', 'Quote'], grab: ['KeyI', 'NumpadDecimal'],
  },
];

const emptyInput = () => ({ x: 0, y: 0, cx: 0, cy: 0, attack: false, special: false, shield: false, grab: false, jump: false });

class HumanController {
  constructor(port, keyboard = true) {
    this.port = port;
    this.keyboard = keyboard;
    this.map = KEYMAPS[port];
  }
  anyKey(list) { return list.some((k) => Keys.has(k) || KeysTapped.has(k)); }
  read() {
    const o = emptyInput();
    if (this.keyboard && this.map) {
      const m = this.map;
      o.x = (this.anyKey(m.right) ? 1 : 0) - (this.anyKey(m.left) ? 1 : 0);
      o.y = (this.anyKey(m.up) ? 1 : 0) - (this.anyKey(m.down) ? 1 : 0);
      o.attack = this.anyKey(m.attack);
      o.special = this.anyKey(m.special);
      o.shield = this.anyKey(m.shield);
      o.grab = this.anyKey(m.grab);
      o.jump = this.anyKey(m.jump);
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
      this.padStart = b(9);
    }
    return o;
  }
}
