/* ═══ LA CONFRÉRIE DU GRIS — interface : canvas hexagonal, entrées, écrans ═══ */
(function () {
'use strict';
var T = window.COMBATTB, K = window.RPGCORE, E = window.GRIS;
var $ = function (id) { return document.getElementById(id); };
var canvas = $('grCanvas'), ctx = canvas.getContext('2d');

var camp = null, ctxBat = null, busy = false, pendingEnd = null;
var hover = null, showMoves = true, fxList = [];
var SIZE = 30;

/* ── géométrie écran (hexagones pointe en haut, coordonnées axiales) ── */
function hexCenter(q, r) {
  var ox = canvas.width / 2, oy = canvas.height / 2 + 6;
  return { x: ox + SIZE * Math.sqrt(3) * (q + r / 2), y: oy + SIZE * 1.5 * r };
}
function pickHex(mx, my) {
  var best = null, bd = 1e9;
  Object.keys(ctxBat.B.tiles).forEach(function (k2) {
    var pp = k2.split(','), c = hexCenter(+pp[0], +pp[1]);
    var d = (mx - c.x) * (mx - c.x) + (my - c.y) * (my - c.y);
    if (d < bd) { bd = d; best = { q: +pp[0], r: +pp[1] }; }
  });
  return bd < SIZE * SIZE ? best : null;
}
function hexPath(cx, cy, s) {
  ctx.beginPath();
  for (var i = 0; i < 6; i++) {
    var a = Math.PI / 180 * (60 * i - 30);
    var x = cx + s * Math.cos(a), y = cy + s * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/* ── écrans ── */
function show(id) {
  ['grMenu', 'grBattle', 'grBetween', 'grEndWrap'].forEach(function (s) { $(s).style.display = 'none'; });
  if (id) $(id).style.display = 'block';
}
function showMenu() {
  show('grMenu');
  $('grContinue').style.display = E.hasSave() ? 'inline-block' : 'none';
}

function newCampaign() {
  E.deleteSave();
  camp = E.newCampaign(null);
  ctxBat = null;
  openBetween('La confrérie est fondée. Quatre lames, une bourse légère, un royaume en ruine.');
}

function continueCampaign() {
  var o = E.loadSave();
  if (!o) return;
  camp = o;
  ctxBat = null;
  openBetween('La troupe se rallie. Le contrat attend.');
}

/* ── bataille ── */
function startBattle() {
  ctxBat = E.startBattle(camp);
  show('grBattle');
  $('grLog').innerHTML = '';
  fxList = [];
  resize();
  banner('CONTRAT ' + (camp.contract + 1) + ' — ' + E.CONTRACTS[camp.contract].nom.toUpperCase());
  log('⚔ ' + E.CONTRACTS[camp.contract].brief);
  updateHud();
}
function banner(txt) {
  var b = $('grBanner');
  b.textContent = txt;
  b.style.display = 'block';
  b.style.opacity = '1';
  setTimeout(function () { b.style.opacity = '0'; }, 1800);
}
function log(txt) {
  var el = $('grLog');
  var d = document.createElement('div');
  d.textContent = txt;
  el.appendChild(d);
  while (el.children.length > 6) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
}

function uinfo(u) {
  return u.name + ' — PV ' + u.hp + '/' + u.maxhp + ' · dégâts ' + u.dice[0] + 'd' + u.dice[1] +
    (u.ranged ? ' · portée ' + u.reach : '') + (u.ap ? ' · perce armure ' + u.ap : '') +
    ' · défense ' + u.def + ' · vitesse ' + u.spd + (u.phase ? ' · spectral' : '');
}

function updateHud() {
  var B = ctxBat.B, u = T.active(B);
  $('grRound').textContent = B.round;
  $('grGold').textContent = camp.gold;
  /* file d'initiative */
  var strip = '';
  B.queue.forEach(function (x, i) {
    var me = u && x.id === u.id;
    strip += '<span class="gr-chip' + (me ? ' me' : (x.side === 'B' ? ' foe' : '')) + '">' + x.glyph + '</span>';
  });
  $('grQueue').innerHTML = strip;
  if (u) {
    $('grActive').textContent = (u.side === 'A' ? '▶ ' : '⏳ ') + u.name + (u.side === 'B' ? ' (ennemi)' : '');
    $('grActiveInfo').textContent = uinfo(u);
    $('grGuardBtn').disabled = u.side !== 'A';
    $('grEndBtn').disabled = u.side !== 'A';
  }
  showMoves = true;
}

/* ── rendu ── */
function resize() {
  var wrap = $('grStage');
  var w = wrap.clientWidth;
  var h = Math.max(400, Math.min(w * 0.72, window.innerHeight * 0.62));
  canvas.width = w; canvas.height = h;
  SIZE = Math.max(18, Math.min(34, Math.floor(w / 24)));
}
window.addEventListener('resize', function () { if (ctxBat) resize(); });

function draw() {
  requestAnimationFrame(draw);
  if (!ctxBat) { return; }
  var B = ctxBat.B;
  ctx.fillStyle = '#0b0d11';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  var u = T.active(B);
  var moves = (showMoves && u && u.side === 'A' && !u.moved && !u.attacked) ? T.reachable(B, u).dist : {};
  var targets = {};
  if (u && u.side === 'A' && !u.attacked) {
    T.foes(B, u).forEach(function (f) {
      var d = T.hexDist(u.xq, u.xr, f.xq, f.xr);
      if (d <= u.reach && (!u.ranged || T.hasLOS(B, u.xq, u.xr, f.xq, f.xr))) targets[f.id] = true;
    });
  }
  var TER_FILL = { plain: '#262c35', mud: '#383023', bush: '#2b3a2c', rock: '#3f4750', tree: '#334136' };
  Object.keys(B.tiles).forEach(function (k2) {
    var pp = k2.split(','), q = +pp[0], r = +pp[1];
    var t2 = B.tiles[k2], c = hexCenter(q, r);
    hexPath(c.x, c.y, SIZE - 1.5);
    ctx.fillStyle = TER_FILL[t2] || '#262c35';
    ctx.fill();
    ctx.strokeStyle = '#141920';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (t2 === 'tree') { ctx.fillStyle = '#51705a'; ctx.font = 'bold ' + Math.floor(SIZE * 0.7) + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♠', c.x, c.y); }
    if (t2 === 'bush') { ctx.fillStyle = '#5d7a4e'; ctx.font = Math.floor(SIZE * 0.5) + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('❀', c.x, c.y + 1); }
    if (moves[k2] != null) {
      hexPath(c.x, c.y, SIZE - 3);
      ctx.fillStyle = 'rgba(74,216,192,.16)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(74,216,192,.5)';
      ctx.stroke();
    }
  });
  /* unités */
  B.units.forEach(function (x) {
    if (!x.alive) return;
    var c = hexCenter(x.xq, x.xr);
    var isA = x.side === 'A';
    if (u && x.id === u.id) {
      hexPath(c.x, c.y, SIZE - 2);
      ctx.strokeStyle = isA ? '#4ad8c0' : '#e05555';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    if (targets[x.id]) {
      hexPath(c.x, c.y, SIZE - 3);
      ctx.strokeStyle = '#ff7d5c';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = isA ? '#4ad8c0' : (x.ai === 'beast' ? '#d8a04a' : '#e05555');
    ctx.font = 'bold ' + Math.floor(SIZE * 0.72) + 'px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(x.glyph, c.x, c.y - 3);
    /* barre PV */
    var w2 = SIZE * 1.3;
    ctx.fillStyle = '#141920';
    ctx.fillRect(c.x - w2 / 2, c.y + SIZE * 0.42, w2, 4);
    ctx.fillStyle = x.hp / x.maxhp > 0.5 ? '#5cbf72' : (x.hp / x.maxhp > 0.25 ? '#d8a04a' : '#e05555');
    ctx.fillRect(c.x - w2 / 2, c.y + SIZE * 0.42, w2 * Math.max(0, x.hp / x.maxhp), 4);
    if (x.guarding) { ctx.fillStyle = '#8fd3e8'; ctx.font = 'bold ' + Math.floor(SIZE * 0.4) + 'px sans-serif'; ctx.fillText('🛡', c.x + SIZE * 0.55, c.y - SIZE * 0.45); }
  });
  /* effets flottants */
  fxList = fxList.filter(function (f) { return f.t < 1; });
  fxList.forEach(function (f) {
    f.t += 0.03;
    var c = hexCenter(f.q, f.r);
    ctx.globalAlpha = 1 - f.t;
    ctx.fillStyle = '#ff9d8a';
    ctx.font = 'bold ' + Math.floor(SIZE * 0.55) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('−' + f.n, c.x, c.y - SIZE * (0.7 + f.t));
    ctx.globalAlpha = 1;
  });
  /* survol */
  if (hover) {
    var hc = hexCenter(hover.q, hover.r);
    hexPath(hc.x, hc.y, SIZE - 2);
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
requestAnimationFrame(draw);

/* injecte les dégâts du log en effets visuels */
function harvestFx() {
  var B = ctxBat.B;
  while (B.fx.length) {
    var f = B.fx.shift();
    fxList.push({ q: f.x, r: f.y, n: f.n, t: 0 });
  }
}

/* ── fin de bataille → résumé → écran entre-deux ── */
function checkEnd() {
  harvestFx();
  var B = ctxBat.B;
  if (!B.over) { updateHud(); return false; }
  var sum = E.finishBattle(camp, ctxBat);
  var el = $('grSum');
  var html = sum.won ? '<h3>✅ Contrat accompli</h3>' : '<h3>❌ La confrérie a dû battre en retraite</h3>';
  if (sum.dead.length) html += '<p>☠ Tombés sous les armes : <b>' + sum.dead.join(', ') + '</b></p>';
  if (sum.wounded.length) html += '<p>🩹 Blessés (−4 PV max) : ' + sum.wounded.join(', ') + '</p>';
  if (sum.levels.length) html += '<p>⭐ Niveaux : ' + sum.levels.join(', ') + '</p>';
  if (sum.won) html += '<p>💰 Prime et coffres : +' + sum.gold + ' or</p>';
  if (sum.loot.length) html += '<p>🎒 Butin : ' + sum.loot.map(function (it) { return K.itemFullName(it); }).join(' · ') + '</p>';
  el.innerHTML = html;
  $('grEndBox').style.display = 'none';
  $('grSumBox').style.display = 'block';
  $('grSumNext').onclick = null;
  $('grSumNext').textContent = camp.done ? 'Voir le dénouement' : 'Retour au camp';
  show('grEndWrap');
  return true;
}

$('grSumNext').addEventListener('click', function () {
  if (camp.done || camp.over) { showEnd(); return; }
  openBetween('Le contrat suivant est sur la table.');
});

/* ── écran entre-deux (camp) ── */
function openBetween(note) {
  show('grBetween');
  $('grBetweenNote').textContent = note || '';
  var ct = E.CONTRACTS[camp.contract];
  $('grContractName').textContent = 'Contrat ' + (camp.contract + 1) + ' — ' + ct.nom;
  $('grContractBrief').textContent = ct.brief;
  $('grCampGold').textContent = camp.gold;
  $('grWages').textContent = E.wagesDue(camp);
  /* troupe */
  var html = '';
  camp.roster.forEach(function (m, i) {
    var c = E.CLASSES[m.cls], st = E.battleStats(m), w = m.inv.eq.weapon, ar = m.inv.eq.armor;
    html += '<div class="gr-merc"><b>' + m.name + '</b> <small>' + c.n + ' · niv. ' + m.level + '</small>' +
      '<div class="gr-hpbar"><div style="width:' + Math.max(3, 100 * m.hp / E.mercMaxHp(m)) + '%"></div></div>' +
      '<small>' + m.hp + '/' + E.mercMaxHp(m) + ' PV · ' + st.dice[0] + 'd' + st.dice[1] +
      (st.ranged ? ' portée ' + st.reach : '') + ' · déf ' + st.def + (m.wounds ? ' · 🩹 ' + m.wounds : '') + '</small>' +
      '<small class="gr-eq">' + (w ? w.name || w.base : '—') + ' · ' + (ar ? ar.name || ar.base : '—') + '</small>' +
      (m.wounds ? '<button class="gr-btn sm" data-surg="' + i + '">🩹 Chirurgien (' + E.surgeryCost(m) + ' or)</button>' : '') +
      '</div>';
  });
  $('grRoster').innerHTML = html || '<p>Toute la confrérie dort au cimetière.</p>';
  /* butin */
  var st2 = '';
  camp.stock.forEach(function (it, i) {
    var opts = camp.roster.map(function (m, j) { return '<option value="' + j + '">' + m.name.split(' ')[0] + '</option>'; }).join('');
    st2 += '<div class="gr-item"><span>' + K.itemFullName(it) + '</span>' +
      '<span><select data-gsel="' + i + '">' + opts + '</select>' +
      '<button class="gr-btn sm" data-give="' + i + '">Donner</button>' +
      '<button class="gr-btn sm ghost" data-sell="' + i + '">Vendre (+' + Math.max(2, Math.round((it.val || 10) * 0.5)) + ' or)</button></span></div>';
  });
  $('grStock').innerHTML = st2 || '<p class="gr-dim">Sacs vides — le butin arrive avec les victoires.</p>';
  /* recrues */
  var rec = E.recruits(camp);
  var rh = '';
  rec.forEach(function (cd, i) {
    var c = E.CLASSES[cd.merc.cls];
    rh += '<div class="gr-item"><span><b>' + cd.merc.name + '</b> <small>' + c.n + ' niv. ' + cd.merc.level + '</small></span>' +
      '<button class="gr-btn sm" data-hire="' + i + '"' + (camp.gold < cd.cost || camp.roster.length >= 8 ? ' disabled' : '') + '>Engager (' + cd.cost + ' or)</button></div>';
  });
  $('grRecruits').innerHTML = rh;
  $('grSignBtn').disabled = false;
}
document.addEventListener('click', function (e) {
  var b;
  if ((b = e.target.closest('[data-surg]'))) { E.surgery(camp, camp.roster[+b.dataset.surg]); openBetween('Le chirurgien a travaillé.'); }
  else if ((b = e.target.closest('[data-give]'))) {
    var sel = document.querySelector('[data-gsel="' + b.dataset.give + '"]');
    if (sel && E.giveItem(camp, camp.roster[+sel.value], +b.dataset.give)) openBetween('Objet remis.');
  }
  else if ((b = e.target.closest('[data-sell]'))) { E.sellItem(camp, +b.dataset.sell); openBetween('Objet vendu.'); }
  else if ((b = e.target.closest('[data-hire]'))) {
    var rec = E.recruits(camp);
    if (E.buyRecruit(camp, rec[+b.dataset.hire])) openBetween('Un nouveau bras rejoint la confrérie.');
  }
});
$('grSignBtn').addEventListener('click', function () {
  var pay = E.payWages(camp);
  var note = pay.paid ? 'Salaires versés (−' + pay.due + ' or).' : 'Impayés ! ' + pay.leavers.join(', ') + ' quittent la confrérie.';
  if (camp.over) { showEnd(); return; }
  startBattle();
  log(note);
});

/* ── fin de campagne ── */
function showEnd() {
  var best = 0;
  try {
    best = parseInt(localStorage.getItem('gris_best') || '0', 10) || 0;
    if (camp.cleared > best) { localStorage.setItem('gris_best', String(camp.cleared)); best = camp.cleared; }
  } catch (e2) { }
  E.deleteSave();
  $('grEndTitle').textContent = camp.done ? '👑 LA ROUTE EST LIBRE' : '☠ LA CONFRÉRIE SE DISSOUT';
  $('grEndText').textContent = camp.done
    ? 'Trois contrats, trois victoires. Les marchands reprennent la route, les loups regagnent les bois, et la fosse des Mortailles se tait — pour un temps. Le nom de votre confrérie sera murmuré dans les tavernes.'
    : 'Sans mercenaires, il n\u2019y a plus de confrérie. Les contrats restent en attente, le royaume grince des dents… Une autre troupe se formera.';
  $('grEndStats').textContent = 'Contrats accomplis : ' + camp.cleared + ' · or final : ' + camp.gold + ' · record : ' + best + ' contrat(s)';
  show('grEndWrap');
  $('grSumBox').style.display = 'none';
  $('grEndBox').style.display = 'block';
  $('grEndNext').textContent = 'Nouvelle confrérie';
  $('grEndNext').onclick = function () { showMenu(); };
}

/* ── entrées bataille ── */
function enemyTurns() {
  if (!ctxBat || ctxBat.B.over) { checkEnd(); return; }
  var u = T.active(ctxBat.B);
  if (!u) { checkEnd(); return; }
  if (u.side === 'A') { busy = false; updateHud(); return; }
  busy = true;
  T.aiAct(ctxBat.B);
  harvestFx();
  var tail = ctxBat.B.log.slice(-2);
  tail.forEach(function (l) { log(l); });
  setTimeout(function () {
    if (ctxBat.B.over) { busy = false; checkEnd(); return; }
    enemyTurns();
  }, 340);
}

canvas.addEventListener('mousemove', function (e) {
  if (!ctxBat) return;
  var rect = canvas.getBoundingClientRect();
  hover = pickHex(e.clientX - rect.left, e.clientY - rect.top);
});
canvas.addEventListener('click', function (e) {
  if (!ctxBat || busy) return;
  var rect = canvas.getBoundingClientRect();
  var h2 = pickHex(e.clientX - rect.left, e.clientY - rect.top);
  if (!h2) return;
  var B = ctxBat.B, u = T.active(B);
  if (!u || u.side !== 'A') return;
  var target = T.unitAt(B, h2.q, h2.r);
  if (target && target.side === 'B') {
    var r = T.act(B, { t: 'attack', id: target.id });
    if (!r.ok && r.why === 'trop loin' && !u.moved) log('Trop loin — déplacez-vous d\u2019abord (cases turquoise), puis frappez.');
    else if (!r.ok && r.why === 'pas de ligne de vue') log('Pas de ligne de vue — un obstacle bloque le tir.');
    else if (!r.ok) log('Impossible : ' + r.why + '.');
    harvestFx();
    B.log.slice(-3).forEach(function (l) { log(l); });
    if (!checkEnd()) enemyTurns();
    return;
  }
  if (!target && movesFor(u)[T.key(h2.q, h2.r)] != null) {
    var r2 = T.act(B, { t: 'move', q: h2.q, r: h2.r });
    if (r2.ok) { B.log.slice(-1).forEach(function (l) { log(l); }); updateHud(); }
    return;
  }
  if (target && target.side === 'A') { log(uinfo(target)); return; }
});
function movesFor(u) {
  return (u && !u.moved && !u.attacked) ? T.reachable(ctxBat.B, u).dist : {};
}
$('grGuardBtn').addEventListener('click', function () {
  if (!ctxBat || busy) return;
  T.act(ctxBat.B, { t: 'guard' });
  ctxBat.B.log.slice(-1).forEach(function (l) { log(l); });
  if (!checkEnd()) enemyTurns();
});
$('grEndBtn').addEventListener('click', function () {
  if (!ctxBat || busy) return;
  T.act(ctxBat.B, { t: 'end' });
  if (!checkEnd()) enemyTurns();
});
$('grInfoBtn').addEventListener('click', function () {
  var B = ctxBat.B;
  var list = B.units.filter(function (x) { return x.alive; }).map(function (x) {
    return (x.side === 'A' ? '🛡 ' : '⚔ ') + uinfo(x);
  });
  log('— Ordres de bataille —');
  list.forEach(function (l) { log(l); });
});
document.addEventListener('keydown', function (e) {
  if (!ctxBat || busy || $('grBattle').style.display === 'none') return;
  if (e.key === 'g' || e.key === 'G') $('grGuardBtn').click();
  if (e.key === 'f' || e.key === 'F') $('grEndBtn').click();
});

/* ── menu ── */
$('grNew').addEventListener('click', newCampaign);
$('grContinue').addEventListener('click', continueCampaign);

/* démarrage */
showMenu();
resize();
})();
