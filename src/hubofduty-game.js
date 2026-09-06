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
/* ═══ HUB OF DUTY — PARTIE 2 : machines de Skynet, IA, lasers, vagues ═══ */

/* ── Matériaux des machines ── */
var matBody = new T.MeshStandardMaterial({ color: 0x8f959c, roughness: 0.42, metalness: 0.88 });
var matJoint = new T.MeshStandardMaterial({ color: 0x565b62, roughness: 0.5, metalness: 0.85 });
var matChrome = new T.MeshStandardMaterial({ color: 0xd4dde6, roughness: 0.14, metalness: 1.0 });
var matEye = new T.MeshBasicMaterial({ color: 0xff2211 });
var texGlowRed = texGlow('rgba(255,60,30,1)');
var texGlowBlue = texGlow('rgba(90,210,255,1)');
var texGlowOrange = texGlow('rgba(255,170,60,1)');

function glowSprite(tex, size, opacity) {
  var s = new T.Sprite(new T.SpriteMaterial({ map: tex, blending: T.AdditiveBlending, depthWrite: false, opacity: opacity || 0.9 }));
  s.scale.set(size, size, 1);
  return s;
}

/* ── Fabriques de machines (primitives, 100 % code) ── */
function box(w, h, d, mat) {
  var m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  m.castShadow = true; return m;
}
function sph(r, mat, seg) {
  var m = new T.Mesh(new T.SphereGeometry(r, seg || 10, seg || 8), mat);
  m.castShadow = true; return m;
}
function cyl(r, h, mat) {
  var m = new T.Mesh(new T.CylinderGeometry(r, r, h, 10), mat);
  m.castShadow = true; return m;
}

function makeESK() { /* endosquelette inspiré du T-800 */
  var g = new T.Group();
  var pelvis = box(0.42, 0.22, 0.28, matJoint); pelvis.position.y = 1.02; g.add(pelvis);
  var torso = box(0.52, 0.55, 0.3, matBody); torso.position.y = 1.42; g.add(torso);
  for (var r = 0; r < 3; r++) { /* côtes */
    var rib = box(0.46, 0.05, 0.24, matJoint); rib.position.set(0, 1.28 + r * 0.14, 0.03); g.add(rib);
  }
  var head = box(0.24, 0.26, 0.28, matBody); head.position.y = 1.86; g.add(head);
  var jaw = box(0.18, 0.09, 0.2, matJoint); jaw.position.set(0, 1.72, 0.03); g.add(jaw);
  var eL = sph(0.038, matEye); eL.position.set(-0.06, 1.9, 0.15); g.add(eL);
  var eR = sph(0.038, matEye); eR.position.set(0.06, 1.9, 0.15); g.add(eR);
  var gl = glowSprite(texGlowRed, 0.3); gl.position.set(0, 1.9, 0.19); g.add(gl); g.userData.eyeGlow = gl;
  var armL = new T.Group(), armR = new T.Group();
  var uaL = box(0.11, 0.42, 0.11, matJoint); uaL.position.y = -0.2; armL.add(uaL);
  var laL = box(0.1, 0.4, 0.1, matBody); laL.position.y = -0.58; armL.add(laL);
  armL.position.set(-0.34, 1.66, 0); g.add(armL);
  var uaR = box(0.11, 0.42, 0.11, matJoint); uaR.position.y = -0.2; armR.add(uaR);
  var laR = box(0.1, 0.4, 0.1, matBody); laR.position.y = -0.58; armR.add(laR);
  var gun = box(0.09, 0.14, 0.62, matDark); gun.position.set(0, -0.82, 0.2); armR.add(gun);
  var bar = cyl(0.025, 0.3, matDark); bar.rotation.x = Math.PI / 2; bar.position.set(0, -0.82, 0.6); armR.add(bar);
  var mz = new T.Object3D(); mz.position.set(0, -0.82, 0.78); armR.add(mz); g.userData.muzzle = mz;
  armR.position.set(0.34, 1.66, 0); g.add(armR);
  var legL = new T.Group(), legR = new T.Group();
  var thL = box(0.15, 0.5, 0.15, matJoint); thL.position.y = -0.26; legL.add(thL);
  var shL = box(0.12, 0.48, 0.13, matBody); shL.position.y = -0.74; legL.add(shL);
  var ftL = box(0.13, 0.08, 0.3, matJoint); ftL.position.set(0, -1.0, 0.07); legL.add(ftL);
  legL.position.set(-0.16, 1.02, 0); g.add(legL);
  var thR = box(0.15, 0.5, 0.15, matJoint); thR.position.y = -0.26; legR.add(thR);
  var shR = box(0.12, 0.48, 0.13, matBody); shR.position.y = -0.74; legR.add(shR);
  var ftR = box(0.13, 0.08, 0.3, matJoint); ftR.position.set(0, -1.0, 0.07); legR.add(ftR);
  legR.position.set(0.16, 1.02, 0); g.add(legR);
  g.userData.anim = { legL: legL, legR: legR, armL: armL, armR: armR };
  return g;
}
function makeMIM() { /* infiltrateur en polyalliage mimétique (inspiré T-1000) */
  var g = new T.Group();
  var body = new T.Mesh(T.CapsuleGeometry ? new T.CapsuleGeometry(0.26, 0.9, 6, 12) : new T.CylinderGeometry(0.26, 0.26, 1.3, 12), matChrome);
  body.position.y = 1.15; body.castShadow = true; g.add(body);
  var head = sph(0.19, matChrome, 14); head.position.y = 1.86; g.add(head);
  var slit = box(0.16, 0.03, 0.02, matEye); slit.position.set(0, 1.88, 0.17); g.add(slit);
  var gl = glowSprite(texGlowRed, 0.36); gl.position.set(0, 1.88, 0.2); g.add(gl); g.userData.eyeGlow = gl;
  var armL = box(0.09, 0.85, 0.09, matChrome); armL.position.set(-0.34, 1.2, 0); armL.rotation.z = 0.12; g.add(armL);
  var armR = box(0.09, 0.85, 0.09, matChrome); armR.position.set(0.34, 1.2, 0); armR.rotation.z = -0.12; g.add(armR);
  var legL = box(0.11, 0.9, 0.11, matChrome); legL.position.set(-0.14, 0.48, 0); g.add(legL);
  var legR = box(0.11, 0.9, 0.11, matChrome); legR.position.set(0.14, 0.48, 0); g.add(legR);
  g.userData.anim = { legL: legL, legR: legR, armL: armL, armR: armR };
  return g;
}
function makeHK() { /* chasseur volant (inspiré HK-Aerial) */
  var g = new T.Group();
  var hull = sph(0.85, matBody, 12); hull.scale.set(1.7, 0.55, 1.1); g.add(hull);
  var tail = box(1.3, 0.16, 0.5, matJoint); tail.position.set(-1.2, 0.1, 0); g.add(tail);
  var eyeL = cyl(0.22, 1.5, matJoint); eyeL.rotation.z = Math.PI / 2; eyeL.position.set(1.15, -0.1, -0.5); g.add(eyeL);
  var eyeR = cyl(0.22, 1.5, matJoint); eyeR.rotation.z = Math.PI / 2; eyeR.position.set(1.15, -0.1, 0.5); g.add(eyeR);
  var search = glowSprite(texGlowRed, 1.6, 0.8); search.position.set(1.0, -0.55, 0); g.add(search);
  var gun = cyl(0.07, 1.1, matDark); gun.rotation.z = Math.PI / 2; gun.position.set(1.0, -0.32, 0); g.add(gun);
  var mz = new T.Object3D(); mz.position.set(1.6, -0.32, 0); g.add(mz); g.userData.muzzle = mz;
  var gl = glowSprite(texGlowRed, 0.7, 0.65); gl.position.set(0.6, -0.1, 0); g.add(gl); g.userData.eyeGlow = gl;
  return g;
}
function makeTANK() { /* HK terrestre lourd (inspiré HK-Tank) */
  var g = new T.Group();
  var hull = box(2.0, 1.25, 3.1, matBody); hull.position.y = 1.9; g.add(hull);
  var deck = box(1.4, 0.5, 1.6, matJoint); deck.position.set(0, 2.7, -0.3); g.add(deck);
  var visor = box(1.1, 0.12, 0.1, matEye); visor.position.set(0, 2.1, 1.58); g.add(visor);
  var gl = glowSprite(texGlowRed, 1.5, 0.8); gl.position.set(0, 2.1, 1.66); g.add(gl); g.userData.eyeGlow = gl;
  var canL = cyl(0.14, 1.5, matDark); canL.rotation.x = Math.PI / 2; canL.position.set(-0.55, 2.45, 1.5); g.add(canL);
  var canR = cyl(0.14, 1.5, matDark); canR.rotation.x = Math.PI / 2; canR.position.set(0.55, 2.45, 1.5); g.add(canR);
  var mz = new T.Object3D(); mz.position.set(0, 2.45, 2.3); g.add(mz); g.userData.muzzle = mz;
  var tL = box(0.6, 1.15, 3.0, matJoint); tL.position.set(-1.15, 0.62, 0); g.add(tL);
  var tR = box(0.6, 1.15, 3.0, matJoint); tR.position.set(1.15, 0.62, 0); g.add(tR);
  g.userData.anim = { legL: tL, legR: tR, armL: null, armR: null };
  return g;
}

