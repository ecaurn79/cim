/* ═══════════════════════════════════════════════════════════════════
   RPG-CORE — Le « KERNEL » des grands jeux du Hub C.I.M.
   inv-core (inventaire/équipement) + loot-core (butin procédural,
   affixes, raretés) + save-core (sauvegarde versionnée) + RNG seedé.
   Utilisé par : Cendres (roguelike), puis Confrérie, Logres, Arkhantis,
   Nordheim, La Zone, Caravanes. Tourne en navigateur ET en Node.
   ═══════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.RPGCORE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ── RNG déterministe (mulberry32 + hash de chaîne) ── */
  function hashSeed(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return (h >>> 0) || 1;
  }
  function makeRng(seed) {
    var a = typeof seed === 'string' ? hashSeed(seed) : (seed >>> 0 || 1);
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function dice(rng, n, d) { var s = 0; for (var i = 0; i < n; i++) s += 1 + Math.floor(rng() * d); return s; }

  /* ── Raretés ── */
  var RARITY = [
    { key: 'commun',     label: 'Commun',     color: '#c9d4dc', mult: 1.0,  aff: 0 },
    { key: 'raffine',    label: 'Raffiné',    color: '#57d178', mult: 1.35, aff: 1 },
    { key: 'rare',       label: 'Rare',       color: '#4aa8ff', mult: 1.8,  aff: 1 },
    { key: 'epique',     label: 'Épique',     color: '#b06bff', mult: 2.5,  aff: 2 },
    { key: 'legendaire', label: 'Légendaire', color: '#ff9d33', mult: 3.6,  aff: 3 }
  ];
  function rollRarity(rng, depth, boost) {
    var r = rng() * 100 - (depth * 1.4) - (boost || 0);
    if (r < 2) return 4;
    if (r < 8) return 3;
    if (r < 20) return 2;
    if (r < 42) return 1;
    return 0;
  }

  /* ── Bases d'objets ── */
  var BASES = {
    weapon: [
      { base: 'dague',          dice: [1, 4], crit: 12, val: 12 },
      { base: 'épée courte',    dice: [1, 6], crit: 6,  val: 20 },
      { base: 'hache de guerre',dice: [1, 8], crit: 5,  val: 32 },
      { base: 'marteau de fer', dice: [2, 4], crit: 4,  val: 40 },
      { base: 'lance',          dice: [1, 6], crit: 6,  val: 26 },
      { base: 'sabre cendré',   dice: [1, 7], crit: 9,  val: 55, minDepth: 3 },
      { base: 'épée de basilic',dice: [2, 5], crit: 10, val: 80, minDepth: 5 }
    ],
    armor: [
      { base: 'robe',           def: 1, val: 8 },
      { base: 'cuir bouilli',   def: 2, val: 16 },
      { base: 'cotte de cuir',  def: 3, val: 28 },
      { base: 'mailles',        def: 5, val: 48, minDepth: 3 },
      { base: 'harnois de plaques', def: 7, val: 90, minDepth: 5 }
    ],
    helm: [
      { base: 'capuchon',       def: 1, val: 8 },
      { base: 'casque de fer',  def: 2, val: 22 },
      { base: 'grand heaume',   def: 3, val: 44, minDepth: 4 }
    ],
    shield: [
      { base: 'targe',          def: 1, val: 12 },
      { base: 'écu renforcé',   def: 2, val: 30, minDepth: 3 },
      { base: 'pavois',         def: 3, val: 55, minDepth: 5 }
    ],
    amulet: [
      { base: 'amulette de cendre', val: 30 },
      { base: 'médaillon des profondeurs', val: 45, minDepth: 3 }
    ],
    ring: [
      { base: 'anneau de fer',  val: 25 },
      { base: 'anneau runique', val: 50, minDepth: 4 }
    ]
  };
  var AFFIX_PRE = [
    { k: 'atk',  v: [1, 2, 3, 5],   names: ['acéré', 'brutal', 'mortel', 'du bourreau'] },
    { k: 'crit', v: [5, 8, 12, 18], names: ['précis', 'perçant', "d'escrimeur", 'de duelliste'] },
    { k: 'vamp', v: [1, 2, 3, 4],   names: ['sanguinaire', 'avide', 'maudite de soif', 'du vampire'] }
  ];
  var AFFIX_SUF = [
    { k: 'hp',   v: [4, 8, 14, 22], names: ['du sang vaillant', 'du colosse', 'du titan', 'des immortels'] },
    { k: 'def',  v: [1, 2, 3, 5],   names: ['du rempart', 'de gardien', 'de la forteresse', 'du bastion'] },
    { k: 'mana', v: [3, 6, 10, 16], names: ['du flambeau', 'du rune-souffle', 'de l\u2019archmage', 'des brumes'] },
    { k: 'piety',v: [5, 10, 18, 30],names: ['du fervent', 'du pieux', 'des saints', 'des premiers'] }
  ];

  /* ── Fabrique d'objet ── */
  var _idSeq = 1;
  function rollItem(rng, depth, opts) {
    opts = opts || {};
    var kind = opts.kind || pick(rng, ['weapon', 'weapon', 'armor', 'helm', 'shield', 'amulet', 'ring']);
    var bases = BASES[kind].filter(function (b) { return !(b.minDepth > depth); });
    var b;
    if (opts.force) {
      b = BASES[kind].filter(function (x) { return x.base === opts.force; })[0] || bases[bases.length - 1];
    } else {
      b = bases[bases.length - 1 - Math.floor(Math.pow(rng(), 1.8) * bases.length)];
      b = BASES[kind][Math.max(0, BASES[kind].indexOf(b))];
    }
    var rar = rollRarity(rng, depth, opts.boost || 0);
    var it = {
      id: _idSeq++, kind: kind, base: b.base,
      rarity: rar, rarityKey: RARITY[rar].key,
      affixes: [], val: Math.round(b.val * RARITY[rar].mult),
      minDepth: b.minDepth || 1
    };
    if (kind === 'weapon') { it.dice = b.dice.slice(); it.crit = b.crit; }
    if (b.def) it.def = b.def;
    for (var i = 0; i < RARITY[rar].aff; i++) {
      var pool = (kind === 'weapon' && i === 0) ? AFFIX_PRE : (rng() < 0.5 ? AFFIX_PRE : AFFIX_SUF);
      var af = pick(rng, pool);
      var tier = Math.min(3, Math.floor(rng() * (1 + Math.min(4, depth / 2))));
      var aff = { k: af.k, v: af.v[tier], name: af.names[tier] };
      it.affixes.push(aff);
      it.val += af.v[tier] * 4;
    }
    it.name = itemFullName(it);
    return it;
  }
  function itemFullName(it) {
    var n = it.base;
    if (it.affixes.length) {
      var pre = it.affixes.filter(function (a) { return AFFIX_PRE.some(function (p) { return p.k === a.k; }); });
      var suf = it.affixes.filter(function (a) { return !AFFIX_PRE.some(function (p) { return p.k === a.k; }); });
      if (pre.length) n = pre[0].name + ' ' + n;
      if (suf.length) n += ' ' + suf[suf.length - 1].name;
    }
    return n;
  }
  function affixTotal(it, k) {
    var s = 0;
    (it.affixes || []).forEach(function (a) { if (a.k === k) s += a.v; });
    return s;
  }

  /* ── inv-core : inventaire + équipement ── */
  var SLOTS = ['weapon', 'armor', 'helm', 'shield', 'amulet', 'ring1', 'ring2'];
  function makeInventory(maxSlots) {
    return { items: [], max: maxSlots || 20, eq: {} };
  }
  function invAdd(inv, it) {
    if (inv.items.length >= inv.max) return false;
    inv.items.push(it);
    return true;
  }
  function invRemove(inv, it) {
    var i = inv.items.indexOf(it);
    if (i >= 0) { inv.items.splice(i, 1); return true; }
    return false;
  }
  function invEquip(inv, it, actor) {
    if (!invRemove(inv, it)) return false;
    var slot = it.kind === 'ring' ? (!inv.eq.ring1 ? 'ring1' : (!inv.eq.ring2 ? 'ring2' : 'ring1')) : it.kind;
    var old = inv.eq[slot];
    inv.eq[slot] = it;
    if (old) invAdd(inv, old);
    if (actor && actor.onEquip) actor.onEquip(it, slot);
    return true;
  }
  function invUnequip(inv, slot) {
    var it = inv.eq[slot];
    if (!it) return false;
    if (!invAdd(inv, it)) return false; /* sac plein */
    inv.eq[slot] = null;
    return true;
  }
  /* Stats totales depuis l'équipement : {atk,def,hp,mana,crit,vamp,piety} */
  function equipStats(inv) {
    var s = { atk: 0, def: 0, hp: 0, mana: 0, crit: 0, vamp: 0, piety: 0 };
    SLOTS.forEach(function (sl) {
      var it = inv.eq[sl];
      if (!it) return;
      if (it.dice) s.atk += affixTotal(it, 'atk');
      if (it.def) s.def += it.def + affixTotal(it, 'def');
      s.hp += affixTotal(it, 'hp');
      s.mana += affixTotal(it, 'mana');
      s.crit += affixTotal(it, 'crit');
      s.vamp += affixTotal(it, 'vamp');
      s.piety += affixTotal(it, 'piety');
    });
    return s;
  }

  /* ── XP / niveaux ── */
  function xpFor(level) { return Math.round(20 * Math.pow(level, 1.6)); }

  /* ── save-core : sauvegarde versionnée ── */
  var SAVE_VERSION = 1;
  function saveGame(obj) {
    obj = JSON.parse(JSON.stringify(obj));
    obj._v = SAVE_VERSION;
    obj._t = Date.now();
    return JSON.stringify(obj);
  }
  function loadGame(str) {
    try {
      var o = JSON.parse(str);
      if (!o || o._v !== SAVE_VERSION) return null;
      return o;
    } catch (e) { return null; }
  }

  return {
    makeRng: makeRng, hashSeed: hashSeed, pick: pick, dice: dice,
    RARITY: RARITY, rollRarity: rollRarity,
    BASES: BASES, rollItem: rollItem, itemFullName: itemFullName, affixTotal: affixTotal,
    SLOTS: SLOTS, makeInventory: makeInventory, invAdd: invAdd, invRemove: invRemove,
    invEquip: invEquip, invUnequip: invUnequip, equipStats: equipStats,
    xpFor: xpFor, saveGame: saveGame, loadGame: loadGame, SAVE_VERSION: SAVE_VERSION
  };
});
