// ---------- Audio: efectos y locutor de Melee (js/sfxdata.js) + música (assets/music) ----------
const Sound = (() => {
  let ctx = null, master = null, sfxBus = null;
  const buffers = {};
  let musicOn = true, music = null, musicName = null;
  const MUSIC_VOL = 0.45;

  function b64ToBuf(dataUrl) {
    const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8.buffer;
  }
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); if (music && musicOn && music.paused) music.play().catch(() => {}); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    if (typeof SFX_DATA !== 'undefined') {
      for (const k in SFX_DATA) {
        ctx.decodeAudioData(b64ToBuf(SFX_DATA[k])).then((b) => { buffers[k] = b; }).catch(() => {});
      }
    }
    if (musicName && musicOn) playMusic(musicName, true);
  }
  function play(name, vol = 1, rate = 1) {
    if (!ctx || !buffers[name]) return;
    const s = ctx.createBufferSource(); s.buffer = buffers[name]; s.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = vol;
    s.connect(g); g.connect(sfxBus); s.start();
  }
  function tone(freq, dur, vol = 0.1) {
    if (!ctx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur);
  }
  const r = (a, b) => a + Math.random() * (b - a);

  const sfx = {
    hit(power = 1, type) {
      if (type === 'fire') return play(power < 0.8 ? 'fireS' : power < 1.8 ? 'fireM' : 'fireL', 0.9);
      if (type === 'flash' || type === 'beam' || type === 'shine') return play(power < 1.5 ? 'elec' : 'hitLarge', 0.9);
      if (power < 0.45) play('hitWeak', 0.8, r(0.95, 1.05));
      else if (power < 1) play('hitSmall', 0.9, r(0.95, 1.05));
      else if (power < 1.8) play('hitMed', 1);
      else { play('hitLarge', 1); if (power > 2.4) play('homerun', 0.6); }
    },
    whiff() { play(Math.random() < 0.5 ? 'swing1' : 'swing2', 0.5, r(0.9, 1.1)); },
    heavyWhiff() { play('heavySwing', 0.5); },
    shield() { play('clang', 0.45, 1.2); },
    shieldUp() { play('shieldUp', 0.4); },
    parry() { play('powershield', 1); },
    shieldBreak() { play('shieldBreak', 1); },
    jump() { play('jump', 0.6); },
    djump() { play('jump', 0.6, 1.15); },
    land() { play('land', 0.5); },
    dash() { play('dash', 0.5); },
    airdodge() { play('spotdodge', 0.6); },
    roll() { play('roll', 0.6); },
    wavedash() { play('dash', 0.5, 1.2); },
    lcancel() { tone(1760, 0.05, 0.05); },
    tech() { play('tech', 0.8); },
    ledge() { play('tech', 0.6, 0.9); },
    fastfall() { play('fastfall', 0.5); },
    laser() { play('rayGun', 0.55, r(1.0, 1.1)); },
    beam() { play('beamSword', 0.9); },
    shine() { play('reflect', 0.7, 1.3); },
    reflect() { play('reflect', 0.9); },
    fire() { play('fireM', 0.5, 1.2); },
    peace() { play('starRod', 0.8); },
    counter() { play('powershield', 1); play('elec', 0.7); },
    grab() { play('grab', 0.8); },
    grabMiss() { play('grabMiss', 0.5); },
    throw() { play('heavySwing', 0.7); },
    ko(bottom) { play(bottom ? 'blastBottom' : 'blastSide', 1); },
    starKO() { play('starKO', 1); },
    charge() { play('charge', 0.5); },
    smashReady() { play('coin', 0.9); },
    final() { play('appear', 1); play('explosion', 0.6); },
    fatal() { play('homerun', 1); },
    select() { play('menuEnter', 0.8); },
    move() { play('menuScroll', 0.6); },
    back() { play('menuBack', 0.7); },
    pause() { play('pause', 0.8); },
    medallion() { play('medallion', 0.8); },
    taunt() { play('medallion', 0.55, 1.15); },
    results() { play('results', 0.8); },
    appear() { play('appear', 0.7); },
    explosion() { play('explosion', 0.9); },
  };

  // Voz sintetizada (para las palabrotas de Shiara, etc.)
  function say(text, pitch = 1.2) {
    try {
      if (!window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(text);
      const v = speechSynthesis.getVoices().find((x) => /^es/i.test(x.lang));
      if (v) u.voice = v;
      u.lang = 'es-ES'; u.pitch = pitch; u.rate = 1.15; u.volume = 1;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { /* sin voz */ }
  }
  // Locutor: 'three','two','one','go','game','winnerIs','choose','name_railly', ...
  function voice(key, vol = 1) { play(key, vol); }

  // Música con <audio> (funciona abriendo el HTML directo)
  function playMusic(name, force) {
    if (musicName === name && music && !force) { if (musicOn && music.paused && ctx) music.play().catch(() => {}); return; }
    stopMusic();
    musicName = name;
    if (!name) return;
    music = new window.Audio('assets/music/' + name + '.mp3');
    music.loop = !/^victory/.test(name);
    music.volume = MUSIC_VOL;
    if (musicOn && ctx) music.play().catch(() => {});
  }
  function stopMusic() { if (music) { music.pause(); music = null; } musicName = null; }
  function toggleMusic() {
    musicOn = !musicOn;
    if (music) { if (musicOn) music.play().catch(() => {}); else music.pause(); }
    return musicOn;
  }
  function duckMusic(v) { if (music) music.volume = MUSIC_VOL * v; }

  return { init, play, sfx, voice, say, playMusic, stopMusic, toggleMusic, duckMusic, get musicOn() { return musicOn; } };
})();
