/* ═══════════════════════════════════════════════════════════════════
   HUB OF DUTY — FPS 3D « 2029 » du Hub IA C.I.M.
   Trois.js r128 · 100 % procédural (aucun asset) · hommage non
   commercial à l'univers Terminator. Machines de Skynet : ESK-800
   (endosquelettes), LQ-1000 (polyalliage mimétique), HK-Aérien,
   HK-Lourd. Lasers, vagues, IA à états avec vision/cover.
   ── PARTIE 1 : noyau, audio, textures, monde ──
   ═══════════════════════════════════════════════════════════════════ */
(function () {
'use strict';
if (!window.THREE) { document.getElementById('fpsNoWebGL').style.display = 'block'; return; }
var T = window.THREE;

/* ── Utilitaires ── */
function rnd(a, b) { return a + Math.random() * (b - a); }
function rndi(a, b) { return Math.floor(rnd(a, b + 1)); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
var _v1 = new T.Vector3(), _v2 = new T.Vector3(), _v3 = new T.Vector3(), _ray = new T.Ray(), _sp = new T.Sphere();

/* ── État global ── */
var G = {
  mode: 'menu',            /* menu | play | pause | over */
  diff: 'resistant', quality: 'equilibre',
  wave: 0, score: 0, kills: 0, head: 0, fired: 0, hitC: 0,
  shake: 0, muted: false, brain: false,
  restTimer: 0, spawnQueue: [], spawnTimer: 0,
  best: parseInt(localStorage.getItem('hod_best') || '0', 10)
};
var DIFFS = {
  recrue:    { label: 'Recrue',    edmg: 0.6,  erof: 0.65, esp: 1.3,  ehp: 0.8  },
  resistant: { label: 'Résistant', edmg: 1.0,  erof: 1.0,  esp: 1.0,  ehp: 1.0  },
  veteran:   { label: 'Vétéran',   edmg: 1.4,  erof: 1.35, esp: 0.8,  ehp: 1.25 }
};
var QUAL = {
  perf:      { pr: 0.85, shadow: false, shadowRes: 512,  label: 'Performance' },
  equilibre: { pr: 1.25, shadow: true,  shadowRes: 1024, label: 'Équilibré' },
  beaute:    { pr: 2.0,  shadow: true,  shadowRes: 2048, label: 'Beauté' }
};

/* ═══ AUDIO 100 % synthétisé (Web Audio) ═══ */
var AC = null, master = null, noiseBuf = null;
function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = G.muted ? 0 : 0.5;
    master.connect(AC.destination);
    var len = AC.sampleRate * 1.2, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0), i;
    for (i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = buf;
    ambience();
  } catch (e) { AC = null; }
}
function tone(type, f0, f1, dur, vol, when) {
  if (!AC) return;
  var t = AC.currentTime + (when || 0);
  var o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, fc, when) {
  if (!AC || !noiseBuf) return;
  var t = AC.currentTime + (when || 0);
  var s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  var f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(fc, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(fc * 0.15, 40), t + dur);
  var g = AC.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t); s.stop(t + dur + 0.05);
}
var sfx = {
  shoot: function () { tone('sawtooth', 950, 190, 0.11, 0.16); noise(0.05, 0.06, 4200); },
  eshoot: function () { tone('square', 340, 110, 0.16, 0.09); },
  tank: function () { tone('square', 150, 45, 0.32, 0.22); noise(0.22, 0.14, 900); },
  hit: function () { tone('triangle', 1500, 900, 0.05, 0.12); },
  crit: function () { tone('triangle', 2100, 1300, 0.07, 0.15); tone('triangle', 1500, 900, 0.05, 0.1, 0.04); },
  kill: function () { tone('sine', 300, 80, 0.3, 0.2); noise(0.25, 0.18, 1600); },
  boom: function () { noise(0.7, 0.4, 700); tone('sine', 90, 30, 0.6, 0.35); },
  hurt: function () { tone('sawtooth', 200, 70, 0.18, 0.2); noise(0.1, 0.1, 500); },
  reload: function () { tone('square', 220, 140, 0.06, 0.08); tone('square', 340, 500, 0.05, 0.08, 0.5); },
  dry: function () { tone('square', 180, 160, 0.05, 0.07); },
  wave: function () { tone('sine', 160, 320, 0.5, 0.16); tone('sine', 240, 480, 0.5, 0.12, 0.15); },
  pick: function () { tone('sine', 700, 1050, 0.09, 0.1); }
};
function ambience() { /* drone de fond + grondements lointains */
  if (!AC) return;
  var g = AC.createGain(); g.gain.value = 0.028; g.connect(master);
  [52, 55.7].forEach(function (f) {
    var o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    var fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 140;
    o.connect(fl); fl.connect(g); o.start();
  });
  (function rumble() {
    if (Math.random() < 0.8) noise(rnd(1.2, 2.4), rnd(0.02, 0.05), rnd(120, 320));
    setTimeout(rumble, rnd(6000, 15000));
  })();
}

