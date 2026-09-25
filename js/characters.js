// ---------- Personajes y movimientos ----------
// Hitbox: s/e = frames activos (1-index), x/y = offset desde los pies (x hacia adelante, y hacia arriba),
// r = radio, d = daño, a = ángulo (0 = adelante, 90 = arriba, 270 = abajo/meteoro), b = knockback base, k = crecimiento.
function H(s, e, x, y, r, d, a, b, k, extra) {
  return Object.assign({ s, e, x, y, r, d, a, b, k, g: 0 }, extra || {});
}
const AIR_POSE = { legF: [60, -95], legB: [15, -70], armF: [60, 50], armB: [-50, 40], lean: 0 };

// Movimientos compartidos
const COMMON_MOVES = {
  grab: {
    frames: 30, poses: { wind: { armF: [60, 40], armB: [50, 40] }, hit: { armF: [92, 0], armB: [85, 0], lean: 18 } },
    hitboxes: [H(7, 8, 44, 58, 26, 0, 0, 0, 0, { grab: true })],
  },
  dashgrab: {
    frames: 40, slideOff: false, poses: { wind: { armF: [60, 40], armB: [50, 40], lean: 20 }, hit: { armF: [95, 0], armB: [90, 0], lean: 30 } },
    hitboxes: [H(9, 10, 54, 55, 28, 0, 0, 0, 0, { grab: true })],
    update(f) { f.vx = approach(f.vx, 0, 0.35); },
  },
  getupattack: {
    frames: 40, intangible: [1, 20], poses: { wind: { crouch: 22, lean: 40 }, hit: { crouch: 16, legF: [95, 0], legB: [-95, 0], lean: 0 } },
    hitboxes: [H(18, 22, 45, 20, 24, 6, 30, 50, 40), H(18, 22, -45, 20, 24, 6, 150, 50, 40)],
  },
  ledgeattack: {
    frames: 40, intangible: [1, 22], poses: { wind: { crouch: 18, lean: 30 }, hit: { legF: [95, 0], lean: -10 } },
    hitboxes: [H(22, 26, 48, 40, 26, 8, 40, 60, 30)],
  },
  taunt: {
    frames: 60, iasa: 55,
    poses: { wind: { armF: [100, 50], armB: [80, 50] }, hit: { armF: [150, 10], armB: [-30, 40], lean: 10, headTilt: -6 } },
    update(f) { f.vx = approach(f.vx, 0, 0.55); },
  },
};

