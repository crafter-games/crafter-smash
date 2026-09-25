# Crafter Smash

Juego de pelea 2D estilo **Super Smash Flash** (sprites en pixel art, física inspirada en Melee), hecho en HTML5 Canvas. No tiene dependencias ni build.

## Personajes
| | Base de sprite | Especiales |
|---|---|---|
| **Railly** | Scott Pilgrim | ▲ Vercel Blaster, Deploy Dash, Commit Push, Espejo (shine) · smash ↓ **Codex** (terminales de OpenAI) · Súper: ▲ Deploy a producción · Burla: ▲ ship it |
| **Anthony** (Cueva) | Stephen Stills | Paz y Amor ✌️, Lentes Láser, Salto Zen, Flash de Selfie · smash → con **martillo de ingeniero** · smash ↓ **push-ups** · Súper: Foto grupal · Burla: paz y amor |
| **Jibaru** | Scott Pilgrim | Pokébola (Pikachu / Charmander / Squirtle / Bulbasaur), Ataque Rápido, Vuelo con Charizard, **invoca a Miku** · Súper: Concierto de Miku · Burla: mini-concierto Vocaloid |
| **Shiara** | Knives Chau | **Muñequitos Kirby**, Kirby rueda, Estrella Warp, **¡CHANFLES! ¡PIPIPI! ¡RAYOS!** · 5 saltos · Súper: Lluvia de Kirbys · Burla: enseña su Kirby |
| **Edward** | Stephen Stills | **Memes de gatos**, Nyan Cat, Longcat, Keyboard Cat · Súper: Lluvia de memes · Burla: fan de gatos naranjas |

## Cómo jugar
Abre `index.html` en el navegador (doble clic o `open index.html`). Funciona directo desde el archivo.

- **Modos:** 1P vs CPU (niveles 1–9), 2 jugadores local, Entrenamiento.
- **Selección estilo Smash:** mueve tu cursor (P1 `WASD`, P2 flechas), coloca tu ficha con ataque (`F` / `K` por defecto), suéltala con especial (`G` / `L`). Con el mouse: clic = P1, clic derecho = P2; clic en la etiqueta del panel alterna CPU/Jugador. `Enter` cuando aparezca «¡LISTOS PARA PELEAR!».
- **Escenarios:** Templo Crafter (tipo Battlefield), Destino Final y Azotea Lima (con plataforma móvil).
- **Mandos:** soportados vía Gamepad API (el mando 1 es P1 y el mando 2 es P2). Select = burla.
- **Controles:** en el menú **CONTROLES Y TÉCNICAS** puedes **reasignar teclas** (clic en una tecla → pulsa la nueva). No se permiten duplicados. También hay **Saltar con Arriba** (tap jump) ON/OFF por jugador. Los cambios se guardan en el navegador.

### Teclas por defecto

| | P1 | P2 |
|---|---|---|
| Mover | WASD | Flechas |
| Saltar | Espacio | J |
| Ataque | F | K |
| Especial | G | L |
| Escudo / Esquiva | H | Ñ (;) |
| Agarre | R | I |
| Burla | V | O |

`Esc`/`P` pausa · `Tab` muestra hitboxes · `M` silencia la música. En Entrenamiento: `T` reinicia, `Y` cambia el muñeco, `U` llena el súper.

## Mecánicas
Porcentaje de daño + knockback con la fórmula de Melee, hitlag, DI, tumble, tech (en piso y pared), L-cancel, wavedash/waveland,
short hop, fast fall, dash dance, airdodge direccional, parry (powershield), escudo que se rompe (mareo), crouch cancel,
agarres/pummel/lanzamientos, bordes con invencibilidad y ledgehog, staling de movimientos, rebote al caer y proyectiles reflejables.
Hay además una barra de súper con un Smash Final por personaje, el efecto de "golpe fatal" en cámara lenta, y **burlas** por personaje (solo en idle/walk/crouch).

## Sprites
Los personajes usan como base los sprites de **Scott Pilgrim** (Railly, Jibaru), **Stephen Stills** (Anthony, Edward) y **Knives Chau** (Shiara) de
*Scott Pilgrim vs. the World: The Game* (© Ubisoft; ripeados por Maverick PK en [The Spriters Resource](https://www.spriters-resource.com/xbox_360/scottpilgrimvstheworldthegame/)).
Se recolorearon (ropa, piel y pelo) y se editaron las caras (barba para Railly, lentes para Anthony).
Para regenerarlos: `cd tools/sheets && python3 build_sprites.py` (requiere `pillow`, `numpy` y `scipy`). Ahí mismo se definen
qué frames usa cada animación y ataque (`ANIMS`) y las paletas (`PAL`).

Ítems: Kirby (*Kirby Super Star*, © Nintendo/HAL), Pokémon ([PokeAPI/sprites](https://github.com/PokeAPI/sprites), © Nintendo/Game Freak),
Hatsune Miku (*Grand Summoners*, © Crypton / NextNinja) y memes de gatos desde Wikipedia/Wikimedia Commons.

## Audio
Los efectos de sonido, el locutor y la música son los originales de *Super Smash Bros. Melee* (© Nintendo / HAL Laboratory), descargados de
[The Sounds Resource](https://www.sounds-resource.com/gamecube/ssbm/) y [KHInsider](https://downloads.khinsider.com/game-soundtracks/album/super-smash-bros.-melee-original-sound-version).
Igual que los sprites, son **solo para uso local y personal**: no publiques el juego con ellos. Las llamadas "RAILLY!" / "ANTHONY!" se generaron con la voz del sistema.

## Estructura
- `js/sprites.js` + `js/spritedata.js` + `assets/sprites/`: animación por sprites (elige el frame según estado y sincroniza el golpe con la hitbox)
- `js/characters.js`: stats y movimientos (hitboxes, frames, poses) de cada personaje
- `js/fighter.js`: máquina de estados, física y dibujo del luchador
- `js/game.js`: loop, cámara, resolución de golpes, KOs y HUD
- `js/input.js`: teclado, mandos, mapas de teclas y opciones (tap jump)
- `js/menu.js`: menús DOM, remapeo de controles y selección de personaje
- `js/ai.js`: CPU · `js/stages.js`: escenarios · `js/effects.js`: partículas · `js/audio.js`: SFX, música y locutor · `js/sfxdata.js`: sonidos empaquetados · `assets/music/`: música
