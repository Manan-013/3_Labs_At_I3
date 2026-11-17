// ===== Procedural art: the five robots + screen effects =====
// Every robot is drawn with its feet at (x, y). Scale 1 ~= 600 px tall.
// o.lit: 0 (pitch dark, only eyes) .. 1 (fully lit by a spotlight)
const Art = (() => {
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function mix(hex, lit, dark = [6, 5, 7]) {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const k = 0.08 + 0.92 * lit;
    return `rgb(${c.map((v, i) => Math.round(dark[i] + (v - dark[i]) * k)).join(",")})`;
  }
  let deferred = null; // while drawing through the shading layer, glows are collected and drawn on top
  function glow(ctx, x, y, r, color, a = 1) {
    if (deferred && !deferred.flushing) { deferred.push([ctx.getTransform(), ctx.globalAlpha, x, y, r, color, a]); return; }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.12, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function poly(ctx, pts, fill, stroke, lw = 3) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  function limb(ctx, pts, w, color) {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.stroke();
  }
  function cable(ctx, x, y, len, sway, color, w = 3, t = 0) {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + sway, y + len * 0.4, x - sway * 0.6 + Math.sin(t) * 6, y + len * 0.7, x + sway * 0.3, y + len);
    ctx.stroke();
  }

  // cylinder-shaded limb: dark core + thin highlight on one edge
  function bone(ctx, pts, w, dark, light) {
    limb(ctx, pts, w, dark);
    ctx.save(); ctx.translate(-w * 0.22, -w * 0.12); limb(ctx, pts, Math.max(1.5, w * 0.22), light); ctx.restore();
  }
  function claw(ctx, x, y, dir, len, color, t) {
    for (let f = -1; f <= 1; f++) {
      const a = Math.PI / 2 + f * 0.28 + Math.sin(t * 2 + f) * 0.05;
      const mx = x + Math.cos(a) * len * 0.55 * dir, my = y + Math.sin(a) * len * 0.55;
      limb(ctx, [x, y, mx, my, mx + Math.cos(a + 0.6 * dir) * len * 0.5 * dir, my + Math.sin(a + 0.6) * len * 0.5], 5, color);
    }
  }
  function teeth(ctx, x0, y0, x1, n, len, color, down = true) {
    ctx.fillStyle = color;
    const w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const L = len * (0.6 + ((i * 7919) % 5) / 8);
      ctx.beginPath(); ctx.moveTo(x0 + i * w, y0); ctx.lineTo(x0 + (i + 1) * w, y0); ctx.lineTo(x0 + (i + 0.5) * w, y0 + (down ? L : -L)); ctx.closePath(); ctx.fill();
    }
  }

  // ---------------- Unit 01: RUST-BYTE ----------------
  // Hunched, spine bent forward, head hanging at chest height, jaw unhinged.
  function rustByte(ctx, x, y, s, o = {}) {
    const lit = o.lit ?? 0, t = o.t ?? 0;
    const rustL = mix("#8a4a22", lit), rust = mix("#5e2c12", lit), rustD = mix("#2c1308", lit), metal = mix("#6a625a", lit), bonec = mix("#d8ccb0", lit * 0.9);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const br = Math.sin(t * 0.9) * 5;
    // digitigrade legs
    bone(ctx, [-45, -300, -85, -170, -35, -60, -80, 0], 30, rustD, rustL);
    bone(ctx, [35, -300, 85, -175, 45, -55, 95, 0], 28, rustD, rustL);
    // back arm (behind body)
    bone(ctx, [-40, -530 + br, -120, -420, -105, -250], 20, rustD, rust);
    claw(ctx, -105, -250, -1, 70, metal, t);
    // torso
    const g = ctx.createLinearGradient(-120, -580, 110, -290);
    g.addColorStop(0, rustL); g.addColorStop(0.5, rust); g.addColorStop(1, rustD);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-55, -290);
    ctx.bezierCurveTo(-115, -380, -130, -505 + br, -40, -565 + br);
    ctx.quadraticCurveTo(45, -600 + br, 95, -525 + br);
    ctx.bezierCurveTo(115, -450, 85, -350, 55, -290);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = 4; ctx.stroke();
    // spine plates down the hump
    for (let i = 0; i < 7; i++) {
      const k = i / 6, px = -40 - 80 * Math.sin(k * 2.4), py = -560 + br + k * 250;
      ctx.save(); ctx.translate(px, py); ctx.rotate(-0.9 + k * 1.2);
      ctx.fillStyle = metal; ctx.fillRect(-14, -6, 28, 12); ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(-14, 4, 28, 3);
      ctx.restore();
    }
    // exposed ribcage on the chest
    for (let i = 0; i < 5; i++) {
      const yy = -330 - i * 40 + br * (i / 5);
      ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(-60, yy + 6); ctx.quadraticCurveTo(25, yy + 30, 85, yy - 4); ctx.stroke();
      ctx.strokeStyle = metal; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-60, yy); ctx.quadraticCurveTo(25, yy + 24, 85, yy - 10); ctx.stroke();
    }
    // gash with wires inside
    ctx.fillStyle = "#030101"; ctx.beginPath(); ctx.ellipse(10, -400, 26, 50, 0.4, 0, TAU); ctx.fill();
    cable(ctx, 0, -430, 70, 14, mix("#a02010", lit), 3, t); cable(ctx, 14, -425, 60, -12, mix("#c0a020", lit), 2, t + 2);
    // bent neck reaching forward and down
    bone(ctx, [40, -560 + br, 105, -575 + br, 150, -525 + br], 22, rustD, metal);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(60 + i * 22, -585 + br + i * 10, 5, 26); }
    // front arm, far too long, claws near the floor
    bone(ctx, [70, -530 + br, 140, -400, 120, -210, 150, -95], 22, rustD, rustL);
    claw(ctx, 150, -95, 1, 85, metal, t);
    // head: drooping skull, tilted
    ctx.save(); ctx.translate(165, -490 + br); ctx.rotate(0.55 + Math.sin(t * 1.4) * 0.04 + (Math.random() < 0.02 ? 0.2 : 0));
    const hg = ctx.createLinearGradient(-60, -70, 60, 50);
    hg.addColorStop(0, rustL); hg.addColorStop(1, rustD);
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(-55, 20); ctx.quadraticCurveTo(-75, -60, -10, -78); ctx.quadraticCurveTo(60, -80, 65, -20);
    ctx.lineTo(55, 25); ctx.quadraticCurveTo(0, 40, -55, 20); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.75)"; ctx.lineWidth = 3; ctx.stroke();
    // crack across the faceplate
    ctx.strokeStyle = "rgba(0,0,0,0.9)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-40, -70); ctx.lineTo(-20, -40); ctx.lineTo(-30, -20); ctx.lineTo(-5, 5); ctx.stroke();
    // upper teeth
    teeth(ctx, -45, 22, 50, 9, 20, bonec, true);
    // unhinged jaw swinging
    ctx.save(); ctx.translate(-45, 26); ctx.rotate(0.75 + Math.sin(t * 2.2) * 0.08);
    ctx.fillStyle = rust; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(95, 6); ctx.lineTo(85, 30); ctx.lineTo(8, 26); ctx.closePath(); ctx.fill();
    teeth(ctx, 6, 2, 92, 8, 18, bonec, false);
    cable(ctx, 80, 28, 60, 8, mix("#2a2a2a", lit), 2, t);
    ctx.restore();
    // eyes: dead cracked socket + burning amber lens
    ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(-25, -25, 17, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(28, -28, 22, 0, TAU); ctx.fill();
    ctx.strokeStyle = metal; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(28, -28, 24, 0, TAU); ctx.stroke();
    const pulse = 0.7 + Math.sin(t * 5) * 0.2 + (Math.random() < 0.05 ? -0.5 : 0);
    glow(ctx, 28, -28, 75, "rgba(255,130,0,0.95)", pulse);
    glow(ctx, -25, -25, 10, "rgba(255,0,0,0.7)", 0.6);
    ctx.restore();
    ctx.restore();
  }

  // ---------------- Unit 02: NULLPOINTER ----------------
  function nullPointer(ctx, x, y, s, o = {}) {
    const lit = o.lit ?? 0, t = o.t ?? 0, pose = o.pose || "stand";
    const chrome = mix("#a8b4be", lit), chromeD = mix("#3a424a", lit), dark = mix("#15191d", lit);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (pose === "run") ctx.rotate(0.3);
    const twitch = Math.random() < 0.07 ? rnd(-0.35, 0.35) : 0;
    // backward-bending legs
    bone(ctx, [-30, -330, 15, -170, -45, -60, -80, 0], 12, chromeD, chrome);
    bone(ctx, [30, -330, 80, -175, 30, -60, 70, 0], 12, chromeD, chrome);
    // pelvis + spine
    ctx.fillStyle = chromeD; ctx.beginPath(); ctx.ellipse(0, -330, 45, 18, 0, 0, TAU); ctx.fill();
    bone(ctx, [0, -330, -6, -440, 6, -560], 10, chromeD, chrome);
    // ribcage
    for (let i = 0; i < 7; i++) {
      const yy = -400 - i * 24, w = 58 - Math.abs(i - 3) * 6;
      ctx.strokeStyle = "rgba(0,0,0,0.8)"; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.ellipse(3, yy + 3, w, 14, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke();
      ctx.strokeStyle = chrome; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(3, yy, w, 14, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke();
    }
    // arms reaching past the knees, needle fingers
    const ra = pose === "run" ? -1 : 1;
    bone(ctx, [-48, -550, -100, -420, -95 * ra, -240], 9, chromeD, chrome);
    bone(ctx, [52, -550, 108, -410, 118, -230], 9, chromeD, chrome);
    [[-95 * ra, -240, -1], [118, -230, 1]].forEach(([hx, hy, d]) => {
      for (let f = -2; f <= 2; f++) limb(ctx, [hx, hy, hx + f * 8 * d, hy + 45, hx + f * 12 * d, hy + 85], 2.5, chrome);
    });
    // neck
    bone(ctx, [6, -560, 4, -610], 8, chromeD, chrome);
    // long skull head, sunken cheeks, open jaw
    ctx.save(); ctx.translate(4, -650); ctx.rotate(twitch + Math.sin(t * 3) * 0.02);
    const hg = ctx.createLinearGradient(-40, -80, 40, 60);
    hg.addColorStop(0, chrome); hg.addColorStop(1, dark);
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(-26, -95); ctx.quadraticCurveTo(0, -112, 26, -95);
    ctx.quadraticCurveTo(44, -40, 30, 0); ctx.quadraticCurveTo(20, 10, 24, 30);
    ctx.lineTo(-24, 30); ctx.quadraticCurveTo(-20, 10, -30, 0); ctx.quadraticCurveTo(-44, -40, -26, -95);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = 2; ctx.stroke();
    // sunken cheek shadows
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath(); ctx.ellipse(-22, 2, 8, 20, 0.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(22, 2, 8, 20, -0.2, 0, TAU); ctx.fill();
    // angled slit eyes
    [[-15, -40, 0.35], [15, -40, -0.35]].forEach(([ex, ey, a]) => {
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
      ctx.fillStyle = "#000"; ctx.fillRect(-16, -6, 32, 12);
      ctx.fillStyle = "#e8ffff"; ctx.fillRect(-12, -1.5, 24, 3);
      ctx.restore();
      glow(ctx, ex, ey, 48, "rgba(0,229,255,0.95)", 0.65 + Math.random() * 0.35);
    });
    // jaw hanging open, long needle teeth
    ctx.save(); ctx.translate(0, 30);
    const open = pose === "run" ? 55 : 30 + Math.sin(t * 1.5) * 6;
    ctx.fillStyle = "#020304"; ctx.fillRect(-22, 0, 44, open);
    ctx.strokeStyle = mix("#f0f4f4", Math.max(0.3, lit)); ctx.lineWidth = 1.6;
    for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(i * 4, 0); ctx.lineTo(i * 4 + rnd(-1, 1), 16 + (i % 2) * 6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * 4, open); ctx.lineTo(i * 4, open - 14); ctx.stroke(); }
    ctx.fillStyle = chromeD; ctx.fillRect(-24, open, 48, 10);
    ctx.restore();
    ctx.restore();
    ctx.restore();
  }

  // Cabin 2 scene with the curtain; stage 0 behind, 1 peeking, 2 out & crouched, 3 empty
  function cabin2(ctx, stage, t, lit) {
    const cx = 960, top = 120, bottom = 700;
    if (stage === 1) nullPointer(ctx, 1010, 690, 0.8, { lit, t });
    if (stage === 2) nullPointer(ctx, 870, 700, 0.85, { lit, t });
    // curtain
    const open = stage === 0 ? 0 : stage === 1 ? 0.15 : stage === 2 ? 0.6 : 0.85;
    const left = cx + open * 260;
    const g = ctx.createLinearGradient(left, 0, 1280, 0);
    g.addColorStop(0, "#14060a"); g.addColorStop(0.5, "#240a12"); g.addColorStop(1, "#0a0305");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(left, top);
    for (let yy = top; yy <= bottom; yy += 20) ctx.lineTo(left + Math.sin(yy * 0.05 + t * 0.6) * 8, yy);
    ctx.lineTo(1280, bottom); ctx.lineTo(1280, top); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 6;
    for (let k = 1; k < 6; k++) { const fx = left + k * (1280 - left) / 6; ctx.beginPath(); ctx.moveTo(fx, top); ctx.lineTo(fx + Math.sin(t + k) * 6, bottom); ctx.stroke(); }
    // rod
    ctx.fillStyle = "#333"; ctx.fillRect(cx - 40, top - 12, 400, 8);
    if (stage === 0) { // eyes glinting through the gap
      const a = 0.4 + Math.sin(t * 3) * 0.3;
      glow(ctx, left + 8, 390, 30, "rgba(0,229,255,0.9)", a);
      glow(ctx, left + 10, 418, 22, "rgba(0,229,255,0.9)", a * 0.7);
    }
    if (stage === 1) { // fingers gripping the curtain
      ctx.strokeStyle = mix("#9aa6b0", lit); ctx.lineWidth = 4;
      for (let f = 0; f < 4; f++) { ctx.beginPath(); ctx.moveTo(left + 4, 330 + f * 14); ctx.lineTo(left - 30, 335 + f * 14); ctx.stroke(); }
    }
    if (stage === 3) { // torn, empty, scratch marks on the floor
      ctx.strokeStyle = "rgba(200,220,230,0.25)"; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(820 + i * 18, 690); ctx.lineTo(700 + i * 14, 715); ctx.stroke(); }
      ctx.fillStyle = "rgba(255,34,71,0.85)"; ctx.font = "bold 22px Consolas, monospace";
      ctx.fillText("ERR: POINTER NOT FOUND", 140, 680);
    }
  }

  // ---------------- Unit 03: ECHO ----------------
  // Crouched, speaker-cone face over a human-like jaw, cable "hair", strobing chest.
  function echo(ctx, x, y, s, o = {}) {
    const lit = o.lit ?? 0, t = o.t ?? 0;
    const body = mix("#4a4250", lit), bodyD = mix("#1a171e", lit), cone = mix("#141317", lit), rim = mix("#8a8290", lit), bonec = mix("#d8d0c0", lit);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const jit = Math.random() < 0.06 ? rnd(-8, 8) : 0;
    // crouched, knees up to the chest
    bone(ctx, [-50, -210, -120, -160, -95, -40, -130, 0], 22, bodyD, body);
    bone(ctx, [50, -210, 125, -170, 100, -40, 140, 0], 22, bodyD, body);
    // torso, curled forward
    const g = ctx.createLinearGradient(0, -400, 0, -200);
    g.addColorStop(0, body); g.addColorStop(1, bodyD);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-60, -200); ctx.bezierCurveTo(-110, -260, -100, -360, -50, -390);
    ctx.lineTo(55, -390); ctx.bezierCurveTo(105, -360, 110, -260, 60, -200); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = 3; ctx.stroke();
    // strobing LED grid
    for (let i = 0; i < 12; i++) {
      const on = Math.sin(t * 14 + i * 2.1) > 0.35;
      const lx = -45 + (i % 4) * 30, ly = -350 + Math.floor(i / 4) * 34;
      ctx.fillStyle = on ? "#fff" : "#0c0c0c"; ctx.fillRect(lx - 4, ly - 4, 8, 8);
      if (on) glow(ctx, lx, ly, 16, ["rgba(255,0,60,0.9)", "rgba(0,255,120,0.9)", "rgba(0,200,255,0.9)"][i % 3], 0.7);
    }
    // long arms reaching toward the viewer, splayed fingers
    bone(ctx, [-75, -370, -170, -300, -200, -170], 13, bodyD, body);
    bone(ctx, [80, -370, 175, -320, 215, -200], 13, bodyD, body);
    [[-200, -170, -1], [215, -200, 1]].forEach(([hx, hy, d]) => {
      for (let f = 0; f < 4; f++) limb(ctx, [hx, hy, hx + d * (10 + f * 10), hy + 30, hx + d * (6 + f * 14), hy + 70], 3, body);
    });
    // head
    ctx.save(); ctx.translate(jit, -470); ctx.rotate(Math.sin(t * 0.9) * 0.18 - 0.25);
    // human-like lower jaw hanging under the speaker
    ctx.save(); ctx.translate(0, 50);
    const gape = 26 + Math.sin(t * 9) * 8;
    ctx.fillStyle = mix("#c8a898", lit * 0.6);
    ctx.beginPath(); ctx.moveTo(-58, 30); ctx.quadraticCurveTo(0, 150 + gape, 58, 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#030203"; ctx.beginPath(); ctx.ellipse(0, 78, 38, gape, 0, 0, TAU); ctx.fill();
    teeth(ctx, -36, 78 - gape, 36, 9, 14, bonec, true);
    teeth(ctx, -32, 78 + gape, 32, 8, 12, bonec, false);
    ctx.restore();
    // cable hair, behind the cone
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI * 0.98 + i * 0.15;
      cable(ctx, Math.cos(a) * 92, Math.sin(a) * 92, 180 + (i % 3) * 50, i % 2 ? 30 : -30, mix(["#8a1530", "#1a5070", "#a08020", "#333"][i % 4], lit), 5, t * 1.5 + i);
    }
    // speaker cone
    ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(0, 0, 100, 0, TAU); ctx.fill();
    for (let r = 92; r > 8; r -= 12) {
      ctx.fillStyle = (r / 12) % 2 < 1 ? cone : mix("#2a272e", lit);
      ctx.beginPath(); ctx.arc(Math.sin(t * 25) * (92 - r) * 0.03, 0, r, 0, TAU); ctx.fill();
    }
    // torn cone flap
    ctx.fillStyle = "#000"; ctx.beginPath(); ctx.moveTo(20, -30); ctx.lineTo(70, -10); ctx.lineTo(40, 30); ctx.closePath(); ctx.fill();
    const p = 0.55 + Math.sin(t * 7) * 0.4;
    glow(ctx, 0, 0, 95, "rgba(255,0,40,0.95)", p);
    ctx.restore();
    ctx.restore();
  }

  // ---------------- Unit 04: DEADLOCK ----------------
  function deadlock(ctx, x, y, s, o = {}) {
    const lit = o.lit ?? 0, t = o.t ?? 0, grin = o.grin ?? 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const g = ctx.createLinearGradient(-200, -800, 200, 0);
    g.addColorStop(0, mix("#15151a", lit * 0.5)); g.addColorStop(1, "#020203");
    ctx.fillStyle = g;
    // massive body: shoulders wider than the doorway
    ctx.beginPath();
    ctx.moveTo(-120, 0); ctx.lineTo(-150, -380); ctx.quadraticCurveTo(-260, -520, -190, -600);
    ctx.quadraticCurveTo(-90, -660, -70, -690); ctx.quadraticCurveTo(0, -830, 70, -690);
    ctx.quadraticCurveTo(90, -660, 190, -600); ctx.quadraticCurveTo(260, -520, 150, -380);
    ctx.lineTo(120, 0); ctx.closePath(); ctx.fill();
    // arms hanging to the floor, slightly swaying, fingers curled
    const sw = Math.sin(t * 0.6) * 6;
    [[-1, -195], [1, 195]].forEach(([d, sx]) => {
      limb(ctx, [sx, -590, sx + d * 50, -330 + sw, sx + d * 30 + sw, -60], 46, "#040405");
      limb(ctx, [sx + d * 30 + sw, -60, sx + d * 40 + sw, -5], 18, "#040405");
      limb(ctx, [sx + d * 30 + sw, -60, sx + d * 10 + sw, -2], 14, "#040405");
      if (lit > 0.15) { ctx.save(); ctx.translate(-d * 12, 0); limb(ctx, [sx, -590, sx + d * 50, -330 + sw, sx + d * 30 + sw, -60], 3, `rgba(130,140,170,${lit * 0.35})`); ctx.restore(); }
    });
    // faint magnetic seams only visible when lit
    if (lit > 0.2) {
      ctx.strokeStyle = `rgba(120,130,160,${lit * 0.25})`; ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-150, -420 + i * 50); ctx.lineTo(150, -420 + i * 50); ctx.stroke(); }
    }
    // two cold white eyes, very close together
    const blink = (t % 6) < 0.12 ? 0.05 : 1;
    [[-22, -720], [22, -720]].forEach(([ex, ey]) => {
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(ex, ey, 7, 7 * blink, 0, 0, TAU); ctx.fill();
      glow(ctx, ex, ey, 50, "rgba(220,235,255,0.9)", 0.8 * blink);
    });
    // LED grin, far too wide
    if (grin > 0) {
      for (let i = -9; i <= 9; i++) {
        const gx = i * 11, gy = -655 - (i * i) * 0.5;
        ctx.globalAlpha = grin; glow(ctx, gx, gy, 9, "rgba(230,240,255,0.9)", 0.9); ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(255,255,255,${grin})`; ctx.fillRect(gx - 1.5, gy - 1.5, 3, 3);
      }
    }
    ctx.restore();
  }

  // ---------------- Unit 05: KERNEL ZERO ----------------
  // A wireframe hologram skull with a grin far too wide, chromatic split, tearing.
  function skullPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(-95, 10);
    ctx.bezierCurveTo(-120, -90, -70, -160, 0, -162);
    ctx.bezierCurveTo(70, -160, 120, -90, 95, 10);
    ctx.quadraticCurveTo(88, 40, 70, 55);
    ctx.lineTo(55, 110); ctx.quadraticCurveTo(0, 135, -55, 110);
    ctx.lineTo(-70, 55); ctx.quadraticCurveTo(-88, 40, -95, 10);
    ctx.closePath();
  }
  function kernelZero(ctx, x, y, s, o = {}) {
    const t = o.t ?? 0, power = o.power ?? 0.5;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const flick = Math.random() < 0.12 ? 0.25 : 1;
    const a = (0.4 + power * 0.6) * flick;
    // fiber tethers dropping into the dark
    ctx.globalAlpha = a * 0.8;
    for (let i = 0; i < 12; i++) cable(ctx, -70 + i * 13, -180, 180, Math.sin(t * 0.8 + i) * 34, `rgba(255,${30 + i * 8},60,0.55)`, 2.5, t + i);
    ctx.save(); ctx.translate(Math.sin(t * 1.7) * 5, -330 + Math.sin(t) * 9);
    const tear = Math.random() < 0.15 ? rnd(-25, 25) : 0;
    // chromatic split copies
    ctx.globalCompositeOperation = "lighter";
    [[-6, "rgba(255,0,40,0.5)"], [6, "rgba(0,200,255,0.35)"]].forEach(([dx, c]) => {
      ctx.save(); ctx.translate(dx + tear, 0); skullPath(ctx); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    });
    // translucent body
    const fill = ctx.createRadialGradient(0, -40, 10, 0, -20, 170);
    fill.addColorStop(0, "rgba(255,40,70,0.32)"); fill.addColorStop(1, "rgba(120,0,20,0.05)");
    skullPath(ctx); ctx.fillStyle = fill; ctx.globalAlpha = a; ctx.fill();
    ctx.strokeStyle = "rgba(255,150,165,0.95)"; ctx.lineWidth = 2.5; ctx.stroke();
    // wireframe lines across the cranium
    ctx.strokeStyle = "rgba(255,80,110,0.35)"; ctx.lineWidth = 1.2;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(0, -60, Math.abs(i) * 30 + 4, 100, 0, Math.PI, TAU); ctx.stroke(); }
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(0, -60 - k * 18, 100 - k * 14, 14, 0, Math.PI, TAU); ctx.stroke(); }
    ctx.globalCompositeOperation = "source-over";
    // hollow sockets
    ctx.fillStyle = "rgba(0,0,0,0.92)";
    ctx.beginPath(); ctx.ellipse(-42, -20, 30, 38, 0.25, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(42, -20, 30, 38, -0.25, 0, TAU); ctx.fill();
    poly(ctx, [0, 22, -13, 52, 13, 52], "rgba(0,0,0,0.92)");
    // pinpoint pupils that track
    const look = Math.sin(t * 0.6) * 9;
    glow(ctx, -42 + look, -16, 20, "rgba(255,255,255,0.95)", 0.95);
    glow(ctx, 42 + look, -16, 20, "rgba(255,255,255,0.95)", 0.95);
    // grin wider than the skull
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(255,120,140,0.95)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-120, 55); ctx.quadraticCurveTo(0, 125, 120, 55); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-120, 55); ctx.quadraticCurveTo(0, 95, 120, 55); ctx.stroke();
    for (let i = -11; i <= 11; i++) {
      const tx = i * 10, ty1 = 55 + (1 - (i / 12) ** 2) * 20, ty2 = 55 + (1 - (i / 12) ** 2) * 35;
      ctx.beginPath(); ctx.moveTo(tx, ty1); ctx.lineTo(tx, ty2); ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
    // scanlines + tear band
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    for (let yy = -170; yy < 140; yy += 5) ctx.fillRect(-140, yy + (t * 50) % 5, 280, 1.6);
    if (tear) { ctx.fillStyle = "rgba(255,40,70,0.35)"; ctx.fillRect(-140 + tear, rnd(-150, 100), 280, rnd(4, 14)); }
    ctx.restore();
    ctx.restore();
  }

  // glass containment chamber around Kernel Zero in Cabin 5
  function chamber(ctx, cx, floor, w, h, crack) {
    ctx.save();
    ctx.fillStyle = "rgba(120,20,30,0.08)"; ctx.fillRect(cx - w / 2, floor - h, w, h);
    ctx.strokeStyle = "rgba(200,220,230,0.35)"; ctx.lineWidth = 4; ctx.strokeRect(cx - w / 2, floor - h, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 18;
    ctx.beginPath(); ctx.moveTo(cx - w / 2 + 30, floor - h + 20); ctx.lineTo(cx - w / 2 + 90, floor - 20); ctx.stroke();
    if (crack > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${0.2 + crack * 0.5})`; ctx.lineWidth = 2;
      const n = Math.floor(crack * 14);
      for (let i = 0; i < n; i++) {
        const a = i * 2.4; ctx.beginPath(); ctx.moveTo(cx + 40, floor - h * 0.55);
        ctx.lineTo(cx + 40 + Math.cos(a) * (60 + i * 9), floor - h * 0.55 + Math.sin(a) * (50 + i * 7)); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ---------------- Effects ----------------
  const noiseCv = document.createElement("canvas"); noiseCv.width = 320; noiseCv.height = 180;
  const nctx = noiseCv.getContext("2d");
  const nimg = nctx.createImageData(320, 180);
  function staticNoise(ctx, alpha, tint = null) {
    const d = nimg.data;
    for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    nctx.putImageData(nimg, 0, 0);
    ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(noiseCv, 0, 0, 1280, 720);
    if (tint) { ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = tint; ctx.fillRect(0, 0, 1280, 720); }
    ctx.restore();
  }
  const scanCv = document.createElement("canvas"); scanCv.width = 4; scanCv.height = 4;
  { const c = scanCv.getContext("2d"); c.fillStyle = "rgba(0,0,0,0.35)"; c.fillRect(0, 0, 4, 2); }
  function scanlines(ctx, t) {
    ctx.save(); ctx.fillStyle = ctx.createPattern(scanCv, "repeat"); ctx.fillRect(0, 0, 1280, 720);
    const y = (t * 120) % 820 - 100;
    const g = ctx.createLinearGradient(0, y, 0, y + 100);
    g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(200,255,220,0.05)"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, y, 1280, 100);
    ctx.restore();
  }
  function vignette(ctx, strength = 0.85) {
    const g = ctx.createRadialGradient(640, 360, 200, 640, 360, 800);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${strength})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
  }
  // slice-offset glitch around any draw call
  function glitched(ctx, amount, draw) {
    if (amount <= 0) { draw(); return; }
    const slices = 7;
    for (let i = 0; i < slices; i++) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, (720 / slices) * i, 1280, 720 / slices + 1); ctx.clip();
      ctx.translate((Math.random() - 0.5) * amount * 60, 0);
      draw();
      ctx.restore();
    }
  }

  const ROBOTS = { rust: rustByte, np: nullPointer, echo, deadlock, kz: kernelZero };
  // where each robot's face is (local units), for jumpscares
  const FACE = { rust: [170, -505], np: [4, -680], echo: [0, -450], deadlock: [0, -715], kz: [0, -340] };

  // Draw a robot through an offscreen layer so its body falls off into darkness
  // away from its glowing face, with grime texture on top.
  const off = document.createElement("canvas"); off.width = 1280; off.height = 720;
  const octx = off.getContext("2d");
  const grit = document.createElement("canvas"); grit.width = 256; grit.height = 256;
  {
    const g = grit.getContext("2d"), id = g.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = Math.random() < 0.06 ? 70 + Math.random() * 40 : 0;   // mostly dark grime, a few light scratches
      id.data[i] = v * 0.9; id.data[i + 1] = v * 0.8; id.data[i + 2] = v * 0.7; id.data[i + 3] = v ? 60 : Math.random() * 170;
    }
    g.putImageData(id, 0, 0);
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(0,0,0,${0.2 + Math.random() * 0.4})`; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 10, 0, TAU); g.fill(); }
  }
  function drawRobot(ctx, who, x, y, s, o = {}) {
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.globalCompositeOperation = "source-over"; octx.globalAlpha = 1;
    octx.clearRect(0, 0, 1280, 720);
    const m = ctx.getTransform();
    octx.setTransform(m);
    deferred = [];
    ROBOTS[who](octx, x, y, s, o);
    const glows = deferred; deferred = null;
    // light falloff from the face
    const [fx, fy] = FACE[who];
    const cx = x + fx * s, cy = y + fy * s;
    octx.globalCompositeOperation = "source-atop";
    const reach = (o.reach || 520) * s;
    const g = octx.createRadialGradient(cx, cy - 40 * s, 10 * s, cx, cy, reach);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.35, "rgba(0,0,0,0.2)");
    g.addColorStop(1, "rgba(0,0,0,0.93)");
    octx.fillStyle = g; octx.fillRect(-2000, -2000, 6000, 6000);
    octx.globalAlpha = 0.55;
    octx.fillStyle = octx.createPattern(grit, "repeat"); octx.fillRect(-2000, -2000, 6000, 6000);
    octx.globalAlpha = 1; octx.globalCompositeOperation = "source-over";
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(off, 0, 0); ctx.restore();
    glows.forEach(([gm, ga, gx, gy, gr, gc, gaa]) => {
      ctx.save(); ctx.setTransform(gm); ctx.globalAlpha = ga; glow(ctx, gx, gy, gr, gc, gaa * ga); ctx.restore();
    });
  }
  const ALIAS = { dl: "deadlock", deadlock: "deadlock", rust: "rust", np: "np", echo: "echo", kz: "kz" };
  function jumpscare(ctx, whoIn, t, k) {
    // k: 0..1 progress of the lunge
    const who = ALIAS[whoIn] || "rust";
    const s = 1.2 + k * 2.8;
    const [fx, fy] = FACE[who];
    const jx = (Math.random() - 0.5) * 40, jy = (Math.random() - 0.5) * 40;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 1280, 720);
    glitched(ctx, 0.6, () => drawRobot(ctx, who, 640 - fx * s + jx, 400 - fy * s + jy, s, { lit: 0.85, t: t * 3, grin: 1, power: 1, pose: "stand", reach: 260 }));
    ctx.fillStyle = `rgba(255,0,30,${0.15 + Math.random() * 0.2})`; ctx.fillRect(0, 0, 1280, 720);
    staticNoise(ctx, 0.12);
  }

  return { drawRobot, rustByte, nullPointer, cabin2, echo, deadlock, kernelZero, chamber, staticNoise, scanlines, vignette, glitched, glow, jumpscare, ROBOTS };
})();