const CHARACTERS = {
  railly: {
    id: 'railly', name: 'RAILLY', title: 'El Imparable',
    colors: { main: '#e8323f', dark: '#8f1b2b', accent: '#f4f4f4', pants: '#2d3a5c', skin: '#b77a53', glow: '#ff7a3d', shirt: '#1c1a22', stripe: '#f4f4f4', sole: '#c8202c' },
    alt: { main: '#e0a21f', dark: '#8a5a08', accent: '#1f1f28', pants: '#2a2a36', skin: '#b77a53', glow: '#ffd23f', shirt: '#1c1a22', stripe: '#1c1a22', sole: '#e0a21f' },
    selectStats: { Velocidad: 9, Peso: 4, Poder: 7, Recuperación: 6, Combos: 9 },
    moveList: [
      ['Especial', '▲ Vercel Blaster: triángulos de Vercel rápidos (short hop laser!)'],
      ['Smash ↓', 'Codex: terminales de OpenAI Codex que escriben código y golpean'],
      ['Esp. →', 'Deploy Dash: embestida relámpago'],
      ['Esp. ↑', 'Commit Push: carga fuego y sale disparado en 8 direcciones'],
      ['Esp. ↓', 'Espejo (shine): refleja proyectiles, se cancela con salto'],
      ['Súper', '▲ DEPLOY A PRODUCCIÓN en Vercel'],
      ['Burla', '▲ ship it / LGTM'],
    ],
    stats: {
      weight: 80, gravity: 1.02, maxFall: 12.5, fastFall: 16.5,
      walk: 4, dashInit: 9.5, dash: 8.6, run: 9, dashFrames: 11, traction: 0.42,
      jumpsquat: 3, jump: 17, shortHop: 9.8, djump: 16, jumpMaxVX: 8, airJumps: 1,
      airSpeed: 4.2, airAccel: 0.42, airFriction: 0.1, airdodge: 12.5, float: 0,
    },
    moves: {
      jab: {
        frames: 16, iasa: 14, next: 'jab2', nextWin: [6, 16],
        poses: { wind: { armF: [70, 90], lean: 6 }, hit: { armF: [92, 0], armB: [-30, 60], lean: 14 } },
        hitboxes: [H(2, 3, 42, 64, 17, 3, 70, 8, 40)],
      },
      jab2: {
        frames: 22, iasa: 20,
        poses: { wind: { armB: [60, 90], armF: [10, 60] }, hit: { armB: [96, 0], armF: [-20, 50], lean: 20 } },
        hitboxes: [H(3, 5, 46, 62, 19, 5, 35, 28, 90)],
      },
      ftilt: {
        frames: 26, iasa: 24,
        poses: { wind: { legF: [40, -90], lean: -10 }, hit: { legF: [96, 0], legB: [-10, 0], lean: -18, armF: [-30, 30], armB: [40, 30] } },
        hitboxes: [H(5, 8, 58, 50, 21, 9, 32, 20, 100), H(5, 8, 30, 52, 15, 8, 32, 18, 95)],
      },
      utilt: {
        frames: 24, iasa: 22,
        poses: { wind: { legF: [40, -60], lean: -5 }, hit: { legF: [172, 0], lean: -32, armF: [-40, 20], armB: [40, 20] } },
        hitboxes: [H(4, 10, 14, 118, 24, 10, 95, 32, 110), H(4, 10, 32, 88, 18, 9, 100, 30, 105)],
      },
      dtilt: {
        frames: 22, iasa: 20, crouchMove: true,
        poses: { wind: { crouch: 14, lean: 30, legF: [70, -110], legB: [-30, -80] }, hit: { crouch: 18, lean: 32, legF: [100, 0], legB: [-40, -90] } },
        hitboxes: [H(5, 7, 56, 12, 19, 9, 78, 45, 80)],
      },
      dashattack: {
        frames: 34, slideOff: true,
        poses: { wind: { lean: 30, armF: [30, 20] }, hit: { lean: 38, armF: [60, 0], armB: [-20, 20], legF: [40, -20], legB: [-50, -20] } },
        hitboxes: [H(5, 9, 40, 55, 26, 11, 50, 42, 72), H(10, 20, 40, 55, 22, 7, 50, 32, 60, { g: 0 })],
        update(f, sf) { if (sf < 18) f.vx = f.facing * Math.max(Math.abs(f.vx) * 0.97, 5); else f.vx = approach(f.vx, 0, 0.6); },
      },
      fsmash: {
        frames: 44, iasa: 40, charge: 9, smash: true,
        poses: { wind: { lean: -18, armF: [-40, 100], armB: [60, 60], crouch: 6 }, hit: { lean: 28, armF: [96, 0], armB: [-40, 40], legF: [40, -10], legB: [-40, 0], prop: 'fire' } },
        hitboxes: [H(12, 15, 74, 62, 16, 17, 38, 30, 104, { fx: 'fire' }), H(12, 15, 50, 60, 22, 15, 40, 28, 100, { fx: 'fire' })],
      },
      usmash: {
        frames: 40, iasa: 38, charge: 6, smash: true,
        poses: { wind: { crouch: 12, lean: 12 }, hit: { legF: [178, 0], legB: [130, -40], armF: [-60, 10], armB: [-80, 10], lean: -20 } },
        anim(f, sf) { if (sf >= 8 && sf <= 20) return { rot: -((sf - 8) / 12) * 360 }; },
        hitboxes: [H(9, 16, 0, 108, 32, 15, 88, 30, 110), H(9, 12, 20, 60, 22, 13, 85, 30, 100)],
      },
      dsmash: {
        frames: 56, iasa: 52, charge: 6, smash: true,
        update(f, sf, g) {
          f.vx = approach(f.vx, 0, f.stats.traction);
          if (sf === 7) g.fx.text(f.x, f.y - 175, '$ codex "gana la pelea"', '#10a37f', 18, { life: 50, max: 50 });
          if (sf === 11) {
            Sound.play('beamSword', 0.8, 1.3); Sound.play('powershield', 0.5, 1.4);
            const mult = 1 + (f.chargeT / 60) * 0.4;
            for (const dir of [1, -1]) {
              g.spawnProjectile(f, {
                kind: 'codex', x: f.x + dir * 30, y: f.y - 58, vx: dir * 9, vy: 0, life: 30, r: 36, rect: [120, 76], dir,
                d: Math.round(15 * mult), a: 35, b: 32, k: 100, pierce: true, noReflect: true, noClash: true, fx: 'flash',
                lines: ['$ codex --auto', '> leyendo rival.js', pick(['✓ bug arreglado', '✓ 42 tests ok', '✓ PR aprobado']), '> deploy ▲'],
                update(p) { p.vx *= 0.86; if (p.life < 8) p.alpha = p.life / 8; },
                draw: drawCodexTerminal,
              });
            }
          }
        },
        drawOver(ctx, f) { if (f.sf >= 3 && f.sf <= 44) drawOpenAI(ctx, f.x, f.y - 175 * SZ, 34, f.game.frame * 0.06, Math.min(1, (f.sf - 3) / 6, (46 - f.sf) / 6)); },
      },
      nair: {
        frames: 40, aerial: true, landLag: 14,
        poses: { wind: AIR_POSE, hit: { legF: [90, 0], legB: [-20, -60], armF: [40, 30], armB: [-60, 30], lean: -10 } },
        hitboxes: [H(3, 7, 22, 50, 26, 12, 45, 22, 100), H(8, 30, 22, 50, 22, 8, 45, 12, 80, { g: 0 })],
      },
      fair: {
        frames: 36, aerial: true, landLag: 20,
        poses: { wind: { legF: [30, -120], legB: [0, -60], lean: 10 }, hit: { legF: [100, 0], legB: [-20, -40], lean: -22, armF: [-40, 30], armB: [30, 30] } },
        hitboxes: [H(6, 9, 58, 48, 22, 14, 40, 30, 105), H(6, 9, 32, 52, 18, 12, 40, 28, 100)],
      },
      bair: {
        frames: 30, aerial: true, landLag: 16,
        poses: { wind: { legB: [-10, -110], legF: [30, -60], lean: 10 }, hit: { legB: [-102, 0], legF: [30, -70], lean: 32, armF: [60, 40] } },
        hitboxes: [H(4, 8, -56, 52, 23, 15, 142, 24, 100), H(9, 16, -50, 52, 18, 9, 142, 16, 90)],
      },
      uair: {
        frames: 36, aerial: true, landLag: 16,
        poses: { wind: { legF: [70, -80], legB: [0, -60], lean: -20 }, hit: { legF: [178, 0], legB: [20, -60], lean: -48, armF: [-40, 20], rot: -20 } },
        hitboxes: [H(6, 10, 4, 118, 26, 13, 90, 26, 105)],
      },
      dair: {
        frames: 44, aerial: true, landLag: 24,
        poses: { wind: { legF: [45, -110], legB: [30, -100], armF: [140, 30], armB: [140, 30] }, hit: { legF: [-4, 0], legB: [6, 0], armF: [160, 10], armB: [150, 10], yOff: 6 } },
        hitboxes: [H(10, 12, 4, 8, 22, 15, 270, 24, 96, { fx: 'meteor' }), H(13, 24, 4, 14, 18, 10, 290, 20, 80)],
      },
      // --- Especiales ---
      nspecial: {
        frames: 22, iasa: 18, landLag: 6, special: true,
        poses: { wind: { armF: [80, 10], lean: 4 }, hit: { armF: [92, 0], lean: 10, prop: 'gun' } },
        update(f, sf, g) {
          if (!f.ground && sf < 14) f.vy = Math.min(f.vy, 2.5);
          if (sf === 6) {
            g.spawnProjectile(f, { type: 'vercel', x: f.x + f.facing * 60, y: f.y - 76, vx: f.facing * 19, vy: 0, life: 44, r: 10, rot: f.facing * Math.PI / 2, d: 3, a: 0, b: 0, k: 0, noFlinch: true });
            Sound.sfx.laser();
          }
        },
      },
      sspecial: {
        frames: 46, special: true, slideOff: true, helplessAir: true, landLag: 14,
        poses: { wind: { lean: 20, crouch: 6 }, hit: { lean: 50, armF: [70, 0], armB: [-60, 0], legF: [30, 0], legB: [-60, 0] } },
        hitboxes: [H(11, 22, 10, 55, 32, 8, 72, 50, 50)],
        update(f, sf, g) {
          f.noGrav = sf <= 24;
          if (sf <= 10) { f.vx *= 0.7; f.vy = 0; }
          else if (sf <= 22) {
            f.vx = f.facing * 26; f.vy = 0;
            if (sf % 2 === 0) g.fx.afterimage(f);
            if (sf % 3 === 0) g.fx.text(f.x - f.facing * 30, f.y - rand(30, 100), '▲', '#fff', 20, { vy: 0, life: 16, max: 16 });
            if (sf > 13 && f.inp.specialP) { f.sf = 22; }
          } else if (sf === 23) f.vx = f.facing * 5;
          else f.vx *= 0.88;
          if (sf === 11) Sound.sfx.dash();
        },
      },
      uspecial: {
        frames: 84, special: true, helplessAir: true, landLag: 18, ledgeFrom: 44, slideOff: true,
        poses: { wind: { crouch: 10, armF: [150, 20], armB: [150, 20], legF: [60, -100], legB: [40, -100] }, hit: { armF: [175, 0], armB: [170, 0], legF: [0, 0], legB: [8, 0], lean: 0 } },
        update(f, sf, g) {
          const mv = f.mv;
          if (sf <= 42) {
            f.noGrav = true; f.vx *= 0.9;
            f.vy = sf < 6 ? 0 : Math.min(f.vy + 0.08, 1.2);
            if (sf % 8 === 0) f.dynHB.push(H(sf, sf, 0, 55, 36, 2, 80, 0, 0, { fkb: 35, g: 10 + sf, fx: 'fire' }));
            if (sf % 3 === 0) g.fx.fire(f.x, f.y - 50, 1);
            if (sf === 1) Sound.sfx.fire();
          }
          if (sf === 43) {
            let dx = f.inp.x, dy = f.inp.y;
            if (Math.hypot(dx, dy) < 0.3) { dx = 0; dy = 1; }
            const m = Math.hypot(dx, dy); mv.dx = dx / m; mv.dy = dy / m;
            if (mv.dx) f.facing = sgn(mv.dx);
            if (mv.dy > 0.1) f.ground = null;
            Sound.sfx.fire();
          }
          if (sf >= 43 && sf <= 70) {
            f.noGrav = true;
            f.vx = mv.dx * 17; f.vy = -mv.dy * 17;
            if (f.ground && mv.dy < 0) f.vy = 0;
            const ang = Math.atan2(mv.dy, mv.dx * f.facing) / DEG;
            f.poseRot = 90 - ang;
            f.dynHB.push(H(sf, sf, 0, 55, 34, 14, 58, 40, 92, { g: 5, fx: 'fire' }));
            g.fx.fire(f.x, f.y - 55, 2);
          }
          if (sf > 70) { f.vx *= 0.88; f.vy *= 0.8; f.poseRot = 0; }
        },
      },
      dspecial: {
        frames: 40, special: true, slideOff: true, landLag: 6,
        poses: { wind: { crouch: 6, armF: [60, 80], armB: [40, 80] }, hit: { crouch: 6, armF: [60, 80], armB: [40, 80], prop: 'shine' } },
        hitboxes: [H(1, 2, 0, 55, 44, 5, 22, 0, 0, { fkb: 78, fx: 'shine' })],
        intangible: [1, 1],
        update(f, sf, g) {
          if (sf === 1) Sound.sfx.shine();
          f.reflecting = sf >= 1 && sf <= 36;
          if (!f.ground) { f.noGrav = sf <= 4; if (sf <= 4) f.vy = 0; else f.vy = Math.min(f.vy, 3); }
          if (f.ground) f.vx = approach(f.vx, 0, f.stats.traction * 0.8);
          if (sf >= 4 && f.inp.jumpP) { f.buf.jump = f.game.frame; f.endMove(); return; }
          if (sf === 20 && f.inp.special) f.sf = 19; // mantener el shine
        },
      },
      taunt: {
        frames: 80, iasa: 72,
        poses: {
          wind: { crouch: 14, armF: [50, 110], armB: [40, 100], lean: 8, headTilt: 6 },
          hit: { crouch: 0, armF: [155, 0], armB: [-30, 50], lean: 12, headTilt: -12, prop: 'gun' },
        },
        anim(f, sf) {
          if (sf < 10) return { crouch: 14 - sf * 0.4, armF: [50 + sf * 4, 110 - sf * 6], armB: [40, 100] };
          if (sf < 28) {
            // teclea
            const tap = (sf % 6 < 3);
            return { crouch: 8, lean: 6, armF: tap ? [70, 95] : [55, 105], armB: tap ? [55, 100] : [70, 90], headTilt: 8 };
          }
          if (sf < 70) {
            const pulse = Math.sin((sf - 28) * 0.25) * 4;
            return { armF: [155, -5 + pulse], armB: [-25, 45], lean: 10 + pulse * 0.3, headTilt: -14, prop: 'gun' };
          }
        },
        update(f, sf, g) {
          f.vx = approach(f.vx, 0, 0.55);
          if (sf === 12) Sound.play('menuScroll', 0.4, 1.4);
          if (sf === 28) {
            Sound.sfx.taunt();
            g.fx.text(f.x, f.y - 155, pick(['▲ ship it', 'LGTM', 'git push -f', 'Ready ✓']), f.c.accent, 24, { life: 50, max: 50 });
          }
          if (sf > 28 && sf < 70 && sf % 7 === 0) g.fx.sparkle(f.x + f.facing * 50, f.y - 90, f.c.glow);
        },
        drawOver(ctx, f) {
          if (f.sf < 28 || f.sf > 72) return;
          const a = f.sf > 64 ? (72 - f.sf) / 8 : 1;
          ctx.save(); ctx.globalAlpha = a;
          drawVercel(ctx, f.x + f.facing * 58, f.y - 118 + Math.sin(f.sf * 0.3) * 4, 16, 0, true);
          ctx.restore();
        },
      },
      final: {
        frames: 60, special: true, final: true, slideOff: true,
        poses: { wind: { crouch: 10, lean: -10, armF: [150, 20], armB: [150, 20] }, hit: { lean: 55, armF: [90, 0], armB: [-80, 0], legF: [40, 0], legB: [-70, 0] } },
        update(f, sf, g) {
          const mv = f.mv;
          f.superArmor = true;
          f.noGrav = true;
          if (mv.caught) {
            const t = mv.caught;
            f.vx = 0; f.vy = 0;
            t.x = f.x + f.facing * 70; t.y = f.y; t.vx = t.vy = t.kvx = t.kvy = 0;
            if (t.state !== 'locked') t.setState('locked');
            t.lockedBy = f;
            mv.ct = (mv.ct || 0) + 1;
            if (mv.ct % 6 === 0 && mv.ct < 72) {
              t.percent += 2; g.fx.spark(t.x + rand(-20, 20), t.y - rand(30, 90), 1, f.c.glow);
              Sound.sfx.hit(0.7); g.shake(4); t.hurtFlash = 6;
              g.fx.text(t.x + rand(-40, 40), t.y - 130 - rand(0, 40), pick(['▲ vercel --prod', 'Ready ✓', '▲ deploy!', 'git push!', 'LGTM', 'merge!', 'CI ✓']), f.c.accent, 22);
            }
            if (mv.ct === 76) {
              t.lockedBy = null;
              t.setState('air');
              g.resolveHit(f, t, H(0, 0, 0, 0, 0, 20, 42, 120, 92, { fx: 'fire', noStale: true }), f.x, f.facing);
              g.flash('#fff', 0.8);
            }
            if (mv.ct > 90) f.endMove();
            else f.sf = 30;
            return;
          }
          if (sf === 1) { g.flash(f.c.glow, 0.5); g.banner('▲ DEPLOY A PRODUCCIÓN', f.c.main); Sound.sfx.final(); }
          if (sf <= 16) { f.vx = 0; f.vy = 0; if (sf % 2 === 0) g.fx.fire(f.x, f.y - 60, 3); }
          else if (sf <= 48) {
            f.vx = f.facing * 30; f.vy = 0;
            g.fx.afterimage(f); g.fx.fire(f.x, f.y - 55, 2);
            f.dynHB.push(H(sf, sf, 20, 55, 55, 0, 0, 0, 0, {
              g: 1, unblockable: true,
              onHit(att, tgt) { att.mv.caught = tgt; tgt.grabbedBy = null; Sound.sfx.hit(2); g.shake(12); return true; },
            }));
          } else f.vx *= 0.8;
        },
      },
    },
    throws: {
      f: { d: 8, a: 40, b: 62, k: 60 },
      b: { d: 10, a: 140, b: 62, k: 72 },
      u: { d: 6, a: 90, b: 72, k: 62 },
      d: { d: 5, a: 80, b: 58, k: 48 },
    },
  },

  anthony: {
    id: 'anthony', name: 'ANTHONY', title: 'Buena Vibra',
    colors: { main: '#2f8fe8', dark: '#18497a', accent: '#b8ff3a', pants: '#384a6e', skin: '#dca57b', glow: '#7cf6ff', shirt: '#1c1a22', stripe: '#f4f4f4', sole: '#f4f4f4' },
    alt: { main: '#3fbf5a', dark: '#1d6b2c', accent: '#ffe066', pants: '#2c2c3c', skin: '#dca57b', glow: '#c6ff9a', shirt: '#f4f4f4', stripe: '#ffe066', sole: '#f4f4f4' },
    selectStats: { Velocidad: 5, Peso: 7, Poder: 8, Recuperación: 9, Combos: 6 },
    moveList: [
      ['Especial', 'Paz y Amor: ✌️ proyectil cargable'],
      ['Esp. →', 'Lentes Láser: rayo desde los lentes (¡agáchate!)'],
      ['Esp. ↑', 'Salto Zen: remolino ascendente de golpes'],
      ['Esp. ↓', 'Flash de Selfie: contraataque'],
      ['Smash →', 'Martillo de Ingeniero Civil 🔨'],
      ['Smash ↓', 'Push-ups: 4 flexiones que sacuden el piso 💪'],
      ['Súper', 'FOTO GRUPAL — ¡escóndete detrás!'],
      ['Burla', '✌️ Paz y amor'],
    ],
    stats: {
      weight: 96, gravity: 0.46, maxFall: 7.6, fastFall: 11.5,
      walk: 3.4, dashInit: 7.2, dash: 6.4, run: 6.6, dashFrames: 15, traction: 0.46,
      jumpsquat: 5, jump: 11.8, shortHop: 7.2, djump: 11.8, jumpMaxVX: 6.5, airJumps: 1,
      airSpeed: 5.0, airAccel: 0.34, airFriction: 0.05, airdodge: 11, float: 110,
    },
    moves: {
      jab: {
        frames: 20, iasa: 18,
        poses: { wind: { armF: [60, 100] }, hit: { armF: [90, 0], lean: 12, armB: [-30, 50] } },
        hitboxes: [H(3, 5, 44, 64, 19, 4, 45, 20, 72)],
      },
      ftilt: {
        frames: 28, iasa: 26,
        poses: { wind: { legF: [50, -100], lean: -8 }, hit: { legF: [92, 0], lean: -16, armB: [40, 30] } },
        hitboxes: [H(6, 9, 60, 42, 21, 10, 32, 26, 95), H(6, 9, 34, 46, 16, 9, 32, 24, 90)],
      },
      utilt: {
        frames: 30, iasa: 28,
        poses: { wind: { armF: [40, 40], lean: 6 }, hit: { armF: [168, 0], lean: -10, headTilt: -10 } },
        anim(f, sf) { if (sf >= 6 && sf <= 14) return { armF: [60 + (sf - 6) * 16, 0] }; },
        hitboxes: [H(6, 14, 22, 108, 26, 9, 86, 36, 100), H(6, 14, 40, 80, 20, 8, 80, 34, 95)],
      },
      dtilt: {
        frames: 18, iasa: 16, crouchMove: true,
        poses: { wind: { crouch: 14, lean: 28, legF: [70, -110], legB: [-30, -80] }, hit: { crouch: 16, lean: 30, legF: [96, 0], legB: [-40, -90] } },
        hitboxes: [H(4, 6, 52, 10, 17, 6, 80, 32, 60)],
      },
      dashattack: {
        frames: 36, slideOff: true,
        poses: { wind: { lean: 10 }, hit: { lean: -30, crouch: 20, legF: [88, 0], legB: [40, -70], armB: [-60, 30], armF: [20, 40] } },
        hitboxes: [H(6, 16, 44, 20, 22, 10, 55, 40, 70)],
        update(f, sf) { f.vx = approach(f.vx, 0, sf < 16 ? 0.15 : 0.5); },
      },
      fsmash: {
        frames: 50, iasa: 46, charge: 10, smash: true,
        poses: { wind: { lean: -18, armF: [-60, 40], prop: 'stick' }, hit: { lean: 24, armF: [95, 0], armB: [-40, 30], legF: [45, -10], legB: [-40, 0], prop: 'stick' } },
        hitboxes: [H(15, 19, 100, 62, 22, 18, 36, 36, 104, { fx: 'flash' }), H(15, 19, 64, 60, 18, 14, 38, 30, 100)],
      },
      usmash: {
        frames: 44, iasa: 42, charge: 8, smash: true,
        poses: { wind: { crouch: 14, armF: [20, 90] }, hit: { armF: [176, 0], lean: -6, legF: [20, 0], prop: 'peace' } },
        hitboxes: [H(10, 18, 8, 120, 32, 16, 90, 34, 106, { fx: 'peace' }), H(10, 13, 24, 70, 22, 12, 88, 30, 100)],
      },
      dsmash: {
        frames: 62, iasa: 58, charge: 4, smash: true, crouchMove: true,
        update(f, sf, g) {
          f.vx = approach(f.vx, 0, f.stats.traction);
          const i = [14, 26, 38, 50].indexOf(sf);
          if (i < 0) return;
          const last = i === 3;
          f.dynHB.push(H(sf, sf + 1, 58, 12, 28, last ? 12 : 3, last ? 35 : 80, last ? 45 : 0, last ? 96 : 0, { fkb: last ? 0 : 42, g: 20 + i }));
          f.dynHB.push(H(sf, sf + 1, -58, 12, 28, last ? 12 : 3, last ? 145 : 100, last ? 45 : 0, last ? 96 : 0, { fkb: last ? 0 : 42, g: 20 + i }));
          g.fx.dust(f.x - 60, f.y, -1, 5); g.fx.dust(f.x + 60, f.y, 1, 5);
          g.fx.shockwave(f.x, f.y - 6, '#fff', last ? 130 : 70); g.shake(last ? 8 : 3);
          g.fx.text(f.x, f.y - 100, last ? '¡4! 💪' : `¡${i + 1}!`, '#ffd23f', last ? 32 : 22, { life: 30, max: 30 });
          Sound.sfx.hit(last ? 1.7 : 0.5);
        },
      },
      nair: {
        frames: 42, aerial: true, landLag: 12,
        poses: { wind: AIR_POSE, hit: { armF: [90, 0], armB: [-90, 0], legF: [40, -30], legB: [-40, -30] } },
        anim(f, sf) { if (sf >= 4 && sf <= 24) return { rot: (sf - 4) * 36 }; },
        hitboxes: [H(4, 8, 0, 55, 34, 11, 55, 26, 92), H(9, 24, 0, 55, 30, 7, 55, 18, 80)],
      },
      fair: {
        frames: 40, aerial: true, landLag: 18,
        poses: { wind: { armF: [40, 100], lean: -6, legF: [40, -80], legB: [10, -60] }, hit: { armF: [94, 0], lean: 18, legF: [40, -80], legB: [10, -60], prop: 'peace' } },
        hitboxes: [H(8, 11, 62, 60, 22, 13, 38, 30, 100, { fx: 'peace' }), H(8, 11, 36, 60, 18, 11, 40, 28, 96)],
      },
      bair: {
        frames: 34, aerial: true, landLag: 16,
        poses: { wind: { legB: [-20, -100], legF: [-10, -100], lean: 20 }, hit: { legB: [-98, 0], legF: [-85, 0], lean: 45 } },
        hitboxes: [H(6, 10, -54, 48, 25, 14, 145, 26, 100), H(11, 18, -50, 48, 20, 9, 145, 18, 90)],
      },
      uair: {
        frames: 38, aerial: true, landLag: 14,
        poses: { wind: { lean: 20, headTilt: 20 }, hit: { lean: -30, headTilt: -30, armF: [-60, 20], armB: [-80, 20] } },
        hitboxes: [H(6, 12, 0, 128, 30, 12, 88, 32, 100)],
      },
      dair: {
        frames: 44, aerial: true, landLag: 20,
        poses: { wind: { legF: [40, -110], legB: [30, -100] }, hit: { legF: [-4, 0], legB: [8, -20], armF: [130, 20], armB: [130, 20] } },
        anim(f, sf) { if (sf >= 8 && sf <= 28) return { rot: (sf - 8) * 30 }; },
        hitboxes: [
          H(8, 8, 0, 8, 26, 2, 280, 8, 0, { g: 1, fkb: 22 }), H(12, 12, 0, 8, 26, 2, 280, 8, 0, { g: 2, fkb: 22 }),
          H(16, 16, 0, 8, 26, 2, 280, 8, 0, { g: 3, fkb: 22 }), H(20, 20, 0, 8, 26, 2, 280, 8, 0, { g: 4, fkb: 22 }),
          H(26, 28, 0, 14, 30, 5, 80, 45, 80, { g: 5 }),
        ],
      },
      // --- Especiales ---
      nspecial: {
        frames: 36, iasa: 32, landLag: 8, special: true,
        poses: { wind: { armF: [150, 20], lean: -10, prop: 'peace' }, hit: { armF: [90, 0], lean: 16, prop: 'peace' } },
        update(f, sf, g) {
          const mv = f.mv;
          if (!f.ground) f.vy = Math.min(f.vy, 2);
          if (sf === 9 && f.inp.special && (mv.c || 0) < 55) {
            mv.c = (mv.c || 0) + 1; f.sf = 8;
            f.chargeFlash = true;
            if (mv.c === 1) Sound.sfx.charge();
            if (mv.c % 3 === 0) g.fx.sparkle(f.x + f.facing * 30, f.y - 110, f.c.accent);
            return;
          }
          f.chargeFlash = false;
          if (sf === 12) {
            const c = mv.c || 0;
            g.spawnProjectile(f, {
              type: 'peace', x: f.x + f.facing * 56, y: f.y - 80, vx: f.facing * (6 + c * 0.1), vy: 0, life: 90,
              r: 16 + c * 0.22, d: 5 + c * 0.22, a: 40, b: 30 + c * 0.4, k: 62 + c * 0.5, wave: true,
            });
            Sound.sfx.peace();
          }
        },
      },
      sspecial: {
        frames: 46, special: true, landLag: 12,
        poses: { wind: { lean: -6, headTilt: -6, armF: [140, 110] }, hit: { lean: -2, armF: [150, 110], headTilt: 0 } },
        update(f, sf, g) {
          if (!f.ground) { f.noGrav = sf <= 26; if (sf <= 26) f.vy *= 0.6; }
          f.vx = approach(f.vx, 0, 0.5);
          if (sf < 15 && sf % 3 === 0) g.fx.sparkle(f.x + f.facing * 14, f.y - 100, '#fff');
          if (sf === 15) Sound.sfx.beam();
          if (sf >= 15 && sf <= 22) {
            f.dynHB.push(H(sf, sf, 18, 86, 0, 8, 16, 42, 48, { rect: true, w: 400, h: 16, fx: 'beam' }));
            f.beam = sf;
          } else f.beam = 0;
        },
      },
      uspecial: {
        frames: 62, special: true, helplessAir: true, landLag: 16, ledgeFrom: 10, slideOff: true,
        poses: { wind: { crouch: 12, armF: [140, 20], armB: [140, 20] }, hit: { armF: [170, 0], armB: [-170, 0], legF: [10, -20], legB: [-10, -20] } },
        anim(f, sf) { if (sf >= 6 && sf <= 36) return { rot: (sf - 6) * 40 }; },
        update(f, sf, g) {
          if (sf <= 5) { f.noGrav = true; f.vy = 0; f.vx *= 0.8; }
          if (sf === 6) { f.ground = null; f.y -= 2; f.vy = -17.5; f.fastfall = false; Sound.sfx.djump(); }
          if (sf > 6 && sf <= 36) {
            f.noGrav = true; f.vy = Math.min(f.vy + 0.52, 3);
            f.vx = approach(f.vx, f.inp.x * 4.2, 0.5);
            if (sf % 5 === 0 && sf < 30) f.dynHB.push(H(sf, sf + 1, 0, 60, 38, 2, 90, 0, 0, { fkb: 42, g: 10 + sf }));
            if (sf >= 31 && sf <= 34) f.dynHB.push(H(sf, sf, 0, 60, 42, 6, 80, 55, 82, { g: 50 }));
            if (sf % 2 === 0) g.fx.swirl(f.x, f.y - 60, f.c.glow);
          }
        },
      },
      dspecial: {
        frames: 50, special: true, landLag: 8,
        poses: { wind: { armF: [120, 60], lean: -6, prop: 'phone' }, hit: { armF: [120, 60], lean: -6, prop: 'phone' } },
        update(f, sf) {
          f.countering = sf >= 5 && sf <= 28;
          if (!f.ground) f.vy = Math.min(f.vy, 1.5);
          f.vx = approach(f.vx, 0, 0.5);
        },
      },
      counterHit: {
        frames: 38, special: true, landLag: 6,
        poses: { wind: { armF: [120, 60], prop: 'phone' }, hit: { armF: [100, 10], lean: 14, prop: 'phone' } },
        update(f, sf, g) {
          f.noGrav = !f.ground && sf < 14; if (f.noGrav) f.vy = 0;
          if (sf === 1) { g.flash('#fff', 0.9); Sound.sfx.counter(); g.fx.text(f.x, f.y - 150, '📸 ¡FLASH!', '#fff', 34); }
          if (sf === 6) f.dynHB.push(H(6, 6, 50, 60, 70, f.mv.dmg || 10, 38, 60, 82, { g: 1, fx: 'flash', noStale: true }));
          if (sf === 7) f.dynHB.push(H(7, 7, 50, 60, 70, f.mv.dmg || 10, 38, 60, 82, { g: 1, fx: 'flash', noStale: true }));
        },
      },
      taunt: {
        frames: 88, iasa: 80,
        poses: {
          wind: { armF: [40, 100], armB: [30, 90], lean: -4, crouch: 6 },
          hit: { armF: [160, 5], armB: [150, 10], lean: -8, headTilt: -10, prop: 'peace' },
        },
        anim(f, sf) {
          if (sf < 12) return { crouch: 6 - sf * 0.3, armF: [40 + sf * 8, 100 - sf * 7] };
          if (sf <= 78) {
            const sway = Math.sin(sf * 0.18) * 14;
            const bob = Math.abs(Math.sin(sf * 0.22)) * 6;
            return {
              crouch: bob,
              lean: sway * 0.35,
              armF: [155 + Math.sin(sf * 0.2) * 6, -5 - bob],
              armB: [145 + Math.cos(sf * 0.2) * 6, 0 - bob * 0.5],
              headTilt: -8 + sway * 0.2,
              prop: 'peace',
            };
          }
        },
        update(f, sf, g) {
          f.vx = approach(f.vx, 0, 0.55);
          if (sf === 12) {
            Sound.sfx.peace();
            g.fx.text(f.x, f.y - 150, pick(['✌️ paz y amor', 'buena vibra', 'namasté']), f.c.accent, 24, { life: 52, max: 52 });
          }
          if (sf > 12 && sf < 75 && sf % 6 === 0) g.fx.sparkle(f.x + rand(-40, 40), f.y - rand(70, 130), f.c.glow);
        },
      },
      final: {
        frames: 140, special: true, final: true,
        poses: { wind: { armF: [150, 20], prop: 'phone' }, hit: { armF: [150, 20], prop: 'phone', headTilt: -6 } },
        update(f, sf, g) {
          f.superArmor = true; f.invincible = Math.max(f.invincible, 2);
          if (!f.ground) { f.noGrav = true; f.vy = 0; }
          f.vx = approach(f.vx, 0, 0.6);
          if (sf === 1) { g.banner('FOTO GRUPAL', f.c.main); Sound.sfx.final(); g.photo = { owner: f, t: 0 }; }
          if (g.photo) g.photo.t = sf;
          if (sf === 20) Sound.voice('three'); if (sf === 50) Sound.voice('two'); if (sf === 80) Sound.voice('one');
          if (sf === 110) {
            Sound.sfx.counter(); g.flash('#fff', 1);
            for (const t of g.fighters) {
              if (t === f || t.state === 'dead') continue;
              const front = (t.x - f.x) * f.facing > -30;
              if (front && !t.isIntangible()) {
                g.resolveHit(f, t, H(0, 0, 0, 0, 0, 28, 55, 95, 80, { fx: 'flash', unblockable: true, noStale: true }), f.x, f.facing);
              } else if (!front) g.fx.text(t.x, t.y - 140, '¡SE ESCONDIÓ!', '#fff', 26);
            }
          }
          if (sf === 125) g.photo = null;
        },
      },
    },
    throws: {
      f: { d: 9, a: 45, b: 58, k: 70 },
      b: { d: 11, a: 138, b: 60, k: 88 },
      u: { d: 8, a: 90, b: 60, k: 72 },
      d: { d: 6, a: 72, b: 45, k: 60 },
    },
  },
};


