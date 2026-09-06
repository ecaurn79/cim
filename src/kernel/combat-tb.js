/* ═══════════════════════════════════════════════════════════════
   KERNEL · combat-tb.js — moteur de combat tactique hexagonal
   Réutilisable (La Confrérie du Gris v17, LOGRES v18).
   UMD : Node (module.exports) comme navigateur (window.COMBATTB).
   Pur : aucune dépendance, rng injecté dans makeBattle.
   ═══════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.COMBATTB = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ── Coordonnées axiales (q, r) ── */
  var DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

  function key(q, r) { return q + ',' + r; }
  function hexDist(q1, r1, q2, r2) {
    var dq = q1 - q2, dr = r1 - r2;
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
  }
  function neighbors(q, r) {
    return DIRS.map(function (d) { return [q + d[0], r + d[1]]; });
  }
  function cube(q, r) { return [q, r, -q - r]; }
  function cubeRound(x, y, z) {
    var rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
    var dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
    if (dx > dy && dx > dz) rx = -ry - rz;
    else if (dy > dz) ry = -rx - rz;
    else rz = -rx - ry;
    return [rx, ry, rz];
  }

  /* ── Terrains ── */
  var TERRAIN = {
    plain: { cost: 1, name: 'plaine' },
    mud:   { cost: 2, name: 'bourbier' },
    bush:  { cost: 1, cover: 2, name: 'fourré (couvert)' },
    rock:  { cost: -1, blocks: true, name: 'rocher' },
    tree:  { cost: -1, blocks: true, name: 'arbre mort' }
  };

  function genMap(rng, R, opts) {
    opts = opts || {};
    var rocks = opts.rocks == null ? 0.10 : opts.rocks;
    var trees = opts.trees == null ? 0.08 : opts.trees;
    var bush  = opts.bush  == null ? 0.10 : opts.bush;
    var mud   = opts.mud   == null ? 0.10 : opts.mud;
    var tiles = {};
    for (var q = -R; q <= R; q++) {
      var r1 = Math.max(-R, -q - R), r2 = Math.min(R, -q + R);
      for (var r = r1; r <= r2; r++) {
        var x = rng(), t = 'plain';
        if (x < rocks) t = 'rock';
        else if (x < rocks + trees) t = 'tree';
        else if (x < rocks + trees + bush) t = 'bush';
        else if (x < rocks + trees + bush + mud) t = 'mud';
        tiles[key(q, r)] = t;
      }
    }
    /* Connexité : BFS depuis le centre ; toute case franchissable non
       reliée devient plaine (aucun isolat, aucune unité en cage). */
    if (tiles['0,0'] === 'rock' || tiles['0,0'] === 'tree') tiles['0,0'] = 'plain';
    var seen = { '0,0': 1 }, st = [[0, 0]];
    while (st.length) {
      var c = st.pop();
      neighbors(c[0], c[1]).forEach(function (n) {
        var k2 = key(n[0], n[1]);
        if (tiles[k2] && !seen[k2] && !TERRAIN[tiles[k2]].blocks) { seen[k2] = 1; st.push(n); }
      });
    }
    Object.keys(tiles).forEach(function (k2) {
      /* toute case franchissable non reliée au centre devient un rocher :
         aucune unité ne peut être déployée ou coincée dans une poche */
      if (!seen[k2] && !TERRAIN[tiles[k2]].blocks) tiles[k2] = 'rock';
    });
    return tiles;
  }

  function blocks(B, q, r) {
    var t = B.tiles[key(q, r)];
    return !t || !!(t && TERRAIN[t].blocks);
  }
  function passableFor(B, u, q, r) {
    /* le spectral traverse rochers et arbres (pas les unités, pas le vide) */
    if (!B.tiles[key(q, r)]) return false;
    if (u && u.phase && TERRAIN[B.tiles[key(q, r)]].blocks) return false;
    return !blocks(B, q, r);
  }
  function unitAt(B, q, r) {
    for (var i = 0; i < B.units.length; i++) {
      var u = B.units[i];
      if (u.alive && u.xq === q && u.xr === r) return u;
    }
    return null;
  }

  /* ── Déplacements ── */
  function reachable(B, u) {
    var dist = {}, prev = {}, start = key(u.xq, u.xr);
    dist[start] = 0;
    var queue = [[u.xq, u.xr]];
    var mpMax = u.mpMax - (u.fatigue >= 5 ? 1 : 0);
    while (queue.length) {
      var c = queue.shift(), d0 = dist[key(c[0], c[1])];
      if (d0 >= mpMax) continue;
      for (var i = 0; i < 6; i++) {
        var n = [c[0] + DIRS[i][0], c[1] + DIRS[i][1]], k2 = key(n[0], n[1]);
        if (dist[k2] != null) continue;
        if (!passableFor(B, u, n[0], n[1])) continue;
        if (unitAt(B, n[0], n[1])) continue;
        var nd = d0 + TERRAIN[B.tiles[k2]].cost;
        if (nd <= mpMax) { dist[k2] = nd; prev[k2] = key(c[0], c[1]); queue.push(n); }
      }
    }
    delete dist[start];
    return { dist: dist, prev: prev };
  }

  /* plus court chemin complet (sans limite de pm) — pour l'IA ; le but
     peut être occupé (on veut s'en approcher) */
  function pathTo(B, u, destQ, destR) {
    var start = key(u.xq, u.xr), goal = key(destQ, destR);
    if (start === goal) return [];
    var prev = {}, queue = [[u.xq, u.xr]];
    prev[start] = null;
    while (queue.length) {
      var c = queue.shift();
      for (var i = 0; i < 6; i++) {
        var n = [c[0] + DIRS[i][0], c[1] + DIRS[i][1]], k2 = key(n[0], n[1]);
        if (prev[k2] !== undefined) continue;
        if (!passableFor(B, u, n[0], n[1])) continue;
        if (unitAt(B, n[0], n[1]) && k2 !== goal) continue;
        prev[k2] = key(c[0], c[1]);
        if (k2 === goal) {
          var path = [], cur = k2;
          while (cur && cur !== start) {
            var pp = cur.split(',');
            path.unshift({ q: +pp[0], r: +pp[1] });
            cur = prev[cur];
          }
          return path;
        }
        queue.push(n);
      }
    }
    return null;
  }

  /* ── Ligne de vue : interpolation cubique ── */
  function hasLOS(B, q1, r1, q2, r2) {
    var N = hexDist(q1, r1, q2, r2);
    if (N <= 1) return true;
    var a = cube(q1, r1), b = cube(q2, r2);
    for (var i = 1; i <= N - 1; i++) {
      var t = i / N;
      var c = cubeRound(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
      if (blocks(B, c[0], c[1])) return false;
    }
    return true;
  }

  /* ── Bataille ── */
  function log(B, txt) {
    B.log.push(txt);
    if (B.log.length > 80) B.log.shift();
  }
  function dice(B, n, d) {
    var s = 0;
    for (var i = 0; i < n; i++) s += 1 + Math.floor(B.rng() * d);
    return s;
  }

  function makeBattle(cfg) {
    var B = {
      tiles: cfg.tiles || genMap(cfg.rng, cfg.radius || 4, cfg.terrain),
      units: [], rng: cfg.rng, round: 1, qi: 0,
      over: false, winner: null, log: [], radius: cfg.radius || 4, fx: []
    };
    (cfg.units || []).forEach(function (u, i) { B.units.push(makeUnit(u, i)); });
    B.queue = buildQueue(B);
    log(B, 'La bataille commence — round 1.');
    checkOver(B);
    return B;
  }

  function makeUnit(u, i) {
    return {
      id: i, side: u.side, name: u.name || 'Inconnu', cls: u.cls || '',
      glyph: u.glyph || '?',
      xq: u.q, xr: u.r,
      hp: u.hp, maxhp: u.maxhp || u.hp,
      mpMax: u.mp || 3, mp: 0, spd: u.spd || 5,
      dice: u.dice || [1, 4], reach: u.reach || 1, ap: u.ap || 0,
      ranged: !!u.ranged, def: u.def || 0, crit: u.crit || 5,
      fatigue: 0, guarding: false, moved: false, attacked: false,
      retaliated: false, phase: !!u.phase,
      ai: u.ai || null, level: u.level || 1, xp: u.xp || 0, gold: u.gold || 0,
      color: u.color || null, hero: !!u.hero, boss: !!u.boss, uid: u.uid, kind: u.kind,
      ability: u.ability ? { k: u.ability.k, uses: u.ability.uses || 1 } : null,
      routAt: u.routAt || 0, routed: false, rallied: 0,
      alive: true
    };
  }

  function buildQueue(B) {
    /* moral : une unité démoralisée peut tourner le dos en début de manche */
    if (B.round > 1 && !B.over) {
      B.units.forEach(function (u) {
        if (u.alive && u.routAt && u.hp / u.maxhp < u.routAt && B.rng() < .3) {
          u.routed = true; u.alive = false;
          log(B, u.name + ' tourne le dos et fuit le champ !');
        }
      });
      checkOver(B);
      if (B.over) return [];
    }
    B.units.forEach(function (u) { u.rallied = 0; });
    var q = B.units.filter(function (u) { return u.alive; });
    q.sort(function (a, b) {
      var sa = a.spd - Math.floor(a.fatigue / 2), sb = b.spd - Math.floor(b.fatigue / 2);
      if (sb !== sa) return sb - sa;
      return a.id - b.id;
    });
    q.forEach(function (u) {
      u.fatigue = Math.max(0, (u.fatigue || 0) - 1);
      u.mp = u.mpMax - (u.fatigue >= 5 ? 1 : 0);
      u.moved = false; u.attacked = false; u.retaliated = false; u.guarding = false;
    });
    return q;
  }

  function active(B) { return B.over ? null : (B.queue[B.qi] || null); }

  function foes(B, u) {
    return B.units.filter(function (f) { return f.alive && f.side !== u.side; });
  }

  function effDef(B, target, attacker) {
    var d = target.def;
    var t = B.tiles[key(target.xq, target.xr)];
    if (t === 'bush' && attacker.ranged) d += TERRAIN.bush.cover;
    if (target.guarding) d += 2;
    if (target.rallied) d += 2;
    return d;
  }

  function checkOver(B) {
    var a = 0, b = 0;
    B.units.forEach(function (u) { if (u.alive) { if (u.side === 'A') a++; else b++; } });
    if (a === 0 || b === 0) {
      B.over = true;
      B.winner = a > 0 ? 'A' : 'B';
      log(B, a > 0 ? 'Le terrain est aux mercenaires.' : 'La confrérie est anéantie…');
    }
  }

  /* Le mort quitte la file d'initiative s'il n'a pas encore agi. */
  function removeDead(B, dead) {
    var i = B.queue.indexOf(dead);
    if (i < 0) return;
    if (i < B.qi) B.qi--;
    B.queue.splice(i, 1);
    /* le mort était le dernier acteur du round : la manche tourne,
       sinon qi sort de la file et active() reste null pour toujours */
    if (B.qi >= B.queue.length && B.queue.length > 0) {
      B.round++;
      B.queue = buildQueue(B);
      B.qi = 0;
      log(B, '— Round ' + B.round + ' —');
    }
  }

  function act(B, a) {
    a = a || {};
    if (B.over) return { ok: false, why: 'bataille terminée' };
    var u = active(B);
    if (!u) return { ok: false, why: 'aucun acteur' };
    if (a.t !== 'ai' && a.actor && a.actor !== u.id) return { ok: false, why: 'pas son tour' };
    switch (a.t) {
      case 'move': return actMove(B, u, a.q, a.r);
      case 'attack': return actAttack(B, u, a.id);
      case 'guard': return actGuard(B, u);
      case 'ability': return doAbility(B, u, a.targetId);
      case 'end': nextTurn(B); return { ok: true, ended: true };
      default: return { ok: false, why: 'action inconnue' };
    }
  }

  function actMove(B, u, q, r) {
    if (u.moved) return { ok: false, why: 'a déjà bougé' };
    if (u.attacked) return { ok: false, why: 'a déjà attaqué' };
    var reach = reachable(B, u), k2 = key(q, r);
    if (reach.dist[k2] == null) return { ok: false, why: 'hors de portée' };
    if (unitAt(B, q, r)) return { ok: false, why: 'case occupée' };
    u.xq = q; u.xr = r;
    u.fatigue = Math.min(10, u.fatigue + 1);
    u.moved = true;
    log(B, u.name + ' se replace (' + TERRAIN[B.tiles[k2]].name + ').');
    if (u.attacked) nextTurn(B);
    return { ok: true };
  }

  function actAttack(B, u, targetId) {
    if (u.attacked) return { ok: false, why: 'a déjà attaqué' };
    var target = B.units.filter(function (x) { return x.id === targetId; })[0];
    if (!target || !target.alive) return { ok: false, why: 'cible invalide' };
    if (target.side === u.side) return { ok: false, why: 'allié !' };
    var d = hexDist(u.xq, u.xr, target.xq, target.xr);
    if (d > u.reach) return { ok: false, why: 'trop loin' };
    if (u.ranged && !hasLOS(B, u.xq, u.xr, target.xq, target.xr))
      return { ok: false, why: 'pas de ligne de vue' };

    u.attacked = true;
    u.fatigue = Math.min(10, u.fatigue + 2);
    var dmg = dice(B, u.dice[0], u.dice[1]) - (u.fatigue >= 5 ? 1 : 0);
    var eDef = effDef(B, target, u);
    dmg -= Math.max(0, eDef - u.ap);
    if (dmg < 1) dmg = 1;
    var crit = B.rng() * 100 < u.crit;
    if (crit) dmg = Math.ceil(dmg * 1.5);
    target.hp -= dmg;
    log(B, u.name + ' frappe ' + target.name + ' (−' + dmg + (crit ? ', COUP CRITIQUE !' : '') + ').');
    B.fx.push({ x: target.xq, y: target.xr, t: 'hit', n: dmg });

    if (target.hp <= 0) {
      target.alive = false;
      target.hp = 0;
      u.kills = (u.kills || 0) + 1;
      log(B, '☠ ' + target.name + ' tombe.');
      removeDead(B, target);
      checkOver(B);
      if (B.over) return { ok: true, killed: target.id, over: true };
      if (u.moved) { nextTurn(B); return { ok: true, killed: target.id }; }
      return { ok: true, killed: target.id };
    }

    /* riposte : corps à corps adjacent, une fois par round */
    if (d === 1 && !target.retaliated && !target.ranged) {
      target.retaliated = true;
      var rd = Math.ceil((dice(B, target.dice[0], target.dice[1]) - Math.max(0, effDef(B, u, target) - target.ap)) / 2);
      if (rd < 1) rd = 1;
      u.hp -= rd;
      log(B, target.name + ' riposte (−' + rd + ').');
      B.fx.push({ x: u.xq, y: u.xr, t: 'hit', n: rd });
      if (u.hp <= 0) {
        u.alive = false; u.hp = 0;
        target.kills = (target.kills || 0) + 1;
        log(B, '☠ ' + u.name + ' meurt sous la riposte !');
        removeDead(B, u);
        checkOver(B);
        return { ok: true, killed: target.id, attackerDead: u.id };
      }
    }
    if (u.moved) nextTurn(B);
    return { ok: true };
  }

  function actGuard(B, u) {
    u.guarding = true;
    u.moved = true; u.attacked = true;
    log(B, u.name + ' se met en garde (+2 défense au round suivant).');
    nextTurn(B);
    return { ok: true };
  }

  /* Capacités héroïques : strike (×2 dégâts, adjacent, pas de riposte),
     pierce (ignore l'armure), rally (+2 déf aux alliés proches, 1 manche),
     heal (soigne les alliés adjacents), nova (éclat de zone adjacent).
     strike/pierce consomment l'attaque du tour ; les autres sont gratuites
     (mais limitées à 1 usage par bataille). */
  function doAbility(B, u, targetId) {
    var ab = u.ability;
    if (!ab || !ab.uses) return { ok: false, why: 'capacité déjà utilisée' };
    var k = ab.k;
    if (k === 'strike' || k === 'pierce') {
      var target = B.units.filter(function (x) { return x.id === targetId; })[0];
      if (!target || !target.alive || target.side === u.side) return { ok: false, why: 'cible invalide' };
      if (hexDist(u.xq, u.xr, target.xq, target.xr) > 1) return { ok: false, why: 'cible non adjacente' };
      u.attacked = true;
      u.fatigue = Math.min(10, u.fatigue + 2);
      ab.uses--;
      var base = dice(B, u.dice[0], u.dice[1]) * (k === 'strike' ? 2 : 1);
      var eDef = k === 'strike' ? Math.max(0, effDef(B, target, u) - u.ap) : 0;
      var dmg = base - eDef;
      if (dmg < 2) dmg = 2;
      var crit = B.rng() * 100 < u.crit;
      if (crit) dmg = Math.ceil(dmg * 1.5);
      target.hp -= dmg;
      log(B, u.name + (k === 'strike' ? ' déchaîne sa force sur ' : ' transperce la garde de ') + target.name + ' (−' + dmg + (crit ? ', CRITIQUE !' : '') + ').');
      B.fx.push({ x: target.xq, y: target.xr, t: 'hit', n: dmg });
      if (target.hp <= 0) {
        target.alive = false; target.hp = 0;
        u.kills = (u.kills || 0) + 1;
        log(B, '☠ ' + target.name + ' tombe.');
        removeDead(B, target);
        checkOver(B);
        if (B.over) return { ok: true, killed: target.id, over: true };
        if (u.moved) { nextTurn(B); return { ok: true, killed: target.id }; }
        return { ok: true, killed: target.id };
      }
      if (u.moved) nextTurn(B);
      return { ok: true };
    }
    if (k === 'nova') {
      ab.uses--;
      var hits = 0;
      foes(B, u).forEach(function (f) {
        if (hexDist(u.xq, u.xr, f.xq, f.xr) !== 1) return;
        var d2 = (1 + Math.floor(B.rng() * 6) + 1) - Math.max(0, effDef(B, f, u) - 2);
        if (d2 < 1) d2 = 1;
        f.hp -= d2;
        hits++;
        B.fx.push({ x: f.xq, y: f.xr, t: 'hit', n: d2 });
        log(B, 'Une nova de brumes éclate sur ' + f.name + ' (−' + d2 + ').');
        if (f.hp <= 0) {
          f.alive = false; f.hp = 0;
          u.kills = (u.kills || 0) + 1;
          log(B, '☠ ' + f.name + ' s’effondre.');
          removeDead(B, f);
        }
      });
      if (!hits) { ab.uses++; return { ok: false, why: 'aucun ennemi adjacent' }; }
      checkOver(B);
      return { ok: true, hits: hits };
    }
    if (k === 'heal') {
      ab.uses--;
      var healed = 0;
      B.units.forEach(function (f) {
        if (!f.alive || f.side !== u.side) return;
        if (hexDist(u.xq, u.xr, f.xq, f.xr) > 1) return;
        var up = Math.min(6, f.maxhp - f.hp);
        if (up <= 0) return;
        f.hp += up; healed++;
        B.fx.push({ x: f.xq, y: f.xr, t: 'heal', n: up });
      });
      if (!healed) { ab.uses++; return { ok: false, why: 'personne à soigner à côté' }; }
      log(B, u.name + ' exaube l’office de soin (+' + healed + ' alliés).');
      return { ok: true, healed: healed };
    }
    if (k === 'rally') {
      ab.uses--;
      var cnt = 0;
      B.units.forEach(function (f) {
        if (!f.alive || f.side !== u.side) return;
        if (hexDist(u.xq, u.xr, f.xq, f.xr) > 2) return;
        f.rallied = 1; cnt++;
      });
      log(B, u.name + ' lève l’étendard : ' + cnt + ' unités ralliées (+2 défense).');
      return { ok: true, count: cnt };
    }
    return { ok: false, why: 'capacité inconnue' };
  }

  function nextTurn(B) {
    if (B.over) return;
    B.qi++;
    if (B.qi >= B.queue.length) {
      B.round++;
      B.queue = buildQueue(B);
      B.qi = 0;
      log(B, '— Round ' + B.round + ' —');
    }
  }

  /* ── IA générique (le « cerveau » réutilisable par LOGRES) ──
     kinds : melee (charge le plus proche), ranged (kite à portée),
     beast (charge le plus affaibli), phantom (comme melee + traverse
     rochers/arbres). Toutes les actions passent par act(). */
  function aiAct(B) {
    if (B.over) return null;
    var u = active(B);
    if (!u || !u.ai) { if (u) act(B, { t: 'guard' }); return null; }

    function bestFoe() {
      var list = foes(B, u);
      var score = function (f) {
        var d = hexDist(u.xq, u.xr, f.xq, f.xr);
        return d + (u.ai === 'beast' ? f.hp / f.maxhp * 3 : 0);
      };
      list.sort(function (x, y) { return score(x) - score(y); });
      return list[0];
    }
    function stepToward(f) {
      /* BFS de distance depuis la cible (à travers obstacles contournables),
         puis case atteignable minimisant cette distance de route :
         gère les obstacles concaves (contournement) et le bourbier. */
      var rg = reachable(B, u);
      var start = key(u.xq, u.xr);
      var dmap = {};
      dmap[key(f.xq, f.xr)] = 0;
      var q2 = [[f.xq, f.xr]];
      while (q2.length) {
        var c = q2.shift(), d0 = dmap[key(c[0], c[1])];
        for (var i = 0; i < 6; i++) {
          var n = [c[0] + DIRS[i][0], c[1] + DIRS[i][1]], k2 = key(n[0], n[1]);
          if (dmap[k2] != null) continue;
          if (!passableFor(B, u, n[0], n[1])) continue;
          if (unitAt(B, n[0], n[1]) && k2 !== start) continue;
          dmap[k2] = d0 + 1;
          q2.push(n);
        }
      }
      var base = dmap[start];
      if (base == null) return false;
      var best = null, bd = base;
      Object.keys(rg.dist).forEach(function (k2) {
        if (dmap[k2] != null && dmap[k2] < bd) { bd = dmap[k2]; best = k2; }
      });
      if (!best) return false;
      var pp = best.split(',');
      var r = act(B, { t: 'move', q: +pp[0], r: +pp[1] });
      return r.ok;
    }
    function shoot(f) {
      return act(B, { t: 'attack', id: f.id }).ok;
    }

    var target = bestFoe();
    if (!target) return null;

    if (u.ranged) {
      var d = hexDist(u.xq, u.xr, target.xq, target.xr);
      var adjacent = foes(B, u).some(function (f) { return hexDist(u.xq, u.xr, f.xq, f.xr) === 1; });
      if (adjacent) {
        /* fuir : case atteignable maximisant la distance minimale aux ennemis */
        var reach = reachable(B, u), best = null, bd = -1;
        Object.keys(reach.dist).forEach(function (k2) {
          var pp = k2.split(','), q = +pp[0], r = +pp[1];
          var md = 99;
          foes(B, u).forEach(function (f) { md = Math.min(md, hexDist(q, r, f.xq, f.xr)); });
          if (md > bd) { bd = md; best = { q: q, r: r }; }
        });
        if (best && bd >= 2) act(B, { t: 'move', q: best.q, r: best.r });
        d = hexDist(u.xq, u.xr, target.xq, target.xr);
      }
      if (d <= u.reach && hasLOS(B, u.xq, u.xr, target.xq, target.xr)) shoot(target);
      else { stepToward(target); d = hexDist(u.xq, u.xr, target.xq, target.xr); if (d <= u.reach && hasLOS(B, u.xq, u.xr, target.xq, target.xr)) shoot(target); }
    }

    /* corps à corps */
    else {
      var d2 = hexDist(u.xq, u.xr, target.xq, target.xr);
      if (d2 > u.reach) stepToward(target);
      d2 = hexDist(u.xq, u.xr, target.xq, target.xr);
      if (d2 <= u.reach) act(B, { t: 'attack', id: target.id });
    }

    /* garantie de terminaison : l'unité IA finit TOUJOURS son activation */
    if (!B.over && active(B) === u) act(B, { t: 'guard' });
    return true;
  }

  return {
    DIRS: DIRS, key: key, hexDist: hexDist, neighbors: neighbors,
    TERRAIN: TERRAIN, genMap: genMap, blocks: blocks, unitAt: unitAt,
    reachable: reachable, pathTo: pathTo, hasLOS: hasLOS,
    makeBattle: makeBattle, act: act, active: active, foes: foes,
    effDef: effDef, aiAct: aiAct, checkOver: checkOver
  };
});
