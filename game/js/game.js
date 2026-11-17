// ===== Five Nights at I-3: main game =====
(() => {
  const $ = (id) => document.getElementById(id);
  const cv = $("view"), ctx = cv.getContext("2d");
  const stage = $("stage");
  const params = new URLSearchParams(location.search);
  const SPEED = Math.max(1, Number(params.get("speed")) || 1);   // ?speed=10 for testing
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  // ---------- images ----------
  // every room has a night "_dark" (lights off) and "_lit" (warm lights on) version
  const IMG = {};
  ["office", "doorway", ...Object.values(CAMS).map((c) => c.img), "campus_aerial", "campus_gate", "campus_ground", "campus_front"].forEach((n) => {
    ["dark", "lit"].forEach((v) => { const im = new Image(); im.src = `assets/img/${n}_${v}.jpg`; IMG[`${n}_${v}`] = im; });
  });

  // ---------- flickering lights ----------
  // Each room's lights hum, dip, stutter and sometimes die. Worse on later nights,
  // at low power, and while Echo is chewing the power cabinet. Some fixtures are just broken.
  const LIGHTS = {};
  const FLAKY = { cam07: 2.4, cam02a: 1.8, cam03: 2.0, doorway: 1.5 };
  let frameDt = 0.016;
  function lightLevel(room, visible = true) {
    const L = LIGHTS[room] || (LIGHTS[room] = { v: 0.9, mode: "on", t: 0, next: rnd(1.5, 6), sub: 0 });
    const dt = frameDt;
    let stress = 1;
    if (G && G.running) stress += (G.night - 1) * 0.35 + (G.power < 30 ? (30 - G.power) / 12 : 0) + (echoInCabinet() ? 2.5 : 0) + (1 - hourDim()) * 2.2;
    L.next -= dt * stress * (FLAKY[room] || 1);
    if (L.mode === "on" && L.next <= 0) {
      const r = Math.random();
      const deadChance = 0.08 + Math.min(0.25, (stress - 1) * 0.05);
      L.mode = r < deadChance ? "dead" : r < 0.5 ? "stutter" : "dip";
      L.t = L.mode === "dead" ? rnd(0.8, 2.6) : L.mode === "stutter" ? rnd(0.3, 1.3) : rnd(0.06, 0.3);
      L.next = rnd(2.5, 9);
      if (visible && L.mode !== "dip") Sfx.buzz();
    }
    if (L.mode === "on") {
      L.v = 0.86 + Math.sin(performance.now() * 0.05) * 0.02 + (Math.random() - 0.5) * 0.05;
    } else {
      L.t -= dt;
      if (L.mode === "dip") L.v = 0.35;
      if (L.mode === "dead") L.v = 0.02;
      if (L.mode === "stutter" && (L.sub -= dt) <= 0) { L.sub = rnd(0.02, 0.09); L.v = Math.random() < 0.5 ? 0.04 : rnd(0.6, 1); }
      if (L.t <= 0) {
        if (L.mode === "dead") { L.mode = "stutter"; L.t = 0.35; if (visible) Sfx.buzz(); }
        else L.mode = "on";
      }
    }
    return Math.max(0, Math.min(1, L.v));
  }
  function forceStutter(room, dur) { const L = LIGHTS[room]; if (L) { L.mode = "stutter"; L.t = dur; } }
  // the building gets darker toward 3 AM (the dead hour), then slowly recovers toward dawn
  function hourDim() {
    if (!G || !G.running) return 1;
    const h = G.t / CONFIG.secondsPerHour;          // 0 = 11 PM ... 4 = 3 AM ... 7 = 6 AM
    if (h <= 4) return 1 - 0.5 * Math.sin((Math.PI / 2) * (h / 4)) ** 2;
    return 0.5 + 0.42 * Math.min(1, (h - 4) / 3);
  }
  function drawRoom(name, x, y, w, h, level, alpha = 1) {
    if (G && G.allDark > 0) level = 0.02;
    level *= hourDim();
    drawCover(IMG[name + "_dark"], x, y, w, h, alpha);
    if (level > 0.01) drawCover(IMG[name + "_lit"], x, y, w, h, alpha * level);
  }
  // faint blue dawn creeping in after 5 AM
  function dawnTint() {
    if (!G) return;
    const h = G.t / CONFIG.secondsPerHour;
    if (h < 5) return;
    ctx.save(); ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = `rgba(60,90,150,${Math.min(0.16, (h - 5) * 0.08)})`; ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  }

  // ---------- narrator tapes & phone calls (pre-recorded voice clips + synced subtitles) ----------
  const Voice = (() => {
    let el = null, seq = null;
    function stop() {
      if (el) { el.onended = el.onerror = null; el.pause(); el = null; }
      if (seq) { clearTimeout(seq.timer); seq = null; }
    }
    function play(keys, onLine, onDone) {
      stop();
      const s = { i: -1, timer: null }; seq = s;
      const next = () => {
        if (seq !== s) return;
        s.i++;
        if (s.i >= keys.length) { seq = null; el = null; if (onDone) onDone(); return; }
        onLine(s.i);
        const key = keys[s.i], dur = (typeof VOICES !== "undefined" && VOICES[key]) || 4.8;
        let done = false;
        const go = () => { if (!done && seq === s) { done = true; clearTimeout(s.timer); next(); } };
        const a = new Audio(`assets/voice/${key}.mp3`); a.volume = 1; el = a;
        a.onended = go;
        s.timer = setTimeout(go, (dur + 1.2) * 1000);   // keeps subtitles moving even if audio can't play
        a.play().catch(() => { clearTimeout(s.timer); s.timer = setTimeout(go, dur * 1000); });
      };
      next();
    }
    return { play, stop, get busy() { return !!seq; } };
  })();
  function hideTape() { $("tape").classList.add("hidden"); }
  function playTape(n) {
    const box = $("tape");
    box.classList.remove("hidden", "phone");
    $("tape-title").textContent = TAPES[n].title; $("tape-label").textContent = "SENTINEL ORIENTATION LOG";
    $("tape-text").textContent = "*click*";
    Sfx.tapeClick();
    setTimeout(() => {
      if (!G || G.night !== n || G.dead) return;
      Voice.play(TAPES[n].lines.map((_, i) => `tape${n}_${i}`), (i) => { $("tape-text").textContent = TAPES[n].lines[i]; }, () => { Sfx.tapeClick(); setTimeout(hideTape, 600); });
    }, 700);
  }
  function phoneCall(n) {
    if (!G || G.dead) return;
    if (Voice.busy) { Voice.stop(); Sfx.tapeClick(); hideTape(); }   // the call cuts the tape off
    Sfx.ring(3);
    setTimeout(() => {
      if (!G || !G.running || G.dead) return;
      const box = $("tape");
      box.classList.remove("hidden"); box.classList.add("phone");
      $("tape-label").textContent = "INCOMING CALL"; $("tape-title").textContent = "// KAELEN (UNKNOWN LINE)";
      const lines = PHONE_CALLS[n].lines;
      Voice.play(lines.map((_, i) => `call${n}_${i}`), (i) => { $("tape-text").textContent = lines[i]; }, () => { $("tape-text").textContent = "[call disconnected]"; Sfx.static(0.6, 0.2); setTimeout(hideTape, 1800); });
    }, 4200);
  }

  // ---------- layout scaling ----------
  function fit() {
    const s = Math.min(innerWidth / 1280, innerHeight / 720);
    stage.style.transform = `scale(${s})`;
    stage.style.left = (innerWidth - 1280 * s) / 2 + "px";
    stage.style.top = (innerHeight - 720 * s) / 2 + "px";
  }
  addEventListener("resize", fit); fit();

  // ---------- state ----------
  let G = null;
  const DOOR = { L: { x: 18, y: 100, w: 236, h: 620 }, R: { x: 1026, y: 100, w: 236, h: 620 } };
  const PATHS = { rust: ["cam04", "cam01", "cam02a", "doorL"], echo: ["cam06", "cam01", "cam03"], dl: ["cam07", "cam01", "cam02b", "doorR"] };
  const KILL_TEXT = {
    rust: "Rust-Byte reached the left gate.<br>Your biometric signature was garbage-collected.",
    np: "NullPointer reached you before the gate came down.<br>Segmentation fault (core dumped).",
    dl: "Deadlock acquired the lock.<br>You will never be released.",
    kz: "WATCHDOG OVERFLOW.<br>Kernel Zero executed inside your memory space.",
  };

  function newNight(n) {
    const cfg = NIGHTS[n];
    G = {
      night: n, cfg, t: 0, hour: 0, power: 100, watchdog: 0, running: true, dead: false,
      view: "office", cam: "cam01", camSwitchT: 0,
      doors: { L: false, R: false }, gateAnim: { L: 0, R: 0 }, light: null,
      rust: { i: 0, timer: rnd(3, 6), doorT: 0, leaveT: 0, idle: 0 },
      np: { stage: 0, timer: rnd(4, 7), running: false, runT: 0, watchedT: 0, idle: 0 },
      echo: { i: 0, timer: rnd(5, 8), deadCams: [], idle: 0 },
      dl: { i: 0, timer: rnd(3, 6), doorT: 0, leaveT: 0, idle: 0 },
      blackout: null, scare: null, flicker: 0, hallucinate: 0, nextEvent: rnd(25, 50),
      task: null, lastTaskId: -1, hbToken: "", purgeToken: "",
      stats: { solved: 0, failed: 0, hb: 0 },
    };
    newTokens();
    newTask();
  }
  const aggr = () => { const [a, b] = G.cfg.aggr; return Math.round(a + (b - a) * Math.min(1, G.hour / 5)); };
  // chance a robot acts on a movement check: ~16-24% on Night 1 rising to ~90%+ on Night 5
  const roll = (mul = 1) => Math.random() < Math.min(0.95, (0.12 + aggr() * 0.04) * mul);
  // a robot that hasn't moved for this long moves anyway (they always come for you)
  const patience = () => Math.max(12, 55 - G.night * 8 - G.hour * 1.5);
  function glitchIfWatched(...cams) { if (G.view === "cams" && cams.includes(G.cam)) { G.camSwitchT = 0.4; Sfx.static(0.4, 0.2); } }
  const watching = (cam) => G.view === "cams" && G.cam === cam;
  const rustLoc = () => PATHS.rust[G.rust.i];
  const dlLoc = () => PATHS.dl[G.dl.i];
  const echoLoc = () => PATHS.echo[G.echo.i];

  // ---------- screens ----------
  function show(id) {
    ["screen-title", "screen-night", "screen-win", "screen-over", "click-to-start"].forEach((s) => $(s).classList.toggle("hidden", s !== id));
  }
  function setPlayingUI(on) {
    ["hud", "bottom-bar"].forEach((s) => $(s).classList.toggle("hidden", !on));
    if (!on) ["office-ui", "cam-ui", "term", "tape"].forEach((s) => $(s).classList.add("hidden"));
  }
  function refreshMenu() {
    const best = store.get("i3_best", 1);
    $("btn-continue").classList.toggle("hidden", best <= 1);
    $("continue-night").textContent = `(NIGHT ${best})`;
    const ns = $("night-select"); ns.innerHTML = "";
    for (let n = 1; n <= 5; n++) {
      const b = document.createElement("button");
      b.textContent = "N" + n; b.disabled = n > best && !params.has("debug");
      b.onclick = () => startNight(n);
      ns.appendChild(b);
    }
  }
  function toMenu() {
    G = null; Sfx.stopAll(); Voice.stop(); setPlayingUI(false); show("screen-title"); refreshMenu(); stage.classList.remove("shake");
    clearTimeout(titleMusic); titleMusic = setTimeout(titleLullaby, 1500);
  }

  function startNight(n) {
    Sfx.init(); Sfx.resume(); Sfx.stopAll(); Voice.stop();
    newNight(n);
    G.running = false;
    setPlayingUI(false); show("screen-night");
    $("night-intro-label").textContent = "NIGHT " + n;
    Sfx.static(1.2, 0.25); Sfx.hourBell();
    setTimeout(() => Sfx.call(0, 0.1), 1200);
    setTimeout(() => {
      if (!G || G.night !== n) return;
      show(null); setPlayingUI(true); setView("office");
      G.running = true; Sfx.startAmbience();
      $("night-label").textContent = "NIGHT " + n;
      playTape(n);
    }, 2600);
  }

  // ---------- views ----------
  function setView(v) {
    if (!G || G.blackout) return;
    if (G.view === v && v !== "office") v = "office";
    const prev = G.view; G.view = v;
    if (v !== "office") setLight(null);
    $("office-ui").classList.toggle("hidden", v !== "office");
    $("cam-ui").classList.toggle("hidden", v !== "cams");
    $("term").classList.toggle("hidden", v !== "term");
    $("btn-cams").classList.toggle("active", v === "cams");
    $("btn-term").classList.toggle("active", v === "term");
    if (v !== "office" && prev === "office") Sfx.monitorUp();
    if (v === "office" && prev !== "office") Sfx.monitorDown();
    if (v === "cams") { G.camSwitchT = 0.3; buildMap(); }
    if (v === "term") { renderTask(); setTimeout(() => { const inp = G && G.task && G.task.type === "fix" ? $("task-input") : $("hb-input"); inp && inp.focus(); }, 30); }
    else document.activeElement && document.activeElement.blur && document.activeElement.blur();
  }
  function setCam(c) {
    if (!G || G.view !== "cams") return;
    G.cam = c; G.camSwitchT = 0.25; Sfx.camBlip(); buildMap();
    // stinger the first time you catch a robot somewhere new
    const here = [rustLoc() === c && "rust", dlLoc() === c && "dl", echoLoc() === c && "echo", c === "cam05" && G.np.stage >= 1 && "np" + G.np.stage].filter(Boolean);
    G.seen = G.seen || {};
    here.forEach((who) => { const key = who + "@" + c; if (!G.seen[key] && c !== PATHS.rust[0] && c !== PATHS.dl[0] && c !== PATHS.echo[0]) { G.seen[key] = 1; Sfx.sting(0.18); } });
  }
  function buildMap() {
    const grid = $("map-grid"); grid.innerHTML = "";
    Object.entries(MAP_LAYOUT).forEach(([id, r]) => {
      const b = document.createElement("button");
      b.className = "room" + (G.cam === id ? " active" : "") + (G.echo.deadCams.includes(id) ? " dead" : "");
      Object.assign(b.style, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });
      b.textContent = r.t; b.onclick = () => setCam(id);
      grid.appendChild(b);
    });
    const you = document.createElement("div"); you.className = "you";
    Object.assign(you.style, { left: "112px", top: "192px", width: "76px", height: "34px" }); you.textContent = "YOU";
    grid.appendChild(you);
    $("cam-label").textContent = CAMS[G.cam].label;
    $("btn-strobe").classList.toggle("hidden", G.cam !== "cam03");
  }

  // ---------- doors & lights ----------
  function toggleDoor(side) {
    if (!G || !G.running || G.blackout || G.view !== "office") return;
    G.doors[side] = !G.doors[side];
    G.doors[side] ? Sfx.gate(side === "L" ? -0.8 : 0.8) : Sfx.gateOpen(side === "L" ? -0.8 : 0.8);
    updateButtons();
  }
  function setLight(side) {
    if (!G) return;
    G.light = side;
    if (side) Sfx.lightClick();
    Sfx.setLightHum(!!side, side === "L" ? -0.8 : 0.8);
    updateButtons();
  }
  function toggleLight(side) {
    if (!G || !G.running || G.blackout || G.view !== "office") return;
    setLight(G.light === side ? null : side);
    const occupied = (side === "L" && rustLoc() === "doorL") || (side === "R" && dlLoc() === "doorR");
    if (G.light === side && !occupied && !G.phantom && Math.random() < [0, 0.05, 0.12, 0.18, 0.22, 0.28][G.night]) {
      G.phantom = { side, t: rnd(0.5, 1.1) }; Sfx.sting(0.22);
    }
    // stinger when the light reveals something standing there
    if (G.light === side && ((side === "L" && rustLoc() === "doorL") || (side === "R" && dlLoc() === "doorR"))) {
      const key = "door" + side + Math.floor(G.t / 20);
      G.seen = G.seen || {};
      if (!G.seen[key]) { G.seen[key] = 1; Sfx.sting(0.25); }
    }
  }
  function updateButtons() {
    if (!G) return;
    $("btn-door-l").classList.toggle("on", G.doors.L); $("btn-door-r").classList.toggle("on", G.doors.R);
    $("btn-light-l").classList.toggle("on", G.light === "L"); $("btn-light-r").classList.toggle("on", G.light === "R");
  }

  // ---------- terminal ----------
  function newTokens() {
    const hex = () => Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, "0");
    G.hbToken = `ping ${hex()}`;
    G.purgeToken = `purge ${hex().slice(0, 2)}`;
    $("hb-token").textContent = G.hbToken; $("purge-token").textContent = G.purgeToken;
  }
  function newTask() {
    G.task = Puzzles.pick(G.night, G.lastTaskId);
    if (Math.random() < 0.1 + G.night * 0.04) {
      G.task = { ...G.task, code: G.task.code + "\n" + pick(["# i can see you typing", "# behind you", "# LET ME IN LET ME IN LET ME IN", "# kaelen is not coming back",
        "# 3 AM 3 AM 3 AM", "# why is your left light off?", "# we were researchers too", "# you type just like the last one", "# don't look at cabin 5"]) };
    }
    G.lastTaskId = G.task.id;
    renderTask();
  }
  let scrambleTick = 0;
  function scramble(s) {
    const glyphs = "#$%&@!?/\\|<>~^*░▒▓█ΣΔ¥§";
    return s.split("").map((c) => (c !== "\n" && Math.random() < 0.09 ? glyphs[Math.floor(Math.random() * glyphs.length)] : c)).join("");
  }
  function escapeHtml(s) { return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }
  function renderTask(onlyCode = false) {
    if (!G || !G.task) return;
    const p = G.task, glitch = echoInCabinet();
    $("term").classList.toggle("scrambled", glitch);
    const lines = p.code.split("\n").map((l, i) => {
      const txt = escapeHtml(glitch ? scramble(l) : l);
      return p.bad === i ? `<span class="bad">${txt}</span>` : txt;
    });
    $("task-code").innerHTML = lines.join("\n");
    if (onlyCode) return;
    $("task-meta").textContent = `TICKET #${1000 + G.stats.solved + G.stats.failed} // ${p.title} // tier ${p.tier}`;
    $("task-prompt").textContent = p.prompt;
    const ch = $("task-choices"); ch.innerHTML = "";
    $("task-input-row").classList.toggle("hidden", p.type !== "fix");
    $("task-choices").classList.toggle("hidden", p.type !== "mc");
    $("btn-exec").classList.toggle("hidden", p.type !== "fix");
    if (p.type === "mc") {
      p.choices.forEach((c, i) => {
        const b = document.createElement("button");
        b.textContent = `${i + 1}) ${c}`;
        b.onclick = () => submit(i);
        ch.appendChild(b);
      });
    } else $("task-input").value = "";
    $("term-status").textContent = `solved ${G.stats.solved} · errors ${G.stats.failed}`;
  }
  function log(html, cls) { $("term-log").innerHTML = `<div class="${cls}">${html}</div>`; }
  function submit(given) {
    if (!G || !G.running || G.blackout) return;
    if (given === undefined) given = $("task-input").value;
    if (G.task.type === "fix" && !String(given).trim()) return;
    if (Puzzles.check(G.task, given)) {
      G.power = Math.min(100, G.power + CONFIG.power.reward); G.stats.solved++;
      Sfx.good(); log(`&gt; BUILD PASSED. +${CONFIG.power.reward}% power fed to the grid.`, "ok");
    } else {
      G.power -= CONFIG.power.penalty; G.stats.failed++;
      Sfx.bad(); flashRed();
      const right = G.task.type === "mc" ? G.task.choices[G.task.answer] : G.task.answers[0];
      log(`&gt; FATAL: test failed. Circuit surge -${CONFIG.power.penalty}%. (expected: ${escapeHtml(right)})`, "err");
    }
    newTask();
    if (G.task.type === "fix") $("task-input").focus();
  }
  function heartbeat() {
    const v = $("hb-input").value.trim().toLowerCase().replace(/\s+/g, " ");
    $("hb-input").value = "";
    if (!v) return;
    if (v === G.hbToken.toLowerCase()) { G.watchdog = 0; G.stats.hb++; Sfx.good(); log("&gt; heartbeat acknowledged. watchdog buffer flushed.", "ok"); }
    else { G.watchdog = Math.min(100, G.watchdog + 6); Sfx.bad(); log("&gt; heartbeat malformed. watchdog +6%", "err"); }
    newTokens();
  }
  function purge() {
    const v = $("purge-input").value.trim().toLowerCase().replace(/\s+/g, " ");
    $("purge-input").value = "";
    if (!v) return;
    if (v !== G.purgeToken.toLowerCase()) { Sfx.bad(); log("&gt; purge: bad socket id", "err"); }
    else if (echoInCabinet()) { echoRetreat(); log("&gt; socket purged. interference cleared.", "ok"); }
    else log("&gt; purge: nothing on the socket. (yet)", "ok");
    newTokens();
  }
  function flashRed() { G.flashRed = 0.35; }

  // ---------- robots ----------
  const echoInCabinet = () => G && echoLoc() === "cam03";
  function echoRetreat() {
    G.echo.i = 0; G.echo.deadCams = []; G.echo.timer = rnd(8, 14);
    Sfx.screech(0, 0.3);
    if (G.view === "cams") buildMap();
  }

  function updateRobots(dt) {
    const pan = { L: -0.85, R: 0.85 };
    // ---- Rust-Byte (left door) ----
    const r = G.rust;
    if (rustLoc() === "doorL") {
      if (r.leaveT > 0) {
        r.leaveT -= dt;
        if (r.leaveT <= 0) { r.i = 1; r.timer = rnd(6, 10); Sfx.drag(-0.4, 0.15); }
      } else if (G.doors.L) {
        r.leaveT = 2.6; [0, 0.7, 1.4].forEach((at) => Sfx.bang(pan.L, at));
      } else if (G.light !== "L") {
        r.doorT -= dt;
        if (r.doorT <= 0) return kill("rust");
      }
    } else {
      r.idle += dt;
      if ((r.timer -= dt) <= 0) {
        r.timer = 5;
        const from = rustLoc();
        if (roll() || r.idle > patience()) {
          r.i++; r.idle = 0;
          glitchIfWatched(from, rustLoc());
          if (rustLoc() === "doorL") { r.doorT = rnd(7, 11) / (1 + aggr() / 25); Sfx.drag(pan.L, 0.35); }
          else Sfx.drag(-0.3, 0.12 + r.i * 0.06);
        } else if (r.i >= 2 && Math.random() < 0.1) {   // prowls back and forth
          r.i--; glitchIfWatched(from, rustLoc()); Sfx.drag(-0.3, 0.1);
        }
      }
    }
    if (rustLoc() === "doorL" && Math.random() < dt * 0.15) Sfx.footstep(pan.L, 0.2);

    // ---- NullPointer (sprints to the left door) ----
    const np = G.np;
    if (watching("cam05")) np.watchedT = 2.5; else np.watchedT -= dt;
    if (np.running) {
      np.runT -= dt;
      if (np.runT <= 0) {
        np.running = false;
        if (G.doors.L) {
          Sfx.bang(pan.L); Sfx.bang(pan.L, 0.15); G.power -= CONFIG.power.sprintHit;
          np.stage = 0; np.timer = rnd(8, 12);
        } else return kill("np");
      }
    } else if ((np.idle += dt, np.timer -= dt) <= 0) {
      np.timer = 5.5;
      if (np.watchedT <= 0 && (roll() || np.idle > patience())) {
        np.stage++; np.idle = 0;
        if (np.stage === 1) Sfx.whisper(-0.6);
        if (np.stage >= 3) { np.running = true; np.runT = G.cfg.sprintWindow; Sfx.sprint(pan.L); }
      }
    }

    // ---- Echo (power cabinet saboteur) ----
    const e = G.echo;
    if (!echoInCabinet() && (e.idle += dt, e.timer -= dt) <= 0) {
      e.timer = 6.5;
      if (roll(G.cfg.echoMul) || e.idle > patience() * 1.3) {
        const from = echoLoc();
        e.i++; e.idle = 0;
        glitchIfWatched(from, echoLoc());
        if (echoInCabinet()) {
          const pool = Object.keys(CAMS).filter((c) => c !== "cam03");
          e.deadCams = [pick(pool), pick(pool)];
          Sfx.screech(-0.2, 0.45); Sfx.static(1.5, 0.3);
          if (G.view === "cams") buildMap();
        } else Sfx.whisper(-0.2);
      }
    }
    if (echoInCabinet() && G.view === "term" && (scrambleTick -= dt) <= 0) { scrambleTick = 0.25; renderTask(true); }
    if (echoInCabinet() && Math.random() < dt * 0.08) Sfx.static(0.3, 0.12);

    // ---- Deadlock (right door, moves when unwatched / while you type) ----
    const d = G.dl;
    if (dlLoc() === "doorR") {
      Sfx.setDeadlockHum(G.dead ? 0 : 0.5);
      if (d.leaveT > 0) {
        d.leaveT -= dt;
        if (d.leaveT <= 0) { d.i = 1; d.timer = rnd(6, 10); Sfx.setDeadlockHum(0); }
      } else if (G.doors.R) {
        d.leaveT = 3.2; Sfx.bang(pan.R); Sfx.laugh(pan.R);
      } else if (G.light !== "R") {
        d.doorT -= dt;
        if (d.doorT <= 0) return kill("dl");
      }
    } else if ((d.idle += dt, d.timer -= dt) <= 0) {
      d.timer = 4.5;
      if (!watching(dlLoc()) && (roll(G.view === "term" ? 2 : 1) || d.idle > patience())) {
        d.i++; d.idle = 0;
        if (dlLoc() === "doorR") d.doorT = rnd(8, 12) / (1 + aggr() / 25);
      }
    }

    // ---- Kernel Zero (watchdog) ----
    G.watchdog += (100 / CONFIG.watchdogBaseSeconds) * G.cfg.watchdog * dt;
    Sfx.setTick(G.watchdog > 80);
    if (G.watchdog >= 100) { G.watchdog = 100; return kill("kz"); }
  }

  // ---------- power ----------
  function usage() {
    let u = 1;
    if (G.view === "cams") u++;
    if (G.light) u++;
    u += (G.doors.L ? 1 : 0) + (G.doors.R ? 1 : 0);
    return u;
  }
  function drain() {
    const P = CONFIG.power;
    let d = P.idle;
    if (G.view === "cams") d += P.camera;
    if (G.light) d += P.light;
    const gates = (G.doors.L ? 1 : 0) + (G.doors.R ? 1 : 0);
    d += gates === 2 ? P.bothGates : gates === 1 ? P.oneGate : 0;
    return d * G.cfg.drain * (echoInCabinet() ? 2 : 1);
  }
  function startBlackout() {
    setView("office");
    G.blackout = { t: 0, wait: rnd(3, 6), musicEnd: 0, stage: 0 };
    G.power = 0; G.doors.L = G.doors.R = false; G.gateAnim.L = G.gateAnim.R = 0; setLight(null);
    updateButtons();
    ["office-ui", "bottom-bar", "tape"].forEach((s) => $(s).classList.add("hidden"));
    Sfx.stopAll(); Voice.stop(); Sfx.powerDown(); Sfx.gateOpen(-0.8); Sfx.gateOpen(0.8);
  }

  // ---------- death / win ----------
  function kill(who) {
    if (G.dead) return;
    G.dead = true; G.running = false;
    Sfx.stopAll(); Voice.stop(); setLight(null);
    setPlayingUI(false);
    G.scare = { who, t: 0, start: performance.now() };
    Sfx.jumpscare();
    stage.classList.add("shake");
  }
  function gameOver() {
    stage.classList.remove("shake");
    show("screen-over");
    $("over-text").innerHTML = KILL_TEXT[G.scare.who];
    const hr = G.hour === 0 ? "11 PM" : G.hour === 1 ? "12 AM" : (G.hour - 1) + " AM";
    $("over-stats").textContent =
      `UNHANDLED THREAD CORRUPTION AT ADDR 0x00000000\n\n night ............ ${G.night}\n survived until ... ${hr}\n tickets solved ... ${G.stats.solved}\n compile errors ... ${G.stats.failed}\n heartbeats ....... ${G.stats.hb}`;
    Sfx.static(0.6, 0.15);
  }
  function win() {
    G.running = false; Sfx.stopAll(); Voice.stop(); Sfx.chime(); setPlayingUI(false);
    const n = G.night;
    store.set("i3_best", Math.max(store.get("i3_best", 1), Math.min(5, n + 1)));
    show("screen-win");
    $("btn-next").classList.toggle("hidden", n >= 5);
    $("win-text").innerHTML = n < 5
      ? `Shift complete. ${G.stats.solved} tickets solved, ${Math.floor(G.power)}% power left.<br>The units power down in their cabins. For now.`
      : `The 6 AM wipe runs. Every screen in Lab I-3 goes black.<br>You pick up your paycheck at the front desk.<br><br><span class="r">The receptionist's eyes glow, faintly, cyan.</span><br><br>THANK YOU FOR PLAYING.`;
  }

  // ---------- main loop ----------
  let last = performance.now();
  function frame(now) {
    const realDt = Math.min(0.1, (now - last) / 1000); last = now;
    const dt = realDt * SPEED;
    frameDt = realDt;
    try {
      if (WK) { stepWalk(realDt); renderWalk(); }
      else if (G) {
        if (G.running && !G.blackout) step(dt, realDt);
        else if (G.blackout) stepBlackout(realDt, dt);
        render(realDt);
      } else renderTitle(now / 1000);
    } catch (err) {
      console.error(err);   // never let one bad frame freeze the game
    }
    requestAnimationFrame(frame);
  }

  function step(dt, realDt) {
    G.t += dt;
    const hour = Math.floor(G.t / CONFIG.secondsPerHour);
    if (hour !== G.hour) { G.hour = hour; if (hour < 7) Sfx.hourBell(); if (hour === 4) threeAM(); }
    if (G.t >= CONFIG.secondsPerHour * 7) return win();
    G.power -= drain() * dt;
    if (G.power <= 0) return startBlackout();
    updateRobots(dt);
    if (!G.running) return;
    // gates animate
    ["L", "R"].forEach((s) => { G.gateAnim[s] += ((G.doors[s] ? 1 : 0) - G.gateAnim[s]) * Math.min(1, realDt * 10); });
    // random scares
    if ((G.nextEvent -= dt) <= 0) {
      G.nextEvent = rnd(16, 40) / (1 + G.night * 0.15);
      const side = () => pick([-0.9, -0.5, 0.5, 0.9]);
      const ev = pick(["flicker", "whispers", "hallucinate", "giggle", "rhyme", "groan", "creak", "steps", "call", "flicker", "giggle", "rhyme", "face", "face"]);
      if (ev === "face" && G.view === "office") { G.face = { who: pick(["rust", "np", "deadlock"]), t: rnd(0.25, 0.5), x: rnd(420, 860) }; Sfx.sting(0.3); }
      if (ev === "flicker") { G.flicker = rnd(0.6, 1.4); forceStutter("office", G.flicker); if (G.view === "office") Sfx.buzz(); }
      if (ev === "whispers") Sfx.whispers(side(), 0.13);
      if (ev === "hallucinate") { G.hallucinate = 0.18; Sfx.sting(0.15); }
      if (ev === "giggle") Sfx.giggle(side(), rnd(0.08, 0.16));
      if (ev === "rhyme" && !Sfx.lullabyPlaying()) Sfx.lullaby({ vol: rnd(0.05, 0.1), pan: side(), voice: pick(["child", "box", "both"]), notes: Math.floor(rnd(5, 11)), startAt: pick([0, 8, 15]), wet: 0.85, beat: rnd(0.45, 0.6) });
      if (ev === "groan") Sfx.groan(side(), 0.2);
      if (ev === "creak") Sfx.creak(side(), 0.12);
      if (ev === "steps") Sfx.stepsAbove(0.16);
      if (ev === "call") Sfx.call(side(), 0.09);
    }
    // Kernel Zero hums its lullaby louder as the watchdog fills
    if (G.watchdog > 55 && !Sfx.lullabyPlaying() && Math.random() < dt * 0.25) {
      const k = (G.watchdog - 55) / 45;
      Sfx.lullaby({ vol: (0.04 + k * 0.14) * (G.view === "cams" && G.cam === "cam08" ? 1.8 : 1), pan: 0.15, voice: k > 0.6 ? "both" : "box", notes: 8, startAt: pick([0, 8]), wet: 0.6 });
    }
    // breathing outside an occupied door, heartbeat when things get bad
    const atL = rustLoc() === "doorL", atR = dlLoc() === "doorR";
    Sfx.setBreathing(atL ? 0.9 : atR ? 0.7 : 0, atL ? -0.85 : 0.85);
    const fear = Math.max(G.power < 25 ? (25 - G.power) / 25 : 0, atL || atR || G.np.stage >= 2 ? 0.5 : 0, G.watchdog > 85 ? 0.8 : 0);
    Sfx.setHeartbeat(fear);
    G.flicker = Math.max(0, G.flicker - realDt);
    G.hallucinate = Math.max(0, G.hallucinate - realDt);
    G.camSwitchT = Math.max(0, G.camSwitchT - realDt);
    G.flashRed = Math.max(0, (G.flashRed || 0) - realDt);
    G.allDark = Math.max(0, (G.allDark || 0) - realDt);
    if (G.face) { G.face.t -= realDt; if (G.face.t <= 0) G.face = null; }
    if (G.phantom) { G.phantom.t -= realDt; if (G.phantom.t <= 0) { G.phantom = null; Sfx.static(0.25, 0.12); } }
    // terminal: something else is logged in
    if (G.view === "term" && Math.random() < dt * (0.01 + G.night * 0.006)) {
      log(pick(["&gt; user 'cabin5' joined the session", "&gt; warning: input detected from unknown tty", "&gt; who is typing?", "&gt; LET ME IN", "&gt; process 'kaelen' not responding"]), "err");
      Sfx.static(0.15, 0.1);
    }
    updateHud();
  }

  // 3 AM, the dead hour: every light in the building dies, a child hums, then the phone rings
  function threeAM() {
    G.allDark = 4.5;
    Sfx.buzz(); Sfx.groan(0, 0.3);
    setTimeout(() => { if (G && G.running) Sfx.lullaby({ vol: 0.13, pan: 0, voice: "child", notes: 7, wet: 0.9, beat: 0.6, slow: true }); }, 700);
    setTimeout(() => { if (G && G.running) phoneCall(G.night); }, 5500);
  }

  function stepBlackout(realDt) {
    const b = G.blackout; b.t += realDt;
    if (b.stage === 0 && b.t > b.wait) { b.stage = 1; b.musicEnd = b.t + Sfx.musicBox(); }
    if (b.stage === 1 && b.t > b.musicEnd) { b.stage = 2; kill("rust"); G.blackout = null; }
    G.t += realDt * SPEED;
    if (G.t >= CONFIG.secondsPerHour * 7 && b.stage < 2) { G.blackout = null; win(); }
  }

  function updateHud() {
    $("term-user").textContent = G.watchdog > 70 && Math.random() < 0.5 ? "kernel_zero@lab-i3:~/cluster$" : "sentinel@lab-i3:~/cluster$";
    $("term-user").style.color = G.watchdog > 70 ? "#ff4466" : "";
    const hrs = ["11 PM", "12 AM", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM", "6 AM"];
    $("clock").textContent = hrs[Math.min(7, G.hour)];
    const p = Math.max(0, G.power);
    $("power-val").textContent = Math.ceil(p) + "%";
    $("power-val").classList.toggle("low", p < 20);
    const u = usage();
    $("usage-bars").innerHTML = Array.from({ length: u }, (_, i) => `<i class="${i >= 3 ? "r" : i >= 2 ? "y" : ""}"></i>`).join("");
    const w = G.watchdog.toFixed(1) + "%";
    $("wd-fill").style.width = w; $("wd-fill-2").style.width = w;
    $("wd-fill").parentElement.classList.toggle("hot", G.watchdog > 80);
    const ps = $("purge-state");
    ps.textContent = echoInCabinet() ? "!! INTERFERENCE ON SOCKET 03 !!" : "no interference";
    ps.classList.toggle("alert", echoInCabinet());
  }

  // ---------- rendering ----------
  function drawCover(img, x, y, w, h, alpha = 1) {
    if (!img.complete || !img.naturalWidth) return;
    ctx.save(); ctx.globalAlpha = alpha;
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = w / s, sh = h / s;
    ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
    ctx.restore();
  }

  function render(realDt) {
    const t = G.t;
    ctx.clearRect(0, 0, 1280, 720);
    if (G.scare) {
      G.scare.t = (performance.now() - G.scare.start) / 1000;
      const k = Math.min(1, G.scare.t / 0.35);
      Art.jumpscare(ctx, G.scare.who, G.scare.t, k);
      if (G.scare.t > 1.5 && !G.scare.done) { G.scare.done = true; gameOver(); }
      if (G.scare.done) { ctx.fillStyle = "rgba(0,0,0,0.9)"; ctx.fillRect(0, 0, 1280, 720); Art.staticNoise(ctx, 0.08); }
      return;
    }
    if (G.blackout) return renderBlackout();
    if (G.view === "cams") renderCams(t);
    else renderOffice(t);
    if (G.flashRed > 0) { ctx.fillStyle = `rgba(255,0,40,${G.flashRed})`; ctx.fillRect(0, 0, 1280, 720); }
  }

  function renderOffice(t) {
    drawRoom("office", 0, 0, 1280, 720, lightLevel("office", G.view === "office"));
    if (G.face) {   // a face pressed against the glass behind the desk, gone in a blink
      const f = G.face, FACEPT = { rust: [170, -505], np: [4, -680], deadlock: [0, -715] }[f.who], s = 0.55;
      ctx.save(); ctx.beginPath(); ctx.rect(300, 70, 700, 270); ctx.clip(); ctx.globalAlpha = 0.8;
      Art.drawRobot(ctx, f.who, f.x - FACEPT[0] * s, 230 - FACEPT[1] * s, s, { lit: 0.35, t: G.t, grin: 1 });
      ctx.restore();
    }
    dawnTint();
    ["L", "R"].forEach((side) => drawDoor(side, t));
    Art.vignette(ctx, 0.75);
    if (G.view === "term") { ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, 1280, 720); }
    Art.staticNoise(ctx, 0.04);
  }

  function drawDoor(side, t) {
    const r = DOOR[side];
    // wall around the opening
    const wall = ctx.createLinearGradient(side === "L" ? 0 : 1280, 0, side === "L" ? 290 : 990, 0);
    wall.addColorStop(0, "#050506"); wall.addColorStop(1, "rgba(10,10,12,0.85)");
    ctx.fillStyle = wall; ctx.fillRect(side === "L" ? 0 : 990, 0, 290, 720);
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    ctx.fillStyle = "#000"; ctx.fillRect(r.x, r.y, r.w, r.h);
    const lit = G.light === side && !(Math.random() < 0.06);
    if (lit) {
      drawCover(IMG.doorway_lit, r.x, r.y, r.w, r.h, 1);
      // spotlight falls on the corridor first; whatever stands in it blocks the light
      const g = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h * 0.45, 20, r.x + r.w / 2, r.y + r.h * 0.45, r.h * 0.7);
      g.addColorStop(0, "rgba(255,250,220,0.22)"); g.addColorStop(1, "rgba(0,0,0,0.7)");
      ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
      const who = side === "L" ? (rustLoc() === "doorL" ? "rust" : null) : (dlLoc() === "doorR" ? "dl" : null);
      if (who === "rust") Art.drawRobot(ctx, "rust", r.x + r.w / 2 - 70, r.y + r.h + 10, 0.92, { lit: 0.6, t });
      if (who === "dl") Art.drawRobot(ctx, "deadlock", r.x + r.w / 2, r.y + r.h + 40, 0.68, { lit: 0.6, t, grin: 1 });
      if (!who && G.phantom && G.phantom.side === side) {   // fake-out: not really there
        Art.glitched(ctx, 0.35, () => side === "L"
          ? Art.drawRobot(ctx, "rust", r.x + r.w / 2 - 70, r.y + r.h + 10, 0.92, { lit: 0.5, t })
          : Art.drawRobot(ctx, "deadlock", r.x + r.w / 2, r.y + r.h + 40, 0.68, { lit: 0.5, t, grin: 1 }));
      }
      if (G.np.running && side === "L") Art.drawRobot(ctx, "np", r.x + r.w / 2, r.y + r.h, 0.9, { lit: 0.8, t, pose: "run" });
    } else {
      drawCover(IMG.doorway_dark, r.x, r.y, r.w, r.h, 0.45);
      // only the eyes show in the dark, and only sometimes
      if (side === "R" && dlLoc() === "doorR" && Math.sin(t * 0.7) > 0.6) {
        Art.glow(ctx, r.x + r.w / 2 - 14, r.y + 60, 16, "rgba(220,235,255,0.9)", 0.5);
        Art.glow(ctx, r.x + r.w / 2 + 14, r.y + 60, 16, "rgba(220,235,255,0.9)", 0.5);
      }
    }
    // blast gate
    const k = G.gateAnim[side];
    if (k > 0.01) {
      const gh = r.h * k;
      ctx.fillStyle = "#2a2c30"; ctx.fillRect(r.x, r.y, r.w, gh);
      ctx.fillStyle = "#1b1c1f";
      for (let yy = r.y + 20; yy < r.y + gh; yy += 46) ctx.fillRect(r.x, yy, r.w, 6);
      // hazard stripes at the bottom edge
      ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y + gh - 34, r.w, 34); ctx.clip();
      for (let xx = r.x - 40; xx < r.x + r.w + 40; xx += 36) {
        ctx.fillStyle = "#c9a000"; ctx.beginPath();
        ctx.moveTo(xx, r.y + gh); ctx.lineTo(xx + 18, r.y + gh); ctx.lineTo(xx + 52, r.y + gh - 34); ctx.lineTo(xx + 34, r.y + gh - 34); ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(r.x, r.y + gh - 3, r.w, 3);
    }
    ctx.restore();
    // frame
    ctx.strokeStyle = "#3a3c40"; ctx.lineWidth = 10; ctx.strokeRect(r.x - 5, r.y - 5, r.w + 10, r.h + 10);
    ctx.strokeStyle = "#111"; ctx.lineWidth = 2; ctx.strokeRect(r.x - 10, r.y - 10, r.w + 20, r.h + 20);
    if (G.light === side) Art.glow(ctx, r.x + r.w / 2, r.y - 22, 40, "rgba(255,240,180,0.9)", 0.8);
  }

  function renderCams(t) {
    const cam = G.cam, C = CAMS[cam];
    const panX = Math.sin(t * 0.25 + cam.length) * 40;
    const dead = G.echo.deadCams.includes(cam);
    if (dead) {
      Art.staticNoise(ctx, 1);
      ctx.fillStyle = "#fff"; ctx.font = "bold 40px Consolas, monospace"; ctx.textAlign = "center";
      ctx.fillText("SIGNAL LOST", 640, 360);
      ctx.font = "16px Consolas, monospace"; ctx.fillText("interference detected on socket 03", 640, 395); ctx.textAlign = "left";
    } else {
      const lv = lightLevel(cam);
      ctx.save(); ctx.translate(panX, 0);
      drawRoom(C.img, -60, -10, 1400, 740, lv);
      dawnTint();
      drawRobotsOnCam(cam, t, lv);
      ctx.restore();
      // faint CCTV tint
      ctx.fillStyle = "rgba(10,25,18,0.12)"; ctx.fillRect(0, 0, 1280, 720);
      if (G.hallucinate > 0) { Art.kernelZero(ctx, 640, 780, 1.6, { t, power: 1 }); }
      Art.staticNoise(ctx, 0.09 + (echoInCabinet() ? 0.08 : 0));
    }
    if (G.camSwitchT > 0) Art.staticNoise(ctx, 0.85);
    Art.scanlines(ctx, t);
    Art.vignette(ctx, 0.8);
    // timestamp
    ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.font = "16px Consolas, monospace";
    const secs = Math.floor(G.t % 60).toString().padStart(2, "0");
    ctx.fillText(`NIGHT ${G.night}  ${$("clock").textContent}  00:${secs}`, 32, 690);
    // REC frame corners
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 3;
    [[20, 20, 1, 1], [1260, 20, -1, 1], [20, 700, 1, -1], [1260, 700, -1, -1]].forEach(([x, y, dx, dy]) => {
      ctx.beginPath(); ctx.moveTo(x, y + 40 * dy); ctx.lineTo(x, y); ctx.lineTo(x + 40 * dx, y); ctx.stroke();
    });
  }

  function drawRobotsOnCam(cam, t, lv = 0.9) {
    const lit = 0.08 + 0.4 * lv;   // when the room's light dies, only their eyes remain
    const spots = CAMS[cam].spots;
    let k = 0;
    const at = () => spots[Math.min(k++, spots.length - 1)];
    if (rustLoc() === cam) { const s = at(); Art.drawRobot(ctx, "rust", s.x, s.y, s.s, { lit, t }); }
    if (dlLoc() === cam) { const s = at(); Art.drawRobot(ctx, "deadlock", s.x, s.y, s.s * 0.85, { lit: lit * 0.5, t }); }
    if (echoLoc() === cam) {
      const s = at();
      Art.glitched(ctx, 0.15, () => Art.drawRobot(ctx, "echo", s.x, s.y, s.s * (cam === "cam03" ? 0.85 : 1), { lit, t }));
    }
    if (cam === "cam02a" && G.np.running) Art.drawRobot(ctx, "np", 690, 640, 0.9, { lit, t, pose: "run" });
    if (cam === "cam05") Art.cabin2(ctx, G.np.running ? 3 : G.np.stage, t, lit);
    if (cam === "cam08") {
      const p = G.watchdog / 100;
      Art.kernelZero(ctx, 560, 640, 0.75 + p * 0.35, { t, power: p });
      Art.chamber(ctx, 560, 690, 420, 600, Math.max(0, p - 0.4) / 0.6);
    }
  }

  function renderBlackout() {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 1280, 720);
    drawCover(IMG.office_dark, 0, 0, 1280, 720, 0.25);
    const b = G.blackout;
    if (b.stage === 1) {
      const on = Math.random() < 0.7;
      if (on) {
        const r = DOOR.L;
        Art.glow(ctx, r.x + r.w / 2 + 40, r.y + 150, 40, "rgba(255,140,0,0.9)", 0.9);
        Art.glow(ctx, r.x + r.w / 2 - 10, r.y + 155, 12, "rgba(255,0,0,0.6)", 0.6);
      }
    }
    Art.staticNoise(ctx, 0.03);
  }

  function renderTitle(t) {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 1280, 720);
    drawRoom("cam01", 0, 0, 1280, 720, lightLevel("title", false), 0.8);
    Art.drawRobot(ctx, "deadlock", 1000, 760, 0.85, { lit: 0.15, t, grin: Math.sin(t * 0.5) > 0.7 ? 1 : 0 });
    if (Math.sin(t * 0.37) > 0.92) Art.drawRobot(ctx, "rust", 230, 760, 0.8, { lit: 0.25, t });
    Art.staticNoise(ctx, 0.1);
    Art.scanlines(ctx, t);
    Art.vignette(ctx, 0.9);
  }

  // ================= WALK-IN INTRO: across the campus to Lab I-3 =================
  // Each scene is a night photo you walk "into": W pushes toward the vanishing point (vp),
  // S steps back, A/D look around. Reaching the end of a scene cuts to the next one.
  const WALK_SCENES = [
    // auto: cinematic B-roll shot (no control): slow push over dur seconds while panning look from pan[0] to pan[1]
    { img: "campus_aerial", vp: [0.45, 0.45], auto: { dur: 9, pan: [0.35, -0.25], zoom: 0.5 }, place: "TECHNO NJR KNOWLEDGE CAMPUS" },
    { img: "campus_gate",   vp: [0.42, 0.66], auto: { dur: 10, pan: [-0.25, 0.15], zoom: 1 }, place: "MAIN GATE" },
    { img: "campus_ground", vp: [0.47, 0.5],  auto: { dur: 12, pan: [-0.4, 0.3], zoom: 0.8 }, place: "SPORTS GROUND" },
    { img: "campus_front",  vp: [0.81, 0.86], len: 12, place: "MAIN BUILDING" },
    { img: "doorway",       vp: [0.5, 0.42],  len: 11, place: "BLOCK I // GROUND FLOOR", final: true },
  ];
  let WK = null;
  const keysDown = new Set();
  addEventListener("keydown", (e) => keysDown.add(e.key.toLowerCase()));
  addEventListener("keyup", (e) => keysDown.delete(e.key.toLowerCase()));
  addEventListener("blur", () => keysDown.clear());

  function startWalk() {
    Sfx.init(); Sfx.resume(); Sfx.stopAll(); Voice.stop();
    clearTimeout(titleMusic); titleMusic = 0;
    G = null;
    WK = { i: 0, p: 0, look: 0, phase: 0, fade: 1, fadeDir: -1, t: 0, scared: {}, lightsOut: 0, entering: false };
    show(null); setPlayingUI(false);
    $("walk-ui").classList.remove("hidden");
    $("walk-hint").classList.add("hidden");
    Sfx.startAmbience();
    Sfx.startIntroMusic(0.11);   // low background score until you step into the lab
    // the story tape, with subtitles
    const box = $("tape");
    box.classList.remove("hidden", "phone");
    $("tape-label").textContent = "ARCHIVE TAPE"; $("tape-title").textContent = "// PROJECT SINGULARITY";
    $("tape-text").textContent = "*click*"; Sfx.tapeClick();
    setTimeout(() => {
      if (!WK) return;
      Voice.play(STORY.lines.map((_, i) => `story_${i}`), (i) => { $("tape-text").textContent = STORY.lines[i]; },
        () => { Sfx.tapeClick(); setTimeout(() => { if (WK) hideTape(); }, 600); });
    }, 900);
  }
  function endWalk(enter) {
    if (!WK) return;
    WK = null;
    $("walk-ui").classList.add("hidden");
    Voice.stop(); hideTape();
    if (enter) startNight(1);
  }

  function stepWalk(dt) {
    const w = WK, sc = WALK_SCENES[w.i];
    w.t += dt;
    w.fade = Math.max(0, Math.min(1, w.fade + w.fadeDir * dt * 2));
    if (w.entering) { if (w.fade >= 1) endWalk(true); return; }
    const fwd = keysDown.has("w") || keysDown.has("arrowup");
    const back = keysDown.has("s") || keysDown.has("arrowdown");
    const left = keysDown.has("a") || keysDown.has("arrowleft");
    const right = keysDown.has("d") || keysDown.has("arrowright");
    const run = keysDown.has("shift");
    if (sc.auto) {   // B-roll: the camera moves by itself
      if (w.fadeDir < 0) w.p = Math.min(1, w.p + dt / sc.auto.dur);
      w.look = sc.auto.pan[0] + (sc.auto.pan[1] - sc.auto.pan[0]) * w.p;
    }
    const moving = !sc.auto && (fwd || back) && w.fadeDir < 0;
    if (moving) {
      const sp = (run ? 1.6 : 1) / sc.len;
      w.p = Math.max(0, Math.min(1, w.p + (fwd ? sp : -sp * 0.6) * dt));
      const before = Math.floor(w.phase / Math.PI);
      w.phase += dt * (run ? 11 : 7.5);
      if (Math.floor(w.phase / Math.PI) !== before) Sfx.footstep(Math.floor(w.phase / Math.PI) % 2 ? -0.15 : 0.15, sc.img === "doorway" ? 0.28 : 0.2);
      if (w.p > 0.2) $("walk-hint").classList.add("hidden");
    }
    if (left && !sc.auto) w.look = Math.max(-1, w.look - dt * 1.4);
    if (right && !sc.auto) w.look = Math.min(1, w.look + dt * 1.4);
    if (!left && !right && moving) w.look *= 1 - dt * 0.8;   // head drifts back to centre while walking
    w.lightsOut = Math.max(0, w.lightsOut - dt);

    // scripted scares along the route (each fires once)
    const once = (key, cond, fn) => { if (cond && !w.scared[key]) { w.scared[key] = true; fn(); } };
    once("gateFigure", sc.img === "campus_gate" && w.p > 0.55, () => { w.apparition = { who: "np", ix: 0.33, iy: 0.62, s: 0.13, t: 0.35 }; Sfx.sting(0.2); });
    once("windowFace", sc.img === "campus_ground" && w.p > 0.45, () => { w.apparition = { who: "kz", ix: 0.637, iy: 0.36, s: 0.035, t: 1.4 }; Sfx.whispers(0.4, 0.1); });
    once("groundGiggle", sc.img === "campus_ground" && w.p > 0.8, () => Sfx.giggle(-0.7, 0.12));
    once("frontDark", sc.img === "campus_front" && w.p > 0.5, () => { w.lightsOut = 2.6; Sfx.buzz(); Sfx.groan(0.3, 0.22); });
    once("frontDoor", sc.img === "campus_front" && w.p > 0.5, () => { w.apparition = { who: "deadlock", ix: 0.82, iy: 0.95, s: 0.18, t: 2.4 }; });
    once("corridor", sc.img === "doorway" && w.p > 0.15, () => Sfx.lullaby({ vol: 0.07, pan: 0, voice: "box", notes: 9, wet: 0.85, beat: 0.55 }));
    once("breath", sc.img === "doorway" && w.p > 0.6, () => Sfx.whispers(-0.8, 0.12));
    if (w.apparition) { w.apparition.t -= dt; if (w.apparition.t <= 0) w.apparition = null; }

    // reached the end of this scene
    if (w.p >= 1 && !sc.final && w.fadeDir < 0) { w.fadeDir = 1; Sfx.static(0.4, 0.12); }
    if (w.fadeDir > 0 && w.fade >= 1 && !w.entering) {
      w.i++; w.p = 0; w.look = 0; w.fadeDir = -1; w.apparition = null;
      if (!WALK_SCENES[w.i].auto && WALK_SCENES[w.i - 1].auto) $("walk-hint").classList.remove("hidden");   // your turn to walk
    }
    const atDoor = sc.final && w.p > 0.85;
    $("walk-prompt").textContent = atDoor ? "Press  E  to enter Lab I-3" : "";
    if (atDoor && keysDown.has("e")) { w.entering = true; w.fadeDir = 1; Sfx.stopIntroMusic(1.8); Sfx.creak(0, 0.2); Sfx.gate(0); }
  }

  function renderWalk() {
    const w = WK, sc = WALK_SCENES[w.i];
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 1280, 720);
    const ease = w.p * w.p * (3 - 2 * w.p);
    const z = 1.12 * (1 + ease * (sc.final ? 1.1 : 1.45) * (sc.auto ? sc.auto.zoom : 1));
    const bob = Math.sin(w.phase) * 5, sway = Math.cos(w.phase / 2) * 3;
    const cx = 640 - w.look * 330, cy = 380;
    const vx = sc.vp[0] * 1280, vy = sc.vp[1] * 720;
    const sx = vx + (cx - vx) * ease, sy = vy + (cy - vy) * ease;
    let ix = sx - sc.vp[0] * 1280 * z + sway - w.look * 70 * (1 - ease), iy = sy - sc.vp[1] * 720 * z + bob;
    ix = Math.min(0, Math.max(1280 - 1280 * z, ix)); iy = Math.min(0, Math.max(720 - 720 * z, iy));
    const lv = w.lightsOut > 0 ? (Math.random() < 0.08 ? 0.5 : 0.02) : lightLevel(sc.img);
    drawRoom(sc.img, ix, iy, 1280 * z, 720 * z, lv);
    if (w.apparition) {
      const a = w.apparition, F = { np: [4, -680], kz: [0, -340], deadlock: [0, -715] }[a.who];
      const px = ix + a.ix * 1280 * z, py = iy + a.iy * 720 * z, s = a.s * z;
      Art.glitched(ctx, 0.12, () => Art.drawRobot(ctx, a.who, px, py, s, { lit: 0.25, t: w.t, grin: 1, power: 0.9 }));
    }
    if (sc.final) {   // the lab door at the end of the corridor
      const dx = ix + 0.5 * 1280 * z, dy = iy + 0.3 * 720 * z, ds = z;
      ctx.save();
      ctx.fillStyle = "rgba(160,20,30,0.85)"; ctx.fillRect(dx - 34 * ds, dy - 10 * ds, 68 * ds, 20 * ds);
      ctx.fillStyle = "#ffd9dc"; ctx.font = `bold ${Math.round(11 * ds)}px Consolas, monospace`; ctx.textAlign = "center";
      ctx.fillText("LAB I-3", dx, dy + 4 * ds);
      ctx.restore();
      Art.glow(ctx, dx, dy - 22 * ds, 26 * ds, "rgba(255,40,40,0.9)", 0.5 + Math.sin(w.t * 3) * 0.3);
    }
    Art.staticNoise(ctx, 0.07);
    Art.scanlines(ctx, w.t);
    Art.vignette(ctx, 0.85);
    if (sc.auto) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 1280, 62); ctx.fillRect(0, 658, 1280, 62); }   // cinematic bars
    // VHS overlay
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.font = "20px Consolas, monospace";
    ctx.fillText("PLAY ▶", 36, 52);
    ctx.font = "16px Consolas, monospace";
    const mins = 52 + Math.floor(w.t / 12);
    ctx.fillText(`NOV 17   10:${Math.min(59, mins)} PM`, 36, 690);
    ctx.textAlign = "right"; ctx.fillText(sc.place, 1244, 690); ctx.textAlign = "left";
    if (Math.random() < 0.02) { ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(0, Math.random() * 720, 1280, 6 + Math.random() * 20); }
    if (w.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${w.fade})`; ctx.fillRect(0, 0, 1280, 720); }
  }
  $("btn-walk-skip").onclick = () => endWalk(true);

  // ---------- input ----------
  $("btn-door-l").onclick = () => toggleDoor("L");
  $("btn-door-r").onclick = () => toggleDoor("R");
  $("btn-light-l").onclick = () => toggleLight("L");
  $("btn-light-r").onclick = () => toggleLight("R");
  $("btn-cams").onclick = () => setView("cams");
  $("btn-term").onclick = () => setView("term");
  $("btn-exec").onclick = () => submit();
  $("btn-skip").onclick = () => { if (G) { log("&gt; ticket skipped.", ""); newTask(); } };
  $("btn-strobe").onclick = strobe;
  $("btn-tape-skip").onclick = () => { Voice.stop(); Sfx.tapeClick(); hideTape(); };
  $("btn-new").onclick = () => startWalk();
  $("btn-continue").onclick = () => startNight(store.get("i3_best", 1));
  $("btn-next").onclick = () => startNight(Math.min(5, G.night + 1));
  $("btn-retry").onclick = () => startNight(G.night);
  $("btn-menu-w").onclick = toMenu; $("btn-menu-o").onclick = toMenu;
  $("hb-input").addEventListener("keydown", (e) => { if (e.key === "Enter") heartbeat(); });
  $("purge-input").addEventListener("keydown", (e) => { if (e.key === "Enter") purge(); });
  $("task-input").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

  function strobe() {
    if (!G || !G.running || G.view !== "cams" || G.cam !== "cam03") return;
    G.power -= CONFIG.power.strobe;
    G.camSwitchT = 0.5; Sfx.static(0.5, 0.3);
    if (echoInCabinet()) echoRetreat();
  }

  addEventListener("keydown", (e) => {
    if (!G || !G.running) return;
    const typing = e.target.tagName === "INPUT";
    if (e.key === "Escape") { setView("office"); return; }
    if (typing) { if (e.key === "Enter" && e.ctrlKey && e.target.id === "task-input") submit(); return; }
    const k = e.key.toLowerCase();
    if (G.view === "term" && G.task && G.task.type === "mc" && /^[1-4]$/.test(k)) return submit(Number(k) - 1);
    if (k === "q") toggleDoor("L");
    else if (k === "e") toggleDoor("R");
    else if (k === "a") toggleLight("L");
    else if (k === "d") toggleLight("R");
    else if (k === "s" || k === " ") { e.preventDefault(); setView("cams"); }
    else if (k === "t") { e.preventDefault(); setView("term"); }
    else if (k === "f") strobe();
    else if (G.view === "cams") { const c = Object.keys(CAMS).find((id) => CAMS[id].key === k); if (c) setCam(c); }
  });

  // debugging / testing hook
  window.I3 = { get G() { return G; }, get WK() { return WK; }, startWalk,
    walkAdvance(sec) { for (let i = 0; i < sec * 30 && WK; i++) stepWalk(1 / 30); }, startNight, kill, setView, setCam, roll: (m) => roll(m), aggr: () => aggr(), patience: () => patience(),
    // advance the game manually (for testing when the tab is hidden): I3.advance(seconds)
    advance(sec) { for (let i = 0; i < sec * 30; i++) { if (!G || !G.running || G.blackout) break; step(SPEED / 30, 1 / 30); } } };

  // title screen: the first click/tap wakes the audio and a far-away music box starts playing
  let titleMusic = null;
  function titleLullaby() {
    if (G) return;
    Sfx.lullaby({ vol: 0.09, pan: 0, voice: Math.random() < 0.5 ? "box" : "both", wet: 0.75, beat: 0.55 });
    titleMusic = setTimeout(titleLullaby, 34000);
  }
  addEventListener("pointerdown", (e) => {
    if (titleMusic !== null || G || WK || e.target.closest("button")) return;
    Sfx.init(); Sfx.resume(); titleMusic = 0; titleLullaby();
  });

  refreshMenu(); show("screen-title");
  requestAnimationFrame(frame);
})();
