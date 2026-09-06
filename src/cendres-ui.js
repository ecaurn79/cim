/* ═══ CENDRES — interface : rendu canvas, entrées, panneaux ═══ */
(function () {
'use strict';
var E = window.CENDRES, K = window.RPGCORE;
var $ = function (id) { return document.getElementById(id); };
var canvas = $('crCanvas'), ctx = canvas.getContext('2d');
var G = null, cell = 22, camX = 0, camY = 0;
var pendingOver = null;

/* ── Palettes ── */
var COLORS = {
  wall: '#151a20', wallEdge: '#232c36', floor: '#2a2f38', floorDot: '#31363f',
  stair: '#ffc46b', altar: '#8fd3e8', gold: '#ffd24a',
  player: '#4ad8c0', explored: 0.34,
  hp: '#e05555', mana: '#4a8fe0', xp: '#b06bff', hunger: '#d8a04a'
};
var KIND_GLYPH = { weapon: '/', armor: ']', helm: '^', shield: '[', amulet: '"', ring: '=', potion: '!', scroll: '?', food: '%' };
var RAR_COLOR = K.RARITY.map(function (r) { return r.color; });

/* ── Écran de menu ── */
function showMenu() {
  $('crMenu').style.display = 'flex';
  $('crGame').style.display = 'none';
  $('crContinue').style.display = E.hasSave() ? 'inline-block' : 'none';
}
function hideMenu() {
  $('crMenu').style.display = 'none';
  $('crGame').style.display = 'block';
}

/* ── Nouvelle partie ── */
function startRun(clsKey, seed) {
  E.deleteSave();
  G = E.newGame(clsKey, seed);
  bindGame();
  hideMenu();
  resize();
  updateAll();
  logFlush();
}
function continueRun() {
  var o = E.loadSave();
  if (!o) return;
  G = E.restore(o);
  bindGame();
  hideMenu();
  resize();
  updateAll();
  logFlush();
  addMsg('— Partie restaurée (profondeur ' + G.p.depth + ') —');
}

/* ── Crochets moteur ── */
function bindGame() {
  G.onHud = updateAll;
  G.onHurt = function () { flashScreen(); };
  G.onOver = function (won) { pendingOver = won ? 'win' : 'death'; };
}

/* ── Rendu ── */
function resize() {
  var wrap = $('crStage');
  var w = wrap.clientWidth, h = Math.max(380, Math.min(wrap.clientHeight || 520, window.innerHeight * 0.62));
  canvas.width = w; canvas.height = h;
  cell = Math.max(14, Math.min(26, Math.floor(w / 34)));
}
window.addEventListener('resize', function () { if (G) resize(); });

function draw() {
  requestAnimationFrame(draw);
  if (!G) return;
  if (pendingOver) { showOver(pendingOver); pendingOver = null; }
  var lv = G.lv, p = G.p;
  var cols = Math.ceil(canvas.width / cell), rows = Math.ceil(canvas.height / cell);
  camX = Math.round(p.x - cols / 2); camY = Math.round(p.y - rows / 2);
  camX = Math.max(0, Math.min(E.W - cols, camX));
  camY = Math.max(0, Math.min(E.H - rows, camY));
  ctx.fillStyle = '#0b0d11';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold ' + Math.floor(cell * 0.72) + 'px ui-monospace, monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  var shake = G.shakeT > 0 ? (G.shakeT--) : 0;
  var ox = (Math.random() - 0.5) * shake, oy = (Math.random() - 0.5) * shake;
  for (var y = 0; y < rows; y++) {
    for (var x = 0; x < cols; x++) {
      var mx = camX + x, my = camY + y;
      if (mx < 0 || my < 0 || mx >= E.W || my >= E.H) continue;
      var i = my * E.W + mx;
      var vis = lv.visible[i], exp = lv.explored[i];
      if (!exp) continue;
      var c = lv.map[i], px = x * cell + cell / 2 + ox, py = y * cell + cell / 2 + oy;
      ctx.globalAlpha = vis ? 1 : COLORS.explored;
      if (c === '#') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x * cell + ox, y * cell + oy, cell, cell);
        ctx.fillStyle = COLORS.wallEdge;
        ctx.fillRect(x * cell + ox + 2, y * cell + oy + 2, cell - 4, cell - 4);
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x * cell + ox + 4, y * cell + oy + 4, cell - 8, cell - 8);
      } else {
        ctx.fillStyle = COLORS.floor;
        ctx.fillRect(x * cell + ox, y * cell + oy, cell, cell);
        ctx.fillStyle = COLORS.floorDot;
        ctx.fillRect(px - 1, py - 1, 2, 2);
        if (c === '>') { ctx.fillStyle = COLORS.stair; ctx.fillText('>', px, py); }
        if (c === '_') { ctx.fillStyle = COLORS.altar; ctx.fillText('Ω', px, py); }
      }
    }
  }
  /* objets */
  lv.items.forEach(function (f) {
    var x = f.x - camX, y = f.y - camY;
    if (x < 0 || y < 0 || x * cell > canvas.width || y * cell > canvas.height) return;
    if (!lv.visible[f.y * E.W + f.x]) return;
    ctx.globalAlpha = 1;
    if (f.gold) { ctx.fillStyle = COLORS.gold; ctx.fillText('$', x * cell + cell / 2, y * cell + cell / 2); return; }
    var it = f.it;
    var g = KIND_GLYPH[it.kind] || '*';
    ctx.fillStyle = it.kind === 'potion' || it.kind === 'scroll' ? '#d8dee5' : (RAR_COLOR[it.rarity || 0]);
    ctx.fillText(g, x * cell + cell / 2, y * cell + cell / 2);
  });
  /* autels */
  /* monstres */
  lv.monsters.forEach(function (m) {
    if (m.dead) return;
    var i = m.y * E.W + m.x;
    if (!lv.visible[i]) return;
    var x = (m.x - camX) * cell + cell / 2, y = (m.y - camY) * cell + cell / 2;
    ctx.globalAlpha = 1;
    ctx.fillStyle = m.asleep ? '#7d8894' : (m.d.boss ? '#ff4a3d' : (m.d.tier >= 3 ? '#ff9d5c' : '#e8586a'));
    ctx.fillText(m.d.g, x, y);
    if (!m.asleep && m.hp < m.maxhp) {
      ctx.fillStyle = '#3a1418';
      ctx.fillRect(x - cell / 2 + 2, y - cell * 0.62, cell - 4, 3);
      ctx.fillStyle = '#e05555';
      ctx.fillRect(x - cell / 2 + 2, y - cell * 0.62, (cell - 4) * Math.max(0, m.hp / m.maxhp), 3);
    }
  });
  /* joueur */
  var jx = (p.x - camX) * cell + cell / 2, jy = (p.y - camY) * cell + cell / 2;
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.player;
  ctx.fillText('@', jx, jy);
  ctx.globalAlpha = 1;
}
requestAnimationFrame(draw);