// ======================= NUEVOS PERSONAJES =======================
// Clona los ataques normales de otro personaje (para cuerpos compartidos)
function cloneMoves(src, ids) {
  const o = {};
  for (const k of ids) o[k] = { ...src[k], hitboxes: src[k].hitboxes ? src[k].hitboxes.map((h) => ({ ...h })) : undefined };
  return o;
}
const NORMALS = ['jab', 'ftilt', 'utilt', 'dtilt', 'dashattack', 'fsmash', 'usmash', 'dsmash', 'nair', 'fair', 'bair', 'uair', 'dair'];

// ---------- JIBARU: Pokémon + Vocaloid ----------
const POKEMON = [
  { img: 'pikachu', name: '¡Pikachu, Impactrueno!', color: '#ffe23f' },
  { img: 'charmander', name: '¡Charmander, Lanzallamas!', color: '#ff8c1a' },
  { img: 'squirtle', name: '¡Squirtle, Pistola Agua!', color: '#5ec8ff' },
  { img: 'bulbasaur', name: '¡Bulbasaur, Látigo Cepa!', color: '#7ed957' },
];
function summonPokemon(owner, x, y, g, facing) {
  if (g.countProjs(owner, 'pokemon') > 0) return;
  const P = pick(POKEMON);
  Sound.sfx.appear();
  g.fx.text(x, y - 70, P.name, P.color, 20, { life: 60, max: 60 });
  g.fx.shockwave(x, y, '#fff', 60);
  g.spawnProjectile(owner, {
    kind: 'pokemon', entity: true, type: 'img', img: P.img, x, y, vx: 0, vy: 0, life: 70, h: 54, flip: facing > 0, grav: 0.6, roll: true, r: 0,
    update(p, gg) {
      const t = p.t;
      if (P.img === 'pikachu' && (t === 22 || t === 36)) {
        Sound.sfx.hit(1.2, 'flash'); gg.flash('#fff6a0', 0.35);
        gg.zone(owner, p.x, p.y - 40, 75, { d: 5, a: 75, b: 45, k: 60, fx: 'flash' });
        for (let i = 0; i < 8; i++) gg.fx.p({ x: p.x + rand(-20, 20), y: p.y - 260 + i * 30, vx: rand(-3, 3), vy: 6, life: 10, size: 5, color: i % 2 ? '#fff' : '#ffe23f', kind: 'line' });
      }
      if (P.img === 'charmander' && t > 18 && t < 50) {
        if (t % 2 === 0) gg.fx.fire(p.x + facing * rand(20, 140), p.y - 22 + rand(-12, 12), 2);
        if (t % 8 === 0) gg.zone(owner, p.x + facing * 80, p.y - 22, 60, { d: 2.5, a: 40, b: 0, k: 0, fkb: 30, fx: 'fire', dir: facing }, 2);
        if (t === 46) gg.zone(owner, p.x + facing * 80, p.y - 22, 64, { d: 5, a: 40, b: 50, k: 70, fx: 'fire', dir: facing }, 2);
        if (t === 20) Sound.sfx.fire();
      }
      if (P.img === 'squirtle' && t === 22) {
        Sound.sfx.reflect();
        gg.spawnProjectile(owner, { type: 'img', img: 'kirby_ball0', draw(ctx, q) {
          ctx.save(); ctx.fillStyle = 'rgba(120,200,255,.85)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(q.x, q.y, 22, 14, 0, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(q.x - 6, q.y - 4, 5, 0, TAU); ctx.fill(); ctx.restore();
          if (q.t % 2 === 0) gg.fx.p({ x: q.x - sgn(q.vx) * 20, y: q.y, vx: -q.vx * 0.2, vy: rand(-1, 1), life: 14, size: 5, color: '#9fe0ff', kind: 'puff' });
        }, x: p.x + facing * 30, y: p.y - 24, vx: facing * 12, vy: 0, life: 45, r: 18, d: 4, a: 10, b: 0, k: 0, fkb: 75 });
      }
      if (P.img === 'bulbasaur' && t === 24) {
        Sound.sfx.hit(0.8); gg.zone(owner, p.x + facing * 60, p.y - 30, 70, { d: 9, a: 50, b: 45, k: 75, dir: facing }, 3);
        for (let i = 0; i < 12; i++) gg.fx.p({ x: p.x + facing * i * 10, y: p.y - 30 - Math.sin(i / 2) * 20, vx: 0, vy: 0, life: 12, size: 5, color: '#4caf50', kind: 'dot' });
      }
      if (t > 60) p.alpha = (70 - t) / 10;
    },
    draw(ctx, p) { Items.draw(ctx, p.img, p.x, p.y + 1, p.h, { flip: p.flip, anchorBottom: true, alpha: p.alpha ?? 1 }); },
  });
}
function spawnMiku(owner, g, big) {
  Sound.sfx.appear();
  const f = owner;
  const x = big ? (g.stage.main.x1 + g.stage.main.x2) / 2 : f.x - f.facing * 50, y = big ? g.stage.main.y : f.y;
  g.fx.text(x, y - (big ? 360 : 150), big ? '♪ MIKU MIKU BEAM ♪' : '♪ ¡Miku! ♪', '#39c5bb', big ? 40 : 24, { life: 70, max: 70 });
  g.spawnProjectile(owner, {
    kind: 'miku', entity: true, x, y, vx: 0, vy: 0, life: big ? 200 : 150, r: 30,
    update(p, gg) {
      const every = big ? 14 : 20;
      if (p.t > 10 && p.t % every === 0) {
        const dir = big ? (p.t / every) % 2 ? 1 : -1 : (p.t / every) % 2 ? f.facing : -f.facing;
        Sound.play('starRod', 0.35, 1.2 + Math.random() * 0.4);
        gg.spawnProjectile(owner, {
          type: 'note', glyph: pick(['♪', '♫', '♬']), x: p.x + dir * 30, y: p.y - (big ? 200 : 90) + rand(-30, 30), vx: dir * (big ? 9 : 6), vy: 0, wave: true, life: big ? 110 : 70,
          r: big ? 20 : 13, d: big ? 5 : 3, a: 55, b: big ? 40 : 0, k: big ? 45 : 0, fkb: big ? 0 : 34, color: pick(['#39c5bb', '#e12885', '#86cecb']), noReflect: false,
        });
      }
      if (big && p.t === 180) {
        gg.flash('#39c5bb', 0.6); gg.shake(14); Sound.sfx.explosion();
        for (const t of gg.fighters) if (t !== owner && t.state !== 'dead') gg.resolveHit(owner, t, H(0, 0, 0, 0, 0, 15, 60, 95, 75, { noStale: true, unblockable: true, fx: 'flash' }), p.x, sgn(t.x - p.x) || 1);
      }
      if (p.life < 15) p.alpha = p.life / 15;
    },
    draw(ctx, p, gg) {
      const fr = 'miku' + (Math.floor(gg.frame / 6) % 7);
      const h = big ? 330 : 130;
      if (p.t < 10) { ctx.save(); ctx.globalAlpha = p.t / 10; }
      const gr = ctx.createRadialGradient(p.x, p.y - h * 0.5, 10, p.x, p.y - h * 0.5, h * 0.7);
      gr.addColorStop(0, 'rgba(57,197,187,.35)'); gr.addColorStop(1, 'transparent');
      ctx.fillStyle = gr; ctx.fillRect(p.x - h, p.y - h * 1.3, h * 2, h * 1.4);
      Items.draw(ctx, fr, p.x, p.y + 4, h, { anchorBottom: true, flip: big ? false : f.facing < 0, alpha: p.alpha ?? 1 });
      if (p.t < 10) ctx.restore();
    },
  });
}
CHARACTERS.jibaru = {
  id: 'jibaru', name: 'JIBARU', title: 'Entrenador Vocaloid',
  colors: { main: '#6e6e78', dark: '#3c3c44', accent: '#f4f4f4', pants: '#343d5c', skin: '#dca47c', glow: '#ffe23f', shirt: '#3c3c44' },
  alt: { main: '#3a78c0', dark: '#1f4a7a', accent: '#f4f4f4', pants: '#343d5c', skin: '#dca47c', glow: '#39c5bb', shirt: '#1f4a7a' },
  selectStats: { Velocidad: 7, Peso: 6, Poder: 7, Recuperación: 7, Combos: 7 },
  moveList: [
    ['Especial', '¡Yo te elijo!: Pokébola con Pokémon al azar (Pikachu, Charmander, Squirtle, Bulbasaur)'],
    ['Esp. →', 'Ataque Rápido: embestida eléctrica'],
    ['Esp. ↑', 'Vuelo: Charizard te lleva hacia arriba'],
    ['Esp. ↓', '¡Miku!: invoca a Hatsune Miku, que lanza notas musicales'],
    ['Súper', 'CONCIERTO DE MIKU'],
    ['Burla', 'Dirige un mini-concierto Vocaloid'],
  ],
  stats: {
    weight: 88, gravity: 0.8, maxFall: 10.5, fastFall: 14,
    walk: 3.8, dashInit: 8.4, dash: 7.6, run: 8, dashFrames: 12, traction: 0.44,
    jumpsquat: 4, jump: 15, shortHop: 8.8, djump: 14.5, jumpMaxVX: 7.5, airJumps: 1,
    airSpeed: 4.4, airAccel: 0.38, airFriction: 0.08, airdodge: 12, float: 0,
  },
  moves: {
    ...cloneMoves(CHARACTERS.railly.moves, NORMALS),
    jab2: { ...CHARACTERS.railly.moves.jab2 },
    dsmash: {
      frames: 46, iasa: 42, charge: 4, smash: true,
      hitboxes: [H(8, 11, 58, 12, 24, 15, 25, 28, 100), H(8, 11, -58, 12, 24, 15, 155, 28, 100)],
    },
    nspecial: {
      frames: 34, iasa: 30, landLag: 8, special: true, landKeep: true,
      update(f, sf, g) {
        if (!f.ground) f.vy = Math.min(f.vy, 3);
        if (sf === 9) {
          Sound.sfx.throw();
          g.spawnProjectile(f, {
            kind: 'ball', type: 'img', img: 'pokeball', h: 22, x: f.x + f.facing * 40, y: f.y - 80, vx: f.facing * 8, vy: -5, grav: 0.45, spin: f.facing * 0.4,
            life: 50, r: 11, d: 4, a: 50, b: 20, k: 40, bounce: 0, noReflect: true,
            onEnd(p, gg) { summonPokemon(f, p.x, Math.min(p.y + p.r, gg.stage.main.y), gg, f.facing); },
          });
          g.fx.text(f.x, f.y - 160, '¡Yo te elijo!', '#fff', 22);
        }
      },
    },
    sspecial: {
      ...CHARACTERS.railly.moves.sspecial,
      hitboxes: [H(11, 22, 10, 55, 32, 8, 70, 50, 52, { fx: 'flash' })],
      update(f, sf, g) {
        CHARACTERS.railly.moves.sspecial.update(f, sf, g);
        if (sf >= 11 && sf <= 22 && sf % 2 === 0) g.fx.p({ x: f.x + rand(-20, 20), y: f.y - rand(20, 110), vx: rand(-3, 3), vy: rand(-3, 3), life: 10, size: 3, color: '#ffe23f', kind: 'line' });
        if (sf === 11) g.fx.text(f.x, f.y - 150, '¡Ataque Rápido!', '#ffe23f', 20);
      },
    },
    uspecial: {
      frames: 60, special: true, helplessAir: true, landLag: 16, ledgeFrom: 12, slideOff: true,
      hitboxes: [H(6, 12, 0, 60, 40, 9, 80, 50, 70, { fx: 'fire' })],
      update(f, sf, g) {
        if (sf <= 5) { f.noGrav = true; f.vy = 0; f.vx *= 0.8; }
        if (sf === 6) { f.ground = null; f.y -= 2; f.vy = -18; f.fastfall = false; Sound.sfx.fire(); g.fx.text(f.x, f.y - 170, '¡Charizard, Vuelo!', '#ff8c1a', 20); }
        if (sf > 6 && sf <= 38) {
          f.noGrav = true; f.vy = Math.min(f.vy + 0.5, 2);
          f.vx = approach(f.vx, f.inp.x * 5, 0.6);
          if (sf % 3 === 0) g.fx.fire(f.x, f.y - 20, 1);
        }
      },
      drawOver(ctx, f) { if (f.sf > 4 && f.sf <= 40) Items.draw(ctx, 'charizard', f.x, f.y - 150 * SZ, 120, { flip: f.facing < 0 }); },
    },
    dspecial: {
      frames: 44, special: true, landKeep: true,
      update(f, sf, g) {
        if (!f.ground) f.vy = Math.min(f.vy, 2);
        f.vx = approach(f.vx, 0, 0.5);
        if (sf === 8) {
          if (g.countProjs(f, 'miku') === 0) spawnMiku(f, g, false);
          else { Sound.play('starRod', 0.5); g.zone(f, f.x, f.y - 60, 80, { d: 4, a: 60, b: 50, k: 30 }, 3); g.fx.shockwave(f.x, f.y - 60, '#39c5bb', 90); }
        }
      },
    },
    final: {
      frames: 130, special: true, final: true, landKeep: true,
      update(f, sf, g) {
        f.superArmor = true; f.invincible = Math.max(f.invincible, 2);
        if (!f.ground) { f.noGrav = true; f.vy = 0; }
        f.vx = approach(f.vx, 0, 0.6);
        if (sf === 1) { g.banner('CONCIERTO DE MIKU', '#39c5bb'); Sound.sfx.final(); spawnMiku(f, g, true); }
      },
    },
    taunt: {
      frames: 86, iasa: 78,
      poses: {
        wind: { crouch: 8, armF: [80, 90], armB: [70, 90], lean: 4 },
        hit: { armF: [170, 0], armB: [160, 10], lean: -6, headTilt: -8 },
      },
      anim(f, sf) {
        if (sf < 12) return { crouch: 6, armF: [60 + sf * 6, 90 - sf * 4], armB: [50 + sf * 5, 85] };
        if (sf <= 74) {
          // dirige el concierto
          const beat = Math.sin(sf * 0.45);
          return {
            crouch: Math.abs(beat) * 4,
            lean: beat * 8,
            armF: [165 + beat * 10, -5 - Math.abs(beat) * 8],
            armB: [155 - beat * 12, 5 + Math.abs(beat) * 6],
            headTilt: -6 + beat * 4,
          };
        }
      },
      update(f, sf, g) {
        f.vx = approach(f.vx, 0, 0.55);
        if (sf === 10) {
          Sound.play('starRod', 0.55, 1.2);
          g.fx.text(f.x, f.y - 155, pick(['♪ Miku Miku~', '¡concierto!', 'Vocaloid vibes', '♪ 39 39!']), '#39c5bb', 24, { life: 52, max: 52 });
        }
        if (sf > 10 && sf < 72 && sf % 5 === 0) {
          g.fx.text(f.x + rand(-50, 50), f.y - rand(80, 140), pick(['♪', '♫', '♬']), pick(['#39c5bb', '#ffe23f', '#fff']), 18, { life: 28, max: 28 });
        }
      },
    },
  },
  throws: { ...CHARACTERS.railly.throws },
};

