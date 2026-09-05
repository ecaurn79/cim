/* ============================================================
   CARAVANES — moteur v1 (sandbox d'escouade, désert post-apo)
   Page 22 du hub C.I.M. — v22. Dépend de rpg-core.js (KERNEL).
   Sim pure (aucun rendu) : positions en mètres, monde 2400².
   « Apprendre en faire » : les compétences montent par l'usage.
   Perdre fait partie du récit : défaite = vol + réveil en ville.
   ============================================================ */
(function (root) {
  'use strict';
  var K = root.RPGCORE;
  if (!K || !K.makeRng) throw new Error('RPGCORE requis : chargez rpg-core.js avant caravanes-engine.js');

  var C = { VERSION: '1.0', SIZE: 2400 };
  /* 1 h de jeu = 60 s réelles ; journée = 24 min */
  C.HOUR = 60;

  C.GOODS = { eau: 3, pain: 6, viande: 9, tissu: 14, outils: 30, epices: 45, vieilleries: 25 };
  C.GOOD_KEYS = ['eau', 'pain', 'viande', 'tissu', 'outils', 'epices'];
  C.NAMES = ['Kessa', 'Rhouk', 'Imra', 'Dahan', 'Sylte', 'Oma', 'Torv', 'Anouk', 'Bask', 'Feyd', 'Lira', 'Mokh', 'Yade', 'Sorn'];

  /* 4 villes, 3 factions (les Pillards du Sable n'ont que des camps) */
  C.FACTIONS = {
    villes: { n: 'Villes-Libres', col: '#e0b45a' },
    guilde: { n: 'Guilde Marchande', col: '#7ecbff' },
    enclave: { n: 'Enclave de Fer', col: '#b48cff' },
    pillards: { n: 'Pillards du Sable', col: '#e06a5a' }
  };
  C.FAC_KEYS = ['villes', 'guilde', 'enclave', 'pillards'];

  C.BUILDS = {
    ferme:  { n: 'Ferme d\u2019algues', or: 200, outils: 2, h: 5, prod: { bien: 'pain', per: 2, qty: 1 }, d: '+1 pain / 2 h' },
    puits:  { n: 'Puits de sable', or: 150, outils: 1, h: 4, prod: { bien: 'eau', per: 1, qty: 2 }, d: '+2 eau / h' },
    atelier:{ n: 'Atelier de récup', or: 300, outils: 3, h: 7, prod: { bien: 'outils', per: 4, qty: 1 }, d: '+1 outil / 4 h' },
    tour:   { n: 'Tour de garde', or: 250, outils: 2, h: 6, prod: null, d: 'raids : −1 pillard' }
  };
  C.BUILD_KEYS = ['ferme', 'puits', 'atelier', 'tour'];

  /* ══════════ MONDE (déterministe par graine) ══════════ */
  C.genWorld = function (seedKey) {
    var rng = K.makeRng('caravanes-' + seedKey);
    /* v27 : géographie PAR GRAINE — Corail reste la ville-départ (sud-ouest),
       les trois autres sont tirées au sort : routes, distances et arbitrage
       changent entièrement d'une zone à l'autre. */
    var towns = [
      { n: 'Corail', fac: 'villes', x: 420, z: 420, r: 55 },
      { n: 'Poussière', fac: 'guilde', x: 0, z: 0, r: 55 },
      { n: 'Fer-Sombre', fac: 'enclave', x: 0, z: 0, r: 55 },
      { n: 'Braise', fac: 'villes', x: 0, z: 0, r: 55 }
    ];
    (function () {
      var fallbackX = [0, 0, 1980, 1880, 520], fallbackZ = [0, 0, 520, 1880, 1900];
      for (var i = 1; i < 4; i++) {
        var ok2 = false, guard2 = 0;
        while (!ok2 && guard2++ < 400) {
          var ang = rng() * Math.PI * 2, rr = 950 + rng() * 600;
          var x2 = 1200 + Math.cos(ang) * rr, z2 = 1200 + Math.sin(ang) * rr;
          if (x2 < 240 || x2 > 2160 || z2 < 240 || z2 > 2160) continue;
          ok2 = true;
          for (var j2 = 0; j2 < i; j2++) if (Math.hypot(x2 - towns[j2].x, z2 - towns[j2].z) < 730) { ok2 = false; break; }
          if (ok2) { towns[i].x = Math.round(x2); towns[i].z = Math.round(z2); }
        }
        if (!ok2) { towns[i].x = fallbackX[i]; towns[i].z = fallbackZ[i]; }
      }
    })();
    /* multiplicateurs de prix par ville (l'arbitrage, cœur du jeu) */
    var mults = [
      { eau: 0.8, pain: 0.9, viande: 1.2, tissu: 1.3, outils: 1.4, epices: 0.7 },
      { eau: 1.2, pain: 1.1, viande: 0.8, tissu: 1.1, outils: 1.2, epices: 1.5 },
      { eau: 1.5, pain: 1.4, viande: 1.3, tissu: 0.7, outils: 0.7, epices: 1.3 },
      { eau: 1.4, pain: 1.2, viande: 0.9, tissu: 0.8, outils: 1.3, epices: 0.8 }
    ];
    towns.forEach(function (t2, i) { t2.mult = mults[i]; });
    function far(rng2, min, list, coord) {
      var x, z, ok = false, guard = 0;
      while (!ok && guard++ < 400) {
        x = 120 + rng2() * (C.SIZE - 240); z = 120 + rng2() * (C.SIZE - 240);
        ok = true;
        for (var i = 0; i < list.length; i++) {
          var d = Math.hypot(x - list[i].x, z - list[i].z);
          if (d < min) { ok = false; break; }
        }
      }
      return { x: x, z: z };
    }
    var oases = [];
    for (var i = 0; i < 5; i++) { var o = far(rng, 300, towns.concat(oases)); oases.push({ x: o.x, z: o.z, r: 30 }); }
    var ruins = [];
    for (i = 0; i < 6; i++) { var r2 = far(rng, 240, towns.concat(oases, ruins)); ruins.push({ x: r2.x, z: r2.z, looted: false, loot: K.pick(rng, ['outils', 'vieilleries', 'tissu']) }); }
    var camps = [];
    for (i = 0; i < 3; i++) { var c2 = far(rng, 320, towns.concat(oases, ruins, camps)); camps.push({ x: c2.x, z: c2.z, n: 3 + Math.floor(rng() * 3), purged: false }); }
    var rocks = [];
    for (i = 0; i < 120; i++) rocks.push({ x: rng() * C.SIZE, z: rng() * C.SIZE, s: 0.5 + rng() * 1.6 });
    return { seed: seedKey, towns: towns, oases: oases, ruins: ruins, camps: camps, rocks: rocks };
  };

  /* ══════════ ESCOUADE & CAMP ══════════ */
  function makeMember(name, force, vitesse, endu, commerce, hpMax) {
    return {
      n: name, hp: hpMax, hpMax: hpMax, force: force, vitesse: vitesse, endu: endu, commerce: commerce,
      faim: 90, eau: 90, st: 'debout', /* debout | ko */
      hits: 0, km: 0, _kmNext: 0.5, trades: 0, x: 0, z: 0, tx: null, tz: null
    };
  }
  C.makeMember = makeMember;

  C.newCamp = function (seedKey) {
    return {
      v: 1, seed: seedKey || 'sel', day: 1, h: 7, or: 120,
      inv: { eau: 6, pain: 4, viande: 0, tissu: 0, outils: 0, epices: 0, vieilleries: 0 },
      members: [], chronicle: [], opinions: { villes: 0, guilde: 0, enclave: 0, pillards: -30 },
      base: null, purges: 0, defeats: 0, trades: 0,
      best: { or: 0, jour: 1, purges: 0, recrues: 0, base: 0 }, mute: false
    };
  };
  C.saveCamp = function (camp) {
    try { localStorage.setItem('car_save', K.saveGame(camp)); } catch (e) { }
    try {
      var b = null;
      try { b = JSON.parse(localStorage.getItem('car_best') || 'null'); } catch (e2) { }
      if (!b) b = { or: 0, jour: 1, purges: 0, recrues: 0, base: 0 };
      ['or', 'jour', 'purges', 'recrues', 'base'].forEach(function (k) { if (camp.best[k] > b[k]) b[k] = camp.best[k]; });
      localStorage.setItem('car_best', JSON.stringify(b));
    } catch (e3) { }
  };
  C.loadCamp = function () {
    try { var raw = localStorage.getItem('car_save'); return raw ? K.loadGame(raw) : null; } catch (e) { return null; }
  };
  C.records = function () {
    try { return JSON.parse(localStorage.getItem('car_best') || 'null'); } catch (e) { return null; }
  };
  C.chron = function (camp, txt) {
    camp.chronicle.unshift('Jour ' + camp.day + ' — ' + txt);
    if (camp.chronicle.length > 30) camp.chronicle.pop();
  };

  /* ══════════ SESSION ══════════ */
  C.startSession = function (camp) {
    var W2 = C.genWorld(camp.seed);
    var rng = K.makeRng('session-' + camp.seed + '-' + camp.day);
    var G = {
      camp: camp, W: W2, members: camp.members, enemies: [], time: { h: camp.h, day: camp.day },
      msgs: [], over: '', ambushT: 0.4 + rng() * 0.5, raidT: 20 + rng() * 10, selected: 0
    };
    if (!G.members.length) {
      var m0 = makeMember('Vous', 8, 1.0, 10, 5, 60);
      m0.x = W2.towns[0].x + 20; m0.z = W2.towns[0].z + 20;
      G.members.push(m0);
    }
    G.members.forEach(function (m) { if (m.st === 'ko') { m.st = 'debout'; m.hp = Math.max(m.hp, Math.round(m.hpMax * 0.5)); } });
    /* taverne : 2 recrues par ville */
    G.tavern = W2.towns.map(function (t2, i) {
      var names = C.NAMES.slice();
      return [0, 1].map(function (j) {
        var nm = names.splice(Math.floor(rng() * names.length), 1)[0];
        var f = 7 + Math.floor(rng() * 6), v = 0.9 + rng() * 0.4, e = 8 + Math.floor(rng() * 6), c = 4 + Math.floor(rng() * 8);
        return { n: nm, ville: i, force: f, vitesse: v, endu: e, commerce: c, hpMax: 50 + f * 2, prix: Math.round(80 + f * 14 + c * 8 + e * 4) };
      });
    });
    msg(G, 'Jour ' + camp.day + ' — ' + W2.towns[0].n + '. Vous êtes seul, fragile, et le désert est immense.');
    return G;
  };
  function msg(G, txt) { G.msgs.push({ txt: txt, at: G.time.h }); }
  C._msg = msg;

  function nearestTown(G, x, z) {
    var best = null, bd = 1e9;
    G.W.towns.forEach(function (t2) {
      var d = Math.hypot(x - t2.x, z - t2.z);
      if (d < bd) { bd = d; best = t2; }
    });
    return { t2: best, d: bd };
  }

  /* ══════════ PAS DE SIMULATION ══════════ */
  C.step = function (G, dt) {
    if (G.over) return;
    var camp = G.camp;
    var gh = dt / C.HOUR; /* heures de jeu */
    G.time.h += gh;
    if (G.time.h >= 24) { G.time.h -= 24; G.time.day++; camp.day = G.time.day; camp.best.jour = Math.max(camp.best.jour, G.time.day); }
    camp.h = G.time.h;

    /* déplacement & jauges des membres */
    G.members.forEach(function (m) {
      var slow = 1;
      if (m.faim < 25) slow *= 0.7;
      if (m.eau < 25) slow *= 0.7;
      if (m.st === 'debout' && m.tx !== null) {
        var dx = m.tx - m.x, dz = m.tz - m.z, d = Math.hypot(dx, dz);
        var spd = 9 * m.vitesse * slow; /* v27 : ×3 — la marche est enfin perceptible */
        if (d < spd * dt) { m.x = m.tx; m.z = m.tz; m.tx = null; }
        else { m.x += dx / d * spd * dt; m.z += dz / d * spd * dt; }
        m.km += spd * dt / 1000;
        if (m.km > m._kmNext) { m.endu++; m._kmNext = (m._kmNext || 0.5) + 0.5; msg(G, m.n + ' endurcit ses jambes (endurance ' + m.endu + ').'); }
      }
      /* consommation */
      var march = (m.tx !== null) ? 1.3 : 1;
      m.faim = Math.max(0, m.faim - gh * 0.55 * march);
      m.eau = Math.max(0, m.eau - gh * 0.9 * march);
      if (m.st === 'debout') {
        if (m.eau <= 0) m.hp -= gh * 4;
        else if (m.eau < 25) m.hp -= gh * 1;
        if (m.faim > 50 && m.eau > 25 && m.hp < m.hpMax) m.hp = Math.min(m.hpMax, m.hp + gh * 2);
        if (m.hp <= 0) { m.hp = 0; m.st = 'ko'; msg(G, m.n + ' s\u2019effondre…'); }
      } else { /* ko : rétablissement lent */
        m.hp = Math.min(m.hpMax * 0.35, m.hp + gh * 2.5);
        if (m.hp >= m.hpMax * 0.3) { m.st = 'debout'; msg(G, m.n + ' se relève, sonné mais debout.'); }
      }
    });

    /* combat : ennemis vs membres (auto) */
    for (var i = G.enemies.length - 1; i >= 0; i--) {
      var e = G.enemies[i];
      e.cd = Math.max(0, (e.cd || 0) - dt);
      var tgt = null, bd = 1e9;
      G.members.forEach(function (m) {
        if (m.st !== 'debout') return;
        var d = Math.hypot(m.x - e.x, m.z - e.z);
        if (d < bd) { bd = d; tgt = m; }
      });
      if (!tgt) continue;
      if (bd > 1.4) {
        e.x += (tgt.x - e.x) / bd * 2.6 * dt;
        e.z += (tgt.z - e.z) / bd * 2.6 * dt;
      } else if (e.cd <= 0) {
        e.cd = 1.2;
        var dmg = e.force * (0.7 + Math.random() * 0.6);
        tgt.hp -= dmg;
        if (tgt.hp <= 0) { tgt.hp = 0; tgt.st = 'ko'; msg(G, tgt.n + ' est à terre !'); }
      }
    }
    /* riposte des membres */
    G.members.forEach(function (m) {
      if (m.st !== 'debout') return;
      m.cd = Math.max(0, (m.cd || 0) - dt);
      var e = null, bd = 9;
      G.enemies.forEach(function (e2) {
        var d = Math.hypot(e2.x - m.x, e2.z - m.z);
        if (d < bd) { bd = d; e = e2; }
      });
      if (e && bd < 1.5 && m.cd <= 0) {
        m.cd = 1.1;
        var dmg2 = m.force * (0.8 + Math.random() * 0.5);
        e.hp -= dmg2;
        m.hits++;
        if (m.hits >= 8) { m.hits = 0; m.force++; msg(G, m.n + ' affine son coup (force ' + m.force + ').'); }
        if (e.hp <= 0) {
          G.enemies.splice(G.enemies.indexOf(e), 1);
          msg(G, e.n + ' ne se relèvera pas.');
        }
      }
    });

    /* embuscades : en zone sauvage, surtout près des territoires pillards */
    G.ambushT -= gh;
    if (G.ambushT <= 0) {
      G.ambushT = 0.6 + Math.random() * 0.8;
      var grp = G.members.filter(function (m) { return m.st === 'debout'; });
      if (grp.length) {
        var mx = 0, mz = 0;
        grp.forEach(function (m) { mx += m.x; mz += m.z; });
        mx /= grp.length; mz /= grp.length;
        var nt = nearestTown(G, mx, mz);
        var wild = nt.d > 260;
        var nearCamp = G.W.camps.some(function (c2) { return !c2.purged && Math.hypot(mx - c2.x, mz - c2.z) < 380; });
        if (wild) {
          var p = 0.30 + (nearCamp ? 0.35 : 0) + (camp.opinions.pillards < -60 ? 0.15 : 0);
          if (Math.random() < p) {
            var n2 = 1 + Math.floor(Math.random() * 2);
            for (var j = 0; j < n2; j++) {
              G.enemies.push({ n: 'Pillard du Sable', hp: 26 + Math.random() * 10, force: 6 + Math.random() * 3, x: mx + (Math.random() * 60 - 30), z: mz + (Math.random() * 60 - 30) });
            }
            msg(G, 'EMBUSCADE — des Pillards du Sable surgissent des dunes !');
          }
        }
      }
    }

    /* camps purgés ? */
    G.W.camps.forEach(function (c2) {
      if (c2.purged) return;
      var hostiles = G.enemies.filter(function (e) { return e.camp === c2; });
      if (hostiles.length === 0 && c2._engaged) {
        c2.purged = true;
        camp.purges++;
        camp.best.purges = Math.max(camp.best.purges, camp.purges);
        var butin = 80 + Math.floor(Math.random() * 80);
        camp.or += butin;
        camp.opinions.villes = Math.min(100, camp.opinions.villes + 8);
        camp.opinions.enclave = Math.min(100, camp.opinions.enclave + 4);
        camp.opinions.pillards = Math.max(-100, camp.opinions.pillards - 12);
        C.chron(camp, 'Camp pillard purgé (+' + butin + ' or). Les Villes-Libres saluent.');
        msg(G, 'Camp nettoyé ! Butin : +' + butin + ' or. Opinion Villes-Libres +8.');
      }
    });

    /* garrisons de camps : engagent si proches */
    G.W.camps.forEach(function (c2) {
      if (c2.purged || c2._engaged) return;
      var prox = G.members.some(function (m) { return m.st === 'debout' && Math.hypot(m.x - c2.x, m.z - c2.z) < 70; });
      if (prox) {
        c2._engaged = true;
        for (var j = 0; j < c2.n; j++) {
          G.enemies.push({ n: 'Pillard du camp', hp: 30, force: 7 + Math.random() * 3, x: c2.x + Math.cos(j * 2.1) * 8, z: c2.z + Math.sin(j * 2.1) * 8, camp: c2 });
        }
        msg(G, 'Le camp vous a repérés — ils chargent !');
      }
    });

    /* défaite totale : toute l'escouade à terre */
    if (G.members.length && G.members.every(function (m) { return m.st === 'ko'; })) {
      camp.defeats++;
      var perduOr = Math.floor(camp.or * 0.5);
      camp.or -= perduOr;
      camp.inv.epices = 0; camp.inv.vieilleries = 0;
      var nt2 = nearestTown(G, G.members[0].x, G.members[0].z);
      var wake = nt2.t2;
      G.members.forEach(function (m) {
        m.st = 'debout'; m.hp = Math.round(m.hpMax * 0.5); m.faim = Math.max(m.faim, 40); m.eau = Math.max(m.eau, 40);
        m.x = wake.x + 15; m.z = wake.z + 15; m.tx = null;
      });
      camp.opinions.villes = Math.min(100, camp.opinions.villes + 2);
      C.chron(camp, 'Escouade à terre. Réveillée à ' + wake.n + ', délestée de ' + perduOr + ' or.');
      msg(G, 'TOUS À TERRE — des marchands vous traînent jusqu\u2019à ' + wake.n + '. Butin volé : −' + perduOr + ' or.');
    }

    /* raids sur la base */
    if (camp.base && camp.base.done) {
      G.raidT -= gh;
      if (G.raidT <= 0) {
        G.raidT = 18 + Math.random() * 12;
        var atk = 2 + Math.floor(camp.purges / 3) + (camp.base.b.tour >= 1 ? -1 : 0);
        if (atk < 1) atk = 1;
        var defendeurs = G.members.filter(function (m) { return m.st === 'debout' && Math.hypot(m.x - camp.base.x, m.z - camp.base.z) < 220; });
        var valeur = 40 + camp.base._value;
        if (defendeurs.length) {
          /* bataille résolue par forces cumulées + un peu de hasard */
          var fDef = defendeurs.reduce(function (s2, m) { return s2 + m.force + m.hp / 40; }, 0) + (camp.base.b.tour >= 1 ? 4 : 0);
          var fAtk = atk * 8;
          if (fDef >= fAtk * (0.8 + Math.random() * 0.5)) {
            camp.or += Math.round(valeur * 0.3);
            camp.opinions.villes = Math.min(100, camp.opinions.villes + 6);
            C.chron(camp, 'Raid de ' + atk + ' pillards repoussé à la base. Opinion Villes-Libres +6.');
            msg(G, 'RAID repoussé ! Les pillards fuient, la base tient.');
          } else {
            camp.or = Math.max(0, camp.or - Math.round(valeur * 0.4));
            C.chron(camp, 'Raid de ' + atk + ' pillards : la base pillée (or et récoltes perdus).');
            msg(G, 'RAID — la base est mise à sac malgré vos défenseurs…');
          }
        } else {
          camp.or = Math.max(0, camp.or - Math.round(valeur * 0.4));
          camp.inv.pain = Math.max(0, camp.inv.pain - 2);
          C.chron(camp, 'Base sans défense : les pillards emportent récoltes et or.');
          msg(G, 'Votre base, sans défenseurs, a été pillée pendant votre absence.');
        }
      }
    }

    /* production de la base */
    if (camp.base && camp.base.done) {
      C.BUILD_KEYS.forEach(function (k) {
        var b = camp.base.b[k];
        if (b < 1) return;
        var spec = C.BUILDS[k];
        if (!spec.prod) return;
        camp.base._prodAcc = camp.base._prodAcc || {};
        camp.base._prodAcc[k] = (camp.base._prodAcc[k] || 0) + gh;
        var per = spec.prod.per;
        while (camp.base._prodAcc[k] >= per) {
          camp.base._prodAcc[k] -= per;
          camp.inv[spec.prod.bien] += spec.prod.qty;
          camp.base._value = (camp.base._value || 40) + 5;
        }
      });
    }

    /* chantiers en cours (par bâtiment) */
    if (camp.base) {
      C.BUILD_KEYS.forEach(function (k) {
        if (camp.base.b[k] > 0 && camp.base.b[k] < 1) {
          camp.base.b[k] = Math.min(1, camp.base.b[k] + gh / C.BUILDS[k].h);
          if (camp.base.b[k] >= 1) msg(G, C.BUILDS[k].n + ' terminé ! ' + (C.BUILDS[k].prod ? C.BUILDS[k].d : 'La base se défend mieux.'));
        }
      });
    }
  };

  /* ══════════ COMMANDES ══════════ */
  C.cmdMove = function (G, idxs, x, z) {
    if (G.over) return;
    idxs.forEach(function (i) {
      var m = G.members[i];
      if (m && m.st === 'debout') {
        /* v28b : le premier membre va EXACTEMENT au clic, les autres se forment autour */
        var OFF2 = [[0, 0], [2.6, 0], [-2.6, 2.6]];
        var o2 = OFF2[i] || [0, 0];
        m.tx = x + o2[0]; m.tz = z + o2[1];
      }
    });
  };
  C.cmdHalt = function (G) { G.members.forEach(function (m) { m.tx = null; }); };

  C.cmdConsume = function (G, idx, bien) {
    var camp = G.camp, m = G.members[idx];
    if (!m || m.st !== 'debout') return false;
    if ((camp.inv[bien] || 0) <= 0) return false;
    if (bien === 'eau') { m.eau = Math.min(100, m.eau + 50); }
    else if (bien === 'pain') { m.faim = Math.min(100, m.faim + 40); }
    else if (bien === 'viande') { m.faim = Math.min(100, m.faim + 55); }
    else return false;
    camp.inv[bien]--;
    return true;
  };

  C.foundBase = function (G) {
    var camp = G.camp;
    if (camp.base) return { err: 'existe' };
    var grp = G.members.filter(function (m) { return m.st === 'debout'; });
    if (!grp.length) return { err: 'ko' };
    var mx = grp[0].x, mz = grp[0].z; /* le pionnier (1ᵉʳ debout) choisit le site */
    var nearOasis = G.W.oases.some(function (o) { return Math.hypot(mx - o.x, mz - o.z) < 120; });
    if (!nearOasis) return { err: 'oasis' };
    var nt = nearestTown(G, mx, mz);
    if (nt.d < 140) return { err: 'ville' };
    camp.base = { x: Math.round(mx), z: Math.round(mz), b: { ferme: 0, puits: 0, atelier: 0, tour: 0 }, done: true, _value: 40 };
    C.chron(camp, 'Première pierre de l\u2019avant-poste posée près d\u2019une oasis.');
    msg(G, 'Chantier lancé ! La base se construit avec le temps qui passe.');
    C.saveCamp(camp);
    return { ok: true };
  };

  C.buildCost = function (key) { return C.BUILDS[key]; };
  C.build = function (G, key) {
    var camp = G.camp;
    if (!camp.base || !camp.base.done) return { err: 'base' };
    if (camp.base.b[key] >= 1) return { err: 'fait' };
    if (camp.base.b[key] > 0) return { err: 'encours' };
    var spec = C.BUILDS[key];
    if (camp.or < spec.or || (camp.inv.outils || 0) < spec.outils) return { err: 'ressources' };
    camp.or -= spec.or;
    camp.inv.outils -= spec.outils;
    camp.base.b[key] = 0.001;
    C.chron(camp, spec.n + ' : le chantier démarre.');
    C.saveCamp(camp);
    return { ok: true };
  };

  /* ══════════ VILLES : marché, taverne ══════════ */
  C.cityAt = function (G) {
    var alive = G.members.filter(function (m) { return m.st === 'debout'; });
    if (!alive.length) return null;
    var m = alive[0];
    for (var i = 0; i < G.W.towns.length; i++) {
      var t2 = G.W.towns[i];
      if (Math.hypot(m.x - t2.x, m.z - t2.z) < t2.r) return { idx: i, t2: t2 };
    }
    return null;
  };
  C.buyPrice = function (G, t2, bien) {
    var camp = G.camp;
    var op = camp.opinions[t2.fac] || 0;
    var p = C.GOODS[bien] * (t2.mult[bien] || 1) * (1 - op / 450);
    return Math.max(1, Math.round(p));
  };
  C.sellPrice = function (G, t2, bien) {
    var camp = G.camp;
    var op = camp.opinions[t2.fac] || 0;
    var m = 0.55 + 0.06 * (G.members[0] ? Math.min(15, G.members[0].commerce) : 5) / 15;
    var p = C.GOODS[bien] * (t2.mult[bien] || 1) * m * (1 + op / 500);
    return Math.max(1, Math.round(p));
  };
  C.buy = function (G, bien, qty) {
    var c = C.cityAt(G);
    if (!c) return { err: 'ville' };
    var camp = G.camp;
    var p = C.buyPrice(G, c.t2, bien) * qty;
    if (camp.or < p) return { err: 'or' };
    camp.or -= p;
    camp.inv[bien] = (camp.inv[bien] || 0) + qty;
    camp.trades++;
    camp.opinions[c.t2.fac] = Math.min(100, camp.opinions[c.t2.fac] + 0.5);
    camp.opinions.guilde = Math.min(100, camp.opinions.guilde + 0.4);
    skillTrade(G, 3);
    C.saveCamp(camp);
    return { ok: true, p: p };
  };
  C.sell = function (G, bien, qty) {
    var c = C.cityAt(G);
    if (!c) return { err: 'ville' };
    var camp = G.camp;
    qty = Math.min(qty, camp.inv[bien] || 0);
    if (qty <= 0) return { err: 'vide' };
    var p = C.sellPrice(G, c.t2, bien) * qty;
    camp.or += p;
    camp.inv[bien] -= qty;
    camp.trades++;
    camp.best.or = Math.max(camp.best.or, camp.or);
    camp.opinions[c.t2.fac] = Math.min(100, camp.opinions[c.t2.fac] + 0.5);
    camp.opinions.guilde = Math.min(100, camp.opinions.guilde + 0.4);
    skillTrade(G, 3);
    C.saveCamp(camp);
    return { ok: true, p: p };
  };
  function skillTrade(G, per) {
    var m = G.members.filter(function (x) { return x.st === 'debout'; })[0];
    if (!m) return;
    m.trades++;
    if (m.trades >= per) { m.trades = 0; m.commerce++; msg(G, m.n + ' marchande mieux (commerce ' + m.commerce + ').'); }
  }
  C.recruit = function (G, ville, j) {
    var camp = G.camp;
    var c = C.cityAt(G);
    if (!c || c.idx !== ville) return { err: 'ville' };
    if (G.members.length >= 3) return { err: 'plein' };
    var r = G.tavern[ville][j];
    if (!r) return { err: 'vide' };
    if (camp.or < r.prix) return { err: 'or' };
    camp.or -= r.prix;
    var m = makeMember(r.n, r.force, r.vitesse, r.endu, r.commerce, r.hpMax);
    m.x = c.t2.x + 10; m.z = c.t2.z + 10;
    G.members.push(m);
    camp.members = G.members;
    camp.best.recrues++;
    C.chron(camp, r.n + ' rejoint la caravane (' + r.prix + ' or).');
    msg(G, r.n + ' signe. L\u2019escouade compte ' + G.members.length + ' bras.');
    C.saveCamp(camp);
    return { ok: true };
  };

  /* ruines : fouiller */
  C.lootRuine = function (G) {
    var camp = G.camp;
    var alive = G.members.filter(function (m) { return m.st === 'debout'; });
    if (!alive.length) return null;
    for (var i = 0; i < G.W.ruins.length; i++) {
      var r2 = G.W.ruins[i];
      if (r2.looted) continue;
      if (Math.hypot(alive[0].x - r2.x, alive[0].z - r2.z) < 30) {
        r2.looted = true;
        var q2 = 1 + Math.floor(Math.random() * 2);
        camp.inv[r2.loot] = (camp.inv[r2.loot] || 0) + q2;
        msg(G, 'Ruine fouillée : +' + q2 + ' ' + r2.loot + '.');
        return { ok: true, loot: r2.loot, q: q2 };
      }
    }
    return null;
  };
  /* oasis : remplir les gourdes */
  C.fillWater = function (G) {
    var camp = G.camp;
    var alive = G.members.filter(function (m) { return m.st === 'debout'; });
    if (!alive.length) return false;
    var near = G.W.oases.some(function (o) { return Math.hypot(alive[0].x - o.x, alive[0].z - o.z) < o.r + 15; });
    if (!near) return false;
    camp.inv.eau = Math.min(20, (camp.inv.eau || 0) + 4);
    msg(G, 'Outres remplies à l\u2019oasis (+4 eau, max 20).');
    return true;
  };

  root.CARAVANES = C;
})(typeof window !== 'undefined' ? window : global);
