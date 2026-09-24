// ---------- Utilidades generales ----------
const SZ = 1.2; // tamaño de los personajes (escala hitboxes, hurtboxes y offsets)
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const chance = (p) => Math.random() < p;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sgn = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const easeOut = (t) => 1 - (1 - t) * (1 - t);

// Distancia de un círculo a un rectángulo (para hitbox vs hurtbox)
function circleRect(cx, cy, r, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}
function rectRect(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ---------- Poses (esqueleto procedural) ----------
// Ángulos en grados. Extremidades: 0 = colgando hacia abajo, 90 = hacia adelante, 180 = arriba.
// El segundo valor es el doblez relativo del codo / rodilla.
const BASE_POSE = {
  lean: 4, crouch: 0, rot: 0, yOff: 0, headTilt: 0, scale: 1,
  armF: [22, 40], armB: [-18, 30],
  legF: [10, -12], legB: [-8, -6],
};
function mergePose(base, over) {
  const p = {
    lean: base.lean, crouch: base.crouch, rot: base.rot, yOff: base.yOff, headTilt: base.headTilt, scale: base.scale,
    armF: base.armF.slice(), armB: base.armB.slice(), legF: base.legF.slice(), legB: base.legB.slice(),
    prop: base.prop,
  };
  if (over) for (const k in over) p[k] = Array.isArray(over[k]) ? over[k].slice() : over[k];
  return p;
}
function lerpPose(a, b, t) {
  const p = mergePose(a);
  for (const k of ['lean', 'crouch', 'rot', 'yOff', 'headTilt', 'scale']) p[k] = lerp(a[k], b[k], t);
  for (const k of ['armF', 'armB', 'legF', 'legB']) {
    p[k] = [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t)];
  }
  p.prop = t < 0.5 ? a.prop : b.prop;
  return p;
}
