/* ============================================================
   NORDHEIM — moteur v1 (open world nordique, sim pure)
   Page 21 du hub C.I.M. — v21. Dépend de rpg-core.js (KERNEL).
   Positions en mètres, monde 1000×1000 m centré sur (0,0).
   Aucune dépendance Three.js ici : la sim est testable à Node.
   ============================================================ */
(function (root) {
  'use strict';
  var K = root.RPGCORE;
  if (!K || !K.makeRng) throw new Error('RPGCORE requis : chargez rpg-core.js avant nordheim-engine.js');

  var N = { VERSION: '1.0', SIZE: 1000, HALF: 430 /* rayon jouable */ };
  N.WORLD_SEEDS = [
    { key: 'loup', n: 'Vallée du Loup' },
    { key: 'ourse', n: 'Vallée de l\u2019Ourse' },
    { key: 'corbeau', n: 'Vallée du Corbeau' }
  ];

  /* ══════════ BRUIT & TERRAIN ══════════ */
  function hash2(x, y, seed) {
    var h = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return h - Math.floor(h);
  }
  function vnoise(x, y, seed) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
    var c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, seed, oct) {
    var val = 0, amp = 0.5, fr = 1, i;
    for (i = 0; i < oct; i++) { val += amp * vnoise(x * fr, y * fr, seed + i * 13); amp *= 0.5; fr *= 2.1; }
    return val; /* ≈ 0..1 */
  }
  N.fbm = fbm;

  var VILLAGE = { x: 0, y: 150, r: 70 };
  N.VILLAGE = VILLAGE;

  N.genWorld = function (seedKey, dayStamp) {
    var seed = 0, i;
    var sk = (seedKey || 'loup') + '-' + (dayStamp || '');
    for (i = 0; i < sk.length; i++) seed = (seed * 31 + sk.charCodeAt(i)) % 99991;
    var rng = K.makeRng('nordheim-' + sk);

    function heightAt(x, z) {
      var n = fbm(x * 0.0016, z * 0.0016, seed, 4);
      var base = 6 + n * 26;
      /* montagnes en couronne : plus on sort, plus ça grimpe */
      var dc = Math.sqrt(x * x + z * z) / 430;
      var ring = Math.max(0, dc - 0.62) / 0.38;
      base += Math.pow(Math.min(1, ring), 1.6) * 95 * (0.7 + 0.6 * fbm(x * 0.006, z * 0.006, seed + 5, 2));
      /* platelage village */
      var dv = Math.sqrt((x - VILLAGE.x) * (x - VILLAGE.x) + (z - VILLAGE.y) * (z - VILLAGE.y));
      if (dv < VILLAGE.r * 2) {
        var t = Math.max(0, Math.min(1, (dv - VILLAGE.r) / VILLAGE.r));
        base = base * t + 7 * (1 - t);
      }
      return base;
    }
    N.heightAt = heightAt;

    function slopeAt(x, z) {
      var d = 2, hL = heightAt(x - d, z), hR = heightAt(x + d, z), hD = heightAt(x, z - d), hU = heightAt(x, z + d);
      return Math.max(Math.abs(hR - hL), Math.abs(hU - hD)) / (2 * d);
    }
    N.slopeAt = slopeAt;

    /* 6 ruines-donjons en couronne, la 6ᵉ (la plus loin au nord) = tanière du troll */
    var RUIN_NAMES = ['Cercle du Corbeau', 'Pierres Blanches', 'Tumulus du Chasseur', 'Brume-les-Pierres', 'Fortin Oublié', 'Tanière du Troll'];
    var ruins = [];
    var a0 = rng() * Math.PI * 2;
    for (i = 0; i < 6; i++) {
      var ang = a0 + i * (Math.PI * 2 / 6) + (rng() - 0.5) * 0.3;
      var dist = 210 + i * 34 + rng() * 40;
      var rx = Math.cos(ang) * dist, rz = Math.sin(ang) * dist * 0.85;
      ruins.push({ i: i, x: rx, z: rz, n: RUIN_NAMES[i], r: 16, purged: false, chestOpen: false,
        guards: [], tier: i < 2 ? 1 : (i < 4 ? 2 : 3) });
    }
    /* platelage des ruines dans le terrain : proche de 0 via table de corrections */
    var flats = [{ x: VILLAGE.x, z: VILLAGE.y, r: VILLAGE.r, h: 7 }];
    ruins.forEach(function (r) { flats.push({ x: r.x, z: r.z, r: r.r + 6, h: null }); });
    N.flats = flats;

    /* arbres & rochers (position + échelle), rejetés si pente forte / zones plates */
    var trees = [], rocks = [], guard = 0;
    while (trees.length < 320 && guard++ < 4000) {
      var tx = (rng() * 2 - 1) * 430, tz = (rng() * 2 - 1) * 430;
      if (Math.sqrt(tx * tx + tz * tz) > 420) continue;
      if (Math.sqrt((tx - VILLAGE.x) * (tx - VILLAGE.x) + (tz - VILLAGE.y) * (tz - VILLAGE.y)) < 80) continue;
      var nearRuin = false;
      for (var r2 = 0; r2 < 6; r2++) if (Math.hypot(tx - ruins[r2].x, tz - ruins[r2].z) < 24) nearRuin = true;
      if (nearRuin) continue;
      if (slopeAt(tx, tz) > 0.45) continue;
      trees.push({ x: tx, z: tz, s: 0.8 + rng() * 0.7, kind: rng() < 0.75 ? 'sapin' : 'bouleau' });
    }
    guard = 0;
    while (rocks.length < 90 && guard++ < 2000) {
      var kx = (rng() * 2 - 1) * 430, kz = (rng() * 2 - 1) * 430;
      if (Math.sqrt(kx * kx + kz * kz) > 430) continue;
      if (Math.sqrt((kx - VILLAGE.x) * (kx - VILLAGE.x) + (kz - VILLAGE.y) * (kz - VILLAGE.y)) < 60) continue;
      rocks.push({ x: kx, z: kz, s: 0.7 + rng() * 1.6 });
    }

    /* PNJ du village : { key, n, role, home, work, agenda } */
    function hx(d) { return { x: VILLAGE.x + d[0], z: VILLAGE.y + d[1] }; }
    var npcs = [
      { key: 'brand', n: 'Brand le Forgeron', role: 'forge', home: hx([-30, -18]), work: hx([-14, -30]), at: 'work' },
      { key: 'sigrid', n: 'Sigrid, maîtresse chasseuse', role: 'chasseurs', home: hx([26, -24]), work: hx([30, 8]), at: 'work' },
      { key: 'torvald', n: 'Torvald de la Hache', role: 'hache', home: hx([-34, 14]), work: hx([12, 30]), at: 'work' },
      { key: 'runa', n: 'Runa la Cuisinière', role: 'villageois', home: hx([40, -6]), work: hx([0, 2]), at: 'work' },
      { key: 'olaf', n: 'Olaf le Bûcheron', role: 'villageois', home: hx([-44, -4]), work: hx([-52, 36]), at: 'work' },
      { key: 'yrsa', n: 'Yrsa la SAGE', role: 'soin', home: hx([18, 32]), work: hx([6, 18]), at: 'work' },
      { key: 'garde1', n: 'Garde Erik', role: 'garde', home: hx([-6, 58]), work: hx([-8, 62]), at: 'work' },
      { key: 'garde2', n: 'Garde Tove', role: 'garde', home: hx([6, 58]), work: hx([8, 62]), at: 'work' }
    ];
    npcs.forEach(function (p2, i2) { p2.x = p2.work.x; p2.z = p2.work.z; p2.ph = i2 * 0.7; });

    /* espèces */
    N.BEASTS = {
      cerf: { n: 'Cerf', hp: 22, speed: 5.4, flee: 14, dmg: 0, xp: 12, drops: { viande: [1, 2], fourrure: [1, 1] }, col: 0x8a6a48 },
      loup:  { n: 'Loup', hp: 34, speed: 6.2, aggro: 16, dmg: 9, atkR: 2.0, cd: 1.1, xp: 22, drops: { croc: [1, 2], fourrure: [1, 1] }, col: 0x5a5f66 },
      bandit: { n: 'Bandit', hp: 46, speed: 4.6, aggro: 18, dmg: 12, atkR: 2.1, cd: 1.3, xp: 30, drops: { or: [18, 30] }, col: 0x6e4a3a },
      revenant: { n: 'Revenant', hp: 62, speed: 3.6, aggro: 15, dmg: 16, atkR: 2.2, cd: 1.6, xp: 48, drops: { or: [30, 48], essence: [1, 1] }, col: 0x4a5a52 },
      troll: { n: 'Troll des Glaces', hp: 420, speed: 4.2, aggro: 30, dmg: 26, atkR: 3.0, cd: 2.0, xp: 320, boss: true, drops: { or: [300, 400], coeur: [1, 1] }, col: 0x9fc4d8 }
    };
    N.WPN = {
      mains:   { n: 'Mains nues', dmg: 4, rate: 0.6, price: 0 },
      chasse:  { n: '\u00c9pée de chasse', dmg: 10, rate: 0.55, price: 0, quest: true },
      fer:     { n: '\u00c9pée de fer', dmg: 13, rate: 0.55, price: 180 },
      guerre:  { n: 'Hache de guerre', dmg: 17, rate: 0.8, price: 320 },
      troll:   { n: 'Broie-Troll', dmg: 24, rate: 0.85, price: 0, quest: true }
    };
    N.ARM = {
        tunique: { n: 'Tunique', def: 0, price: 0 },
      cuir:    { n: 'Cuir bouilli', def: 0.15, price: 150 },
      fer:     { n: 'Cotte de fer', def: 0.30, price: 400 },
      ours:    { n: 'Manteau de l\u2019Ourse', def: 0.24, stam: 0.3, price: 0, quest: true }
    };
    N.POTIONS = [
      { key: 'soin', n: 'Potion de soin', price: 45, d: '+45 PV' },
      { key: 'grandsoin', n: 'Grande potion', price: 110, d: '+100 PV', minQuest: 'ruines2' }
    ];
    N.ENCHANT = { price: 600, d: 'Forgeron : +25 % dégâts permanents sur l\u2019arme' };

    /* guildes & quêtes (3 par guilde + la bête) */
    N.QUESTS = [
      { key: 'cerfs', g: 'chasseurs', n: 'Cerfs pour la table', d: 'Chassez 5 cerfs dans les bois.',
        cond: function (c) { return (c.kills.cerf || 0) >= 5; }, prog: function (c) { return Math.min(5, c.kills.cerf || 0) + ' / 5 cerfs'; },
        rw: { or: 120, wpn: 'chasse' } },
      { key: 'fourrures', g: 'chasseurs', n: 'Fourrures d\u2019hiver', d: 'Rapportez 6 fourrures à Sigrid.',
        need: 'cerfs', cond: function (c) { return (c.bag.fourrure || 0) >= 6; }, prog: function (c) { return Math.min(6, c.bag.fourrure || 0) + ' / 6 fourrures'; }, consume: { fourrure: 6 },
        rw: { or: 160 } },
      { key: 'meute', g: 'chasseurs', n: 'La meute', d: 'Abattez 5 loups qui rôdent dans les bois.',
        need: 'fourrures', cond: function (c) { return (c.kills.loup || 0) >= 5; }, prog: function (c) { return Math.min(5, c.kills.loup || 0) + ' / 5 loups'; },
        rw: { or: 220, arm: 'ours' } },
      { key: 'ruines1', g: 'hache', n: 'Premières pierres', d: 'Purgez 2 ruines de leurs gardiens.',
        cond: function (c) { return c.purged >= 2; }, prog: function (c) { return Math.min(2, c.purged) + ' / 2 ruines'; },
        rw: { or: 150 } },
      { key: 'ruines2', g: 'hache', n: 'Reprendre la vallée', d: 'Purgez 4 ruines.',
        need: 'ruines1', cond: function (c) { return c.purged >= 4; }, prog: function (c) { return Math.min(4, c.purged) + ' / 4 ruines'; },
        rw: { or: 260 } },
      { key: 'troll', g: 'hache', n: 'La Bête du nord', d: 'Purgez la 5ᵉ ruine, puis abattez le Troll des Glaces dans la Tanière.',
        need: 'ruines2', cond: function (c) { return (c.kills.troll || 0) >= 1; }, prog: function (c) { return (c.kills.troll || 0) >= 1 ? 'troll abattu' : (c.purged >= 5 ? 'la tanière gronde — allez y' : 'purgez 5 ruines (' + Math.min(5, c.purged) + '/5)'); },
        rw: { or: 600, wpn: 'troll' } }
    ];

    return { seed: sk, ruins: ruins, trees: trees, rocks: rocks, npcs: npcs, rng: rng };
  };

  /* hauteur finale du sol avec platelages appliqués (ruines alignées) */
  N.groundAt = function (x, z) {
    var h = N.heightAt(x, z);
    for (var i = 0; i < N.flats.length; i++) {
      var f = N.flats[i];
      var d = Math.hypot(x - f.x, z - f.z);
      if (d < f.r * 1.6) {
        var target = f.h === null ? N.heightAt(f.x, f.z) : f.h;
        var t = Math.max(0, Math.min(1, (d - f.r) / (f.r * 0.6)));
        h = target * (1 - t) + h * t;
      }
    }
    return h;
  };

  /* ══════════ CAMP (état persistant) ══════════ */
  N.newCamp = function (seedKey) {
    return {
      v: 1, seed: seedKey || 'loup', day: 1, time: 0.32, or: 120,
      xp: 0, level: 1,
      hp: 100, hpMax: 100, st: 100, mana: 40, manaMax: 40,
      wpn: 'mains', arm: 'tunique', ench: false, potions: { soin: 2, grandsoin: 0 },
      bag: { viande: 0, fourrure: 0, croc: 0, essence: 0, coeur: 0 },
      quests: { cerfs: 'libre', fourrures: 'libre', meute: 'libre', ruines1: 'libre', ruines2: 'libre', troll: 'libre' },
      purged: 0, kills: {}, flags: {}, trollDown: false,
      best: { level: 1, or: 0, purged: 0, troll: 0 },
      mute: false
    };
  };
  N.saveCamp = function (camp) {
    try { localStorage.setItem('nor_save', K.saveGame(camp)); } catch (e) { }
    try {
      var b = null;
      try { b = JSON.parse(localStorage.getItem('nor_best') || 'null'); } catch (e2) { }
      if (!b) b = { level: 1, or: 0, purged: 0, troll: 0 };
      if (camp.best.level > b.level) b.level = camp.best.level;
      if (camp.best.or > b.or) b.or = camp.best.or;
      if (camp.best.purged > b.purged) b.purged = camp.best.purged;
      if (camp.best.troll > b.troll) b.troll = camp.best.troll;
      localStorage.setItem('nor_best', JSON.stringify(b));
    } catch (e3) { }
  };
  N.loadCamp = function () {
    try { var raw = localStorage.getItem('nor_save'); return raw ? K.loadGame(raw) : null; } catch (e) { return null; }
  };
  N.records = function () {
    try { return JSON.parse(localStorage.getItem('nor_best') || 'null'); } catch (e) { return null; }
  };

  N.xpNext = function (lvl) { return Math.round(60 * Math.pow(lvl, 1.4)); };
  N.playerDmg = function (camp) {
    var w = N.WPN[camp.wpn] || N.WPN.mains;
    return (w.dmg + (camp.level - 1)) * (camp.ench ? 1.25 : 1);
  };
  N.playerDef = function (camp) {
    var a = N.ARM[camp.arm] || N.ARM.tunique;
    return Math.min(0.6, a.def);
  };

  /* ══════════ EXPÉDITION (session live) ══════════ */
  N.startSession = function (camp) {
    var W2 = N.genWorld(camp.seed, '');
    var G = {
      camp: camp, W: W2,
      p: { x: 0, z: VILLAGE.y + 26, y: 0, a: 0, st: 100, cd: 0, hurt: 0, spellCd: 0 },
      ents: [], time: camp.time, msgs: [], fx: [], stats: { kills: 0, loot: 0 },
      over: ''
    };
    /* gardiens des ruines */
    W2.ruins.forEach(function (r) {
      var nb = r.tier === 1 ? 2 : 3;
      for (var j = 0; j < nb; j++) {
        var type = r.tier === 3 ? 'revenant' : 'bandit';
        spawnEnt(G, type, r.x + Math.cos(j * 2.1) * 6, r.z + Math.sin(j * 2.1) * 6, r);
      }
      /* troll de la tanière : présent dès le début ? Non — il dort tant que <5 ruines purgées */
    });
    /* faune : 12 cerfs, 8 loups en meute */
    var rng = W2.rng;
    for (var i = 0; i < 12; i++) {
      var a = rng() * Math.PI * 2, d = 90 + rng() * 300;
      spawnEnt(G, 'cerf', Math.cos(a) * d, Math.sin(a) * d * 0.9, null);
    }
    for (i = 0; i < 8; i++) {
      var a2 = rng() * Math.PI * 2, d2 = 150 + rng() * 250;
      spawnEnt(G, 'loup', Math.cos(a2) * d2, Math.sin(a2) * d2 * 0.9, null);
    }
    msg(G, 'Vallée de ' + (seedName(camp.seed)) + ' — jour ' + camp.day + '. Le village est derrière vous.');
    return G;
  };
  function seedName(k) {
    for (var i = 0; i < N.WORLD_SEEDS.length; i++) if (N.WORLD_SEEDS[i].key === k) return N.WORLD_SEEDS[i].n;
    return 'Nordheim';
  }
  N.seedName = seedName;

  function spawnEnt(G, type, x, z, ruin) {
    var B = N.BEASTS[type];
    G.ents.push({ id: G.ents.length + 1, type: type, x: x, z: z, y: 0, hp: B.hp, st: 'rôde', tx: x, tz: z, wt: Math.random() * 3, cd: 0, ruin: ruin || null, ph: Math.random() * 6 });
  }
  N.spawnEnt = spawnEnt;

  function msg(G, txt) { G.msgs.push({ txt: txt, at: G.time }); }
  function fx(G, t, x, z) { G.fx.push({ t: t, x: x, z: z, at: G.time }); }

  function move(G, o, dx, dz) {
    var nx = o.x + dx, nz = o.z + dz;
    var d = Math.hypot(nx, nz);
    if (d > N.HALF) { nx *= N.HALF / d; nz *= N.HALF / d; }
    o.x = nx; o.z = nz;
  }

  /* ══════════ PAS DE SIMULATION ══════════ */
  N.step = function (G, dt) {
    if (G.over) return;
    dt = Math.min(dt, 0.05);
    var camp = G.camp, p = G.p, W2 = G.W;
    G.time = (G.time + dt / 360) % 1; /* journée = 6 min */
    camp.time = G.time;
    var night = G.time > 0.75 || G.time < 0.25;

    /* régén */
    camp.hp = Math.min(camp.hpMax, camp.hp + dt * 0.8);
    camp.mana = Math.min(camp.manaMax, camp.mana + dt * 1.6);
    if (p.st < 100) p.st = Math.min(100, p.st + dt * 11);
    p.hurt = Math.max(0, p.hurt - dt);
    p.cd = Math.max(0, p.cd - dt);
    p.spellCd = Math.max(0, p.spellCd - dt);

    /* PNJ : agenda simple (maison <--> travail) */
    W2.npcs.forEach(function (q, i) {
      var home = night;
      var tgt = home ? q.home : q.work;
      var dx = tgt.x - q.x, dz = tgt.z - q.z, d = Math.hypot(dx, dz);
      if (d > 0.4) { q.x += dx / d * 2.4 * dt; q.z += dz / d * 2.4 * dt; q.walk = true; } else q.walk = false;
      q.home2 = home;
    });

    /* entités */
    for (var i = 0; i < G.ents.length; i++) {
      var e = G.ents[i];
      if (e.hp <= 0) { e.resp = (e.resp || 0) - dt; if (e.resp <= 0 && e.type !== 'bandit' && e.type !== 'revenant' && e.type !== 'troll') respawn(G, e); continue; }
      var B = N.BEASTS[e.type];
      var pdx = p.x - e.x, pdz = p.z - e.z, pd = Math.hypot(pdx, pdz);
      e.cd = Math.max(0, e.cd - dt);
      if (B.dmg === 0) { /* cerf : fuit */
        if (pd < B.flee) {
          e.st = 'fuit';
          var f = Math.max(0.1, pd);
          move(G, e, (-pdx / f) * B.speed * dt, (-pdz / f) * B.speed * dt);
        } else {
          e.st = 'rôde';
          e.wt -= dt;
          if (e.wt <= 0) { e.wt = 2 + Math.random() * 4; e.tx = e.x + Math.random() * 24 - 12; e.tz = e.z + Math.random() * 24 - 12; }
          var wx = e.tx - e.x, wz = e.tz - e.z, wd = Math.hypot(wx, wz);
          if (wd > 1) move(G, e, wx / wd * B.speed * 0.3 * dt, wz / wd * B.speed * 0.3 * dt);
        }
      } else { /* prédateurs */
        var aggro = B.aggro * (night ? 1.5 : 1);
        var inRuin = e.ruin && !e.ruin.purged;
        if (pd < aggro || e.st === 'chasse') {
          e.st = 'chasse';
          if (pd > B.atkR * 0.8) move(G, e, pdx / pd * B.speed * dt, pdz / pd * B.speed * dt);
          if (pd < B.atkR && e.cd <= 0) {
            e.cd = B.cd;
            var real = B.dmg * (1 - N.playerDef(camp));
            camp.hp -= real;
            p.hurt = 0.6;
            fx(G, 'bite', p.x, p.z);
            msg(G, B.n + ' vous frappe (−' + Math.round(real) + ' PV).');
            if (camp.hp <= 0) { camp.hp = 0; G.over = 'ko'; msg(G, 'Le noir vous prend. On vous ramène au village…'); }
          }
        } else {
          e.st = 'rôde';
          e.wt -= dt;
          if (e.wt <= 0) {
            e.wt = 2 + Math.random() * 4;
            if (inRuin) { e.tx = e.ruin.x + Math.random() * 18 - 9; e.tz = e.ruin.z + Math.random() * 18 - 9; }
            else { e.tx = e.x + Math.random() * 30 - 15; e.tz = e.z + Math.random() * 30 - 15; }
          }
          var wx2 = e.tx - e.x, wz2 = e.tz - e.z, wd2 = Math.hypot(wx2, wz2);
          if (wd2 > 1) move(G, e, wx2 / wd2 * B.speed * 0.35 * dt, wz2 / wd2 * B.speed * 0.35 * dt);
        }
      }
    }

    /* le troll se réveille quand 5 ruines sont purgées */
    if (camp.purged >= 5 && !camp.trollDown && !G.trollUp) {
      G.trollUp = true;
      var tr = W2.ruins[5];
      spawnEnt(G, 'troll', tr.x, tr.z - 4, tr);
      msg(G, 'La terre tremble — le Troll des Glaces est réveillé dans la Tanière.');
    }
  };

  function respawn(G, e) {
    var B = N.BEASTS[e.type];
    var rng = G.W.rng;
    var a = rng() * Math.PI * 2, d = 120 + rng() * 280;
    e.x = Math.cos(a) * d; e.z = Math.sin(a) * d * 0.9;
    e.hp = B.hp; e.st = 'rôde'; e.resp = null;
  }

  /* ══════════ COMMANDES ══════════ */
  N.cmdMove = function (G, fwd, strafe, dt, sprint) {
    if (G.over) return;
    var p = G.p, camp = G.camp;
    var spd = 7.2;
    if (sprint && p.st > 1 && (fwd || strafe)) { spd = 12; p.st = Math.max(0, p.st - dt * 18); }
    var sin = Math.sin(p.a), cos = Math.cos(p.a);
    /* p.a : direction de regard ; avancer = -Z quand a=0 (repère Three) */
    var dx = (sin * -fwd + cos * strafe) * spd * dt;
    var dz = (cos * -fwd - sin * strafe) * spd * dt;
    if (fwd || strafe) move(G, p, dx, dz);
  };
  N.cmdTurn = function (G, da) { if (!G.over) G.p.a += da; };

  N.cmdAttack = function (G) {
    if (G.over || G.p.cd > 0) return null;
    var camp = G.camp, p = G.p;
    G.p.cd = (N.WPN[camp.wpn] || N.WPN.mains).rate;
    var dmg = N.playerDmg(camp);
    var sin = Math.sin(p.a), cos = Math.cos(p.a);
    var best = null, bestD = 3.1;
    for (var i = 0; i < G.ents.length; i++) {
      var e = G.ents[i];
      if (e.hp <= 0) continue;
      var dx = e.x - p.x, dz = e.z - p.z;
      var t2 = dx * -sin + dz * -cos; /* distance devant */
      if (t2 < 0.4 || t2 > bestD) continue;
      var perp = Math.abs(dx * -cos - dz * -sin);
      if (perp > 1.7) continue;
      if (t2 < bestD) { bestD = t2; best = e; }
    }
    if (!best) { fx(G, 'whoosh', p.x, p.z); return null; }
    var B = N.BEASTS[best.type];
    best.hp -= dmg;
    fx(G, 'hit', best.x, best.z);
    if (B.dmg === 0) best.st = 'fuit';
    else best.st = 'chasse';
    if (best.hp <= 0) killEnt(G, best);
    return best;
  };

  function killEnt(G, e) {
    var camp = G.camp, B = N.BEASTS[e.type];
    e.hp = 0;
    e.st = 'mort';
    G.stats.kills++;
    camp.kills[e.type] = (camp.kills[e.type] || 0) + 1;
    gainXp(G, B.xp);
    var parts = [];
    for (var k in B.drops) {
      var rng = Math.random();
      var lo = B.drops[k][0], hi = B.drops[k][1];
      var q2 = lo + Math.floor(Math.random() * (hi - lo + 1));
      if (k === 'or') { camp.or += q2; parts.push(q2 + ' pièces d\u2019or'); }
      else { camp.bag[k] = (camp.bag[k] || 0) + q2; parts.push(q2 + ' ' + k); }
    }
    msg(G, B.n + ' abattu' + (B.boss ? '(e)' : '') + ' — ' + (parts.join(', ') || 'rien') + '. +' + B.xp + ' XP.');
    if (e.type === 'troll') {
      camp.trollDown = true;
      camp.best.troll = 1;
      msg(G, 'LE TROLL S\u2019ÉCROULE. La vallée retiendra votre nom.');
    }
    if (e.ruin && !e.ruin.purged) {
      var left = 0;
      for (var i = 0; i < G.ents.length; i++) {
        var o = G.ents[i];
        if (o.ruin === e.ruin && o.hp > 0) left++;
      }
      if (left === 0) {
        e.ruin.purged = true;
        camp.purged++;
        camp.best.purged = Math.max(camp.best.purged, camp.purged);
        msg(G, e.ruin.n + ' : ruine purgée ! Le coffre peut être ouvert.');
      }
    }
  }
  N.killEnt = killEnt;

  function gainXp(G, x) {
    var camp = G.camp;
    camp.xp += x;
    while (camp.xp >= N.xpNext(camp.level)) {
      camp.xp -= N.xpNext(camp.level);
      camp.level++;
      camp.hpMax += 10;
      camp.hp = camp.hpMax;
      camp.manaMax += 5;
      camp.best.level = Math.max(camp.best.level, camp.level);
      msg(G, 'NIVEAU ' + camp.level + ' ! +10 PV max, +5 mana.');
    }
  }

  N.cmdSpell = function (G) {
    var camp = G.camp;
    if (G.over || G.p.spellCd > 0 || camp.mana < 15) return false;
    camp.mana -= 15;
    G.p.spellCd = 3;
    camp.hp = Math.min(camp.hpMax, camp.hp + 30 + camp.level * 4);
    fx(G, 'soin', G.p.x, G.p.z);
    msg(G, 'La chaleur des anciens vous recoud (+PV).');
    return true;
  };

  N.cmdPotion = function (G, key) {
    var camp = G.camp;
    if (!(camp.potions[key] > 0)) return false;
    camp.potions[key]--;
    camp.hp = Math.min(camp.hpMax, camp.hp + (key === 'soin' ? 45 : 100));
    msg(G, (key === 'soin' ? 'Potion bue' : 'Grande potion bue') + ' (+PV).');
    return true;
  };

  /* coffres des ruines */
  N.cmdChest = function (G) {
    var camp = G.camp, p = G.p;
    for (var i = 0; i < G.W.ruins.length; i++) {
      var r = G.W.ruins[i];
      if (!r.purged || r.chestOpen) continue;
      if (Math.hypot(p.x - r.x, p.z - r.z) < r.r + 4) {
        r.chestOpen = true;
        var rng = r.i * 7 + 31, or2 = 40 + r.tier * 45;
        camp.or += or2;
        var extra = r.tier >= 2 ? ' essence ×1' : '';
        if (r.tier >= 2) camp.bag.essence = (camp.bag.essence || 0) + 1;
        G.stats.loot++;
        msg(G, 'Coffre ouvert : +' + or2 + ' or' + extra + '.');
        return { ok: true, or: or2 };
      }
    }
    return null;
  };

  /* respawn après KO */
  N.respawnPlayer = function (G) {
    var camp = G.camp;
    camp.hp = camp.hpMax * 0.6;
    camp.st = 100;
    G.p.x = 0; G.p.z = N.VILLAGE.y + 26; G.p.a = 0;
    G.over = '';
    msg(G, 'Vous vous réveillez près du feu. La vallée attend.');
  };

  /* ══════════ ÉCONOMIE & QUÊTES ══════════ */
  N.SELL = { viande: 5, fourrure: 12, croc: 8, essence: 30 };
  N.sellAll = function (camp, key, qty) {
    var have = camp.bag[key] || 0;
    var q2 = Math.min(have, qty || have);
    if (q2 <= 0) return 0;
    var price = N.SELL[key] || 1;
    camp.bag[key] -= q2;
    camp.or += q2 * price;
    N.saveCamp(camp);
    return q2 * price;
  };
  N.buy = function (camp, what) {
    var ok = false;
    if (what === 'fer' || what === 'guerre') { var w = N.WPN[what]; if (camp.or >= w.price) { camp.or -= w.price; camp.wpn = what; ok = true; } }
    else if (what === 'cuir' || what === 'ferarm') { var a = N.ARM[what === 'ferarm' ? 'fer' : what]; if (camp.or >= a.price) { camp.or -= a.price; camp.arm = (what === 'ferarm' ? 'fer' : what); ok = true; } }
    else if (what === 'soin' || what === 'grandsoin') {
      var p2 = what === 'soin' ? 45 : 110;
      if (what === 'grandsoin' && camp.quests.ruines2 !== 'faite') return false;
      if (camp.or >= p2) { camp.or -= p2; camp.potions[what] = (camp.potions[what] || 0) + 1; ok = true; }
    } else if (what === 'enchant') {
      if (camp.ench || camp.or < N.ENCHANT.price) return false;
      camp.or -= N.ENCHANT.price; camp.ench = true; ok = true;
    }
    if (ok) N.saveCamp(camp);
    return ok;
  };
  N.enchantCost = function () { return N.ENCHANT.price; };

  N.startQuest = function (camp, key) {
    for (var k in camp.quests) if (camp.quests[k] === 'active' && k !== key) return false;
    if (camp.quests[key] !== 'libre') return false;
    var q = N.QUESTS.filter(function (x) { return x.key === key; })[0];
    if (q.need && camp.quests[q.need] !== 'faite') return false;
    camp.quests[key] = 'active';
    N.saveCamp(camp);
    return true;
  };
  N.activeQuest = function (camp) {
    for (var k in camp.quests) if (camp.quests[k] === 'active') return k;
    return null;
  };
  N.turnIn = function (camp) {
    var key = N.activeQuest(camp);
    if (!key) return null;
    var q = N.QUESTS.filter(function (x) { return x.key === key; })[0];
    if (!q.cond(camp)) return { err: 'cond', note: q.prog(camp) };
    if (q.consume) for (var k in q.consume) {
      if ((camp.bag[k] || 0) < q.consume[k]) return { err: 'cond', note: 'il manque des ressources' };
    }
    if (q.consume) for (var k2 in q.consume) camp.bag[k2] -= q.consume[k2];
    camp.or += q.rw.or;
    if (q.rw.wpn) camp.wpn = q.rw.wpn;
    if (q.rw.arm) camp.arm = q.rw.arm;
    camp.quests[key] = 'faite';
    N.saveCamp(camp);
    return { ok: true, key: key, rw: q.rw };
  };

  /* le Yrsa soigne (gratuit au village, la nuit aussi) */
  N.yrsaHeal = function (G) {
    var camp = G.camp;
    if (camp.hp >= camp.hpMax) return false;
    camp.hp = camp.hpMax; camp.mana = camp.manaMax;
    msg(G, 'Yrsa murmure des mots anciens : vous êtes entier' + '.');
    return true;
  };

  root.NORDHEIM = N;
})(typeof window !== 'undefined' ? window : global);
