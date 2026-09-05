/* ═══════════════════════════════════════════════════════════════
   LOGRES — La Table Ronde (V1, v19) — couche campagne
   Batailles : kernel/combat-tb.js (capacités + moral inclus)
   Rendu 3D : logres-3d.js (Three.js r128) · Objets/saves : rpg-core.js
   UMD : Node (module.exports) · navigateur (window.LOGRES)
   V1 : 14 provinces, 8 héros (loyauté/jalousies, Table Ronde),
   capacités héroïques, moral des ennemis faibles, 6 fins de règne.
   ═══════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports)
    module.exports = factory(require('./kernel/rpg-core.js'), require('./kernel/combat-tb.js'));
  else root.LOGRES = factory(root.RPGCORE, root.COMBATTB);
})(typeof self !== 'undefined' ? self : this, function (K, T) {
  'use strict';

  var LS = (function () { try { return (typeof localStorage !== 'undefined') ? localStorage : null; } catch (e) { return null; } })();

  /* ── Types de chevaliers ── */
  var HERO_TYPES = {
    chevalier: { n: 'Chevalier',  glyph: 'C', hp: 36, mp: 4, spd: 6, weapon: 'épée courte', dice: [2, 4], reach: 1, ap: 1, def: 5, color: '#0c87a8' },
    banneret:  { n: 'Banneret',   glyph: 'B', hp: 32, mp: 4, spd: 6, weapon: 'lance',       dice: [2, 3], reach: 2, ap: 0, def: 5, color: '#0a6d89', banner: true },
    hache:     { n: 'Maîtresse d\u2019armes', glyph: 'M', hp: 30, mp: 4, spd: 7, weapon: 'hache de guerre', dice: [1, 8], reach: 1, ap: 2, def: 3, color: '#b45309' },
    moine:     { n: 'Frère d\u2019armes',    glyph: 'F', hp: 34, mp: 3, spd: 5, weapon: 'marteau de fer', dice: [2, 4], reach: 1, ap: 1, def: 6, color: '#5c6b7a', heal: true },
    sage:      { n: 'Voix des Brumes', glyph: 'S', hp: 24, mp: 3, spd: 5, weapon: 'dague',  dice: [1, 6], reach: 4, ranged: true, ap: 0, def: 1, color: '#7a5ea8' }
  };

  /* axis : 'leg' = gagne en loyauté aux choix légitimes, 'fer' = aux choix durs. */
  var HEROES_START = [
    { key: 'alain',   name: 'Alain d\u2019Ys',    titre: 'Chevalier du Lac', type: 'chevalier', axis: 'leg', loyalty: 7, ability: 'strike', trait: 'Poursuite du Lac : +1 pas · Frappe héroïque' },
    { key: 'bohort',  name: 'Bohort le Gris',     titre: 'Porte-Étendard',   type: 'banneret',  axis: 'leg', loyalty: 6, ability: 'rally',  trait: 'Étendard haut : +1 défense à la troupe · Ralliement' }
  ];
  var HEROES_RECRUES = [
    { key: 'maelys',   name: 'Maëlys des Brumes',  titre: 'Maîtresse d\u2019armes', type: 'hache', axis: 'fer', loyalty: 5, ability: 'pierce', quest: 2, trait: 'Fer des Brumes : +1 perce-armure · Pointe de fer' },
    { key: 'ambroise', name: 'Frère Ambroise',     titre: 'Moine de Verte-Épine',  type: 'moine', axis: 'leg', loyalty: 5, ability: 'heal',   quest: 3, trait: 'Office : la troupe entre avec +25 % PV · Soin de masse' },
    { key: 'gaheris',  name: 'Gaheris le Vif',     titre: 'Cavalier des Tombes',   type: 'chevalier', axis: 'fer', loyalty: 4, ability: 'strike', quest: 8, trait: 'Souffle neuf : +1 pas · Frappe héroïque' }
  ];
  var HEROES_HIRE = [
    { key: 'gauvain',  name: 'Gauvain au long bras', titre: 'Champion errant',   type: 'chevalier', axis: null, loyalty: 5, ability: 'strike', cost: 120, trait: 'Lame vendue au plus juste · Frappe héroïque' },
    { key: 'galaad',   name: 'Galaad le Chaste',     titre: 'Chevalier du Ciel', type: 'moine',     axis: 'leg', loyalty: 6, ability: 'heal',  cost: 140, trait: 'Pureté : +1 défense · Office de soin' },
    { key: 'morgane',  name: 'Morgane la Voix',      titre: 'Fille des brumes',  type: 'sage',      axis: 'fer', loyalty: 4, ability: 'nova',  cost: 150, trait: 'Nova de brumes · +1 perce-armure' }
  ];
  var ABILITIES = {
    strike: { n: 'Frappe héroïque', d: 'dégâts doublés sur un voisin, sans riposte' },
    pierce: { n: 'Pointe de fer',   d: 'frappe un voisin en ignorant l\u2019armure' },
    rally:  { n: 'Ralliement',      d: '+2 défense aux alliés proches (1 manche)' },
    heal:   { n: 'Office de soin',  d: '+6 PV aux alliés adjacents' },
    nova:   { n: 'Nova de brumes',  d: 'éclat arcanique sur tous les voisins' }
  };

  /* ── Régiments ── */
  var REGS = {
    sergent: { n: 'Sergents',     glyph: 'S', hp: 16, mp: 3, spd: 5, dice: [1, 5], reach: 1, ap: 1, def: 3, cost: 50,  color: '#0c87a8' },
    archer:  { n: 'Archers',      glyph: 'A', hp: 12, mp: 3, spd: 5, dice: [1, 6], reach: 5, ap: 0, def: 0, ranged: true, cost: 65, color: '#12809c' },
    garde:   { n: 'Hommes d\u2019armes', glyph: 'H', hp: 22, mp: 2, spd: 4, dice: [1, 6], reach: 1, ap: 0, def: 5, cost: 80, color: '#085e77' }
  };
  var ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

  /* ── Ennemis (routAt = fraction de PV sous laquelle le moral lâche) ── */
  var MOB = {
    brigand: { n: 'brigand',         glyph: 'b', hp: 12, mp: 3, spd: 5, dice: [1, 5], reach: 1, def: 1, ai: 'melee',  xp: 8,  gold: 6,  color: '#8f3a34', routAt: .45 },
    picte:   { n: 'éclaireur picte', glyph: 'p', hp: 13, mp: 5, spd: 8, dice: [1, 6], reach: 1, def: 0, ai: 'beast',  xp: 11, gold: 4,  color: '#3f6d54', routAt: .5 },
    hirdman: { n: 'hirdman saxon',   glyph: 'h', hp: 18, mp: 3, spd: 4, dice: [1, 6], reach: 1, def: 3, ap: 1, ai: 'melee',  xp: 14, gold: 9,  color: '#6e2f2a' },
    archerS: { n: 'archer saxon',    glyph: 'a', hp: 11, mp: 3, spd: 5, dice: [1, 5], reach: 4, def: 0, ranged: true, ai: 'ranged', xp: 12, gold: 8, color: '#7a4a2e', routAt: .5 },
    rider:   { n: 'cavalier saxon',  glyph: 'v', hp: 20, mp: 5, spd: 7, dice: [1, 7], reach: 1, def: 2, ai: 'melee',  xp: 18, gold: 10, color: '#703028', routAt: .4 },
    chaman:  { n: 'chaman picte',    glyph: 'Ψ', hp: 13, mp: 3, spd: 5, dice: [1, 6], reach: 4, def: 0, ranged: true, ai: 'ranged', xp: 15, gold: 12, color: '#4a5e3a', routAt: .5 },
    thane:   { n: 'thane saxon',     glyph: 'T', hp: 26, mp: 3, spd: 5, dice: [2, 4], reach: 1, def: 4, ap: 1, ai: 'melee',  xp: 22, gold: 18, color: '#5a241f' },
    hengist: { n: 'Hengist, chef saxon', glyph: 'X', hp: 46, mp: 3, spd: 5, dice: [2, 5], reach: 1, def: 5, ap: 2, ai: 'melee', xp: 45, gold: 60, color: '#3a1c18', boss: 1 }
  };

  /* ── Les quatorze provinces ── */
  var QUESTS = [
    {
      prov: 'Les Champs Gris', nom: 'La route des charretiers',
      brief: 'Des brigands taxent les charretiers près des Champs Gris. Trop proches du bourg pour attendre : vos lances parleront d\u2019abord.',
      comp: [['brigand', 4], ['archerS', 1], ['thane', 1]],
      terrain: { rocks: .05, trees: .12, bush: .12, mud: .08 }, gold: 70, depth: 2,
      event: { q: 'Les pillards capturés crient merci. Que faire du butin des pauvres gens ?',
        a: { t: 'Rendre tout aux charretiers, sans rançon', dt: -1, or: 0, txt: 'Légitime — on chante le roi juste.' },
        b: { t: 'Confisquer pour entretenir la troupe', dt: +1, or: 45, txt: 'Tyran — la troupe est payée, le bourg boude.' } }
    },
    {
      prov: 'Le Gué-Brume', nom: 'Le gué des Pictes',
      brief: 'Une bande pictes tient le seul gué du Gué-Brume depuis trois jours, narguant les voyageurs. Le passeur vous offrira sa barque pour les chasser.',
      comp: [['picte', 5], ['thane', 1]],
      terrain: { rocks: .08, trees: .10, bush: .14, mud: .18 }, gold: 85, depth: 3,
      event: { q: 'Un chef picte blessé est votre prisonnier. La loi de la guerre est à vous.',
        a: { t: 'Le relâcher, parole donnée de quitter le gué', dt: -1, or: 0, txt: 'Légitime — même les sauvages parlent de votre honneur.' },
        b: { t: 'L\u2019enchaîner comme exemple', dt: +1, or: 30, txt: 'Tyran — personne ne retiendra plus le gué.' } }
    },
    {
      prov: 'La Lande aux Corbeaux', nom: 'Le camp d\u2019Horsa',
      brief: 'Les longues nasses saxons se dressent sur la Lande aux Corbeaux. Horsa, frère d\u2019Hengist, massonne ses hirdmen pour l\u2019hiver. Frappez le camp avant la brume.',
      comp: [['hirdman', 3], ['archerS', 2], ['thane', 1]],
      terrain: { rocks: .10, trees: .06, bush: .10, mud: .12 }, gold: 110, depth: 4, recrue: 'maelys',
      event: { q: 'Le camp est pris. Des familles saxonnes suivent la troupe : des civils, pas des soldats.',
        a: { t: 'Les laisser repartir à l\u2019est avec vivres', dt: -1, or: 0, txt: 'Légitime — la miséricorde se sait au-delà des mers.' },
        b: { t: 'Les réduire en servage aux fermes', dt: +1, or: 55, txt: 'Tyran — les fermes manquent de bras, dit-on.' } }
    },
    {
      prov: 'Verte-Épine', nom: 'La forêt aux Pendus',
      brief: 'Dans Verte-Épine, des brigands et des pictes déserteurs pillent les hameaux de la lisière. Le prieur d\u2019Ambroise promet la bénédiction du prieuré à qui nettoiera la forêt.',
      comp: [['brigand', 3], ['picte', 2], ['thane', 1], ['archerS', 1]],
      terrain: { rocks: .06, trees: .24, bush: .16, mud: .08 }, gold: 120, depth: 5, recrue: 'ambroise',
      event: { q: 'Le prieur réclame le bois des Pendus pour agrandir son cloître.',
        a: { t: 'Refuser : le bois reste aux hameaux', dt: -1, or: 0, txt: 'Légitime — le clergé gronde, les paysans bénissent.' },
        b: { t: 'Accorder, contre l\u2019or du trésor du prieuré', dt: +1, or: 60, txt: 'Tyran — le cloître grandit, la forêt dépérit.' } }
    },
    {
      prov: 'Les Falaises de Karnag', nom: 'Les dolmens hurlants',
      brief: 'Des pictes se sont retranchés parmi les dolmens de Karnag ; leurs chamans murmurent aux vieilles pierres et les charretiers refusent la corniche. Faites taire les brumes.',
      comp: [['picte', 4], ['chaman', 1], ['thane', 1]],
      terrain: { rocks: .10, trees: .06, bush: .12, mud: .10 }, gold: 95, depth: 3,
      event: { q: 'Les pierres hurlantes sont revenues au silence. Les Anciens du bourg veulent y rallumer les feux de la Vieille Foi.',
        a: { t: 'Laisser les feux des Anciens reprendre', dt: -1, or: 0, txt: 'Légitime — les vieilles pierres se souviennent de votre respect.' },
        b: { t: 'Couper le gui et dresser une croix de fer', dt: +1, or: 35, txt: 'Tyran — le clergé approuve, les Anciens ragent.' } }
    },
    {
      prov: 'Le Pont-aux-Corbeaux', nom: 'Le péage de sang',
      brief: 'Des déserteurs à cheval lèvent un péage sur le grand pont. Les marchands paient, les pèlerins pleurent, et le pontan regarde ailleurs.',
      comp: [['brigand', 3], ['rider', 2], ['hirdman', 1]],
      terrain: { rocks: .05, trees: .08, bush: .10, mud: .08 }, gold: 110, depth: 3,
      event: { q: 'Le chef du péage est pendu à sa propre corde. Ses hommes demandent à servir sous votre bannière.',
        a: { t: 'Les désarmer et les renvoyer aux moissons', dt: -1, or: 0, txt: 'Légitime — mieux vaut un champ nourri qu\u2019une lance de plus.' },
        b: { t: 'Les incorporer de force, sous les fouets', dt: +1, or: 40, txt: 'Tyran — la troupe grossit, la peur aussi.' } }
    },
    {
      prov: 'Les Marais d\u2019Ys', nom: 'Les feux folles d\u2019Ys',
      brief: 'Dans les marais d\u2019Ys, des chamans pictes égarent les voyageurs par leurs feux folles. Deux charretiers ont déjà disparu. La brume, ici, a des dents.',
      comp: [['picte', 4], ['chaman', 2], ['archerS', 1]],
      terrain: { rocks: .04, trees: .06, bush: .14, mud: .22 }, gold: 120, depth: 4,
      event: { q: 'Une chaman captive propose de révéler les gués secrets contre sa vie.',
        a: { t: 'Lui accorder sa parole et sa liberté', dt: -1, or: 0, txt: 'Légitime — la parole du roi vaut plus qu\u2019un secret.' },
        b: { t: 'L\u2019utiliser, puis la laisser aux marais', dt: +1, or: 30, txt: 'Tyran — les gués sont connus, la brume se souviendra.' } }
    },
    {
      prov: 'La Route du Sel', nom: 'Le sel et le sang',
      brief: 'Les convois de sel ne passent plus : des cavaliers saxons frappent les chars et brûlent les sacs. Sans sel, l\u2019hiver sera cruel.',
      comp: [['rider', 2], ['brigand', 2], ['hirdman', 2]],
      terrain: { rocks: .06, trees: .10, bush: .08, mud: .10 }, gold: 135, depth: 4,
      event: { q: 'Le convoi est sauvé. Les marchands offrent le double du marché pour une escorte permanente.',
        a: { t: 'Refuser : la troupe ne sera pas à soldes privées', dt: -1, or: 0, txt: 'Légitime — le sel du roi ne se vend pas pièce à pièce.' },
        b: { t: 'Accepter : l\u2019or fera fondre la misère', dt: +1, or: 65, txt: 'Tyran — la caisse rit, la couronne s\u2019affiche.' } }
    },
    {
      prov: 'Les Tombes des Rois', nom: 'Les veilleurs des Tombes',
      brief: 'Des saxons fouillent les Tombes des Rois, arrachant l\u2019or funéraire des anciens. Déterrer les morts, c\u2019est déterrer la guerre.',
      comp: [['hirdman', 2], ['chaman', 2], ['thane', 1]],
      terrain: { rocks: .12, trees: .10, bush: .10, mud: .08 }, gold: 140, depth: 5, recrue: 'gaheris',
      event: { q: 'Dans la tombe ouverte : une couronne de fer rouge et un nom gravé que nul ne sait lire.',
        a: { t: 'Sceller la tombe sans rien prendre', dt: -1, or: 0, txt: 'Légitime — les rois morts dorment mieux sous un roi vivant.' },
        b: { t: 'Vendre la couronne au forgeron du bourg', dt: +1, or: 55, txt: 'Tyran — le fer sert mieux en main qu\u2019en terre.' } }
    },
    {
      prov: 'Le Bois Sans Retour', nom: 'Ce qui pend dans les bois',
      brief: 'Au Bois Sans Retour, les déserteurs pendent les bûcherons aux branches basses. Le bois manque, l\u2019hiver avance.',
      comp: [['picte', 3], ['hirdman', 2], ['chaman', 1], ['archerS', 1]],
      terrain: { rocks: .06, trees: .26, bush: .14, mud: .06 }, gold: 150, depth: 5,
      event: { q: 'Les pendus sont trop nombreux pour être enterrés chacun. Le bois doit brûler les corps.',
        a: { t: 'Payer le rite du feu sur vos deniers', dt: -1, or: -25, txt: 'Légitime — coûteux, mais les familles veillent en paix.' },
        b: { t: 'Jeter les corps au fossé, l\u2019économie avant tout', dt: +1, or: 0, txt: 'Tyran — les corbeaux ne font pas de discours.' } }
    },
    {
      prov: 'Le Val-aux-Loups', nom: 'Les loups du Val',
      brief: 'Horsa a juré de reprendre la Lande : ses loups — cavaliers et hirdmen — rôdent au Val-aux-Loups depuis la lune noire.',
      comp: [['rider', 2], ['hirdman', 2], ['archerS', 2], ['thane', 1]],
      terrain: { rocks: .10, trees: .10, bush: .10, mud: .12 }, gold: 165, depth: 5,
      event: { q: 'Un vieux saxon mourant demande la paix de sa loi : mourir les yeux vers la mer.',
        a: { t: 'Lui ouvrir la route de la mer, escorté', dt: -1, or: 0, txt: 'Légitime — même les loups savent qui laisse mourir en paix.' },
        b: { t: 'Le garder en otage pour l\u2019échange', dt: +1, or: 35, txt: 'Tyran — un otage vaut deux rançons.' } }
    },
    {
      prov: 'Les Portes de Fer', nom: 'La forge des Portes',
      brief: 'Aux Portes de Fer, les forges saxons martèlent jour et nuit. Chaque semaine d\u2019attente est une lame de plus contre vous.',
      comp: [['hirdman', 3], ['thane', 2], ['chaman', 1]],
      terrain: { rocks: .16, trees: .06, bush: .08, mud: .10 }, gold: 180, depth: 6,
      event: { q: 'Les forges sont à vous. Les forgerons saxons demandent grâce pour leur feu.',
        a: { t: 'Les laisser rentrer, mèches éteintes', dt: -1, or: 0, txt: 'Légitime — il en reviendra certains en artisans libres.' },
        b: { t: 'Les enchaîner à vos propres forges', dt: +1, or: 60, txt: 'Tyran — le fer de Logres sera saxon jusqu\u2019à la moelle.' } }
    },
    {
      prov: 'Sallesbières', nom: 'La plaine de Sallesbières',
      brief: 'C\u2019est ici que les rois se jugeaient autrefois. Hengist a rassemblé tout ce qui reste de ses clans : la plaine sera le moule de votre légende.',
      comp: [['rider', 3], ['hirdman', 3], ['archerS', 2], ['chaman', 1], ['thane', 1]],
      terrain: { rocks: .08, trees: .04, bush: .08, mud: .12 }, gold: 210, depth: 6,
      event: { q: 'La plaine est couverte des deux douleurs. Les corbeaux, eux, ne choisissent pas de camp.',
        a: { t: 'Ensevelir ennemis et nôtres sous la même pierre', dt: -1, or: -20, txt: 'Légitime — la terre de Sallesbières gardera tous les noms.' },
        b: { t: 'Élever une pyramide de casques saxons', dt: +1, or: 0, txt: 'Tyran — l\u2019exemple dure plus longtemps que le deuil.' } }
    },
    {
      prov: 'La Porte du Brouillard', nom: 'La Porte du Brouillard',
      brief: 'Hengist en personne tient le col de la Porte du Brouillard avec sa garde de thanes. Ici s\u2019écrit l\u2019hiver saxon — ou celui de votre nom.',
      comp: [['hirdman', 3], ['archerS', 1], ['thane', 1], ['hengist', 1]],
      terrain: { rocks: .14, trees: .08, bush: .10, mud: .14 }, gold: 220, depth: 6, boss: true,
      event: null
    }
  ];

  /* ── Faveurs ── */
  var FAVEURS = [
    { key: 'soin', n: 'Soin des hâtives', d: 'La troupe entre à PV pleins' },
    { key: 'armure', n: 'Bénédiction d\u2019armure', d: '+2 défense à chaque unité' },
    { key: 'elan', n: 'Élan de charge', d: '+1 pas à chaque unité' }
  ];

  /* ── Campagne ── */
  var _hid = 0;
  function makeHero(def, rng) {
    var t = HERO_TYPES[def.type];
    var inv = K.makeInventory(8);
    var w = K.rollItem(rng, 2, { kind: 'weapon', force: t.weapon });
    K.invAdd(inv, w); K.invEquip(inv, w);
    return {
      id: ++_hid, key: def.key, name: def.name, titre: def.titre, type: def.type,
      axis: def.axis || null, loyalty: def.loyalty != null ? def.loyalty : 5,
      ability: def.ability || null, trait: def.trait,
      level: 1, xp: 0, hp: 0, absent: 0, gone: false, inv: inv
    };
  }
  function makeReg(key, idx) {
    return { id: 'reg' + key + idx, key: key, name: REGS[key].n + ' ' + ROMANS[idx], alive: true };
  }
  function newCampaign(seed) {
    var rng = K.makeRng(seed || ('logres-' + Date.now()));
    var camp = {
      _v: 1, seed: String(seed || ('logres-' + Math.floor(rng() * 1e9))),
      gold: 150, quest: 0, gauge: 0, cleared: 0, done: false, over: false,
      heroes: [], regiments: [], stock: [], faveur: null, choices: {}, deadRegs: 0
    };
    HEROES_START.forEach(function (d) {
      var h = makeHero(d, rng);
      h.hp = heroMaxHp(h);
      camp.heroes.push(h);
    });
    ['sergent', 'sergent', 'archer'].forEach(function (k, i) { camp.regiments.push(makeReg(k, i)); });
    return camp;
  }

  function heroMaxHp(h) {
    var t = HERO_TYPES[h.type];
    var es = K.equipStats(h.inv);
    return t.hp + 4 * (h.level - 1) + (es.hp || 0);
  }
  function heroBattleStats(h) {
    var t = HERO_TYPES[h.type];
    var es = K.equipStats(h.inv);
    var m = { spd: 0, ap: 0, mp: 0 };
    if (h.key === 'alain') m.spd = 1;
    if (h.key === 'maelys') m.ap = 1;
    if (h.key === 'gaheris') m.mp = 1;
    if (h.key === 'galaad' || h.key === 'morgane') m.ap = 1;
    return {
      hp: heroMaxHp(h),
      mp: t.mp + m.mp, spd: t.spd + m.spd,
      dice: t.dice.slice(), reach: t.reach, ap: t.ap + m.ap, ranged: !!t.ranged,
      def: t.def + (h.key === 'galaad' ? 1 : 0) + (h.level - 1) + (es.def || 0),
      crit: 5 + h.level + (es.crit || 0)
    };
  }
  function regBattleStats(r) {
    var t = REGS[r.key];
    return { hp: t.hp, mp: t.mp, spd: t.spd, dice: t.dice.slice(), reach: t.reach, ap: t.ap, ranged: !!t.ranged, def: t.def, crit: 5 };
  }
  function heroMarchable(h) { return !h.gone && !h.absent && h.loyalty > 2 && h.hp > 0; }
  function armyFor(camp) {
    var list = [];
    camp.heroes.forEach(function (h) { if (heroMarchable(h)) list.push({ kind: 'hero', data: h }); });
    camp.regiments.forEach(function (r) { if (r.alive) list.push({ kind: 'reg', data: r }); });
    return list;
  }
  function recruitCount(camp) {
    var nb = {};
    camp.regiments.forEach(function (r) { nb[r.key] = (nb[r.key] || 0) + 1; });
    return nb;
  }
  function hireReg(camp, key) {
    var t = REGS[key];
    var nb = recruitCount(camp)[key] || 0;
    if (camp.gold < t.cost || camp.regiments.length >= 6) return false;
    camp.gold -= t.cost;
    camp.regiments.push(makeReg(key, nb));
    autosave(camp);
    return true;
  }
  function hireHero(camp, key) {
    var def = null;
    HEROES_HIRE.forEach(function (d) { if (d.key === key) def = d; });
    if (!def) return false;
    if (camp.gold < def.cost || camp.heroes.length >= 8) return false;
    if (camp.heroes.some(function (h) { return h.key === key; })) return false;
    var rng = K.makeRng(camp.seed + ':hire:' + key);
    var h = makeHero(def, rng);
    h.hp = heroMaxHp(h);
    camp.gold -= def.cost;
    camp.heroes.push(h);
    autosave(camp);
    return true;
  }

  /* ── Bataille ── */
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

  function startBattle(camp, seedStr) {
    var quest = QUESTS[camp.quest];
    var rngMap = K.makeRng(camp.seed + ':map:' + camp.quest);
    var tiles = T.genMap(rngMap, 4, quest.terrain);
    var rng = K.makeRng(seedStr || (camp.seed + ':bat:' + camp.quest + ':' + Date.now()));
    var cols = deployColumns(tiles);
    var la = cols.left.slice(), lb = cols.right.slice();
    var units = [], mapping = { hero: {}, reg: {} };

    var army = armyFor(camp);
    var favHeal = camp.faveur === 'soin';
    var favDef = camp.faveur === 'armure' ? 2 : 0;
    var favMp = camp.faveur === 'elan' ? 1 : 0;
    var hasBanner = army.some(function (u) { return u.kind === 'hero' && HERO_TYPES[u.data.type].banner; });
    var hasHealer = army.some(function (u) { return u.kind === 'hero' && HERO_TYPES[u.data.type].heal; });

    army.forEach(function (u) {
      var st, name, glyph, color, ability = null;
      if (u.kind === 'hero') {
        st = heroBattleStats(u.data);
        name = u.data.name; glyph = HERO_TYPES[u.data.type].glyph;
        color = HERO_TYPES[u.data.type].color;
        if (u.data.ability) ability = { k: u.data.ability, uses: 1 };
        if (hasHealer) st.hp = st.hp + Math.round(st.hp * .25);
        u.data.hp = Math.min(st.hp, favHeal ? st.hp : u.data.hp);
        st.hp = u.data.hp;
      } else {
        st = regBattleStats(u.data);
        name = u.data.name; glyph = REGS[u.data.key].glyph;
        color = REGS[u.data.key].color;
        if (hasHealer) st.hp = st.hp + Math.round(st.hp * .25);
      }
      var spot = la.shift() || { q: 0, r: 0 };
      units.push({
        side: 'A', q: spot.q, r: spot.r, name: name, cls: name, glyph: glyph, color: color,
        hp: st.hp, mp: st.mp + favMp, spd: st.spd,
        dice: st.dice, reach: st.reach, ranged: st.ranged, ap: st.ap,
        def: st.def + favDef + (hasBanner ? 1 : 0), crit: st.crit,
        hero: u.kind === 'hero', uid: u.data.id, kind: u.kind, ability: ability
      });
      mapping[u.kind][u.data.id] = units.length - 1;
    });

    var ei = 0;
    quest.comp.forEach(function (pair) {
      for (var j = 0; j < pair[1]; j++) {
        var d = MOB[pair[0]];
        var spot = lb.shift() || { q: 0, r: 0 };
        units.push({
          side: 'B', q: spot.q, r: spot.r, name: d.n, cls: d.n, glyph: d.glyph, color: d.color,
          hp: d.hp, mp: d.mp, spd: d.spd, dice: d.dice.slice(),
          reach: d.reach, ranged: !!d.ranged, ap: d.ap || 0, def: d.def,
          crit: 5, ai: d.ai, xp: d.xp, gold: d.gold, boss: !!d.boss,
          routAt: d.routAt || 0
        });
        ei++;
      }
    });

    var B = T.makeBattle({ tiles: tiles, rng: rng, radius: 4, units: units });
    return { B: B, mapping: mapping, quest: camp.quest };
  }

  function finishBattle(camp, ctx) {
    var B = ctx.B, quest = QUESTS[camp.quest];
    var rng = K.makeRng(camp.seed + ':res:' + camp.quest + ':' + B.round);
    var won = B.winner === 'A';
    var sum = { won: won, heroDown: [], heroRouted: [], regsLost: [], regsRouted: [], levels: [], gold: 0, loot: [] };

    /* repos */
    camp.heroes.forEach(function (h) {
      var full = heroMaxHp(h);
      h.hp = Math.min(full, h.hp + Math.ceil(full / 2));
      if (h.absent > 0) h.absent--;
    });

    Object.keys(ctx.mapping.hero).forEach(function (hid) {
      var h = camp.heroes.filter(function (x) { return x.id === +hid; })[0];
      var u = B.units[ctx.mapping.hero[hid]];
      if (!h || !u) return;
      if (u.routed) {
        h.hp = Math.max(1, Math.round(heroMaxHp(h) * .2));
        sum.heroRouted.push(h.name);
      } else if (u.hp <= 0) {
        h.absent = 1;
        h.hp = Math.max(1, Math.round(heroMaxHp(h) * .3));
        sum.heroDown.push(h.name);
      } else {
        h.hp = u.hp;
        h.xp += (u.kills || 0) * 9 + 6;
        while (h.level < 9 && h.xp >= K.xpFor(h.level + 1)) {
          h.level++;
          sum.levels.push(h.name + ' (niv. ' + h.level + ')');
        }
      }
    });
    Object.keys(ctx.mapping.reg).forEach(function (rid) {
      var r = camp.regiments.filter(function (x) { return x.id === rid; })[0];
      var u = B.units[ctx.mapping.reg[rid]];
      if (!r || !u) return;
      if (u.routed) { sum.regsRouted.push(r.name); }
      else if (u.hp <= 0) { r.alive = false; camp.deadRegs++; sum.regsLost.push(r.name); }
    });

    if (won) {
      sum.gold = quest.gold;
      B.units.forEach(function (u) {
        if (u.side === 'B' && !u.alive && !u.routed) sum.gold += u.gold || 0;
      });
      camp.gold += sum.gold;
      var nbLoot = 1 + (rng() < 0.45 ? 1 : 0);
      for (var i = 0; i < nbLoot; i++) sum.loot.push(K.rollItem(rng, quest.depth, {}));
      camp.stock = camp.stock.concat(sum.loot);
      camp.cleared = camp.quest + 1;
      if (camp.quest >= QUESTS.length - 1) camp.done = true;
    }
    if (armyFor(camp).length === 0) camp.over = true;
    autosave(camp);
    return sum;
  }

  /* événement post-victoire : choix, jauge, loyautés (jalousies) */
  function applyEvent(camp, choiceKey) {
    var quest = QUESTS[camp.quest];
    if (!quest || !quest.event || camp.choices[camp.quest] != null) return null;
    var c = choiceKey === 'b' ? quest.event.b : quest.event.a;
    camp.choices[camp.quest] = choiceKey;
    camp.gauge = Math.max(-5, Math.min(5, camp.gauge + c.dt));
    camp.gold = Math.max(0, camp.gold + c.or);
    var sum = { dt: c.dt, or: c.or, recrue: null, gone: [] };
    camp.heroes.forEach(function (h) {
      if (h.gone) return;
      if (h.axis === 'leg') h.loyalty += (choiceKey === 'b' ? -1 : +1);
      if (h.axis === 'fer') h.loyalty += (choiceKey === 'b' ? +1 : -1);
      h.loyalty = Math.max(0, Math.min(10, h.loyalty));
      if (h.loyalty <= 0) { h.gone = true; sum.gone.push(h.name); }
    });
    if (quest.recrue) {
      var def = HEROES_RECRUES.filter(function (d) { return d.key === quest.recrue; })[0];
      if (def && !camp.heroes.some(function (h) { return h.key === def.key; })) {
        var rng = K.makeRng(camp.seed + ':recrue:' + def.key);
        var h = makeHero(def, rng);
        h.hp = heroMaxHp(h);
        camp.heroes.push(h);
        sum.recrue = h.name;
      }
    }
    camp.quest++;
    if (camp.quest >= QUESTS.length) { camp.done = true; camp.quest = QUESTS.length - 1; }
    autosave(camp);
    return sum;
  }
  function giveRelic(camp, heroId, stockIdx) {
    var h = camp.heroes.filter(function (x) { return x.id === heroId; })[0];
    var it = camp.stock[stockIdx];
    if (!h || !it) return false;
    if (it.kind === 'weapon') return false;
    if (!K.invAdd(h.inv, it)) return false;
    camp.stock.splice(stockIdx, 1);
    K.invEquip(h.inv, it);
    h.hp = Math.min(h.hp + Math.max(0, (K.equipStats(h.inv).hp || 0)), heroMaxHp(h));
    autosave(camp);
    return true;
  }
  function sellRelic(camp, stockIdx) {
    var it = camp.stock[stockIdx];
    if (!it) return false;
    camp.gold += Math.max(3, Math.round((it.val || 12) * 0.5));
    camp.stock.splice(stockIdx, 1);
    autosave(camp);
    return true;
  }

  /* ── Fins de règne (6 variantes) ── */
  function ending(camp) {
    var goneN = camp.heroes.filter(function (h) { return h.gone; }).length;
    var dark = goneN >= 2 || camp.deadRegs >= 4;
    if (camp.gauge <= -2) {
      return dark
        ? { t: 'LE SAINT RECONQUIS', txt: 'On vous chantera comme le Roi Légitime : juste, patient, béni des humbles. Hengist dort sous la Porte du Brouillard et les brumes se lèvent sur un Logres réparé — mais la Table est clairsemée : trop de places vides autour du guéridon rond, trop de noms dits à voix basse. Votre règne sera une prière et une plaie.' }
        : { t: 'LE ROI LÉGITIME', txt: 'On vous chantera comme le Roi Légitime : juste, patient, béni des humbles. Hengist est tombé, les brumes se lèvent sur un Logres réparé, et votre nom entrera dans les prières avant les chroniques. La Table Ronde est pleine, et le guéridon rond n\u2019a jamais autant ressemblé à un soleil.' };
    }
    if (camp.gauge >= 2) {
      return dark
        ? { t: 'LE CONQUÉRANT SANGLANT', txt: 'On vous obéira comme à l\u2019Empereur de Fer : redouté, exact, sans pitié. Hengist est tombé, Logres est à vous — mais les champs sont tenus par des serfs craintifs et la Table compte plus de tombes que de sièges. On baisse la voix quand on prononce votre nom ; c\u2019est déjà une manière de prière.' }
        : { t: 'L\u2019EMPEREUR DE FER', txt: 'On vous obéira comme à l\u2019Empereur de Fer : redouté, exact, sans pitié pour les faibles. Hengist dort sous la Porte du Brouillard, et dans les hameaux on baisse la voix quand on prononce votre nom. La couronne est à vous — qu\u2019en ferez-vous ?' };
    }
    return dark
      ? { t: 'LE ROI DES DEUX VISAGES', txt: 'Ni pur lait ni pur fiel : on dira de vous qu\u2019un roi se devait d\u2019être les deux. Hengist dort, le royaume gronde doucement, et la Table Ronde a trop de sièges vides pour durer. Les chroniqueurs hésiteront sur votre sourire.' }
      : { t: 'LE ROI DES DEUX VISAGES', txt: 'Ni pur lait ni pur fiel : on dira de vous qu\u2019un roi se devait d\u2019être les deux. Hengist dort sous la Porte du Brouillard, Logres vous appartient — le reste appartient aux chroniqueurs.' };
  }

  /* ── Sauvegarde ── */
  function serialize(camp) { return camp; }
  function restore(o) {
    if (!o || !o.heroes) return null;
    o.heroes.forEach(function (h) { h.id = h.id || (++_hid); });
    return o;
  }
  function autosave(camp) { if (LS) { try { LS.setItem('logres_save', K.saveGame(serialize(camp))); } catch (e) { } } }
  function hasSave() { if (!LS) return false; try { return !!LS.getItem('logres_save'); } catch (e) { return false; } }
  function loadSave() {
    if (!LS) return null;
    try {
      var s = LS.getItem('logres_save');
      if (!s) return null;
      return restore(K.loadGame(s));
    } catch (e) { return null; }
  }
  function deleteSave() { if (LS) { try { LS.removeItem('logres_save'); } catch (e) { } } }

  return {
    HERO_TYPES: HERO_TYPES, HEROES_START: HEROES_START, HEROES_RECRUES: HEROES_RECRUES,
    HEROES_HIRE: HEROES_HIRE, ABILITIES: ABILITIES,
    REGS: REGS, MOB: MOB, QUESTS: QUESTS, FAVEURS: FAVEURS,
    newCampaign: newCampaign, heroMaxHp: heroMaxHp, heroBattleStats: heroBattleStats,
    regBattleStats: regBattleStats, armyFor: armyFor, heroMarchable: heroMarchable,
    recruitCount: recruitCount, hireReg: hireReg, hireHero: hireHero,
    startBattle: startBattle, finishBattle: finishBattle, applyEvent: applyEvent,
    giveRelic: giveRelic, sellRelic: sellRelic, ending: ending,
    serialize: serialize, restore: restore, autosave: autosave, hasSave: hasSave, loadSave: loadSave, deleteSave: deleteSave
  };
});
