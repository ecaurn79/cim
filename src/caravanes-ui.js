/* ============================================================
   CARAVANES — interface v1 : iso canvas, escouade, marchés, base
   Dépend de rpg-core.js + caravanes-engine.js. ES5, UMD.
   Vue isométrique maison (comme Arkhantis — PixiJS écarté).
   ============================================================ */
(function (root) {
  'use strict';
  var C = root.CARAVANES;
  if (!C) throw new Error('CARAVANES requis : chargez caravanes-engine.js avant caravanes-ui.js');

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
  function beep(f, dur, type, vol, slide) {
    var c = audio(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, c.currentTime);
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
    ui: function () { beep(600, 0.05, 'square', 0.06); },
    coin: function () { beep(880, 0.06, 'triangle', 0.1); setTimeout(function () { beep(1320, 0.09, 'triangle', 0.1); }, 60); },
    hit: function () { noise(0.1, 900, 0.3); },
    ko: function () { beep(200, 0.3, 'sawtooth', 0.15, 60); },
    build: function () { beep(220, 0.08, 'square', 0.1); setTimeout(function () { beep(180, 0.1, 'square', 0.1); }, 120); },
    alarm: function () { beep(500, 0.5, 'sawtooth', 0.13, 900); }
  };
  function sfx(n) { if (AU.mute) return; var f = SFX[n]; if (f) try { f(); } catch (e) { } }

  /* ══════════ ÉTAT ══════════ */
  var camp = null, G = null, ST = 'menu';
  var camX = 0, camZ = 0, paused = false, fast = false;
  var lastFrame = 0, hudT = 0, logN = 0, saveT = 0, msgAlarm = 0;
  var cv = $('caCanvas'), ctx = cv.getContext('2d');
  var TW = 46, TH = 23;
  function w2s(x, z) { return [(x - z) * (TW / 2) + cv.width / 2 - camX, (x + z) * (TH / 2) + cv.height * 0.55 - camZ]; } /* v28 : escouade centrée (55 % de hauteur) */
  function s2w(sx, sy) {
    var px = sx - cv.width / 2 + camX, py = sy - cv.height * 0.55 + camZ;
    return [(px / (TW / 2) + py / (TH / 2)) / 2, (py / (TH / 2) - px / (TW / 2)) / 2];
  }

  function show(el, on, mode) { el.style.display = on ? (mode || 'flex') : 'none'; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  /* ══════════ ÉCRANS ══════════ */
  function toMenu() {
    ST = 'menu';
    show($('caMenu'), true); show($('caHud'), false); show($('caCity'), false); show($('caBase'), false); show($('caAide'), false);
    var rec = C.records();
    $('caRecords').textContent = rec
      ? 'Records — ' + rec.or + ' or · jour ' + rec.jour + ' · ' + rec.purges + ' camps purgés · ' + rec.recrues + ' recrues' + (rec.base ? ' · avant-poste ✔' : '')
      : 'Aucune caravane n\u2019a encore survécu à ses rêves.';
    $('caContinue').style.display = C.loadCamp() ? '' : 'none';
  }
  function startGame(c) {
    camp = c;
    AU.mute = !!camp.mute;
    G = C.startSession(camp);
    var m0 = G.members[0];
    camX = (m0.x - m0.z) * (TW / 2); camZ = (m0.x + m0.z) * (TH / 2); /* v28 : pas de décalage — l'escouade démarre centrée */
    ST = 'jeu'; paused = false; fast = false; logN = 0;
    G.tuto = true; /* v27 : tuteur jusqu'au 1er clic-sol */
    show($('caMenu'), false); show($('caHud'), true); show($('caCity'), false); show($('caBase'), false); show($('caAide'), false);
    C.saveCamp(camp);
    logPump(); updateHud();
  }

  /* ══════════ HUD ══════════ */
  function logPump() {
    var lg = $('caLog');
    while (logN < G.msgs.length) {
      var m = G.msgs[logN++];
      var txt = m.txt;
      if (G.time.h - (msgAlarm || 0) > 0 && (txt.indexOf('EMBUSCADE') >= 0 || txt.indexOf('RAID') >= 0 || txt.indexOf('à terre') >= 0)) { sfx('alarm'); sfx('ko'); }
      var div = d.createElement('div');
      div.textContent = txt;
      lg.insertBefore(div, lg.firstChild);
    }
    while (lg.children.length > 9) lg.removeChild(lg.lastChild);
  }
  function bar(el, v, max, col) {
    el.firstElementChild.style.width = Math.max(0, Math.min(1, v / max)) * 100 + '%';
    if (col) el.firstElementChild.style.background = col;
  }
  function updateHud() {
    $('caTemps').textContent = 'Jour ' + G.time.day + ' — ' + ('0' + Math.floor(G.time.h)).slice(-2) + ' h' + (paused ? ' · ⏸' : (fast ? ' · ×3' : ''));
    $('caOr').textContent = camp.or + ' or';
    var inv = camp.inv;
    $('caInv').textContent = 'eau ' + (inv.eau || 0) + ' · pain ' + (inv.pain || 0) + ' · viande ' + (inv.viande || 0) +
      ' · tissu ' + (inv.tissu || 0) + ' · outils ' + (inv.outils || 0) + ' · épices ' + (inv.epices || 0) + ' · vieilleries ' + (inv.vieilleries || 0);
    /* escouade */
    var sh = '';
    G.members.forEach(function (m, i) {
      sh += '<button class="ca-mbr' + (i === G.selected ? ' sel' : '') + (m.st === 'ko' ? ' ko' : '') + '" data-mbr="' + i + '">' +
        '<b>' + esc(m.n) + '</b><small>' + (m.st === 'ko' ? 'à terre' : 'F' + m.force + ' · V' + m.vitesse.toFixed(2) + ' · E' + m.endu + ' · C' + m.commerce) + '</small></button>';
    });
    $('caSquad').innerHTML = sh;
    var m = G.members[G.selected] || G.members[0];
    if (m) {
      bar($('caBarHp'), m.hp, m.hpMax, m.hp < m.hpMax * 0.3 ? '#c0392b' : '#4a8f3c');
      bar($('caBarFaim'), m.faim, 100, '#d8893a');
      bar($('caBarEau'), m.eau, 100, '#4a8fd8');
      $('caMbrInfo').textContent = m.n + ' — force ' + m.force + ' · vitesse ×' + m.vitesse.toFixed(2) + ' · endurance ' + m.endu + ' · commerce ' + m.commerce;
      $('caEat').textContent = 'Manger pain ×' + (camp.inv.pain || 0);
      $('caMeat').textContent = 'Viande ×' + (camp.inv.viande || 0);
      $('caDrink').textContent = 'Boire eau ×' + (camp.inv.eau || 0);
      $('caEat').disabled = !(camp.inv.pain > 0) || m.st !== 'debout';
      $('caMeat').disabled = !(camp.inv.viande > 0) || m.st !== 'debout';
      $('caDrink').disabled = !(camp.inv.eau > 0) || m.st !== 'debout';
    }
    $('caBaseTag').textContent = camp.base ? 'Avant-poste : ' + C.BUILD_KEYS.filter(function (k) { return camp.base.b[k] >= 1; }).length + '/4 bâtiments' : 'Aucun avant-poste';
    /* prompt */
    var pr = '';
    if (C.cityAt(G)) pr = C.cityAt(G).t2.n + ' — [E] marché & taverne';
    else if (camp.base && Math.hypot((G.members[0] || {}).x - camp.base.x, (G.members[0] || {}).z - camp.base.z) < 80) pr = 'Avant-poste — [E] chantiers';
    else if (nearRuine()) pr = 'Ruine — [E] fouiller';
    else if (nearOasis()) pr = 'Oasis — [E] remplir les outres';
    if (!pr) pr = 'Clic gauche : marcher jusqu\u2019au point · [E] agir · [Espace] pause';
    $('caPrompt').textContent = pr;
  }
  function nearRuine() {
    var m = G.members[0];
    return G.W.ruins.some(function (r) { return !r.looted && Math.hypot(m.x - r.x, m.z - r.z) < 30; });
  }
  function nearOasis() {
    var m = G.members[0];
    return G.W.oases.some(function (o) { return Math.hypot(m.x - o.x, m.z - o.z) < o.r + 15; });
  }

  /* ══════════ PANNEAUX VILLE & BASE ══════════ */
  var cityIdx = -1;
  function openCity(idx) {
    cityIdx = idx;
    var t2 = G.W.towns[idx];
    $('caCityTitle').textContent = t2.n + ' — ' + C.FACTIONS[t2.fac].n;
    var op = Math.round(camp.opinions[t2.fac]);
    $('caCityOp').innerHTML = 'Opinion : <b>' + (op > 0 ? '+' : '') + op + '</b> <small>(achats ' +
      Math.round((1 - op / 450) * 100) + ' % · ventes +' + Math.round(op / 5) + ' %)</small>';
    var h = '<table class="ca-mkt"><tr><th>Marchandise</th><th>Acheter</th><th>Vendre</th><th>Stock</th></tr>';
    C.GOOD_KEYS.concat(['vieilleries']).forEach(function (g) {
      var bp = C.buyPrice(G, t2, g), sp = C.sellPrice(G, t2, g);
      h += '<tr><td>' + g + '</td>' +
        '<td><button data-buy="' + g + '" data-q="1"' + (camp.or >= bp ? '' : ' disabled') + '>1 → ' + bp + '</button>' +
        '<button data-buy="' + g + '" data-q="5"' + (camp.or >= bp * 5 ? '' : ' disabled') + '>5 → ' + bp * 5 + '</button></td>' +
        '<td><button data-sell="' + g + '"' + ((camp.inv[g] || 0) > 0 ? '' : ' disabled') + '>' + sp + '</button></td>' +
        '<td>' + (camp.inv[g] || 0) + '</td></tr>';
    });
    h += '</table><h4>Taverne</h4><div class="ca-tav">';
    G.tavern[idx].forEach(function (r, j) {
      h += '<div class="ca-tavR"><b>' + esc(r.n) + '</b><small>force ' + r.force + ' · vitesse ×' + r.vitesse.toFixed(2) +
        ' · endurance ' + r.endu + ' · commerce ' + r.commerce + '</small>' +
        '<button data-rec="' + j + '"' + (camp.or >= r.prix && G.members.length < 3 ? '' : ' disabled') + '>Engager — ' + r.prix + ' or</button></div>';
    });
    h += '</div><p class="ca-mut">Escouade : ' + G.members.length + ' / 3 (MVP — jusqu\u2019à 12 en V1).</p>';
    $('caCityBody').innerHTML = h;
    show($('caCity'), true);
  }
  $('caCityBody').addEventListener('click', function (e) {
    var t2 = e.target.closest('[data-buy],[data-sell],[data-rec]');
    if (!t2) return;
    if (t2.dataset.buy) { var rB = C.buy(G, t2.dataset.buy, +t2.dataset.q); sfx(rB.ok ? 'coin' : 'ui'); }
    else if (t2.dataset.sell) { var rS = C.sell(G, t2.dataset.sell, camp.inv[t2.dataset.sell] || 0); sfx(rS.ok ? 'coin' : 'ui'); }
    else if (t2.dataset.rec !== undefined) { var rR = C.recruit(G, cityIdx, +t2.dataset.rec); sfx(rR.ok ? 'coin' : 'ui'); if (rR.ok) { openCity(cityIdx); return; } }
    updateHud();
    openCity(cityIdx);
  });
  $('caCityClose').addEventListener('click', function () { show($('caCity'), false); });

  function openBase() {
    var b = camp.base;
    var h = '';
    if (!b) {
      h += '<p>Personne ne veille ici. Pour fonder un avant-poste : placez-vous <b>près d\u2019une oasis</b> (et loin des villes), puis confirmez.</p>';
      h += '<button class="ca-go" id="caFound">Fonder l\u2019avant-poste ici</button>';
    } else {
      h += '<p>Avant-poste au point ' + b.x + ' · ' + b.z + '. ' + (b.done ? '' : 'En construction…') + '</p><div class="ca-blds">';
      C.BUILD_KEYS.forEach(function (k) {
        var spec = C.BUILDS[k], st = b.b[k];
        var label = st >= 1 ? '✔ ' + spec.d : (st > 0 ? 'Chantier : ' + Math.round(st * 100) + ' %' : 'Construire — ' + spec.or + ' or + ' + spec.outils + ' outils');
        h += '<div class="ca-bld"><b>' + spec.n + '</b><small>' + label + '</small>' +
          (st === 0 ? '<button data-bld="' + k + '"' + (camp.or >= spec.or && (camp.inv.outils || 0) >= spec.outils ? '' : ' disabled') + '>Lancer</button>' : '') + '</div>';
      });
      h += '</div><p class="ca-mut">Les raids tombent toutes les 18-30 h : gardez des bras à la base, ou une tour.</p>';
    }
    $('caBaseBody').innerHTML = h;
    var f = $('caFound');
    if (f) f.addEventListener('click', function () {
      var r = C.foundBase(G);
      sfx(r.ok ? 'build' : 'ui');
      updateHud();
      openBase();
    });
    show($('caBase'), true);
  }
  $('caBaseBody').addEventListener('click', function (e) {
    var t2 = e.target.closest('[data-bld]');
    if (!t2) return;
    var r = C.build(G, t2.dataset.bld);
    sfx(r.ok ? 'build' : 'ui');
    updateHud();
    openBase();
  });
  $('caBaseClose').addEventListener('click', function () { show($('caBase'), false); });

  /* ══════════ INTERACTION ══════════ */
  function interact() {
    var c = C.cityAt(G);
    if (c) { openCity(c.idx); return; }
    if (camp.base && Math.hypot(G.members[0].x - camp.base.x, G.members[0].z - camp.base.z) < 80) { openBase(); return; }
    if (nearRuine()) { sfx(C.lootRuine(G) ? 'coin' : 'ui'); updateHud(); return; }
    if (nearOasis()) {
      if (!camp.base) { openBase(); return; } /* E à une oasis sans base : fondation d'abord */
      sfx(C.fillWater(G) ? 'coin' : 'ui');
      updateHud();
      return;
    }
  }

  /* ══════════ RENDU ISO ══════════ */
  /* v26c : palette par graine — les 3 zones ne partagent plus le même sable */
  var SANDS = {
    sel:    ['#d8b878', '#d2b070', '#cdaa6a', '#c9a86a', '#a8845a'],
    verre:  ['#c2d2c6', '#b6c8bc', '#acc0b4', '#b1c3b9', '#8aa094'],
    cendre: ['#b4aca8', '#aaa29c', '#a09890', '#a89e98', '#8a8078']
  };
  function sandPal() { var s2 = (G && G.W && G.W.seed) || (camp && camp.seed); return SANDS[s2] || SANDS.sel; }
  function render(now) {
    var w = cv.width, h = cv.height;
    /* centre caméra : escouade */
    var cx = 0, cz = 0, n = 0;
    G.members.forEach(function (m) { cx += m.x; cz += m.z; n++; });
    if (n) { cx /= n; cz /= n; }
    camX += ((cx - cz) * (TW / 2) - camX) * 0.08;
    camZ += ((cx + cz) * (TH / 2) - camZ) * 0.08;
    /* fond */
    var PAL = sandPal();
    ctx.fillStyle = PAL[3];
    ctx.fillRect(0, 0, w, h);
    /* dalles de dunes */
    var step = 60;
    for (var gx = -step; gx < w + step; gx += step) {
      for (var gy = -step; gy < h + step; gy += step) {
        var wx = (gx - cv.width / 2 + camX) , wy = (gy - cv.height * 0.55 + camZ);
        var ti = Math.abs(((wx * 7 + wy * 13) / 500) | 0) % 3;
        ctx.fillStyle = PAL[ti];
        ctx.fillRect(gx + ((wy / step | 0) % 2) * step / 2, gy, step, step);
      }
    }
    /* v27 : crêtes de dunes — grandes ombres douces ancrées au monde */
    var dstep = 300;
    for (var dx2 = -dstep; dx2 < w + dstep; dx2 += dstep) {
      for (var dy2 = -dstep; dy2 < h + dstep; dy2 += dstep) {
        var wx2 = (dx2 - cv.width / 2 + camX), wy3 = (dy2 - 40 + camZ);
        var hsh2 = Math.abs(((wx2 * 7 + wy3 * 13) / 900) | 0);
        if (hsh2 % 2) continue;
        var px2 = dx2 + (hsh2 % 137), py2 = dy2 + (hsh2 % 91);
        ctx.fillStyle = (hsh2 % 3) ? 'rgba(120,90,50,0.10)' : 'rgba(255,240,200,0.08)';
        ctx.beginPath();
        ctx.ellipse(px2, py2, 110 + (hsh2 % 60), 34 + (hsh2 % 22), (hsh2 % 7) * 0.45, 0, 7);
        ctx.fill();
      }
    }
    /* limites du monde */
    [[0, 0, C.SIZE, 0], [C.SIZE, 0, C.SIZE, C.SIZE], [C.SIZE, C.SIZE, 0, C.SIZE], [0, C.SIZE, 0, 0]].forEach(function (l) {
      ctx.strokeStyle = PAL[4];
      ctx.lineWidth = 4;
      ctx.beginPath();
      var p1 = w2s(l[0], l[1]), p2 = w2s(l[2], l[3]);
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
    });
    /* rochers */
    G.W.rocks.forEach(function (r) {
      var p = w2s(r.x, r.z);
      if (p[0] < -30 || p[0] > w + 30 || p[1] < -30 || p[1] > h + 30) return;
      ctx.fillStyle = '#9a8a70';
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], 4 * r.s, 2 * r.s, 0, 0, 7);
      ctx.fill();
    });
    /* oasis */
    G.W.oases.forEach(function (o) {
      var p = w2s(o.x, o.z);
      if (p[0] < -80 || p[0] > w + 80 || p[1] < -60 || p[1] > h + 60) return;
      ctx.fillStyle = '#7aa85a';
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], o.r * (TW / 2) / 1.42, o.r * (TH / 2) / 1.42, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#4a8fc0';
      ctx.beginPath();
      ctx.ellipse(p[0], p[1] + 2, o.r * 0.45 * (TW / 2) / 1.42, o.r * 0.45 * (TH / 2) / 1.42, 0, 0, 7);
      ctx.fill();
      /* v27 : palmiers */
      for (var pi = 0; pi < 4; pi++) {
        var ha = (o.x * 3 + o.z * 7 + pi * 131) % 628 / 100;
        var pr = o.r * 0.55;
        var px3 = p[0] + Math.cos(ha) * pr, py3 = p[1] + Math.sin(ha) * pr * 0.5;
        ctx.strokeStyle = '#7a5c30'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(px3, py3); ctx.lineTo(px3, py3 - 16); ctx.stroke();
        ctx.strokeStyle = '#5a9a4a'; ctx.lineWidth = 2;
        for (var fl = 0; fl < 5; fl++) {
          var fa = fl * Math.PI * 2 / 5;
          ctx.beginPath(); ctx.moveTo(px3, py3 - 16);
          ctx.quadraticCurveTo(px3 + Math.cos(fa) * 8, py3 - 22, px3 + Math.cos(fa) * 13, py3 - 14);
          ctx.stroke();
        }
      }
    });
    /* ruines */
    G.W.ruins.forEach(function (r) {
      var p = w2s(r.x, r.z);
      if (p[0] < -40 || p[0] > w + 40 || p[1] < -40 || p[1] > h + 40) return;
      ctx.strokeStyle = r.looted ? '#8a7a60' : '#6a5a44';
      ctx.lineWidth = 3;
      for (var i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(p[0] - 8 + i * 8, p[1]);
        ctx.lineTo(p[0] - 8 + i * 8, p[1] - 10 - (i % 2) * 4);
        ctx.stroke();
      }
    });
    /* camps pillards */
    G.W.camps.forEach(function (c2) {
      var p = w2s(c2.x, c2.z);
      if (p[0] < -50 || p[0] > w + 50 || p[1] < -50 || p[1] > h + 50) return;
      ctx.fillStyle = c2.purged ? '#7a6a58' : '#8a4a3a';
      for (var i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(p[0] - 10 + i * 9, p[1]);
        ctx.lineTo(p[0] - 6 + i * 9, p[1] - 9);
        ctx.lineTo(p[0] - 2 + i * 9, p[1]);
        ctx.fill();
      }
    });
    /* villes */
    G.W.towns.forEach(function (t2) {
      var p = w2s(t2.x, t2.z);
      if (p[0] < -140 || p[0] > w + 140 || p[1] < -120 || p[1] > h + 120) return;
      var R = t2.r * (TW / 2) / 1.42;
      ctx.fillStyle = '#b09468';
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], R, R * 0.5, 0, 0, 7);
      ctx.fill();
      ctx.strokeStyle = C.FACTIONS[t2.fac].col;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#7a6048';
      for (var i = 0; i < 4; i++) {
        ctx.fillRect(p[0] - 18 + i * 10, p[1] - 8 - (i % 2) * 5, 8, 12 + (i % 2) * 5);
      }
      ctx.fillStyle = '#2a241c';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t2.n, p[0], p[1] - R * 0.5 - 8);
    });
    /* base */
    if (camp.base) {
      var bp = w2s(camp.base.x, camp.base.z);
      ctx.fillStyle = '#c9a04a';
      ctx.fillRect(bp[0] - 10, bp[1] - 8, 20, 12);
      ctx.strokeStyle = '#7a5c28';
      ctx.strokeRect(bp[0] - 10, bp[1] - 8, 20, 12);
      if (camp.base.b.tour >= 1) { ctx.fillRect(bp[0] + 8, bp[1] - 20, 6, 16); }
      var buildKeys = C.BUILD_KEYS;
      for (var bi = 0; bi < buildKeys.length; bi++) {
        var st = camp.base.b[buildKeys[bi]];
        if (st > 0 && st < 1) {
          ctx.fillStyle = '#e8d8a0';
          ctx.fillRect(bp[0] - 12, bp[1] + 8, 24 * st, 3);
        }
      }
    }
    /* ennemis */
    G.enemies.forEach(function (e) {
      var p = w2s(e.x, e.z);
      ctx.fillStyle = 'rgba(40,25,10,0.28)';
      ctx.beginPath(); ctx.ellipse(p[0], p[1] + 1, 8, 3.4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#a83a2a';
      ctx.beginPath();
      ctx.moveTo(p[0], p[1] - 12);
      ctx.lineTo(p[0] - 6, p[1]);
      ctx.lineTo(p[0] + 6, p[1]);
      ctx.fill();
      ctx.fillStyle = '#300';
      ctx.fillRect(p[0] - 7, p[1] - 17, 14, 3);
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(p[0] - 7, p[1] - 17, 14 * Math.max(0, e.hp / 36), 3);
    });
    /* escouade */
    var MBR_COL = ['#3a4a5a', '#5a3a4a', '#3a5a44'];
    G.members.forEach(function (m, i) {
      var p = w2s(m.x, m.z);
      /* v27 : ombre portée */
      ctx.fillStyle = 'rgba(40,25,10,0.28)';
      ctx.beginPath(); ctx.ellipse(p[0], p[1] + 1, 8, 3.6, 0, 0, 7); ctx.fill();
      var bob = m.tx !== null && m.st === 'debout' ? Math.sin(now * 0.012 + i * 2) * 1.5 : 0;
      ctx.fillStyle = m.st === 'ko' ? '#8a8078' : MBR_COL[i % 3];
      ctx.beginPath();
      ctx.ellipse(p[0], p[1] - 9 + bob, 6.5, 11.5, 0, 0, 7);
      ctx.fill();
      /* v27 : ceinture claire — lisibilité de la silhouette */
      ctx.fillStyle = 'rgba(230,200,140,0.8)';
      ctx.fillRect(p[0] - 5.5, p[1] - 9 + bob, 11, 2.4);
      ctx.fillStyle = '#d8b090';
      ctx.beginPath();
      ctx.arc(p[0], p[1] - 24 + bob, 4.6, 0, 7);
      ctx.fill();
      /* v27 : turban de couleur du membre */
      ctx.fillStyle = MBR_COL[i % 3];
      ctx.beginPath(); ctx.arc(p[0], p[1] - 26.5 + bob, 4.2, Math.PI, 0); ctx.fill();
      /* santé */
      ctx.fillStyle = '#222';
      ctx.fillRect(p[0] - 8, p[1] - 26 + bob, 16, 3);
      ctx.fillStyle = m.hp < m.hpMax * 0.3 ? '#c0392b' : '#4a8f3c';
      ctx.fillRect(p[0] - 8, p[1] - 26 + bob, 16 * Math.max(0, m.hp / m.hpMax), 3);
      if (i === G.selected) {
        ctx.strokeStyle = '#ffe08a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(p[0], p[1] + 1, 11, 5.5, 0, 0, 7);
        ctx.stroke();
      }
    });
    /* v27 : repère de destination pulsé (retour visuel de l'ordre de marche) */
    var someWalking = false;
    G.members.forEach(function (m) { if (m.tx != null) someWalking = true; });
    if (G.destMark && someWalking) {
      var dp = w2s(G.destMark[0], G.destMark[1]);
      var pulse = 10 + Math.sin(now / 120) * 4;
      ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(dp[0], dp[1], pulse * 1.4, pulse * 0.7, 0, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dp[0] - 8, dp[1]); ctx.lineTo(dp[0] + 8, dp[1]);
      ctx.moveTo(dp[0], dp[1] - 6); ctx.lineTo(dp[0], dp[1] + 6); ctx.stroke();
    } else if (G.destMark) { G.destMark = null; }
    /* v27 : tuteur de premier déplacement (pulsé jusqu'au 1er clic-sol) */
    if (G.tuto) {
      var tp2 = w2s(cx, cz);
      var pulse2 = 26 + Math.sin(now / 150) * 8;
      ctx.strokeStyle = '#7ddcff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(tp2[0], tp2[1], pulse2 * 1.5, pulse2 * 0.75, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(10,14,20,.85)';
      var bx2 = tp2[0] - 158, by2 = tp2[1] - 78;
      ctx.fillRect(bx2, by2, 316, 30);
      ctx.fillStyle = '#bfe8ff'; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Cliquez le sol : la troupe marche jusqu\u2019au repère', tp2[0], by2 + 21);
      ctx.textAlign = 'left';
    }
    /* v27 : nuit — la lumière tombe entre 19 h et 6 h */
    var hr = (G.time && G.time.h) || 12;
    var night = hr >= 19 || hr < 6 ? Math.min(0.42, hr >= 19 ? (hr - 19) * 0.1 + 0.18 : 0.42) : (hr >= 17 ? (hr - 17) * 0.09 : 0);
    if (night > 0.01) {
      ctx.fillStyle = 'rgba(18,24,52,' + night + ')';
      ctx.fillRect(0, 0, w, h);
    }
    /* mini-carte */
    drawMini();
  }
  function drawMini() {
    var mc = $('caMini'), mx = mc.getContext('2d');
    var S = mc.width, k = S / C.SIZE;
    mx.fillStyle = sandPal()[3];
    mx.fillRect(0, 0, S, S);
    G.W.oases.forEach(function (o) { mx.fillStyle = '#5a9a5a'; mx.fillRect(o.x * k - 2, o.z * k - 2, 4, 4); });
    G.W.ruins.forEach(function (r) { mx.fillStyle = r.looted ? '#8a7a60' : '#6a5a44'; mx.fillRect(r.x * k - 1, r.z * k - 1, 3, 3); });
    G.W.camps.forEach(function (c2) { mx.fillStyle = c2.purged ? '#8a7a68' : '#c0563c'; mx.fillRect(c2.x * k - 2, c2.z * k - 2, 4, 4); });
    G.W.towns.forEach(function (t2) {
      mx.fillStyle = C.FACTIONS[t2.fac].col;
      mx.fillRect(t2.x * k - 4, t2.z * k - 4, 8, 8);
    });
    if (camp.base) { mx.fillStyle = '#e8c04a'; mx.fillRect(camp.base.x * k - 3, camp.base.z * k - 3, 6, 6); }
    G.members.forEach(function (m) {
      mx.fillStyle = '#fff';
      mx.beginPath();
      mx.arc(m.x * k, m.z * k, 2.4, 0, 7);
      mx.fill();
    });
  }

  /* ══════════ ENTRÉES ══════════ */
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  cv.addEventListener('mousedown', function (e) {
    if (ST !== 'jeu') return;
    var rect = cv.getBoundingClientRect();
    var sx = (e.clientX - rect.left) * (cv.width / rect.width);
    var sy = (e.clientY - rect.top) * (cv.height / rect.height);
    if (e.button === 2) {
      var wz = s2w(sx, sy);
      C.cmdMove(G, G.members.map(function (m, i) { return i; }), wz[0], wz[1]);
      sfx('ui');
      return;
    }
    /* sélection : membre le plus proche du clic */
    var best = -1, bd = 20;
    G.members.forEach(function (m, i) {
      var p = w2s(m.x, m.z);
      var dd = Math.hypot(p[0] - sx, p[1] - sy);
      if (dd < bd) { bd = dd; best = i; }
    });
    if (best >= 0) { G.selected = best; sfx('ui'); updateHud(); }
    else { /* v26 : clic gauche sur le sol = tout le monde marche vers le point (fini le clic droit caché) */
      var wz2 = s2w(sx, sy);
      C.cmdMove(G, G.members.map(function (m, i) { return i; }), wz2[0], wz2[1]);
      G.destMark = wz2; /* marqueur visuel de destination */
      G.tuto = false;
      sfx('ui');
    }
  });
  d.addEventListener('keydown', function (e) {
    if (ST !== 'jeu') return;
    if (e.code === 'KeyE') { interact(); }
    else if (e.code === 'Space') { paused = !paused; sfx('ui'); e.preventDefault(); }
    else if (e.code === 'KeyT') { fast = !fast; sfx('ui'); }
    else if (e.code === 'Digit1') { G.selected = 0; updateHud(); }
    else if (e.code === 'Digit2') { G.selected = Math.min(1, G.members.length - 1); updateHud(); }
    else if (e.code === 'Digit3') { G.selected = Math.min(2, G.members.length - 1); updateHud(); }
    else if (e.code === 'KeyH') { show($('caAide'), $('caAide').style.display === 'none', 'block'); }
    else if (e.code === 'Escape') { show($('caCity'), false); show($('caBase'), false); show($('caAide'), false); }
  });

  /* boutons rapides */
  $('caEat').addEventListener('click', function () { C.cmdConsume(G, G.selected, 'pain') && sfx('ui'); updateHud(); });
  $('caMeat').addEventListener('click', function () { C.cmdConsume(G, G.selected, 'viande') && sfx('ui'); updateHud(); });
  $('caDrink').addEventListener('click', function () { C.cmdConsume(G, G.selected, 'eau') && sfx('ui'); updateHud(); });
  $('caPause').addEventListener('click', function () { paused = !paused; sfx('ui'); });
  $('caFast').addEventListener('click', function () { fast = !fast; sfx('ui'); });
  $('caMute2').addEventListener('click', function () { setMute(!AU.mute); camp.mute = AU.mute; C.saveCamp(camp); $('caMute2').textContent = AU.mute ? '🔇 Son coupé' : '🔊 Son'; });
  $('caQuit').addEventListener('click', function () { C.saveCamp(camp); toMenu(); });
  $('caQuitX').addEventListener('click', function () { C.saveCamp(camp); toMenu(); });
  $('caAideBtn').addEventListener('click', function () { show($('caAide'), true, 'block'); });
  $('caAideClose').addEventListener('click', function () { show($('caAide'), false); });
  $('caAideCloseMenu').addEventListener('click', function () { show($('caAide'), false); });
  $('caMute').addEventListener('click', function () { setMute(!AU.mute); $('caMute').textContent = AU.mute ? '🔇 Son coupé' : '🔊 Son'; });

  /* ══════════ MENU ══════════ */
  Array.prototype.forEach.call(d.querySelectorAll('[data-seed]'), function (b) {
    b.addEventListener('click', function () {
      startGame(C.newCamp(b.dataset.seed));
      sfx('ui');
    });
  });
  $('caContinue').addEventListener('click', function () {
    var c = C.loadCamp();
    if (c) { startGame(c); sfx('ui'); }
  });

  /* ══════════ BOUCLE ══════════ */
  function loop(now) {
    root.requestAnimationFrame(loop);
    var dt = Math.max(0, Math.min(0.1, (now - lastFrame) / 1000));
    lastFrame = now;
    if (ST !== 'jeu' || !G) return;
    if (!paused) C.step(G, dt * (fast ? 3 : 1));
    render(now);
    logPump();
    hudT -= dt;
    if (hudT <= 0) { hudT = 0.25; updateHud(); }
    saveT -= dt;
    if (saveT <= 0) { saveT = 8; C.saveCamp(camp); } /* autosave agressive */
  }

  /* hook de debug/test (smoke jsdom) */
  root.CARAVANES_DEBUG = { getG: function () { return G; }, getC: function () { return camp; } };

  /* boot */
  setMute(false);
  toMenu();
  root.requestAnimationFrame(function (t2) { lastFrame = t2; root.requestAnimationFrame(loop); });
})(typeof window !== 'undefined' ? window : global);
