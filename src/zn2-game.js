
/* ═══════════════════════════════════════════════════════════════════
   LA ZONE — v2 « moteur HUB OF DUTY » : vraie 3D (Three.js), FPS
   prospection. Adapté du moteur de HUB OF DUTY (contrôleur ZQSD,
   visée libre sans capture de souris, hitscan, vagues, HUD, audio
   synthétisé). ES5, aucune étape de build.
   Boucle : Hangar (préparer) → Zone (sonder, ramasser, survivre,
   chiens aveugles, émission) → Porte sud (extraire) → Hangar.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  function el(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function irnd(a, b) { return Math.floor(rnd(a, b + 1)); }
  function fmt(t) { var m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + (s < 10 ? '0' : '') + s; }

  /* ── Sauvegarde (hangar : or, stock, records) ── */
  var SAVE_KEY = 'zone3_save';
  var meta = { or: 120, med: 1, antirad: 1, boulons: 6, ammo: 32,
               upBelt: 0, upDet: 0,
               runs: 0, extracts: 0, bestVal: 0, bestTime: 0, totalVal: 0 };
  function loadMeta() {
    try {
      var o = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (o) { for (var k in meta) if (typeof o[k] !== 'undefined') meta[k] = o[k]; }
    } catch (e) {}
  }
  function saveMeta() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(meta)); } catch (e) {} }
  loadMeta();

  /* ── Audio 100 % synthétisé ── */
  var AC = null, master = null, muted = false, windG = null;
  function audioInit() {
    if (AC || muted) return;
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = 0.45; master.connect(AC.destination);
      /* vent : boucle de bruit filtré */
      var len = AC.sampleRate * 2, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      var src = AC.createBufferSource(); src.buffer = buf; src.loop = true;
      var lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
      windG = AC.createGain(); windG.gain.value = 0.05;
      src.connect(lp); lp.connect(windG); windG.connect(master); src.start();
    } catch (e) {}
  }
  function tone(type, f0, f1, dur, vol, delay) {
    if (!AC || muted) return;
    try {
      var t = AC.currentTime + (delay || 0);
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  function noiseHit(dur, vol, freq) {
    if (!AC || muted) return;
    try {
      var t = AC.currentTime, n = Math.floor(AC.sampleRate * dur),
          b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var s = AC.createBufferSource(); s.buffer = b;
      var f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
      var g = AC.createGain(); g.gain.value = vol;
      s.connect(f); f.connect(g); g.connect(master); s.start(t);
    } catch (e) {}
  }
  var sfx = {
    ui: function () { tone('square', 660, 520, 0.06, 0.06); },
    shoot: function () { noiseHit(0.14, 0.5, 1600); tone('square', 210, 60, 0.12, 0.22); },
    reload: function () { tone('square', 300, 220, 0.07, 0.08); tone('square', 240, 340, 0.07, 0.08, 0.5); },
    hurt: function () { tone('sawtooth', 190, 70, 0.22, 0.2); },
    dog: function () { tone('sawtooth', 140, 90, 0.18, 0.1); },
    pickup: function () { tone('sine', 620, 980, 0.14, 0.14); },
    bolt: function () { tone('sine', 500, 300, 0.09, 0.07); },
    click: function () { noiseHit(0.012, 0.16, 5200); },
    beep: function () { tone('sine', 880, 880, 0.07, 0.07); },
    discharge: function () { noiseHit(0.5, 0.5, 900); tone('sawtooth', 120, 40, 0.5, 0.2); },
    siren: function () { tone('sawtooth', 320, 640, 0.8, 0.16); tone('sawtooth', 320, 640, 0.8, 0.16, 1.0); },
    boom: function () { noiseHit(1.2, 0.6, 220); tone('sine', 70, 28, 1.4, 0.3); },
    gate: function () { tone('sine', 420, 840, 0.4, 0.15); tone('sine', 630, 1260, 0.5, 0.12, 0.2); }
  };

  /* ── Éléments UI ── */
  var view = el('znView'), hud = el('znHud'), bannerEl = el('znBanner'),
      promptEl = el('znPrompt'), stage = document.querySelector('.zn-stage');
  var barHp = el('znBarHp'), barRad = el('znBarRad'), barSt = el('znBarSt'),
      lblTimer = el('znTimer'), lblEmission = el('znEmission'), lblOr = el('znOr'),
      lblAmmo = el('znAmmo'), lblBelt = el('znBelt'), lblGeiger = el('znGeiger'),
      lblAbri = el('znAbri');
  function ov(id, on) { var e2 = el(id); if (e2) e2.style.display = on ? 'flex' : 'none'; }
  function banner(t, sub) {
    bannerEl.innerHTML = '<b>' + t + '</b>' + (sub ? '<span>' + sub + '</span>' : '');
    bannerEl.classList.add('on');
    clearTimeout(bannerEl._t);
    bannerEl._t = setTimeout(function () { bannerEl.classList.remove('on'); }, 3400);
  }
  function prompt(t) { promptEl.textContent = t || ''; }

  /* ── WebGL (créé au premier lancement, avec message clair si absent) ── */
  var renderer = null, scene = null, camera = null, glOK = false;
  function glFail() {
    glOK = false;
    var m = el('znGlFail');
    if (m) { m.style.display = 'flex'; }
  }
  function initGL() {
    if (renderer) return true;
    if (!window.THREE) { glFail(); return false; }
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(Math.max(320, view.clientWidth || 960), Math.max(240, view.clientHeight || 540));
      view.insertBefore(renderer.domElement, view.firstChild);
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x10160f);
      scene.fog = new THREE.FogExp2(0x10160f, 0.0105);
      camera = new THREE.PerspectiveCamera(74, (view.clientWidth || 960) / (view.clientHeight || 540), 0.1, 500);
      buildStatic();
      window.addEventListener('resize', resizeGL);
      glOK = true;
      return true;
    } catch (e) { glFail(); return false; }
  }
  function resizeGL() {
    if (!renderer) return;
    var w = Math.max(320, view.clientWidth || 960), h = Math.max(240, view.clientHeight || 540);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', function () { setTimeout(resizeGL, 80); });

  /* ── Monde statique : terrain, clôture, abri, arbres, ruines ── */
  var LIM = 176, obstacles = [];
  var bunkerPos = null, matAnom = null;
  function buildStatic() {
    var hemi = new THREE.HemisphereLight(0x9cb89c, 0x1a2214, 1.32); scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xffe2b8, 0.75); sun.position.set(60, 90, 30); scene.add(sun);
    /* sol + taches sombres */
    var g = new THREE.Mesh(new THREE.PlaneGeometry(460, 460), new THREE.MeshLambertMaterial({ color: 0x2d4026 }));
    g.rotation.x = -Math.PI / 2; scene.add(g);
    var patchM = new THREE.MeshBasicMaterial({ color: 0x1b2718 });
    for (var i = 0; i < 26; i++) {
      var p = new THREE.Mesh(new THREE.CircleGeometry(rnd(3, 11), 10), patchM);
      p.rotation.x = -Math.PI / 2; p.position.set(rnd(-170, 170), 0.02, rnd(-170, 170));
      scene.add(p);
    }
    /* clôture (4 côtés) + porte sud */
    var fenceM = new THREE.MeshLambertMaterial({ color: 0x39414a });
    [[0, -182, 380, 3], [0, 182, 380, 3], [-182, 0, 3, 368], [182, 0, 3, 368]].forEach(function (w) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w[2], 4, w[3]), fenceM);
      m.position.set(w[0], 2, w[1]); scene.add(m);
    });
    var pilM = new THREE.MeshLambertMaterial({ color: 0x5b646d });
    [-6, 6].forEach(function (x) {
      var pil = new THREE.Mesh(new THREE.BoxGeometry(1.6, 7, 1.6), pilM);
      pil.position.set(x, 3.5, 176); scene.add(pil);
    });
    var gateL = new THREE.PointLight(0x7dffa0, 1.1, 26); gateL.position.set(0, 5, 172); scene.add(gateL);
    /* abri béton (réfuge d'émission) */
    bunkerPos = new THREE.Vector3(-52, 0, -38);
    var b = new THREE.Mesh(new THREE.BoxGeometry(11, 5, 9), new THREE.MeshLambertMaterial({ color: 0x4b535c }));
    b.position.set(bunkerPos.x, 2.5, bunkerPos.z); scene.add(b);
    var roof = new THREE.Mesh(new THREE.BoxGeometry(13, 0.6, 11), pilM);
    roof.position.set(bunkerPos.x, 5.3, bunkerPos.z); scene.add(roof);
    var bl = new THREE.PointLight(0xffc46b, 0.8, 18); bl.position.set(bunkerPos.x, 3.5, bunkerPos.z + 6); scene.add(bl);
    obstacles.push({ x: bunkerPos.x, z: bunkerPos.z, r: 6.6 });
    /* arbres morts (instanciés) */
    var trunkG = new THREE.CylinderGeometry(0.22, 0.5, 7, 6);
    var trunkM = new THREE.MeshLambertMaterial({ color: 0x2e2620 });
    var trees = new THREE.InstancedMesh(trunkG, trunkM, 90);
    var d = new THREE.Object3D();
    for (i = 0; i < 90; i++) {
      var x = rnd(-168, 168), z = rnd(-168, 168);
      if (Math.abs(x) < 14 && z > 150) { x += 30; } /* dégagé devant la porte */
      if (Math.abs(x + 52) < 12 && Math.abs(z + 38) < 12) { x -= 26; } /* dégagé autour de l'abri */
      d.position.set(x, 3.5, z); d.rotation.set(rnd(-0.12, 0.12), rnd(0, 6.28), rnd(-0.12, 0.12));
      var s = rnd(0.7, 1.5); d.scale.set(s, s, s); d.updateMatrix();
      trees.setMatrixAt(i, d.matrix);
      obstacles.push({ x: x, z: z, r: 0.9 });
    }
    scene.add(trees);
    /* ruines */
    var ruM = new THREE.MeshLambertMaterial({ color: 0x39424b });
    for (i = 0; i < 22; i++) {
      var w2 = rnd(3, 9), h2 = rnd(2.5, 8), dp = rnd(3, 8);
      var r = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, dp), ruM);
      var rx = rnd(-160, 160), rz = rnd(-160, 160);
      if (Math.abs(rx) < 16 && rz > 148) rx += 34;
      if (Math.abs(rx + 52) < 14 && Math.abs(rz + 38) < 14) rx -= 30;
      r.position.set(rx, h2 / 2, rz); r.rotation.y = rnd(0, 3.14); scene.add(r);
      obstacles.push({ x: rx, z: rz, r: Math.max(w2, dp) * 0.62 });
    }
    /* gravats */
    var grM = new THREE.MeshLambertMaterial({ color: 0x2b3034 });
    for (i = 0; i < 40; i++) {
      var q = new THREE.Mesh(new THREE.BoxGeometry(rnd(0.5, 1.6), rnd(0.3, 0.9), rnd(0.5, 1.6)), grM);
      q.position.set(rnd(-170, 170), 0.4, rnd(-170, 170)); q.rotation.y = rnd(0, 3); scene.add(q);
    }
    /* v27 : arbres morts — des silhouettes qui cassent l'horizon plat */
    var trM = new THREE.MeshLambertMaterial({ color: 0x241d18 });
    for (i = 0; i < 22; i++) {
      var tx = rnd(-175, 175), tz = rnd(-175, 175);
      if (Math.abs(tx) < 16 && tz > 148) continue;
      var th = rnd(4, 8);
      var tr = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.34, th, 5), trM);
      tr.position.set(tx, th / 2, tz); tr.rotation.z = rnd(-0.12, 0.12); scene.add(tr);
      var br = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, th * 0.45, 4), trM);
      br.position.set(tx + rnd(-0.6, 0.6), th * rnd(0.55, 0.8), tz + rnd(-0.6, 0.6));
      br.rotation.z = rnd(0.5, 1.1) * (Math.random() < 0.5 ? 1 : -1); scene.add(br);
      obstacles.push({ x: tx, z: tz, r: 0.55 });
    }
    /* v27 : cristaux lumineux — la Zone « pousse » du brillant */
    var crM = new THREE.MeshBasicMaterial({ color: 0x59c98a });
    for (i = 0; i < 14; i++) {
      var cx = rnd(-165, 165), cz = rnd(-165, 165);
      var cl = new THREE.Mesh(new THREE.ConeGeometry(rnd(0.25, 0.55), rnd(0.8, 2.1), 4), crM);
      cl.position.set(cx, 0.5, cz); cl.rotation.y = rnd(0, 3); cl.rotation.z = rnd(-0.3, 0.3); scene.add(cl);
    }
  }

  /* ── Anomalies + artefacts (régénérés après chaque émission) ── */
  var TYPES = [
    { k: 'cellule',  n: 'Cellule vive',  c: 0x66e0ff, val: 450, malus: 0.14, d: 'rayonne doucement tant que vous la portez' },
    { k: 'cendre',   n: 'Cendre bleue',  c: 0x9fdc6a, val: 300, malus: 0,    d: 'stable, valeur sûre' },
    { k: 'coeur',    n: 'Cœur d\u2019acier', c: 0xff8a5f, val: 600, malus: 0, d: 'la plus chère des trois' }
  ];
  var dyn = null; /* groupe anomalies+artefacts */
  function buildField() {
    if (dyn) scene.remove(dyn);
    dyn = new THREE.Group(); scene.add(dyn);
    R.anomalies = []; R.artifacts = [];
    for (var i = 0; i < 7; i++) {
      var a = null, tries = 0;
      if (i === 0) a = { x: -24, z: 102, ph: 0 }; /* visible des l'entree, droit devant */
      else if (i === 1) a = { x: 28, z: 86, ph: 2 };
      else do {
        a = { x: rnd(-150, 150), z: rnd(-150, 150), ph: rnd(0, 6.28) };
        tries++;
      } while (tries < 30 && (Math.hypot(a.x - R.px, a.z - R.pz) < 40 || R.anomalies.some(function (o) { return Math.hypot(o.x - a.x, o.z - a.z) < 34; })));
      var sph = new THREE.Mesh(new THREE.SphereGeometry(2.2, 18, 12),
        new THREE.MeshBasicMaterial({ color: 0x7dffa0, transparent: true, opacity: 0.3 }));
      sph.position.set(a.x, 1.8, a.z); dyn.add(sph);
      var core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xd7ffe2, transparent: true, opacity: 0.85 }));
      core.position.set(a.x, 1.8, a.z); dyn.add(core);
      var lt = new THREE.PointLight(0x7dffa0, 1.0, 15); lt.position.set(a.x, 2.6, a.z); dyn.add(lt);
      R.anomalies.push({ x: a.x, z: a.z, sph: sph, core: core, lt: lt, ph: a.ph, cd: 0 });
      /* un artefact près de l'anomalie */
      var t = TYPES[irnd(0, TYPES.length - 1)];
      var ang = rnd(0, 6.28), dist = rnd(2.5, 5);
      var m = new THREE.Mesh(new THREE.OctahedronGeometry(0.3),
        new THREE.MeshLambertMaterial({ color: t.c, emissive: t.c, emissiveIntensity: 0.7 }));
      m.position.set(a.x + Math.cos(ang) * dist, 0.8, a.z + Math.sin(ang) * dist); dyn.add(m);
      R.artifacts.push({ x: m.position.x, z: m.position.z, type: t, mesh: m, taken: false });
    }
  }

  /* ── Chiens aveugles (adaptation des ennemis HUB OF DUTY) ── */
  function spawnDog() {
    var ang = rnd(0, 6.28), dist = rnd(45, 75);
    var x = clamp(R.px + Math.cos(ang) * dist, -170, 170),
        z = clamp(R.pz + Math.sin(ang) * dist, -170, 170);
    var grp = new THREE.Group();
    var bodyM = new THREE.MeshLambertMaterial({ color: 0x33302c });
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 1.5), bodyM);
    body.position.y = 0.65; grp.add(body);
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.5), bodyM);
    head.position.set(0, 0.95, -0.9); grp.add(head);
    grp.position.set(x, 0, z); scene.add(grp);
    R.dogs.push({ m: grp, hp: 30, cd: 0, dead: 0, phase: rnd(0, 6) });
    banner('🐕 Meute détectée', 'Les chiens aveugles chassent au bruit. Marchez doucement… ou courez.');
    sfx.dog();
  }
  function updateDogs(dt) {
    for (var i = R.dogs.length - 1; i >= 0; i--) {
      var dg = R.dogs[i];
      if (dg.dead > 0) {
        dg.dead += dt; dg.m.rotation.z = Math.min(1.5, dg.dead * 4);
        if (dg.dead > 2.2) { scene.remove(dg.m); R.dogs.splice(i, 1); }
        continue;
      }
      var dx = R.px - dg.m.position.x, dz = R.pz - dg.m.position.z,
          dd = Math.hypot(dx, dz);
      if (dd > 110) { /* trop loin : la meute vous retrouve */
        dg.m.position.x = R.px + Math.cos(rnd(0, 6.28)) * 80;
        dg.m.position.z = clamp(R.pz + Math.sin(rnd(0, 6.28)) * 80, -170, 170);
        continue;
      }
      var sp = 6.4;
      dg.m.position.x += dx / dd * sp * dt;
      dg.m.position.z += dz / dd * sp * dt;
      dg.m.position.y = Math.abs(Math.sin(R.t * 9 + dg.phase)) * 0.18;
      dg.m.rotation.y = Math.atan2(dx, dz);
      dg.cd -= dt;
      if (dd < 1.9 && dg.cd <= 0) {
        dg.cd = 1.2; hurt(11, 'Chien aveugle'); sfx.dog();
      }
    }
  }

  /* ── Tir hitscan (adaptation HUB OF DUTY) ── */
  var raycaster = null;
  function shoot() {
    if (R.mag <= 0) { banner('🔮 Chargeur vide', 'R pour recharger'); return; }
    R.mag--; R.fireCd = 0.34; R.ppitch = clamp(R.ppitch + 0.012, -1.35, 1.35);
    sfx.shoot();
    if (!raycaster) raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    var meshes = [];
    R.dogs.forEach(function (d) { if (!d.dead) meshes.push(d.m.children[0]); });
    var hits = raycaster.intersectObjects(meshes, false);
    if (hits.length && hits[0].distance < 90) {
      for (var i = 0; i < R.dogs.length; i++) {
        if (R.dogs[i].m.children[0] === hits[0].object) {
          R.dogs[i].hp -= 15;
          if (R.dogs[i].hp <= 0) { R.dogs[i].dead = 0.01; banner('🐕 Abattu', 'La meute sent le sang — restez mobile.'); }
          break;
        }
      }
    }
  }

  /* ── Boulons-sondes (F) : déclenchent les anomalies à distance ── */
  function throwBolt() {
    if (R.bolts <= 0) { banner('Plus de boulon', 'Rachetez-en au Hangar.'); return; }
    R.bolts--; sfx.bolt();
    var dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    var m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.24, 6),
      new THREE.MeshLambertMaterial({ color: 0xb8b8b8 }));
    m.position.set(R.px + dir.x, 1.5, R.pz + dir.z); scene.add(m);
    R.flying.push({ m: m, vx: dir.x * 16, vy: dir.y * 16 + 3, vz: dir.z * 16, y: 1.5 });
  }
  function updateBolts(dt) {
    for (var i = R.flying.length - 1; i >= 0; i--) {
      var b = R.flying[i];
      b.vy -= 18 * dt;
      b.m.position.x += b.vx * dt; b.m.position.y += b.vy * dt; b.m.position.z += b.vz * dt;
      b.m.rotation.x += 9 * dt;
      if (b.m.position.y <= 0.12) { /* au sol : sonde les anomalies */
        for (var j = 0; j < R.anomalies.length; j++) {
          var a = R.anomalies[j];
          if (Math.hypot(a.x - b.m.position.x, a.z - b.m.position.z) < 3.4) discharge(a, null);
        }
        scene.remove(b.m); R.flying.splice(i, 1);
      }
    }
  }
  function discharge(a, hitPlayer) {
    a.cd = 1.6;
    sfx.discharge();
    a.sph.scale.set(1.7, 1.7, 1.7); a.core.scale.set(1.6, 1.6, 1.6);
    R.flash = 0.5;
    var dp = Math.hypot(a.x - R.px, a.z - R.pz);
    if (dp < 6.5) {
      var dmg = Math.round(26 * (1 - dp / 6.5) + 6);
      hurt(dmg, 'Anomalie'); R.rad = clamp(R.rad + 20 * (1 - dp / 6.5) + 6, 0, 100);
      /* repoussée */
      var kx = (R.px - a.x) / (dp || 1), kz = (R.pz - a.z) / (dp || 1);
      R.px += kx * 4.5; R.pz += kz * 4.5;
    }
  }

  /* ── Dégâts / guérison ── */
  var flashEl = el('znFlash');
  function hurt(n, src) {
    R.hp -= n; R.lastHurt = R.t; sfx.hurt();
    flashEl.style.opacity = 0.55;
    setTimeout(function () { flashEl.style.opacity = 0; }, 130);
    if (R.hp <= 0) { R.hp = 0; endRun(false, src); }
  }

  /* ── Émission ── */
  function updateEmission(dt) {
    if (R.t >= R.emissionAt - 15 && !R.warned) {
      R.warned = true;
      banner('⚠ SIRÈNE — ÉMISSION DANS 15 s', 'Rejoignez l\u2019abri béton (marqueur ambre) ou la porte sud !');
      sfx.siren();
    }
    if (R.t >= R.emissionAt) {
      sfx.boom();
      R.flash = 1;
      if (!R.inShelter) {
        banner('☢️ ÉMISSION — vous êtes à découvert', 'Cours vers l\u2019abri ou la porte !');
        R.rad = clamp(R.rad + 34, 0, 100);
        hurt(30, 'Émission');
      } else {
        banner('☢️ ÉMISSION — à l\u2019abri', 'Le ciel se déchire au-dessus de vous. Ça passe.');
      }
      R.emissions++;
      if (R.emissions >= 3) { endRun(true, 'fin de journée'); return; }
      R.emissionAt = R.t + rnd(110, 140); R.warned = false;
      buildField(); /* la Zone se réorganise */
      banner('La Zone s\u2019est réorganisée', 'Nouvelles anomalies, nouveaux artefacts.');
    }
  }

  /* ── Fin de sortie ── */
  function endRun(success, cause) {
    if (G.mode === 'over') return;
    var sum = 0;
    R.belt.forEach(function (t) { sum += t.val; }); /* la ceinture fait foi (la carte change après chaque émission) */
    var lost = 0;
    meta.runs++;
    if (success) {
      meta.or += sum; meta.extracts++;
      meta.totalVal += sum;
      if (sum > meta.bestVal) meta.bestVal = sum;
      var tt = Math.round(R.t);
      if (!meta.bestTime || tt < meta.bestTime) meta.bestTime = tt;
      sfx.gate();
    } else {
      lost = sum;
      meta.or = Math.floor(meta.or * 0.7);
    }
    saveMeta();
    mouseDown = false;
    G.mode = 'over';
    document.exitPointerLock && document.exitPointerLock();
    el('znOverTitle').textContent = success ? '✅ Extraction réussie' : (cause === 'abandon' ? '🏳 Abandon de prospection' : '☠ La Zone vous a repris');
    el('znOverStats').innerHTML =
      (success
        ? 'Artefacts extraits : <b>' + sum + ' or</b>' + (R.emissions ? ' · émissions subies : ' + R.emissions : '')
        : (cause === 'abandon'
            ? 'Artefacts abandonnés dans la Zone : <b>' + lost + ' or</b>'
            : 'Artefacts perdus : <b>' + lost + ' or</b> · 30 % de votre or part avec vous'))
      + '<br>Temps en Zone : ' + fmt(R.t) + ' · Caisse du Hangar : <b>' + meta.or + ' or</b>';
    ov('znOver', true);
    hud.style.display = 'none';
  }

  /* ── PDA (carte) ── */
  var pdaOn = false, pdaC = el('znPdaCanvas');
  function drawPda() {
    var c = pdaC.getContext('2d');
    c.clearRect(0, 0, 240, 240);
    c.fillStyle = '#0b0f0b'; c.fillRect(0, 0, 240, 240);
    var s = 232 / (LIM * 2 + 12), ox = 120, oz = 120;
    function px(x, z) { return [ox + x * s, oz + z * s]; }
    c.strokeStyle = '#4a5b4a'; c.lineWidth = 2;
    c.strokeRect(ox - LIM * s, oz - LIM * s, LIM * 2 * s, LIM * 2 * s);
    /* porte sud */
    c.fillStyle = '#7dffa0';
    var gp = px(0, 172); c.fillRect(gp[0] - 4, gp[1] - 3, 8, 6);
    /* abri */
    c.fillStyle = '#ffc46b';
    var bp = px(bunkerPos.x, bunkerPos.z); c.fillRect(bp[0] - 4, bp[1] - 3, 8, 6);
    /* anomalies */
    R.anomalies.forEach(function (a) {
      var p = px(a.x, a.z);
      c.fillStyle = 'rgba(125,255,160,' + (0.4 + 0.4 * Math.sin(R.t * 4)) + ')';
      c.beginPath(); c.arc(p[0], p[1], 4, 0, 6.28); c.fill();
    });
    /* artefacts si détecteur II */
    if (meta.upDet) {
      R.artifacts.forEach(function (a) {
        if (a.taken) return;
        var p = px(a.x, a.z);
        c.fillStyle = '#66e0ff';
        c.beginPath(); c.arc(p[0], p[1], 2, 0, 6.28); c.fill();
      });
    }
    /* joueur */
    var pp = px(R.px, R.pz);
    c.save(); c.translate(pp[0], pp[1]); c.rotate(-R.yaw);
    c.fillStyle = '#ffffff';
    c.beginPath(); c.moveTo(0, -6); c.lineTo(4, 4); c.lineTo(-4, 4); c.closePath(); c.fill();
    c.restore();
  }

  /* ── État global ── */
  var G = { mode: 'menu' };
  var R = null;
  var keys = {}, mouseDown = false, lastT = 0, hudAcc = 0, geigerAcc = 0, beepAcc = 0;

  function newRun() {
    R = {
      t: 0, px: 0, pz: 158, pyaw: 0, ppitch: 0, /* v25 : face au champ — une anomalie pulse droit dès l'entrée */
      vx: 0, vz: 0, hp: 100, rad: 0, st: 100,
      mag: 8, ammo: meta.ammo, reloading: 0, fireCd: 0,
      bolts: meta.boulons, meds: meta.med, arads: meta.antirad,
      belt: [], beltMax: 2 + meta.upBelt,
      anomalies: [], artifacts: [], dogs: [], flying: [],
      emissionAt: rnd(95, 130), warned: false, emissions: 0, inShelter: false,
      nextDog: rnd(25, 40), introT: 9,
      flash: 0, lastHurt: -99
    };
    buildField();
  }

  /* ── Collision : cercles d'obstacles + limites ── */
  function collide() {
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i], dx = R.px - o.x, dz = R.pz - o.z,
          d = Math.hypot(dx, dz), min = o.r + 0.5;
      if (d < min && d > 0.001) { R.px = o.x + dx / d * min; R.pz = o.z + dz / d * min; }
    }
    R.px = clamp(R.px, -LIM, LIM); R.pz = clamp(R.pz, -LIM, 172);
  }

  /* ── Mise à jour ── */
  function update(dt) {
    R.t += dt;
    prompt('');
    if (R.introT > 0) {
      R.introT -= dt;
      prompt('Avancez (Z ou \u2191) : une anomalie verte pulse droit devant \u2014 le geiger s\u2019emballe \u00e0 l\u2019approche');
    }
    /* déplacement (adapté de HUB OF DUTY) */
    var fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    var strafe = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    if (zdFallback) {
      if (keys.ArrowLeft) R.pyaw += 2.4 * dt;
      if (keys.ArrowRight) R.pyaw -= 2.4 * dt;
      strafe = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    }
    var sprint = (keys.ShiftLeft || keys.ShiftRight) && R.st > 1;
    var speed = (sprint ? 8.4 : 4.7);
    R.st = clamp(R.st + (sprint ? -15 : (fwd || strafe ? 9 : 14)) * dt, 0, 100);
    var dirX = strafe * Math.cos(R.pyaw) - fwd * Math.sin(R.pyaw),
        dirZ = -strafe * Math.sin(R.pyaw) - fwd * Math.cos(R.pyaw);
    var dl = Math.hypot(dirX, dirZ);
    if (dl > 0) { dirX /= dl; dirZ /= dl; }
    R.vx += (dirX * speed - R.vx) * Math.min(1, dt * 10);
    R.vz += (dirZ * speed - R.vz) * Math.min(1, dt * 10);
    R.px += R.vx * dt; R.pz += R.vz * dt;
    collide();
    /* rechargement / tir */
    R.fireCd -= dt; R.reloading -= dt;
    if (R.reloading > 0 && R.reloading - dt <= 0) {
      var need = 8 - R.mag, take = Math.min(need, R.ammo);
      R.mag += take; R.ammo -= take;
    }
    if (mouseDown && R.reloading <= 0 && R.fireCd <= 0) shoot();
    /* geiger */
    var nd = 1e9, na = null;
    for (var i = 0; i < R.anomalies.length; i++) {
      var a = R.anomalies[i];
      a.ph += dt;
      var pulse = 1 + Math.sin(a.ph * 3) * 0.12;
      a.sph.scale.set(pulse, pulse, pulse);
      if (a.cd > 0) {
        a.cd -= dt;
        var dec = 1 - Math.min(1, a.cd / 1.6) * 0.7;
        a.sph.scale.multiplyScalar(dec); a.core.scale.setScalar(dec);
        if (a.cd <= 0) { a.sph.scale.set(1, 1, 1); a.core.scale.set(1, 1, 1); }
      }
      a.lt.intensity = 0.9 + Math.sin(a.ph * 3) * 0.4;
      var d2 = Math.hypot(a.x - R.px, a.z - R.pz);
      if (d2 < nd) { nd = d2; na = a; }
      if (d2 < 2.5 && a.cd <= 0) discharge(a, true);
    }
    geigerAcc += dt * (nd < 34 ? (34 - nd) * 0.55 + 1 : 0.25);
    if (geigerAcc >= 1) { geigerAcc = 0; sfx.click(); }
    lblGeiger.style.opacity = nd < 34 ? (0.35 + 0.65 * Math.abs(Math.sin(R.t * (2 + (34 - nd) * 0.4)))) : 0.15;
    /* radiation : proximité + malus d'artefact + décroissance */
    var radIn = nd < 14 ? (14 - nd) * 0.055 : 0;
    for (i = 0; i < R.belt.length; i++) if (R.belt[i].malus) radIn += R.belt[i].malus;
    if (radIn > 0) R.rad = clamp(R.rad + radIn * dt * 3.2, 0, 100);
    else R.rad = clamp(R.rad - 0.5 * dt, 0, 100);
    if (R.rad >= 85) hurt((R.rad - 85) * 0.05 * dt * 60, 'Radiation');
    /* détecteur d'artefacts */
    var nAd = 1e9;
    for (i = 0; i < R.artifacts.length; i++) {
      var ar = R.artifacts[i];
      if (!ar.taken) {
        ar.mesh.rotation.y += dt * 2;
        ar.mesh.position.y = 0.8 + Math.sin(R.t * 2.4 + i) * 0.14;
        var d3 = Math.hypot(ar.x - R.px, ar.z - R.pz);
        if (d3 < nAd) nAd = d3;
        if (d3 < 2.7) prompt('E — Ramasser : ' + ar.type.n + ' (' + ar.type.val + ' or)');
      }
    }
    beepAcc += dt;
    if (nAd < 48 && beepAcc >= (meta.upDet ? 0.9 : 1.7) * Math.max(0.35, nAd / 48)) {
      beepAcc = 0; sfx.beep();
    }
    /* porte : extraction */
    var dg = Math.hypot(R.px - 0, R.pz - 172);
    if (dg < 6) {
      var carried = R.belt.length;
      prompt(carried ? 'E — Extraire (' + carried + ' artefact' + (carried > 1 ? 's' : '') + ')' : 'Porte sud — E pour sortir (sans artefact)');
    }
    /* abri */
    R.inShelter = Math.hypot(R.px - bunkerPos.x, R.pz - bunkerPos.z) < 8;
    lblAbri.style.opacity = R.inShelter ? 1 : 0;
    /* chiens */
    R.nextDog -= dt;
    if (R.nextDog <= 0 && R.dogs.length < 3) {
      R.nextDog = rnd(38, 65);
      if (R.t > 20) spawnDog();
    }
    updateDogs(dt);
    updateBolts(dt);
    updateEmission(dt);
    if (G.mode !== 'play') return; /* endRun a pu survenir */
    /* caméra */
    camera.position.set(R.px, 1.7, R.pz);
    camera.rotation.set(R.ppitch, R.pyaw, 0, 'YXZ');
    R.flash = Math.max(0, R.flash - dt * 1.6);
    /* HUD (10 Hz) */
    hudAcc += dt;
    if (hudAcc > 0.1) { hudAcc = 0; updateHud(); }
  }

  function updateHud() {
    el('znHpv').textContent = Math.ceil(R.hp);
    el('znRadv').textContent = Math.floor(R.rad);
    barHp.firstChild.style.width = R.hp + '%';
    barHp.firstChild.style.background = R.hp > 50 ? '#7dffa0' : (R.hp > 25 ? '#ffc46b' : '#ff5f5f');
    barRad.firstChild.style.width = R.rad + '%';
    barSt.firstChild.style.width = R.st + '%';
    lblTimer.textContent = fmt(R.t);
    lblEmission.textContent = R.t < R.emissionAt ? 'Émission dans ' + fmt(R.emissionAt - R.t) : 'ÉMISSION !';
    lblEmission.className = R.t >= R.emissionAt - 15 ? 'zn-danger' : '';
    lblOr.textContent = meta.or + ' or';
    lblAmmo.textContent = R.reloading > 0 ? '… recharge' : (R.mag + ' / ' + R.ammo);
    var b = [];
    for (var i = 0; i < R.beltMax; i++) {
      b.push(R.belt[i] ? '<span class="zn-slot has" title="' + R.belt[i].n + '">' + R.belt[i].val + '</span>'
                      : '<span class="zn-slot"></span>');
    }
    lblBelt.innerHTML = b.join('') + '<i class="zn-beltinfo">' + R.bolts + ' boulons · 💊×' + R.meds + ' · ☣×' + R.arads + '</i>';
  }

  /* ── Interactions E ── */
  function interact() {
    if (!R || G.mode !== 'play') return;
    /* artefact ? */
    for (var i = 0; i < R.artifacts.length; i++) {
      var a = R.artifacts[i];
      if (!a.taken && Math.hypot(a.x - R.px, a.z - R.pz) < 2.7) {
        if (R.belt.length >= R.beltMax) { banner('Ceinture pleine', 'Extrayez vos artefacts à la porte sud.'); return; }
        a.taken = true; dyn.remove(a.mesh);
        R.belt.push(a.type); sfx.pickup();
        banner('+' + a.type.n, a.type.val + ' or · ' + a.type.d);
        updateHud(); return;
      }
    }
    /* porte ? */
    if (Math.hypot(R.px, R.pz - 172) < 6) {
      if (R.belt.length || R.emissions) endRun(true);
      else banner('Faites au moins une découverte', 'Les artefacts brillent près des anomalies vertes.');
    }
  }
  function useMed() {
    if (!R || R.meds <= 0) return;
    R.meds--; R.hp = clamp(R.hp + 45, 0, 100); sfx.pickup(); updateHud();
  }
  function useAntirad() {
    if (!R || R.arads <= 0) return;
    R.arads--; R.rad = clamp(R.rad - 55, 0, 100); sfx.pickup(); updateHud();
  }

  /* ── Visée : capture de souris + secours (adapté de HUB OF DUTY v23) ── */
  var zdHadLock = false, zdFallback = false;
  function zdFallbackOn() {
    if (zdFallback) return;
    zdFallback = true;
    banner('🖱 VISÉE LIBRE', 'Capture de souris indisponible ici : bougez la souris pour viser, pivotez avec ← →, Échap pour la pause.');
  }
  function ZD_LOCK(elm) {
    zdHadLock = false;
    try {
      var p = elm.requestPointerLock && elm.requestPointerLock();
      if (p && p.catch) p.catch(function () { zdFallbackOn(); });
    } catch (err) { zdFallbackOn(); }
    setTimeout(function () { if (!zdHadLock && !zdFallback && G.mode === 'play') zdFallbackOn(); }, 400);
  }

  /* ── Entrées ── */
  document.addEventListener('keydown', function (e) {
    keys[e.code] = true;
    if (G.mode === 'play') {
      if (e.code === 'KeyR' && R.mag < 8 && R.ammo > 0 && R.reloading <= 0) { R.reloading = 1.2; sfx.reload(); }
      if (e.code === 'KeyF') throwBolt();
      if (e.code === 'KeyE') interact();
      if (e.code === 'Digit3') useMed();
      if (e.code === 'Digit4') useAntirad();
      if (e.code === 'KeyM' || e.code === 'Semicolon') { togglePda(); e.preventDefault(); }
    } else if (G.mode === 'pda' && (e.code === 'KeyM' || e.code === 'Semicolon')) {
      togglePda(); e.preventDefault();
    }
    if (e.code === 'Escape') {
      if (G.mode === 'play' && zdFallback) pauseGame();
      else if (G.mode === 'pause') resumeGame();
      else if (G.mode === 'pda') { togglePda(); e.preventDefault(); }
    }
  });
  document.addEventListener('keyup', function (e) { keys[e.code] = false; });
  document.addEventListener('mousedown', function (e) { if (G.mode === 'play' && e.button === 0) mouseDown = true; });
  document.addEventListener('mouseup', function (e) { if (e.button === 0) mouseDown = false; });
  document.addEventListener('contextmenu', function (e) { if (G.mode === 'play') e.preventDefault(); });
  document.addEventListener('mousemove', function (e) {
    if (G.mode !== 'play') return;
    if (document.pointerLockElement !== view && document.pointerLockElement !== renderer.domElement && !zdFallback) return;
    var sens = 0.0021;
    R.pyaw -= e.movementX * sens;
    R.ppitch = clamp(R.ppitch - e.movementY * sens, -1.35, 1.35);
  });
  document.addEventListener('pointerlockchange', function () {
    zdHadLock = document.pointerLockElement === (renderer && renderer.domElement) || document.pointerLockElement === view;
    if (!zdHadLock && G.mode === 'play' && !zdFallback) pauseGame();
  });

  function togglePda() {
    if (G.mode === 'play') { G.mode = 'pda'; ov('znPda', true); drawPda(); }
    else if (G.mode === 'pda') { G.mode = 'play'; ov('znPda', false); }
    sfx.ui();
  }
  function pauseGame() {
    if (G.mode !== 'play') return;
    mouseDown = false;
    G.mode = 'pause';
    hud.style.display = 'none';
    ov('znPause', true);
    document.exitPointerLock && document.exitPointerLock();
  }
  function resumeGame() {
    ov('znPause', false);
    hud.style.display = 'block';
    G.mode = 'play';
    ZD_LOCK(renderer.domElement);
  }

  /* ── Démarrage / boutons ── */
  function startRun() {
    if (!initGL()) return;
    audioInit();
    newRun();
    zdFallback = false;
    ov('znMenu', false);
    ov('znHangar', false);
    ov('znOver', false);
    ov('znAide', false);
    hud.style.display = 'block';
    G.mode = 'play';
    updateHud();
    ZD_LOCK(renderer.domElement);
    banner('☢️ Vous êtes dans la Zone', 'Suivez le geiger (LED), sondez au boulon (F), ramassez (E), extrayez à la porte sud.');
    resizeGL();
    setTimeout(function () { /* v25 : si rien ne s'affiche, on le dit au lieu d'un écran noir */
      if (G.mode === 'play' && R && !(R._frames > 3)) {
        var f = el('znGlFail');
        if (f) {
          var h3 = f.querySelector('h3'), pp = f.querySelector('p');
          if (h3) h3.textContent = 'Le rendu 3D ne démarre pas dans ce cadre';
          if (pp) pp.innerHTML = "L'accélération graphique est bloquée ici. Ouvrez la page dans un onglet à part (ou téléchargez-la) : le jeu tournera normalement. Aucune installation, aucun compte.";
          ov('znGlFail', true);
        }
      }
    }, 2200);
  }
  function openHangar() {
    if (!initGL()) return;
    G.mode = 'hangar';
    ov('znMenu', false);
    ov('znHangar', true);
    renderHangar();
  }
  function renderHangar() {
    el('znHangarOr').textContent = meta.or + ' or';
    el('znHangarStock').innerHTML =
      'Stock : 💊 ' + meta.med + ' · ☣ ' + meta.antirad + ' · boulons ' + meta.boulons + ' · munitions ' + meta.ammo +
      '<br>Ceinture : ' + (2 + meta.upBelt) + ' emplacements · Détecteur : ' + (meta.upDet ? 'MK II' : 'MK I');
    var det = el('znPdaDet');
    if (det) det.style.display = meta.upDet ? '' : 'none';
  }
  function buy(cost, fn) {
    if (meta.or < cost) { banner('Pas assez d\u2019or', 'Il manque ' + (cost - meta.or) + ' or.'); return; }
    meta.or -= cost; fn(); saveMeta(); sfx.pickup(); renderHangar();
  }
  function bind(id, fn) { var b = el(id); if (b) b.addEventListener('click', fn); }
  bind('znNew', function () { sfx.ui(); openHangar(); });
  bind('znGoBtn', function () { sfx.ui(); startRun(); });
  bind('znAideBtn', function () { sfx.ui(); ov('znAide', true); });
  bind('znAideClose', function () { ov('znAide', false); });
  bind('znMute', function () { muted = !muted; el('znMute').textContent = muted ? '🔇 Son coupé' : '🔊 Son'; });
  bind('znMute2', function () { muted = !muted; el('znMute').textContent = muted ? '🔇 Son coupé' : '🔊 Son'; });
  bind('znBuyMed', function () { buy(120, function () { meta.med++; }); });
  bind('znBuyAntirad', function () { buy(100, function () { meta.antirad++; }); });
  bind('znBuyBolts', function () { buy(60, function () { meta.boulons += 6; }); });
  bind('znBuyAmmo', function () { buy(90, function () { meta.ammo += 32; }); });
  bind('znBuyBelt', function () {
    if (meta.upBelt >= 1) { banner('Ceinture déjà améliorée', '3 emplacements, c\u2019est le max.'); return; }
    buy(400, function () { meta.upBelt = 1; });
  });
  bind('znBuyDet', function () {
    if (meta.upDet >= 1) { banner('Détecteur déjà amélioré', 'Le MK II est au max (artefacts sur le PDA).'); return; }
    buy(600, function () { meta.upDet = 1; });
  });
  bind('znAgain', function () { ov('znOver', false); openHangar(); });
  bind('znHangarBack', function () {
    ov('znHangar', false);
    ov('znMenu', true);
    G.mode = 'menu'; renderMenu(); sfx.ui();
  });
  bind('znMenuBtn', function () {
    ov('znOver', false);
    ov('znHangar', false);
    ov('znMenu', true);
    G.mode = 'menu'; renderMenu();
  });
  bind('znResume', function () { resumeGame(); });
  bind('znQuit', function () {
    ov('znPause', false);
    hud.style.display = 'none';
    if (R && G.mode === 'pause') endRun(false, 'abandon');
    try { if (window.CIMFS) window.CIMFS.exit(); } catch (e) {}
  });
  bind('znUseMed', function () { useMed(); });
  bind('znUseAntirad', function () { useAntirad(); });

  function renderMenu() {
    el('znRecords').innerHTML =
      'Caisse : <b>' + meta.or + ' or</b> · sorties : ' + meta.runs + ' · extractions : ' + meta.extracts +
      (meta.bestVal ? ' · record : ' + meta.bestVal + ' or' : '');
  }

  /* ── Boucle ── */
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
    lastT = now;
    if (G.mode === 'play' && R && glOK) update(dt);
    if (G.mode === 'play' && glOK && renderer) {
      if (flashEl && R) flashEl.style.opacity = Math.max(parseFloat(flashEl.style.opacity) || 0, R.flash * 0.5);
      try { renderer.render(scene, camera); R._frames = (R._frames || 0) + 1; } catch (e) { glFail(); }
    }
  }
  requestAnimationFrame(function (n) { lastT = n; loop(n); });

  renderMenu();

  /* hook de debug/test (même modèle que CARAVANES_DEBUG) */
  window.ZN2_DEBUG = { getR: function () { return R; }, getG: function () { return G; }, meta: meta };
})();