/* ── Catalogue des machines ── */
var TYPES = {
  esk:  { make: makeESK,  hp: 60,  speed: 3.6, view: 48, fovDeg: 120, score: 100, h: 2.05, headR: 0.26, bodyR: 0.5,
          bolt: { dmg: 9,  spd: 55, r: 0.09, color: 0xff5522 }, range: 30, fav: [9, 18], burst: 3, bcd: [1.1, 2.0] },
  mim:  { make: makeMIM,  hp: 45,  speed: 6.4, view: 60, fovDeg: 150, score: 150, h: 1.95, headR: 0.22, bodyR: 0.42,
          melee: 12, range: 0 },
  hk:   { make: makeHK,   hp: 90,  speed: 6.0, view: 80, fovDeg: 360, score: 250, h: 11.5, headR: 0, bodyR: 1.1,
          bolt: { dmg: 11, spd: 46, r: 0.1, color: 0xff4418 }, range: 42, fav: [16, 26], burst: 2, bcd: [1.4, 2.4] },
  tank: { make: makeTANK, hp: 240, speed: 1.5, view: 55, fovDeg: 140, score: 400, h: 2.7, headR: 0, bodyR: 1.35,
          bolt: { dmg: 30, spd: 30, r: 0.3, color: 0xff6622 }, range: 34, fav: [14, 24], burst: 1, bcd: [2.6, 3.4] }
};

/* ── Tableaux d'entités ── */
var enemies = [], bolts = [], sparks = [];
var botGeoCache = null;

function spawnEnemy(typeKey) {
  var tp = TYPES[typeKey];
  var g = tp.make();
  var a = rnd(0, Math.PI * 2), r = rnd(72, 98);
  var e = {
    type: typeKey, tp: tp, g: g,
    pos: new T.Vector3(Math.cos(a) * r, typeKey === 'hk' ? rnd(10, 13) : 0, Math.sin(a) * r),
    hp: tp.hp * DIFFS[G.diff].ehp,
    yaw: rnd(0, Math.PI * 2), phase: rnd(0, 6),
    state: 'patrol', seen: 0, lastLOS: -9, lastHurt: -9,
    strafe: Math.random() < 0.5 ? 1 : -1, strafeT: 0,
    cd: rnd(0.5, 1.6), burstLeft: 0, burstT: 0,
    losT: rnd(0, 0.25), engaged: false,
    dead: 0, walkPh: rnd(0, 6)
  };
  g.position.copy(e.pos);
  /* cône de vision (bouton « cerveau des machines ») */
  if (!botGeoCache) {
    botGeoCache = new T.ConeGeometry(1, 1, 20, 1, true);
    botGeoCache.rotateX(-Math.PI / 2);
    botGeoCache.translate(0, 0, 0.5);
  }
  var cone = new T.Mesh(botGeoCache, new T.MeshBasicMaterial({
    color: 0xff3322, transparent: true, opacity: 0.1,
    blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide
  }));
  cone.scale.set(tp.view * 0.55, tp.view * 0.55, tp.view);
  cone.position.y = typeKey === 'hk' ? 0 : 1.85;
  cone.visible = false;
  g.add(cone); e.cone = cone;
  scene.add(g);
  enemies.push(e);
  return e;
}

