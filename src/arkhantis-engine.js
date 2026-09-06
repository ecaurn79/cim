/* ═══════════════════════════════════════════════════════════════
   LES RUINES D'ARKHANTIS (MVP, v19) — moteur hack & slash isométrique
   Acte I : 6 niveaux procéduraux, Berserker complet, 40 affixes, 3 boss.
   Rendu iso : arkhantis-ui.js (canvas 2D) · Objets/saves : rpg-core.js
   UMD : Node (module.exports) · navigateur (window.ARKHANTIS)
   ═══════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports)
    module.exports = factory(require('./kernel/rpg-core.js'));
  else root.ARKHANTIS = factory(root.RPGCORE);
})(typeof self !== 'undefined' ? self : this, function (K) {
  'use strict';

  var LS = (function () { try { return (typeof localStorage !== 'undefined') ? localStorage : null; } catch (e) { return null; } })();

  var W = 42, H = 30, MAX_FLOOR = 6;
  var BOSS_FLOORS = { 2: 'korr', 4: 'tisseuse', 6: 'vhal' };

  /* ── Les 40 affixes d'Arkhantis ──
     stat → effet : atk, atkPct, atkSpd, fire, cold, poison, crit, critDmg,
     vamp, hp, def, move, regen, manaRegen, mana, gold, light, thorns,
     dodge, tough (réduction dégâts subis). */
  var AFFIXES = [
    { k: 'atk',       n: 'Colère de bronze',      min: 2, max: 6 },
    { k: 'atkPct',    n: 'Tranchant du gladiateur', min: 4, max: 12 },
    { k: 'atkSpd',    n: 'Vif-argent',            min: 5, max: 15 },
    { k: 'fire',      n: 'Morsure de braise',     min: 2, max: 8 },
    { k: 'cold',      n: 'Souffle de givre',      min: 2, max: 8 },
    { k: 'poison',    n: 'Croc du marais',        min: 2, max: 8 },
    { k: 'crit',      n: 'Œil du tigre',          min: 2, max: 6 },
    { k: 'critDmg',   n: 'Lame des bourreaux',    min: 8, max: 25 },
    { k: 'vamp',      n: 'Soif rouge',            min: 1, max: 4 },
    { k: 'hp',        n: 'Cœur de chêne',         min: 10, max: 40 },
    { k: 'def',       n: 'Peau de granit',        min: 2, max: 8 },
    { k: 'move',      n: 'Pas de l\u2019ombre',   min: 5, max: 12 },
    { k: 'regen',     n: 'Vigueur du mineur',     min: 0.5, max: 2 },
    { k: 'manaRegen', n: 'Souffle du forgeur',    min: 0.5, max: 2 },
    { k: 'mana',      n: 'Puits de lune',         min: 5, max: 20 },
    { k: 'gold',      n: 'Aumône du laboureur',   min: 5, max: 20 },
    { k: 'light',     n: 'Lanterne de crypte',    min: 0.5, max: 1.5 },
    { k: 'thorns',    n: 'Épines du buisson',     min: 2, max: 10 },
    { k: 'dodge',     n: 'Pas fantôme',           min: 2, max: 6 },
    { k: 'tough',     n: 'Rouille bénie',         min: 2, max: 8 },
    { k: 'atk',       n: 'Croc de warlord',       min: 4, max: 10 },
    { k: 'atkPct',    n: 'Fureur du colosse',     min: 8, max: 18 },
    { k: 'atkSpd',    n: 'Danse des lames',       min: 8, max: 20 },
    { k: 'fire',      n: 'Gueule du four',        min: 4, max: 14 },
    { k: 'cold',      n: 'Cœur de l\u2019hiver',  min: 4, max: 14 },
    { k: 'poison',    n: 'Venin de veuve',        min: 4, max: 14 },
    { k: 'crit',      n: 'Faucon perçant',        min: 4, max: 9 },
    { k: 'critDmg',   n: 'Tête du tyran',         min: 15, max: 35 },
    { k: 'vamp',      n: 'Gorge assoiffée',       min: 2, max: 6 },
    { k: 'hp',        n: 'Poumon de taureau',     min: 20, max: 60 },
    { k: 'def',       n: 'Bouclier vivant',       min: 5, max: 12 },
    { k: 'move',      n: 'Foulée du loup',        min: 8, max: 16 },
    { k: 'regen',     n: 'Sang de pierre',        min: 1, max: 3 },
    { k: 'manaRegen', n: 'Brise de l\u2019aube',  min: 1, max: 3 },
    { k: 'mana',      n: 'Abîme étoilé',          min: 10, max: 30 },
    { k: 'gold',      n: 'Vent du marchand',      min: 10, max: 30 },
    { k: 'light',     n: 'Œil de la lampe',       min: 1, max: 2 },
    { k: 'thorns',    n: 'Carapace du hérisson',  min: 5, max: 16 },
    { k: 'dodge',     n: 'Brume de duel',         min: 3, max: 8 },
    { k: 'tough',     n: 'Bénédiction du bastion', min: 3, max: 10 }
  ];
  function rollAffixes(rng, rarity, depth) {
    var count = [1, 1, 2, 3, 3][Math.min(4, Math.max(0, rarity))];
    var pool = AFFIXES.slice();
    var out = [];
    var scale = 1 + depth * 0.07;
    for (var i = 0; i < count && pool.length; i++) {
      var idx = Math.floor(rng() * pool.length);
      var a = pool.splice(idx, 1)[0];
      var v = (a.min + rng() * (a.max - a.min)) * scale;
      out.push({ k: a.k, n: a.n, v: Math.round(v * 10) / 10 });
    }
    return out;
  }

  /* ── Butin : base KERNEL + affixes Arkhantis ── */
  function makeLoot(rng, depth, opts) {
    var it = K.rollItem(rng, depth, opts);
    it.affixes = rollAffixes(rng, it.rarity || 0, depth);
    return it;
  }
  function affixLine(a) {
    var v = a.v;
    var pct = ['atkPct', 'atkSpd', 'crit', 'critDmg', 'vamp', 'move', 'gold', 'dodge', 'tough'].indexOf(a.k) >= 0;
    var fixed = ['regen', 'manaRegen', 'light'].indexOf(a.k) >= 0;
    var label = {
      atk: 'dégâts', atkPct: 'dégâts', atkSpd: 'vitesse d\u2019attaque', fire: 'feu', cold: 'froid',
      poison: 'poison', crit: 'critique', critDmg: 'dégâts critiques', vamp: 'vol de vie', hp: 'PV',
      def: 'défense', move: 'vitesse', regen: 'PV/s', manaRegen: 'mana/s', mana: 'mana', gold: 'or trouvé',
      light: 'vision', thorns: 'renvoi', dodge: 'esquive', tough: 'dégâts subis'
    }[a.k] || a.k;
    return '+' + (fixed ? v.toFixed(1) : (pct ? Math.round(v) + '%' : Math.round(v))) + ' ' + label;
  }
  function lootName(it) {
    return (it.name || it.base) + (it.affixes && it.affixes.length ? ' «' + it.affixes[0].n + '»' : '');
  }

  /* ── Berserker ── */
  var CLASS = {
    key: 'berserker', n: 'Berserker', glyph: '@', color: '#e07a3f',
    hp: 110, mana: 60, atk: 14, def: 5, move: 3.6, atkSpd: 1.15,
    skills: [
      { k: 'rage',    n: 'Coup de rage',    cd: 6,  mana: 12, d: 'coup lourd : 250 % de dégâts' },
      { k: 'spin',    n: 'Tourbillon',      cd: 10, mana: 18, d: 'éclat autour de vous (150 %, zone)' },
      { k: 'cri',     n: 'Cri de guerre',   cd: 16, mana: 14, d: '+40 % dégâts pendant 8 s' },
      { k: 'souffle', n: 'Second souffle',  cd: 20, mana: 20, d: 'soigne 30 % des PV max' }
    ]
  };
  var TREE = [
    { k: 'force',     n: 'Force',        d: '+8 % dégâts / point',   cap: 3 },
    { k: 'robustesse', n: 'Robustesse', d: '+10 % PV / point',      cap: 3 },
    { k: 'precision', n: 'Précision',    d: '+3 % critique / point', cap: 3 },
    { k: 'vivacite',  n: 'Vivacité',     d: '−6 % délais / point',   cap: 3 },
    { k: 'sang',      n: 'Soif de sang', d: '+2 % vol de vie / point', cap: 2 },
    { k: 'fortune',   n: 'Fortune',      d: '+10 % or / point',      cap: 3 }
  ];
  var TREE_MAX = 12;

  function newCamp(seed) {
    var rng = K.makeRng(seed || ('ark-' + Date.now()));
    var inv = K.makeInventory(12);
    /* départ : hache + cuir bouilli équipés */
    var w = K.rollItem(rng, 1, { kind: 'weapon', force: 'hache de guerre' });
    w.affixes = rollAffixes(rng, 0, 1);
    var ar = K.rollItem(rng, 1, { kind: 'armor', force: 'cuir bouilli' });
    ar.affixes = rollAffixes(rng, 0, 1);
    K.invAdd(inv, w);
    K.invEquip(inv, w);
    K.invAdd(inv, ar);
    K.invEquip(inv, ar);
    return {
      _v: 1, seed: String(seed || ('ark-' + Math.floor(rng() * 1e9))),
      level: 1, xp: 0, gold: 0, kills: 0, floorUnlocked: 1,
      tree: {}, inv: inv, deaths: 0
    };
  }

  /* ── Stats totales du héros ── */
  function heroStats(camp) {
    var t = camp.tree || {};
    var aff = { atk: 0, atkPct: 0, atkSpd: 0, fire: 0, cold: 0, poison: 0, crit: 0, critDmg: 0, vamp: 0, hp: 0, def: 0, move: 0, regen: 0, manaRegen: 0, mana: 0, gold: 0, light: 0, thorns: 0, dodge: 0, tough: 0 };
    ['weapon', 'armor', 'helm', 'shield', 'amulet', 'ring1', 'ring2'].forEach(function (s) {
      var it = camp.inv.eq[s];
      if (!it) return;
      (it.affixes || []).forEach(function (a) { if (aff[a.k] != null) aff[a.k] += a.v; });
    });
    var lvl = camp.level - 1;
    var st = {
      maxhp: Math.round((CLASS.hp + 14 * lvl + aff.hp) * (1 + 0.10 * (t.robustesse || 0))),
      maxmana: CLASS.mana + aff.mana,
      atk: (CLASS.atk + 2.4 * lvl + aff.atk) * (1 + 0.08 * (t.force || 0) + aff.atkPct / 100),
      def: CLASS.def + aff.def,
      atkSpd: CLASS.atkSpd * (1 + aff.atkSpd / 100),
      move: CLASS.move * (1 + aff.move / 100),
      crit: 5 + aff.crit + 3 * (t.precision || 0),
      critDmg: 150 + aff.critDmg,
      vamp: aff.vamp + 2 * (t.sang || 0),
      regen: 1 + aff.regen,
      manaRegen: 2 + aff.manaRegen,
      goldMul: 1 + aff.gold / 100 + 0.10 * (t.fortune || 0),
      light: 5 + aff.light,
      thorns: aff.thorns,
      dodge: Math.min(40, aff.dodge),
      tough: Math.min(60, aff.tough),
      fire: aff.fire, cold: aff.cold, poison: aff.poison,
      cdr: Math.min(40, 0.06 * (t.vivacite || 0))
    };
    st.atk = Math.round(st.atk * 10) / 10;
    return st;
  }
  function skillCd(camp, sk) { return sk.cd * (1 - heroStats(camp).cdr); }
  function treePoints(camp) {
    var used = 0;
    Object.keys(camp.tree || {}).forEach(function (k) { used += camp.tree[k]; });
    return { used: used, total: TREE_MAX, free: Math.max(0, TREE_MAX - used) };
  }
  function xpFor(level) { return Math.round(45 * Math.pow(level, 1.55)); }

  /* ── Monstres ── */
  var MOB = {
    rampant:  { n: 'rampant des ruines', glyph: 'r', hp: 26, dmg: 6,  atkSpd: .9, move: 2.4, range: 1.05, xp: 9,  gold: 4,  color: '#7d8a5a', sight: 6 },
    acolyte:  { n: 'acolyte des braises', glyph: 'a', hp: 20, dmg: 8,  atkSpd: .7, move: 2.0, range: 4.2, xp: 12, gold: 7,  color: '#c06a3a', sight: 7, ranged: true },
    fracasse: { n: 'gardien fracassé',   glyph: 'g', hp: 60, dmg: 12, atkSpd: .55, move: 1.7, range: 1.15, xp: 20, gold: 12, color: '#8a8f98', sight: 5 },
    cultiste: { n: 'cultiste du chaudron', glyph: 'c', hp: 30, dmg: 10, atkSpd: .8, move: 2.6, range: 1.05, xp: 16, gold: 9,  color: '#6a4a8a', sight: 7 },
    chevauch: { n: 'chevaucheur d\u2019os', glyph: 'h', hp: 44, dmg: 14, atkSpd: 1.0, move: 3.4, range: 1.1, xp: 24, gold: 14, color: '#a89a6a', sight: 8 }
  };
  var POOLS = {
    1: ['rampant', 'rampant', 'acolyte'],
    2: ['rampant', 'acolyte', 'fracasse'],
    3: ['acolyte', 'fracasse', 'cultiste'],
    4: ['fracasse', 'cultiste', 'chevauch'],
    5: ['cultiste', 'chevauch', 'acolyte'],
    6: ['chevauch', 'cultiste', 'fracasse']
  };
  var BOSSES = {
    korr:     { n: 'Korr le Fracassé',     glyph: 'K', hp: 320, dmg: 16, atkSpd: .6, move: 1.6, range: 1.5, xp: 90, gold: 60, color: '#9aa0aa', sight: 99, mechanic: 'charge' },
    tisseuse: { n: 'La Tisseuse de Rust',  glyph: 'T', hp: 380, dmg: 14, atkSpd: .8, move: 2.2, range: 4.5, xp: 110, gold: 75, color: '#7a4a9a', sight: 99, ranged: true, mechanic: 'summon' },
    vhal:     { n: 'Vhal, Souffle de Braise', glyph: 'V', hp: 460, dmg: 18, atkSpd: .7, move: 2.0, range: 1.6, xp: 150, gold: 110, color: '#d8642a', sight: 99, mechanic: 'aoe', boss: 1 }
  };

  /* ── Faille du jour : modificateurs partagés ── */
  var MODS = [
    { k: 'braise', n: 'Braise de mine', d: 'Monstres +25 % dégâts' },
    { k: 'nuee', n: 'La Nuée', d: 'Monstres +40 % en nombre' },
    { k: 'ruee', n: 'Ruée d\u2019or', d: 'Or trouvé +50 %' },
    { k: 'brume', n: 'Brume dense', d: 'Vision réduite' },
    { k: 'carapaces', n: 'Carapaces', d: 'Monstres +20 % PV' },
    { k: 'coeur', n: 'Cœur vaillant', d: 'Vos PV +20 %' },
    { k: 'mains', n: 'Mains rapides', d: 'Votre vitesse +15 %' },
    { k: 'moisson', n: 'Moisson rare', d: 'Butin d\u2019une rareté au-dessus' }
  ];
  function today() { return new Date().toISOString().slice(0, 10); }
  function failleDuJour() {
    var rng = K.makeRng('faille-' + today());
    var pool = MODS.slice();
    var out = [];
    for (var i = 0; i < 2; i++) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    return { date: today(), mods: out };
  }

  /* ── Génération de niveau ── */
  function genFloor(rng, floor, mods) {
    mods = mods || {};
    var g = new Array(W * H);
    var i;
    for (i = 0; i < W * H; i++) g[i] = '#';
    var rooms = [];
    var nbRooms = 5 + Math.floor(rng() * 3);
    for (var r2 = 0; r2 < nbRooms; r2++) {
      var rw = 4 + Math.floor(rng() * 5), rh = 4 + Math.floor(rng() * 4);
      var rx = 2 + Math.floor(rng() * (W - rw - 4));
      var ry = 2 + Math.floor(rng() * (H - rh - 4));
      var ok = true;
      for (var q = 0; q < rooms.length; q++) {
        var o = rooms[q];
        if (rx < o.x + o.w + 2 && rx + rw + 2 > o.x && ry < o.y + o.h + 2 && ry + rh + 2 > o.y) { ok = false; break; }
      }
      if (!ok) continue;
      rooms.push({ x: rx, y: ry, w: rw, h: rh });
      for (var y = ry; y < ry + rh; y++)
        for (var x = rx; x < rx + rw; x++) g[y * W + x] = '.';
    }
    /* couloirs en L entre salles consécutives (centres) */
    function cx(o) { return Math.floor(o.x + o.w / 2); }
    function cy(o) { return Math.floor(o.y + o.h / 2); }
    for (i = 1; i < rooms.length; i++) {
      var a = rooms[i - 1], b = rooms[i];
      var x0 = cx(a), y0 = cy(a), x1 = cx(b), y1 = cy(b);
      if (rng() < .5) {
        for (var xx = Math.min(x0, x1); xx <= Math.max(x0, x1); xx++) g[y0 * W + xx] = '.';
        for (var yy = Math.min(y0, y1); yy <= Math.max(y0, y1); yy++) g[yy * W + x1] = '.';
      } else {
        for (var yy2 = Math.min(y0, y1); yy2 <= Math.max(y0, y1); yy2++) g[yy2 * W + x0] = '.';
        for (var xx2 = Math.min(x0, x1); xx2 <= Math.max(x0, x1); xx2++) g[y1 * W + xx2] = '.';
      }
    }
    var start = { x: cx(rooms[0]), y: cy(rooms[0]) };
    var far = rooms[rooms.length - 1];
    var goal = { x: cx(far), y: cy(far) };
    /* connexité : BFS depuis start, toute case franchissable non atteinte → mur */
    var seen = {}; seen[start.y * W + start.x] = 1;
    var st = [[start.x, start.y]];
    while (st.length) {
      var c = st.pop();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = c[0] + d[0], ny = c[1] + d[1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
        var j = ny * W + nx;
        if (g[j] === '.' && !seen[j]) { seen[j] = 1; st.push([nx, ny]); }
      });
    }
    for (i = 0; i < W * H; i++) if (g[i] === '.' && !seen[i]) g[i] = '#';
    if (g[goal.y * W + goal.x] !== '.') { g[goal.y * W + goal.x] = '.'; }

    /* monstres */
    var isBoss = !!BOSS_FLOORS[floor];
    var pool = POOLS[Math.min(6, Math.max(1, floor))];
    var count = Math.round((5 + floor * 2) * (mods.nuee ? 1.4 : 1));
    var mobs = [];
    var guard = 0;
    while (mobs.length < count && guard++ < 500) {
      var rm = rooms[1 + Math.floor(rng() * Math.max(1, rooms.length - 1))];
      if (!rm) break;
      var mx = rm.x + Math.floor(rng() * rm.w), my = rm.y + Math.floor(rng() * rm.h);
      if (g[my * W + mx] !== '.') continue;
      if (Math.abs(mx - start.x) + Math.abs(my - start.y) < 7) continue;
      var d = MOB[pool[Math.floor(rng() * pool.length)]];
      mobs.push(makeMob(d, mx + .5, my + .5, mods, floor));
    }
    /* objets au sol + or */
    var items = [];
    for (var li = 0; li < 2 + Math.floor(rng() * 2); li++) {
      var rm2 = rooms[Math.floor(rng() * rooms.length)];
      var ix = rm2.x + Math.floor(rng() * rm2.w), iy = rm2.y + Math.floor(rng() * rm2.h);
      if (g[iy * W + ix] !== '.') continue;
      if (Math.abs(ix - start.x) + Math.abs(iy - start.y) < 5) continue;
      var depth = Math.min(6, floor + 1);
      var it = makeLoot(rng, mods.moisson ? depth + 1 : depth);
      items.push({ x: ix + .5, y: iy + .5, it: it });
    }
    for (var gi = 0; gi < 3 + Math.floor(rng() * 3); gi++) {
      var rm3 = rooms[Math.floor(rng() * rooms.length)];
      var gx = rm3.x + Math.floor(rng() * rm3.w), gy = rm3.y + Math.floor(rng() * rm3.h);
      if (g[gy * W + gx] !== '.') continue;
      items.push({ x: gx + .5, y: gy + .5, gold: Math.round((4 + rng() * 8) * (1 + floor * .3) * (mods.ruee ? 1.5 : 1)) });
    }
    /* autel de braise (soin complet, une fois) */
    var shrine = null;
    if (rng() < .6) {
      var rm4 = rooms[Math.floor(rng() * rooms.length)];
      var sx = rm4.x + 1, sy = rm4.y + 1;
      if (g[sy * W + sx] === '.') shrine = { x: sx + .5, y: sy + .5, used: false };
    }
    return { grid: g, rooms: rooms, start: start, goal: goal, bossFloor: isBoss, mobs: mobs, items: items, shrine: shrine };
  }

  function makeMob(d, x, y, mods, floor) {
    var hpMul = (mods.carapaces ? 1.2 : 1) * (1 + floor * 0.12);
    var dmgMul = (mods.braise ? 1.25 : 1) * (1 + floor * 0.08);
    return {
      d: d, n: d.n, glyph: d.glyph, color: d.color,
      x: x, y: y, hp: Math.round(d.hp * hpMul), maxhp: Math.round(d.hp * hpMul),
      dmg: d.dmg * dmgMul, atkSpd: d.atkSpd, move: d.move, range: d.range,
      sight: d.sight, ranged: !!d.ranged, cd: 0, path: [], state: 'idle',
      xp: d.xp, gold: d.gold, boss: false
    };
  }

  /* ── BFS (pathfinding) ── */
  function walkable(grid, x, y) {
    return x >= 0 && y >= 0 && x < W && y < H && grid[y * W + x] === '.';
  }
  function bfsPath(grid, sx, sy, tx, ty) {
    sx = Math.floor(sx); sy = Math.floor(sy); tx = Math.floor(tx); ty = Math.floor(ty);
    if (!walkable(grid, tx, ty) || !walkable(grid, sx, sy)) return null;
    var prev = {}; prev[sy * W + sx] = -1;
    var q = [[sx, sy]];
    while (q.length) {
      var c = q.shift();
      if (c[0] === tx && c[1] === ty) {
        var path = [], cur = ty * W + tx;
        while (cur !== -1) { path.unshift({ x: cur % W + .5, y: Math.floor(cur / W) + .5 }); cur = prev[cur]; }
        return path;
      }
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < 4; i++) {
        var nx = c[0] + dirs[i][0], ny = c[1] + dirs[i][1];
        if (!walkable(grid, nx, ny)) continue;
        var j = ny * W + nx;
        if (prev[j] !== undefined) continue;
        prev[j] = c[1] * W + c[0];
        q.push([nx, ny]);
      }
    }
    return null;
  }

  /* ── Partie (run) ── */
  function makeGame(camp, floor, seedStr, mods) {
    var rng = K.makeRng(seedStr || (camp.seed + ':f' + floor + ':' + Date.now()));
    var st = heroStats(camp);
    if (mods && mods.coeur) st.maxhp = Math.round(st.maxhp * 1.2);
    if (mods && mods.mains) st.move = st.move * 1.15;
    var F = genFloor(rng, floor, mods || {});
    var G = {
      camp: camp, floor: floor, grid: F.grid, start: F.start, goal: F.goal, bossFloor: F.bossFloor,
      shrine: F.shrine, items: F.items, fx: [], time: 0, over: false, won: false, cleared: false,
      mods: mods || {}, bossKey: BOSS_FLOORS[floor] || null
    };
    G.p = {
      x: F.start.x + .5, y: F.start.y + .5, path: [],
      hp: st.maxhp, mana: st.maxmana, st: st,
      cd: 0, cds: { rage: 0, spin: 0, cri: 0, souffle: 0 },
      atkTarget: null, buffs: { cri: 0 }, poison: 0, dead: false
    };
    G.mobs = F.mobs;
    if (G.bossKey) {
      var bd = BOSSES[G.bossKey];
      var bg = F.goal;
      G.boss = {
        d: bd, n: bd.n, glyph: bd.glyph, color: bd.color,
        x: bg.x + .5, y: bg.y + .5, hp: bd.hp, maxhp: bd.hp,
        dmg: bd.dmg * (1 + floor * .08), atkSpd: bd.atkSpd, move: bd.move, range: bd.range,
        sight: 99, ranged: !!bd.ranged, cd: 0, path: [], state: 'idle',
        xp: bd.xp, gold: bd.gold, boss: true, mechanic: bd.mechanic,
        mTimer: 6, tele: null, enraged: false, dead: false, portal: false
      };
      G.mobs.push(G.boss);
    } else {
      G.boss = null;
      G.portal = { x: F.goal.x + .5, y: F.goal.y + .5 };
    }
    return G;
  }

  function msg(G, t) { G.fx.push({ t: 'msg', txt: t, life: 3 }); }

  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }

  function rollDmg(rng) { return .85 + rng() * .3; }

  function playerHit(G, m) {
    var p = G.p, st = p.st;
    var rng = K.makeRng(G.seed + ':hit:' + Math.floor(G.time * 1000) + ':' + Math.random());
    var base = st.atk * rollDmg(rng);
    var crit = rng() * 100 < st.crit;
    var dmg = base * (crit ? st.critDmg / 100 : 1);
    dmg += st.fire + st.cold + st.poison;
    m.hp -= dmg;
    if (st.vamp) p.hp = Math.min(st.maxhp, p.hp + dmg * st.vamp / 100);
    G.fx.push({ t: 'dmg', x: m.x, y: m.y, n: Math.round(dmg), crit: crit, life: .8 });
    m.cd = Math.max(m.cd, .25);
    if (crit) G.fx.push({ t: 'crit', life: .3 });
    if (m.hp <= 0) killMob(G, m);
  }
  function killMob(G, m) {
    if (m.dead) return;
    m.dead = true;
    G.camp.kills++;
    var goldGain = Math.round(m.gold * G.p.st.goldMul);
    G.camp.gold += goldGain;
    gainXp(G, m.xp);
    G.fx.push({ t: 'msg', txt: m.n + ' s\u2019effondre (+' + goldGain + ' or).', life: 2.4 });
    if (m === G.boss) onBossDown(G);
  }
  function onBossDown(G) {
    /* butin du boss : 2 objets rares+ */
    var rng = K.makeRng(G.camp.seed + ':bossloot:' + G.floor + ':' + Math.floor(G.time));
    for (var i = 0; i < 2; i++) {
      var it = makeLoot(rng, Math.min(6, G.floor + 2), {});
      if ((it.rarity || 0) < 2) it.rarity = 2;
      G.items.push({ x: G.boss.x + (i ? .6 : -.6), y: G.boss.y + .4, it: it });
    }
    G.boss.portal = true;
    if (!G.portal) G.portal = { x: G.boss.x, y: G.boss.y + 1.2 };
    msg(G, 'Le gardien est tombé — un portail s\u2019ouvre vers le camp.');
  }
  function gainXp(G, xp) {
    var c = G.camp;
    c.xp += xp;
    while (c.xp >= xpFor(c.level)) {
      c.xp -= xpFor(c.level);
      c.level++;
      msg(G, '⭐ Niveau ' + c.level + ' !');
    }
  }

  function mobHitPlayer(G, m) {
    var p = G.p;
    var rng = K.makeRng(G.camp.seed + ':mh:' + Math.floor(G.time * 777) + ':' + Math.floor(m.x * 31));
    if (rng() * 100 < p.st.dodge) { G.fx.push({ t: 'msg', txt: 'esquive !', life: .6 }); return; }
    var dmg = Math.max(1, (m.dmg * rollDmg(rng)) - p.st.def * .45);
    dmg *= (1 - p.st.tough / 100);
    p.hp -= dmg;
    G.fx.push({ t: 'hurt', life: .3 });
    if (p.st.thorns && dist(p.x, p.y, m.x, m.y) < 2) {
      m.hp -= p.st.thorns * rollDmg(rng);
      if (m.hp <= 0) killMob(G, m);
    }
    if (p.hp <= 0) { p.hp = 0; p.dead = true; G.over = true; }
  }

  function moveAlong(e, dt, speed) {
    if (!e.path || !e.path.length) return false;
    var wp = e.path[0];
    var d = dist(e.x, e.y, wp.x, wp.y);
    if (d < .08) { e.path.shift(); return e.path.length > 0; }
    var step = Math.min(d, speed * dt);
    e.x += (wp.x - e.x) / d * step;
    e.y += (wp.y - e.y) / d * step;
    return true;
  }

  function mobStep(G, m, dt) {
    if (m.dead) return;
    var p = G.p;
    var d = dist(m.x, m.y, p.x, p.y);
    if (m.cd > 0) m.cd -= dt;
    if (m.state === 'idle' && (d < m.sight || m.boss)) m.state = 'chase';
    if (m.state === 'chase') {
      if (d <= m.range) {
        if (m.cd <= 0) {
          m.cd = 1 / m.atkSpd;
          if (m.ranged) spawnBolt(G, m, p);
          else mobHitPlayer(G, m);
        }
      } else {
        /* repath toutes les ~0.4 s */
        if (!m.path || !m.path.length) {
          var pth = bfsPath(G.grid, m.x, m.y, p.x, p.y);
          if (pth) m.path = pth.slice(1);
        }
        moveAlong(m, dt, m.move);
        if (m.path && m.path.length) { /* suit */ } else if (dist(m.x, m.y, p.x, p.y) > m.range + .9) { m.path = []; }
      }
      /* mécaniques de boss */
      if (m.boss) bossStep(G, m, dt, d);
    }
  }

  function bossStep(G, b, dt, d) {
    b.mTimer -= dt;
    if (b.mechanic === 'charge' && b.mTimer <= 0) {
      b.mTimer = 7;
      if (d < 7) {
        var pth = bfsPath(G.grid, b.x, b.y, G.p.x, G.p.y);
        if (pth && pth.length > 2) { b.path = pth.slice(1, Math.min(pth.length, 8)); b.move = 5.5; b.cd = .8; msg(G, b.n + ' charge !'); }
      }
    }
    if (b.mechanic === 'summon' && b.mTimer <= 0) {
      b.mTimer = 12;
      var alive = G.mobs.filter(function (m) { return !m.dead && !m.boss; }).length;
      if (alive < 6) {
        var rng = K.makeRng(G.camp.seed + ':sum:' + Math.floor(b.mTimer * 1000));
        for (var i = 0; i < 3; i++) {
          var ang = rng() * Math.PI * 2;
          var sx = b.x + Math.cos(ang) * 1.6, sy = b.y + Math.sin(ang) * 1.6;
          if (!walkable(G.grid, Math.floor(sx), Math.floor(sy))) continue;
          var nm = makeMob(MOB.rampant, sx, sy, G.mods, G.floor);
          nm.state = 'chase';
          G.mobs.push(nm);
        }
        msg(G, b.n + ' appelle la ruine à son secours !');
      }
    }
    if (b.mechanic === 'aoe' && b.mTimer <= 0) {
      b.mTimer = 5;
      /* cercle télégraphié sur la position du joueur */
      G.fx.push({ t: 'tele', x: G.p.x, y: G.p.y, r: 2.2, life: 1.4, boom: true });
      msg(G, b.n + ' embrase le sol — éloignez-vous !');
    }
    if (!b.enraged && b.hp < b.maxhp * .3) {
      b.enraged = true;
      b.dmg *= 1.4; b.atkSpd *= 1.3; b.move *= 1.25;
      msg(G, b.n + ' entre en FUREUR !');
    }
  }

  function spawnBolt(G, m, p) {
    G.fx.push({ t: 'bolt', x: m.x, y: m.y, tx: p.x, ty: p.y, speed: 7, dmg: m.dmg, life: 1.2, src: m });
  }

  function step(G, dt) {
    if (G.over) return;
    G.time += dt;
    var p = G.p, st = p.st;
    /* joueur */
    if (p.poison > 0) { p.poison -= dt; p.hp -= dt * 2; if (p.hp <= 0) { p.hp = 0; p.dead = true; G.over = true; } }
    p.hp = Math.min(st.maxhp, p.hp + st.regen * dt);
    p.mana = Math.min(st.maxmana, p.mana + st.manaRegen * dt);
    if (p.buffs.cri > 0) p.buffs.cri -= dt;
    Object.keys(p.cds).forEach(function (k) { if (p.cds[k] > 0) p.cds[k] -= dt; });
    if (p.cd > 0) p.cd -= dt;
    moveAlong(p, dt, st.move);
    /* attaque automatique : cible proche */
    var tgt = p.atkTarget && !p.atkTarget.dead ? p.atkTarget : null;
    if (!tgt) {
      var bd = 1.35;
      G.mobs.forEach(function (m) {
        if (m.dead) return;
        var d = dist(p.x, p.y, m.x, m.y);
        if (d < bd) { bd = d; tgt = m; }
      });
      p.atkTarget = tgt;
    }
    if (tgt && dist(p.x, p.y, tgt.x, tgt.y) <= 1.35 && p.cd <= 0) {
      p.cd = 1 / st.atkSpd;
      var mult = p.buffs.cri > 0 ? 1.4 : 1;
      var savAtk = st.atk;
      if (mult !== 1) { st.atk = st.atk * mult; playerHit(G, tgt); st.atk = savAtk; }
      else playerHit(G, tgt);
    }
    /* monstres */
    G.mobs.forEach(function (m) { mobStep(G, m, dt); });
    G.mobs = G.mobs.filter(function (m) { return !m.dead; });
    if (G.boss && G.boss.dead && G.boss) { /* reste dans items/portal */ }
    /* projectiles */
    G.fx.forEach(function (f) {
      if (f.t !== 'bolt') return;
      var d = dist(f.x, f.y, f.tx, f.ty);
      if (d < .2) {
        f.life = 0;
        if (dist(f.x, f.y, p.x, p.y) < .8) mobHitPlayer(G, f.src || { dmg: f.dmg });
        return;
      }
      f.x += (f.tx - f.x) / d * f.speed * dt;
      f.y += (f.ty - f.y) / d * f.speed * dt;
    });
    /* ramassage */
    for (var i = G.items.length - 1; i >= 0; i--) {
      var it2 = G.items[i];
      if (dist(p.x, p.y, it2.x, it2.y) < .62) {
        if (it2.gold) {
          G.camp.gold += it2.gold;
          G.fx.push({ t: 'msg', txt: '+' + it2.gold + ' or', life: 1.2 });
        } else {
          if (K.invAdd(G.camp.inv, it2.it)) {
            G.fx.push({ t: 'msg', txt: lootName(it2.it), life: 2.2 });
          } else {
            G.fx.push({ t: 'msg', txt: 'Sac plein — objet laissé.', life: 1.6 });
            continue;
          }
        }
        G.items.splice(i, 1);
      }
    }
    /* autel */
    if (G.shrine && !G.shrine.used && dist(p.x, p.y, G.shrine.x, G.shrine.y) < .8) {
      G.shrine.used = true;
      p.hp = st.maxhp; p.mana = st.maxmana;
      msg(G, 'L\u2019autel de braise vous restaure.');
    }
    /* sort de zone (tele) qui explose */
    G.fx.forEach(function (f) {
      if (f.t === 'tele' && f.boom && f.life <= dt) {
        if (dist(p.x, p.y, f.x, f.y) < f.r) mobHitPlayer(G, { dmg: 26 });
        f.boom = false;
      }
    });
    /* effets durées */
    G.fx.forEach(function (f) { if (f.life != null) f.life -= dt; });
    G.fx = G.fx.filter(function (f) { return f.life == null || f.life > 0; });
    /* sortie : portail */
    if (G.portal && dist(p.x, p.y, G.portal.x, G.portal.y) < .8) {
      G.over = true; G.won = true;
    }
    if (G.boss && !G.boss.dead) {
      var bossLeft = G.mobs.some(function (m) { return m.boss && !m.dead; });
      if (!bossLeft) onBossDown(G);
    }
  }

  /* commandes */
  function cmdMove(G, tx, ty) {
    var path = bfsPath(G.grid, G.p.x, G.p.y, tx, ty);
    if (path) { G.p.path = path; G.p.atkTarget = null; }
    return !!path;
  }
  function cmdAttack(G, mob) {
    if (!mob || mob.dead) return false;
    G.p.atkTarget = mob;
    var d = dist(G.p.x, G.p.y, mob.x, mob.y);
    if (d > 1.3) {
      var path = bfsPath(G.grid, G.p.x, G.p.y, mob.x, mob.y);
      if (path) G.p.path = path.slice(0, Math.max(1, path.length - 1));
    } else G.p.path = [];
    return true;
  }
  function cmdCast(G, k) {
    var p = G.p, st = p.st;
    var sk = null;
    CLASS.skills.forEach(function (s) { if (s.k === k) sk = s; });
    if (!sk) return { ok: false, why: 'inconnu' };
    if (p.cds[k] > 0) return { ok: false, why: 'en recharge' };
    if (p.mana < sk.mana) return { ok: false, why: 'pas assez de mana' };
    p.mana -= sk.mana;
    p.cds[k] = skillCd(G.camp, sk);
    if (k === 'rage') {
      var best = null, bd = 2.1;
      G.mobs.forEach(function (m) {
        if (m.dead) return;
        var d = dist(p.x, p.y, m.x, m.y);
        if (d < bd) { bd = d; best = m; }
      });
      if (!best) return { ok: false, why: 'aucune cible proche' };
      var sav = st.atk;
      st.atk = st.atk * 2.5;
      playerHit(G, best);
      st.atk = sav;
      G.fx.push({ t: 'crit', life: .35 });
      return { ok: true };
    }
    if (k === 'spin') {
      var hits = 0;
      G.mobs.forEach(function (m) {
        if (m.dead) return;
        if (dist(p.x, p.y, m.x, m.y) <= 2.1) {
          var sav = st.atk;
          st.atk = st.atk * 1.5;
          playerHit(G, m);
          st.atk = sav;
          hits++;
        }
      });
      return { ok: hits > 0, hits: hits };
    }
    if (k === 'cri') { p.buffs.cri = 8; msg(G, 'Cri de guerre : +40 % dégâts (8 s).'); return { ok: true }; }
    if (k === 'souffle') {
      p.hp = Math.min(st.maxhp, p.hp + st.maxhp * .3);
      G.fx.push({ t: 'heal', life: .6 });
      return { ok: true };
    }
    return { ok: false, why: 'inconnu' };
  }

  /* fin de run → camp */
  function finishRun(G) {
    var c = G.camp;
    if (G.won) {
      if (G.floor >= c.floorUnlocked && c.floorUnlocked < MAX_FLOOR) c.floorUnlocked = G.floor + 1;
    } else {
      c.gold = Math.floor(c.gold * .8);
      c.deaths++;
    }
    autosave(c);
    return { won: G.won, gold: c.gold, level: c.level, kills: G.camp.kills };
  }

  /* sauvegarde */
  function serialize(camp) { return camp; }
  function restore(o) { return (o && o.inv && o.level) ? o : null; }
  function autosave(camp) { if (LS) { try { LS.setItem('ark_save', K.saveGame(serialize(camp))); } catch (e) { } } }
  function hasSave() { if (!LS) return false; try { return !!LS.getItem('ark_save'); } catch (e) { return false; } }
  function loadSave() {
    if (!LS) return null;
    try {
      var s = LS.getItem('ark_save');
      if (!s) return null;
      return restore(K.loadGame(s));
    } catch (e) { return null; }
  }
  function deleteSave() { if (LS) { try { LS.removeItem('ark_save'); } catch (e) { } } }

  return {
    W: W, H: H, MAX_FLOOR: MAX_FLOOR, BOSS_FLOORS: BOSS_FLOORS,
    AFFIXES: AFFIXES, rollAffixes: rollAffixes, makeLoot: makeLoot, affixLine: affixLine, lootName: lootName,
    CLASS: CLASS, TREE: TREE, TREE_MAX: TREE_MAX, newCamp: newCamp, heroStats: heroStats,
    skillCd: skillCd, treePoints: treePoints, xpFor: xpFor,
    MOB: MOB, BOSSES: BOSSES, POOLS: POOLS, MODS: MODS, failleDuJour: failleDuJour,
    genFloor: genFloor, bfsPath: bfsPath, walkable: walkable,
    makeGame: makeGame, step: step, cmdMove: cmdMove, cmdAttack: cmdAttack, cmdCast: cmdCast,
    finishRun: finishRun, serialize: serialize, restore: restore, autosave: autosave,
    hasSave: hasSave, loadSave: loadSave, deleteSave: deleteSave
  };
});