function flashScreen() { G.shakeT = 6; }

/* ── Panneaux ── */
function updateAll() {
  if (!G) return;
  var p = G.p, st = E.effStats(G);
  $('crDepth').textContent = p.depth + ' / ' + E.MAX_DEPTH;
  $('crHp').style.width = Math.max(0, Math.min(100, 100 * p.hp / st.maxhp)) + '%';
  $('crHpT').textContent = Math.max(0, p.hp) + '/' + st.maxhp;
  $('crMana').style.width = Math.max(0, Math.min(100, 100 * p.mana / st.maxmana)) + '%';
  $('crManaT').textContent = p.mana + '/' + st.maxmana;
  $('crXp').style.width = Math.min(100, 100 * p.xp / K.xpFor(p.lvl)) + '%';
  $('crXpT').textContent = 'Niv ' + p.lvl;
  $('crGold').textContent = p.gold;
  $('crHunger').textContent = p.hunger > 60 ? 'repue' : (p.hunger > 25 ? 'creuse' : (p.hunger > 0 ? 'FAMINE !' : 'famine !'));
  $('crHunger').style.color = p.hunger > 25 ? '#d8dee5' : '#ff7755';
  $('crPiety').textContent = p.piety;
  var buffs = [];
  Object.keys(p.buffs).forEach(function (k) { buffs.push(k + ' (' + p.buffs[k].t + ')'); });
  if (p.poison > 0) buffs.push('☠ venin ' + p.poison);
  if (p.powerStrike) buffs.push('coup ×2 prêt');
  if (p.aimPower) buffs.push('visée ×2');
  $('crBuffs').textContent = buffs.join(' · ');
  var skills = '';
  p.clsData.skills.forEach(function (s) {
    var cd = p.cds[s.k] || 0;
    skills += '<button class="cr-skill' + (cd ? ' cd' : '') + '" data-sk="' + s.k + '">' + s.n +
      (s.mana ? ' <small>' + s.mana + '⚡</small>' : '') +
      (cd ? ' <small>(' + cd + ')</small>' : '') + '</button>';
  });
  $('crSkills').innerHTML = skills;
}
function logFlush() {
  var el = $('crLog');
  el.innerHTML = '';
  G.p.msgs.slice(-5).forEach(function (m) {
    var d = document.createElement('div');
    d.textContent = m.t;
    el.appendChild(d);
  });
  el.scrollTop = el.scrollHeight;
}
function addMsg(t) {
  var el = $('crLog');
  var d = document.createElement('div');
  d.textContent = t;
  el.appendChild(d);
  while (el.children.length > 5) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
}
var lastMsgCount = 0;
setInterval(function () {
  if (G && G.p.msgs.length !== lastMsgCount) { lastMsgCount = G.p.msgs.length; logFlush(); updateAll(); }
}, 220);