/* ── Tir : lasers (segments testés en pur math, zéro Raycaster) ── */
var boltGeo = new T.BoxGeometry(0.09, 0.09, 1.5);
var boltMats = {};
function boltMat(color) {
  if (!boltMats[color]) boltMats[color] = new T.MeshBasicMaterial({ color: color, blending: T.AdditiveBlending, transparent: true, opacity: 0.95, depthWrite: false });
  return boltMats[color];
}
function fireBolt(from, dir, tp, owner) {
  var b = tp.bolt;
  var m = new T.Mesh(boltGeo, boltMat(b.color));
  var len = b.r > 0.2 ? 2.6 : 1.5;
  m.scale.set(b.r / 0.09, b.r / 0.09, len / 1.5);
  m.position.copy(from);
  var g = glowSprite(b.color === 0x35d0ff ? texGlowBlue : texGlowRed, b.r * 14, 0.85);
  m.add(g);
  m.lookAt(_v1.copy(from).add(dir));
  scene.add(m);
  bolts.push({ m: m, dir: dir.clone(), spd: b.spd, dmg: b.dmg * (owner === 'e' ? DIFFS[G.diff].edmg : 1), life: 2.6, owner: owner });
  G.fired += (owner === 'p' ? 1 : 0);
}
/* segment→boîte : renvoie la distance d'impact ou -1 */
function segBox(p0, p1, box) {
  _v1.subVectors(p1, p0);
  var len = _v1.length();
  if (len < 1e-6) return -1;
  _v1.normalize();
  _ray.origin.copy(p0); _ray.direction.copy(_v1);
  var hit = _ray.intersectBox(box, _v2);
  if (!hit) return -1;
  var d = _v2.distanceTo(p0);
  return d <= len ? d : -1;
}
/* segment→sphère : renvoie la distance d'impact ou -1 */
function segSphere(p0, p1, c, r) {
  _v1.subVectors(p1, p0);
  var len = _v1.length();
  if (len < 1e-6) return -1;
  _v2.subVectors(c, p0);
  var t = clamp(_v2.dot(_v1) / len, 0, 1);
  _v3.copy(p0).addScaledVector(_v1, t * len);
  var d2 = _v3.distanceToSquared(c);
  return d2 <= r * r ? t * len : -1;
}

/* ── Impacts (flashes additifs mis en commun) ── */
function sparkAt(pos, color, size) {
  var s = glowSprite(color === 0x35d0ff ? texGlowBlue : texGlowOrange, size || 0.7, 0.95);
  s.position.copy(pos);
  scene.add(s);
  sparks.push({ s: s, life: 0.22, grow: (size || 0.7) * 3 });
}
function updateSparks(dt) {
  for (var i = sparks.length - 1; i >= 0; i--) {
    var p = sparks[i];
    p.life -= dt;
    if (p.life <= 0) { scene.remove(p.s); p.s.material.dispose(); sparks.splice(i, 1); continue; }
    var k = 1 - p.life / 0.22;
    p.s.scale.setScalar(p.s.scale.x + p.grow * dt);
    p.s.material.opacity = 0.95 * (1 - k);
  }
}

/* ── Vision : LOS en pur math (boîtes seulement) ── */
function hasLOS(from, to) {
  for (var i = 0; i < COL.length; i++) {
    var d = segBox(from, to, COL[i]);
    if (d >= 0) return false;
  }
  return true;
}

/* ── Collision cercle vs boîtes (XZ) ── */
function collide(pos, radius) {
  for (var i = 0; i < COL.length; i++) {
    var b = COL[i];
    if (pos.y > b.max.y - 0.1) continue;
    if (pos.x > b.min.x - radius && pos.x < b.max.x + radius &&
        pos.z > b.min.z - radius && pos.z < b.max.z + radius) {
      var dxl = pos.x - (b.min.x - radius), dxr = (b.max.x + radius) - pos.x;
      var dzl = pos.z - (b.min.z - radius), dzr = (b.max.z + radius) - pos.z;
      var m = Math.min(dxl, dxr, dzl, dzr);
      if (m === dxl) pos.x = b.min.x - radius;
      else if (m === dxr) pos.x = b.max.x + radius;
      else if (m === dzl) pos.z = b.min.z - radius;
      else pos.z = b.max.z + radius;
    }
  }
  pos.x = clamp(pos.x, -104, 104);
  pos.z = clamp(pos.z, -104, 104);
}

/* ── Mise a jour d’une machine (vecteurs dédiés : les _v* partagés
   sont réservés aux helpers qui les écrasent) ── */
