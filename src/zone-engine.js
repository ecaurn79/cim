/* ============================================================
   LA ZONE — moteur v1 (survie FPS en raycasting, JS pur)
   Page 20 du hub C.I.M. — v20. Dépend de rpg-core.js (KERNEL).
   Conventions : positions en cases (float), 1 case = 8 m,
   grille grid[y][x], 0 = libre, 1..4 = murs. ES5, UMD.
   ============================================================ */
(function (root) {
  'use strict';
  var K = root.RPGCORE;
  if (!K || !K.makeRng) throw new Error('RPGCORE requis : chargez rpg-core.js avant zone-engine.js');

  var MAP = 64, TILE = 8; /* 64×64 cases → 512×512 m, monde clos */
  var Z = { MAP: MAP, TILE: TILE };
  Z.VERSION = '1.0';

  /* ══════════ CONTENU : anomalies, artefacts, arsenal, mutants, quêtes ══════════ */

  /* 6 anomalies — chaque type a un comportement lisible (et mortel) */
  Z.ANOMALIES = {
    tremplin: { n: 'Tremplin', col: '#cfd6c8', r: 0.34, d: 'Invisible. Le boulon la révèle ; elle vous projette et vous broie.' },
    torche:   { n: 'Torche', col: '#ff8a3c', r: 0.42, d: 'Crache un jet de flammes cyclique (4 s de repos, 1,2 s de feu).' },
    electra:  { n: 'Arc électrique', col: '#7ecbff', r: 0.40, d: 'Se recharge 3,5 s puis décharge : gros dégâts et étourdissement.' },
    vortex:   { n: 'Aspirateur', col: '#b48cff', r: 0.60, d: 'Vous aspire ; au centre, téléportation brutale quelque part ailleurs.' },
    brume:    { n: 'Brume acide', col: '#9fdc6a', r: 0.55, d: 'Nuage permanent : brûlure lente et faim accélérée.' },
    bourdon:  { n: 'Bourdon', col: '#ff6a8a', r: 0.48, d: 'Aura psychique : dégâts directs à la tête, sans armure qui tienne.' }
  };
  Z.ANOM_KEYS = ['tremplin', 'torche', 'electra', 'vortex', 'brume', 'bourdon'];

  /* 10 artefacts — chaque artefact a un bonus ET un malus (ceinture de 3) */
  Z.ARTEFACTS = {
    moelle:    { n: 'Moelle de ressort', src: 'tremplin', price: 160, bonus: { stamRegen: 0.25 }, malus: { hpMax: -8 },
                 d: '+25 % de régén d\u2019endurance · −8 PV max' },
    braise:    { n: 'Braise figée', src: 'torche', price: 180, bonus: { def: 0.06 }, malus: { faim: 0.15 },
                 d: '+6 % de défense · +15 % de faim' },
    cellule:   { n: 'Cellule vive', src: 'electra', price: 220, bonus: { speed: 0.10 }, malus: { rad: 0.15 },
                 d: '+10 % de vitesse · +15 % de radiation subie' },
    oeil:      { n: '\u0152il creux', src: 'vortex', price: 260, bonus: { rad: -0.25 }, malus: { dmgOut: -0.08 },
                 d: '−25 % de radiation subie · −8 % de dégâts infligés' },
    larmes:    { n: 'Larmes vertes', src: 'brume', price: 300, bonus: { hpRegen: 1.0 }, malus: { speed: -0.06 },
                 d: '+1 PV/s · −6 % de vitesse' },
    eclat:     { n: '\u00c9clat menteur', src: 'bourdon', price: 340, bonus: { dmgOut: 0.12 }, malus: { hpMax: -12 },
                 d: '+12 % de dégâts infligés · −12 PV max' },
    alliage:   { n: 'Alliage bleu', src: 'rare', price: 420, bonus: { def: 0.10 }, malus: { faim: 0.10 },
                 d: '+10 % de défense · +10 % de faim' },
    ambre:     { n: 'Larme d\u2019ambre', src: 'rare', price: 520, bonus: { hpRegen: 0.8 }, malus: { speed: -0.08 },
                 d: '+0,8 PV/s · −8 % de vitesse' },
    poussiere: { n: 'Poussière étoilée', src: 'rare', price: 640, bonus: { stamRegen: 0.20 }, malus: { rad: 0.20 },
                 d: '+20 % de régén d\u2019endurance · +20 % de radiation' },
    coeur:     { n: 'C\u0153ur de la Zone', src: 'unique', price: 2500, bonus: { hpMax: 15, rad: -0.30 }, malus: { speed: -0.10 },
                 d: '+15 PV max, −30 % de radiation · −10 % de vitesse' }
  };
  Z.ARTE_KEYS = ['moelle', 'braise', 'cellule', 'oeil', 'larmes', 'eclat', 'alliage', 'ambre', 'poussiere', 'coeur'];
  var ARTE_PAR_ANOMALIE = { tremplin: 'moelle', torche: 'braise', electra: 'cellule', vortex: 'oeil', brume: 'larmes', bourdon: 'eclat' };

  /* Arsenal : 3 armes, condition d\u2019usure, munitions rares */
  Z.ARMES = {
    couteau: { n: 'Couteau de prospection', melee: true, dmg: 12, rate: 0.45, range: 0.32, arc: 0.38, d: 'Silencieux, éternel. Court.' },
    pm:      { n: 'PM rouillé', dmg: 14, rate: 0.28, mag: 12, spread: 0.035, range: 5.0, ammo: 'munPm', loud: 4.0,
               d: 'Automatique imprécis. La cadence compense à moitié.' },
    fusil:   { n: 'Fusil de chasse', dmg: 9, pellets: 6, rate: 0.95, mag: 2, spread: 0.09, range: 2.4, ammo: 'munFu', loud: 5.0,
               d: 'Six plombs par coup. À bout portant, rien ne reste debout.' }
  };
  Z.ARMES_KEYS = ['couteau', 'pm', 'fusil'];

  /* Combinaisons : défense et pénétration radiologique */
  Z.COMBI = {
    usee:    { n: 'Combinaison usée', def: 0.00, rad: 1.00, price: 0 },
    blindee: { n: 'Combinaison blindée', def: 0.25, rad: 0.80, price: 2200 },
    scellee: { n: 'Combinaison scellée', def: 0.40, rad: 0.45, price: 5200 }
  };
  Z.COMBI_KEYS = ['usee', 'blindee', 'scellee'];

  /* Consommables & munitions */
  Z.ITEMS = {
    bandage:  { n: 'Bandage', price: 40, d: '+35 PV' },
    antirad:  { n: 'Anti-rad', price: 120, d: '−45 points de radiation' },
    conserve: { n: 'Conserve', price: 50, d: '+45 de faim' },
    saucisse: { n: 'Saucisse fumée', price: 80, d: '+70 de faim, +5 PV' },
    kit:      { n: 'Kit de réparation', price: 300, d: 'Remet une arme à 100 %' },
    munPm:    { n: 'Munitions 9 mm (×10)', price: 60, lot: 10 },
    munFu:    { n: 'Cartouches (×4)', price: 70, lot: 4 },
    pm:       { n: 'PM rouillé', price: 1500, arme: 'pm' },
    fusil:    { n: 'Fusil de chasse', price: 2400, arme: 'fusil' },
    blindee:  { n: 'Combinaison blindée', price: 2200, combi: 'blindee' },
    scellee:  { n: 'Combinaison scellée', price: 5200, combi: 'scellee', minDay: 3 }
  };
  Z.ITEM_KEYS = ['munPm', 'munFu', 'bandage', 'antirad', 'conserve', 'saucisse', 'kit', 'pm', 'fusil', 'blindee', 'scellee'];

  /* 3 mutants : le chien chasse en meute, l'aveugle garde les ruines, le rôdeur bondit */
  Z.MUTANTS = {
    chien:   { n: 'Chien de la Zone', hp: 26, dmg: 8,  speed: 0.78, aggro: 2.2, atkR: 0.24, cd: 1.1, rad: 0.16 },
    aveugle: { n: 'Aveugle', hp: 48, dmg: 14, speed: 0.45, aggro: 1.5, atkR: 0.22, cd: 1.6, rad: 0.30 },
    rodeur:  { n: 'Rôdeur', hp: 90, dmg: 22, speed: 0.62, aggro: 2.6, atkR: 0.30, cd: 1.8, rad: 0.40, lunge: true }
  };

  /* 5 quêtes simples — une active à la fois */
  Z.QUETES = [
    { key: 'marques', n: 'Marques de passage', d: 'Vendez ou remettez 2 artefacts au marchand.',
      note: 'Le détecteur chante près des anomalies.', cond: function (c) { return c.stats.artes >= 2; },
      prog: function (c) { return Math.min(2, c.stats.artes) + ' / 2'; }, rw: { credits: 400, items: { antirad: 2 } } },
    { key: 'chiens', n: 'Chiens en laisse', d: 'Abattez 6 chiens de la Zone.',
      cond: function (c) { return (c.kills.chien || 0) >= 6; },
      prog: function (c) { return Math.min(6, c.kills.chien || 0) + ' / 6'; }, rw: { credits: 350, items: { munFu: 8 } } },
    { key: 'epave', n: 'L\u2019épave du convoi', d: 'Atteignez l\u2019épave au nord-est, puis revenez au marchand.',
      cond: function (c) { return !!c.flags.epaveVu; },
      prog: function (c) { return c.flags.epaveVu ? 'épave atteinte — revenez' : 'épave non trouvée'; },
      rw: { credits: 500, items: { kit: 1 } } },
    { key: 'poudre', n: 'Poudre jaune', d: 'Livrez 3 anti-rad à l\u2019Avant-poste (nord).',
      at: 'N', cond: function (c) { return (c.inv.antirad || 0) >= 3; },
      prog: function (c) { return Math.min(3, c.inv.antirad || 0) + ' / 3 anti-rad'; },
      rw: { credits: 550, items: { munPm: 24 } }, consume: { antirad: 3 } },
    { key: 'coeur', n: 'Le C\u0153ur de la Zone', d: 'Rapportez l\u2019artefact unique « C\u0153ur de la Zone », quelque part au centre.',
      cond: function (c) { return c.locker.indexOf('coeur') >= 0 || c.belt.indexOf('coeur') >= 0; },
      prog: function (c) { return (c.locker.indexOf('coeur') >= 0 || c.belt.indexOf('coeur') >= 0) ? 'le C\u0153ur est là' : 'C\u0153ur non trouvé'; },
      rw: { credits: 1500 }, consumeArte: 'coeur' }
  ];

  /* ══════════ RAYCAST (cœur réutilisable : DDA sur grille) ══════════ */
  function castRay(grid, px, py, ang, maxD) {
    var sin = Math.sin(ang), cos = Math.cos(ang);
    var mapX = px | 0, mapY = py | 0;
    var ddx = Math.abs(1 / cos), ddy = Math.abs(1 / sin); /* Infinity géré par comparaison */
    var stepX, stepY, sdx, sdy, side = 0, wall = 0, guard = 0, d = maxD || MAP;
    if (cos < 0) { stepX = -1; sdx = (px - mapX) * ddx; } else { stepX = 1; sdx = (mapX + 1 - px) * ddx; }
    if (sin < 0) { stepY = -1; sdy = (py - mapY) * ddy; } else { stepY = 1; sdy = (mapY + 1 - py) * ddy; }
    while (guard++ < 200) {
      if (sdx < sdy) { d = sdx; sdx += ddx; mapX += stepX; side = 0; }
      else { d = sdy; sdy += ddy; mapY += stepY; side = 1; }
      if (mapX < 0 || mapY < 0 || mapX >= MAP || mapY >= MAP) { wall = 1; break; }
      wall = grid[mapY][mapX];
      if (wall) break;
      if (maxD && d >= maxD) return { d: maxD, wall: 0, side: side, wx: 0 };
    }
    if (wall === 0) return { d: maxD || MAP, wall: 0, side: side, wx: 0 };
    var hx = px + cos * d, hy = py + sin * d;
    var wx = side === 0 ? hy - Math.floor(hy) : hx - Math.floor(hx);
    return { d: d, wall: wall, side: side, wx: wx };
  }
  Z.castRay = castRay;

  function los(grid, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.001) return true;
    var hit = castRay(grid, x1, y1, Math.atan2(dy, dx), dist);
    return hit.wall === 0;
  }
  Z.los = los;

  /* ══════════ GÉNÉRATION DU MONDE (déterministe par jour) ══════════ */
  function solid(g, x, y) {
    if (x < 0 || y < 0 || x >= MAP || y >= MAP) return true;
    return g[y][x] !== 0;
  }
  function clearRect(g, x0, y0, x1, y1) {
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) g[y][x] = 0;
  }
  function reachable(g, sx, sy) {
    var seen = {}, q = [[sx, sy]], n = 0;
    seen[sy * MAP + sx] = 1;
    while (q.length) {
      var c = q.shift(); n++;
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < 4; i++) {
        var nx = c[0] + dirs[i][0], ny = c[1] + dirs[i][1], k = ny * MAP + nx;
        if (nx < 0 || ny < 0 || nx >= MAP || ny >= MAP || seen[k] || g[ny][nx] !== 0) continue;
        seen[k] = 1; q.push([nx, ny]);
      }
    }
    return seen;
  }

  Z.genWorld = function (day, opts) {
    opts = opts || {};
    var rng = K.makeRng('zone-j' + day);
    var g = [], y, x, i;
    for (y = 0; y < MAP; y++) { g.push([]); for (x = 0; x < MAP; x++) g[y].push(0); }
    for (x = 0; x < MAP; x++) { g[0][x] = 1; g[MAP - 1][x] = 1; }
    for (y = 0; y < MAP; y++) { g[y][0] = 1; g[y][MAP - 1] = 1; }

    var campS = { x: 29.5, y: 55.5, r: 4.5, n: 'Le Hangar', at: 'S' };
    var campN = { x: 31.5, y: 6.5, r: 4.0, n: 'L\u2019Avant-poste', at: 'N' };
    clearRect(g, 25, 52, 35, 59);
    clearRect(g, 27, 3, 37, 10);
    /* routes : axe nord-sud + traverse est-ouest */
    clearRect(g, 29, 4, 33, 58);
    clearRect(g, 6, 30, 58, 33);

    /* ruines : 34 blocs aux murs percés */
    for (i = 0; i < 34; i++) {
      var w = 3 + Math.floor(rng() * 6), h = 3 + Math.floor(rng() * 5);
      var rx = 3 + Math.floor(rng() * (MAP - 6 - w)), ry = 3 + Math.floor(rng() * (MAP - 6 - h));
      if (rx >= 24 && rx <= 36 && ry >= 2 && ry <= 60) continue;            /* route verticale */
      if (ry >= 29 && ry <= 34) continue;                                    /* route horizontale */
      if (Math.abs(rx - campS.x) < 9 && Math.abs(ry - campS.y) < 8) continue;
      if (Math.abs(rx - campN.x) < 9 && Math.abs(ry - campN.y) < 8) continue;
      var t = K.pick(rng, [1, 1, 2, 2, 3]);
      for (y = ry; y < ry + h; y++) for (x = rx; x < rx + w; x++) {
        if (x === rx || x === rx + w - 1 || y === ry || y === ry + h - 1) g[y][x] = t;
      }
      var holes = 1 + Math.floor(rng() * 2);
      for (var hh = 0; hh < holes; hh++) {
        var hx2 = rx + 1 + Math.floor(rng() * (w - 2)), hy2 = rng() < 0.5 ? ry : ry + h - 1;
        g[hy2][hx2] = 0;
      }
    }

    /* zones de radiation (le nord est le pire) */
    var rad = [];
    for (i = 0; i < 8; i++) {
      var rax = 6 + rng() * 52, ray = 4 + rng() * 40 + (rng() < 0.5 ? 0 : 18);
      rad.push({ x: rax, y: Math.min(ray, 58), r: 2 + rng() * 3, int: 0.4 + rng() * 0.6 });
    }

    /* anomalies : 16, espacées, jamais dans les camps ni sur les routes */
    var anom = [], tries = 0;
    while (anom.length < 16 && tries++ < 600) {
      var ax = 3 + rng() * (MAP - 6), ay = 3 + rng() * (MAP - 6);
      if (Math.abs(ax - 31.5) < 4.5) continue;                       /* route verticale */
      if (ay > 29 && ay < 34) continue;                              /* route horizontale */
      var nearCamp = Math.sqrt((ax - campS.x) * (ax - campS.x) + (ay - campS.y) * (ay - campS.y)) < campS.r + 2 ||
                     Math.sqrt((ax - campN.x) * (ax - campN.x) + (ay - campN.y) * (ay - campN.y)) < campN.r + 2;
      if (nearCamp) continue;
      var ok = true;
      for (i = 0; i < anom.length; i++) {
        if (Math.abs(anom[i].x - ax) + Math.abs(anom[i].y - ay) < 5) { ok = false; break; }
      }
      if (!ok) continue;
      var type = Z.ANOM_KEYS[Math.floor(rng() * 6)];
      anom.push({ x: ax, y: ay, type: type, ph: rng(), cd: 0, rev: 0, ph2: rng() * 4 });
    }

    /* artefacts : 8 collés à leur anomalie-mère */
    var arte = [];
    var mamas = anom.slice().sort(function () { return rng() - 0.5; });
    for (i = 0; i < 8 && i < mamas.length; i++) {
      var m = mamas[i];
      var a = ARTE_PAR_ANOMALIE[m.type];
      if (!a) continue;
      var ang = rng() * Math.PI * 2, dd = 0.8 + rng() * 0.8;
      arte.push({ key: a, x: m.x + Math.cos(ang) * dd, y: m.y + Math.sin(ang) * dd, taken: false });
    }
    if (opts.coeur) arte.push({ key: 'coeur', x: 32, y: 32, taken: false });

    /* caches : 6 caisses, dont une contient parfois un artefact rare */
    var stashes = [], rares = ['alliage', 'ambre', 'poussiere'];
    var rareDonne = false;
    for (i = 0; i < 6; i++) {
      var sx2 = 4 + rng() * (MAP - 8), sy2 = 4 + rng() * (MAP - 8);
      if (Math.abs(sx2 - 31.5) < 4 && sy2 > 29 && sy2 < 34) sx2 += 6;
      var loot = {};
      var roll = rng();
      if (roll < 0.3) loot.munPm = 8 + Math.floor(rng() * 9);
      else if (roll < 0.55) loot.munFu = 4 + Math.floor(rng() * 5);
      else if (roll < 0.75) { loot.bandage = 1 + Math.floor(rng() * 2); loot.conserve = 1; }
      else { loot.antirad = 1; loot.saucisse = 1; }
      if (!rareDonne && rng() < 0.35) { loot.arte = rares[Math.floor(rng() * 3)]; rareDonne = true; }
      stashes.push({ x: sx2, y: sy2, opened: false, loot: loot });
    }

    /* mutants : meutes de chiens, aveugles dans les ruines, un rôdeur alpha au centre */
    var muts = [], idc = 0;
    function spawn(t, mx, my) {
      muts.push({ id: idc++, type: t, x: mx, y: my, hp: Z.MUTANTS[t].hp, st: 'idle', tx: mx, ty: my, cd: 0, wt: rng() * 3, alert: 0 });
    }
    /* ni sur les routes ni près des camps : le danger ne dort pas au portail (l'alpha du centre, si) */
    function mauvaisCoin(x, y) {
      if (Math.abs(x - campS.x) < 9 && Math.abs(y - campS.y) < 9) return true;
      if (Math.abs(x - campN.x) < 9 && Math.abs(y - campN.y) < 9) return true;
      if (Math.abs(x - 31.5) < 3.5 && y > 3 && y < 59) return true;
      if (y > 29 && y < 34) return true;
      return false;
    }
    for (i = 0; i < 5; i++) {
      var px2 = 0, py2 = 0, ok2 = false;
      for (var tr = 0; tr < 40 && !ok2; tr++) {
        px2 = 5 + rng() * 54; py2 = 4 + rng() * 56;
        ok2 = !mauvaisCoin(px2, py2);
      }
      if (!ok2) continue;
      var n2 = 3 + Math.floor(rng() * 3);
      for (var j = 0; j < n2; j++) spawn('chien', px2 + rng() * 2 - 1, py2 + rng() * 2 - 1);
    }
    for (i = 0; i < 4; i++) {
      var ax9 = 5 + rng() * 54, ay9 = 12 + rng() * 40, tr9 = 0;
      while (mauvaisCoin(ax9, ay9) && tr9++ < 40) { ax9 = 5 + rng() * 54; ay9 = 12 + rng() * 40; }
      spawn('aveugle', ax9, ay9);
    }
    spawn('rodeur', 32 + rng() * 3 - 1.5, 32 + rng() * 3 - 1.5); /* l'alpha garde le centre */

    /* props : l'épave (quête 3) + arbres morts décoratifs */
    var props = [{ x: 52, y: 9, k: 'epave', r: 0.4 }];
    for (i = 0; i < 14; i++) {
      var tx2 = 3 + rng() * (MAP - 6), ty2 = 3 + rng() * (MAP - 6);
      if (Math.abs(tx2 - 31.5) < 4.2 || (ty2 > 29 && ty2 < 34)) continue;
      if (Math.abs(tx2 - campS.x) < 6 && Math.abs(ty2 - campS.y) < 6) continue;
      if (Math.abs(tx2 - campN.x) < 6 && Math.abs(ty2 - campN.y) < 6) continue;
      props.push({ x: tx2, y: ty2, k: 'arbre', r: 0.25 });
    }

    /* connexité : BFS depuis le Hangar, on creuse en L vers les points clés orphelins */
    for (var pass = 0; pass < 3; pass++) {
      var seen = reachable(g, 29, 55);
      function carve(x1, y1, x2, y2) {
        var cx = x1, cy = y1;
        while (cx !== x2) { g[cy][cx] = 0; cx += cx < x2 ? 1 : -1; }
        while (cy !== y2) { g[cy][cx] = 0; cy += cy < y2 ? 1 : -1; }
        g[cy][cx] = 0;
      }
      function need(px3, py3) {
        var ix = Math.max(1, Math.min(MAP - 2, px3 | 0)), iy = Math.max(1, Math.min(MAP - 2, py3 | 0));
        if (!seen[iy * MAP + ix]) carve(29, 55, ix, iy);
      }
      need(campN.x, campN.y); need(52, 9);
      for (i = 0; i < anom.length; i++) need(anom[i].x, anom[i].y);
      for (i = 0; i < stashes.length; i++) need(stashes[i].x, stashes[i].y);
      for (i = 0; i < arte.length; i++) need(arte[i].x, arte[i].y);
      var safeCells = [];
      for (var sy3 = 1; sy3 < MAP - 1; sy3 += 2) for (var sx3 = 1; sx3 < MAP - 1; sx3 += 2) {
        if (seen[sy3 * MAP + sx3] && !mauvaisCoin(sx3 + 0.5, sy3 + 0.5)) safeCells.push([sx3 + 0.5, sy3 + 0.5]);
      }
      for (i = 0; i < muts.length; i++) {
        var mm = muts[i];
        if (!seen[(mm.y | 0) * MAP + (mm.x | 0)] && safeCells.length) {
          var sc2 = safeCells[Math.floor(rng() * safeCells.length)];
          mm.x = sc2[0]; mm.y = sc2[1];
        }
      }
    }

    return {
      grid: g, anom: anom, arte: arte, stash: stashes, muts: muts, rad: rad, props: props,
      campS: campS, campN: campN, epave: props[0]
    };
  };

  /* ══════════ CAMP : état persistant ══════════ */
  Z.newCamp = function () {
    return {
      v: 1, day: 1, credits: 350,
      hp: 100, rad: 0, faim: 100,
      weapons: { couteau: { cond: 100 }, pm: { cond: 88 } },
      suit: 'usee', cur: 'pm',
      inv: { munPm: 18, munFu: 0, bandage: 2, antirad: 1, conserve: 1, saucisse: 0, kit: 0 },
      belt: [], locker: [],
      quests: { marques: 'libre', chiens: 'libre', epave: 'libre', poudre: 'libre', coeur: 'libre' },
      kills: {}, stats: { artes: 0 }, flags: {},
      best: { days: 1, arte: 0, quetes: 0, kills: 0 },
      mute: false
    };
  };

  Z.saveCamp = function (camp) {
    try { localStorage.setItem('zone_save', K.saveGame(camp)); } catch (e) { /* pas grave */ }
    try {
      var b = null;
      try { b = JSON.parse(localStorage.getItem('zone_best') || 'null'); } catch (e2) { b = null; }
      if (!b) b = { days: 1, arte: 0, quetes: 0, kills: 0 };
      if (camp.best.days > b.days) b.days = camp.best.days;
      if (camp.best.arte > b.arte) b.arte = camp.best.arte;
      if (camp.best.quetes > b.quetes) b.quetes = camp.best.quetes;
      if (camp.best.kills > b.kills) b.kills = camp.best.kills;
      localStorage.setItem('zone_best', JSON.stringify(b));
    } catch (e3) { /* pas grave */ }
  };
  Z.loadCamp = function () {
    try {
      var raw = localStorage.getItem('zone_save');
      if (!raw) return null;
      return K.loadGame(raw);
    } catch (e) { return null; }
  };
  Z.records = function () {
    try { return JSON.parse(localStorage.getItem('zone_best') || 'null') || null; } catch (e) { return null; }
  };

  /* somme des effets ceinture + combinaison */
  Z.arteStats = function (camp) {
    var s = { hpMax: 0, speed: 0, dmgOut: 0, def: 0, rad: 0, stamRegen: 0, hpRegen: 0, faim: 0 };
    for (var i = 0; i < camp.belt.length; i++) {
      var a = Z.ARTEFACTS[camp.belt[i]];
      if (!a) continue;
      var kk, b = a.bonus, m = a.malus;
      for (kk in b) s[kk] = (s[kk] || 0) + b[kk];
      for (kk in m) s[kk] = (s[kk] || 0) + m[kk];
    }
    var suit = Z.COMBI[camp.suit] || Z.COMBI.usee;
    s.def += suit.def; s.rad += suit.rad;
    s.def = Math.max(0, Math.min(0.65, s.def));
    s.rad = Math.max(0.15, s.rad);
    return s;
  };

  /* ══════════ EXPÉDITION ══════════ */
  Z.startExpedition = function (camp, atCamp) {
    var q = camp.quests;
    var W2 = Z.genWorld(camp.day, { coeur: q.coeur === 'active' });
    var home = atCamp === 'N' ? W2.campN : W2.campS;
    var rr = K.makeRng('redout-j' + camp.day);
    var G = {
      camp: camp, W: W2, atCamp: atCamp,
      p: { x: home.x, y: home.y, a: -Math.PI / 2, st: 100, stun: 0, bob: 0 },
      time: 0, wcd: 0, reloading: 0, flash: 0, shake: 0, dmg: 0, psy: 0,
      bolts: [], bag: [], explored: {}, exT: 0,
      ch: { pm: Math.min(12, camp.inv.munPm || 0), fusil: Math.min(2, camp.inv.munFu || 0) },
      redout: { t: 210 + rr() * 110, phase: 'calme', t2: 0 },
      msgs: [], fx: [], stats: { kills: 0, arte: 0 }, over: ''
    };
    camp.inv.munPm = Math.max(0, (camp.inv.munPm || 0) - G.ch.pm);
    camp.inv.munFu = Math.max(0, (camp.inv.munFu || 0) - G.ch.fusil);
    msg(G, 'Jour ' + camp.day + ' — la Clôture s\u2019ouvre. La Zone est à vous… jusqu\u2019à la prochaine émission.');
    return G;
  };

  function msg(G, txt) { G.msgs.push({ txt: txt, at: G.time }); }
  function fx(G, t, x, y) { G.fx.push({ t: t, x: x, y: y, at: G.time }); }
  function meter(ax, ay) { return Math.sqrt(ax * ax + ay * ay); }

  /* case libre la plus proche (téléport vortex / anti-coïncidence) */
  function freeCell(g, x, y) {
    var ix = Math.max(1, Math.min(MAP - 2, x | 0)), iy = Math.max(1, Math.min(MAP - 2, y | 0));
    if (!solid(g, ix, iy)) return { x: ix + 0.5, y: iy + 0.5 };
    for (var r = 1; r < 8; r++) {
      for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        var nx = ix + dx, ny = iy + dy;
        if (nx > 0 && ny > 0 && nx < MAP - 1 && ny < MAP - 1 && !solid(g, nx, ny)) return { x: nx + 0.5, y: ny + 0.5 };
      }
    }
    return { x: 29.5, y: 55.5 };
  }

  function moveWithCollision(g, o, dx, dy, rad) {
    if (!solid(g, (o.x + dx + (dx > 0 ? rad : -rad)) | 0, o.y | 0) &&
        !solid(g, (o.x + dx + (dx > 0 ? rad : -rad)) | 0, (o.y + rad) | 0) &&
        !solid(g, (o.x + dx + (dx > 0 ? rad : -rad)) | 0, (o.y - rad) | 0)) o.x += dx;
    if (!solid(g, o.x | 0, (o.y + dy + (dy > 0 ? rad : -rad)) | 0) &&
        !solid(g, (o.x + rad) | 0, (o.y + dy + (dy > 0 ? rad : -rad)) | 0) &&
        !solid(g, (o.x - rad) | 0, (o.y + dy + (dy > 0 ? rad : -rad)) | 0)) o.y += dy;
  }

  function hurtPlayer(G, amount, kind) {
    var st = Z.arteStats(G.camp);
    var real = amount * (1 - st.def);
    if (kind === 'psy') real = amount; /* le bourdon ignore l'armure */
    G.camp.hp -= real;
    G.dmg = Math.min(1, G.dmg + real / 40);
    G.shake = Math.min(1, G.shake + real / 30);
    if (G.camp.hp <= 0) { G.camp.hp = 0; G.over = 'dead'; msg(G, 'Le noir. La Zone reprend ce qui traîne…'); }
    return real;
  }

  /* ══════════ PAS DE SIMULATION ══════════ */
  Z.step = function (G, dt) {
    if (G.over) return;
    dt = Math.min(dt, 0.05);
    G.time += dt;
    var camp = G.camp, W2 = G.W, g = W2.grid, p = G.p, st = Z.arteStats(camp);

    /* jauges */
    var faimMul = 1 + Math.max(0, st.faim);
    camp.faim = Math.max(0, camp.faim - dt * 0.30 * faimMul);
    if (camp.faim <= 0) hurtPlayer(G, dt * 0.5);
    if (camp.faim > 70 && camp.hp > 0 && camp.hp < 100 + st.hpMax) camp.hp = Math.min(100 + st.hpMax, camp.hp + dt * (0.8 + st.hpRegen));
    if (st.hpRegen && camp.faim <= 70 && camp.hp > 0) camp.hp = Math.min(100 + st.hpMax, camp.hp + dt * st.hpRegen * 0.5);

    /* radiation des zones chaudes */
    var rate = 0, i;
    for (i = 0; i < W2.rad.length; i++) {
      var rz = W2.rad[i], dx = p.x - rz.x, dy = p.y - rz.y, dd = Math.sqrt(dx * dx + dy * dy);
      if (dd < rz.r) rate += rz.int * (1 - dd / rz.r);
    }
    rate = Math.min(1, rate) * st.rad;
    G.radRate = rate;
    camp.rad = Math.min(100, camp.rad + rate * dt * 6);
    if (camp.rad > 60) hurtPlayer(G, ((camp.rad - 60) / 40) * 0.9 * dt);

    /* anomalies */
    for (i = 0; i < W2.anom.length; i++) {
      var an = W2.anom[i], A = Z.ANOMALIES[an.type];
      var ddx2 = p.x - an.x, ddy2 = p.y - an.y, dist = Math.sqrt(ddx2 * ddx2 + ddy2 * ddy2);
      if (an.rev > 0 && G.time > an.rev) an.rev = 0;
      if (an.type === 'torche') {
        var cyc = (G.time / 5 + an.ph2) % 1;
        an.hot = cyc > 0.76;
        if (an.hot && dist < A.r + 0.1) { hurtPlayer(G, 18 * dt); if (dist < 1.2) fx(G, 'flame', an.x, an.y); }
      } else if (an.type === 'electra') {
        an.cd -= dt;
        if (an.cd <= 0) {
          an.cd = 3.2 + ((p.x * 7 + an.ph2 * 13) % 1);
          fx(G, 'zap', an.x, an.y);
          if (dist < A.r) { hurtPlayer(G, 22); p.stun = 0.9; msg(G, 'L\u2019Arc vous traverse. Vos dents brillent dans le noir.'); }
        }
      } else if (an.type === 'tremplin') {
        if (dist < A.r && (an.cdT || 0) <= G.time) {
          an.cdT = G.time + 1.5;
          an.rev = G.time + 20;
          fx(G, 'spring', an.x, an.y);
          var kn = Math.max(0.2, dist);
          moveWithCollision(g, p, (ddx2 / kn) * 1.0, (ddy2 / kn) * 1.0, 0.2);
          hurtPlayer(G, 25);
          msg(G, 'Tremplin ! Vous voilà projeté comme un chiffon.');
        }
      } else if (an.type === 'vortex') {
        if (dist < A.r && dist > 0.01) {
          var pull = 0.9 * (1 - dist / A.r) * dt;
          moveWithCollision(g, p, (-ddx2 / dist) * pull, (-ddy2 / dist) * pull, 0.2);
          if (dist < 0.18) {
            var tx3 = p.x + (Math.random() * 12 - 6), ty3 = p.y + (Math.random() * 12 - 6);
            var fc = freeCell(g, tx3, ty3);
            p.x = fc.x; p.y = fc.y;
            hurtPlayer(G, 12);
            fx(G, 'tele', an.x, an.y);
            msg(G, 'L\u2019Aspirateur vous recrache ailleurs. La boussole déraille.');
          }
        }
      } else if (an.type === 'brume') {
        if (dist < A.r) { hurtPlayer(G, 6 * dt); camp.faim = Math.max(0, camp.faim - dt * 0.5); }
      } else if (an.type === 'bourdon') {
        if (dist < A.r) { G.psy = 1; hurtPlayer(G, 5 * dt, 'psy'); }
      }
    }
    if (G.psy > 0) G.psy = Math.max(0, G.psy - dt * 2);

    /* boulons */
    for (i = G.bolts.length - 1; i >= 0; i--) {
      var b = G.bolts[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.vz -= 9.8 * dt;
      if (b.z <= 0) { b.z = 0; b.vx = 0; b.vy = 0; b.vz = 0; b.rest = true; }
      if (solid(g, b.x | 0, b.y | 0)) { b.x -= b.vx * dt; b.y -= b.vy * dt; b.vx = 0; b.vy = 0; b.z = 0; b.vz = 0; b.rest = true; }
      if (b.rest) {
        for (var j = 0; j < W2.anom.length; j++) {
          var an2 = W2.anom[j];
          if (an2.type !== 'tremplin') continue;
          var bd = Math.sqrt((b.x - an2.x) * (b.x - an2.x) + (b.y - an2.y) * (b.y - an2.y));
          if (bd < 0.45) {
            an2.rev = G.time + 20;
            fx(G, 'spring', an2.x, an2.y);
            msg(G, 'Cling… Le boulon a trouvé un Tremplin. Vous le voyez maintenant.');
            G.bolts.splice(i, 1);
            break;
          }
        }
      }
    }

    /* mutants */
    for (i = 0; i < W2.muts.length; i++) {
      var mu = W2.muts[i];
      if (mu.hp <= 0) continue;
      var M = Z.MUTANTS[mu.type];
      var mdx = p.x - mu.x, mdy = p.y - mu.y, md = Math.sqrt(mdx * mdx + mdy * mdy);
      mu.cd -= dt;
      var spd = M.speed * (p.stun > 0 ? 0.6 : 1);
      if (mu.st === 'idle') {
        mu.wt -= dt;
        if (mu.wt <= 0) { mu.wt = 2 + Math.random() * 3; mu.tx = mu.x + Math.random() * 6 - 3; mu.ty = mu.y + Math.random() * 6 - 3; }
        var wdx = mu.tx - mu.x, wdy = mu.ty - mu.y, wd = meter(wdx, wdy);
        if (wd > 0.2) moveWithCollision(g, mu, (wdx / wd) * spd * 0.4 * dt, (wdy / wd) * spd * 0.4 * dt, 0.15);
        if (md < M.aggro && los(g, mu.x, mu.y, p.x, p.y)) { mu.st = 'chase'; fx(G, 'growl', mu.x, mu.y); }
      } else if (mu.st === 'chase') {
        if (md > M.aggro * 2.6) { mu.st = 'idle'; continue; }
        var spd2 = spd * (M.lunge && mu.lungeT > 0 ? 1.9 : 1);
        if (M.lunge) {
          mu.lungeCd = (mu.lungeCd || 2.5) - dt;
          if (mu.lungeCd <= 0 && md < 1.2) { mu.lungeT = 0.4; mu.lungeCd = 2.5; }
          if (mu.lungeT > 0) mu.lungeT -= dt;
        }
        if (md > M.atkR * 0.8) moveWithCollision(g, mu, (mdx / md) * spd2 * dt, (mdy / md) * spd2 * dt, 0.15);
        if (md < M.atkR && mu.cd <= 0) {
          mu.cd = M.cd;
          hurtPlayer(G, M.dmg);
          fx(G, 'bite', mu.x, mu.y);
          msg(G, M.n + ' — morsure !');
        }
      }
    }

    /* endurance & stun */
    if (p.stun > 0) p.stun -= dt;
    if (!G.sprinting) p.st = Math.min(100, p.st + dt * 13 * (1 + (st.stamRegen || 0)));
    G.wcd = Math.max(0, G.wcd - dt);
    if (G.reloading > 0) {
      G.reloading -= dt;
      if (G.reloading <= 0 && G.reloadW) {
        var wpR = Z.ARMES[G.reloadW];
        G.ch = G.ch || {};
        var need = wpR.mag - (G.ch[G.reloadW] || 0);
        var take = Math.min(need, camp.inv[wpR.ammo] || 0);
        G.ch[G.reloadW] = (G.ch[G.reloadW] || 0) + take;
        camp.inv[wpR.ammo] -= take;
        G.reloadW = null;
      }
    }
    G.flash = Math.max(0, G.flash - dt);
    G.shake = Math.max(0, G.shake - dt * 2.2);
    G.dmg = Math.max(0, G.dmg - dt * 1.4);

    /* émission (Redout) */
    var R = G.redout;
    if (R.phase === 'calme' || R.phase === 'alerte') {
      R.t -= dt;
      if (R.t <= 45 && R.phase === 'calme') { R.phase = 'alerte'; msg(G, 'SIRÈNE — Émission dans moins de 45 secondes. Courez à l\u2019abri.'); }
      if (R.t <= 0) { R.phase = 'plein'; R.t2 = 25; msg(G, 'LE CIEL SE DÉCHIRE. Restez sous un toit !'); }
    } else if (R.phase === 'plein') {
      R.t2 -= dt;
      var inS = Math.sqrt((p.x - W2.campS.x) * (p.x - W2.campS.x) + (p.y - W2.campS.y) * (p.y - W2.campS.y)) < W2.campS.r;
      var inN = Math.sqrt((p.x - W2.campN.x) * (p.x - W2.campN.x) + (p.y - W2.campN.y) * (p.y - W2.campN.y)) < W2.campN.r;
      if (!inS && !inN) { hurtPlayer(G, 7 * dt, 'psy'); camp.rad = Math.min(100, camp.rad + dt * 3); }
      if (R.t2 <= 0) { R.phase = 'fin'; msg(G, 'L\u2019émission passe. La Zone fume, puis se rendort.'); }
    }

    /* brouillard de guerre du PDA */
    G.exT -= dt;
    if (G.exT <= 0) {
      G.exT = 0.35;
      var ix0 = Math.max(0, (p.x - 10) | 0), ix1 = Math.min(MAP - 1, (p.x + 10) | 0);
      var iy0 = Math.max(0, (p.y - 10) | 0), iy1 = Math.min(MAP - 1, (p.y + 10) | 0);
      for (var ey = iy0; ey <= iy1; ey++) for (var ex = ix0; ex <= ix1; ex++) {
        if ((ex - p.x) * (ex - p.x) + (ey - p.y) * (ey - p.y) < 100) G.explored[ey * MAP + ex] = 1;
      }
    }

    /* la Zone ne pardonne pas */
    if (camp.hp <= 0) G.over = 'dead';
  };

  /* ══════════ COMMANDES ══════════ */
  Z.cmdMove = function (G, fwd, strafe, dt, sprint) {
    if (G.over) return;
    var p = G.p, st = Z.arteStats(G.camp);
    var maxSt = 100 * (G.camp.faim > 25 ? 1 : 0.55);
    G.sprinting = false;
    var spd = 0.55 * (1 + (st.speed || 0));
    if (sprint && p.st > 1 && (fwd || strafe) && p.stun <= 0) {
      spd = 0.95 * (1 + (st.speed || 0)); G.sprinting = true;
      p.st = Math.max(0, p.st - dt * 20);
    }
    if (p.stun > 0) spd *= 0.35;
    var sin = Math.sin(p.a), cos = Math.cos(p.a);
    var dx = (cos * fwd - sin * strafe) * spd * dt;
    var dy = (sin * fwd + cos * strafe) * spd * dt;
    if (dx || dy) {
      moveWithCollision(G.W.grid, p, dx, dy, 0.2);
      p.bob += dt * (G.sprinting ? 11 : 7);
      /* les anomalies n'attendent pas que vous soyez immobiles : step() s'en charge */
    }
  };
  Z.cmdTurn = function (G, da) { if (!G.over) G.p.a += da; };

  function nearestMutantInCone(G, ang, arc, range) {
    var best = null, bestT = 1e9;
    var sin = Math.sin(ang), cos = Math.cos(ang);
    for (var i = 0; i < G.W.muts.length; i++) {
      var mu = G.W.muts[i];
      if (mu.hp <= 0) continue;
      var dx = mu.x - G.p.x, dy = mu.y - G.p.y;
      var t = dx * cos + dy * sin;
      if (t < 0.2 || t > range) continue;
      var perp = Math.abs(-dx * sin + dy * cos);
      if (perp > 0.22 + t * arc) continue;
      if (t < bestT) { bestT = t; best = mu; }
    }
    return best ? { mu: best, t: bestT } : null;
  }

  Z.cmdFire = function (G) {
    if (G.over || G.wcd > 0 || G.reloading > 0) return false;
    var camp = G.camp, key = camp.cur, wp = Z.ARMES[key], wst = camp.weapons[key];
    if (!wst) return false;
    if (!wp.melee) {
      G.ch = G.ch || {};
      if ((G.ch[key] || 0) <= 0) { msg(G, 'Clic — chargeur vide (R pour recharger).'); G.wcd = 0.4; return false; }
      G.ch[key] -= 1;
      G.wcd = wp.rate;
      G.flash = 0.07;
      /*condition & encrassement */
      var misfire = (1 - wst.cond / 100) * 0.22;
      if (Math.random() < misfire) { msg(G, 'Enrayé ! L\u2019arme tousse plus qu\u2019elle ne tire.'); G.wcd = wp.rate * 2; return true; }
    } else {
      G.wcd = wp.rate;
      G.flash = 0.12;
    }
    var st = Z.arteStats(camp);
    var dmgMul = (0.5 + 0.5 * (wst.cond / 100)) * (1 + (st.dmgOut || 0));
    var pellets = wp.pellets || 1;
    var hits = 0;
    for (var i = 0; i < pellets; i++) {
      var ang = G.p.a + (Math.random() * 2 - 1) * (wp.spread || wp.arc || 0);
      var wallHit = castRay(G.W.grid, G.p.x, G.p.y, ang, wp.range);
      var maxD = Math.min(wp.range, wallHit.d);
      var found = nearestMutantInCone(G, ang, wp.melee ? wp.arc : wp.spread, maxD);
      if (found) {
        var target = found.mu;
        var falloff = wp.melee ? 1 : 1 - 0.45 * Math.min(1, found.t / wp.range);
        var dmg = wp.dmg * dmgMul * falloff;
        target.hp -= dmg;
        hits++;
        fx(G, 'hit', target.x, target.y);
        if (target.hp <= 0) {
          target.st = 'dead';
          G.stats.kills++;
          var kk = target.type;
          camp.kills[kk] = (camp.kills[kk] || 0) + 1;
          camp.best.kills++;
          msg(G, Z.MUTANTS[kk].n + ' abattu.');
          if (target.type === 'rodeur') {
            target.drop = 'poussiere';
            msg(G, 'Le Rôdeur laisse tomber quelque chose qui brille…');
          }
        }
      }
    }
    if (hits && !wp.melee) G.shake = Math.min(1, G.shake + 0.12);
    if (!wp.melee) {
      wst.cond = Math.max(5, wst.cond - 0.12);
      /* le vacarme attire */
      for (var j = 0; j < G.W.muts.length; j++) {
        var mu2 = G.W.muts[j];
        if (mu2.hp <= 0 || mu2.st === 'chase') continue;
        var dd2 = Math.sqrt((mu2.x - G.p.x) * (mu2.x - G.p.x) + (mu2.y - G.p.y) * (mu2.y - G.p.y));
        if (dd2 < (wp.loud || 3)) { mu2.st = 'chase'; }
      }
    }
    return true;
  };

  Z.cmdReload = function (G) {
    var camp = G.camp, wp = Z.ARMES[camp.cur];
    if (!wp || wp.melee || G.reloading > 0) return false;
    G.ch = G.ch || {};
    var have = G.ch[camp.cur] || 0;
    if (have >= wp.mag) return false;
    if ((camp.inv[wp.ammo] || 0) <= 0) { msg(G, 'Plus une munition. Le couteau fera l\u2019affaire.'); return false; }
    G.reloading = 1.4;
    G.reloadW = camp.cur;
    msg(G, 'Rechargement…');
    return true;
  };

  Z.cmdBolt = function (G) {
    if (G.over) return false;
    var sin = Math.sin(G.p.a), cos = Math.cos(G.p.a);
    G.bolts.push({ x: G.p.x + cos * 0.3, y: G.p.y + sin * 0.3, vx: cos * 2.6, vy: sin * 2.6, z: 1.2, vz: 2.2, rest: false });
    G.wcd = Math.max(G.wcd, 0.35);
    return true;
  };

  Z.cmdInteract = function (G) {
    if (G.over) return { t: 'rien' };
    var W2 = G.W, camp = G.camp, i, best = null, bestD = 0.5;
    /* artefacts */
    for (i = 0; i < W2.arte.length; i++) {
      var a = W2.arte[i];
      if (a.taken) continue;
      var d = Math.sqrt((a.x - G.p.x) * (a.x - G.p.x) + (a.y - G.p.y) * (a.y - G.p.y));
      if (d < bestD) { best = { t: 'arte', ref: a, d: d }; bestD = d; }
    }
    /* caches */
    for (i = 0; i < W2.stash.length; i++) {
      var s = W2.stash[i];
      if (s.opened) continue;
      var d2 = Math.sqrt((s.x - G.p.x) * (s.x - G.p.x) + (s.y - G.p.y) * (s.y - G.p.y));
      if (d2 < bestD) { best = { t: 'stash', ref: s, d: d2 }; bestD = d2; }
    }
    /* camps : entrer */
    for (i = 0; i < 2; i++) {
      var c = i === 0 ? W2.campS : W2.campN;
      var d3 = Math.sqrt((c.x - G.p.x) * (c.x - G.p.x) + (c.y - G.p.y) * (c.y - G.p.y));
      if (d3 < c.r * 0.7) return { t: 'camp', at: c.at };
    }
    /* épave (quête) */
    var ep = W2.epave;
    var d4 = Math.sqrt((ep.x - G.p.x) * (ep.x - G.p.x) + (ep.y - G.p.y) * (ep.y - G.p.y));
    if (d4 < 1.5 && !camp.flags.epaveVu) {
      camp.flags.epaveVu = true;
      msg(G, 'L\u2019épave du convoi. Plus personne à l\u2019intérieur. Il faut revenir au Hangar.');
      return { t: 'epave' };
    }
    if (!best) return { t: 'rien' };
    if (best.t === 'arte') {
      if (G.bag.length >= 4) { msg(G, 'Vos poches débordent (4 artefacts max). Rentrez les vendre.'); return { t: 'plein' }; }
      best.ref.taken = true;
      G.bag.push(best.ref.key);
      G.stats.arte++;
      msg(G, 'Ramassé : ' + Z.ARTEFACTS[best.ref.key].n + '. Il grésille doucement.');
      return { t: 'arte', key: best.ref.key };
    }
    if (best.t === 'stash') {
      best.ref.opened = true;
      var loot = best.ref.loot, parts = [];
      for (var k in loot) {
        if (k === 'arte') { G.bag.length < 4 ? (G.bag.push(loot[k]), parts.push(Z.ARTEFACTS[loot[k]].n)) : msg(G, 'Poches pleines : l\u2019artefact reste en cache.'); }
        else { camp.inv[k] = (camp.inv[k] || 0) + loot[k]; parts.push(k + ' ×' + loot[k]); }
      }
      msg(G, 'Cache ouverte : ' + (parts.join(', ') || 'vide… quelqu\u2019un est passé avant.'));
      return { t: 'stash' };
    }
    return { t: 'rien' };
  };

  Z.cmdUse = function (G, key) {
    var camp = G.camp, st = Z.arteStats(camp);
    if ((camp.inv[key] || 0) <= 0) return false;
    if (key === 'bandage') { camp.hp = Math.min(100 + st.hpMax, camp.hp + 35); }
    else if (key === 'antirad') { camp.rad = Math.max(0, camp.rad - 45); }
    else if (key === 'conserve') { camp.faim = Math.min(100, camp.faim + 45); }
    else if (key === 'saucisse') { camp.faim = Math.min(100, camp.faim + 70); camp.hp = Math.min(100 + st.hpMax, camp.hp + 5); }
    else if (key === 'kit') {
      var wst = camp.weapons[camp.cur];
      if (!wst || wst.cond >= 100) return false;
      wst.cond = 100;
    } else return false;
    camp.inv[key] -= 1;
    if (G.msgs) msg(G, Z.ITEMS[key].n + ' utilisé.');
    return true;
  };

  Z.cmdWeapon = function (G, key) {
    if (!G.camp.weapons[key]) return false;
    G.camp.cur = key;
    return true;
  };

  /* ══════════ ÉCONOMIE & QUÊTES (au camp) ══════════ */
  Z.buy = function (camp, key) {
    var it = Z.ITEMS[key];
    if (!it) return false;
    if (it.minDay && camp.day < it.minDay) return false;
    if (camp.credits < it.price) return false;
    camp.credits -= it.price;
    if (it.lot) camp.inv[key] = (camp.inv[key] || 0) + it.lot;
    else if (it.arme) camp.weapons[it.arme] = { cond: 100 };
    else if (it.combi) camp.suit = it.combi;
    else camp.inv[key] = (camp.inv[key] || 0) + 1;
    Z.saveCamp(camp);
    return true;
  };

  Z.sellArtefact = function (camp, lockerIndex) {
    var key = camp.locker[lockerIndex];
    if (!key) return 0;
    var a = Z.ARTEFACTS[key];
    camp.locker.splice(lockerIndex, 1);
    camp.credits += a.price;
    camp.stats.artes++;
    camp.best.arte++;
    if (camp.belt.indexOf(key) >= 0) camp.belt.splice(camp.belt.indexOf(key), 1);
    Z.saveCamp(camp);
    return a.price;
  };

  Z.equipBelt = function (camp, lockerIndex) {
    if (camp.belt.length >= 3) return false;
    var key = camp.locker[lockerIndex];
    if (!key) return false;
    camp.locker.splice(lockerIndex, 1);
    camp.belt.push(key);
    Z.saveCamp(camp);
    return true;
  };
  Z.unequipBelt = function (camp, slot) {
    if (camp.belt[slot] === undefined) return false;
    camp.locker.push(camp.belt[slot]);
    camp.belt.splice(slot, 1);
    Z.saveCamp(camp);
    return true;
  };

  Z.repair = function (camp, wkey) {
    var wst = camp.weapons[wkey];
    if (!wst || wst.cond >= 100) return false;
    var cost = Math.ceil((100 - wst.cond) * 1.1);
    if (camp.credits < cost) return false;
    camp.credits -= cost;
    wst.cond = 100;
    Z.saveCamp(camp);
    return true;
  };
  Z.repairCost = function (camp, wkey) {
    var wst = camp.weapons[wkey];
    if (!wst) return 0;
    return Math.ceil((100 - wst.cond) * 1.1 - 1e-9);
  };

  Z.startQuest = function (camp, key) {
    var active = null, k;
    for (k in camp.quests) if (camp.quests[k] === 'active') active = k;
    if (active || camp.quests[key] !== 'libre') return false;
    camp.quests[key] = 'active';
    Z.saveCamp(camp);
    return true;
  };

  Z.activeQuest = function (camp) {
    for (var k in camp.quests) if (camp.quests[k] === 'active') return k;
    return null;
  };

  Z.turnIn = function (camp, atCamp) {
    var key = Z.activeQuest(camp);
    if (!key) return null;
    var q = Z.QUETES.filter(function (x) { return x.key === key; })[0];
    if (!q) return null;
    if (q.at && q.at !== atCamp) return { err: 'at', note: 'À remettre à l\u2019Avant-poste (nord).' };
    if (!q.cond(camp)) return { err: 'cond' };
    if (q.consume) for (var k in q.consume) {
      if ((camp.inv[k] || 0) < q.consume[k]) return { err: 'cond' };
    }
    if (q.consume) for (var k2 in q.consume) camp.inv[k2] -= q.consume[k2];
    if (q.consumeArte) {
      var li = camp.locker.indexOf(q.consumeArte);
      if (li >= 0) camp.locker.splice(li, 1);
      else {
        var bi = camp.belt.indexOf(q.consumeArte);
        if (bi >= 0) camp.belt.splice(bi, 1);
        else return { err: 'cond' };
      }
    }
    camp.credits += q.rw.credits;
    if (q.rw.items) for (var k3 in q.rw.items) camp.inv[k3] = (camp.inv[k3] || 0) + q.rw.items[k3];
    camp.quests[key] = 'faite';
    camp.best.quetes++;
    Z.saveCamp(camp);
    return { ok: true, key: key, rw: q.rw };
  };

  /* fin d'expédition : extraction (ok) ou ramassage par le camp (mort) */
  Z.finishRun = function (G, ok) {
    var camp = G.camp;
    if (ok) {
      camp.locker = camp.locker.concat(G.bag);
      camp.best.arte += 0; /* compté à la vente */
    } else {
      camp.credits = Math.floor(camp.credits * 0.7);
      camp.hp = 50;
      camp.rad = Math.max(0, camp.rad - 20);
      camp.faim = Math.max(20, camp.faim);
      G.bag = []; /* les artefacts restent dans la Zone */
    }
    camp.day += 1;
    camp.best.days = Math.max(camp.best.days, camp.day - 1);
    Z.saveCamp(camp);
    return camp;
  };

  /* ligne descriptive d'un artefact (listes du camp) */
  Z.arteLine = function (key) {
    var a = Z.ARTEFACTS[key];
    if (!a) return '';
    var parts = [], b = a.bonus, m = a.malus, k;
    var LBL = { hpMax: 'PV max', speed: 'vitesse', dmgOut: 'dégâts', def: 'défense', rad: 'radiation', stamRegen: 'régén endurance', hpRegen: 'régén PV', faim: 'faim' };
    for (k in b) {
      var v = b[k];
      parts.push((v > 0 ? '+' : '') + Math.round(v * 100) + ' % ' + LBL[k]);
    }
    for (k in m) {
      var v2 = m[k];
      parts.push((v2 > 0 ? '+' : '') + (LBL[k] === 'PV max' ? (v2 + ' PV max') : Math.round(v2 * 100) + ' % ' + LBL[k]));
    }
    return a.n + ' — ' + parts.join(' · ') + ' (' + a.price + ' cr)';
  };

  root.ZONE = Z;
})(typeof window !== 'undefined' ? window : global);