/* ── Actions joueur ── */
function act(a) {
  if (!G || G.over) return;
  E.act(G, a);
  updateAll();
}
function move(dx, dy) {
  if (dx === 0 && dy === 0) { act({ t: 'wait' }); return; }
  act({ t: 'move', dx: dx, dy: dy });
}
/* boutons d'action ouvrant les modales */
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-close-act]');
  if (!b || !G) return;
  if (b.dataset.closeAct === 'inv') openInv();
  else if (b.dataset.closeAct === 'char') openChar();
  else if (b.dataset.closeAct === 'help') openHelp();
});

/* ── Entrées clavier ── */
document.addEventListener('keydown', function (e) {
  if (!G || G.over || $('crMenu').style.display !== 'none') return;
  var k = e.key, h = e.code;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(k) >= 0) e.preventDefault();
  if (k === 'z' || k === 'w' || k === 'ArrowUp') move(0, -1);
  else if (k === 's' || k === 'ArrowDown') move(0, 1);
  else if (k === 'q' || k === 'a' || k === 'ArrowLeft') move(-1, 0);
  else if (k === 'd' || k === 'ArrowRight') move(1, 0);
  else if (k === '.' || h === 'Period') act({ t: 'wait' });
  else if (k === 'i' || k === 'I') openInv();
  else if (k === 'c' || k === 'C') openChar();
  else if (k === 'h' || k === 'H') openHelp();
  else if (k === 't' || k === 'T') autoShoot();
  else if (k === 'Enter') {
    if (G.lv.map[G.p.y * E.W + G.p.x] === '>') act({ t: 'descend' });
    else act({ t: 'pickup' });
  }
});

/* tir automatique sur le monstre visible le plus proche */
function autoShoot() {
  var m = E.nearestVisibleMonster(G, 9);
  if (!m) { addMsg('Aucune cible visible.'); return; }
  var before = m.hp;
  act({ t: 'shoot', tx: m.x, ty: m.y });
  if (m.hp !== before) {}
}

/* ── Dpad tactile ── */
document.querySelectorAll('[data-mv]').forEach(function (b) {
  b.addEventListener('click', function () {
    var d = b.dataset.mv.split(',').map(Number);
    move(d[0], d[1]);
  });
});
$('crWait').addEventListener('click', function () { act({ t: 'wait' }); });
$('crPick').addEventListener('click', function () { act({ t: 'pickup' }); });
$('crDown').addEventListener('click', function () {
  if (G && G.lv.map[G.p.y * E.W + G.p.x] === '>') act({ t: 'descend' });
  else addMsg('Trouvez l\u2019escalier > .');
});
$('crShoot').addEventListener('click', autoShoot);
$('crSave').addEventListener('click', function () {
  E.autosave(G);
  addMsg('Partie sauvegardée.');
});
$('crMenuBtn').addEventListener('click', function () {
  E.autosave(G);
  showMenu();
});

/* ── Compétences ── */
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-sk]');
  if (!b || !G) return;
  var k = b.dataset.sk;
  if (k === 'bolt') { act({ t: 'skill', k: 'bolt' }); return; }
  act({ t: 'skill', k: k });
});

