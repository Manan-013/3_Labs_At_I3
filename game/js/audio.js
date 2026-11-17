// ===== All sound is synthesized with the Web Audio API (no audio files) =====
const Sfx = (() => {
  let ctx = null, master = null, noiseBuf = null, revIn = null;
  let ambience = null, lightHum = null, deadlockHum = null, tick = null, breath = null, heart = null;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // big empty-hall reverb: generated impulse response (decaying stereo noise)
    const len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = ir.getChannelData(c);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6) * (i < 400 ? i / 400 : 1);
    }
    const conv = ctx.createConvolver(); conv.buffer = ir;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3200;
    const revOut = ctx.createGain(); revOut.gain.value = 0.9;
    revIn = ctx.createGain();
    revIn.connect(lp).connect(conv).connect(revOut).connect(master);
  }
  function resume() { if (ctx && ctx.state === "suspended") ctx.resume(); }
  const now = () => ctx.currentTime;

  // every sound goes dry to the speakers + a "wet" share into the hall reverb
  function out(pan = 0, vol = 1, wet = 0.12) {
    const g = ctx.createGain(); g.gain.value = vol;
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    g.connect(p).connect(master);
    if (wet > 0) { const s = ctx.createGain(); s.gain.value = wet; p.connect(s).connect(revIn); }
    return g;
  }
  function noise(dur, { type = "lowpass", freq = 800, q = 1, vol = 0.5, pan = 0, attack = 0.005, at = 0, sweepTo = null, wet = 0.12 } = {}) {
    if (!ctx) return;
    const t = now() + at;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out(pan, 1, wet));
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  function tone(freq, dur, { type = "sine", vol = 0.3, pan = 0, at = 0, slideTo = null, attack = 0.01, wet = 0.12 } = {}) {
    if (!ctx) return;
    const t = now() + at;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out(pan, 1, wet));
    o.start(t); o.stop(t + dur + 0.05);
  }

  // ---------- creepy voice & lullaby ----------
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // a hummed "ooo" vowel: two detuned oscillators through vowel formants, with vibrato
  function hum(freq, dur, { at = 0, vol = 0.2, pan = 0, wet = 0.6, child = true, drift = 0 } = {}) {
    if (!ctx) return;
    const t = now() + at;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.12, dur * 0.3));
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f1 = ctx.createBiquadFilter(); f1.type = "bandpass"; f1.frequency.value = child ? 420 : 320; f1.Q.value = 5;
    const f2 = ctx.createBiquadFilter(); f2.type = "bandpass"; f2.frequency.value = child ? 1000 : 800; f2.Q.value = 6;
    const mixG = ctx.createGain(); mixG.gain.value = 3.5;
    f1.connect(mixG); f2.connect(mixG); mixG.connect(g).connect(out(pan, 1, wet));
    const vib = ctx.createOscillator(); vib.frequency.value = 5.2;
    const vibG = ctx.createGain(); vibG.gain.value = freq * 0.012;
    vib.connect(vibG);
    [0, 6].forEach((det) => {
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(freq, t); o.detune.value = det;
      if (drift) o.frequency.linearRampToValueAtTime(freq * (1 + drift), t + dur);
      vibG.connect(o.frequency);
      o.connect(f1); o.connect(f2);
      o.start(t); o.stop(t + dur + 0.05);
    });
    vib.start(t); vib.stop(t + dur + 0.05);
  }
  function boxNote(freq, dur, { at = 0, vol = 0.1, pan = 0, wet = 0.4 } = {}) {
    tone(freq, dur, { type: "triangle", vol, pan, at, wet, attack: 0.004 });
    tone(freq * 2.01, dur * 0.5, { type: "sine", vol: vol * 0.35, pan, at, wet, attack: 0.002 });
    tone(freq * 3.98, 0.15, { type: "sine", vol: vol * 0.15, pan, at, wet, attack: 0.001 });
  }
  // An original, slow nursery-style tune in A minor (3/4). [midi note, beats]; 0 = rest
  const LULLABY = [
    [76, 1], [72, 1], [76, 1], [69, 2], [71, 1], [72, 1], [71, 1], [68, 3],
    [69, 1], [64, 1], [69, 1], [72, 2], [71, 1], [69, 3], [0, 1],
    [76, 1], [74, 1], [72, 1], [71, 2], [69, 1], [72, 1], [71, 1], [68, 1], [69, 3],
  ];
  let lullabyBusy = 0;
  // voice: "child" humming, "box" music box, or "both". slow: tape dies at the end.
  function lullaby({ vol = 0.18, pan = 0, voice = "both", wet = 0.65, beat = 0.48, notes = LULLABY.length, slow = false, startAt = 0 } = {}) {
    if (!ctx) return 0;
    let t = 0;
    const seq = LULLABY.slice(startAt, startAt + notes);
    seq.forEach(([m, beats], i) => {
      const k = slow ? 1 + Math.pow(i / seq.length, 2) * 1.6 : 1;   // tape slowing down
      const bendDown = slow ? Math.pow(i / seq.length, 2) * 0.25 : 0;
      const d = beats * beat * k;
      if (m) {
        const f = mtof(m) * (1 - bendDown) * (1 + (Math.random() - 0.5) * 0.01);
        if (voice !== "box") hum(f, d * 0.95, { at: t, vol, pan, wet, drift: slow ? -0.04 : 0 });
        if (voice !== "child") boxNote(f * 2, Math.max(0.6, d), { at: t, vol: vol * 0.55, pan, wet });
      }
      t += d;
    });
    lullabyBusy = now() + t;
    return t;
  }
  const lullabyPlaying = () => ctx && now() < lullabyBusy;

  // ---------- loops ----------
  function startAmbience() {
    if (!ctx || ambience) return;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.22, now() + 3);
    g.connect(master);
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 180; f.connect(g);
    const oscs = [43.6, 44.1, 65.4].map((fr) => { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = fr; o.connect(f); o.start(); return o; });
    // ventilation hiss
    const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = "bandpass"; nf.frequency.value = 400; nf.Q.value = 0.6;
    const ng = ctx.createGain(); ng.gain.value = 0.05;
    n.connect(nf).connect(ng).connect(g); n.start();
    // slow wobble
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lg = ctx.createGain(); lg.gain.value = 60;
    lfo.connect(lg).connect(f.frequency); lfo.start();
    ambience = { g, nodes: [...oscs, n, lfo] };
  }
  function stopLoop(l, fade = 0.3) {
    if (!l) return null;
    l.g.gain.cancelScheduledValues(now());
    l.g.gain.setTargetAtTime(0.0001, now(), fade / 3);
    setTimeout(() => l.nodes.forEach((n) => { try { n.stop(); } catch (e) {} }), fade * 1000 + 200);
    return null;
  }
  function stopAmbience() { ambience = stopLoop(ambience, 0.1); }

  function setLightHum(on, pan) {
    if (!ctx) return;
    if (on && !lightHum) {
      const g = ctx.createGain(); g.gain.value = 0.05;
      const p = ctx.createStereoPanner(); p.pan.value = pan;
      g.connect(p).connect(master);
      const o = ctx.createOscillator(); o.type = "square"; o.frequency.value = 100;
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
      o.connect(f).connect(g); o.start();
      lightHum = { g, nodes: [o] };
    } else if (!on && lightHum) lightHum = stopLoop(lightHum, 0.05);
  }
  function setDeadlockHum(level) {   // 0..1, sub-bass presence at the right door
    if (!ctx) return;
    if (level > 0 && !deadlockHum) {
      const g = ctx.createGain(); g.gain.value = 0.0001;
      const p = ctx.createStereoPanner(); p.pan.value = 0.8;
      g.connect(p).connect(master);
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = 38;
      const o2 = ctx.createOscillator(); o2.type = "triangle"; o2.frequency.value = 57.3;
      o.connect(g); o2.connect(g); o.start(); o2.start();
      deadlockHum = { g, nodes: [o, o2] };
    }
    if (deadlockHum) {
      deadlockHum.g.gain.setTargetAtTime(Math.max(0.0001, level * 0.35), now(), 0.4);
      if (level <= 0) deadlockHum = stopLoop(deadlockHum, 0.8);
    }
  }
  function setTick(on) {  // watchdog alarm ticking
    if (on && !tick && ctx) {
      tick = setInterval(() => { tone(1800, 0.05, { type: "square", vol: 0.06 }); tone(900, 0.08, { type: "square", vol: 0.04, at: 0.25 }); }, 500);
    } else if (!on && tick) { clearInterval(tick); tick = null; }
  }
  // slow wet breathing right outside a door (pan -1 left .. 1 right), 0 = stop
  function setBreathing(level, pan = -0.85) {
    if (!ctx) return;
    if (level > 0 && !breath) {
      const loop = () => {
        if (!breath) return;
        const v = breath.level;
        noise(1.3, { type: "bandpass", freq: 650, q: 1.2, vol: 0.16 * v, pan: breath.pan, attack: 0.6, wet: 0.25 });          // in
        noise(1.7, { type: "bandpass", freq: 420, q: 1.0, vol: 0.2 * v, pan: breath.pan, attack: 0.25, at: 1.5, wet: 0.25 });  // out
        if (Math.random() < 0.3) tone(70, 1.2, { type: "sawtooth", vol: 0.03 * v, pan: breath.pan, at: 1.5, wet: 0.2 });       // mechanical rasp
        breath.timer = setTimeout(loop, 3600 + Math.random() * 900);
      };
      breath = { level, pan, timer: null };
      loop();
    } else if (breath) {
      breath.level = level; breath.pan = pan;
      if (level <= 0) { clearTimeout(breath.timer); breath = null; }
    }
  }
  // heartbeat that speeds up as fear rises (0 = stop, 1 = panic)
  function setHeartbeat(fear) {
    if (!ctx) return;
    if (fear <= 0) { if (heart) { clearTimeout(heart.timer); heart = null; } return; }
    if (!heart) {
      heart = { fear, timer: null };
      const beat = () => {
        if (!heart) return;
        tone(52, 0.18, { vol: 0.5 * (0.4 + heart.fear * 0.6), wet: 0.05 });
        tone(46, 0.2, { vol: 0.35 * (0.4 + heart.fear * 0.6), at: 0.22, wet: 0.05 });
        heart.timer = setTimeout(beat, 1100 - heart.fear * 600);
      };
      beat();
    }
    heart.fear = fear;
  }
  // ---------- intro score: an original slow, dark tune for the walk to the lab ----------
  // Detuned pad gliding through a minor progression, a slow sub-bass pulse, sparse reverb bells,
  // and a rising noise swell now and then. Kept quiet so the narration sits on top.
  let intro = null;
  function startIntroMusic(vol = 0.11) {
    if (!ctx || intro) return;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(vol, now() + 5);
    g.connect(master);
    const send = ctx.createGain(); send.gain.value = 0.5; g.connect(send).connect(revIn);
    // pad: 3 voices x 2 detuned saws through a slowly breathing low-pass
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 520; lp.Q.value = 2;
    const padG = ctx.createGain(); padG.gain.value = 0.32; lp.connect(padG).connect(g);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05;
    const lfoG = ctx.createGain(); lfoG.gain.value = 260; lfo.connect(lfoG).connect(lp.frequency); lfo.start();
    // Am, F, Dm, E(major: the creepy turn) as [bass, mid, top] MIDI notes
    const CHORDS = [[45, 52, 60], [41, 48, 57], [38, 45, 53], [40, 47, 56]];
    const voices = [0, 1, 2].map((v) => [-7, 7].map((det) => {
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.detune.value = det;
      o.frequency.value = mtof(CHORDS[0][v]); o.connect(lp); o.start(); return o;
    }));
    let ci = 0;
    const chordTimer = setInterval(() => {
      ci = (ci + 1) % CHORDS.length;
      voices.forEach((pair, v) => pair.forEach((o) => o.frequency.setTargetAtTime(mtof(CHORDS[ci][v]), now(), 1.2)));
      sub.frequency.setTargetAtTime(mtof(CHORDS[ci][0] - 12), now(), 0.8);
    }, 8000);
    // sub-bass pulse, slow like a distant heartbeat of the building
    const sub = ctx.createOscillator(); sub.type = "sine"; sub.frequency.value = mtof(33);
    const subG = ctx.createGain(); subG.gain.value = 0.0001; sub.connect(subG).connect(g); sub.start();
    const pulseTimer = setInterval(() => {
      const t = now();
      subG.gain.cancelScheduledValues(t);
      subG.gain.setValueAtTime(0.0001, t); subG.gain.exponentialRampToValueAtTime(0.55, t + 0.08); subG.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    }, 2600);
    // sparse bell motif (original), long reverb tails, sometimes slightly out of tune
    const MOTIF = [81, 84, 83, 80, 81, 76, 77, 76, 0, 72, 74, 76, 0, 0];
    let mi = 0;
    const bellTimer = setInterval(() => {
      const m = MOTIF[mi++ % MOTIF.length];
      if (!m || Math.random() < 0.15) return;
      const f = mtof(m) * (Math.random() < 0.2 ? 0.985 : 1);
      tone(f, 3.2, { type: "triangle", vol: vol * 0.55, attack: 0.005, wet: 0.9 });
      tone(f * 2.76, 1.2, { type: "sine", vol: vol * 0.12, attack: 0.002, wet: 0.9 });   // bell overtone
    }, 1700);
    // a rising swell of noise every ~20 s
    const swellTimer = setInterval(() => {
      noise(5, { type: "bandpass", freq: 200, q: 2, vol: vol * 1.4, attack: 4, sweepTo: 1800, wet: 0.8 });
    }, 19000);
    intro = { g, nodes: [lfo, sub, ...voices.flat()], timers: [chordTimer, pulseTimer, bellTimer, swellTimer] };
  }
  function stopIntroMusic(fade = 2) {
    if (!intro) return;
    const it = intro; intro = null;
    it.timers.forEach(clearInterval);
    it.g.gain.cancelScheduledValues(now());
    it.g.gain.setValueAtTime(Math.max(0.0001, it.g.gain.value), now());
    it.g.gain.exponentialRampToValueAtTime(0.0001, now() + fade);
    setTimeout(() => it.nodes.forEach((n) => { try { n.stop(); } catch (e) {} }), fade * 1000 + 200);
  }

  function stopAll() { stopAmbience(); setLightHum(false); setDeadlockHum(0); setTick(false); setBreathing(0); setHeartbeat(0); stopIntroMusic(0.6); }

  // ---------- one-shots ----------
  const api = {
    init, resume, startAmbience, stopAmbience, setLightHum, setDeadlockHum, setTick, stopAll,
    setBreathing, setHeartbeat, lullaby, lullabyPlaying, hum, startIntroMusic, stopIntroMusic,
    // a child's giggle somewhere in the building ("hee-hee-hee"), pitched a little too low
    giggle(pan = 0, vol = 0.14, wet = 0.7) {
      const base = 520 + Math.random() * 120, n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const f = base * (1 - i * 0.05);
        hum(f, 0.13, { at: i * 0.16, vol: vol * (1 - i * 0.12), pan, wet });
        noise(0.1, { type: "bandpass", freq: 3000, q: 2, vol: vol * 0.25, pan, at: i * 0.16, wet });
      }
    },
    // breathy, syllable-like whispering voices
    whispers(pan = 0, vol = 0.12) {
      const n = 5 + Math.floor(Math.random() * 6);
      let t = 0;
      for (let i = 0; i < n; i++) {
        const d = 0.08 + Math.random() * 0.22;
        noise(d, { type: "bandpass", freq: 1800 + Math.random() * 2400, q: 6 + Math.random() * 8, vol: vol * (0.5 + Math.random() * 0.5), pan: pan + (Math.random() - 0.5) * 0.3, attack: d * 0.4, at: t, wet: 0.5 });
        t += d + Math.random() * 0.12;
      }
    },
    // building settling / metal stress
    groan(pan = 0, vol = 0.2) {
      const f = 55 + Math.random() * 40;
      tone(f, 2.8, { type: "sawtooth", vol: vol * 0.5, pan, slideTo: f * 0.82, attack: 0.8, wet: 0.7 });
      tone(f * 1.51, 2.4, { type: "sawtooth", vol: vol * 0.25, pan, slideTo: f * 1.3, attack: 1.0, wet: 0.7 });
      noise(2.5, { type: "bandpass", freq: 300, q: 3, vol: vol * 0.4, pan, attack: 1, wet: 0.7, sweepTo: 180 });
    },
    // a slow door creak far away
    creak(pan = 0, vol = 0.18) {
      for (let i = 0; i < 14; i++) tone(320 + Math.sin(i * 0.7) * 60 + i * 8, 0.09, { type: "sawtooth", vol: vol * (0.5 + Math.random() * 0.5), pan, at: i * 0.075, wet: 0.6 });
    },
    // footsteps on the floor above
    stepsAbove(vol = 0.18) { for (let i = 0; i < 6; i++) { tone(60, 0.2, { vol, at: i * 0.55, wet: 0.4 }); noise(0.15, { type: "lowpass", freq: 250, vol: vol * 0.8, at: i * 0.55, wet: 0.4 }); } },
    // horror "sting": dissonant string-like stab when something appears
    sting(vol = 0.22) {
      [311, 330, 466, 494, 622].forEach((f) => tone(f, 1.6, { type: "sawtooth", vol: vol * 0.25, attack: 0.01, slideTo: f * 0.97, wet: 0.5 }));
      noise(0.5, { type: "highpass", freq: 4000, vol: vol * 0.5, wet: 0.5 });
    },
    // a distant child's voice calling: two falling notes ("where are youuu")
    call(pan = 0, vol = 0.12) { hum(660, 0.5, { vol, pan, wet: 0.85 }); hum(550, 1.1, { vol, pan, wet: 0.85, at: 0.5, drift: -0.05 }); },
    camBlip() { tone(2400, 0.04, { type: "square", vol: 0.05 }); noise(0.12, { type: "highpass", freq: 3000, vol: 0.12 }); },
    monitorUp() { noise(0.25, { type: "bandpass", freq: 1200, vol: 0.15, sweepTo: 4000 }); },
    monitorDown() { noise(0.25, { type: "bandpass", freq: 3000, vol: 0.12, sweepTo: 600 }); },
    gate(pan) {
      noise(0.5, { type: "lowpass", freq: 3000, vol: 0.4, pan, sweepTo: 200 });
      tone(70, 0.5, { type: "sine", vol: 0.6, pan, at: 0.22, slideTo: 40 });
      noise(0.2, { type: "lowpass", freq: 600, vol: 0.5, pan, at: 0.22 });
    },
    gateOpen(pan) { noise(0.45, { type: "highpass", freq: 900, vol: 0.18, pan, sweepTo: 4000 }); },
    buzz() {  // failing fluorescent tube: crackle + mains hum
      if (!ctx) return;
      for (let i = 0; i < 4; i++) noise(0.03, { type: "highpass", freq: 2500, vol: 0.12, at: i * 0.05 + Math.random() * 0.04 });
      tone(100, 0.35, { type: "sawtooth", vol: 0.05 }); tone(200, 0.3, { type: "square", vol: 0.02 });
    },
    tapeClick() { noise(0.05, { type: "bandpass", freq: 1400, vol: 0.45, wet: 0.05 }); tone(110, 0.09, { vol: 0.35, wet: 0.05 }); noise(0.4, { type: "highpass", freq: 3000, vol: 0.05, at: 0.05, wet: 0 }); },
    // old landline ring: 440 + 480 Hz, two bursts per ring
    ring(n = 3) {
      for (let r = 0; r < n; r++) for (let b = 0; b < 2; b++) {
        const at = r * 1.4 + b * 0.45;
        tone(440, 0.38, { type: "sine", vol: 0.12, at, pan: 0.3, wet: 0.2 }); tone(480, 0.38, { type: "sine", vol: 0.12, at, pan: 0.3, wet: 0.2 });
        tone(960, 0.38, { type: "square", vol: 0.015, at, pan: 0.3, wet: 0.2 });
      }
    },
    lightClick() { tone(3000, 0.02, { type: "square", vol: 0.08 }); },
    bang(pan, at = 0) {
      tone(55, 0.35, { type: "sine", vol: 0.9, pan, at, slideTo: 35 });
      noise(0.3, { type: "lowpass", freq: 900, vol: 0.6, pan, at });
      tone(160, 0.6, { type: "triangle", vol: 0.12, pan, at: at + 0.02, slideTo: 150 }); // metal ring
    },
    footstep(pan, vol = 0.3) { noise(0.12, { type: "lowpass", freq: 500, vol, pan }); tone(80, 0.12, { vol: vol * 0.6, pan }); },
    drag(pan, vol = 0.25) {  // Rust-Byte dragging metal
      noise(1.4, { type: "bandpass", freq: 700, q: 4, vol, pan, attack: 0.3, sweepTo: 1300 });
      tone(210, 1.2, { type: "sawtooth", vol: vol * 0.15, pan, attack: 0.3, slideTo: 190 });
      noise(0.5, { type: "highpass", freq: 5000, vol: vol * 0.4, pan, at: 1.0 }); // hydraulic hiss
    },
    sprint(pan) { for (let i = 0; i < 9; i++) { noise(0.07, { type: "lowpass", freq: 900, vol: 0.2 + i * 0.07, pan, at: i * 0.2 }); tone(120, 0.06, { type: "square", vol: 0.05 + i * 0.02, pan, at: i * 0.2 }); } },
    screech(pan = 0, vol = 0.3) {  // Echo: modem / feedback
      tone(1200, 0.6, { type: "square", vol: vol * 0.3, pan, slideTo: 2600 });
      tone(2100, 0.4, { type: "sawtooth", vol: vol * 0.2, pan, at: 0.3, slideTo: 900 });
      noise(0.8, { type: "bandpass", freq: 2500, q: 8, vol, pan });
    },
    static(dur = 0.4, vol = 0.2) { noise(dur, { type: "highpass", freq: 1500, vol }); },
    whisper(pan) { noise(1.6, { type: "bandpass", freq: 2200, q: 12, vol: 0.12, pan, attack: 0.6, sweepTo: 1600 }); },
    laugh(pan = 0.6) { // glitched synthetic laugh
      for (let i = 0; i < 5; i++) tone(180 - i * 12, 0.12, { type: "sawtooth", vol: 0.1, pan, at: i * 0.17, slideTo: 120 - i * 10 });
    },
    good() { tone(880, 0.12, { type: "square", vol: 0.08 }); tone(1320, 0.2, { type: "square", vol: 0.08, at: 0.1 }); },
    bad() { noise(0.5, { type: "highpass", freq: 1000, vol: 0.5 }); tone(90, 0.4, { type: "sawtooth", vol: 0.4, slideTo: 40 }); },
    chime() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 1.6, { type: "triangle", vol: 0.15, at: i * 0.35 })); },
    hourBell() { tone(196, 2.5, { type: "sine", vol: 0.2 }); tone(392, 2, { type: "sine", vol: 0.06 }); },
    powerDown() {
      tone(220, 2.2, { type: "sawtooth", vol: 0.3, slideTo: 20 });
      noise(0.4, { type: "lowpass", freq: 4000, vol: 0.8 });
      tone(60, 0.6, { type: "sine", vol: 0.8, slideTo: 25 });
    },
    musicBox() { // blackout: the lullaby at the left door, child + music box, tape dying
      return lullaby({ vol: 0.22, pan: -0.6, voice: "both", wet: 0.5, beat: 0.42, slow: true, notes: 15 });
    },
    jumpscare() {
      [180, 233, 311, 415].forEach((f) => tone(f, 1.4, { type: "sawtooth", vol: 0.35, slideTo: f * 0.45, attack: 0.005 }));
      noise(1.5, { type: "bandpass", freq: 1800, q: 0.7, vol: 1.0, attack: 0.005, sweepTo: 500 });
      tone(48, 1.4, { type: "square", vol: 0.5, slideTo: 30 });
    },
  };
  return api;
})();
