/* ═══ LES RUINES D'ARKHANTIS — interface : rendu iso canvas 2D, camp, HUD ═══ */
(function () {
'use strict';
var A = window.ARKHANTIS, K = window.RPGCORE;
var $ = function (id) { return document.getElementById(id); };
var canvas = $('akCanvas'), ctx = canvas.getContext('2d');

var camp = null, G = null, running = false, lastT = 0;
var TW = 52, TH = 26;
var RAR_COLOR = K.RARITY.map(function (r) { return r.color; });

/* ── écrans ── */
function show(id) {
  ['akMenu', 'akCamp', 'akEndWrap'].forEach(function (s) { $(s).style.display = 'none'; });
  $('akHud').style.display = (!id || id === 'akHud') && G ? 'block' : 'none';
  if (id) $(id).style.display = 'flex';
}
function showMenu() {
  G = null; running = false;
  show('akMenu');
  $('akContinue').style.display = A.hasSave() ? 'inline-block' : 'none';
}
function newGame() {
  A.deleteSave();
  camp = A.newCamp(null);
  A.autosave(camp);
  openCamp('Un Berserker entre dans les ruines. Les braises s\u2019agitent.');
}
function continueGame() {
  var o = A.loadSave();
  if (!o) return;
  camp = o;
  openCamp('La pierre se souvient de vous.');
}

/* ── camp ── */
function openCamp(note) {
  G = null; running = false;
  show('akCamp');
  $('akCampNote').textContent = note || '';
  var st = A.heroStats(camp);
  $('akCLevel').textContent = 'Niveau ' + camp.level + ' · ' + A.CLASS.n;
  $('akCGold').textContent = camp.gold;
  $('akCKills').textContent = camp.kills;
  $('akCStats').innerHTML =
    '<div><b>' + Math.round(st.atk) + '</b><span>dégâts</span></div>' +
    '<div><b>' + st.maxhp + '</b><span>PV</span></div>' +
    '<div><b>' + Math.round(st.def) + '</b><span>défense</span></div>' +
    '<div><b>' + Math.round(st.crit) + '%</b><span>critique</span></div>' +
    '<div><b>' + Math.round(st.critDmg - 100) + '%</b><span>bonus crit.</span></div>' +
    '<div><b>' + st.vamp.toFixed(0) + '%</b><span>vol de vie</span></div>' +
    '<div><b>' + st.atkSpd.toFixed(2) + '</b><span>coups/s</span></div>' +
    '<div><b>' + st.move.toFixed(1) + '</b><span>cases/s</span></div>';
  /* XP */
  $('akCXp').style.width = Math.min(100, 100 * camp.xp / A.xpFor(camp.level)) + '%';
  $('akCXpT').textContent = camp.xp + ' / ' + A.xpFor(camp.level) + ' XP';
  /* faille du jour */
  var f = A.failleDuJour();
  $('akFaille').innerHTML = '<b>🌀 Faille du jour — ' + f.date + '</b> ' + f.mods.map(function (m) {
    return '<span class="ak-mod" title="' + m.d + '">' + m.n + '</span>';
  }).join(' ');
  /* niveaux */
  var fh = '';
  for (var i = 1; i <= A.MAX_FLOOR; i++) {
    var unlocked = i <= camp.floorUnlocked;
    var boss = A.BOSS_FLOORS[i];
    fh += '<button class="ak-floor' + (i === selFloor ? ' sel' : '') + (unlocked ? '' : ' lock') + '" data-floor="' + i + '"' +
      (unlocked ? '' : ' disabled') + '>' + i + (boss ? ' ☠' : '') + '</button>';
  }
  $('akFloors').innerHTML = fh;
  /* arbre */
  var tp = A.treePoints(camp);
  $('akTreePts').textContent = tp.free + ' point(s) libre(s) sur ' + tp.total;
  var th = '';
  A.TREE.forEach(function (t) {
    var v = camp.tree[t.k] || 0;
    th += '<div class="ak-trow"><span><b>' + t.n + '</b> <small>' + t.d + '</small></span>' +
      '<span class="ak-pips">' + '●'.repeat(v) + '○'.repeat(t.cap - v) + '</span>' +
      '<button class="ak-btn sm" data-tree="' + t.k + '"' + (v >= t.cap || tp.free <= 0 ? ' disabled' : '') + '>+</button></div>';
  });
  $('akTree').innerHTML = th;
  /* inventaire */
  var eqh = '';
  K.SLOTS.forEach(function (s) {
    var it = camp.inv.eq[s];
    if (it) eqh += '<div class="ak-item"><span style="color:' + RAR_COLOR[it.rarity || 0] + '">' + s + ' · ' + A.lootName(it) + '</span>' +
      '<button class="ak-btn sm ghost" data-uneq="' + s + '">Ranger</button></div>';
  });
  $('akEquip').innerHTML = eqh || '<p class="ak-dim">Rien d\u2019équippé ?!</p>';
  var bh = '';
  camp.inv.items.forEach(function (it, i) {
    var lines = (it.affixes || []).map(function (a) { return A.affixLine(a); }).join(' · ');
    bh += '<div class="ak-item"><span><span style="color:' + RAR_COLOR[it.rarity || 0] + '">' + A.lootName(it) + '</span>' +
      '<small>' + lines + '</small></span>' +
      '<span><button class="ak-btn sm" data-eq="' + i + '">Équiper</button>' +
      '<button class="ak-btn sm ghost" data-trash="' + i + '">Jeter</button></span></div>';
  });
  $('akBag').innerHTML = bh || '<p class="ak-dim">Le sac est vide — les ruines regorgent de butin.</p>';
}
var selFloor = 1;
document.addEventListener('click', function (e) {
  var b;
  if ((b = e.target.closest('[data-floor]'))) { selFloor = +b.dataset.floor; openCamp(); }
  else if ((b = e.target.closest('[data-tree]'))) {
    var k = b.dataset.tree;
    var tp = A.treePoints(camp);
    if (tp.free > 0) {
      camp.tree[k] = (camp.tree[k] || 0) + 1;
      A.autosave(camp);
      openCamp();
    }
  }
  else if ((b = e.target.closest('[data-eq]'))) {
    var it = camp.inv.items[+b.dataset.eq];
    if (it) { K.invEquip(camp.inv, it); A.autosave(camp); openCamp(); }
  }
  else if ((b = e.target.closest('[data-uneq]'))) {
    K.invUnequip(camp.inv, b.dataset.uneq);
    A.autosave(camp);
    openCamp();
  }
  else if ((b = e.target.closest('[data-trash]'))) {
    camp.inv.items.splice(+b.dataset.trash, 1);
    A.autosave(camp);
    openCamp();
  }
});
$('akResetTree').addEventListener('click', function () {
  camp.tree = {};
  A.autosave(camp);
  openCamp('L\u2019entraînement est remis à zéro (gratuit pendant la bêta).');
});

/* ── lancement d'un niveau ── */
$('akStart').addEventListener('click', function () {
  var useFaille = $('akUseFaille').checked;
  var mods = {};
  if (useFaille) A.failleDuJour().mods.forEach(function (m) { mods[m.k] = true; });
  startRun(selFloor, mods);
});
function startRun(floor, mods) {
  G = A.makeGame(camp, floor, null, mods);
  running = true;
  lastT = performance.now();
  show('akHud');
  resize();
  $('akLog').innerHTML = '';
  log(G.bossFloor ? '☠ Un gardien règne sur ce niveau : ' + G.boss.n + '.' : 'Les ruines grouillent. Trouvez le portail ⌂.');
  updateHud();
}
$('akLeaveBtn').addEventListener('click', function () {
  /* abandon : compte comme défaite douce */
  if (G && !G.over) { G.over = true; G.won = false; endRun(); }
});

/* ── fin de niveau ── */
function endRun() {
  running = false;
  var res = A.finishRun(G);
  /* record */
  var best = {};
  try { best = JSON.parse(localStorage.getItem('ark_best') || '{}') || {}; } catch (e) { }
  if (res.won && (best.floor || 0) < G.floor) best.floor = G.floor;
  if ((best.gold || 0) < camp.gold) best.gold = camp.gold;
  if ((best.kills || 0) < camp.kills) best.kills = camp.kills;
  try { localStorage.setItem('ark_best', JSON.stringify(best)); } catch (e) { }
  $('akEndTitle').textContent = res.won ? '✅ Niveau ' + G.floor + ' — les ruines reculent' : '☠ Les ruines vous ont pris';
  $('akEndStats').innerHTML =
    '<div><b>' + camp.gold + '</b><span>or total (−20 % si mort)</span></div>' +
    '<div><b>' + camp.level + '</b><span>niveau</span></div>' +
    '<div><b>' + camp.kills + '</b><span>monstres abattus</span></div>' +
    '<div><b>' + (best.floor || 1) + '</b><span>record de profondeur</span></div>';
  G = null;
  show('akEndWrap');
}
$('akEndCamp').addEventListener('click', function () {
  openCamp('Le camp vous accueille. Le butin attend d\u2019être taillé.');
});

/* ── HUD ── */
function log(t) {
  var el = $('akLog');
  var d = document.createElement('div');
  d.textContent = t;
  el.appendChild(d);
  while (el.children.length > 5) el.removeChild(el.firstChild);
}
var lastMsgs = 0;
function updateHud() {
  if (!G) return;
  var p = G.p, st = p.st;
  $('akHp').style.width = Math.max(0, Math.min(100, 100 * p.hp / st.maxhp)) + '%';
  $('akHpT').textContent = Math.ceil(p.hp) + ' / ' + st.maxhp;
  $('akMana').style.width = Math.max(0, Math.min(100, 100 * p.mana / st.maxmana)) + '%';
  $('akManaT').textContent = Math.floor(p.mana) + ' / ' + st.maxmana;
  $('akFloorT').textContent = 'Niveau ' + G.floor + (G.bossFloor ? ' · ☠ ' + G.boss.n : '');
  $('akGoldT').textContent = camp.gold;
  $('akMobsT').textContent = G.mobs.filter(function (m) { return !m.dead; }).length;
  A.CLASS.skills.forEach(function (sk, i) {
    var b = $('akSk' + (i + 1));
    var cd = p.cds[sk.k];
    b.disabled = cd > 0 || p.mana < sk.mana;
    b.innerHTML = (cd > 0 ? Math.ceil(cd) + 's' : sk.mana + '⚡') + ' ' + sk.n + ' <kbd>' + (i + 1) + '</kbd>';
  });
  /* messages du moteur */
  var msgs = G.fx.filter(function (f) { return f.t === 'msg'; });
  if (msgs.length && msgs.length !== lastMsgs) {
    lastMsgs = msgs.length;
    log(msgs[msgs.length - 1].txt);
  }
  /* barre boss */
  if (G.boss && !G.boss.dead) {
    $('akBossBar').style.display = 'block';
    $('akBossName').textContent = G.boss.n;
    $('akBossHp').style.width = Math.max(0, 100 * G.boss.hp / G.boss.maxhp) + '%';
  } else $('akBossBar').style.display = 'none';
}
A.CLASS.skills.forEach(function (sk, i) {
  $('akSk' + (i + 1)).addEventListener('click', function () { castSkill(sk.k); });
});
function castSkill(k) {
  if (!G || G.over) return;
  var r = A.cmdCast(G, k);
  if (!r.ok) log('Impossible : ' + r.why + '.');
  updateHud();
}
document.addEventListener('keydown', function (e) {
  if (!G || G.over) return;
  var i = ['1', '2', '3', '4'].indexOf(e.key);
  if (i >= 0) castSkill(A.CLASS.skills[i].k);
});

/* ── conversions iso ── */
function w2s(x, y) { return { x: (x - y) * TW / 2, y: (x + y) * TH / 2 }; }
function s2w(dx, dy) {
  var a = dx / (TW / 2), b = dy / (TH / 2);
  return { x: (b + a) / 2, y: (b - a) / 2 };
}
function center() { return { x: canvas.width / 2, y: canvas.height * .46 }; }
function toScreen(wx, wy) {
  var c = center(), p = w2s(G.p.x, G.p.y);
  return { x: c.x + w2s(wx, wy).x - p.x, y: c.y + w2s(wx, wy).y - p.y };
}
function pick(mx, my) {
  var c = center(), p = w2s(G.p.x, G.p.y);
  var d = s2w(mx - c.x + p.x, my - c.y + p.y);
  return { x: d.x, y: d.y };
}

/* ── entrées canvas ── */
canvas.addEventListener('click', function (e) {
  if (!G || G.over) return;
  var rect = canvas.getBoundingClientRect();
  var mx = e.clientX - rect.left, my = e.clientY - rect.top;
  /* monstre d'abord */
  var hit = null, hd = 22;
  G.mobs.forEach(function (m) {
    if (m.dead) return;
    var s = toScreen(m.x, m.y);
    var d = Math.abs(mx - s.x) + Math.abs(my - s.y) * 1.4;
    if (d < hd) { hd = d; hit = m; }
  });
  if (hit) { A.cmdAttack(G, hit); return; }
  var w2 = pick(mx, my);
  A.cmdMove(G, w2.x, w2.y);
});
canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
function resize() {
  var wrap = $('akStage');
  var w2 = wrap.clientWidth;
  var h2 = Math.max(380, Math.min(w2 * .7, window.innerHeight * .66));
  canvas.width = w2; canvas.height = h2;
}
window.addEventListener('resize', function () { if (G) resize(); });

/* ── rendu ── */
function diamond(cx, cy, w2, h2) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h2 / 2);
  ctx.lineTo(cx + w2 / 2, cy);
  ctx.lineTo(cx, cy + h2 / 2);
  ctx.lineTo(cx - w2 / 2, cy);
  ctx.closePath();
}
function draw() {
  requestAnimationFrame(draw);
  if (!G) return;
  /* simulation */
  var now = performance.now();
  var dt = Math.min(.05, (now - lastT) / 1000 || 0);
  lastT = now;
  if (running && !G.over) A.step(G, dt);
  if (G && G.over) { endRun(); return; }
  updateHud();
  /* fond */
  ctx.fillStyle = '#0c0e12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  var g2 = G.grid;
  var pad = TW;
  for (var y = 0; y < A.H; y++) {
    for (var x = 0; x < A.W; x++) {
      var s = toScreen(x + .5, y + .5);
      if (s.x < -pad || s.y < -pad * 2 || s.x > canvas.width + pad || s.y > canvas.height + pad) continue;
      var ch = g2[y * A.W + x];
      if (ch === '#') {
        diamond(s.x, s.y, TW, TH);
        ctx.fillStyle = '#232830';
        ctx.fill();
        diamond(s.x, s.y - 10, TW, TH);
        ctx.fillStyle = '#4a525c';
        ctx.fill();
        ctx.fillStyle = '#565f6a';
        ctx.fillRect(s.x - TW / 2 + 3, s.y - 12, TW - 6, 2);
      } else if (ch === '.') {
        diamond(s.x, s.y, TW, TH);
        var v = (x * 7 + y * 13) % 5;
        ctx.fillStyle = v === 0 ? '#33383f' : (v === 2 ? '#3b414a' : '#363c44');
        ctx.fill();
        ctx.strokeStyle = '#2a2f36';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
  /* portail / sortie */
  if (G.portal) {
    var ps = toScreen(G.portal.x, G.portal.y);
    var pulse = 1 + Math.sin(G.time * 4) * .12;
    ctx.strokeStyle = '#4ad8c0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(ps.x, ps.y, 16 * pulse, 9 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(74,216,192,.18)';
    ctx.fill();
    ctx.fillStyle = '#4ad8c0';
    ctx.font = 'bold 13px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⌂', ps.x, ps.y - 12);
  }
  /* autel */
  if (G.shrine && !G.shrine.used) {
    var ss = toScreen(G.shrine.x, G.shrine.y);
    ctx.fillStyle = '#e07a3f';
    ctx.beginPath();
    ctx.moveTo(ss.x, ss.y - 16);
    ctx.lineTo(ss.x + 6, ss.y - 2);
    ctx.lineTo(ss.x - 6, ss.y - 2);
    ctx.closePath();
    ctx.fill();
  }
  /* objets : rayons de butin */
  G.items.forEach(function (f) {
    var s = toScreen(f.x, f.y);
    if (f.gold) {
      diamond(s.x, s.y - 3, 12, 6);
      ctx.fillStyle = '#ffd24a';
      ctx.fill();
      return;
    }
    var col = RAR_COLOR[f.it.rarity || 0];
    var grad = ctx.createLinearGradient(s.x, s.y - 46, s.x, s.y);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(1, col);
    ctx.fillStyle = grad;
    ctx.fillRect(s.x - 3, s.y - 46, 6, 46);
    ctx.fillStyle = col;
    ctx.font = 'bold 12px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.it.kind === 'potion' ? '!' : (f.it.kind === 'scroll' ? '?' : '/'), s.x, s.y - 50);
  });
  /* entités triées par profondeur */
  var ents = [];
  G.mobs.forEach(function (m) { if (!m.dead) ents.push({ y: m.y, draw: function () { drawMob(m); } }); });
  ents.push({ y: G.p.y, draw: function () { drawPlayer(); } });
  ents.sort(function (a, b) { return a.y - b.y; });
  ents.forEach(function (e) { e.draw(); });
  /* effets */
  G.fx.forEach(function (f) {
    if (f.t === 'dmg' && f.x != null) {
      var s = toScreen(f.x, f.y);
      var lift = (1 - Math.min(1, f.life / .8)) * 26;
      ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.fillStyle = f.crit ? '#ffb347' : '#ff9d8a';
      ctx.font = (f.crit ? 'bold 17px' : 'bold 13px') + ' sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((f.crit ? '' : '') + f.n, s.x, s.y - 30 - lift);
      ctx.globalAlpha = 1;
    }
    if (f.t === 'tele') {
      var s2 = toScreen(f.x, f.y);
      var r = f.r * TW / 2;
      ctx.beginPath();
      ctx.ellipse(s2.x, s2.y, r, r / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(224,122,63,' + (.18 * Math.min(1, f.life)) + ')';
      ctx.fill();
      ctx.strokeStyle = '#e07a3f';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (f.t === 'bolt') {
      var s3 = toScreen(f.x, f.y);
      ctx.fillStyle = '#e0904a';
      ctx.beginPath();
      ctx.arc(s3.x, s3.y - 8, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  /* brume de vision */
  var pc = toScreen(G.p.x, G.p.y);
  var lr = G.p.st.light * (G.mods.brume ? .72 : 1);
  var lg = ctx.createRadialGradient(pc.x, pc.y - 8, lr * TW * .35, pc.x, pc.y - 8, lr * TW);
  lg.addColorStop(0, 'rgba(6,8,12,0)');
  lg.addColorStop(.8, 'rgba(6,8,12,.5)');
  lg.addColorStop(1, 'rgba(6,8,12,.78)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
requestAnimationFrame(draw);

function shadow(s, r) {
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, r, r / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}
function drawMob(m) {
  var s = toScreen(m.x, m.y);
  var big = m.boss ? 1.5 : 1;
  shadow(s, 10 * big);
  ctx.fillStyle = m.color;
  ctx.beginPath();
  ctx.ellipse(s.x, s.y - 12 * big, 8 * big, 12 * big, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8edf2';
  ctx.font = 'bold ' + Math.round(11 * big) + 'px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(m.glyph, s.x, s.y - 8 * big);
  if (m.hp < m.maxhp) {
    ctx.fillStyle = '#141920';
    ctx.fillRect(s.x - 14, s.y - 30 * big, 28, 4);
    ctx.fillStyle = '#e05555';
    ctx.fillRect(s.x - 14, s.y - 30 * big, 28 * Math.max(0, m.hp / m.maxhp), 4);
  }
}
function drawPlayer() {
  var s = toScreen(G.p.x, G.p.y);
  shadow(s, 11);
  ctx.fillStyle = '#e07a3f';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y - 14, 9, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd24a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(s.x, s.y - 14, 17, Math.PI * .35, Math.PI * .75);
  ctx.stroke();
  ctx.fillStyle = '#ffe9d2';
  ctx.font = 'bold 12px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('@', s.x, s.y - 10);
}

/* ── menu ── */
$('akNew').addEventListener('click', newGame);
$('akContinue').addEventListener('click', continueGame);
$('akMenuBtn').addEventListener('click', function () {
  if (G && !G.over) {
    G.over = true; G.won = false;
    endRun();
    return;
  }
  openCamp();
});

/* démarrage */
showMenu();
resize();
})();