var _pp = new T.Vector3(), _mv = new T.Vector3(), _eye = new T.Vector3(), _tmp = new T.Vector3();
function updateEnemy(e, dt, time, player) {
  if (e.dead > 0) {
    e.dead -= dt;
    e.g.rotation.x = Math.max(-Math.PI / 2, e.g.rotation.x - dt * 3);
    e.g.position.y -= dt * 0.5;
    if (e.dead <= 0) { e.gone = true; scene.remove(e.g); }
    return;
  }
  var tp = e.tp, d = DIFFS[G.diff];
  var toP = _pp.subVectors(player.pos, e.pos);
  var dist = toP.length();
  e.losT -= dt;
  if (e.losT <= 0) {
    e.losT = 0.25;
    var eyeY = e.type === 'hk' ? e.pos.y : e.pos.y + (e.type === 'tank' ? 2.1 : 1.85);
    _eye.set(e.pos.x, eyeY, e.pos.z);
    _tmp.set(player.pos.x, player.pos.y + 1.55, player.pos.z);
    var canSee = dist < tp.view && hasLOS(_eye, _tmp);
    if (canSee && tp.fovDeg < 360) {
      var ang = Math.abs(((Math.atan2(toP.x, toP.z) - e.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      canSee = ang < (tp.fovDeg * Math.PI / 360) + 0.35;
    }
    e.lastLOS = canSee ? time : e.lastLOS;
    e.engaged = canSee || (time - e.lastHurt < 6) || (time - e.lastLOS < 3);
    if (e.cone.visible) e.cone.material.color.setHex(canSee ? 0xff2211 : 0x884433);
  }
  var sees = time - e.lastLOS < 0.4;
  _mv.set(0, 0, 0);
  var sp = tp.speed * (sees ? 1 : 0.45) * (e.type === 'mim' ? d.esp : 1);

  if (e.type === 'mim') {
    if (dist > 1.6) {
      _mv.copy(toP).normalize();
      _mv.applyAxisAngle(_tmp.set(0, 1, 0), Math.sin(time * 2.2 + e.phase) * 0.5);
    } else if (time - (e.lastHitT || 0) > 0.9) {
      e.lastHitT = time;
      hurtPlayer(tp.melee * d.edmg);
    }
  } else if (e.type === 'hk') {
    var favMid = (tp.fav[0] + tp.fav[1]) / 2;
    _tmp.set(-toP.z, 0, toP.x).normalize().multiplyScalar(e.strafe);
    var rr = dist > favMid + 4 ? 0.8 : (dist < favMid - 4 ? -0.8 : 0);
    _tmp.addScaledVector(_v3.set(toP.x, 0, toP.z).normalize(), rr);
    _mv.copy(_tmp).multiplyScalar(sp);
    e.pos.y += Math.sin(time * 1.3 + e.phase) * dt * 0.6;
    e.pos.y = clamp(e.pos.y, 8, 14);
  } else {
    var inFav = dist >= tp.fav[0] && dist <= tp.fav[1];
    if (!sees && dist > 6) {
      _mv.copy(toP).setY(0).normalize();
    } else if (!inFav) {
      _mv.copy(toP).setY(0).normalize().multiplyScalar(dist > tp.fav[1] ? 1 : -0.7);
    }
    e.strafeT -= dt;
    if (e.strafeT <= 0) { e.strafeT = rnd(1.2, 2.8); if (Math.random() < 0.5) e.strafe *= -1; }
    if (sees && dist < tp.range) {
      _tmp.set(-toP.z, 0, toP.x).normalize();
      _mv.addScaledVector(_tmp, e.strafe * 0.8);
    }
    if (_mv.lengthSq() > 0) _mv.normalize().multiplyScalar(sp);
  }

  if (_mv.lengthSq() > 0) {
    var oldX = e.pos.x, oldZ = e.pos.z;
    e.pos.x += _mv.x * dt;
    e.pos.z += _mv.z * dt;
    collide(e.pos, e.type === 'tank' ? 1.6 : 0.55);
    if (Math.abs(e.pos.x - oldX - _mv.x * dt) > 1e-4 || Math.abs(e.pos.z - oldZ - _mv.z * dt) > 1e-4) {
      e.strafeT = 0; e.strafe *= -1;
    }
  }
  for (var j = 0; j < enemies.length; j++) {
    var o = enemies[j];
    if (o === e || o.dead > 0 || o.gone || o.type === 'hk') continue;
    var dd = e.pos.distanceToSquared(o.pos);
    if (dd < 2.6 && dd > 1e-5 && e.type !== 'hk') {
      _tmp.subVectors(e.pos, o.pos).normalize();
      e.pos.addScaledVector(_tmp, dt * 1.6);
    }
  }
  e.g.position.copy(e.pos);
  var targetYaw = sees ? Math.atan2(toP.x, toP.z) : e.yaw + Math.sin(time * 0.4 + e.phase) * 0.002;
  var dyaw = ((targetYaw - e.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  e.yaw += dyaw * Math.min(1, dt * 6);
  e.g.rotation.y = e.yaw;
  var spdNow = _mv.length();
  var an = e.g.userData.anim;
  if (an && an.legL) {
    e.walkPh += dt * spdNow * 2.2;
    var sw = Math.sin(e.walkPh) * 0.55 * clamp(spdNow / tp.speed, 0, 1);
    an.legL.rotation.x = sw; an.legR.rotation.x = -sw;
    if (an.armL) { an.armL.rotation.x = -sw * 0.7; an.armR.rotation.x = sw * 0.7; }
  }
  if (tp.bolt && e.engaged && sees && dist < tp.range) {
    e.cd -= dt * d.erof;
    if (e.burstLeft > 0) {
      e.burstT -= dt;
      if (e.burstT <= 0) {
        e.burstLeft--; e.burstT = 0.14;
        var mz = e.g.userData.muzzle;
        e.g.updateMatrixWorld();
        mz.getWorldPosition(_v3);
        _v2.set(player.pos.x, player.pos.y + rnd(1.0, 1.5), player.pos.z).sub(_v3).normalize();
        var spread = 0.03 * d.esp * (1 + dist / 60);
        _v2.x += rnd(-spread, spread); _v2.y += rnd(-spread, spread); _v2.z += rnd(-spread, spread);
        _v2.normalize();
        fireBolt(_v3, _v2, tp, 'e');
        if (dist < 45) sfx.eshoot();
        var fl = glowSprite(texGlowRed, 0.8, 0.9); fl.position.copy(_v3); scene.add(fl);
        sparks.push({ s: fl, life: 0.1, grow: 2 });
      }
    } else if (e.cd <= 0) {
      e.burstLeft = tp.burst; e.burstT = 0;
      e.cd = rnd(tp.bcd[0], tp.bcd[1]);
      if (e.type === 'tank') sfx.tank();
    }
  }
  if (G.brain) e.cone.visible = true;
}

/* ── Dégâts aux machines ── */
function hurtEnemy(e, dmg, point, head) {
  if (e.dead > 0) return;
  e.hp -= dmg;
  e.lastHurt = G.time;
  e.engaged = true;
  sparkAt(point, 0xffaa66, 0.5);
  if (e.hp <= 0) {
    e.dead = 1.1;
    G.kills++;
    var pts = e.tp.score * (head ? 2 : 1);
    if (head) G.head++;
    G.score += pts;
    sfx.kill();
    if (e.type === 'tank') { sfx.boom(); G.shake = Math.max(G.shake, 0.5); sparkAt(e.pos.clone().setY(2), 0xff8844, 3.5); }
    killPopup((head ? 'TÊTE ! +' : '+') + pts);
    updateHUD();
    checkWave();
  } else {
    if (head) sfx.crit(); else sfx.hit();
    hitMarker(head);
  }
}

/* ── Vagues ── */
function waveComposition(n) {
  var list = [];
  var count = 2 + Math.round(n * 1.5);
  for (var i = 0; i < count; i++) {
    var r = Math.random(), t = 'esk';
    if (n >= 2 && r < 0.22) t = 'mim';
    else if (n >= 3 && r < 0.38) t = 'hk';
    list.push(t);
  }
  if (n >= 4 && n % 2 === 0) list.push('tank');
  return list;
}
function startWave() {
  G.wave++;
  G.spawnQueue = waveComposition(G.wave);
  G.spawnTimer = 0.5;
  var names = { esk: 'endosquelettes', mim: 'infiltrateurs mimétiques', hk: 'HK aériens', tank: 'HK lourds' };
  var counts = {};
  G.spawnQueue.forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
  var parts = Object.keys(counts).map(function (k) { return counts[k] + ' ' + names[k]; });
  showBanner('⚠ VAGUE ' + G.wave, 'Skynet déploie : ' + parts.join(' · '));
  sfx.wave();
  updateHUD();
}
function checkWave() {
  var alive = 0;
  for (var i = 0; i < enemies.length; i++) if (enemies[i].dead <= 0 && !enemies[i].gone) alive++;
  if (alive === 0 && G.spawnQueue.length === 0 && G.mode === 'play' && G.restTimer <= 0) {
    G.restTimer = 6;
    G.score += 150 * G.wave;
    showBanner('✅ VAGUE ' + G.wave + ' NETTOYÉE', '+' + (150 * G.wave) + ' pts · régénération… la prochaine vague arrive');
    sfx.pick();
  }
}
var SKYNET_LINES = [
  'SKYNET : production d\u2019endosquelettes augmentée de 40 %',
  'SIGNAUX HK DÉTECTÉS AU NORD DE LA ZONE',
  'SKYNET ANALYSE VOTRE COMPORTEMENT DE TIR…',
  'INfiltrateur mimétique signalé parmi la vague',
  'LA RÉSISTANCE SURVEILLE CETTE POSITION. TENEZ BON.'
];
/* ═══ HUB OF DUTY — PARTIE 3 : joueur, arme, HUD, boucle ═══ */

/* ── Joueur ── */
var player = {
  pos: new T.Vector3(0, 0, 14),
  vel: new T.Vector3(),
  yaw: Math.PI, pitch: 0,
  hp: 100, lastHurt: -99, onGround: true,
  bob: 0, fovBase: 75
};
var keys = {};
var mouseDown = false, adsHeld = false;

/* ── Arme (viewmodel) ── */
var weapon = new T.Group();
var vmBase = new T.Vector3(0.34, -0.32, -0.62);
var vmAds = new T.Vector3(0, -0.205, -0.42);
var muzzleFlash, weaponMuzzle;
(function buildWeapon() {
  var matGun = new T.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.5, metalness: 0.7 });
  var matGun2 = new T.MeshStandardMaterial({ color: 0x171b20, roughness: 0.6, metalness: 0.5 });
  var matGlowB = new T.MeshBasicMaterial({ color: 0x35d0ff });
  var receiver = new T.Mesh(new T.BoxGeometry(0.09, 0.13, 0.52), matGun); weapon.add(receiver);
  var barrel = new T.Mesh(new T.CylinderGeometry(0.025, 0.028, 0.46, 10), matGun2);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -0.44); weapon.add(barrel);
  var cell = new T.Mesh(new T.CylinderGeometry(0.034, 0.034, 0.3, 10), matGlowB);
  cell.rotation.x = Math.PI / 2; cell.position.set(0, -0.045, -0.18); weapon.add(cell);
  var grip = new T.Mesh(new T.BoxGeometry(0.07, 0.16, 0.09), matGun2);
  grip.position.set(0, -0.13, 0.08); grip.rotation.x = 0.28; weapon.add(grip);
  var sight = new T.Mesh(new T.BoxGeometry(0.02, 0.05, 0.06), matGun2);
  sight.position.set(0, 0.09, -0.2); weapon.add(sight);
  var dot = new T.Mesh(new T.SphereGeometry(0.008, 6, 6), matGlowB);
  dot.position.set(0, 0.115, -0.2); weapon.add(dot);
  weaponMuzzle = new T.Object3D();
  weaponMuzzle.position.set(0, 0.02, -0.68);
  weapon.add(weaponMuzzle);
  muzzleFlash = glowSprite(texGlowBlue, 0.3, 0);
  muzzleFlash.position.copy(weaponMuzzle.position);
  weapon.add(muzzleFlash);
  weapon.position.copy(vmBase);
  weapon.traverse(function (o) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; });
  camera.add(weapon);
  scene.add(camera);
})();
var WPN = { ammo: 30, mag: 30, cd: 0, reloading: 0, rate: 0.125, dmg: 24, spread: 0.02, adsSpread: 0.006, recoil: 0.0042 };

/* ── HUD ── */
var el = function (id) { return document.getElementById(id); };
var hudHp = el('fpsHp'), hudHpNum = el('fpsHpNum'), hudAmmo = el('fpsAmmo'),
    hudWave = el('fpsWave'), hudScore = el('fpsScore'), hudBanner = el('fpsBanner'),
    hudVign = el('fpsVign'), hudHitm = el('fpsHitm'), hudFeed = el('fpsFeed'),
    scrMenu = el('fpsMenu'), scrPause = el('fpsPause'), scrOver = el('fpsOver'),
    hudRoot = el('fpsHud'), bannerT = null;

function updateHUD() {
  hudHp.style.width = Math.max(0, player.hp) + '%';
  hudHp.style.background = player.hp > 55 ? '#38d178' : (player.hp > 25 ? '#ffb020' : '#ff4444');
  hudHpNum.textContent = Math.max(0, Math.round(player.hp));
  hudAmmo.textContent = WPN.reloading > 0 ? '···' : WPN.ammo;
  hudWave.textContent = G.wave > 0 ? ('VAGUE ' + G.wave) : '—';
  hudScore.textContent = G.score.toLocaleString('fr-FR');
}
function showBanner(t, sub) {
  hudBanner.innerHTML = '<b>' + t + '</b>' + (sub ? '<span>' + sub + '</span>' : '');
  hudBanner.classList.add('on');
  clearTimeout(bannerT);
  bannerT = setTimeout(function () { hudBanner.classList.remove('on'); }, 3400);
}
function killPopup(txt) {
  var s = document.createElement('span');
  s.textContent = txt;
  s.className = 'fps-kp';
  hudFeed.appendChild(s);
  setTimeout(function () { s.remove(); }, 900);
}
function hitMarker(head) {
  hudHitm.classList.remove('on', 'crit');
  void hudHitm.offsetWidth;
  hudHitm.classList.add('on');
  if (head) hudHitm.classList.add('crit');
  updateHUD();
}
function hurtPlayer(dmg) {
  if (G.mode !== 'play' || player.hp <= 0) return;
  player.hp -= dmg;
  player.lastHurt = G.time;
  G.shake = Math.max(G.shake, 0.35);
  sfx.hurt();
  hudVign.classList.remove('pulse'); void hudVign.offsetWidth; hudVign.classList.add('pulse');
  updateHUD();
  if (player.hp <= 0) gameOver();
}

/* ── Écrans ── */
function fmtTime() { return Math.floor(G.time / 60) + ':' + ('0' + Math.floor(G.time % 60)).slice(-2); }
function gameOver() {
  G.mode = 'over';
  document.exitPointerLock && document.exitPointerLock();
  var acc = G.fired ? Math.round(100 * G.hitC / G.fired) : 0;
  var isBest = G.score > G.best;
  if (isBest) { G.best = G.score; localStorage.setItem('hod_best', String(G.best)); }
  el('fpsOverStats').innerHTML =
    '<div><b>' + G.score.toLocaleString('fr-FR') + '</b><span>points' + (isBest ? ' · 🏆 record !' : '') + '</span></div>' +
    '<div><b>Vague ' + G.wave + '</b><span>tenue ' + fmtTime() + '</span></div>' +
    '<div><b>' + G.kills + '</b><span>machines détruites (' + G.head + ' à la tête)</span></div>' +
    '<div><b>' + acc + ' %</b><span>de précision</span></div>';
  hudRoot.style.display = 'none';
  scrOver.classList.add('on');
}
function startGame() {
  /* reset complet */
  enemies.forEach(function (e) { scene.remove(e.g); });
  enemies.length = 0;
  bolts.forEach(function (b) { scene.remove(b.m); });
  bolts.length = 0;
  player.pos.set(0, 0, 14); player.vel.set(0, 0, 0);
  player.yaw = Math.PI; player.pitch = 0;
  player.hp = 100; player.lastHurt = -99;
  WPN.ammo = WPN.mag; WPN.reloading = 0;
  G.wave = 0; G.score = 0; G.kills = 0; G.head = 0; G.fired = 0; G.hitC = 0;
  G.shake = 0; G.restTimer = 0; G.spawnQueue = [];
  scrMenu.classList.remove('on'); scrPause.classList.remove('on'); scrOver.classList.remove('on');
  hudRoot.style.display = 'block';
  G.mode = 'play';
  audioInit();
  startWave();
  updateHUD();
  renderer.domElement.requestPointerLock();
}
function pauseGame() {
  if (G.mode !== 'play') return;
  G.mode = 'pause';
  hudRoot.style.display = 'none';
  scrPause.classList.add('on');
}
function resumeGame() {
  scrPause.classList.remove('on');
  hudRoot.style.display = 'block';
  G.mode = 'play';
  renderer.domElement.requestPointerLock();
}

/* ── Entrées ── */
document.addEventListener('keydown', function (e) {
  keys[e.code] = true;
  if (e.code === 'KeyR' && G.mode === 'play' && WPN.ammo < WPN.mag && WPN.reloading <= 0) {
    WPN.reloading = 1.3; sfx.reload();
  }
  if (e.code === 'KeyB' && G.mode === 'play') {
    G.brain = !G.brain;
    showBanner('🧠 CERVEAU DES MACHINES ' + (G.brain ? 'ACTIVÉ' : 'DÉSACTIVÉ'),
      G.brain ? 'Cônes de vision et engagemement des robots affichés' : '');
  }
});
document.addEventListener('keyup', function (e) { keys[e.code] = false; });
document.addEventListener('mousedown', function (e) {
  if (G.mode !== 'play') return;
  if (e.button === 0) mouseDown = true;
  if (e.button === 2) adsHeld = true;
});
document.addEventListener('mouseup', function (e) {
  if (e.button === 0) mouseDown = false;
  if (e.button === 2) adsHeld = false;
});
document.addEventListener('contextmenu', function (e) { if (G.mode === 'play') e.preventDefault(); });
document.addEventListener('mousemove', function (e) {
  if (G.mode !== 'play' || document.pointerLockElement !== renderer.domElement) return;
  var sens = 0.0021 * (adsHeld ? 0.6 : 1);
  player.yaw -= e.movementX * sens;
  player.pitch = clamp(player.pitch - e.movementY * sens, -1.45, 1.45);
});
document.addEventListener('pointerlockchange', function () {
  if (document.pointerLockElement !== renderer.domElement && G.mode === 'play') pauseGame();
});
el('fpsStart').addEventListener('click', startGame);
el('fpsRetry').addEventListener('click', startGame);
el('fpsResume').addEventListener('click', resumeGame);
el('fpsQuit').addEventListener('click', function () {
  scrPause.classList.remove('on');
  scrMenu.classList.add('on');
  G.mode = 'menu';
});
el('fpsMute').addEventListener('click', function () {
  G.muted = !G.muted;
  if (master) master.gain.value = G.muted ? 0 : 0.5;
  el('fpsMute').textContent = G.muted ? '🔇 Son coupé' : '🔊 Son actif';
});
[el('fpsDiffRecrue'), el('fpsDiffRes'), el('fpsDiffVet')].forEach(function (r) {
  r.addEventListener('change', function () { G.diff = r.value; });
});
el('fpsQual').addEventListener('change', function () { G.quality = el('fpsQual').value; });

/* ── Qualité ── */
function applyQuality() {
  var q = QUAL[G.quality];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pr));
  renderer.shadowMap.enabled = q.shadow;
  sun.castShadow = q.shadow;
  sun.shadow.mapSize.set(q.shadowRes, q.shadowRes);
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
}
applyQuality();

