/* ═══════════════════════════════════════════════════════════════
   LOGRES — rendu 3D léger des batailles (Three.js r128)
   Conventions perf : <200 draw calls, 0 ombre dynamique, pixelRatio
   plafonné ×2, pooling des surbrillances, dispose complet au démontage.
   UMD : window.LOGRES3D
   ═══════════════════════════════════════════════════════════════ */
(function (root, factory) {
  root.LOGRES3D = factory(root.THREE);
})(typeof self !== 'undefined' ? self : this, function (THREE) {
  'use strict';

  var SQ3 = Math.sqrt(3);
  var st = null; /* état du rendu courant */

  var TILE = {
    plain: { h: .5,  c: 0xa3b18a },
    mud:   { h: .4,  c: 0x8d7f63 },
    bush:  { h: .5,  c: 0x8aa07c },
    rock:  { h: 1.05, c: 0x97a1a8 },
    tree:  { h: .5,  c: 0x6f8a6a }
  };

  function hexWorld(q, r) {
    return { x: SQ3 * (q + r / 2), z: 1.5 * r };
  }

  function glyphTexture(txt, color) {
    var c = document.createElement('canvas');
    c.width = c.height = 96;
    var g = c.getContext('2d');
    g.font = 'bold 64px ui-monospace, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.strokeStyle = 'rgba(10,14,18,.9)';
    g.lineWidth = 10;
    g.strokeText(txt, 48, 52);
    g.fillStyle = color;
    g.fillText(txt, 48, 52);
    var tex = new THREE.CanvasTexture(c);
    return tex;
  }
  function barTexture() {
    var c = document.createElement('canvas');
    c.width = 64; c.height = 10;
    return { canvas: c, tex: new THREE.CanvasTexture(c) };
  }
  function drawBar(bar, ratio) {
    var g = bar.canvas.getContext('2d');
    g.clearRect(0, 0, 64, 10);
    g.fillStyle = 'rgba(12,16,20,.85)';
    g.fillRect(0, 0, 64, 10);
    g.fillStyle = ratio > .55 ? '#5cbf72' : (ratio > .28 ? '#d8a04a' : '#e05555');
    g.fillRect(2, 2, Math.max(0, 60 * ratio), 6);
    bar.tex.needsUpdate = true;
  }

  function mount(canvas, ctxBat) {
    if (!THREE) return false;
    var gl = null;
    try { gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl'); } catch (e) { }
    if (!gl) return false;
    var B = ctxBat.B;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    } catch (e) { return false; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0xc3ced6);
    scene.fog = new THREE.Fog(0xc3ced6, 24, 52);

    var camera = new THREE.PerspectiveCamera(45, 2, .1, 120);
    var cam = { theta: 0, pitch: .92, R: 13.5, target: new THREE.Vector3(0, 0, 0) };

    scene.add(new THREE.HemisphereLight(0xe8f0f4, 0x707a6c, .95));
    var dir = new THREE.DirectionalLight(0xfff2dd, .65);
    dir.position.set(6, 12, 4);
    scene.add(dir);

    /* sol brumeux */
    var groundGeo = new THREE.CircleGeometry(60, 24);
    var groundMat = new THREE.MeshLambertMaterial({ color: 0x9aa8a0 });
    var ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -.08;
    scene.add(ground);

    /* hexagones */
    var hexGeo = new THREE.CylinderGeometry(1, 1, 1, 6);
    var hexMeshes = [];
    var matCache = {};
    Object.keys(B.tiles).forEach(function (k2) {
      var pp = k2.split(','), q = +pp[0], r = +pp[1];
      var t2 = TILE[B.tiles[k2]] || TILE.plain;
      if (!matCache[B.tiles[k2]]) matCache[B.tiles[k2]] = new THREE.MeshLambertMaterial({ color: t2.c });
      var m = new THREE.Mesh(hexGeo, matCache[B.tiles[k2]]);
      m.scale.y = t2.h;
      var w2 = hexWorld(q, r);
      m.position.set(w2.x, t2.h / 2, w2.z);
      m.userData = { q: q, r: r, top: t2.h };
      scene.add(m);
      hexMeshes.push(m);
      /* décor : conifères sur tree, blocs sur rock */
      if (B.tiles[k2] === 'tree') {
        var cone = new THREE.Mesh(new THREE.ConeGeometry(.42, 1.1, 7), new THREE.MeshLambertMaterial({ color: 0x46604a }));
        cone.position.set(w2.x, t2.h + .55, w2.z);
        scene.add(cone);
      } else if (B.tiles[k2] === 'rock') {
        var blk = new THREE.Mesh(new THREE.DodecahedronGeometry(.5, 0), new THREE.MeshLambertMaterial({ color: 0x7c868e }));
        blk.position.set(w2.x, t2.h + .18, w2.z);
        blk.rotation.set(.4, .8, .2);
        scene.add(blk);
      }
    });
    function topOf(q, r) {
      for (var i = 0; i < hexMeshes.length; i++) {
        if (hexMeshes[i].userData.q === q && hexMeshes[i].userData.r === r) return hexMeshes[i].userData.top;
      }
      return .5;
    }

    /* surbrillances (pool) */
    var movePool = [], targetPool = [];
    var moveGeo = new THREE.CylinderGeometry(.86, .86, .05, 6);
    var moveMat = new THREE.MeshBasicMaterial({ color: 0x4ad8c0, transparent: true, opacity: .4 });
    for (var i = 0; i < 30; i++) {
      var o = new THREE.Mesh(moveGeo, moveMat);
      o.visible = false;
      scene.add(o);
      movePool.push(o);
    }
    var ringGeo = new THREE.TorusGeometry(.62, .05, 8, 24);
    var ringMat = new THREE.MeshBasicMaterial({ color: 0xd9482f });
    for (var j = 0; j < 10; j++) {
      var rg = new THREE.Mesh(ringGeo, ringMat);
      rg.rotation.x = Math.PI / 2;
      rg.visible = false;
      scene.add(rg);
      targetPool.push(rg);
    }
    var activeDisc = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, .04, 6), new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: .55 }));
    activeDisc.visible = false;
    scene.add(activeDisc);

    /* unités */
    var unitViews = [];
    function makeView(u) {
      var grp = new THREE.Group();
      var isHero = !!u.hero;
      var col = u.color || (u.side === 'A' ? 0x0c87a8 : 0x8f3a34);
      var body = new THREE.Mesh(
        new THREE.CylinderGeometry(isHero ? .30 : .26, isHero ? .38 : .33, isHero ? .82 : .72, 8),
        new THREE.MeshLambertMaterial({ color: col })
      );
      body.position.y = (isHero ? .82 : .72) / 2;
      body.userData.uid = u.id;
      grp.add(body);
      /* étendard des héros */
      if (isHero) {
        var pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.15, 5), new THREE.MeshLambertMaterial({ color: 0x2c333b }));
        pole.position.set(.16, .95, -.16);
        grp.add(pole);
        var flag = new THREE.Mesh(new THREE.BoxGeometry(.34, .2, .02), new THREE.MeshLambertMaterial({ color: col }));
        flag.position.set(.34, 1.32, -.16);
        grp.add(flag);
      } else if (u.ranged) {
        var bow = new THREE.Mesh(new THREE.TorusGeometry(.2, .025, 6, 12, Math.PI), new THREE.MeshLambertMaterial({ color: 0x54402c }));
        bow.position.set(.22, .68, 0);
        bow.rotation.y = Math.PI / 2;
        grp.add(bow);
      } else if (u.boss) {
        var horn = new THREE.Mesh(new THREE.ConeGeometry(.14, .5, 6), new THREE.MeshLambertMaterial({ color: 0x2b2b30 }));
        horn.position.set(0, 1.05, -.2);
        horn.rotation.x = -.5;
        grp.add(horn);
      }
      /* glyphe flottant */
      var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glyphTexture(u.glyph, u.side === 'A' ? '#0b6f8a' : '#8f2f28'), transparent: true }));
      spr.scale.set(.72, .72, 1);
      spr.position.y = 1.72;
      grp.add(spr);
      /* barre de vie */
      var bar = barTexture();
      drawBar(bar, u.hp / u.maxhp);
      var barSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: bar.tex, transparent: true }));
      barSpr.scale.set(.9, .14, 1);
      barSpr.position.y = 1.38;
      grp.add(barSpr);
      var w2 = hexWorld(u.xq, u.xr);
      var top = topOf(u.xq, u.xr);
      grp.position.set(w2.x, top, w2.z);
      if (u.boss) grp.scale.set(1.22, 1.22, 1.22);
      scene.add(grp);
      return { u: u, grp: grp, body: body, bar: bar, barSpr: barSpr, lastHp: u.hp, tx: w2.x, tz: w2.z, hop: 0, pulse: 0, dying: 0 };
    }
    B.units.forEach(function (u) { unitViews.push(makeView(u)); });

    /* ── boucle ── */
    var raf = 0, clock = new THREE.Clock();
    function frame() {
      raf = requestAnimationFrame(frame);
      var dt = Math.min(.05, clock.getDelta());
      /* caméra */
      var hz = cam.R * Math.cos(cam.pitch);
      camera.position.set(cam.target.x + hz * Math.sin(cam.theta), cam.R * Math.sin(cam.pitch), cam.target.z + hz * Math.cos(cam.theta));
      camera.lookAt(cam.target);
      /* unités */
      unitViews.forEach(function (v) {
        if (!v.u.alive) {
          if (v.dying < 1) {
            v.dying = Math.min(1, v.dying + dt * 1.4);
            v.grp.rotation.z = -1.45 * v.dying;
            v.grp.position.y -= dt * .45;
          }
          return;
        }
        var w2 = hexWorld(v.u.xq, v.u.xr);
        if (Math.abs(v.tx - w2.x) > .01 || Math.abs(v.tz - w2.z) > .01) v.hop = 1;
        v.tx = w2.x; v.tz = w2.z;
        var g = v.grp;
        g.position.x += (v.tx - g.position.x) * Math.min(1, dt * 9);
        g.position.z += (v.tz - g.position.z) * Math.min(1, dt * 9);
        g.position.y += (topOf(v.u.xq, v.u.xr) - g.position.y) * Math.min(1, dt * 9);
        if (v.hop > 0) {
          v.hop = Math.max(0, v.hop - dt * 2.4);
          g.position.y += Math.sin(v.hop * Math.PI) * .3;
        }
        if (v.pulse > 0) {
          v.pulse = Math.max(0, v.pulse - dt * 3.2);
          var s = 1 + Math.sin(v.pulse * Math.PI) * .22;
          g.scale.set(s, 1 / s, s);
        } else if (v.u.boss) g.scale.set(1.22, 1.22, 1.22);
        else g.scale.set(1, 1, 1);
        if (v.lastHp !== v.u.hp) { v.lastHp = v.u.hp; drawBar(v.bar, Math.max(0, v.u.hp) / v.u.maxhp); }
      });
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(frame);

    /* ── entrées ── */
    var down = null, dragging = false;
    function onDown(e) { down = { x: e.clientX, y: e.clientY, t: Date.now(), theta: cam.theta, pitch: cam.pitch }; dragging = false; }
    function onMove(e) {
      if (!down) return;
      var dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) dragging = true;
      if (dragging) {
        cam.theta = down.theta - dx * .006;
        cam.pitch = Math.max(.5, Math.min(1.25, down.pitch + dy * .004));
      }
    }
    function onUp(e) {
      if (!down) return;
      var wasDrag = dragging;
      var p = down; down = null; dragging = false;
      if (wasDrag || Date.now() - p.t > 500) return;
      var rect = canvas.getBoundingClientRect();
      var ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      var ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);
      var hits = ray.intersectObjects(hexMeshes);
      if (!hits.length) return;
      var hex = hits[0].object.userData;
      var uid = null, bestD = 99;
      unitViews.forEach(function (v) {
        if (!v.u.alive) return;
        var d = (v.u.xq === hex.q && v.u.xr === hex.r) ? 0 : 99;
        if (d < bestD) { bestD = d; uid = v.u.id; }
      });
      if (st && st.onHex) st.onHex(hex.q, hex.r, uid);
    }
    function onWheel(e) {
      e.preventDefault();
      cam.R = Math.max(8, Math.min(24, cam.R + (e.deltaY > 0 ? 1.1 : -1.1)));
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    function onResize() {
      var w2 = canvas.clientWidth || canvas.parentElement.clientWidth || 800;
      var h2 = canvas.clientHeight || 480;
      renderer.setSize(w2, h2, false);
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
    }
    onResize();
    window.addEventListener('resize', onResize);

    st = {
      ok: true, scene: scene, renderer: renderer, camera: camera, cam: cam,
      unitViews: unitViews, movePool: movePool, targetPool: targetPool, activeDisc: activeDisc,
      topOf: topOf, onHex: null, ctxBat: ctxBat,
      dispose: function () {
        cancelAnimationFrame(raf);
        canvas.removeEventListener('pointerdown', onDown);
        canvas.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        canvas.removeEventListener('wheel', onWheel);
        window.removeEventListener('resize', onResize);
        scene.traverse(function (o) {
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
              if (m.map) m.map.dispose();
              m.dispose();
            });
          }
        });
        renderer.dispose();
        st = null;
      }
    };
    /* v27 : l'interface appelle R.showMoves/showTargets/pulse/screenPos sur
       l'objet renvoyé par mount, mais ces fonctions vivaient sur le module.
       Sans cette exposition, R.showMoves lève « not a function » à CHAQUE
       rafraîchissement et casse la boucle de tours (les ennemis n'agissent
       plus jamais tout seuls). */
    st.showMoves = showMoves;
    st.showTargets = showTargets;
    st.pulse = pulse;
    st.screenPos = screenPos;
    st.sync = sync;
    st.setZoom = setZoom;
    return st;
  }

  function sync(ctxBat) {
    if (!st) return;
    st.ctxBat = ctxBat;
    var B = ctxBat.B;
    var act = (B.queue && B.queue[B.qi]) || null;
    if (act && act.alive) {
      var w2 = hexWorld(act.xq, act.xr);
      st.activeDisc.visible = true;
      st.activeDisc.position.set(w2.x, st.topOf(act.xq, act.xr) + .05, w2.z);
    } else st.activeDisc.visible = false;
  }

  function showMoves(moves) {
    if (!st) return;
    var i = 0;
    Object.keys(moves).forEach(function (k2) {
      var pp = k2.split(','), q = +pp[0], r = +pp[1];
      if (i >= st.movePool.length) return;
      var o = st.movePool[i++];
      var w2 = hexWorld(q, r);
      o.position.set(w2.x, st.topOf(q, r) + .06, w2.z);
      o.visible = true;
    });
    for (; i < st.movePool.length; i++) st.movePool[i].visible = false;
  }
  function showTargets(map) {
    if (!st) return;
    var i = 0;
    Object.keys(map).forEach(function (id) {
      var u = st.unitViews.filter(function (v) { return v.u.id === +id; })[0];
      if (!u || i >= st.targetPool.length) return;
      var rg = st.targetPool[i++];
      rg.position.set(u.grp.position.x, u.grp.position.y + .12, u.grp.position.z);
      rg.visible = true;
    });
    for (; i < st.targetPool.length; i++) st.targetPool[i].visible = false;
  }
  function pulse(uid) {
    if (!st) return;
    var v = st.unitViews.filter(function (x) { return x.u.id === uid; })[0];
    if (v) v.pulse = 1;
  }
  function screenPos(q, r) {
    if (!st) return null;
    var w2 = hexWorld(q, r);
    var v = new THREE.Vector3(w2.x, st.topOf(q, r) + 1.9, w2.z);
    v.project(st.camera);
    var canvas = st.renderer.domElement;
    return { x: (v.x * .5 + .5) * canvas.clientWidth, y: (-v.y * .5 + .5) * canvas.clientHeight };
  }
  function setZoom(d) {
    if (st) st.cam.R = Math.max(8, Math.min(24, st.cam.R + d));
  }

  return {
    mount: mount, sync: sync, showMoves: showMoves, showTargets: showTargets,
    pulse: pulse, screenPos: screenPos, setZoom: setZoom,
    unmount: function () { if (st) { st.dispose(); st = null; } },
    isMounted: function () { return !!st; }
  };
});
