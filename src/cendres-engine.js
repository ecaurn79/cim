/* ═══════════════════════════════════════════════════════════════════
   CENDRES — moteur du roguelike du Hub C.I.M. (logique pure)
   Génération procédurale, FOV, IA à carte de Dijkstra, combat,
   potions non identifiées, parchemins, dieux, boss, mort définitive.
   Dépend de RPGCORE (kernel). Tourne en Node (tests) et navigateur.
   ═══════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./kernel/rpg-core.js'));
  else root.CENDRES = factory(root.RPGCORE);
})(typeof self !== 'undefined' ? self : this, function (K) {
  'use strict';
  var LS = (function () { try { return (typeof localStorage !== 'undefined') ? localStorage : null; } catch (e) { return null; } })();
  var W = 46, H = 26, MAX_DEPTH = 8;

  /* ── Monstres ── */
  var MOB = {
    rat:       { n: 'rat géant',           g: 'r', hp: 5,  dice: [1, 3], def: 0, spd: 1.0, sight: 7, xp: 4,  tier: 1 },
    bat:       { n: 'chauve-souris',       g: 'b', hp: 4,  dice: [1, 2], def: 0, spd: 1.5, sight: 8, xp: 4,  tier: 1, erratic: .5 },
    gob:       { n: 'gobelin',             g: 'g', hp: 7,  dice: [1, 4], def: 0, spd: 1.0, sight: 8, xp: 6,  tier: 1 },
    chien:     { n: 'chien errant',        g: 'c', hp: 8,  dice: [1, 4], def: 0, spd: 1.4, sight: 9, xp: 7,  tier: 1 },
    araignee:  { n: 'araignée venimeuse',  g: 'a', hp: 6,  dice: [1, 3], def: 0, spd: 1.1, sight: 7, xp: 8,  tier: 1, poison: 3 },
    squelette: { n: 'squelette',           g: 's', hp: 12, dice: [1, 5], def: 1, spd: 1.0, sight: 8, xp: 12, tier: 2 },
    zombie:    { n: 'zombie',              g: 'z', hp: 16, dice: [1, 6], def: 1, spd: 0.7, sight: 6, xp: 13, tier: 2 },
    hobgob:    { n: 'hobgobelin',          g: 'G', hp: 12, dice: [1, 6], def: 1, spd: 1.0, sight: 9, xp: 14, tier: 2 },
    loup:      { n: 'loup des cendres',    g: 'l', hp: 12, dice: [1, 5], def: 0, spd: 1.5, sight: 10, xp: 15, tier: 2 },
    orc:       { n: 'orc',                 g: 'O', hp: 16, dice: [1, 7], def: 2, spd: 1.0, sight: 8, xp: 18, tier: 2 },
    chaman:    { n: 'chaman orc',          g: 'C', hp: 14, dice: [1, 4], def: 1, spd: 1.0, sight: 10, xp: 22, tier: 3, ranged: 5 },
    golemb:    { n: 'golem de boue',       g: 'M', hp: 24, dice: [1, 7], def: 2, spd: 0.6, sight: 6, xp: 24, tier: 3 },
    spectre:   { n: 'spectre',             g: 'S', hp: 14, dice: [1, 5], def: 0, spd: 1.0, sight: 9, xp: 26, tier: 3, phase: true },
    troll:     { n: 'troll',               g: 'T', hp: 30, dice: [1, 8], def: 2, spd: 1.0, sight: 8, xp: 32, tier: 3, regen: 1 },
    demon:     { n: 'démonnet',            g: 'D', hp: 26, dice: [1, 8], def: 2, spd: 1.3, sight: 9, xp: 40, tier: 4 },
    golemp:    { n: 'golem de pierre',     g: 'P', hp: 40, dice: [1, 9], def: 4, spd: 0.6, sight: 7, xp: 48, tier: 4 },
    minot:     { n: 'minotaure',           g: 'B', hp: 44, dice: [2, 6], def: 3, spd: 1.1, sight: 10, xp: 60, tier: 4 },
    dragon:    { n: 'dragonnet',           g: 'd', hp: 38, dice: [2, 6], def: 3, spd: 1.2, sight: 11, xp: 70, tier: 4, ranged: 6 },
    boss:      { n: 'Seigneur des Cendres',g: 'Ω', hp: 72, dice: [2, 8], def: 4, spd: 1.15, sight: 12, xp: 300, tier: 5, boss: true, ranged: 8 }
  };
  var POOLS = {
    1: ['rat', 'rat', 'bat', 'gob', 'chien', 'araignee'],
    2: ['gob', 'chien', 'araignee', 'squelette', 'zombie', 'hobgob', 'loup', 'orc'],
    3: ['squelette', 'zombie', 'hobgob', 'loup', 'orc', 'chaman', 'golemb', 'spectre'],
    4: ['orc', 'chaman', 'golemb', 'spectre', 'troll'],
    5: ['chaman', 'spectre', 'troll', 'demon', 'golemp'],
    6: ['troll', 'demon', 'golemp', 'minot'],
    7: ['demon', 'golemp', 'minot', 'dragon'],
    8: ['minot', 'dragon', 'boss']
  };

  /* ── Identités des potions/parchemins (mélangées par partie) ── */
  var POTION_TYPES = [
    { k: 'heal',    n: 'de soin',            w: 3 },
    { k: 'heal2',   n: 'de soin majeur',     w: 2, minDepth: 3 },
    { k: 'str',     n: 'de force',           w: 2 },
    { k: 'haste',   n: 'de célérité',        w: 2 },
    { k: 'prot',    n: 'de peau de pierre',  w: 2 },
    { k: 'mana',    n: 'de brume arcane',    w: 2 },
    { k: 'vision',  n: 'de clairvoyance',    w: 1 },
    { k: 'poison',  n: 'de venin (mauvaise)',w: 2 },
    { k: 'confuse', n: 'de brume grise (piège)', w: 1 }
  ];
  var POTION_COLORS = ['rouge', 'bleue', 'vert sombre', 'laiteuse', 'ambre', 'violette', 'noire', 'rosée', 'grise'];
  var SCROLL_TYPES = [
    { k: 'identify', n: 'd\u2019identification', w: 3 },
    { k: 'teleport', n: 'de téléportation', w: 2 },
    { k: 'terror',   n: 'de terreur', w: 2 },
    { k: 'enchant',  n: 'd\u2019enchantement', w: 2 },
    { k: 'fire',     n: 'de fournaise', w: 2 }
  ];
  var SCROLL_TITLES = ['XOM ZAR', 'ELRU VETH', 'OKK NUR', 'SAETH IL', 'MOR AGH', 'VEX ULL', 'THA ROS', 'IM HUR'];

  /* ── Classes ── */
  var CLASSES = {
    guerrier:   { n: 'Guerrier',    hp: 34, mana: 4,  str: 3, def0: 1, start: ['weapon:epee', 'armor:cotte', 'food:ration', 'potion:heal'],
                  skills: [{ k: 'power', n: 'Coup puissant', cd: 8, desc: 'prochain coup ×2' }] },
    occultiste: { n: 'Occultiste',  hp: 22, mana: 14, str: 1, def0: 0, start: ['weapon:baton', 'armor:robe', 'potion:mana', 'potion:heal'],
                  skills: [{ k: 'bolt', n: 'Éclair', cd: 0, mana: 3, desc: '3d4 à distance' }, { k: 'heal', n: 'Soin', cd: 5, mana: 4, desc: '+9 PV' }] },
    chasseresse:{ n: 'Chasseresse', hp: 26, mana: 6,  str: 2, def0: 0, start: ['weapon:arc', 'weapon:dague', 'armor:cuir', 'food:ration'],
                  skills: [{ k: 'aim', n: 'Tir précis', cd: 6, desc: 'prochain tir ×2' }] },
    pelerin:    { n: 'Pèlerin',     hp: 26, mana: 8,  str: 2, def0: 1, start: ['weapon:massue', 'armor:robe', 'amulet:cendre', 'potion:heal'],
                  skills: [{ k: 'pray', n: 'Prière', cd: 18, desc: '+7 PV, purge le venin' }], pietyBonus: 0.25 }
  };
  var START_ITEMS = {
    epee:    function () { return K.rollItem(makeRng('start-epee'), 1, { kind: 'weapon', force: 'épée courte' }); },
    baton:   function () { return K.rollItem(makeRng('start-baton'), 1, { kind: 'weapon', force: 'dague' }); },
    arc:     function () { return mkBow('arc de chasse', [1, 5], 7); },
    dague:   function () { return K.rollItem(makeRng('start-dague'), 1, { kind: 'weapon', force: 'dague' }); },
    massue:  function () { return K.rollItem(makeRng('start-massue'), 1, { kind: 'weapon', force: 'hache de guerre' }); },
    cotte:   function () { return K.rollItem(makeRng('start-cotte'), 1, { kind: 'armor', force: 'cotte de cuir' }); },
    cuir:    function () { return K.rollItem(makeRng('start-cuir'), 1, { kind: 'armor', force: 'cuir bouilli' }); },
    robe:    function () { return K.rollItem(makeRng('start-robe'), 1, { kind: 'armor', force: 'robe' }); },
    cendre:  function () { return K.rollItem(makeRng('start-am'), 1, { kind: 'amulet', force: 'amulette de cendre' }); }
  };
  function mkBow(base, dice, range) {
    var it = { id: K.hashSeed(base) % 100000, kind: 'weapon', base: base, rarity: 0, rarityKey: 'commun', affixes: [], dice: dice.slice(), crit: 8, val: 30, ranged: range, name: base };
    return it;
  }
  function makeRng(seed) { return K.makeRng(seed); }

  /* ── Génération de niveau ── */
  function genLevel(depth, seedStr) {
    var rng = makeRng(seedStr + ':' + depth);
    var map = [], i;
    for (i = 0; i < W * H; i++) map.push('#');
    var rooms = [];
    for (i = 0; i < 80 && rooms.length < 6 + Math.min(5, depth); i++) {
      var rw = 4 + Math.floor(rng() * 6), rh = 3 + Math.floor(rng() * 4);
      var rx = 1 + Math.floor(rng() * (W - rw - 2)), ry = 1 + Math.floor(rng() * (H - rh - 2));
      var ok = true;
      for (var j = 0; j < rooms.length; j++) {
        var r = rooms[j];
        if (rx < r.x + r.w + 1 && rx + rw + 1 > r.x && ry < r.y + r.h + 1 && ry + rh + 1 > r.y) { ok = false; break; }
      }
      if (!ok) continue;
      rooms.push({ x: rx, y: ry, w: rw, h: rh });
      for (var y = ry; y < ry + rh; y++) for (var x = rx; x < rx + rw; x++) map[y * W + x] = '.';
    }
    for (i = 1; i < rooms.length; i++) { /* couloirs en L */
      var a = rooms[i - 1], b = rooms[i];
      var ax = a.x + (a.w >> 1), ay = a.y + (a.h >> 1), bx = b.x + (b.w >> 1), by = b.y + (b.h >> 1);
      var x = ax, y = ay;
      while (x !== bx) { map[y * W + x] = '.'; x += bx > x ? 1 : -1; }
      while (y !== by) { map[y * W + x] = '.'; y += by > y ? 1 : -1; }
      map[y * W + x] = '.';
    }
    var lv = {
      depth: depth, map: map, rooms: rooms,
      items: [], monsters: [], altars: [],
      explored: map.map(function (c) { return false; }),
      visible: map.map(function (c) { return false; }),
      stairs: null
    };
    /* escalier : salle la plus éloignée du départ */
    var first = rooms[0], last = rooms[rooms.length - 1];
    lv.entry = { x: first.x + (first.w >> 1), y: first.y + (first.h >> 1) };
    lv.stairs = { x: last.x + (last.w >> 1), y: last.y + (last.h >> 1) };
    map[lv.stairs.y * W + lv.stairs.x] = '>';
    /* autel */
    if (depth >= 2 && rooms.length > 3 && rng() < 0.5) {
      var ar = rooms[1 + Math.floor(rng() * (rooms.length - 1))];
      var axx = ar.x + 1 + Math.floor(rng() * (ar.w - 2)), ayy = ar.y + 1 + Math.floor(rng() * (ar.h - 2));
      if (map[ayy * W + axx] === '.') { map[ayy * W + axx] = '_'; lv.altars.push({ x: axx, y: ayy, used: false }); }
    }
    /* monstres */
    var pool = POOLS[Math.min(MAX_DEPTH, depth)];
    var n = 5 + Math.min(7, depth);
    for (i = 0; i < n; i++) {
      var p = randFloor(lv, rng);
      if (!p) break;
      if (dist(p.x, p.y, lv.entry.x, lv.entry.y) < 6) { i--; continue; }
      var key = K.pick(rng, pool);
      spawnMonster(lv, key, p.x, p.y, rng);
    }
    /* objets au sol */
    var items = [];
    var nItems = 3 + Math.floor(rng() * 3);
    for (i = 0; i < nItems; i++) {
      var f = randFloor(lv, rng);
      if (!f) break;
      items.push({ x: f.x, y: f.y, it: rollLoot(rng, depth) });
    }
    /* or */
    for (i = 0; i < 2 + Math.floor(rng() * 3); i++) {
      var g = randFloor(lv, rng);
      if (g) items.push({ x: g.x, y: g.y, gold: 5 + Math.floor(rng() * (8 + depth * 6)) });
    }
    /* nourriture (pression de faim) */
    for (i = 0; i < (rng() < 0.8 ? 1 : 2); i++) {
      var fd = randFloor(lv, rng);
      if (fd) items.push({ x: fd.x, y: fd.y, it: mkFood(rng) });
    }
    lv.items = items;
    return lv;
  }
  function spawnMonster(lv, key, x, y, rng) {
    var d = MOB[key];
    lv.monsters.push({
      key: key, d: d, x: x, y: y,
      hp: d.hp + Math.floor(rng() * 4), maxhp: d.hp,
      asleep: true, flee: 0, cd: 0, energy: 0
    });
  }
  function randFloor(lv, rng) {
    for (var t = 0; t < 60; t++) {
      var x = 1 + Math.floor(rng() * (W - 2)), y = 1 + Math.floor(rng() * (H - 2));
      if (lv.map[y * W + x] === '.') return { x: x, y: y };
    }
    return null;
  }
  function rollLoot(rng, depth) {
    var r = rng();
    if (r < 0.42) return K.rollItem(rng, depth);
    if (r < 0.72) return mkPotion(rng, depth);
    if (r < 0.92) return mkScroll(rng);
    return mkFood(rng);
  }
  function mkPotion(rng, depth) {
    var pool = POTION_TYPES.filter(function (p) { return !(p.minDepth > depth); });
    var tot = 0; pool.forEach(function (p) { tot += p.w; });
    var r = rng() * tot, t = pool[0];
    for (var i = 0; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) { t = pool[i]; break; } }
    return { kind: 'potion', effect: t.k, val: 12, name: '' }; /* nom complété par l'UI selon l'identification */
  }
  function mkScroll(rng) {
    var t = K.pick(rng, SCROLL_TYPES);
    return { kind: 'scroll', effect: t.k, val: 18, name: '' };
  }
  function mkFood(rng) {
    var ration = rng() < 0.6;
    return { kind: 'food', nutrition: ration ? 40 : 22, base: ration ? 'ration de route' : 'viande séchée', val: ration ? 6 : 4, name: ration ? 'ration de route' : 'viande séchée' };
  }

  /* ── Utilitaires carte ── */
  function idx(x, y) { return y * W + x; }
  function inB(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }
  function walkable(lv, x, y) { return inB(x, y) && lv.map[idx(x, y)] !== '#'; }
  function dist(x0, y0, x1, y1) { return Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); }
  function hasLOS(lv, x0, y0, x1, y1) { /* Bresenham : les murs bloquent */
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy;
    while (!(x0 === x1 && y0 === y1)) {
      var e2 = err * 2;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
      if (x0 === x1 && y0 === y1) break;
      if (lv.map[idx(x0, y0)] === '#') return false;
    }
    return true;
  }
  function computeFOV(lv, px, py, radius) {
    lv.visible = lv.visible.map(function () { return false; });
    lv.visible[idx(px, py)] = true; lv.explored[idx(px, py)] = true;
    var RAYS = 140;
    for (var r = 0; r < RAYS; r++) {
      var a = (r / RAYS) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
      var x = px, y = py;
      for (var s = 0; s < radius; s++) {
        x += dx; y += dy;
        var xi = Math.round(x), yi = Math.round(y);
        if (!inB(xi, yi)) break;
        lv.visible[idx(xi, yi)] = true; lv.explored[idx(xi, yi)] = true;
        if (lv.map[idx(xi, yi)] === '#') break;
      }
    }
  }
  function distMap(lv, px, py) { /* BFS depuis le joueur : guide l'IA */
    var d = [], i;
    for (i = 0; i < W * H; i++) d.push(-1);
    var q = [idx(px, py)];
    d[idx(px, py)] = 0;
    var head = 0;
    while (head < q.length) {
      var c = q[head++], cx = c % W, cy = (c / W) | 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) {
        var nx = cx + v[0], ny = cy + v[1];
        if (walkable(lv, nx, ny) && d[idx(nx, ny)] < 0) { d[idx(nx, ny)] = d[c] + 1; q.push(idx(nx, ny)); }
      });
    }
    return d;
  }

  /* ── Partie ── */
  function newGame(clsKey, seed) {
    seed = seed || String(Date.now());
    var rng = makeRng(seed + ':run');
    var cls = CLASSES[clsKey];
    /* identités mélangées */
    var colors = POTION_COLORS.slice(), titles = SCROLL_TITLES.slice(), i;
    for (i = colors.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var tmp = colors[i]; colors[i] = colors[j]; colors[j] = tmp; }
    for (i = titles.length - 1; i > 0; i--) { var j2 = Math.floor(rng() * (i + 1)); var tmp2 = titles[i]; titles[i] = titles[j2]; titles[j2] = tmp2; }
    var identities = { potion: {}, scroll: {} };
    POTION_TYPES.forEach(function (p, k) { identities.potion[p.k] = colors[k % colors.length]; });
    SCROLL_TYPES.forEach(function (s, k) { identities.scroll[s.k] = titles[k % titles.length]; });

    var inv = K.makeInventory(18);
    var p = {
      cls: clsKey, clsData: cls, seed: seed,
      x: 0, y: 0, depth: 1, turns: 0,
      hp: cls.hp, maxhp: cls.hp, mana: cls.mana, maxmana: cls.mana,
      str: cls.str, lvl: 1, xp: 0, gold: 0,
      hunger: 100, piety: cls.pietyBonus ? 10 : 0, godFavor: 0,
      poison: 0, buffs: {}, cds: {}, aimPower: 0, powerStrike: 0,
      known: { potion: {}, scroll: {} },
      inv: inv, kills: 0, score: 0, alive: true, won: false, msgs: []
    };
    cls.start.forEach(function (s) {
      var kv = s.split(':');
      var it = null;
      if (kv[0] === 'weapon') it = START_ITEMS[kv[1]]();
      else if (kv[0] === 'armor') it = START_ITEMS[kv[1]]();
      else if (kv[0] === 'amulet') it = START_ITEMS[kv[1]]();
      else if (kv[0] === 'food') it = mkFood(rng);
      else if (kv[0] === 'potion') it = mkPotion(makeRng('start-p'), 1);
      if (it) { K.invAdd(inv, it); }
    });
    /* équipe le premier weapon/armor */
    ['weapon', 'armor'].forEach(function (kind) {
      var it = inv.items.filter(function (o) { return o.kind === kind; })[0];
      if (it) K.invEquip(inv, it);
    });
    var lv = genLevel(1, seed);
    p.x = lv.entry.x; p.y = lv.entry.y;
    computeFOV(lv, p.x, p.y, fovRadius(p));
    var G = {
      p: p, lv: lv, identities: identities, rng: rng,
      over: false, won: false, bossKilled: false,
      best: null
    };
    msg(G, 'Vous entrez dans les Cendres. Profondeur 1.');
    msg(G, 'ZQSD/flèches : bouger · I : sac · C : fiche · H : aide.');
    return G;
  }
  function fovRadius(p) { return 8; }

  function msg(G, t) {
    G.p.msgs.push({ t: t, turn: G.p.turns });
    if (G.p.msgs.length > 60) G.p.msgs.shift();
  }

  /* ── Stats effectives ── */
  function effStats(G) {
    var p = G.p, es = K.equipStats(p.inv);
    var str = p.str + (p.buffs.str ? p.buffs.str.v : 0);
    var prot = p.clsData.def0 + es.def + (p.buffs.prot ? p.buffs.prot.v : 0);
    var wpn = p.inv.eq.weapon;
    var ranged = wpn && wpn.ranged;
    return {
      str: str, prot: prot, es: es, ranged: ranged,
      crit: 5 + es.crit + (wpn ? wpn.crit || 0 : 0),
      maxhp: p.maxhp + es.hp,
      maxmana: p.maxmana + es.mana,
      piety: es.piety
    };
  }

  /* ── Tour du joueur ── */
  function act(G, a) {
    if (G.over || !G.p.alive) return { ok: false };
    var p = G.p, lv = G.lv, consumed = false, res = { ok: true };
    switch (a.t) {
      case 'move': consumed = doMove(G, a.dx, a.dy); break;
      case 'wait': consumed = true; break;
      case 'pickup': consumed = doPickup(G); break;
      case 'quaff': consumed = doQuaff(G, a.idx); break;
      case 'read': consumed = doRead(G, a.idx); break;
      case 'eat': consumed = doEat(G, a.idx); break;
      case 'equip': consumed = doEquip(G, a.idx); break;
      case 'drop': consumed = doDrop(G, a.idx); break;
      case 'unequip': consumed = K.invUnequip(p.inv, a.slot) ? (msg(G, 'Rangé dans le sac.'), true) : (msg(G, 'Sac plein !'), false); break;
      case 'descend': consumed = doDescend(G); break;
      case 'pray': consumed = doPray(G, a.altar, a.choice); break;
      case 'skill': consumed = doSkill(G, a.k); break;
      case 'shoot': consumed = doShoot(G, a.tx, a.ty); break;
      case 'throwless': break;
      default: return { ok: false };
    }
    if (consumed) {
      monstersTurn(G);
      worldTick(G);
      computeFOV(lv, p.x, p.y, fovRadius(p));
    }
    res.consumed = consumed;
    if (!p.alive) die(G, a.deathCause || '');
    return res;
  }
  function monsterAt(lv, x, y) {
    for (var i = 0; i < lv.monsters.length; i++) {
      var m = lv.monsters[i];
      if (!m.dead && m.x === x && m.y === y) return m;
    }
    return null;
  }
  function doMove(G, dx, dy) {
    var p = G.p, lv = G.lv, nx = p.x + dx, ny = p.y + dy;
    if (!inB(nx, ny)) return false;
    var m = monsterAt(lv, nx, ny);
    if (m) { attackMonster(G, m); return true; }
    if (!walkable(lv, nx, ny)) {
      var c = lv.map[idx(nx, ny)];
      if (c === '>') { msg(G, 'Un escalier plonge vers les profondeurs (Entrée : Descendre).'); return false; }
      if (c === '_') { msg(G, 'Un autel oublié. (Prier pour l\u2019utiliser.)'); return false; }
      return false;
    }
    p.x = nx; p.y = ny;
    /* ramassage automatique or */
    for (var i = lv.items.length - 1; i >= 0; i--) {
      var f = lv.items[i];
      if (f.x === nx && f.y === ny && f.gold) {
        p.gold += f.gold; p.score += f.gold;
        msg(G, '+' + f.gold + ' pièces d\u2019or.');
        lv.items.splice(i, 1);
        updateHUD(G);
      } else if (f.x === nx && f.y === ny && f.it && f.it.kind === 'food' && false) { /* manger via sac */ }
    }
    return true;
  }
  function doPickup(G) {
    var p = G.p, lv = G.lv;
    for (var i = lv.items.length - 1; i >= 0; i--) {
      var f = lv.items[i];
      if (f.x === p.x && f.y === p.y) {
        if (f.gold) { p.gold += f.gold; p.score += f.gold; lv.items.splice(i, 1); msg(G, '+' + f.gold + ' or.'); updateHUD(G); return true; }
        if (K.invAdd(p.inv, f.it)) {
          msg(G, 'Récupéré : ' + itemLabel(G, f.it) + '.');
          lv.items.splice(i, 1);
          return true;
        }
        msg(G, 'Sac plein !');
        return false;
      }
    }
    msg(G, 'Rien à ramasser ici.');
    return false;
  }
  function itemLabel(G, it) {
    if (it.kind === 'potion') {
      var known = G.p.known.potion[it.effect];
      return (known ? 'Potion ' + G.identities.potion[it.effect] + ' (' + POTION_TYPES.filter(function (t) { return t.k === it.effect; })[0].n + ')' : 'Potion ' + G.identities.potion[it.effect] + ' ?');
    }
    if (it.kind === 'scroll') {
      var k2 = G.p.known.scroll[it.effect];
      return k2 ? 'Parchemin ' + G.identities.scroll[it.effect] + ' (' + SCROLL_TYPES.filter(function (t) { return t.k === it.effect; })[0].n + ')' : 'Parchemin « ' + G.identities.scroll[it.effect] + ' » ?';
    }
    var rar = K.RARITY[it.rarity || 0];
    return it.name + (it.rarity > 0 ? ' [' + rar.label + ']' : '');
  }
  function doQuaff(G, idx2) {
    var p = G.p, it = p.inv.items[idx2];
    if (!it || it.kind !== 'potion') return false;
    K.invRemove(p.inv, it);
    var wasKnown = !!p.known.potion[it.effect];
    var label = 'Potion ' + G.identities.potion[it.effect];
    p.known.potion[it.effect] = true;
    applyPotion(G, it.effect);
    if (!wasKnown) msg(G, label + ' : c\u2019était une potion ' + POTION_TYPES.filter(function (t) { return t.k === it.effect; })[0].n + ' !');
    return true;
  }
  function applyPotion(G, k) {
    var p = G.p, st = effStats(G);
    switch (k) {
      case 'heal': heal(G, 14); break;
      case 'heal2': heal(G, 30); break;
      case 'str': p.buffs.str = { v: 3, t: 30 }; msg(G, 'Vos muscles brûlent de force ! (+3 FOR, 30 tours)'); break;
      case 'haste': p.buffs.haste = { v: 1, t: 20 }; msg(G, 'Le monde ralentit autour de vous ! (20 tours)'); break;
      case 'prot': p.buffs.prot = { v: 3, t: 30 }; msg(G, 'Votre peau durcit. (+3 défense, 30 tours)'); break;
      case 'mana': p.mana = st.maxmana; msg(G, 'Votre réserve d\u2019arcane déborde.'); break;
      case 'vision':
        for (var i = 0; i < G.lv.map.length; i++) G.lv.explored[i] = true;
        msg(G, 'La carte se grave dans votre esprit !'); break;
      case 'poison': p.poison += 6; msg(G, 'Horrible ! Le venin brûle vos veines.'); break;
      case 'confuse': p.buffs.confused = { v: 1, t: 8 }; msg(G, 'La pièce tourne… vos pas vacillent.'); break;
    }
    updateHUD(G);
  }
  function heal(G, n) {
    var p = G.p, st = effStats(G);
    var before = p.hp;
    p.hp = Math.min(st.maxhp, p.hp + n);
    p.poison = 0;
    msg(G, '+' + (p.hp - before) + ' PV.');
  }
  function doRead(G, idx2) {
    var p = G.p, it = p.inv.items[idx2];
    if (!it || it.kind !== 'scroll') return false;
    K.invRemove(p.inv, it);
    var wasKnown = !!p.known.scroll[it.effect];
    p.known.scroll[it.effect] = true;
    var lv = G.lv;
    switch (it.effect) {
      case 'identify':
        POTION_TYPES.forEach(function (t) { p.known.potion[t.k] = true; });
        SCROLL_TYPES.forEach(function (t) { p.known.scroll[t.k] = true; });
        msg(G, 'Toutes les essences vous sont désormais familières !'); break;
      case 'teleport':
        var f = randFloor(lv, G.rng);
        if (f) { p.x = f.x; p.y = f.y; msg(G, 'L\u2019espace se plie : vous êtes ailleurs.'); } break;
      case 'terror':
        var n = 0;
        lv.monsters.forEach(function (m) {
          if (!m.dead && lv.visible[idx(m.x, m.y)]) { m.flee = 10; n++; }
        });
        msg(G, n ? 'Une terreur sacrée saisit ' + n + ' créature(s) !' : 'Le cri ne résonne dans le vide…'); break;
      case 'enchant':
        var w = p.inv.eq.weapon;
        if (w && w.dice) { w.affixes.push({ k: 'atk', v: 2, name: 'enchantée' }); w.name = K.itemFullName(w); msg(G, 'Votre arme luit : +2 aux dégâts !'); }
        else if (p.inv.eq.armor) { p.inv.eq.armor.def += 1; msg(G, 'Votre armure se renforce : +1 défense !'); }
        else msg(G, 'L\u2019encre se dissipe sans cible…'); break;
      case 'fire':
        var hit = 0;
        lv.monsters.forEach(function (m) {
          if (!m.dead && lv.visible[idx(m.x, m.y)]) {
            var dmg = K.dice(G.rng, 2, 6);
            damageMonster(G, m, dmg, false);
            hit++;
          }
        });
        msg(G, 'Une fournaise traverse la salle ! ' + hit + ' créature(s) embrasée(s).'); break;
    }
    if (!wasKnown && it.effect === 'identify') { /* déjà annoncé */ }
    return true;
  }
  function doEat(G, idx2) {
    var p = G.p, it = p.inv.items[idx2];
    if (!it || it.kind !== 'food') return false;
    K.invRemove(p.inv, it);
    p.hunger = Math.min(100, p.hunger + it.nutrition);
    msg(G, 'Vous mangez : ' + it.base + '.');
    return true;
  }
  function doEquip(G, idx2) {
    var p = G.p, it = p.inv.items[idx2];
    if (!it) return false;
    if (['armor', 'helm', 'shield', 'amulet'].indexOf(it.kind) < 0 && it.kind !== 'weapon' && it.kind !== 'ring') return false;
    if (K.invEquip(p.inv, it)) {
      msg(G, 'Équipé : ' + itemLabel(G, it) + '.');
      updateHUD(G);
      return true;
    }
    return false;
  }
  function doDrop(G, idx2) {
    var p = G.p, it = p.inv.items[idx2];
    if (!it) return false;
    K.invRemove(p.inv, it);
    G.lv.items.push({ x: p.x, y: p.y, it: it });
    msg(G, 'Posé : ' + it.name + '.');
    return true;
  }
  function doDescend(G) {
    var p = G.p, lv = G.lv;
    if (lv.map[idx(p.x, p.y)] !== '>') { msg(G, 'Pas d\u2019escalier ici.'); return false; }
    if (p.depth >= MAX_DEPTH && G.bossKilled) return false;
    p.depth++;
    if (p.depth > MAX_DEPTH) { win(G); return true; }
    G.lv = genLevel(p.depth, p.seed);
    p.x = G.lv.entry.x; p.y = G.lv.entry.y;
    p.score += 40 * p.depth;
    computeFOV(G.lv, p.x, p.y, fovRadius(p));
    msg(G, '— Profondeur ' + p.depth + ' —' + (p.depth === MAX_DEPTH ? ' Une présence terrible hante ce niveau…' : ''));
    autosave(G);
    return true;
  }
  function doPray(G, altarIdx, choice) {
    var lv = G.lv, al = lv.altars[altarIdx];
    if (!al) return false;
    var p = G.p;
    var dx = Math.abs(p.x - al.x) <= 1 && Math.abs(p.y - al.y) <= 1;
    if (!dx) { msg(G, 'Approchez-vous de l\u2019autel.'); return false; }
    var gods = ['La Cendre Éternelle', 'La Mère des Profondeurs', 'Le Veilleur aux Mille Yeux'];
    var st = effStats(G);
    if (choice === 0) { /* offrande */
      var cost = 10 * lv.depth;
      if (p.gold < cost) { msg(G, 'L\u2019offrande exige ' + cost + ' or.'); return false; }
      p.gold -= cost;
      p.piety += 8 + Math.round(st.piety * 0.5);
      var roll = G.rng();
      if (roll < 0.3) { heal(G, 20); msg(G, gods[Math.floor(G.rng() * 3)] + ' vous répare.'); }
      else if (roll < 0.55) { p.buffs.str = { v: 2, t: 40 }; msg(G, 'Une bénédiction de force vous traverse.'); }
      else if (roll < 0.8) { p.buffs.prot = { v: 2, t: 40 }; msg(G, 'Une carapace invisible vous couvre.'); }
      else { p.mana = st.maxmana; msg(G, 'L\u2019arcane afflue en vous.'); }
    } else { /* prière */
      if (al.used) { msg(G, 'L\u2019autel s\u2019est tu.'); return false; }
      al.used = true;
      p.piety += 4 + Math.round(st.piety * 0.3);
      if (p.piety >= 60 && G.rng() < 0.6) {
        var gift = K.rollItem(G.rng, lv.depth + 2, { boost: 30 });
        if (K.invAdd(p.inv, gift)) { msg(G, 'Les dieux offrent : ' + itemLabel(G, gift) + ' !'); }
        else { G.lv.items.push({ x: p.x, y: p.y, it: gift }); msg(G, 'Un cadeau divin tombe à vos pieds : ' + itemLabel(G, gift)); }
      } else {
        heal(G, 8);
        msg(G, 'Une chaleur bienveillante vous apaise.');
      }
    }
    updateHUD(G);
    return true;
  }
  function doSkill(G, k) {
    var p = G.p, st = effStats(G);
    var sk = null;
    p.clsData.skills.forEach(function (s) { if (s.k === k) sk = s; });
    if (!sk) return false;
    if ((p.cds[k] || 0) > 0) { msg(G, sk.n + ' pas prête (' + p.cds[k] + ' tours).'); return false; }
    if (sk.mana && p.mana < sk.mana) { msg(G, 'Pas assez de mana.'); return false; }
    switch (k) {
      case 'power':
        p.powerStrike = 1; p.cds.power = sk.cd;
        msg(G, 'Vous armez un coup dévastateur !'); return false; /* pas de tour consommé */
      case 'aim':
        p.aimPower = 1; p.cds.aim = sk.cd;
        msg(G, 'Visée parfaite préparée : prochain tir ×2.'); return false;
      case 'bolt': {
        var target = nearestVisibleMonster(G, 7);
        if (!target) { msg(G, 'Aucune cible en vue.'); return false; }
        p.mana -= sk.mana;
        var dmg = K.dice(G.rng, 3, 4);
        msg(G, 'Un éclair frappe ' + target.d.n + ' (' + dmg + ') !');
        damageMonster(G, target, dmg, false);
        p.cds.bolt = 0;
        return true;
      }
      case 'heal':
        p.mana -= sk.mana; heal(G, 9); p.cds.heal = sk.cd;
        return true;
      case 'pray':
        heal(G, 7); p.poison = 0; p.cds.pray = sk.cd;
        msg(G, 'Votre prière chasse les maux.');
        return true;
    }
    return false;
  }
  function nearestVisibleMonster(G, maxD) {
    var best = null, bd = 99;
    G.lv.monsters.forEach(function (m) {
      if (m.dead || !G.lv.visible[idx(m.x, m.y)]) return;
      var d = dist(G.p.x, G.p.y, m.x, m.y);
      if (d <= maxD && d < bd && hasLOS(G.lv, G.p.x, G.p.y, m.x, m.y)) { bd = d; best = m; }
    });
    return best;
  }
  function doShoot(G, tx, ty) {
    var p = G.p, st = effStats(G), w = p.inv.eq.weapon;
    if (!w || !w.ranged) { msg(G, 'Vous devez équiper un arc.'); return false; }
    if (Math.abs(tx - p.x) > w.ranged || Math.abs(ty - p.y) > w.ranged) { msg(G, 'Trop loin.'); return false; }
    if (!hasLOS(G.lv, p.x, p.y, tx, ty)) { msg(G, 'Pas de ligne de vue.'); return false; }
    var m = monsterAt(G.lv, tx, ty);
    if (!m) { msg(G, 'Le projectile se perd dans le noir.'); return true; }
    var mult = p.aimPower ? 2 : 1;
    p.aimPower = 0;
    var dmg = (K.dice(G.rng, w.dice[0], w.dice[1]) + Math.floor(st.str / 2) + st.es.atk) * mult;
    msg(G, 'Flèche → ' + m.d.n + (mult > 1 ? ' (tir précis !)' : '') + ' : ' + dmg);
    damageMonster(G, m, dmg, mult > 1);
    return true;
  }

  /* ── Combat ── */
  function attackMonster(G, m) {
    var p = G.p, st = effStats(G), w = p.inv.eq.weapon;
    var mult = p.powerStrike ? 2 : 1;
    p.powerStrike = 0;
    var roll = K.dice(G.rng, w ? w.dice[0] : 1, w ? w.dice[1] : 3);
    var crit = G.rng() * 100 < st.crit;
    var dmg = Math.max(1, roll + st.str + st.es.atk - Math.floor(m.d.def / 2)) * (crit ? 2 : 1) * mult;
    damageMonster(G, m, dmg, crit || mult > 1);
    if (st.es.vamp > 0 && !m.dead) {
      var v = Math.min(st.es.vamp, dmg);
      if (v > 0) { p.hp = Math.min(st.maxhp, p.hp + v); msg(G, 'Votre soif vous régénère (+' + v + ').'); }
    }
  }
  function damageMonster(G, m, dmg, emph) {
    m.hp -= dmg;
    m.asleep = false;
    if (emph) msg(G, m.d.n + ' subit ' + dmg + ' !');
    if (m.hp <= 0) {
      m.dead = true;
      G.p.kills++;
      G.p.xp += m.d.xp;
      G.p.score += m.d.xp * 2;
      msg(G, m.d.n + ' est détruit. +' + m.d.xp + ' XP');
      var lv = G.lv;
      if (m.d.boss) { G.bossKilled = true; msg(G, 'LE SEIGNEUR DES CENDRES S\u2019EFFONDRE. La couronne est à vous… (Descendre pour sortir)'); }
      /* butin */
      if (G.rng() < 0.35) {
        var drop = rollLoot(G.rng, G.p.depth);
        lv.items.push({ x: m.x, y: m.y, it: drop });
      } else if (G.rng() < 0.3) {
        lv.items.push({ x: m.x, y: m.y, gold: 3 + Math.floor(G.rng() * (4 + G.p.depth * 3)) });
      }
      checkLevel(G);
    }
    updateHUD(G);
  }
  function checkLevel(G) {
    var p = G.p;
    while (p.xp >= K.xpFor(p.lvl)) {
      p.xp -= K.xpFor(p.lvl);
      p.lvl++;
      var hpUp = p.cls === 'occultiste' ? 3 : 5;
      p.maxhp += hpUp;
      if (p.cls === 'occultiste') p.maxmana += 3;
      if (p.cls === 'guerrier' && p.lvl % 2 === 0) p.str++;
      if (p.cls === 'chasseresse' && p.lvl % 3 === 0) p.str++;
      p.hp = Math.min(effStats(G).maxhp, p.hp + hpUp + 4);
      msg(G, '⭐ Niveau ' + p.lvl + ' ! Vous vous sentez plus fort.');
    }
  }
  function hurtPlayer(G, dmg, cause) {
    if (!G.p.alive || G.over) return;
    var p = G.p, st = effStats(G);
    dmg = Math.max(1, dmg - Math.floor(st.prot / 2));
    p.hp -= dmg;
    p.lastCause = cause;
    if (G.onHurt) G.onHurt();
    if (p.hp <= 0) { p.alive = false; die(G, cause); }
    updateHUD(G);
  }
  function die(G, cause) {
    if (G._overFired) return;
    G._overFired = true;
    G.over = true;
    G.p.alive = false;
    msg(G, '☠ Vous succombez ' + (cause || 'dans les Cendres') + '. Profondeur ' + G.p.depth + ', niveau ' + G.p.lvl + ', ' + G.p.score + ' pts.');
    if (G.onOver) G.onOver(false);
  }
  function win(G) {
    G.over = true; G.won = true;
    G.p.score += 1000 + G.p.depth * 100;
    msg(G, '👑 Vous remontez à la lumière, porteur de la Couronne de Cendres ! VICTOIRE.');
    if (G.onOver) G.onOver(true);
  }

  /* ── Tour des monstres ── */
  function monstersTurn(G) {
    var p = G.p, lv = G.lv;
    var dmap = distMap(lv, p.x, p.y);
    var haste = p.buffs.haste ? 1 : 0;
    lv.monsters.forEach(function (m) {
      if (m.dead) return;
      m.energy += m.d.spd * (1);
      while (m.energy >= 1) {
        m.energy -= 1;
        if (m.flee > 0) { m.flee--; moveAway(G, m, dmap); continue; }
        var d = dist(m.x, m.y, p.x, p.y);
        var seesP = d <= m.d.sight && (m.d.phase || hasLOS(lv, m.x, m.y, p.x, p.y));
        if (m.asleep) {
          if (seesP && d <= Math.min(m.d.sight, 6)) { m.asleep = false; msg(G, m.d.n + ' vous a repéré !'); }
          continue;
        }
        if (!seesP && d > 12) { continue; }
        if (d <= 1 && !(m.d.ranged && d === 1 && G.rng() < 0.5)) {
          var roll = K.dice(G.rng, m.d.dice[0], m.d.dice[1]);
          hurtPlayer(G, roll, 'sous les coups de ' + m.d.n);
          if (m.d.poison && G.p.alive && G.rng() < 0.4) {
            G.p.poison += m.d.poison;
            msg(G, 'Venin injecté !');
          }
        } else if (m.d.ranged && d <= m.d.ranged && hasLOS(lv, m.x, m.y, p.x, p.y) && m.cd <= 0) {
          var roll2 = K.dice(G.rng, m.d.dice[0], m.d.dice[1]);
          hurtPlayer(G, roll2, 'sous les projectiles de ' + m.d.n);
          m.cd = 2;
        } else {
          if (m.d.erratic && G.rng() < m.d.erratic) { stepRandom(G, m); continue; }
          stepToward(G, m, dmap);
        }
        if (m.cd > 0) m.cd--;
        if (!G.p.alive) return;
      }
    });
  }
  function stepToward(G, m, dmap) {
    var lv = G.lv, bestD = dmap[idx(m.x, m.y)], bx = m.x, by = m.y;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) {
      var nx = m.x + v[0], ny = m.y + v[1];
      if (!walkable(lv, nx, ny)) return;
      if (monsterAt(lv, nx, ny)) return;
      var dd = dmap[idx(nx, ny)];
      if (dd >= 0 && dd < bestD) { bestD = dd; bx = nx; by = ny; }
    });
    if (bx !== m.x || by !== m.y) { m.x = bx; m.y = by; }
  }
  function moveAway(G, m, dmap) {
    var lv = G.lv, bestD = dmap[idx(m.x, m.y)], bx = null, by = null;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) {
      var nx = m.x + v[0], ny = m.y + v[1];
      if (!walkable(lv, nx, ny) || monsterAt(lv, nx, ny)) return;
      var dd = dmap[idx(nx, ny)];
      if (dd > bestD) { bestD = dd; bx = nx; by = ny; }
    });
    if (bx !== null) { m.x = bx; m.y = by; }
  }
  function stepRandom(G, m) {
    var v = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(G.rng() * 4)];
    var nx = m.x + v[0], ny = m.y + v[1];
    if (walkable(G.lv, nx, ny) && !monsterAt(G.lv, nx, ny)) { m.x = nx; m.y = ny; }
  }

  /* ── Horloge du monde ── */
  function worldTick(G) {
    var p = G.p;
    p.turns++;
    /* buffs */
    Object.keys(p.buffs).forEach(function (k) {
      var b = p.buffs[k];
      b.t--;
      if (b.t <= 0) { delete p.buffs[k]; msg(G, 'Un effet s\u2019estompe (' + k + ').'); }
    });
    if (p.buffs.confused) { stepRandomPlayer(G); }
    /* cooldowns */
    Object.keys(p.cds).forEach(function (k) { if (p.cds[k] > 0) p.cds[k]--; });
    /* régénération lente */
    if (p.turns % 12 === 0 && p.alive) p.hp = Math.min(effStats(G).maxhp, p.hp + 1);
    if (p.turns % 10 === 0 && p.mana < effStats(G).maxmana) p.mana++;
    /* troll regen */
    G.lv.monsters.forEach(function (m) {
      if (!m.dead && m.d.regen && p.turns % 4 === 0 && m.hp < m.maxhp) m.hp++;
    });
    /* faim */
    if (p.turns % 24 === 0) p.hunger--;
    if (p.hunger <= 0 && p.turns % 8 === 0) {
      p.hp--;
      msg(G, 'Vous mourez de faim !');
      if (p.hp <= 0) { p.alive = false; die(G, 'de faim'); }
    } else if (p.hunger === 20) msg(G, 'Votre ventre crie famine… (mangez !)');
    /* poison */
    if (p.poison > 0 && p.turns % 3 === 0) {
      p.poison--;
      p.hp -= 1;
      msg(G, 'Le venin ronge…');
      if (p.hp <= 0) { p.alive = false; die(G, 'empoisonné'); }
    }
    updateHUD(G);
  }
  function stepRandomPlayer(G) {
    var v = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(G.rng() * 4)];
    var nx = G.p.x + v[0], ny = G.p.y + v[1];
    if (walkable(G.lv, nx, ny) && !monsterAt(G.lv, nx, ny)) { G.p.x = nx; G.p.y = ny; }
  }
  function updateHUD(G) { if (G.onHud) G.onHud(); }

  /* ── Sauvegarde ── */
  function serialize(G) {
    return {
      seed: G.p.seed, cls: G.p.cls,
      p: G.p, lvMap: G.lv.map, lvExplored: G.lv.explored,
      lvMon: G.lv.monsters, lvItems: G.lv.items, lvAltars: G.lv.altars,
      depth: G.p.depth, identities: G.identities,
      bossKilled: G.bossKilled, won: G.won, over: G.over
    };
  }
  function autosave(G) {
    if (LS) { try { LS.setItem('cendres_save', K.saveGame(serialize(G))); } catch (e) { } }
  }
  function hasSave() {
    if (!LS) return false;
    try { return !!LS.getItem('cendres_save'); } catch (e) { return false; }
  }
  function loadSave() {
    if (!LS) return null;
    try {
      var s = LS.getItem('cendres_save');
      if (!s) return null;
      return K.loadGame(s);
    } catch (e) { return null; }
  }
  function restore(o) {
    var G = {
      p: o.p, identities: o.identities, rng: K.makeRng(o.seed + ':cont'),
      over: o.over, won: o.won, bossKilled: o.bossKilled, best: null
    };
    G.lv = {
      depth: o.depth, map: o.lvMap, explored: o.lvExplored,
      monsters: o.lvMon, items: o.lvItems, altars: o.lvAltars,
      visible: o.lvMap.map(function () { return false; }),
      rooms: [], entry: { x: o.p.x, y: o.p.y }, stairs: null
    };
    G.p.clsData = CLASSES[o.p.cls];
    G.p.msgs = G.p.msgs || [];
    computeFOV(G.lv, G.p.x, G.p.y, fovRadius(G.p));
    return G;
  }
  function deleteSave() {
    if (LS) { try { LS.removeItem('cendres_save'); } catch (e) { } }
  }

  return {
    W: W, H: H, MAX_DEPTH: MAX_DEPTH,
    MOB: MOB, CLASSES: CLASSES, POTION_TYPES: POTION_TYPES, SCROLL_TYPES: SCROLL_TYPES,
    genLevel: genLevel, computeFOV: computeFOV, hasLOS: hasLOS, distMap: distMap,
    newGame: newGame, act: act, effStats: effStats, itemLabel: itemLabel,
    nearestVisibleMonster: nearestVisibleMonster, monsterAt: monsterAt,
    serialize: serialize, autosave: autosave, hasSave: hasSave, loadSave: loadSave, restore: restore, deleteSave: deleteSave
  };
});