/* ── Modales : sac / fiche / aide / autel / fin ── */
function closeModal() { document.querySelectorAll('.cr-modal').forEach(function (m) { m.style.display = 'none'; }); }
function openInv() {
  var p = G.p, html = '';
  p.inv.items.forEach(function (it, i) {
    var rar = K.RARITY[it.rarity || 0];
    var hint = '';
    if (it.kind === 'weapon' && it.dice) hint = ' dégâts ' + it.dice[0] + 'd' + it.dice[1] + (it.ranged ? ' · portée ' + it.ranged : '');
    if (it.def) hint = ' défense +' + (it.def + K.affixTotal(it, 'def'));
    (it.affixes || []).forEach(function (a) { hint += ' · +' + a.v + ' ' + a.k; });
    var btn = it.kind === 'potion' ? 'Boire' : (it.kind === 'scroll' ? 'Lire' : (it.kind === 'food' ? 'Manger' : 'Équiper'));
    var act2 = it.kind === 'potion' ? 'quaff' : (it.kind === 'scroll' ? 'read' : (it.kind === 'food' ? 'eat' : 'equip'));
    html += '<div class="cr-item"><span style="color:' + RAR_COLOR[it.rarity || 0] + '">' + E.itemLabel(G, it) + '</span>' +
      '<small>' + hint + '</small>' +
      '<span class="cr-ibtns"><button data-inv="' + act2 + '" data-i="' + i + '">' + btn + '</button>' +
      '<button class="ghost" data-inv="drop" data-i="' + i + '">Poser</button></span></div>';
  });
  if (!html) html = '<p class="cr-empty">Votre sac est vide.</p>';
  $('crInvList').innerHTML = html;
  $('crModalInv').style.display = 'flex';
}
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-inv]');
  if (!b) return;
  var i = parseInt(b.dataset.i, 10);
  act({ t: b.dataset.inv, idx: i });
  closeModal();
});
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-uneq]');
  if (!b) return;
  act({ t: 'unequip', slot: b.dataset.uneq });
  closeModal();
});
function openChar() {
  var p = G.p, st = E.effStats(G);
  var eq = '';
  K.SLOTS.forEach(function (s) {
    var it = p.inv.eq[s];
    if (it) eq += '<div class="cr-item"><span style="color:' + RAR_COLOR[it.rarity || 0] + '">' + s + ' : ' + it.name + '</span><span class="cr-ibtns"><button data-uneq="' + s + '">Ranger</button></span></div>';
  });
  $('crCharBody').innerHTML =
    '<div class="cr-stats">' +
    '<div><b>' + p.clsData.n + '</b> niveau ' + p.lvl + '</div>' +
    '<div>PV : ' + p.hp + '/' + st.maxhp + ' · Mana : ' + p.mana + '/' + st.maxmana + '</div>' +
    '<div>Force : ' + st.str + ' · Défense : ' + st.prot + ' · Critique : ' + st.crit + '%</div>' +
    '<div>Or : ' + p.gold + ' · Piété : ' + p.piety + ' · Kills : ' + p.kills + '</div>' +
    '<div>Profondeur : ' + p.depth + ' · Tours : ' + p.turns + ' · Score : ' + p.score + '</div>' +
    '</div><h4>Équipement</h4>' + (eq || '<p class="cr-empty">Rien d\u2019équipe.</p>');
  $('crModalChar').style.display = 'flex';
}
function openHelp() {
  $('crModalHelp').style.display = 'flex';
}
document.querySelectorAll('[data-close]').forEach(function (b) {
  b.addEventListener('click', closeModal);
});
/* autels : deux actions distinctes, à portée d'un cran */
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-pray]');
  if (!b || !G) return;
  var al = -1;
  G.lv.altars.forEach(function (a, i) {
    if (Math.abs(a.x - G.p.x) <= 1 && Math.abs(a.y - G.p.y) <= 1) al = i;
  });
  if (al < 0) { addMsg('Aucun autel à proximité (cherchez le glyphe Ω).'); return; }
  act({ t: 'pray', altar: al, choice: parseInt(b.dataset.pray, 10) });
});

/* ── Fin de partie ── */
function showOver(kind) {
  var p = G.p;
  var best = 0;
  try { best = parseInt(localStorage.getItem('cendres_best') || '0', 10) || 0; } catch (e) { }
  if (p.score > best) { try { localStorage.setItem('cendres_best', String(p.score)); } catch (e) { } }
  E.deleteSave();
  $('crOverTitle').textContent = kind === 'win' ? '👑 VICTOIRE — LA COURONNE DE CENDRES' : '☠ LA FIN DE VOTRE LÉGENDE';
  $('crOverStats').innerHTML =
    '<div><b>' + p.score + '</b><span>score (record ' + best + ')</span></div>' +
    '<div><b>' + p.depth + '</b><span>profondeur atteinte</span></div>' +
    '<div><b>' + p.lvl + '</b><span>niveau · ' + p.kills + ' monstres</span></div>' +
    '<div><b>' + p.gold + '</b><span>pièces d\u2019or</span></div>';
  $('crOver').style.display = 'flex';
}
$('crOverAgain').addEventListener('click', function () {
  $('crOver').style.display = 'none';
  showMenu();
});

/* ── Menu principal ── */
document.querySelectorAll('[data-cls]').forEach(function (b) {
  b.addEventListener('click', function () {
    var daily = $('crDaily').checked;
    var seed = daily ? 'defi-' + new Date().toISOString().slice(0, 10) : null;
    startRun(b.dataset.cls, seed);
    if (daily) addMsg('⚔ DÉFI DU JOUR — même donjon pour tout le monde !');
  });
});
$('crContinue').addEventListener('click', continueRun);

/* démarrage */
showMenu();
resize();
})();
