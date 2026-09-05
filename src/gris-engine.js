/* ═══════════════════════════════════════════════════════════════
   LA CONFRÉRIE DU GRIS — couche campagne (v17)
   Moteur tactique : kernel/combat-tb.js · objets/sauvegardes : kernel/rpg-core.js
   UMD : Node (module.exports) · navigateur (window.GRIS)
   Boucle : contrat → bataille tactique → butin/salaires/recrues → contrat suivant.
   ═══════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports)
    module.exports = factory(require('./kernel/rpg-core.js'), require('./kernel/combat-tb.js'));
  else root.GRIS = factory(root.RPGCORE, root.COMBATTB);
})(typeof self !== 'undefined' ? self : this, function (K, T) {
  'use strict';

  var LS = (function () { try { return (typeof localStorage !== 'undefined') ? localStorage : null; } catch (e) { return null; } })();

  /* ── Noms de mercenaires ── */
  var FIRST = ['Berthaud', 'Isar', 'Colart', 'Mahaut', 'Renaud', 'Sybille', 'Gauthier', 'Perceval', 'Alix', 'Hugues', 'Marote', 'Tiçet', 'Ombeline', 'Arnaud', 'Jaquet', 'Ysengrin'];
  var LAST = ['le Roux', 'Bricembrac', 'de Montfaucon', 'Croquevilain', 'la Grise', 'Sans-Chagrin', 'Vieille-Écorce', 'Mauclerc', 'le Manchot', 'Ronge-Maille', 'd\'Auberoche', 'Trouve-Faille'];

  /* ── Classes de mercenaires ── */
  var CLASSES = {
    epéiste:     { n: 'Épéiste',     glyph: 'E', hp: 28, mp: 3, spd: 6, weapon: 'épée courte',  pay: 40 },
    arbalétrier: { n: 'Arbalétrier', glyph: 'A', hp: 22, mp: 3, spd: 5, weapon: 'arbalète',     pay: 55 },
    brute:       { n: 'Brute',       glyph: 'B', hp: 36, mp: 3, spd: 4, weapon: 'hache de guerre', pay: 60 },
    vétéran:     { n: 'Vétéran',     glyph: 'V', hp: 30, mp: 4, spd: 6, weapon: 'lance',        pay: 70 }
  };
  var CLS_KEYS = ['epéiste', 'arbalétrier', 'brute', 'vétéran'];

  /* ── Armes à distance de la Confrérie (complètent le KERNEL) ── */
  var RANGED_BASES = {
    'arbalète':  { dice: [1, 7], crit: 5, val: 45, reach: 5 },
    'arc long':  { dice: [1, 6], crit: 6, val: 35, reach: 6 },
    'arc court': { dice: [1, 5], crit: 8, val: 25, reach: 4 }
  };
  function rangedWeapon(base) {
    var b = RANGED_BASES[base];
    return { kind: 'weapon', base: base, dice: b.dice.slice(), crit: b.crit, val: b.val, ranged: 1, reach: b.reach, affixes: [] };
  }

  /* Attributs tactiques déduits du nom d'arme (KERNEL + Confrérie) */
  function weaponTags(w) {
    if (!w) return { dice: [1, 2], reach: 1, ranged: false, ap: 0, crit: 0 };
    if (w.ranged) return { dice: w.dice.slice(), reach: w.reach || 4, ranged: true, ap: 1, crit: w.crit || 5 };
    var t = { dice: w.dice.slice(), reach: 1, ranged: false, ap: 0, crit: w.crit || 5 };
    if (w.base.indexOf('lance') === 0) { t.reach = 2; t.ap = 1; }
    if (w.base.indexOf('hache') >= 0) t.ap = 2;
    if (w.base.indexOf('marteau') >= 0) t.ap = 1;
    return t;
  }

  /* ── Mercenaires ── */
  function makeName(rng) { return K.pick(rng, FIRST) + ' ' + K.pick(rng, LAST); }
  function makeMerc(rng, clsKey, level) {
    level = level || 1;
    var c = CLASSES[clsKey];
    var w = c.weapon.indexOf('arc') === 0 || c.weapon === 'arbalète' ? rangedWeapon(c.weapon) : K.rollItem(rng, 1, { kind: 'weapon', force: c.weapon, boost: false });
    var inv = K.makeInventory(8);
    K.invAdd(inv, w);
    K.invEquip(inv, w);
    var ar = K.rollItem(rng, 1, { kind: 'armor', boost: false });
    K.invAdd(inv, ar);
    K.invEquip(inv, ar);
    return { id: ++_mid, cls: clsKey, name: makeName(rng), level: level, xp: 0, hp: 0, wounds: 0, inv: inv, pay: c.pay };
  }
  var _mid = 0;
  function mercMaxHp(merc) {
    var c = CLASSES[merc.cls];
    var es = K.equipStats(merc.inv);
    return Math.max(6, c.hp + 3 * (merc.level - 1) + (es.hp || 0) - 4 * merc.wounds);
  }
  function battleStats(merc) {
    var c = CLASSES[merc.cls];
    var es = K.equipStats(merc.inv);
    var w = merc.inv.eq.weapon;
    var tg = weaponTags(w);
    return {
      hp: mercMaxHp(merc),
      mp: c.mp, spd: c.spd,
      dice: tg.dice, reach: tg.reach, ranged: tg.ranged, ap: tg.ap,
      def: es.def || 0, crit: 5 + (es.crit || 0)
    };
  }

  /* ── Ennemis ── */
  var MOB = {
    brigand: { n: 'brigand',       glyph: 'b', hp: 11, dice: [1, 5], def: 1, mp: 3, spd: 5, reach: 1, ai: 'melee',  xp: 8,  gold: 5 },
    tireur:  { n: 'tireur brigand',glyph: 't', hp: 12, dice: [1, 5], def: 0, mp: 3, spd: 5, reach: 4, ranged: 1, ai: 'ranged', xp: 12, gold: 8 },
    chef:    { n: 'chef brigand',  glyph: 'C', hp: 24, dice: [1, 7], def: 2, mp: 3, spd: 6, reach: 1, ap: 1, ai: 'melee', xp: 18, gold: 18 },
    loup:    { n: 'loup affamé',   glyph: 'l', hp: 10, dice: [1, 6], def: 0, mp: 5, spd: 8, reach: 1, ai: 'beast',  xp: 10, gold: 0 },
    ours:    { n: 'ours des bois', glyph: 'O', hp: 34, dice: [2, 4], def: 2, mp: 4, spd: 5, reach: 1, ap: 1, ai: 'beast', xp: 20, gold: 0 },
    mort:    { n: 'mortal',        glyph: 'm', hp: 19, dice: [1, 5], def: 3, mp: 2, spd: 3, reach: 1, ai: 'melee',  xp: 12, gold: 3 },
    spectre: { n: 'spectre',       glyph: 's', hp: 16, dice: [1, 6], def: 1, mp: 3, spd: 5, reach: 1, phase: 1, ai: 'melee', xp: 16, gold: 4 },
    abomination: { n: 'abomination des Mortailles', glyph: 'M', hp: 44, dice: [2, 5], def: 2, mp: 3, spd: 4, reach: 1, ap: 1, ai: 'melee', xp: 40, gold: 30, boss: 1 }
  };

  /* ── Contrats (MVP : 3) ── */
  var CONTRACTS = [
    {
      key: 'brigands', nom: 'Le péage des brigands',
      brief: 'Des déserteurs bloquent la vieille route et taxent les marchands. Leur chef, Gros-Colart, promet qu\'aucune lame ne passe. Les marchands paieront pour la route libre.',
      comp: [['brigand', 4], ['tireur', 1], ['chef', 1]],
      terrain: { rocks: .06, trees: .14, bush: .12, mud: .08 }, gold: 60, depth: 2
    },
    {
      key: 'betes', nom: 'Les bêtes des bois',
      brief: 'Un hiver trop long a jeté les bêtes sur les hameaux. Deux ours encore dans leur pelage d\'hiver mènent une meute qui ne craint plus l\'homme. Délogez-les avant la soudure.',
      comp: [['loup', 3], ['ours', 2]],
      terrain: { rocks: .06, trees: .22, bush: .16, mud: .06 }, gold: 80, depth: 4
    },
    {
      key: 'mortailles', nom: 'Les Mortailles',
      brief: 'Au fond de la vallée grise, une vieille fosse rend ce qu\'on y a jeté. Les morts remontent, lents mais patients, et quelque chose de plus grand les pousse. Bouchez la fosse — ou creusez-la davantage.',
      comp: [['mort', 3], ['spectre', 1], ['abomination', 1]],
      terrain: { rocks: .12, trees: .08, bush: .08, mud: .16 }, gold: 120, depth: 6
    }
  ];

  /* ── Campagne ── */
  function newCampaign(seed) {
    var rng = K.makeRng(seed || ('gris-' + Date.now()));
    var camp = {
      _v: 1, seed: String(seed || ('gris-' + Math.floor(rng() * 1e9))),
      gold: 130, contract: 0, roster: [], stock: [], graves: [],
      done: false, over: false, cleared: 0
    };
    ['epéiste', 'arbalétrier', 'brute', 'epéiste'].forEach(function (ck) {
      var m = makeMerc(rng, ck, 1);
      m.hp = mercMaxHp(m);
      camp.roster.push(m);
    });
    return camp;
  }

  /* colonnes de déploiement : toutes les cases franches de chaque bord,
     triées — la garantie « jamais sur un rocher » est structurelle. */
  function deployColumns(tiles) {
    var left = [], right = [];
    Object.keys(tiles).forEach(function (k2) {
      if (T.TERRAIN[tiles[k2]].blocks) return;
      var pp = k2.split(','), q = +pp[0], r = +pp[1];
      if (q <= -2) left.push({ q: q, r: r });
      if (q >= 2) right.push({ q: q, r: r });
    });
    left.sort(function (a, b) { return a.q - b.q || a.r - b.r; });
    right.sort(function (a, b) { return b.q - a.q || a.r - b.r; });
    return { left: left, right: right };
  }

  /* Démarre une bataille (session) — la sauvegarde se fait entre les batailles. */
  function startBattle(camp, seedStr) {
    var ct = CONTRACTS[camp.contract];
    var rngMap = K.makeRng(camp.seed + ':map:' + camp.contract);
    var tiles = T.genMap(rngMap, 4, ct.terrain);
    var rng = K.makeRng(seedStr || (camp.seed + ':bat:' + camp.contract + ':' + Date.now()));
    var units = [], mercByUnit = {};

    var cols = deployColumns(tiles);
    var la = cols.left.slice(), lb = cols.right.slice();
    camp.roster.forEach(function (m, i) {
      if (m.hp <= 0) return;
      var st = battleStats(m);
      var spot = la.shift() || { q: 0, r: 0 };
      units.push({
        side: 'A', q: spot.q, r: spot.r, name: m.name, cls: c_n(m.cls),
        glyph: CLASSES[m.cls].glyph,
        hp: Math.min(m.hp, st.hp), mp: st.mp, spd: st.spd,
        dice: st.dice, reach: st.reach, ranged: st.ranged, ap: st.ap,
        def: st.def, crit: st.crit
      });
      mercByUnit[units.length - 1] = m;
    });
    function c_n(k) { return CLASSES[k].n; }

    var ei = 0;
    ct.comp.forEach(function (pair) {
      for (var j = 0; j < pair[1]; j++) {
        var d = MOB[pair[0]];
        var spot = lb.shift() || { q: 0, r: 0 };
        units.push({
          side: 'B', q: spot.q, r: spot.r, name: d.n, cls: d.n, glyph: d.glyph,
          hp: d.hp, mp: d.mp, spd: d.spd, dice: d.dice.slice(),
          reach: d.reach, ranged: !!d.ranged, ap: d.ap || 0, def: d.def,
          crit: 5, phase: !!d.phase, ai: d.ai, xp: d.xp, gold: d.gold
        });
        ei++;
      }
    });

    var B = T.makeBattle({ tiles: tiles, rng: rng, radius: 4, units: units });
    return { B: B, mercByUnit: mercByUnit, contract: camp.contract };
  }

  /* Résolution après bataille : retours dans la campagne. */
  function finishBattle(camp, ctx) {
    var B = ctx.B;
    var ct = CONTRACTS[camp.contract];
    var rng = K.makeRng(camp.seed + ':res:' + camp.contract + ':' + B.round);
    var won = B.winner === 'A';
    var sum = { won: won, dead: [], wounded: [], levels: [], gold: 0, loot: [], fled: false };

    /* PV et pertes */
    Object.keys(ctx.mercByUnit).forEach(function (uid) {
      var m = ctx.mercByUnit[uid], u = B.units[+uid];
      if (!m || !u) return;
      m.hp = Math.max(0, u.hp);
      if (u.hp <= 0) {
        if (rng() < 0.55 && m.wounds < 2) {
          m.wounds++;
          m.hp = 1;
          sum.wounded.push(m.name);
        } else {
          sum.dead.push(m.name);
          camp.graves.push(m.name + ' — contrat ' + (camp.contract + 1));
          camp.roster = camp.roster.filter(function (x) { return x !== m; });
        }
      } else {
        m.hp = Math.min(m.hp, mercMaxHp(m));
      }
    });

    /* repos : la troupe récupère un tiers de ses PV max entre les contrats */
    camp.roster.forEach(function (m) {
      m.hp = Math.min(mercMaxHp(m), m.hp + Math.ceil(mercMaxHp(m) / 2));
    });

    if (won) {
      /* XP : chaque mercenaire survivant gagne au prorata de ses kills */
      var avgXp = 10 + camp.contract * 5;
      var maxKills = 1;
      B.units.forEach(function (u) { if (u.side === 'A' && u.kills) maxKills = Math.max(maxKills, u.kills); });
      Object.keys(ctx.mercByUnit).forEach(function (uid) {
        var m = ctx.mercByUnit[uid], u = B.units[+uid];
        if (!m || !u || u.hp <= 0) return;
        m.xp += (u.kills || 0) * avgXp + 4;
        while (m.level < 9 && m.xp >= K.xpFor(m.level + 1)) {
          m.level++;
          m.hp = Math.min(mercMaxHp(m), m.hp + 4);
          sum.levels.push(m.name + ' (niv. ' + m.level + ')');
        }
      });
      /* Or : prime du contrat + coffres des ennemis tombés */
      sum.gold = ct.gold;
      B.units.forEach(function (u) {
        if (u.side === 'B' && !u.alive) sum.gold += u.gold || 0;
      });
      camp.gold += sum.gold;
      /* Butin : 1 à 2 objets */
      var nbLoot = 1 + (rng() < 0.4 ? 1 : 0);
      for (var i = 0; i < nbLoot; i++) {
        if (rng() < 0.3) {
          sum.loot.push(rangedWeapon(K.pick(rng, ['arbalète', 'arc long', 'arc court'])));
        } else {
          sum.loot.push(K.rollItem(rng, ct.depth, {}));
        }
      }
      camp.stock = camp.stock.concat(sum.loot);
      camp.cleared = camp.contract + 1;
      camp.contract++;
      if (camp.contract >= CONTRACTS.length) { camp.done = true; camp.contract = CONTRACTS.length - 1; }
    }
    if (camp.roster.length === 0) camp.over = true;
    autosave(camp);
    return sum;
  }

  /* ── Entre les batailles ── */
  function wagesDue(camp) { return camp.roster.length * (6 + camp.contract * 4); }
  function payWages(camp) {
    var due = wagesDue(camp), leavers = [];
    while (camp.gold < due && camp.roster.length > 1) {
      var cheap = camp.roster.slice().sort(function (a, b) { return a.pay - b.pay; })[0];
      camp.roster = camp.roster.filter(function (x) { return x !== cheap; });
      leavers.push(cheap.name);
      due = wagesDue(camp);
    }
    var paid = false;
    if (camp.gold >= due) { camp.gold -= due; paid = true; }
    if (camp.roster.length === 0) camp.over = true;
    autosave(camp);
    return { paid: paid, leavers: leavers, due: due };
  }
  function recruits(camp) {
    var rng = K.makeRng(camp.seed + ':rec:' + camp.contract + ':' + camp.cleared);
    var out = [];
    for (var i = 0; i < 3; i++) {
      var m = makeMerc(rng, K.pick(rng, CLS_KEYS), 1 + (camp.cleared >= 2 ? 1 : 0));
      m.hp = mercMaxHp(m);
      out.push({ merc: m, cost: 45 + 25 * m.level });
    }
    return out;
  }
  function buyRecruit(camp, cand) {
    if (camp.gold < cand.cost || camp.roster.length >= 8) return false;
    camp.gold -= cand.cost;
    camp.roster.push(cand.merc);
    autosave(camp);
    return true;
  }
  function surgeryCost(m) { return 20 + 10 * m.wounds; }
  function surgery(camp, m) {
    var c = surgeryCost(m);
    if (camp.gold < c || m.wounds <= 0) return false;
    camp.gold -= c;
    m.wounds = 0;
    m.hp = Math.min(mercMaxHp(m), m.hp + 6);
    autosave(camp);
    return true;
  }
  function giveItem(camp, m, stockIdx) {
    var it = camp.stock[stockIdx];
    if (!it || !K.invAdd(m.inv, it)) return false;
    camp.stock.splice(stockIdx, 1);
    if (it.kind === 'weapon' || it.kind === 'armor' || it.kind === 'helm' || it.kind === 'shield') {
      var es0 = K.equipStats(m.inv);
      var score0 = (es0.def || 0) * 10 + (es0.hp || 0);
      K.invEquip(m.inv, it);
      var es1 = K.equipStats(m.inv);
      if ((es1.def || 0) * 10 + (es1.hp || 0) < score0 && it.kind !== 'weapon') K.invUnequip(m.inv, it.kind);
    }
    autosave(camp);
    return true;
  }
  function sellItem(camp, stockIdx) {
    var it = camp.stock[stockIdx];
    if (!it) return false;
    camp.gold += Math.max(2, Math.round((it.val || 10) * 0.5));
    camp.stock.splice(stockIdx, 1);
    autosave(camp);
    return true;
  }

  /* ── Sauvegarde ── */
  function serialize(camp) { return camp; }
  function autosave(camp) { if (LS) { try { LS.setItem('gris_save', K.saveGame(serialize(camp))); } catch (e) { } } }
  function hasSave() { if (!LS) return false; try { return !!LS.getItem('gris_save'); } catch (e) { return false; } }
  function loadSave() {
    if (!LS) return null;
    try {
      var s = LS.getItem('gris_save');
      if (!s) return null;
      return restore(K.loadGame(s));
    } catch (e) { return null; }
  }
  function restore(o) {
    if (!o || !o.roster) return null;
    o.roster.forEach(function (m) { m.id = m.id || (++_mid); });
    return o;
  }
  function deleteSave() { if (LS) { try { LS.removeItem('gris_save'); } catch (e) { } } }

  return {
    CLASSES: CLASSES, CLS_KEYS: CLS_KEYS, MOB: MOB, CONTRACTS: CONTRACTS,
    RANGED_BASES: RANGED_BASES, rangedWeapon: rangedWeapon, weaponTags: weaponTags,
    makeMerc: makeMerc, mercMaxHp: mercMaxHp, battleStats: battleStats,
    newCampaign: newCampaign, startBattle: startBattle, finishBattle: finishBattle,
    wagesDue: wagesDue, payWages: payWages, recruits: recruits, buyRecruit: buyRecruit,
    surgeryCost: surgeryCost, surgery: surgery, giveItem: giveItem, sellItem: sellItem,
    serialize: serialize, restore: restore, autosave: autosave, hasSave: hasSave, loadSave: loadSave, deleteSave: deleteSave
  };
});
