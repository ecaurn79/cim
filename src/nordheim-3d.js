/* ============================================================
   NORDHEIM — rendu 3D v1 (Three.js r128, ES5, UMD)
   Terrain heightmap procédural, InstancedMesh (arbres, pierres),
   personnages low-poly, cycle jour/nuit, caméra 3ᵉ personne.
   Dépend de rpg-core.js + nordheim-engine.js + three.min.js.
   Budget perf : ~60 draw calls, pixelRatio ≤ 1.5, zéro alloc/boucle.
   ============================================================ */
(function (root) {
  'use strict';
  var T = root.THREE, N = root.NORDHEIM;
  if (!T) throw new Error('THREE requis : chargez three.min.js avant nordheim-3d.js');
  if (!N) throw new Error('NORDHEIM requis : chargez nordheim-engine.js avant nordheim-3d.js');

  var R3 = { ok: false, pitch: 0.42, dist: 9 };
  var scene, camera, renderer, sun, hemi, fire, fireLight;
  var terrain, treeTrunks, treeTops, rocksM, stonesM, chestsM;
  var playerG, weaponG, charG = {}, npcG = {}, entG = {};
  var dummy = null, tmpC = null, camp = null, G = null;
  var swingT = 0, tints = {};

  var MAT = {
    wall: null, roof: null, wood: null, stone: null, skin: null
  };

  R3.init = function (g, canvas) {
    G = g; camp = g.camp;
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, antialias: false, powerPreference: 'high-performance' });
    } catch (e) { return { ok: false, reason: 'WebGL indisponible' }; }
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 1.5));
    renderer.setSize(canvas.clientWidth || 960, canvas.clientHeight || 540, false);

    scene = new T.Scene();
    scene.background = new T.Color(0x9fc0d8);
    scene.fog = new T.Fog(0xbfd3e0, 130, 560);

    camera = new T.PerspectiveCamera(66, (canvas.clientWidth || 960) / (canvas.clientHeight || 540), 0.1, 1400);
    hemi = new T.HemisphereLight(0xcfe6ff, 0x55684a, 0.85);
    scene.add(hemi);
    sun = new T.DirectionalLight(0xfff2d8, 0.85);
    sun.position.set(120, 180, 60);
    scene.add(sun);

    dummy = new T.Object3D();
    tmpC = new T.Color();
    MAT.wall = new T.MeshLambertMaterial({ color: 0x7a5c40 });
    MAT.roof = new T.MeshLambertMaterial({ color: 0x4a3826 });
    MAT.wood = new T.MeshLambertMaterial({ color: 0x8a6a48 });
    MAT.stone = new T.MeshLambertMaterial({ color: 0x8a8a80 });

    buildTerrain();
    buildForest();
    buildVillage();
    buildRuins();
    playerG = makeHuman(0x3a4a5a, 0x28303a, 1);
    scene.add(playerG);
    weaponG = makeWeapon(camp.wpn);
    playerG.add(weaponG);
    G.W.npcs.forEach(function (q) {
      var col = q.role === 'garde' ? 0x5a6a7a : (q.role === 'forge' ? 0x6a4a3a : 0x7a6a5a);
      npcG[q.key] = makeHuman(col, 0x3a3230, 1);
      scene.add(npcG[q.key]);
    });
    G.ents.forEach(function (e) { entG[e.id] = makeBeast(e.type); scene.add(entG[e.id]); });

    /* feu de camp central */
    fire = new T.Mesh(new T.ConeGeometry(0.7, 1.4, 6), new T.MeshBasicMaterial({ color: 0xff9a3c }));
    fire.position.set(0, N.groundAt(0, 150) + 0.8, 150);
    scene.add(fire);
    fireLight = new T.PointLight(0xff9a50, 0.8, 46);
    fireLight.position.copy(fire.position);
    scene.add(fireLight);

    R3.ok = true;
    return { ok: true };
  };

  function buildTerrain() {
    var SEG = 96, SIZE = 1000;
    var geo = new T.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position;
    var colors = new Float32Array(pos.count * 3);
    var i, x, y, z, h, sl, c;
    for (i = 0; i < pos.count; i++) {
      x = pos.getX(i); z = pos.getZ(i);
      h = N.groundAt(x, z);
      pos.setY(i, h);
      sl = N.slopeAt(x, z);
      if (h > 62) c = [0.92, 0.94, 0.96];                       /* neige */
      else if (sl > 0.55 || h > 40) c = [0.54, 0.52, 0.47];     /* roche */
      else if (Math.hypot(x, z - 150) < 78) c = [0.62, 0.55, 0.4]; /* terre du village */
      else {
        var g2 = 0.42 + 0.14 * N.fbm(x * 0.02, z * 0.02, 7, 2);
        c = [g2 * 0.92, g2 * 1.18, g2 * 0.72];                  /* prairie */
      }
      colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
    }
    geo.setAttribute('color', new T.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    terrain = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true }));
    scene.add(terrain);
  }

  function buildForest() {
    var trees = G.W.trees;
    var n = trees.length;
    treeTrunks = new T.InstancedMesh(new T.CylinderGeometry(0.22, 0.38, 3, 5), new T.MeshLambertMaterial({ color: 0x5a4430 }), n);
    treeTops = new T.InstancedMesh(new T.ConeGeometry(1.7, 4.6, 6), new T.MeshLambertMaterial({ color: 0xffffff }), n);
    for (var i = 0; i < n; i++) {
      var tr = trees[i], y = N.groundAt(tr.x, tr.z);
      dummy.position.set(tr.x, y + 1.5 * tr.s, tr.z);
      dummy.scale.set(tr.s, tr.s, tr.s);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      treeTrunks.setMatrixAt(i, dummy.matrix);
      dummy.position.set(tr.x, y + (3 + 2.1) * tr.s - 0.4, tr.z);
      dummy.updateMatrix();
      treeTops.setMatrixAt(i, dummy.matrix);
      tmpC.set(tr.kind === 'sapin' ? 0x3a5c3a : 0x86a852);
      treeTops.setColorAt(i, tmpC);
    }
    if (treeTops.instanceColor) treeTops.instanceColor.needsUpdate = true;
    scene.add(treeTrunks);
    scene.add(treeTops);
    var rk = G.W.rocks;
    rocksM = new T.InstancedMesh(new T.DodecahedronGeometry(1.1, 0), new T.MeshLambertMaterial({ color: 0x7e7e74 }), rk.length);
    for (i = 0; i < rk.length; i++) {
      dummy.position.set(rk[i].x, N.groundAt(rk[i].x, rk[i].z) + 0.3, rk[i].z);
      dummy.scale.set(rk[i].s, rk[i].s * 0.8, rk[i].s);
      dummy.rotation.set(0.3, rk[i].s * 2, 0.2);
      dummy.updateMatrix();
      rocksM.setMatrixAt(i, dummy.matrix);
    }
    scene.add(rocksM);
  }

  function buildVillage() {
    var V = N.VILLAGE;
    var spots = [[-30, -18, 0.5], [26, -24, -0.4], [-34, 14, 0.9], [40, -6, -0.7], [-44, -4, 0.2], [18, 32, -1.2]];
    spots.forEach(function (s2) {
      var x = V.x + s2[0], z = V.y + s2[1], y = N.groundAt(x, z);
      var body = new T.Mesh(new T.BoxGeometry(7, 3.2, 5), MAT.wall);
      body.position.set(x, y + 1.6, z);
      body.rotation.y = s2[2];
      scene.add(body);
      var roof = new T.Mesh(new T.ConeGeometry(5.4, 2.6, 4), MAT.roof);
      roof.position.set(x, y + 4.4, z);
      roof.rotation.y = s2[2] + Math.PI / 4;
      scene.add(roof);
    });
    /* forge : enclume */
    var ax = V.x - 14, az = V.y - 30, ay = N.groundAt(ax, az);
    var anvil = new T.Mesh(new T.BoxGeometry(1.4, 0.8, 0.6), new T.MeshLambertMaterial({ color: 0x3a3a3e }));
    anvil.position.set(ax, ay + 0.9, az);
    scene.add(anvil);
    var forge = new T.Mesh(new T.BoxGeometry(1.2, 1.2, 1.2), new T.MeshLambertMaterial({ color: 0x5a4038 }));
    forge.position.set(ax + 2, ay + 0.6, az);
    scene.add(forge);
  }

  function buildRuins() {
    var all = [], chestSpots = [];
    G.W.ruins.forEach(function (r) {
      var y0 = N.groundAt(r.x, r.z);
      for (var j = 0; j < 6; j++) {
        var a = j * Math.PI / 3 + r.i;
        all.push({ x: r.x + Math.cos(a) * (r.r - 5), z: r.z + Math.sin(a) * (r.r - 5), y: y0, s: 0.8 + ((r.i + j) % 3) * 0.25, rot: a });
      }
      chestSpots.push({ x: r.x, z: r.z, y: y0, open: false });
    });
    stonesM = new T.InstancedMesh(new T.CylinderGeometry(0.9, 1.3, 4.6, 5), MAT.stone, all.length);
    all.forEach(function (s2, i) {
      dummy.position.set(s2.x, s2.y + 2 * s2.s, s2.z);
      dummy.scale.set(s2.s, s2.s, s2.s);
      dummy.rotation.set(0.06, s2.rot, 0.05);
      dummy.updateMatrix();
      stonesM.setMatrixAt(i, dummy.matrix);
    });
    scene.add(stonesM);
    chestsM = new T.InstancedMesh(new T.BoxGeometry(1.7, 1, 1.1), new T.MeshLambertMaterial({ color: 0x8a6a3a }), chestSpots.length);
    chestSpots.forEach(function (s2, i) {
      dummy.position.set(s2.x, s2.y + 0.5, s2.z);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, i, 0);
      dummy.updateMatrix();
      chestsM.setMatrixAt(i, dummy.matrix);
    });
    scene.add(chestsM);
  }

  /* ── personnages low-poly ── */
  function makeHuman(shirt, legs, s) {
    var g2 = new T.Group();
    var body = new T.Mesh(new T.BoxGeometry(0.72, 1.05, 0.42), new T.MeshLambertMaterial({ color: shirt }));
    body.position.y = 1.15;
    g2.add(body);
    var legsM = new T.Mesh(new T.BoxGeometry(0.6, 0.7, 0.36), new T.MeshLambertMaterial({ color: legs }));
    legsM.position.y = 0.35;
    g2.add(legsM);
    var head = new T.Mesh(new T.SphereGeometry(0.27, 7, 6), new T.MeshLambertMaterial({ color: 0xd8b090 }));
    head.position.y = 1.95;
    g2.add(head);
    g2.scale.set(s, s, s);
    return g2;
  }
  function makeWeapon(key) {
    var g2 = new T.Group();
    var m2 = new T.MeshLambertMaterial({ color: key === 'guerre' || key === 'troll' ? 0x9aa2a8 : 0xc8ccd0 });
    var blade;
    if (key === 'mains') return g2;
    if (key === 'guerre' || key === 'troll') {
      blade = new T.Mesh(new T.BoxGeometry(0.14, 1.15, 0.05), m2);
      blade.position.y = 1.25;
      var manche = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 1.1, 5), MAT.wood);
      manche.position.y = 0.55;
      g2.add(manche);
    } else {
      blade = new T.Mesh(new T.BoxGeometry(0.09, 1.0, 0.04), m2);
      blade.position.y = 1.1;
      var garde = new T.Mesh(new T.BoxGeometry(0.3, 0.06, 0.06), MAT.wood);
      garde.position.y = 0.62;
      g2.add(garde);
    }
    g2.add(blade);
    if (key === 'troll') { blade.scale.set(1.4, 1.3, 1.4); tmpC.set(0xbfe2ee); }
    g2.position.set(0.45, 0.85, 0.1);
    return g2;
  }
  function makeBeast(type) {
    var B = N.BEASTS[type];
    var g2 = new T.Group();
    var col = B.col, s2 = B.boss ? 2.6 : 1;
    if (type === 'cerf') {
      var body = new T.Mesh(new T.BoxGeometry(1.3, 0.75, 0.55), new T.MeshLambertMaterial({ color: col }));
      body.position.y = 1.0;
      g2.add(body);
      var neck = new T.Mesh(new T.BoxGeometry(0.24, 0.7, 0.24), new T.MeshLambertMaterial({ color: col }));
      neck.position.set(0.68, 1.6, 0);
      neck.rotation.z = -0.5;
      g2.add(neck);
      var head2 = new T.Mesh(new T.BoxGeometry(0.4, 0.28, 0.26), new T.MeshLambertMaterial({ color: col }));
      head2.position.set(0.95, 1.85, 0);
      g2.add(head2);
      var bois = new T.Mesh(new T.ConeGeometry(0.06, 0.5, 4), MAT.wood);
      bois.position.set(0.9, 2.15, 0.1);
      bois.rotation.z = -0.6;
      g2.add(bois);
    } else if (type === 'loup') {
      var lb = new T.Mesh(new T.BoxGeometry(1.1, 0.55, 0.45), new T.MeshLambertMaterial({ color: col }));
      lb.position.y = 0.55;
      g2.add(lb);
      var lh = new T.Mesh(new T.BoxGeometry(0.38, 0.32, 0.32), new T.MeshLambertMaterial({ color: col }));
      lh.position.set(0.68, 0.78, 0);
      g2.add(lh);
      var queue = new T.Mesh(new T.BoxGeometry(0.5, 0.12, 0.12), new T.MeshLambertMaterial({ color: col }));
      queue.position.set(-0.75, 0.7, 0);
      queue.rotation.z = 0.5;
      g2.add(queue);
    } else if (type === 'troll') {
      var tb = new T.Mesh(new T.BoxGeometry(1.5, 1.7, 1.0), new T.MeshLambertMaterial({ color: col }));
      tb.position.y = 1.9;
      g2.add(tb);
      var th = new T.Mesh(new T.SphereGeometry(0.5, 7, 6), new T.MeshLambertMaterial({ color: 0xbfe2ee }));
      th.position.y = 3.1;
      g2.add(th);
      var bras = new T.Mesh(new T.BoxGeometry(0.45, 1.6, 0.45), new T.MeshLambertMaterial({ color: col }));
      bras.position.set(1.0, 1.9, 0);
      g2.add(bras);
      var bras2 = bras.clone();
      bras2.position.x = -1.0;
      g2.add(bras2);
    } else { /* bandit / revenant : humanoïdes */
      g2 = makeHuman(type === 'bandit' ? 0x6e3a30 : 0x4a5a52, 0x2e2a26, 1);
      var cape = new T.Mesh(new T.BoxGeometry(0.85, 1.0, 0.2), new T.MeshLambertMaterial({ color: type === 'bandit' ? 0x503028 : 0x38443e }));
      cape.position.set(0, 1.2, -0.28);
      g2.add(cape);
    }
    g2.scale.set(s2, s2, s2);
    return g2;
  }

  /* ── jour/nuit ── */
  var skyDay = new T.Color(0x9fc0d8), skyNight = new T.Color(0x141c2c), skyDawn = new T.Color(0xe0a870);
  var fogDay = new T.Color(0xbfd3e0), fogNight = new T.Color(0x202a3a);
  var skyNow = new T.Color(), fogNow = new T.Color();
  function skyTick() {
    var t2 = G.time;
    var sunA = (t2 - 0.25) * Math.PI * 2;
    var elev = Math.sin(sunA); /* >0 le jour */
    var day = Math.max(0, Math.min(1, elev * 2.2 + 0.25));
    var dawn = Math.max(0, 1 - Math.abs(elev) * 4);
    sun.position.set(Math.cos(sunA) * 260, Math.max(12, elev * 300), 130);
    sun.intensity = 0.15 + day * 0.75;
    hemi.intensity = 0.28 + day * 0.6;
    skyNow.copy(skyNight).lerp(skyDay, day);
    skyNow.lerp(skyDawn, dawn * 0.55);
    fogNow.copy(fogNight).lerp(fogDay, day);
    scene.background.copy(skyNow);
    scene.fog.color.copy(fogNow);
    fireLight.intensity = 0.35 + (1 - day) * 0.75;
    fire.scale.y = 0.85 + Math.sin(performance.now() * 0.011) * 0.18;
  }

  /* ── rendu ── */
  R3.render = function (dt, now) {
    if (!R3.ok) return;
    var p = G.p;
    var py = N.groundAt(p.x, p.z);
    p.y = py;
    /* joueur */
    playerG.position.set(p.x, py, p.z);
    playerG.rotation.y = p.a;
    var moving = G._moving;
    playerG.rotation.z = moving ? Math.sin(now * 0.012) * 0.05 : 0;
    if (G.p.cd > 0.1) swingT = 1;
    swingT = Math.max(0, swingT - dt * 3.2);
    weaponG.rotation.x = -swingT * 2.2;
    /* pnj */
    G.W.npcs.forEach(function (q) {
      var m2 = npcG[q.key];
      if (!m2) return;
      m2.position.set(q.x, N.groundAt(q.x, q.z), q.z);
      m2.rotation.y = q.walk ? Math.atan2(-(q._dx || 0), -(q._dz || 0)) : Math.atan2(-(N.VILLAGE.x - q.x), -(N.VILLAGE.y - q.z));
      if (q.walk) m2.position.y += Math.abs(Math.sin(now * 0.008 + q.ph)) * 0.08;
    });
    /* entités */
    for (var i = 0; i < G.ents.length; i++) {
      var e = G.ents[i];
      var m3 = entG[e.id];
      if (!m3) continue;
      if (e.hp <= 0) {
        m3.visible = e.type === 'bandit' || e.type === 'revenant' || e.type === 'troll' ? false : true;
        m3.rotation.z = Math.PI / 2; /* carcasse couchée */
        m3.position.set(e.x, N.groundAt(e.x, e.z) + 0.2, e.z);
        continue;
      }
      m3.visible = true;
      m3.rotation.z = 0;
      e.y = N.groundAt(e.x, e.z);
      m3.position.set(e.x, e.y, e.z);
      m3.rotation.y = Math.atan2(-(p.x - e.x), -(p.z - e.z));
      if (e.st !== 'rôde') m3.position.y += Math.abs(Math.sin(now * 0.014 + e.ph)) * 0.12;
    }
    /* coffres ouverts : on les enfonce (visuel simple) */
    G.W.ruins.forEach(function (r, ri) {
      if (r.chestOpen) { chestsM.getMatrixAt(ri, dummy.matrix); }
    });
    /* caméra 3ᵉ personne */
    var d = R3.dist, cp = R3.pitch;
    var cx = p.x + Math.sin(p.a) * d * Math.cos(cp);
    var cz = p.z + Math.cos(p.a) * d * Math.cos(cp);
    var cy = py + 2.1 + d * Math.sin(cp);
    var gy = N.groundAt(cx, cz) + 1.2;
    if (cy < gy) cy = gy;
    camera.position.set(cx, cy, cz);
    camera.lookAt(p.x, py + 1.8, p.z);
    skyTick();
    renderer.render(scene, camera);
  };

  R3.syncEnts = function () {
    G.ents.forEach(function (e) {
      if (!entG[e.id]) { entG[e.id] = makeBeast(e.type); scene.add(entG[e.id]); }
    });
  };
  R3.setWeapon = function (key) {
    if (!R3.ok || !playerG) return;
    playerG.remove(weaponG);
    weaponG = makeWeapon(key);
    playerG.add(weaponG);
  };
  R3.setZoom = function (d) { R3.dist = Math.max(4, Math.min(16, d)); };
  R3.resize = function (w, h) {
    if (!R3.ok) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  R3.dispose = function () {
    if (!R3.ok) return;
    scene.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material && o.material.dispose) o.material.dispose();
    });
    renderer.dispose();
    R3.ok = false;
  };

  root.NORDHEIM3D = R3;
})(typeof window !== 'undefined' ? window : global);