// ---------- EDWARD: memes de gatos ----------
CHARACTERS.edward = {
  id: 'edward', name: 'EDWARD', title: 'El Memero',
  colors: { main: '#7c2630', dark: '#4a1418', accent: '#2c2c38', pants: '#587888', skin: '#e2ad86', glow: '#ff9ab0', shirt: '#4a1418' },
  alt: { main: '#44444f', dark: '#26262e', accent: '#2c2c38', pants: '#587888', skin: '#e2ad86', glow: '#c6c6ff', shirt: '#26262e' },
  selectStats: { Velocidad: 5, Peso: 8, Poder: 8, Recuperación: 6, Combos: 5 },
  moveList: [
    ['Especial', 'Meme de Gato: lanza un meme al azar (Grumpy, la señora que grita, Bongo...)'],
    ['Esp. →', 'Nyan Cat: un gato arcoíris que atraviesa todo'],
    ['Esp. ↑', 'Longcat: un gato laaargo te sube'],
    ['Esp. ↓', 'Keyboard Cat: trampa que "toca y despide" al rival'],
    ['Súper', 'LLUVIA DE MEMES'],
    ['Burla', 'Fanático de los gatos naranjas'],
  ],
  stats: {
    weight: 104, gravity: 0.7, maxFall: 10, fastFall: 13,
    walk: 3.2, dashInit: 7.4, dash: 6.8, run: 7, dashFrames: 13, traction: 0.5,
    jumpsquat: 5, jump: 13.5, shortHop: 8, djump: 13, jumpMaxVX: 6.5, airJumps: 1,
    airSpeed: 4, airAccel: 0.3, airFriction: 0.06, airdodge: 11, float: 0,
  },
  moves: {
    ...cloneMoves(CHARACTERS.anthony.moves, NORMALS),
    dsmash: {
      frames: 50, iasa: 46, charge: 6, smash: true,
      hitboxes: [H(9, 12, 54, 16, 25, 14, 30, 32, 98), H(9, 12, -54, 16, 25, 14, 150, 32, 98)],
    },
    nspecial: {
      frames: 32, iasa: 28, landLag: 8, special: true, landKeep: true,
      update(f, sf, g) {
        if (!f.ground) f.vy = Math.min(f.vy, 2.5);
        if (sf === 10) {
          Sound.sfx.whiff();
          const img = pick(CAT_MEMES);
          g.spawnProjectile(f, { kind: 'meme', type: 'meme', img, h: 58, x: f.x + f.facing * 50, y: f.y - 90, vx: f.facing * 8.5, vy: -3, grav: 0.14, spin: f.facing * 0.12, life: 80, r: 26, d: 7, a: 45, b: 32, k: 70 });
        }
      },
    },
    sspecial: {
      frames: 38, iasa: 34, landLag: 10, special: true, landKeep: true,
      update(f, sf, g) {
        if (!f.ground) f.vy = Math.min(f.vy, 2);
        f.vx = approach(f.vx, 0, 0.5);
        if (sf === 10) {
          Sound.play('rayGun', 0.6, 0.7); g.fx.text(f.x, f.y - 160, 'NYAN NYAN NYAN', '#ff9ab0', 20);
          const RB = ['#ff0000', '#ff9900', '#ffff00', '#33ff00', '#0099ff', '#6633ff'];
          g.spawnProjectile(f, {
            kind: 'nyan', type: 'img', img: 'cat_nyan', h: 60, x: f.x + f.facing * 50, y: f.y - 75, vx: f.facing * 11, vy: 0, life: 70, r: 24, d: 9, a: 30, b: 50, k: 62, pierce: true, flip: f.facing < 0,
            draw(ctx, p) {
              const len = Math.min(p.t * 11, 220), dir = sgn(p.vx);
              RB.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(dir > 0 ? p.x - 20 - len : p.x + 20, p.y - 18 + i * 6 + (Math.floor(p.t / 4) % 2) * 2, len, 6); });
              Items.draw(ctx, 'cat_nyan', p.x, p.y, 60, { flip: dir < 0 });
            },
          });
        }
      },
    },
    uspecial: {
      frames: 62, special: true, helplessAir: true, landLag: 16, ledgeFrom: 10, slideOff: true,
      update(f, sf, g) {
        if (sf <= 5) { f.noGrav = true; f.vy = 0; f.vx *= 0.8; f.mv.baseY = f.y; }
        if (sf === 6) { f.ground = null; f.y -= 2; f.vy = -16.5; f.fastfall = false; Sound.sfx.djump(); g.fx.text(f.x, f.y - 160, 'LOOOOOOONGCAT', '#fff', 20); }
        if (sf > 6 && sf <= 36) {
          f.noGrav = true; f.vy = Math.min(f.vy + 0.45, 3);
          f.vx = approach(f.vx, f.inp.x * 4, 0.5);
          if (sf % 6 === 0 && sf < 30) f.dynHB.push(H(sf, sf + 1, 0, 30, 40, 3, 90, 0, 0, { fkb: 42, g: 10 + sf }));
        }
      },
      drawOver(ctx, f) {
        if (f.sf < 6 || f.sf > 40 || f.mv.baseY === undefined) return;
        const top = f.y - 10, bot = Math.max(top + 40, f.mv.baseY + 20);
        const im = Items.img.cat_long; if (!im || !im.width) return;
        const w = 70;
        ctx.save(); ctx.globalAlpha = f.sf > 34 ? (40 - f.sf) / 6 : 1; ctx.imageSmoothingEnabled = true;
        ctx.drawImage(im, 0, 0, im.width, im.height * 0.35, f.x - w / 2, top, w, 60);
        ctx.drawImage(im, 0, im.height * 0.35, im.width, im.height * 0.3, f.x - w / 2, top + 60, w, Math.max(0, bot - top - 90));
        ctx.drawImage(im, 0, im.height * 0.65, im.width, im.height * 0.35, f.x - w / 2, bot - 30, w, 50);
        ctx.restore();
      },
    },
    dspecial: {
      frames: 40, special: true, landKeep: true,
      update(f, sf, g) {
        f.vx = approach(f.vx, 0, 0.5);
        if (!f.ground) f.vy = Math.min(f.vy, 2);
        if (sf === 10) {
          const old = g.projs.find((p) => p.owner === f && p.kind === 'kbcat'); if (old) old.life = 0;
          Sound.play('starRod', 0.5, 0.8);
          const x = f.x + f.facing * 60, y = f.ground ? f.ground.y : f.y;
          g.spawnProjectile(f, {
            kind: 'kbcat', entity: true, x, y, vx: 0, vy: 0, life: 360, r: 0, grav: f.ground ? 0 : 0.6, roll: true,
            update(p, gg) {
              if (p.t % 30 === 0) gg.fx.text(p.x + rand(-20, 20), p.y - 70, pick(['♪', '♫']), '#fff', 18, { life: 30, max: 30 });
              for (const t of gg.fighters) {
                if (t === f || t.state === 'dead' || t.isIntangible()) continue;
                const h = t.hurtbox();
                if (circleRect(p.x, p.y - 30, 40, h.x, h.y, h.w, h.h)) {
                  gg.fx.text(p.x, p.y - 110, '♪ PLAY HIM OFF ♪', '#fff', 26);
                  Sound.play('starRod', 0.8, 1); Sound.sfx.hit(1.6);
                  gg.resolveHit(f, t, H(0, 0, 0, 0, 0, 13, 70, 60, 85, { noStale: true, fx: 'flash' }), p.x, sgn(t.x - p.x) || 1);
                  p.life = 0; break;
                }
              }
            },
            draw(ctx, p) { Items.draw(ctx, 'cat_keyboard', p.x, p.y + 2, 62, { anchorBottom: true, smooth: true, alpha: p.life < 30 ? p.life / 30 : 1 }); },
          });
        }
      },
    },
    final: {
      frames: 150, special: true, final: true, landKeep: true,
      update(f, sf, g) {
        f.superArmor = true; f.invincible = Math.max(f.invincible, 2);
        if (!f.ground) { f.noGrav = true; f.vy = 0; }
        f.vx = approach(f.vx, 0, 0.6);
        if (sf === 1) { g.banner('LLUVIA DE MEMES', '#ff9ab0'); Sound.sfx.final(); }
        if (sf > 10 && sf < 120 && sf % 5 === 0) {
          const v = g.viewRect();
          const x = v.x + rand(0.05, 0.95) * v.w;
          g.spawnProjectile(f, { type: 'meme', img: pick(CAT_MEMES), h: rand(60, 110), x, y: v.y - 60, vx: rand(-2, 2), vy: rand(7, 11), spin: rand(-0.1, 0.1), life: 160, r: 40, d: 5, a: 70, b: 40, k: 55, pierce: true, noReflect: true, noClash: true });
          if (sf % 20 === 0) Sound.sfx.whiff();
        }
        if (sf === 125) {
          g.flash('#fff', 0.6); g.shake(12); Sound.sfx.explosion();
          g.fx.text(f.x, f.y - 220, '¿¡QUÉ!?', '#fff', 60, { life: 70, max: 70 });
          for (const t of g.fighters) if (t !== f && t.state !== 'dead' && !t.isIntangible()) g.resolveHit(f, t, H(0, 0, 0, 0, 0, 12, 50, 90, 70, { noStale: true, unblockable: true }), f.x, sgn(t.x - f.x) || 1);
        }
      },
      drawOver(ctx, f, g) { if (f.sf > 100 && f.sf < 140) { const v = g.viewRect(); Items.meme(ctx, 'cat_yelling', v.x + v.w / 2, v.y + v.h * 0.32, v.h * 0.3 * Math.min(1, (f.sf - 100) / 8), 0); } },
    },
    taunt: {
      frames: 86, iasa: 78,
      poses: {
        wind: { armF: [40, 70], armB: [-40, 70], crouch: 12, lean: -8, headTilt: 10 },
        hit: { armF: [130, 20], armB: [-130, 20], lean: 0, headTilt: 8, crouch: 2 },
      },
      anim(f, sf) {
        if (sf < 16) {
          // shrug
          return {
            crouch: 10,
            lean: -6,
            armF: [50 + sf * 2, 60],
            armB: [-50 - sf * 2, 60],
            headTilt: 8 + Math.sin(sf * 0.5) * 6,
          };
        }
        if (sf < 28) {
          const t = (sf - 16) / 12;
          return {
            crouch: lerp(10, 2, t),
            armF: [lerp(80, 140, t), lerp(60, 15, t)],
            armB: [lerp(-80, -140, t), lerp(60, 15, t)],
            headTilt: lerp(10, -6, t),
            lean: lerp(-6, 6, t),
          };
        }
        if (sf <= 74) {
          const bob = Math.sin(sf * 0.28) * 8;
          return {
            crouch: 2 + Math.abs(bob) * 0.3,
            armF: [135, 10 + bob * 0.4],
            armB: [-135, 10 - bob * 0.4],
            headTilt: -4 + bob * 0.3,
            lean: bob * 0.2,
          };
        }
      },
      update(f, sf, g) {
        f.vx = approach(f.vx, 0, 0.55);
        if (sf === 1) f.mv.cat = pick(['cat_bub', 'cat_grumpy', 'cat_maru']);
        if (sf === 18) {
          Sound.sfx.taunt();
          g.fx.text(f.x, f.y - 160, pick([
            '¡los gatos son lo mejor!',
            '¡mira ese gato naranja!',
            'los gatos naranjas son ley',
            '¿tienes un gato naranja?',
            'gatos naranjas >>> perros',
            'mi espíritu es un gato naranja',
          ]), '#ff9ab0', 22, { life: 52, max: 52 });
        }
        if (sf > 20 && sf < 70 && sf % 5 === 0) g.fx.sparkle(f.x + rand(-45, 45), f.y - rand(60, 140), pick(['#ff9ab0', '#ff8c1a', '#fff']));
      },
      drawOver(ctx, f) {
        if (f.sf < 16 || f.sf > 78) return;
        const t = f.sf - 16;
        const bob = Math.sin(t * 0.3) * 8;
        const a = f.sf > 70 ? (78 - f.sf) / 8 : Math.min(1, t / 6);
        Items.draw(ctx, f.mv.cat || 'cat_bub', f.x + f.facing * 52, f.y - 108 + bob, 40, { alpha: a, rot: Math.sin(t * 0.15) * 0.12 });
      },
    },
  },
  throws: { ...CHARACTERS.anthony.throws, b: { d: 11, a: 138, b: 62, k: 90 } },
};

