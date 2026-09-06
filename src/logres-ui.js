/* ═══ LOGRES — interface : cour, bataille 3D, écrans ═══ */
(function () {
'use strict';
var T = window.COMBATTB, K = window.RPGCORE, E = window.LOGRES, R3 = window.LOGRES3D;
var $ = function (id) { return document.getElementById(id); };
var canvas = $('lgCanvas');

var camp = null, ctxBat = null, R = null, busy = false;
var fxList = [];

/* ── écrans ── */
function show(id) {
  ['lgMenu', 'lgCourt', 'lgBattle', 'lgEndWrap', 'lgFinal'].forEach(function (s) { $(s).style.display = 'none'; });
  if (id) $(id).style.display = (id === 'lgCourt' || id === 'lgBattle') ? 'block' : 'flex';
}
function showMenu() {
  show('lgMenu');
  $('lgContinue').style.display = E.hasSave() ? 'inline-block' : 'none';
}

function newCampaign() {
  E.deleteSave();
  camp = E.newCampaign(null);
  camp.faveur = 'soin';
  openCourt('La Table Ronde est fondée. Les brumes attendent votre premier ordre.');
}
function continueCampaign() {
  var o = E.loadSave();
  if (!o) return;
  camp = o;
  if (!camp.faveur) camp.faveur = 'soin';
  openCourt('La cour se rallie sous l\u2019étendard.');
}

/* ── cour (entre les batailles) ── */
function openCourt(note) {
  show('lgCourt');
  $('lgCourtNote').textContent = note || '';
  $('lgCourtGold').textContent = camp.gold;
  /* jauge Légitime ↔ Tyran */
  var pos = (camp.gauge + 5) / 10 * 100;
  $('lgGaugeMark').style.left = pos + '%';
  $('lgGaugeTxt').textContent = camp.gauge <= -2 ? 'Roi Légitime' : (camp.gauge >= 2 ? 'Roi Fer' : 'Entre les deux');
  /* progression provinces */
  var dots = '';
  E.QUESTS.forEach(function (q, i) {
    var cls = i < camp.quest ? ' done' : (i === camp.quest ? ' cur' : '');
    dots += '<span class="lg-dot' + cls + '" title="' + q.prov + '">' + (i + 1) + '</span>';
  });
  $('lgProg').innerHTML = dots;
  /* quête */
  var quest = E.QUESTS[camp.quest];
  $('lgQuestProv').textContent = quest.prov;
  $('lgQuestName').textContent = quest.nom;
  $('lgQuestBrief').textContent = quest.brief;
  $('lgMarchProv').textContent = quest.prov;
  /* troupe */
  var html = '';
  camp.heroes.forEach(function (h) {
    var t = E.HERO_TYPES[h.type];
    var st = E.heroBattleStats(h);
    var w = h.inv.eq.weapon;
    var relics = [];
    ['armor', 'helm', 'shield', 'amulet', 'ring1', 'ring2'].forEach(function (s2) {
      if (h.inv.eq[s2]) relics.push((h.inv.eq[s2].name || h.inv.eq[s2].base));
    });
    var axisIco = h.axis === 'leg' ? ' ✝' : (h.axis === 'fer' ? ' ⚔' : '');
    var loyTxt = h.gone ? '<small class="lg-abs">A quitté la Table Ronde</small>'
      : (h.loyalty <= 2 ? '<small class="lg-abs">Boude la campagne (loyauté ' + h.loyalty + ')</small>'
        : '<small>Loyauté ' + '♥'.repeat(Math.min(5, Math.ceil(h.loyalty / 2))) + ' ' + h.loyalty + '/10' + axisIco + '</small>');
    html += '<div class="lg-unit' + (h.absent || h.gone || h.loyalty <= 2 ? ' off' : '') + '"><div class="lg-unit-in"><b>' + t.glyph + ' · ' + h.name + '</b> <small>' + t.n + ' · ' + h.titre + ' · niv. ' + h.level + '</small>' +
      '<div class="lg-hpbar"><div style="width:' + Math.max(4, 100 * h.hp / E.heroMaxHp(h)) + '%"></div></div>' +
      '<small>' + h.hp + '/' + E.heroMaxHp(h) + ' PV · ' + st.dice[0] + 'd' + st.dice[1] + ' · déf ' + st.def +
      ' · portée ' + st.reach + '</small>' +
      '<small class="lg-trait">✦ ' + h.trait + '</small>' +
      '<small class="lg-eq">' + (w ? (w.name || w.base) : '—') + (relics.length ? ' · ' + relics.join(' · ') : '') + '</small>' +
      '<div class="lg-xp"><small>XP ' + h.xp + '/' + K.xpFor(h.level + 1) + '</small></div>' +
      loyTxt +
      (h.absent ? '<small class="lg-abs">🩹 Blessé — manque la prochaine bataille</small>' : '') +
      '</div></div>';
  });
  camp.regiments.forEach(function (r2) {
    var t = E.REGS[r2.key];
    html += '<div class="lg-unit' + (r2.alive ? '' : ' off') + '"><div class="lg-unit-in"><b>' + r2.name + '</b> <small>' + t.n + '</small>' +
      '<small>' + t.hp + ' PV · ' + t.dice[0] + 'd' + t.dice[1] + (t.ranged ? ' · portée ' + t.reach : '') + ' · déf ' + t.def + '</small>' +
      (r2.alive ? '' : '<small class="lg-abs">☠ Détruit</small>') + '</div></div>';
  });
  $('lgArmy').innerHTML = html;
  /* recrutement */
  var nb = E.recruitCount(camp);
  var rh = '';
  Object.keys(E.REGS).forEach(function (k2) {
    var t = E.REGS[k2];
    var maxed = camp.regiments.length >= 6;
    rh += '<button class="lg-btn sm' + (camp.gold < t.cost || maxed ? ' dis' : '') + '" data-hire="' + k2 + '"' +
      (camp.gold < t.cost || maxed ? ' disabled' : '') + '>+' + t.glyph + ' ' + t.n + ' (' + t.cost + ' or)' +
      ' <small>×' + (nb[k2] || 0) + '</small></button>';
  });
  $('lgHire').innerHTML = rh;
  /* Table Ronde : héros à recevoir */
  var th = '';
  E.HEROES_HIRE.forEach(function (d) {
    if (camp.heroes.some(function (h) { return h.key === d.key; })) return;
    var t = E.HERO_TYPES[d.type];
    th += '<div class="lg-item"><span><b style="color:' + t.color + '">' + t.glyph + '</b> <b>' + d.name + '</b>' +
      '<small>' + t.n + ' — ' + d.trait + '</small></span>' +
      '<button class="lg-btn sm" data-rec="' + d.key + '"' + (camp.gold < d.cost || camp.heroes.length >= 8 ? ' disabled' : '') + '>Recevoir à la Table (' + d.cost + ' or)</button></div>';
  });
  $('lgTable').innerHTML = th || '<p class="lg-dim">Tous les sièges de la Table sont occupés (8 héros maximum).</p>';
  /* avertissements loyauté */
  var warn = [];
  camp.heroes.forEach(function (h) {
    if (h.gone) warn.push(h.name + ' a quitté la Table.');
    else if (h.loyalty <= 2 && !h.absent) warn.push(h.name + ' boude la campagne (loyauté ' + h.loyalty + ') — un choix à sa dévotion la rassurera.');
  });
  $('lgWarn').innerHTML = warn.length ? warn.map(function (w2) { return '<p class="lg-abs" style="margin:2px 0;font-size:.8rem">⚠ ' + w2 + '</p>'; }).join('') : '';
  /* marche possible ? */
  $('lgMarchBtn').disabled = E.armyFor(camp).length === 0;
  /* reliquaire */
  var st2 = '';
  camp.stock.forEach(function (it, i) {
    var opts = camp.heroes.map(function (h) { return '<option value="' + h.id + '">' + h.name.split(' ')[0] + '</option>'; }).join('');
    st2 += '<div class="lg-item"><span>' + K.itemFullName(it) + '</span>' +
      '<span><select data-gsel="' + i + '">' + opts + '</select>' +
      '<button class="lg-btn sm" data-give="' + i + '">Remettre</button>' +
      '<button class="lg-btn sm ghost" data-sell="' + i + '">Vendre (+' + Math.max(3, Math.round((it.val || 12) * .5)) + ')</button></span></div>';
  });
  $('lgStock').innerHTML = st2 || '<p class="lg-dim">Le reliquaire attend les artefacts des victoires.</p>';
  /* faveurs */
  var fh = '';
  E.FAVEURS.forEach(function (f) {
    fh += '<button class="lg-fav' + (camp.faveur === f.key ? ' sel' : '') + '" data-fav="' + f.key + '"><b>' + f.n + '</b><small>' + f.d + '</small></button>';
  });
  $('lgFaveur').innerHTML = fh;
}

document.addEventListener('click', function (e) {
  var b;
  if ((b = e.target.closest('[data-fav]'))) { camp.faveur = b.dataset.fav; openCourt(); }
  else if ((b = e.target.closest('[data-hire]'))) {
    if (E.hireReg(camp, b.dataset.hire)) openCourt('Recrue enregistrée sur les registres.');
  }
  else if ((b = e.target.closest('[data-rec]'))) {
    if (E.hireHero(camp, b.dataset.rec)) openCourt('Un nouveau siège est rempli à la Table Ronde.');
  }
  else if ((b = e.target.closest('[data-give]'))) {
    var sel = document.querySelector('[data-gsel="' + b.dataset.give + '"]');
    if (sel && E.giveRelic(camp, +sel.value, +b.dataset.give)) openCourt('Relique remise au chevalier.');
    else openCourt('Ce chevalier garde son arme de quête — remettez une relique d\u2019autre sorte.');
  }
  else if ((b = e.target.closest('[data-sell]'))) { E.sellRelic(camp, +b.dataset.sell); openCourt('Relique vendue au prieuré.'); }
});

/* ── bataille ── */
function startBattle() {
  ctxBat = E.startBattle(camp);
  show('lgBattle');
  $('lgLog').innerHTML = '';
  fxList = [];
  resize();
  banner('BATAILLE — ' + E.QUESTS[camp.quest].nom.toUpperCase());
  log('⚔ ' + E.QUESTS[camp.quest].brief);
  var fav = E.FAVEURS.filter(function (f) { return f.key === camp.faveur; })[0];
  if (fav) log('✦ Faveur : ' + fav.n + ' (' + fav.d + ').');
  R = R3.mount(canvas, ctxBat);
  if (!R) {
    $('lgNoGL').style.display = 'flex';
    log('⛔ WebGL n\u2019est pas disponible ici — ouvrez la page dans un navigateur complet.');
  } else {
    $('lgNoGL').style.display = 'none';
    R.onHex = handleHex;
  }
  updateHud();
}
function banner(txt) {
  var b = $('lgBanner');
  b.textContent = txt;
  b.style.display = 'block';
  b.style.opacity = '1';
  setTimeout(function () { b.style.opacity = '0'; }, 1900);
}
function log(txt) {
  var el = $('lgLog');
  var d = document.createElement('div');
  d.textContent = txt;
  el.appendChild(d);
  while (el.children.length > 6) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
}
function uinfo(u) {
  return u.name + ' — PV ' + u.hp + '/' + u.maxhp + ' · dégâts ' + u.dice[0] + 'd' + u.dice[1] +
    (u.ranged ? ' · portée ' + u.reach : '') + (u.ap ? ' · perce ' + u.ap : '') +
    ' · déf ' + u.def + (u.boss ? ' · CHEF' : '');
}
function updateHud() {
  if (!ctxBat) return;
  var B = ctxBat.B, u = T.active(B);
  $('lgRound').textContent = B.round;
  $('lgGold').textContent = camp.gold;
  var strip = '';
  B.queue.forEach(function (x) {
    strip += '<span class="lg-chip' + (u && x.id === u.id ? ' me' : (x.side === 'B' ? ' foe' : '')) + '"' +
      (u && x.id === u.id ? ' title="À vous !"' : '') + '>' + x.glyph + '</span>';
  });
  $('lgQueue').innerHTML = strip;
  if (u) {
    $('lgActive').textContent = (u.side === 'A' ? '▶ ' : '⏳ ') + u.name;
    $('lgActiveInfo').textContent = uinfo(u);
    $('lgGuardBtn').disabled = u.side !== 'A';
    $('lgEndBtn').disabled = u.side !== 'A';
    var ab = u.ability;
    $('lgAbilityBtn').style.display = (u.side === 'A' && ab) ? '' : 'none';
    $('lgAbilityBtn').disabled = !(ab && ab.uses);
    $('lgAbilityBtn').innerHTML = ab ? ('✦ ' + (ABIL_N[ab.k] || ab.k) + ' <kbd>E</kbd>') : '✦';
  }
}
function resize() {
  var wrap = $('lgStage');
  var w2 = wrap.clientWidth;
  var h2 = Math.max(380, Math.min(w2 * .68, window.innerHeight * .64));
  canvas.style.width = w2 + 'px';
  canvas.style.height = h2 + 'px';
  canvas.width = w2; canvas.height = h2;
  if (R3.isMounted()) window.dispatchEvent(new Event('resize'));
}
window.addEventListener('resize', function () { if (ctxBat) resize(); });

/* clic 3D : déplacement / attaque */
function handleHex(q, r, uid) {
  if (!ctxBat || busy) return;
  var B = ctxBat.B, u = T.active(B);
  if (!u || u.side !== 'A') return;
  if (uid != null) {
    var target = B.units[uid];
    if (target && target.side === 'B') {
      var r2 = T.act(B, { t: 'attack', id: target.id });
      if (!r2.ok && r2.why === 'trop loin') log('Trop loin — rapprochez-vous d\u2019abord.');
      else if (!r2.ok && r2.why === 'pas de ligne de vue') log('Un obstacle bloque la trajectoire.');
      else if (!r2.ok) log('Impossible : ' + r2.why + '.');
      harvestFx();
      B.log.slice(-3).forEach(function (l) { log(l); });
      afterAction();
    } else if (target && target.side === 'A') {
      log(uinfo(target));
    }
    return;
  }
  var k2 = T.key(q, r);
  if (movesFor(u)[k2] != null) {
    var r3 = T.act(B, { t: 'move', q: q, r: r });
    if (r3.ok) { B.log.slice(-1).forEach(function (l) { log(l); }); updateHud(); refreshOverlays(); }
  }
}
function movesFor(u) {
  return (u && !u.moved && !u.attacked) ? T.reachable(ctxBat.B, u).dist : {};
}
function refreshOverlays() {
  if (!R || !ctxBat) return;
  var B = ctxBat.B, u = T.active(B);
  LOGRES3D_sync();
  if (!u || u.side !== 'A') { R.showMoves({}); R.showTargets({}); return; }
  R.showMoves(movesFor(u));
  var tg = {};
  if (!u.attacked) {
    T.foes(B, u).forEach(function (f) {
      var d = T.hexDist(u.xq, u.xr, f.xq, f.xr);
      if (d <= u.reach && (!u.ranged || T.hasLOS(B, u.xq, u.xr, f.xq, f.xr))) tg[f.id] = true;
    });
  }
  R.showTargets(tg);
}
function LOGRES3D_sync() { R3.sync(ctxBat); }

function harvestFx() {
  var B = ctxBat.B;
  while (B.fx.length) {
    var f = B.fx.shift();
    var uid = null;
    B.units.forEach(function (x) { if (x.xq === f.x && x.xr === f.y && x.alive) uid = x.id; });
    if (R) R.pulse(uid != null ? uid : -1);
    var sp = R ? R.screenPos(f.x, f.y) : null;
    if (sp) floatDmg(sp.x, sp.y, f.n, f.t);
  }
}
function floatDmg(x, y, n, kind) {
  var el = document.createElement('span');
  el.className = 'lg-dmg' + (kind === 'heal' ? ' lg-heal' : '');
  el.textContent = (kind === 'heal' ? '+' : '−') + n;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  $('lgStage').appendChild(el);
  setTimeout(function () { el.remove(); }, 1100);
}

/* ── tours ennemis ── */
function enemyTurns() {
  if (!ctxBat || ctxBat.B.over) { checkEnd(); return; }
  var u = T.active(ctxBat.B);
  if (!u) { checkEnd(); return; }
  if (u.side === 'A') { busy = false; updateHud(); refreshOverlays(); return; }
  busy = true;
  T.aiAct(ctxBat.B);
  harvestFx();
  ctxBat.B.log.slice(-2).forEach(function (l) { log(l); });
  setTimeout(function () {
    if (ctxBat.B.over) { busy = false; checkEnd(); return; }
    enemyTurns();
  }, 380);
}
function afterAction() {
  refreshOverlays();
  if (!ctxBat.B.over) enemyTurns();
  else checkEnd();
}

/* ── fin de bataille ── */
function checkEnd() {
  harvestFx();
  var B = ctxBat.B;
  if (!B.over) { updateHud(); return false; }
  R3.unmount();
  var sum = E.finishBattle(camp, ctxBat);
  var html = sum.won ? '<h3>✅ Victoire — ' + E.QUESTS[Math.min(camp.quest, E.QUESTS.length - 1)].prov + ' est à vous</h3>'
    : '<h3>❌ La journée est perdue — la troupe reflue</h3>';
  if (sum.heroDown.length) html += '<p>🩹 Chevaliers à terre (absents la prochaine bataille) : <b>' + sum.heroDown.join(', ') + '</b></p>';
  if (sum.regsLost.length) html += '<p>☠ Régiments détruits : ' + sum.regsLost.join(', ') + '</p>';
  if (sum.levels.length) html += '<p>⭐ ' + sum.levels.join(', ') + '</p>';
  if (sum.won) html += '<p>💰 Butin et tributs : +' + sum.gold + ' or</p>';
  if (sum.loot.length) html += '<p>🏺 Artefacts : ' + sum.loot.map(function (it) { return K.itemFullName(it); }).join(' · ') + '</p>';
  $('lgSum').innerHTML = html;
  $('lgEventBox').style.display = 'none';
  $('lgSumBox').style.display = 'block';
  var ev = sum.won ? E.QUESTS[camp.quest].event : null;
  $('lgSumNext').textContent = ev ? 'Décider du sort des vaincus…' : (camp.done ? 'Le destin du royaume' : 'Retour à la cour');
  $('lgSumNext').onclick = function () {
    if (ev) openEvent();
    else if (camp.done) showFinal();
    else openCourt('La cour attend vos ordres.');
  };
  show('lgEndWrap');
  ctxBat = null;
  return true;
}
function openEvent() {
  var ev = E.QUESTS[camp.quest].event;
  $('lgSumBox').style.display = 'none';
  $('lgEventBox').style.display = 'block';
  $('lgEventQ').textContent = ev.q;
  var ba = $('lgEventA'), bb = $('lgEventB');
  ba.innerHTML = '<b>' + ev.a.t + '</b><small>' + ev.a.txt + (ev.a.or ? ' (+' + ev.a.or + ' or)' : '') + '</small>';
  bb.innerHTML = '<b>' + ev.b.t + '</b><small>' + ev.b.txt + (ev.b.or ? ' (+' + ev.b.or + ' or)' : '') + '</small>';
}
function pickEvent(key) {
  var res = E.applyEvent(camp, key);
  var ev = E.QUESTS[camp.quest - 1].event;
  var c = key === 'b' ? ev.b : ev.a;
  var txt = c.txt;
  if (res && res.recrue) txt += ' — <b>' + res.recrue + ' rejoint la Table Ronde !</b>';
  if (camp.done) {
    $('lgEventBox').innerHTML = '<p style="font-size:.95rem;line-height:1.6">' + txt + '</p>' +
      '<button class="lg-btn lg-btn-amber" id="lgEventNext" style="margin-top:12px;padding:12px 26px">Voir le destin du royaume</button>';
    $('lgEventNext').onclick = showFinal;
    return;
  }
  $('lgEventBox').innerHTML = '<p style="font-size:.95rem;line-height:1.6">' + txt + '</p>' +
    '<button class="lg-btn lg-btn-amber" id="lgEventNext" style="margin-top:12px;padding:12px 26px">Retour à la cour</button>';
  $('lgEventNext').onclick = function () { openCourt('La cour attend vos ordres.'); };
}
$('lgEventA').addEventListener('click', function () { pickEvent('a'); });
$('lgEventB').addEventListener('click', function () { pickEvent('b'); });

/* ── fin de campagne ── */
function showFinal() {
  var best = 0;
  try {
    best = parseInt(localStorage.getItem('logres_best') || '0', 10) || 0;
    if (camp.cleared > best) { localStorage.setItem('logres_best', String(camp.cleared)); best = camp.cleared; }
  } catch (e) { }
  E.deleteSave();
  var lvlSum = camp.heroes.reduce(function (a, h) { return a + h.level; }, 0);
  var end = E.ending(camp);
  $('lgFinalTitle').textContent = '👑 ' + end.t;
  $('lgFinalText').textContent = end.txt;
  $('lgFinalStats').textContent = 'Provinces : ' + camp.cleared + '/14 · Or final : ' + camp.gold +
    ' · Chevaliers : ' + camp.heroes.filter(function (h) { return !h.gone; }).length + '/' + camp.heroes.length +
    ' · Régiments perdus : ' + camp.deadRegs + ' · Record : ' + best + '/14';
  show('lgFinal');
  $('lgFinalNext').onclick = function () { showMenu(); };
}

/* ── boutons bataille ── */
$('lgGuardBtn').addEventListener('click', function () {
  if (!ctxBat || busy) return;
  T.act(ctxBat.B, { t: 'guard' });
  ctxBat.B.log.slice(-1).forEach(function (l) { log(l); });
  afterAction();
});
$('lgEndBtn').addEventListener('click', function () {
  if (!ctxBat || busy) return;
  T.act(ctxBat.B, { t: 'end' });
  afterAction();
});
var ABIL_N = { strike: 'Frappe héroïque', pierce: 'Pointe de fer', rally: 'Ralliement', heal: 'Office de soin', nova: 'Nova de brumes' };
$('lgAbilityBtn').addEventListener('click', function () {
  if (!ctxBat || busy) return;
  var B = ctxBat.B, u = T.active(B);
  if (!u || u.side !== 'A') return;
  if (!u.ability || !u.ability.uses) { log('Capacité déjà employée pour cette bataille.'); return; }
  var targetId;
  if (u.ability.k === 'strike' || u.ability.k === 'pierce') {
    var adj = T.foes(B, u).filter(function (f) { return T.hexDist(u.xq, u.xr, f.xq, f.xr) === 1; });
    if (!adj.length) { log('Il faut un ennemi adjacent pour ' + ABIL_N[u.ability.k] + '.'); return; }
    adj.sort(function (a, b2) { return a.hp - b2.hp; });
    targetId = adj[0].id;
  }
  var r = T.act(B, { t: 'ability', targetId: targetId });
  if (r.ok) B.log.slice(-2).forEach(function (l) { log(l); });
  else log('Impossible : ' + r.why + '.');
  harvestFx();
  afterAction();
});
$('lgZoomIn').addEventListener('click', function () { R3.setZoom(-1.4); });
$('lgZoomOut').addEventListener('click', function () { R3.setZoom(1.4); });
document.addEventListener('keydown', function (e) {
  if (!ctxBat || busy || $('lgBattle').style.display === 'none') return;
  if (e.key === 'g' || e.key === 'G') $('lgGuardBtn').click();
  if (e.key === 'e' || e.key === 'E') $('lgAbilityBtn').click();
  if (e.key === 'f' || e.key === 'F') $('lgEndBtn').click();
});

/* ── menu ── */
$('lgNew').addEventListener('click', newCampaign);
$('lgContinue').addEventListener('click', continueCampaign);
$('lgMarchBtn').addEventListener('click', function () {
  if (!camp) return;
  startBattle();
});

/* démarrage */
showMenu();
resize();
})();