/* ═══ TEXTURES PROCÉDURALES (canvas) ═══ */
function makeTex(w, h, fn, repX, repY) {
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  var t = new T.CanvasTexture(c);
  t.encoding = T.sRGBEncoding;
  if (repX) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repX, repY || repX); }
  t.anisotropy = 4;
  return t;
}
function texAsphalt() {
  return makeTex(512, 512, function (x, w, h) {
    x.fillStyle = '#23201d'; x.fillRect(0, 0, w, h);
    for (var i = 0; i < 5200; i++) {
      x.fillStyle = 'rgba(' + rndi(20, 70) + ',' + rndi(18, 62) + ',' + rndi(16, 55) + ',.5)';
      x.fillRect(rnd(0, w), rnd(0, h), rnd(1, 2.6), rnd(1, 2.6));
    }
    x.strokeStyle = 'rgba(10,8,8,.8)'; x.lineWidth = 2;
    for (i = 0; i < 9; i++) { /* fissures */
      x.beginPath(); var px = rnd(0, w), py = rnd(0, h); x.moveTo(px, py);
      for (var j = 0; j < 7; j++) { px += rnd(-60, 60); py += rnd(-60, 60); x.lineTo(px, py); }
      x.stroke();
    }
    x.strokeStyle = 'rgba(200,180,90,.25)'; x.lineWidth = 9; /* marquage usé */
    x.beginPath(); x.moveTo(w * 0.5, 0); x.lineTo(w * 0.5, h); x.stroke();
  }, 7, 7);
}
function texBuilding(windows) {
  return makeTex(256, 512, function (x, w, h) {
    x.fillStyle = '#3b3835'; x.fillRect(0, 0, w, h);
    for (var i = 0; i < 1600; i++) {
      x.fillStyle = 'rgba(' + rndi(40, 90) + ',' + rndi(38, 85) + ',' + rndi(36, 80) + ',.4)';
      x.fillRect(rnd(0, w), rnd(0, h), rnd(1, 3), rnd(1, 3));
    }
    var rows = 8, cols = 4, mw = 26, mh = 34, gy = 10, gx = 22;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var wx = gx + c * (mw + gx), wy = 18 + r * (mh + gy);
      if (windows && Math.random() < 0.14) { /* fenêtre brisée incandescente */
        var gr = x.createLinearGradient(wx, wy, wx + mw, wy + mh);
        gr.addColorStop(0, '#ff7b2d'); gr.addColorStop(1, '#8a2c0d');
        x.fillStyle = gr;
      } else x.fillStyle = '#0c0d10';
      x.fillRect(wx, wy, mw, mh);
      x.strokeStyle = '#2a2825'; x.lineWidth = 3; x.strokeRect(wx, wy, mw, mh);
    }
    x.fillStyle = 'rgba(12,10,9,.5)'; /* suie */
    for (i = 0; i < 5; i++) { x.beginPath(); x.ellipse(rnd(0, w), rnd(0, h), rnd(30, 90), rnd(20, 60), rnd(0, 3), 0, 6.3); x.fill(); }
  }, 2, 2);
}
function texRust() {
  return makeTex(256, 256, function (x, w, h) {
    x.fillStyle = '#5a4a3c'; x.fillRect(0, 0, w, h);
    for (var i = 0; i < 900; i++) {
      x.fillStyle = 'rgba(' + rndi(90, 160) + ',' + rndi(45, 80) + ',' + rndi(20, 45) + ',' + rnd(0.15, 0.5).toFixed(2) + ')';
      x.beginPath(); x.ellipse(rnd(0, w), rnd(0, h), rnd(2, 14), rnd(2, 10), 0, 0, 6.3); x.fill();
    }
    x.strokeStyle = 'rgba(25,20,16,.7)'; x.lineWidth = 2;
    for (i = 0; i < 12; i++) { x.beginPath(); x.moveTo(rnd(0, w), rnd(0, h)); x.lineTo(rnd(0, w), rnd(0, h)); x.stroke(); }
  }, 1, 1);
}
function texGlow(colorInner) {
  return makeTex(128, 128, function (x, w, h) {
    var g = x.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    g.addColorStop(0, colorInner); g.addColorStop(0.35, colorInner.replace('1)', '0.5)'));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
}
function texSky() {
  return makeTex(1024, 512, function (x, w, h) {
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0b0e1c'); g.addColorStop(0.45, '#2a1b22');
    g.addColorStop(0.72, '#7a3018'); g.addColorStop(0.85, '#c95c1e'); g.addColorStop(1, '#e8812f');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    var s = x.createRadialGradient(w * 0.62, h * 0.8, 8, w * 0.62, h * 0.8, 130);
    s.addColorStop(0, 'rgba(255,220,160,.95)'); s.addColorStop(0.25, 'rgba(255,150,60,.55)'); s.addColorStop(1, 'rgba(255,120,40,0)');
    x.fillStyle = s; x.fillRect(0, 0, w, h);
    x.globalAlpha = 0.18; x.fillStyle = '#05060a'; /* nuages sombres */
    for (var i = 0; i < 16; i++) {
      x.beginPath(); x.ellipse(rnd(0, w), rnd(0, h * 0.55), rnd(60, 190), rnd(10, 26), 0, 0, 6.3); x.fill();
    }
    x.globalAlpha = 1;
  });
}

/* ═══ RENDERER · SCÈNE · CAMÉRA ═══ */
var wrap = document.getElementById('fpsWrap');
var renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.outputEncoding = T.sRGBEncoding;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
wrap.appendChild(renderer.domElement);

var scene = new T.Scene();
scene.fog = new T.Fog(0x2a1712, 26, 150);
var camera = new T.PerspectiveCamera(75, 1, 0.08, 700);

/* ── Lumières ── */
var hemi = new T.HemisphereLight(0x57302a, 0x140f0d, 0.75); scene.add(hemi);
var sun = new T.DirectionalLight(0xff8845, 1.25);
sun.position.set(95, 42, -70);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -85; sun.shadow.camera.right = 85;
sun.shadow.camera.top = 85; sun.shadow.camera.bottom = -85;
sun.shadow.camera.far = 320; sun.shadow.bias = -0.0006;
scene.add(sun);
scene.add(new T.AmbientLight(0x241a16, 0.5));

/* ── Ciel ── */
var sky = new T.Mesh(new T.SphereGeometry(420, 24, 16),
  new T.MeshBasicMaterial({ map: texSky(), side: T.BackSide, fog: false }));
scene.add(sky);

/* ── Sol ── */
var ground = new T.Mesh(new T.PlaneGeometry(460, 460),
  new T.MeshStandardMaterial({ map: texAsphalt(), roughness: 0.94, metalness: 0.05 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
scene.add(ground);

/* ── Colliders (Boîtes alignées) ── */
var COL = [];   /* THREE.Box3, obstacles solides */
function addCollider(mesh, pad) {
  var b = new T.Box3().setFromObject(mesh);
  if (pad) b.expandByScalar(pad);
  COL.push(b);
  return b;
}

/* ── Matériaux partagés du monde ── */
var matB1 = new T.MeshStandardMaterial({ map: texBuilding(true), roughness: 0.9, metalness: 0.08 });
var matB2 = new T.MeshStandardMaterial({ map: texBuilding(false), roughness: 0.9, metalness: 0.08 });
var matRust = new T.MeshStandardMaterial({ map: texRust(), roughness: 0.75, metalness: 0.45 });
var matRubble = new T.MeshStandardMaterial({ color: 0x4a443f, roughness: 0.95 });
var matDark = new T.MeshStandardMaterial({ color: 0x0d0e12, roughness: 0.8 });

/* ── Immeubles ruinés ── */
(function buildCity() {
  var placed = [], tries, i, j, ok, x, z, w, d, h, m;
  for (i = 0; i < 30; i++) {
    for (tries = 0; tries < 24; tries++) {
      var ang = rnd(0, Math.PI * 2), rad = rnd(34, 100);
      x = Math.cos(ang) * rad; z = Math.sin(ang) * rad;
      w = rnd(9, 19); d = rnd(9, 19); h = rnd(8, 34);
      ok = true;
      for (j = 0; j < placed.length; j++) {
        var p = placed[j];
        if (Math.abs(x - p.x) < (w + p.w) / 2 + 7 && Math.abs(z - p.z) < (d + p.d) / 2 + 7) { ok = false; break; }
      }
      if (ok) break;
    }
    if (!ok) continue;
    placed.push({ x: x, z: z, w: w, d: d });
    m = new T.Mesh(new T.BoxGeometry(w, h, d), Math.random() < 0.5 ? matB1 : matB2);
    m.position.set(x, h / 2, z);
    m.castShadow = m.receiveShadow = true;
    scene.add(m); addCollider(m);
    var nTop = rndi(1, 2); /* silhouettes effondrées */
    for (var k = 0; k < nTop; k++) {
      var t = new T.Mesh(new T.BoxGeometry(rnd(3, w * 0.6), rnd(1.5, 5), rnd(3, d * 0.6)), matRubble);
      t.position.set(x + rnd(-w * 0.25, w * 0.25), h + t.geometry.parameters.height / 2 - 0.5, z + rnd(-d * 0.25, d * 0.25));
      t.castShadow = true; scene.add(t);
    }
  }
  /* épaves de voitures */
  for (i = 0; i < 14; i++) {
    var g = new T.Group();
    var body = new T.Mesh(new T.BoxGeometry(rnd(3.8, 4.6), 1.0, 1.9), matRust);
    body.position.y = 0.65; body.castShadow = true;
    var cab = new T.Mesh(new T.BoxGeometry(2.0, 0.75, 1.7), matDark);
    cab.position.set(rnd(-0.4, 0.4), 1.45, 0); cab.castShadow = true;
    g.add(body); g.add(cab);
    var ang2 = rnd(0, Math.PI * 2), rad2 = rnd(14, 96);
    g.position.set(Math.cos(ang2) * rad2, 0, Math.sin(ang2) * rad2);
    g.rotation.y = rnd(0, Math.PI * 2);
    scene.add(g); addCollider(g, 0.15);
  }
  /* gravats */
  for (i = 0; i < 16; i++) {
    var gp = new T.Group(), n = rndi(3, 6);
    for (j = 0; j < n; j++) {
      var s = rnd(0.5, 1.6);
      var rock = new T.Mesh(new T.DodecahedronGeometry(s, 0), matRubble);
      rock.position.set(rnd(-1.6, 1.6), s * 0.5, rnd(-1.6, 1.6));
      rock.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
      rock.castShadow = rock.receiveShadow = true;
      gp.add(rock);
    }
    var ang3 = rnd(0, Math.PI * 2), rad3 = rnd(12, 95);
    gp.position.set(Math.cos(ang3) * rad3, 0, Math.sin(ang3) * rad3);
    scene.add(gp); addCollider(gp, 0.3);
  }
  /* murs d'enceinte invisibles (arène ≈ ±105 m) */
  var E = 106;
  [[0, -E, 2 * E + 8, 3], [0, E, 2 * E + 8, 3], [-E, 0, 3, 2 * E + 8], [E, 0, 3, 2 * E + 8]].forEach(function (c) {
    var wall = new T.Mesh(new T.BoxGeometry(c[2], 3, c[3]), matDark);
    wall.position.set(c[0], 1.5, c[1]);
    scene.add(wall); addCollider(wall);
  });
  /* silhouettes de skyline lointaine (hors limites, dans la brume) */
  for (i = 0; i < 34; i++) {
    var a4 = (i / 34) * Math.PI * 2 + rnd(-0.06, 0.06);
    var r4 = rnd(150, 200), hh = rnd(18, 62);
    var far = new T.Mesh(new T.BoxGeometry(rnd(10, 26), hh, rnd(10, 26)), matDark);
    far.position.set(Math.cos(a4) * r4, hh / 2, Math.sin(a4) * r4);
    scene.add(far);
  }
})();

/* ── Feux (sprites additifs scintillants) ── */
var fires = [];
var texFlame = texGlow('rgba(255,160,40,1)');
for (var fi = 0; fi < 9; fi++) {
  var fs = new T.Sprite(new T.SpriteMaterial({ map: texFlame, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.85 }));
  var fa = rnd(0, Math.PI * 2), fr = rnd(15, 90);
  fs.position.set(Math.cos(fa) * fr, rnd(0.5, 1.3), Math.sin(fa) * fr);
  fs.scale.set(rnd(1.4, 2.6), rnd(1.8, 3.4), 1);
  scene.add(fs); fires.push(fs);
}

/* ── Poussière en suspension ── */
var dustObj = null;
(function dust() {
  var N = 380, pos = new Float32Array(N * 3), i;
  for (i = 0; i < N; i++) {
    pos[i * 3] = rnd(-100, 100); pos[i * 3 + 1] = rnd(0.3, 16); pos[i * 3 + 2] = rnd(-100, 100);
  }
  var geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  dustObj = new T.Points(geo, new T.PointsMaterial({
    color: 0xd8956a, size: 0.14, transparent: true, opacity: 0.4,
    blending: T.AdditiveBlending, depthWrite: false
  }));
  scene.add(dustObj);
})();