/* ── Déplacement joueur ── */
function updatePlayer(dt) {
  var fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  var strafe = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  var sprint = keys.ShiftLeft || keys.ShiftRight;
  var speed = (sprint ? 8.2 : 5.2) * (adsHeld ? 0.6 : 1);
  var dir = _v1.set(strafe, 0, -fwd);
  if (dir.lengthSq() > 0) dir.normalize().applyAxisAngle(_v2.set(0, 1, 0), player.yaw);
  player.vel.x = lerp(player.vel.x, dir.x * speed, Math.min(1, dt * 10));
  player.vel.z = lerp(player.vel.z, dir.z * speed, Math.min(1, dt * 10));
  /* gravité + saut */
  player.vel.y -= 21 * dt;
  if (player.onGround && keys.Space) { player.vel.y = 7.6; player.onGround = false; }
  player.pos.x += player.vel.x * dt;
  player.pos.z += player.vel.z * dt;
  player.pos.y += player.vel.y * dt;
  if (player.pos.y <= 0) { player.pos.y = 0; player.vel.y = 0; player.onGround = true; }
  collide(player.pos, 0.45);
  /* bob de marche */
  var moving = Math.abs(player.vel.x) + Math.abs(player.vel.z);
  player.bob += dt * moving * 1.4;
  var bobY = Math.sin(player.bob) * 0.03 * clamp(moving / 8, 0, 1);
  /* caméra */
  camera.position.set(player.pos.x, player.pos.y + 1.62 + bobY, player.pos.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch + G.shake * rnd(-0.02, 0.02);
  camera.rotation.z = G.shake * rnd(-0.015, 0.015);
  G.shake = Math.max(0, G.shake - dt * 1.6);
  /* ADS */
  var targetFov = adsHeld ? 52 : player.fovBase;
  if (Math.abs(camera.fov - targetFov) > 0.2) {
    camera.fov = lerp(camera.fov, targetFov, Math.min(1, dt * 12));
    camera.updateProjectionMatrix();
  }
  weapon.position.lerp(adsHeld ? vmAds : vmBase, Math.min(1, dt * 12));
  weapon.position.y += bobY * 0.4;
  /* régénération */
  if (player.hp < 100 && G.time - player.lastHurt > 5) {
    player.hp = Math.min(100, player.hp + dt * 6);
    updateHUD();
  }
}

/* ── Tir du joueur ── */
function updateWeapon(dt) {
  if (WPN.reloading > 0) {
    WPN.reloading -= dt;
    weapon.rotation.x = Math.sin(Math.min(1, 1 - WPN.reloading / 1.3) * Math.PI) * 0.5;
    if (WPN.reloading <= 0) { WPN.ammo = WPN.mag; weapon.rotation.x = 0; updateHUD(); }
    return;
  }
  WPN.cd -= dt;
  muzzleFlash.material.opacity = Math.max(0, muzzleFlash.material.opacity - dt * 14);
  if (mouseDown && G.mode === 'play') {
    if (WPN.ammo <= 0) { if (WPN.cd <= 0) { sfx.dry(); WPN.cd = 0.3; } return; }
    if (WPN.cd <= 0) {
      WPN.cd = WPN.rate;
      WPN.ammo--;
      G.fired++;
      sfx.shoot();
      muzzleFlash.material.opacity = 0.95;
      muzzleFlash.scale.set(rnd(0.25, 0.42), rnd(0.25, 0.42), 1);
      player.pitch += WPN.recoil * (adsHeld ? 0.5 : 1);
      player.yaw += rnd(-WPN.recoil, WPN.recoil) * 0.4;
      weapon.position.z += 0.045; /* recul viewmodel */
      weaponMuzzle.getWorldPosition(_v3);
      var spread = (adsHeld ? WPN.adsSpread : WPN.spread) * (player.vel.length() > 6 ? 1.6 : 1);
      var dir = _v2.set(rnd(-spread, spread), rnd(-spread, spread), -1).normalize().applyEuler(camera.rotation);
      fireBolt(_v3, dir, { bolt: { dmg: WPN.dmg, spd: 95, r: 0.07, color: 0x35d0ff } }, 'p');
      updateHUD();
    }
  }
  weapon.position.z = lerp(weapon.position.z, (adsHeld ? vmAds : vmBase).z, Math.min(1, dt * 10));
}

/* ── Lasers ── */
var _p0 = new T.Vector3(), _p1 = new T.Vector3();
function updateBolts(dt) {
  for (var i = bolts.length - 1; i >= 0; i--) {
    var b = bolts[i];
    b.life -= dt;
    if (b.life <= 0) { scene.remove(b.m); bolts.splice(i, 1); continue; }
    _p0.copy(b.m.position);
    _p1.copy(_p0).addScaledVector(b.dir, b.spd * dt);
    var hitD = Infinity, hitEnemy = null, hitHead = false, blocked = false;
    /* obstacles */
    for (var j = 0; j < COL.length; j++) {
      var d = segBox(_p0, _p1, COL[j]);
      if (d >= 0 && d < hitD) { hitD = d; blocked = true; hitEnemy = null; }
    }
    /* sol */
    if (_p1.y < 0.03) {
      var tGround = _p0.y > 0 ? (0.03 - _p0.y) / (_p1.y - _p0.y) : 0;
      if (tGround >= 0 && tGround * b.spd * dt < hitD) { hitD = tGround * b.spd * dt; blocked = true; hitEnemy = null; }
    }
    if (b.owner === 'p') { /* vs machines */
      for (j = 0; j < enemies.length; j++) {
        var e = enemies[j];
        if (e.dead > 0 || e.gone) continue;
        if (e.type === 'hk') {
          var dH = segSphere(_p0, _p1, e.pos, e.tp.bodyR);
          if (dH >= 0 && dH < hitD) { hitD = dH; hitEnemy = e; hitHead = false; blocked = false; }
        } else {
          _v3.set(e.pos.x, e.pos.y + 1.15, e.pos.z);
          var dB = segSphere(_p0, _p1, _v3, e.tp.bodyR);
          if (dB >= 0 && dB < hitD) { hitD = dB; hitEnemy = e; hitHead = false; blocked = false; }
          _v3.set(e.pos.x, e.pos.y + 1.87, e.pos.z);
          var dHd = segSphere(_p0, _p1, _v3, e.tp.headR);
          if (dHd >= 0 && dHd < hitD) { hitD = dHd; hitEnemy = e; hitHead = true; blocked = false; }
        }
      }
    } else { /* vs joueur */
      _v3.set(player.pos.x, player.pos.y + 1.0, player.pos.z);
      var dP = segSphere(_p0, _p1, _v3, 0.55);
      if (dP >= 0 && dP < hitD) { hitD = dP; blocked = false; hitEnemy = 'player'; }
    }
    if (hitEnemy !== null || blocked) {
      if (hitD === Infinity) hitD = b.spd * dt;
      var hp = _v3.copy(_p0).addScaledVector(b.dir, hitD);
      if (hitEnemy === 'player') { hurtPlayer(b.dmg); }
      else if (hitEnemy) { G.hitC++; hurtEnemy(hitEnemy, b.dmg, hp, hitHead); }
      else sparkAt(hp, 0xffb060, 0.45);
      scene.remove(b.m);
      bolts.splice(i, 1);
      continue;
    }
    b.m.position.copy(_p1);
  }
}

/* ── Vagues : file de spawn ── */
function updateWaves(dt) {
  if (G.restTimer > 0) {
    G.restTimer -= dt;
    if (G.restTimer <= 0) { startWave(); }
    return;
  }
  var alive = 0;
  for (var i = 0; i < enemies.length; i++) if (enemies[i].dead <= 0 && !enemies[i].gone) alive++;
  var maxAlive = Math.min(4 + G.wave, 13);
  if (G.spawnQueue.length > 0) {
    G.spawnTimer -= dt;
    if (G.spawnTimer <= 0 && alive < maxAlive) {
      var t = G.spawnQueue.shift();
      spawnEnemy(t);
      G.spawnTimer = 0.8;
      updateHUD();
    }
  }
}

/* ── Redimensionnement ── */
function resize() {
  var w = wrap.clientWidth, h = wrap.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ── Boucle ── */
var lastT = performance.now(), fpsAcc = 0, fpsN = 0;
function loop(now) {
  requestAnimationFrame(loop);
  var dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (G.mode === 'play') {
    G.time += dt;
    updatePlayer(dt);
    updateWeapon(dt);
    for (var i = enemies.length - 1; i >= 0; i--) {
      updateEnemy(enemies[i], dt, G.time, player);
      if (enemies[i].gone) enemies.splice(i, 1);
    }
    updateBolts(dt);
    updateWaves(dt);
    sky.rotation.y += dt * 0.002;
    if (dustObj) dustObj.rotation.y += dt * 0.006;
    for (var f = 0; f < fires.length; f++) {
      var fl = fires[f];
      fl.scale.y = fl.userData.by || (fl.userData.by = fl.scale.y);
      fl.scale.y = fl.userData.by * (1 + Math.sin(G.time * 9 + f * 2.1) * 0.16);
      fl.material.opacity = 0.65 + Math.sin(G.time * 13 + f) * 0.2;
    }
  } else if (G.mode === 'menu') {
    /* caméra orbitale de présentation */
    var t = now * 0.00012;
    camera.position.set(Math.cos(t) * 46, 9 + Math.sin(t * 1.7) * 2, Math.sin(t) * 46);
    camera.lookAt(0, 3, 0);
    camera.rotation.order = 'YXZ';
    weapon.visible = false;
    for (i = 0; i < enemies.length; i++) if (!enemies[i].gone) updateEnemy(enemies[i], dt, now / 1000, player);
    updateBolts(dt);
  }
  if (G.mode !== 'menu') weapon.visible = true;
  updateSparks(dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
updateHUD();
el('fpsBest').textContent = G.best.toLocaleString('fr-FR');

/* ── API de test interne ── */
window.HOD_TEST = {
  state: function () { return G; },
  player: function () { return player; },
  enemies: function () { return enemies; },
  bolts: function () { return bolts; },
  spawn: function (t) { return spawnEnemy(t); },
  wave: function () { G.restTimer = 0; startWave(); },
  damage: function (n) { hurtPlayer(n); },
  fireOnce: function () { mouseDown = true; updateWeapon(0.016); mouseDown = false; }
};
})();
