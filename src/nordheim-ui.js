/* ============================================================
   NORDHEIM — interface v1 : HUD, dialogues, carte, menu, audio
   Dépend de rpg-core.js + nordheim-engine.js + nordheim-3d.js.
   ES5, UMD. La carte (M) sert aussi d'interface en mode NoGL.
   ============================================================ */
(function (root) {
  'use strict';
  var N = root.NORDHEIM;
  if (!N) throw new Error('NORDHEIM requis : chargez nordheim-engine.js avant nordheim-ui.js');

  var d = document;
  function $(id) { return d.getElementById(id); }

  /* ══════════ AUDIO PROCÉDURAL (compact) ══════════ */
  var AU = { ctx: null, master: null, mute: false };
  function audio() {
    if (AU.ctx) return AU.ctx;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try {
      AU.ctx = new AC();
      AU.master = AU.ctx.createGain();
      AU.master.gain.value = AU.mute ? 0 : 0.4;
      AU.master.connect(AU.ctx.destination);
    } catch (e) { AU.ctx = null; }
    return AU.ctx;
  }
  function setMute(m) { AU.mute = m; if (AU.master) AU.master.gain.value = m ? 0 : 0.4; }
  function beep(freq, dur, type, vol, slide) {
    var c = audio(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), c.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.1, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(AU.master);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  }
  function noise(dur, freq, vol) {
    var c = audio(); if (!c) return;
    var b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), ch = b.getChannelData(0);
    for (var i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    var src = c.createBufferSource(); src.buffer = b;
    var f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    var g = c.createGain();
    g.gain.setValueAtTime(vol || 0.25, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    src.connect(f); f.connect(g); g.connect(AU.master);
    src.start();
  }
  var SFX = {
    ui: function () { beep(620, 0.05, 'square', 0.06); },
    hit: function () { noise(0.12, 800, 0.35); beep(120, 0.07, 'sawtooth', 0.12, 55); },
    whoosh: function () { noise(0.07, 2200, 0.08); },
    coin: function () { beep(880, 0.06, 'triangle', 0.1); setTimeout(function () { beep(1320, 0.09, 'triangle', 0.1); }, 60); },
    heal: function () { beep(440, 0.12, 'sine', 0.1); setTimeout(function () { beep(660, 0.16, 'sine', 0.1); }, 90); },
    bite: function () { noise(0.09, 600, 0.3); },
    level: function () { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { beep(f, 0.14, 'triangle', 0.12); }, i * 90); }); },
    fanfare: function () { [392, 523, 659, 784, 659, 1047].forEach(function (f, i) { setTimeout(function () { beep(f, 0.22, 'triangle', 0.13); }, i * 150); }); }
  };
  function sfx(n) { if (AU.mute) return; var f = SFX[n]; if (f) try { f(); } catch (e) { } }

  /* ══════════ ÉTAT ══════════ */
  var camp = null, G = null, ST = 'menu';
  var keys = {}, mouseLock = false, lastFrame = 0, hudT = 0, logN = 0, fxN = 0, saveT = 0, victoryShown = false;
  var cv = $('ndCanvas');

  function show(el, on, mode) { el.style.display = on ? (mode || 'flex') : 'none'; }

  /* ══════════ ÉCRANS ══════════ */
  function toMenu() {
    ST = 'menu';
    show($('ndMenu'), true); show($('ndHud'), false); show($('ndDialog'), false); show($('ndMapWrap'), false);
    var rec = N.records();
    $('ndRecords').textContent = rec
      ? 'Records — niveau ' + rec.level + ' · ' + rec.purged + ' ruines · ' + rec.or + ' or en poche' + (rec.troll ? ' · Troll abattu ✔' : '')
      : 'Aucune saga écrite. La vallée attend.';
    $('ndContinue').style.display = N.loadCamp() ? '' : 'none';
  }
  function startGame(c) {
    camp = c;
    AU.mute = !!camp.mute;
    G = N.startSession(camp);
    ST = 'jeu';
    logN = 0; fxN = 0; victoryShown = !!camp.trollDown;
    show($('ndMenu'), false); show($('ndHud'), true); show($('ndDialog'), false); show($('ndMapWrap'), false);
    var r3 = root.NORDHEIM3D.init(G, cv);
    show($('ndNoGL'), !r3.ok, 'block');
    root.NORDHEIM3D.resize($('ndStage').clientWidth, $('ndStage').clientHeight);
    $('ndZoneName').textContent = N.seedName(camp.seed) + ' — jour ' + camp.day;
    root.NORDHEIM3D.setWeapon(camp.wpn);
    logPump(); updateHud();
  }
  function saveAll() { if (camp) N.saveCamp(camp); }

  /* ══════════ JOURNAL & HUD ══════════ */
  function logPump() {
    var lg = $('ndLog');
    while (logN < G.msgs.length) {
      var m = G.msgs[logN++];
      var div = d.createElement('div');
      div.textContent = m.txt;
      lg.insertBefore(div, lg.firstChild);
    }
    while (lg.children.length > 8) lg.removeChild(lg.lastChild);
  }
  function bar(el, v, max, col) {
    el.firstElementChild.style.width = Math.max(0, Math.min(1, v / max)) * 100 + '%';
    if (col) el.firstElementChild.style.background = col;
  }
  function heureTxt(t) {
    var h24 = (t * 24) % 24; /* 0 = minuit, 0.5 = midi */
    return ('0' + Math.floor(h24)).slice(-2) + ':' + ('0' + Math.floor((h24 % 1) * 60)).slice(-2);
  }
  function updateHud() {
    bar($('ndBarHp'), camp.hp, camp.hpMax, camp.hp < camp.hpMax * 0.3 ? '#c0392b' : '#4a8f3c');
    bar($('ndBarSt'), G.p.st, 100, '#d8a04a');
    bar($('ndBarMa'), camp.mana, camp.manaMax, '#5a8fd8');
    $('ndOr').textContent = camp.or + ' or';
    $('ndNiveau').textContent = 'Niv. ' + camp.level + ' — ' + camp.xp + '/' + N.xpNext(camp.level) + ' XP';
    $('ndHeure').textContent = heureTxt(G.time) + (G.time > 0.78 || G.time < 0.18 ? ' 🌙' : ' ☀️');
    $('ndArme').textContent = N.WPN[camp.wpn].n + (camp.ench ? ' ✦' : '') + ' · ' + N.ARM[camp.arm].n;
    var aq = N.activeQuest(camp), qt = '';
    if (aq) {
      var q = N.QUESTS.filter(function (x) { return x.key === aq; })[0];
      qt = '<b>' + q.n + '</b><br><small>' + (q.prog ? q.prog(camp) : q.d) + '</small>';
    } else qt = '<i>Aucune quête — voyez Sigrid ou Torvald au village.</i>';
    $('ndQuete').innerHTML = qt;
    $('ndRuines').textContent = 'Ruines purgées : ' + camp.purged + ' / 6';
    $('ndPot1').textContent = 'Potion ×' + (camp.potions.soin || 0);
    $('ndPot2').textContent = 'Grande ×' + (camp.potions.grandsoin || 0);
    $('ndPot1').disabled = !(camp.potions.soin > 0);
    $('ndPot2').disabled = !(camp.potions.grandsoin > 0);
    /* prompt d'interaction */
    var pr = '';
    var npc = npcNear();
    if (npc) pr = npc.n + ' — [E] parler';
    else {
      for (var i = 0; i < G.W.ruins.length; i++) {
        var r = G.W.ruins[i];
        if (r.purged && !r.chestOpen && Math.hypot(G.p.x - r.x, G.p.z - r.z) < r.r + 4) { pr = 'Coffre de ' + r.n + ' — [E] ouvrir'; break; }
      }
    }
    $('ndPrompt').textContent = pr;
  }
  function npcNear() {
    var best = null, bd = 4;
    G.W.npcs.forEach(function (q) {
      var dd = Math.hypot(q.x - G.p.x, q.z - G.p.z);
      if (dd < bd) { bd = dd; best = q; }
    });
    return best;
  }

  /* ══════════ DIALOGUES ══════════ */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function openDialog(npc) {
    var t2 = $('ndDialogTitle'), b = $('ndDialogBody');
    t2.textContent = npc.n;
    var h = '';
    if (npc.role === 'forge') {
      h += '<p class="nd-mut">« Le feu ne demande jamais son reste. Comme la vallée. »</p>';
      h += '<h4>Vendre</h4><div class="nd-shop">';
      ['fourrure', 'croc', 'viande', 'essence'].forEach(function (k) {
        var q2 = camp.bag[k] || 0;
        h += '<button data-sellk="' + k + '"' + (q2 ? '' : ' disabled') + '>' + k + ' ×' + q2 + ' → ' + (q2 * N.SELL[k]) + ' or</button>';
      });
      h += '</div><h4>Forgeron & échoppe</h4><div class="nd-shop">';
      h += '<button data-buy="fer"' + (camp.or >= 180 ? '' : ' disabled') + '>Épée de fer — 180 (dégâts 13)</button>';
      h += '<button data-buy="guerre"' + (camp.or >= 320 ? '' : ' disabled') + '>Hache de guerre — 320 (dégâts 17)</button>';
      h += '<button data-buy="cuir"' + (camp.or >= 150 ? '' : ' disabled') + '>Cuir bouilli — 150 (déf. 15 %)</button>';
      h += '<button data-buy="ferarm"' + (camp.or >= 400 ? '' : ' disabled') + '>Cotte de fer — 400 (déf. 30 %)</button>';
      h += '<button data-buy="soin"' + (camp.or >= 45 ? '' : ' disabled') + '>Potion de soin — 45</button>';
      h += '<button data-buy="grandsoin"' + (camp.or >= 110 && camp.quests.ruines2 === 'faite' ? '' : ' disabled') + '>Grande potion — 110' + (camp.quests.ruines2 === 'faite' ? '' : ' (après « Reprendre la vallée »)') + '</button>';
      h += '<button data-buy="enchant"' + (camp.or >= N.enchantCost() && !camp.ench ? '' : ' disabled') + '>Enchanter l\u2019arme — ' + N.enchantCost() + ' (+25 % dégâts' + (camp.ench ? ', déjà fait' : '') + ')</button>';
      h += '</div>';
    } else if (npc.role === 'chasseurs' || npc.role === 'hache') {
      var g = npc.role === 'chasseurs' ? 'Guilde des Chasseurs' : 'Compagnie de la Hache';
      h += '<p style="color:#8fb8d8;font-size:.78rem;font-weight:700;margin:0 0 4px">' + g + '</p>';
      h += '<p class="nd-mut">' + (npc.role === 'chasseurs' ? '« Les bois nourrissent celles et ceux qui les écoutent. »' : '« La vallée ne se rend pas. Elle se reprend. »') + '</p>';
      N.QUESTS.filter(function (q) { return q.g === npc.role; }).forEach(function (q) {
        var stt = camp.quests[q.key];
        var act = N.activeQuest(camp) === q.key;
        h += '<div class="nd-quest' + (act ? ' act' : '') + (stt === 'faite' ? ' done' : '') + '"><b>' + q.n + '</b><p>' + q.d + '</p><small>';
        if (stt === 'libre') h += '<button data-qacc="' + q.key + '"' + (N.activeQuest(camp) ? ' disabled' : '') + '>Accepter</button>';
        else if (stt === 'faite') h += '✔ accomplie';
        else if (act) h += 'En cours — ' + q.prog(camp) + ' <button data-qturn="1">Remettre</button>';
        else h += '<i>verrouillée</i>';
        h += '</small></div>';
      });
      h += '<p class="nd-mut">Récompenses de guilde : épée de chasse, manteau de l\u2019Ourse, Broie-Troll.</p>';
    } else if (npc.role === 'soin') {
      h += '<p class="nd-mut">« Respire. Le pire ennemi ici, c\u2019est l\u2019orgueil. »</p>';
      h += '<button data-heal="1"' + (camp.hp >= camp.hpMax ? ' disabled' : '') + '>Se faire soigner (gratuit)</button>';
    } else if (npc.role === 'garde') {
      h += '<p class="nd-mut">« ' + (G.time > 0.78 || G.time < 0.18 ? 'Reste près du feu, la nuit. Les loups ont faim et aucun sens de l\u2019hospitalité.' : 'Belle journée pour purger une ruine, non ?') + ' »</p>';
    } else {
      h += '<p class="nd-mut">« ' + ['Le Troll ? Mes grands-parentes en parlaient déjà.', 'Les pierres du cercle chantent quand le vent est du nord.', 'Ramène de la viande, Runa fait des merveilles.', 'Le forgeron enchante les lames, paraît-il.'][Math.floor(Math.random() * 4)] + ' »</p>';
    }
    b.innerHTML = h;
    show($('ndDialog'), true);
    sfx('ui');
  }
  $('ndDialogBody').addEventListener('click', function (e) {
    var t2 = e.target.closest('[data-sellk],[data-buy],[data-qacc],[data-qturn],[data-heal]');
    if (!t2) return;
    if (t2.dataset.sellk) { var gain = N.sellAll(camp, t2.dataset.sellk); sfx(gain ? 'coin' : 'ui'); }
    else if (t2.dataset.buy) { sfx(N.buy(camp, t2.dataset.buy) ? 'coin' : 'ui'); root.NORDHEIM3D.setWeapon(camp.wpn); }
    else if (t2.dataset.qacc) { sfx(N.startQuest(camp, t2.dataset.qacc) ? 'ui' : 'ui'); }
    else if (t2.dataset.qturn) {
      var r = N.turnIn(camp);
      if (r && r.ok) { sfx('coin'); root.NORDHEIM3D.setWeapon(camp.wpn); }
      else sfx('ui');
    }
    else if (t2.dataset.heal) { sfx(N.yrsaHeal(G) ? 'heal' : 'ui'); }
    saveAll();
    var npc = npcNear();
    updateHud();
    if (npc) openDialog(npc);
  });
  $('ndDialogClose').addEventListener('click', function () { show($('ndDialog'), false); saveAll(); });

  /* ══════════ INTERACTION ══════════ */
  function interact() {
    var npc = npcNear();
    if (npc) { openDialog(npc); return; }
    var chest = N.cmdChest(G);
    if (chest) sfx('coin');
  }

  /* ══════════ CARTE 2D (M) ══════════ */
  function drawMap() {
    var mc = $('ndMapCanvas'), mx = mc.getContext('2d');
    var S = mc.width, n = 48, cell = S / n;
    for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
      var x = (i / (n - 1) - 0.5) * 940, z = (j / (n - 1) - 0.5) * 940;
      var h = N.groundAt(x, z);
      var col;
      if (h > 62) col = '#dfe8ee';
      else if (h > 40) col = '#8a8578';
      else if (Math.hypot(x, z - 150) < 78) col = '#9a8a66';
      else col = h > 22 ? '#6a8f52' : '#5a8446';
      mx.fillStyle = col;
      mx.fillRect(i * cell, j * cell, cell + 1, cell + 1);
    }
    G.W.trees.forEach(function (tr) {
      if (tr.kind !== 'sapin') return;
      mx.fillStyle = 'rgba(38,66,38,0.55)';
      mx.fillRect((tr.x / 940 + 0.5) * S - 1, (tr.z / 940 + 0.5) * S - 1, 2, 2);
    });
    G.W.ruins.forEach(function (r) {
      mx.fillStyle = r.purged ? '#e8c86a' : '#c0563c';
      mx.beginPath();
      mx.arc((r.x / 940 + 0.5) * S, (r.z / 940 + 0.5) * S, 4, 0, 7);
      mx.fill();
    });
    mx.fillStyle = '#f2e9d8';
    mx.fillRect((0 / 940 + 0.5) * S - 5, (150 / 940 + 0.5) * S - 5, 10, 10);
    mx.fillStyle = '#fff';
    mx.save();
    mx.translate((G.p.x / 940 + 0.5) * S, (G.p.z / 940 + 0.5) * S);
    mx.rotate(-G.p.a);
    mx.beginPath();
    mx.moveTo(0, -6); mx.lineTo(-4, 4); mx.lineTo(4, 4);
    mx.fill();
    mx.restore();
    mx.fillStyle = '#e8e2d0';
    mx.font = '11px monospace';
    mx.fillText('Village ▩ · ruines ● (or = purgée) · vous ▲', 8, S - 8);
  }

  /* ══════════ ENTRÉES ══════════ */
  d.addEventListener('keydown', function (e) {
    keys[e.code] = true;
    if (ST !== 'jeu') return;
    if (e.code === 'KeyE') interact();
    else if (e.code === 'KeyR') { sfx(N.cmdSpell(G) ? 'heal' : 'ui'); }
    else if (e.code === 'Digit1') { N.cmdPotion(G, 'soin') && sfx('heal'); updateHud(); }
    else if (e.code === 'Digit2') { N.cmdPotion(G, 'grandsoin') && sfx('heal'); updateHud(); }
    else if (e.code === 'KeyM') { var on = $('ndMapWrap').style.display === 'none'; show($('ndMapWrap'), on); if (on) drawMap(); }
    else if (e.code === 'KeyH') { show($('ndAide'), $('ndAide').style.display === 'none', 'block'); }
    else if (e.code === 'Escape') { show($('ndDialog'), false); show($('ndMapWrap'), false); show($('ndAide'), false); }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].indexOf(e.code) >= 0) e.preventDefault();
  });
  d.addEventListener('keyup', function (e) { keys[e.code] = false; });
  cv.addEventListener('mousedown', function (e) {
    if (ST !== 'jeu') return;
    if (cv.requestPointerLock && d.pointerLockElement !== cv) { try { cv.requestPointerLock(); } catch (er) { } }
    var hit = N.cmdAttack(G);
    sfx(hit ? 'hit' : 'whoosh');
    updateHud();
  });
  d.addEventListener('pointerlockchange', function () { mouseLock = d.pointerLockElement === cv; });
  d.addEventListener('mousemove', function (e) {
    if (ST === 'jeu' && mouseLock && G) {
      N.cmdTurn(G, e.movementX * 0.0032);
      root.NORDHEIM3D.pitch = Math.max(0.08, Math.min(1.1, root.NORDHEIM3D.pitch + e.movementY * 0.0022));
    }
  });
  cv.addEventListener('wheel', function (e) { root.NORDHEIM3D.setZoom(root.NORDHEIM3D.dist + (e.deltaY > 0 ? 1.2 : -1.2)); e.preventDefault(); }, { passive: false });
  root.addEventListener('resize', function () {
    var st2 = $('ndStage');
    root.NORDHEIM3D.resize(st2.clientWidth, st2.clientHeight);
  });

  /* boutons rapides */
  $('ndPot1').addEventListener('click', function () { N.cmdPotion(G, 'soin') && sfx('heal'); updateHud(); });
  $('ndPot2').addEventListener('click', function () { N.cmdPotion(G, 'grandsoin') && sfx('heal'); updateHud(); });
  $('ndMapBtn').addEventListener('click', function () { var on = $('ndMapWrap').style.display === 'none'; show($('ndMapWrap'), on); if (on) drawMap(); });
  $('ndMapClose').addEventListener('click', function () { show($('ndMapWrap'), false); });
  $('ndAideBtn2').addEventListener('click', function () { show($('ndAide'), true, 'block'); });
  $('ndAideClose').addEventListener('click', function () { show($('ndAide'), false); });
  $('ndMute2').addEventListener('click', function () { setMute(!AU.mute); camp.mute = AU.mute; saveAll(); $('ndMute2').textContent = AU.mute ? '🔇 Son coupé' : '🔊 Son'; });
  $('ndQuit').addEventListener('click', function () { saveAll(); toMenu(); });
  $('ndVictoryBtn').addEventListener('click', function () { show($('ndVictory'), false); });

  /* ══════════ MENU ══════════ */
  Array.prototype.forEach.call(d.querySelectorAll('[data-seed]'), function (b) {
    b.addEventListener('click', function () {
      startGame(N.newCamp(b.dataset.seed));
      sfx('ui');
    });
  });
  $('ndContinue').addEventListener('click', function () {
    var c = N.loadCamp();
    if (c) { startGame(c); sfx('ui'); }
  });
  $('ndAideBtn').addEventListener('click', function () { show($('ndAide'), true, 'block'); });
  $('ndAideCloseMenu').addEventListener('click', function () { show($('ndAide'), false); });
  $('ndMute').addEventListener('click', function () { setMute(!AU.mute); $('ndMute').textContent = AU.mute ? '🔇 Son coupé' : '🔊 Son'; });

  /* ══════════ BOUCLE ══════════ */
  function loop(now) {
    root.requestAnimationFrame(loop);
    var dt = Math.max(0, Math.min(0.05, (now - lastFrame) / 1000));
    lastFrame = now;
    if (ST !== 'jeu' || !G) return;
    if (!G.over) {
      var fwd = (keys.KeyW || keys.KeyZ || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      var strafe = (keys.KeyD ? 1 : 0) - (keys.KeyA || keys.KeyQ ? 1 : 0);
      var turn = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
      if (turn) N.cmdTurn(G, turn * 2.4 * dt);
      G._moving = !!(fwd || strafe);
      N.cmdMove(G, fwd, strafe, dt, keys.ShiftLeft || keys.ShiftRight);
      N.step(G, dt);
    } else if (G.over === 'ko') {
      N.respawnPlayer(G);
      sfx('ui');
    }
    root.NORDHEIM3D.render(dt, now);
    /* fx → sons */
    while (fxN < G.fx.length) {
      var f = G.fx[fxN++];
      if (f.t === 'bite') sfx('bite');
      else if (f.t === 'soin') sfx('heal');
    }
    logPump();
    /* victoire */
    if (camp.trollDown && !victoryShown) {
      victoryShown = true;
      $('ndVictoryVallee').textContent = N.seedName(camp.seed);
      show($('ndVictory'), true);
      sfx('fanfare');
      saveAll();
    }
    hudT -= dt;
    if (hudT <= 0) { hudT = 0.13; updateHud(); }
    saveT -= dt;
    if (saveT <= 0) { saveT = 12; saveAll(); }
  }

  /* hook de debug/test (smoke jsdom) */
  root.NORDHEIM_DEBUG = { getG: function () { return G; }, getC: function () { return camp; } };

  /* boot */
  setMute(false);
  toMenu();
  root.requestAnimationFrame(function (t2) { lastFrame = t2; root.requestAnimationFrame(loop); });
})(typeof window !== 'undefined' ? window : global);