// ---------- SHIARA: Kirby + palabrotas ----------
const SWEARS = [['¡CHANFLES!', '#ffd23f'], ['¡PIPIPI!', '#ff8ac8'], ['¡RAYOS!', '#7cf6ff']];
function throwKirby(f, g, opts = {}) {
  return g.spawnProjectile(f, Object.assign({
    kind: 'kirby', type: 'img', img: pick(['kirby', 'kirby_happy']), h: 34, x: f.x + f.facing * 40, y: f.y - 80, vx: f.facing * 7.5, vy: -6.5, grav: 0.42, bounce: 2, spin: f.facing * 0.25,
    life: 120, r: 16, d: 6, a: 50, b: 30, k: 58,
    onEnd(p, gg) { gg.fx.dust(p.x, p.y, 0, 5, '#ffc2dc'); },
  }, opts));
}
CHARACTERS.shiara = {
  id: 'shiara', name: 'SHIARA', title: 'Kirby Fan',
  colors: { main: '#ff8ac8', dark: '#b0467e', accent: '#f4f4f4', pants: '#5a5a84', skin: '#f6d2bc', glow: '#ff8ac8', shirt: '#1c1a22' },
  alt: { main: '#c0507a', dark: '#7a2448', accent: '#f4f4f4', pants: '#c0507a', skin: '#f6d2bc', glow: '#ffb0cc', shirt: '#1c1a22' },
  selectStats: { Velocidad: 7, Peso: 3, Poder: 6, Recuperación: 10, Combos: 8 },
  moveList: [
    ['Especial', 'Muñequito Kirby: lanza Kirbys que rebotan'],
    ['Esp. →', 'Kirby Rueda: un Kirby rodando por el piso'],
    ['Esp. ↑', 'Estrella Warp: vuela sobre la estrella de Kirby'],
    ['Esp. ↓', '¡CHANFLES! ¡PIPIPI! ¡RAYOS!: grita palabrotas que golpean'],
    ['Súper', 'LLUVIA DE KIRBYS · además tiene 5 saltos, como Kirby'],
    ['Burla', 'Enseña su Kirby con orgullo'],
  ],
  stats: {
    weight: 72, gravity: 0.6, maxFall: 8.5, fastFall: 12,
    walk: 3.6, dashInit: 8, dash: 7.3, run: 7.5, dashFrames: 12, traction: 0.45,
    jumpsquat: 4, jump: 13, shortHop: 7.8, djump: 10.5, jumpMaxVX: 7, airJumps: 4,
    airSpeed: 4.6, airAccel: 0.36, airFriction: 0.06, airdodge: 11, float: 0,
  },
  moves: {
    jab: { frames: 18, iasa: 16, next: 'jab2', nextWin: [6, 18], hitboxes: [H(3, 5, 42, 64, 18, 3, 60, 10, 45)] },
    jab2: { frames: 22, iasa: 20, hitboxes: [H(3, 5, 46, 62, 20, 5, 40, 28, 85)] },
    ftilt: { frames: 26, iasa: 24, hitboxes: [H(5, 8, 58, 48, 22, 9, 35, 22, 95)] },
    utilt: { frames: 24, iasa: 22, hitboxes: [H(5, 10, 18, 112, 24, 9, 92, 30, 105)] },
    dtilt: { frames: 22, iasa: 20, crouchMove: true, hitboxes: [H(5, 8, 58, 12, 20, 8, 75, 40, 75)] },
    dashattack: { frames: 34, slideOff: true, hitboxes: [H(5, 10, 44, 50, 26, 10, 50, 40, 70), H(11, 20, 44, 50, 20, 6, 50, 30, 60)],
      update(f, sf) { if (sf < 16) f.vx = f.facing * Math.max(Math.abs(f.vx) * 0.97, 5.5); else f.vx = approach(f.vx, 0, 0.6); } },
    fsmash: { frames: 46, iasa: 42, charge: 8, smash: true, hitboxes: [H(12, 15, 70, 55, 24, 16, 38, 32, 104), H(12, 15, 42, 55, 20, 14, 40, 28, 100)] },
    usmash: { frames: 42, iasa: 40, charge: 6, smash: true, hitboxes: [H(9, 16, 10, 112, 32, 15, 88, 30, 108)] },
    dsmash: { frames: 44, iasa: 40, charge: 4, smash: true, hitboxes: [H(8, 11, 58, 15, 26, 14, 28, 30, 98), H(8, 11, -58, 15, 26, 14, 152, 30, 98)] },
    nair: { frames: 38, aerial: true, landLag: 12, hitboxes: [H(3, 7, 0, 55, 34, 10, 50, 24, 90), H(8, 24, 0, 55, 30, 6, 50, 16, 76)] },
    fair: { frames: 34, aerial: true, landLag: 16, hitboxes: [H(6, 9, 56, 52, 22, 12, 42, 28, 98)] },
    bair: { frames: 30, aerial: true, landLag: 14, hitboxes: [H(5, 9, -54, 52, 23, 13, 142, 24, 100)] },
    uair: { frames: 32, aerial: true, landLag: 14, hitboxes: [H(5, 10, 0, 118, 28, 11, 88, 28, 100)] },
    dair: { frames: 40, aerial: true, landLag: 20, hitboxes: [H(9, 12, 10, 10, 24, 13, 285, 22, 92, { fx: 'meteor' })] },
    nspecial: {
      frames: 30, iasa: 26, landLag: 8, special: true, landKeep: true,
      update(f, sf, g) {
        if (!f.ground) f.vy = Math.min(f.vy, 2.5);
        if (sf === 8) {
          if (g.countProjs(f, 'kirby') >= 3) { g.fx.text(f.x, f.y - 150, '¡no más Kirbys!', '#ff8ac8', 16); return; }
          Sound.sfx.throw(); Sound.play('jump', 0.5, 1.6);
          throwKirby(f, g);
        }
      },
    },
    sspecial: {
      frames: 36, iasa: 32, landLag: 10, special: true, landKeep: true,
      update(f, sf, g) {
        f.vx = approach(f.vx, 0, 0.5);
        if (!f.ground) f.vy = Math.min(f.vy, 2);
        if (sf === 8) {
          if (g.countProjs(f, 'kball') >= 1) return;
          Sound.sfx.roll();
          g.spawnProjectile(f, {
            kind: 'kball', type: 'img', frames: ['kirby_ball0', 'kirby_ball1', 'kirby_ball2', 'kirby_ball3'], fspd: 3, h: 42, flip: f.facing < 0,
            x: f.x + f.facing * 40, y: f.y - 22, vx: f.facing * 8.5, vy: 0, grav: 0.6, roll: true, life: 110, r: 20,
            d: 8, a: 35, b: 45, k: 62, pierce: true, noReflect: true,
          });
        }
      },
    },
    uspecial: {
      frames: 60, special: true, helplessAir: true, landLag: 14, ledgeFrom: 8, slideOff: true,
      hitboxes: [H(6, 30, 0, 20, 36, 9, 70, 45, 70, { g: 1 })],
      update(f, sf, g) {
        const mv = f.mv;
        if (sf <= 5) { f.noGrav = true; f.vy = 0; f.vx *= 0.7; }
        if (sf === 6) {
          let dx = f.inp.x, dy = f.inp.y; if (Math.hypot(dx, dy) < 0.3) { dx = 0; dy = 1; }
          const m = Math.hypot(dx, dy); mv.dx = dx / m; mv.dy = Math.max(0.2, dy / m);
          if (mv.dx) f.facing = sgn(mv.dx);
          f.ground = null; f.y -= 2; Sound.play('coin', 0.6, 1.4); g.fx.text(f.x, f.y - 160, '★ ¡Estrella Warp! ★', '#ffe23f', 20);
        }
        if (sf > 6 && sf <= 34) {
          f.noGrav = true; f.vx = mv.dx * 13; f.vy = -mv.dy * 13;
          if (sf % 2 === 0) g.fx.sparkle(f.x - f.facing * 30, f.y + 10, pick(['#ffe23f', '#fff', '#ff8ac8']));
        }
        if (sf > 34) { f.vx *= 0.9; f.vy *= 0.8; }
      },
      drawOver(ctx, f) { if (f.sf > 3 && f.sf <= 38) Items.draw(ctx, 'kirby_star', f.x, f.y + 18, 46, { flip: f.facing < 0 }); },
    },
    dspecial: {
      frames: 44, special: true, landKeep: true,
      update(f, sf, g) {
        f.vx = approach(f.vx, 0, 0.5);
        if (!f.ground) f.vy = Math.min(f.vy, 1.5);
        if (sf === 10) {
          const words = [...SWEARS].sort(() => Math.random() - 0.5);
          Sound.sfx.hit(1.2); g.shake(6);
          Sound.say(words[0][0].replace(/[¡!]/g, ''), 1.3);
          const dirs = [[f.facing, 0], [f.facing * 0.7, -0.7], [-f.facing, -0.2]];
          words.forEach(([w, c], i) => {
            g.spawnProjectile(f, { type: 'text', text: w, color: c, size: 30, x: f.x + dirs[i][0] * 40, y: f.y - 80 + dirs[i][1] * 40, vx: dirs[i][0] * 6, vy: dirs[i][1] * 6, rot: rand(-0.2, 0.2), life: 42, r: 28, d: 5, a: 45, b: 0, k: 0, fkb: 58, dir: sgn(dirs[i][0]) || f.facing, noReflect: true, noClash: true });
          });
          g.fx.shockwave(f.x, f.y - 70, '#ffd23f', 110);
        }
      },
    },
    final: {
      frames: 150, special: true, final: true, landKeep: true,
      update(f, sf, g) {
        f.superArmor = true; f.invincible = Math.max(f.invincible, 2);
        if (!f.ground) { f.noGrav = true; f.vy = 0; }
        f.vx = approach(f.vx, 0, 0.6);
        if (sf === 1) { g.banner('LLUVIA DE KIRBYS', '#ff8ac8'); Sound.sfx.final(); Sound.say('poyo', 1.4); }
        if (sf > 8 && sf < 110 && sf % 4 === 0) {
          const v = g.viewRect();
          g.spawnProjectile(f, { kind: 'rain', type: 'img', img: pick(['kirby', 'kirby_happy']), h: 36, x: v.x + rand(0.05, 0.95) * v.w, y: v.y - 40, vx: rand(-1.5, 1.5), vy: rand(4, 7), grav: 0.3, bounce: 1, spin: rand(-0.2, 0.2), life: 150, r: 18, d: 4, a: 60, b: 30, k: 40, pierce: true, noReflect: true, noClash: true });
        }
        if (sf === 112) {
          const tg = g.fighters.find((t) => t !== f && t.state !== 'dead') || f;
          g.spawnProjectile(f, { type: 'img', img: 'kirby_big', h: 180, x: tg.x, y: g.viewRect().y - 100, vx: 0, vy: 14, grav: 0.8, life: 60, r: 80, d: 16, a: 65, b: 95, k: 80, pierce: true, noReflect: true, noClash: true,
            onHit(p, t, gg) { gg.fx.text(p.x, p.y - 120, '¡POYO!', '#ff8ac8', 48, { life: 60, max: 60 }); gg.shake(16); } });
        }
      },
    },
    taunt: {
      frames: 92, iasa: 84,
      poses: {
        wind: { crouch: 16, armF: [70, 110], armB: [60, 100], lean: -10 },
        hit: { crouch: 4, armF: [158, -5], armB: [148, 5], lean: -6, headTilt: -16 },
      },
      anim(f, sf) {
        if (sf < 8) return null;
        if (sf <= 78) {
          const bob = Math.abs(Math.sin((sf - 8) * 0.38)) * 12;
          return {
            crouch: 2 + bob,
            lean: Math.sin(sf * 0.48) * 10,
            armF: [158, -8 - bob * 1.5],
            armB: [148, -4 - bob],
            headTilt: -12 - bob * 0.4,
          };
        }
      },
      update(f, sf, g) {
        f.vx = approach(f.vx, 0, 0.55);
        if (sf === 6) {
          Sound.sfx.taunt();
          g.fx.text(f.x, f.y - 175, pick([
            '¡mira mi Kirby!',
            'amo el rosa',
            'Kirby fan #1',
            '¿no es adorable?',
            'todo se ve mejor si tiene rosa',
            'el mejor de todos',
          ]), '#ff8ac8', 24, { life: 52, max: 52 });
        }
        if (sf > 8 && sf < 82 && sf % 4 === 0) {
          g.fx.sparkle(f.x + rand(-55, 55), f.y - rand(55, 150), pick(['#ff8ac8', '#ffe23f', '#fff', '#ffb0cc']));
        }
      },
      drawOver(ctx, f) {
        if (f.sf < 5 || f.sf > 86) return;
        const t = f.sf - 5;
        const bob = Math.sin(t * 0.35) * 10;
        const spin = Math.sin(t * 0.2) * 0.15;
        const alpha = f.sf > 78 ? (86 - f.sf) / 8 : Math.min(1, t / 5);
        const h = 46 + Math.sin(t * 0.4) * 5;
        Items.draw(ctx, 'kirby_happy', f.x + f.facing * 42, f.y - 100 + bob, h, { flip: f.facing < 0, alpha, rot: spin });
        Items.draw(ctx, 'kirby_star', f.x - f.facing * 48, f.y - 128 + bob * 0.6, 24 + Math.sin(t * 0.5) * 3, {
          alpha: alpha * 0.95, rot: t * 0.12,
        });
        if (t > 20 && t % 14 < 7) {
          Items.draw(ctx, 'kirby_star', f.x + f.facing * 70, f.y - 70 - bob, 16, { alpha: alpha * 0.7, rot: -t * 0.15 });
        }
      },
    },
  },
  throws: {
    f: { d: 8, a: 42, b: 60, k: 62 },
    b: { d: 9, a: 138, b: 60, k: 75 },
    u: { d: 7, a: 90, b: 70, k: 60 },
    d: { d: 5, a: 78, b: 55, k: 50 },
  },
};

// Completa las definiciones: movimientos comunes, frames activos para animación
for (const id in CHARACTERS) {
  const c = CHARACTERS[id];
  for (const k in COMMON_MOVES) if (!c.moves[k]) c.moves[k] = COMMON_MOVES[k];
  for (const k in c.moves) {
    const m = c.moves[k];
    m.id = k;
    const hbs = m.hitboxes || [];
    m.as = hbs.length ? Math.min(...hbs.map((h) => h.s)) : Math.floor(m.frames * 0.3);
    m.ae = hbs.length ? Math.max(...hbs.map((h) => h.e)) : Math.floor(m.frames * 0.55);
    if (m.charge) m.as = Math.max(m.as, m.charge + 1);
  }
}
