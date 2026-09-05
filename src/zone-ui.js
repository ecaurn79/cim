/* ============================================================
   LA ZONE — interface v1 : raycaster canvas, HUD, camp, audio
   Dépend de rpg-core.js (KERNEL) + zone-engine.js. ES5, UMD.
   Rendu : buffer 480×270 upscalé pixelisé, DDA 240 rayons.
   ============================================================ */
(function (root) {
  'use strict';
  var Z = root.ZONE, K = root.RPGCORE;
  if (!Z) throw new Error('ZONE requis : chargez zone-engine.js avant zone-ui.js');

  var d = document;
  function $(id) { return d.getElementById(id); }

  /* ══════════ AUDIO PROCÉDURAL (WebAudio, zéro asset) ══════════ */
  var AU = { ctx: null, master: null, mute: false, wind: null };
  function audio() {
    if (AU.ctx) return AU.ctx;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try {
      AU.ctx = new AC();
      AU.master = AU.ctx.createGain();
      AU.master.gain.value = AU.mute ? 0 : 0.5;
      AU.master.connect(AU.ctx.destination);
    } catch (e) { AU.ctx = null; }
    return AU.ctx;
  }
  function setMute(m) {
    AU.mute = m;
    if (AU.master) AU.master.gain.value = m ? 0 : 0.5;
  }
  function beep(freq, dur, type, vol, slide) {
    var c = audio(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), c.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.12, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(AU.master);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  }
  function noiseBuf(c, dur) {
    var b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), ch = b.getChannelData(0);
    for (var i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    return b;
  }
  function noise(dur, freq, vol, q) {
    var c = audio(); if (!c) return;
    var src = c.createBufferSource(); src.buffer = noiseBuf(c, dur);
    var f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q || 0.8;
    var g = c.createGain();
    g.gain.setValueAtTime(vol || 0.3, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    src.connect(f); f.connect(g); g.connect(AU.master);
    src.start();
  }
  var SFX = {
    ui: function () { beep(660, 0.05, 'square', 0.06); },
    pickup: function () { beep(520, 0.08, 'triangle', 0.12); setTimeout(function () { beep(780, 0.1, 'triangle', 0.12); }, 70); },
    shot: function () { noise(0.14, 900, 0.5); beep(140, 0.08, 'sawtooth', 0.15, 60); },
    shotgun: function () { noise(0.3, 500, 0.65); beep(90, 0.16, 'sawtooth', 0.2, 40); },
    knife: function () { noise(0.08, 2400, 0.12, 2); },
    reload: function () { beep(320, 0.04, 'square', 0.08); setTimeout(function () { beep(240, 0.05, 'square', 0.08); }, 160); },
    empty: function () { beep(180, 0.05, 'square', 0.08); },
    geiger: function () { noise(0.012, 5000, 0.25, 0.2); },
    det: function () { beep(1180, 0.045, 'sine', 0.09); },
    growl: function () { beep(85, 0.35, 'sawtooth', 0.14, 55); },
    bite: function () { noise(0.09, 700, 0.3); },
    zap: function () { noise(0.18, 3000, 0.4, 3); beep(1900, 0.14, 'sawtooth', 0.1, 300); },
    flame: function () { noise(0.4, 400, 0.25); },
    spring: function () { beep(300, 0.2, 'sine', 0.2, 900); },
    tele: function () { beep(500, 0.3, 'sine', 0.18, 90); },
    siren: function () { beep(620, 0.9, 'sawtooth', 0.14, 1240); },
    rumble: function () { noise(1.4, 120, 0.35); },
    heal: function () { beep(440, 0.12, 'sine', 0.1); setTimeout(function () { beep(560, 0.14, 'sine', 0.1); }, 90); }
  };
  function sfx(n) { if (AU.mute) return; var f = SFX[n]; if (f) try { f(); } catch (e) { /* audio indisponible */ } }
  function windOn() {
    var c = audio(); if (!c || AU.wind) return;
    try {
      var src = c.createBufferSource(); src.buffer = noiseBuf(c, 3); src.loop = true;
      var f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 240;
      var g = c.createGain(); g.gain.value = AU.mute ? 0 : 0.05;
      src.connect(f); f.connect(g); g.connect(AU.master);
      src.start();
      AU.wind = { src: src, g: g };
    } catch (e) { /* pas grave */ }
  }
  function windOff() {
    if (!AU.wind) return;
    try { AU.wind.src.stop(); } catch (e) { }
    AU.wind = null;
  }

  /* ══════════ ÉTAT GLOBAL DE L'UI ══════════ */
  var camp = null;          /* état persistant (moteur) */
  var G = null;             /* expédition en cours (moteur) */
  var ST = 'menu';          /* menu | camp | zone */
  var campAt = 'S';
  var keys = {}, mouseLock = false, pda = false;
  var lastFrame = 0, hudT = 0, logN = 0, fxN = 0, detT = 0, geigT = 0, humT = 0, sirenT = 0, windT = 3;
  var tab = 'boutique';

  /* canvas */
  var cv = $('znCanvas'), ctx = cv.getContext('2d');
  var W = 480, H = 270, RES = 2, NR = W / RES;
  var FOV = 66 * Math.PI / 180, tanF = Math.tan(FOV / 2);
  ctx.imageSmoothingEnabled = false;
  var zbuf = new Array(NR);
  var skyGrad = ctx.createLinearGradient(0, 0, 0, H / 2);
  skyGrad.addColorStop(0, '#3d4448'); skyGrad.addColorStop(0.7, '#6d7368'); skyGrad.addColorStop(1, '#8a8a76');
  var flGrad = ctx.createLinearGradient(0, H / 2, 0, H);
  flGrad.addColorStop(0, '#101210'); flGrad.addColorStop(0.25, '#2b2e26'); flGrad.addColorStop(1, '#41453a');
  var WALLCOL = { 1: [122, 122, 114], 2: [126, 84, 60], 3: [92, 98, 104], 4: [70, 96, 74] };
  var ARTE_COL = { moelle: '#d8d8c8', braise: '#ff8a3c', cellule: '#7ecbff', oeil: '#b48cff', larmes: '#9fdc6a', eclat: '#ff6a8a', alliage: '#5aa0ff', ambre: '#ffcf5e', poussiere: '#ffe9a8', coeur: '#ff5a6e' };

  /* ══════════ OUTILS ══════════ */
  function fmtM(t) { return Math.round(t * 8); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function show(el, on) { el.style.display = on ? 'flex' : 'none'; }
  function arteStats() { return Z.arteStats(camp); }

  /* ══════════ ÉCRANS ══════════ */
  function toMenu() {
    ST = 'menu'; windOff();
    show($('znMenu'), true); show($('znCamp'), false); show($('znView'), false); show($('znDead'), false);
    var rec = Z.records();
    $('znRecords').textContent = rec
      ? 'Records — jours : ' + rec.days + ' · artefacts vendus : ' + rec.arte + ' · quêtes : ' + rec.quetes + ' · mutants : ' + rec.kills
      : 'Aucun record. La Clôture attend.';
    var hasSave = !!Z.loadCamp();
    $('znContinue').style.display = hasSave ? '' : 'none';
  }
  function toCamp(at) {
    campAt = at || campAt || 'S';
    ST = 'camp'; windOff(); pda = false;
    show($('znMenu'), false); show($('znCamp'), true); show($('znView'), false); show($('znDead'), false);
    Z.saveCamp(camp);
    renderCamp();
  }
  function toZone() {
    G = Z.startExpedition(camp, campAt);
    ST = 'zone'; logN = 0; fxN = 0; pda = false;
    show($('znMenu'), false); show($('znCamp'), false); show($('znView'), true); show($('znDead'), false);
    $('znSplash').textContent = 'JOUR ' + camp.day;
    $('znSplash').style.opacity = '1';
    setTimeout(function () { $('znSplash').style.opacity = '0'; }, 1600);
    windOn();
    logPump();
  }

  /* ══════════ CAMP (rendu du hub) ══════════ */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function renderCamp() {
    var st = arteStats();
    var hpMax = 100 + st.hpMax;
    $('znCampTitle').textContent = campAt === 'N' ? 'L\u2019Avant-poste — jour ' + camp.day : 'Le Hangar — jour ' + camp.day;
    $('znCampStats').innerHTML = 'Crédits <b>' + camp.credits + '</b> · PV <b>' + Math.round(camp.hp) + '/' + hpMax + '</b>' +
      ' · Rad <b>' + Math.round(camp.rad) + '</b> · Faim <b>' + Math.round(camp.faim) + '</b>' +
      ' · ' + (Z.COMBI[camp.suit] ? Z.COMBI[camp.suit].n : '?');
    var tabs = [['boutique', 'Boutique'], ['ceinture', 'Ceinture'], ['quetes', 'Quêtes'], ['armes', 'Arsenal']];
    var th = '';
    tabs.forEach(function (t) {
      th += '<button class="zn-tab' + (tab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
    });
    $('znTabs').innerHTML = th;
    var b = $('znTabBody'), h = '';
    if (tab === 'boutique') {
      h += '<div class="zn-grid">';
      Z.ITEM_KEYS.forEach(function (k) {
        var it = Z.ITEMS[k];
        var off = (it.minDay && camp.day < it.minDay) || camp.credits < it.price;
        h += '<button class="zn-row' + (off ? ' off' : '') + '" data-buy="' + k + '"' + (off ? ' disabled' : '') + '>' +
          '<b>' + it.n + '</b><small>' + it.price + ' cr' + (it.minDay ? ' · dès le jour ' + it.minDay : '') + '</small></button>';
      });
      h += '</div>';
      h += '<h4>Vos artefacts (poche du camp)</h4>';
      if (!camp.locker.length) h += '<p class="zn-mut">Aucun artefact. Le détecteur chante près des anomalies — prenez des risques, revendez au sec.</p>';
      camp.locker.forEach(function (key, i) {
        h += '<div class="zn-row2"><span>' + Z.arteLine(key) + '</span>' +
          '<span><button data-equip="' + i + '"' + (camp.belt.length >= 3 ? ' disabled' : '') + '>Ceinturer</button> ' +
          '<button data-sell="' + i + '">Vendre ' + Z.ARTEFACTS[key].price + ' cr</button></span></div>';
      });
    } else if (tab === 'ceinture') {
      h += '<p>La ceinture porte <b>3</b> artefacts. Bonus et malus s\u2019appliquent en permanence : préparez vos compromis ici, pas dans le feu.</p>';
      for (var s2 = 0; s2 < 3; s2++) {
        var bk = camp.belt[s2];
        h += '<div class="zn-row2"><span>' + (bk ? Z.arteLine(bk) : '<i>— libre —</i>') + '</span>' +
          (bk ? '<button data-unequip="' + s2 + '">Retirer</button>' : '') + '</div>';
      }
      h += '<h4>Synthèse portée</h4><ul class="zn-syn">';
      var LBL = { hpMax: 'PV max', speed: 'vitesse', dmgOut: 'dégâts', def: 'défense', rad: 'radiation', stamRegen: 'régén endurance', hpRegen: 'régén PV', faim: 'faim' };
      for (var kk in LBL) {
        var vv = st[kk] || 0;
        if (kk === 'hpMax') { if (vv) h += '<li>' + (vv > 0 ? '+' : '') + vv + ' ' + LBL[kk] + '</li>'; }
        else if (kk === 'def') h += '<li>défense : ' + Math.round(vv * 100) + ' %</li>';
        else if (kk === 'rad') h += '<li>radiation subie : ' + Math.round(vv * 100) + ' %</li>';
        else if (vv) h += '<li>' + LBL[kk] + ' : ' + (vv > 0 ? '+' : '') + Math.round(vv * 100) + ' %</li>';
      }
      h += '</ul>';
    } else if (tab === 'quetes') {
      Z.QUETES.forEach(function (q) {
        var stt = camp.quests[q.key];
        var act = Z.activeQuest(camp) === q.key;
        var wrongCamp = q.at && q.at !== campAt;
        h += '<div class="zn-quest' + (act ? ' act' : '') + (stt === 'faite' ? ' done' : '') + '"><b>' + q.n + '</b>' +
          '<p>' + q.d + '</p><small>' +
          (stt === 'libre' ? '<button data-qacc="' + q.key + '"' + (Z.activeQuest(camp) ? ' disabled' : '') + '>Accepter</button>' : '') +
          (stt === 'faite' ? '✔ accomplie' : '') +
          (act ? 'En cours — ' + (q.prog ? q.prog(camp) : '') + ' ' +
            '<button data-qturn="' + q.key + '"' + (wrongCamp ? ' disabled' : '') + '>Remettre</button>' +
            (wrongCamp ? ' <i>(à l\u2019Avant-poste)</i>' : '') : '') +
          '</small></div>';
      });
      h += '<p class="zn-mut">Une seule quête à la fois. L\u2019émission de fin de journée est comptée — rentrez avant la sirène.</p>';
    } else if (tab === 'armes') {
      Z.ARMES_KEYS.forEach(function (k) {
        var w = Z.ARMES[k], ws = camp.weapons[k];
        if (!ws) {
          var shopKey = k === 'pm' ? 'pm' : 'fusil';
          h += '<div class="zn-row2"><span><b>' + w.n + '</b> <small>non possédée — ' + Z.ITEMS[shopKey].price + ' cr</small></span>' +
            '<button data-buy="' + shopKey + '"' + (camp.credits < Z.ITEMS[shopKey].price ? ' disabled' : '') + '>Acheter</button></div>';
        } else {
          var cost = Z.repairCost(camp, k);
          h += '<div class="zn-row2"><span><b>' + w.n + '</b> <small>état ' + Math.round(ws.cond) + ' % · ' + (w.d || '') + '</small></span>' +
            '<span>' + (cost > 0 ? '<button data-repair="' + k + '"' + (camp.credits < cost ? ' disabled' : '') + '>Réparer (' + cost + ' cr)</button>' : '✔ neuve') + '</span></div>';
        }
      });
      Z.COMBI_KEYS.forEach(function (k) {
        var c2 = Z.COMBI[k];
        if (k === camp.suit) { h += '<div class="zn-row2"><span><b>' + c2.n + '</b> <small>portée — défense ' + Math.round(c2.def * 100) + ' % · rad ×' + c2.rad + '</small></span><span>✔</span></div>'; }
        else if (k !== 'usee') {
          var shopKey2 = k;
          h += '<div class="zn-row2"><span><b>' + c2.n + '</b> <small>défense ' + Math.round(c2.def * 100) + ' % · rad ×' + c2.rad + ' — ' + c2.price + ' cr</small></span>' +
            '<button data-buy="' + shopKey2 + '"' + ((c2.minDay && camp.day < c2.minDay) || camp.credits < c2.price ? ' disabled' : '') + '>Acheter</button></div>';
        }
      });
    }
    b.innerHTML = h;
    $('znGoBtn').textContent = campAt === 'N' ? 'Repartir de l\u2019Avant-poste →' : 'Entrer dans la Zone →';
  }

  /* délégation des clics du camp */
  $('znCamp').addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab],[data-buy],[data-sell],[data-equip],[data-unequip],[data-repair],[data-qacc],[data-qturn],#znGoBtn,#znCampMenu');
    if (!t) return;
    sfx('ui');
    if (t.id === 'znGoBtn') { toZone(); return; }
    if (t.id === 'znCampMenu') { toMenu(); return; }
    if (t.dataset.tab) { tab = t.dataset.tab; renderCamp(); return; }
    if (t.dataset.buy) { if (!Z.buy(camp, t.dataset.buy)) sfx('empty'); renderCamp(); return; }
    if (t.dataset.sell !== undefined && t.dataset.sell !== '') { var p2 = Z.sellArtefact(camp, +t.dataset.sell); sfx(p2 ? 'pickup' : 'empty'); renderCamp(); return; }
    if (t.dataset.equip !== undefined && t.dataset.equip !== '') { Z.equipBelt(camp, +t.dataset.equip); sfx('ui'); renderCamp(); return; }
    if (t.dataset.unequip !== undefined && t.dataset.unequip !== '') { Z.unequipBelt(camp, +t.dataset.unequip); sfx('ui'); renderCamp(); return; }
    if (t.dataset.repair) { Z.repair(camp, t.dataset.repair) ? sfx('reload') : sfx('empty'); renderCamp(); return; }
    if (t.dataset.qacc) { Z.startQuest(camp, t.dataset.qacc); renderCamp(); return; }
    if (t.dataset.qturn) {
      var r = Z.turnIn(camp, campAt);
      if (r && r.ok) { sfx('pickup'); $('znCampFlash').textContent = 'Quête rendue : +' + r.rw.credits + ' crédits.'; }
      else { sfx('empty'); $('znCampFlash').textContent = r && r.note ? r.note : 'Conditions non réunies.'; }
      renderCamp(); return;
    }
  });

  /* ══════════ ZONE : ENTRÉES ══════════ */
  d.addEventListener('keydown', function (e) {
    keys[e.code] = true;
    if (ST !== 'zone') return;
    if (e.code === 'KeyE') { action(); }
    else if (e.code === 'KeyR') { if (Z.cmdReload(G)) sfx('reload'); }
    else if (e.code === 'KeyF') { Z.cmdBolt(G); sfx('knife'); }
    else if (e.code === 'Digit1') { Z.cmdWeapon(G, 'couteau') && sfx('ui'); }
    else if (e.code === 'Digit2') { Z.cmdWeapon(G, 'pm') && sfx('ui'); }
    else if (e.code === 'Digit3') { Z.cmdWeapon(G, 'fusil') && sfx('ui'); }
    else if (e.code === 'KeyM' || e.code === 'Tab') { pda = !pda; sfx('ui'); e.preventDefault(); }
    else if (e.code === 'KeyH') { show($('znAide'), $('znAide').style.display === 'none'); }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].indexOf(e.code) >= 0) e.preventDefault();
  });
  d.addEventListener('keyup', function (e) { keys[e.code] = false; });
  cv.addEventListener('mousedown', function (e) {
    if (ST !== 'zone') return;
    if (e.button === 2) { Z.cmdBolt(G); sfx('knife'); return; }
    if (cv.requestPointerLock && d.pointerLockElement !== cv) { try { cv.requestPointerLock(); } catch (er) { } }
    Z.cmdFire(G);
    playShotSfx();
  });
  d.addEventListener('mouseup', function () { });
  d.addEventListener('contextmenu', function (e) { if (e.target === cv) e.preventDefault(); });
  d.addEventListener('pointerlockchange', function () { mouseLock = d.pointerLockElement === cv; });
  d.addEventListener('mousemove', function (e) {
    if (ST === 'zone' && mouseLock && G) Z.cmdTurn(G, e.movementX * 0.0032);
  });
  function playShotSfx() {
    var wp = Z.ARMES[camp.cur];
    if (!wp) return;
    sfx(wp.melee ? 'knife' : (wp.pellets ? 'shotgun' : 'shot'));
  }
  function action() {
    var r = Z.cmdInteract(G);
    if (r.t === 'camp') {
      var ok = true;
      if (G.over === 'dead') ok = false;
      if (ok) {
        Z.finishRun(G, true);
        sfx('pickup');
        toCamp(r.at);
      }
    } else if (r.t === 'arte' || r.t === 'stash') { sfx('pickup'); }
    else if (r.t === 'epave') { sfx('det'); }
  }

  /* ══════════ ZONE : HUD DOM ══════════ */
  function logPump() {
    var lg = $('znLog');
    while (logN < G.msgs.length) {
      var m = G.msgs[logN++];
      var t = Math.floor(m.at / 60) + ':' + ('0' + Math.floor(m.at % 60)).slice(-2);
      var div = d.createElement('div');
      div.textContent = '[' + t + '] ' + m.txt;
      lg.insertBefore(div, lg.firstChild);
    }
    while (lg.children.length > 8) lg.removeChild(lg.lastChild);
  }
  function bar(el, v, max, col) {
    var p = clamp(v / max, 0, 1) * 100;
    el.firstElementChild.style.width = p + '%';
    el.firstElementChild.style.background = col;
  }
  function updateHud() {
    var st = arteStats(), hpMax = 100 + st.hpMax;
    bar($('znBarHp'), camp.hp, hpMax, camp.hp < hpMax * 0.3 ? '#c0392b' : '#27ae60');
    bar($('znBarRad'), camp.rad, 100, camp.rad > 60 ? '#c0392b' : '#58d68d');
    bar($('znBarFaim'), camp.faim, 100, '#e67e22');
    bar($('znBarSt'), G.p.st, 100, '#f1c40f');
    var wp = Z.ARMES[camp.cur], ws = camp.weapons[camp.cur];
    $('znArme').innerHTML = '<b>' + wp.n + '</b>' + (wp.melee ? ' · silencieux' :
      ' · ' + (G.ch[camp.cur] || 0) + '/' + wp.mag + ' <small>(' + (camp.inv[wp.ammo] || 0) + ' en réserve)</small>') +
      ' <small>état ' + Math.round(ws.cond) + ' %</small>';
    var bh = '';
    for (var i = 0; i < 3; i++) {
      var bk = camp.belt[i];
      bh += '<span class="zn-slot" style="border-color:' + (bk ? ARTE_COL[bk] || '#888' : '#333') + '">' + (bk ? Z.ARTEFACTS[bk].n : '—') + '</span>';
    }
    $('znCeinture').innerHTML = bh;
    var aq = Z.activeQuest(camp), qt = '';
    if (aq) {
      var q = Z.QUETES.filter(function (x) { return x.key === aq; })[0];
      qt = '<b>' + q.n + '</b><br>' + (q.prog ? q.prog(camp) : q.d);
    } else qt = '<i>Aucune quête — acceptez-en une au camp.</i>';
    $('znQuete').innerHTML = qt;
    $('znPoche').textContent = 'Poches : ' + G.bag.length + '/4 · Mutants abattus (sortie) : ' + G.stats.kills;
    ['bandage', 'antirad', 'conserve', 'saucisse'].forEach(function (k) {
      var btn = $('znUse_' + k);
      btn.textContent = Z.ITEMS[k].n + ' ×' + (camp.inv[k] || 0);
      btn.disabled = !(camp.inv[k] > 0);
    });
  }

  /* prompt d'interaction (copie légère des priorités du moteur) */
  function promptFor() {
    var W2 = G.W, p = G.p, i;
    var best = null, bd = 0.5;
    for (i = 0; i < W2.arte.length; i++) {
      var a = W2.arte[i];
      if (a.taken) continue;
      var dd = Math.sqrt((a.x - p.x) * (a.x - p.x) + (a.y - p.y) * (a.y - p.y));
      if (dd < bd) { best = Z.ARTEFACTS[a.key].n + ' — [E] ramasser'; bd = dd; }
    }
    for (i = 0; i < W2.stash.length; i++) {
      var s = W2.stash[i];
      if (s.opened) continue;
      var dd2 = Math.sqrt((s.x - p.x) * (s.x - p.x) + (s.y - p.y) * (s.y - p.y));
      if (dd2 < bd) { best = 'Cache — [E] fouiller'; bd = dd2; }
    }
    var camps = [W2.campS, W2.campN];
    for (i = 0; i < 2; i++) {
      var c2 = camps[i];
      var dd3 = Math.sqrt((c2.x - p.x) * (c2.x - p.x) + (c2.y - p.y) * (c2.y - p.y));
      if (dd3 < c2.r * 0.7) return 'Entrer : ' + c2.n + ' — [E] (fin de journée)';
    }
    var ep = W2.epave;
    var dd4 = Math.sqrt((ep.x - p.x) * (ep.x - p.x) + (ep.y - p.y) * (ep.y - p.y));
    if (dd4 < 1.5 && !camp.flags.epaveVu) return 'L\u2019épave du convoi — [E] inspecter';
    return best || '';
  }

  /* ══════════ RENDU RAYCAST ══════════ */
  function renderZone(now) {
    var p = G.p, W2 = G.W;
    var psyW = G.psy > 0 ? Math.sin(now * 0.013) * 3 * G.psy : 0;
    var shX = G.shake > 0 ? (Math.random() * 6 - 3) * G.shake : 0;
    var shY = G.shake > 0 ? (Math.random() * 4 - 2) * G.shake : 0;
    ctx.save();
    ctx.translate(shX + psyW, shY);
    /* ciel + sol */
    ctx.fillStyle = skyGrad; ctx.fillRect(-4, -4, W + 8, H / 2 + 4);
    ctx.fillStyle = flGrad; ctx.fillRect(-4, H / 2, W + 8, H / 2 + 4);
    /* redout : ciel qui vire */
    if (G.redout.phase === 'alerte' || G.redout.phase === 'plein') {
      ctx.fillStyle = 'rgba(120,20,60,' + (G.redout.phase === 'plein' ? 0.35 : 0.18) + ')';
      ctx.fillRect(-4, -4, W + 8, H + 8);
    }
    /* murs */
    var dark = G.redout.phase === 'plein' ? 0.45 : 1;
    for (var c = 0; c < NR; c++) {
      var rel = ((c * RES) / W * 2 - 1) * tanF;
      var ang = p.a + Math.atan(rel);
      var hit = Z.castRay(W2.grid, p.x, p.y, ang, 40);
      var perp = Math.max(0.05, hit.d * Math.cos(ang - p.a));
      zbuf[c] = perp;
      var h = Math.min(H * 2.4, H / perp);
      var y0 = H / 2 - h / 2;
      var base = WALLCOL[hit.wall] || WALLCOL[1];
      var fog = clamp(perp / 34, 0, 0.95) * dark + (1 - dark);
      var lit = hit.side === 0 ? 1 : 0.68;
      var band = (hit.wx * 7) % 1 < 0.12 ? 0.82 : 1; /* joints sombres */
      var r2 = (base[0] * lit * band) * (1 - fog) + 22 * fog;
      var g2 = (base[1] * lit * band) * (1 - fog) + 24 * fog;
      var b2 = (base[2] * lit * band) * (1 - fog) + 22 * fog;
      ctx.fillStyle = 'rgb(' + (r2 | 0) + ',' + (g2 | 0) + ',' + (b2 | 0) + ')';
      ctx.fillRect(c * RES, y0, RES, h);
    }
    /* sprites triés */
    var sprites = collectSprites();
    sprites.sort(function (a, b) { return b.t - a.t; });
    for (var si = 0; si < sprites.length; si++) drawSprite(sprites[si], now);
    /* arme en vue subjective */
    drawWeapon(now);
    ctx.restore();
    /* vignettes */
    if (G.dmg > 0.02) {
      var vg = ctx.createRadialGradient(W / 2, H / 2, H / 3, W / 2, H / 2, H * 0.75);
      vg.addColorStop(0, 'rgba(120,0,0,0)'); vg.addColorStop(1, 'rgba(120,0,0,' + clamp(G.dmg, 0, 0.75) + ')');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    if (G.radRate > 0.05) {
      ctx.fillStyle = 'rgba(80,180,80,' + clamp(G.radRate * 0.22, 0, 0.3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (G.psy > 0.05) {
      ctx.fillStyle = 'rgba(200,60,120,' + clamp(G.psy * 0.12, 0, 0.25) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    /* viseur */
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
    ctx.strokeRect(W / 2 - 1.5, H / 2 - 1.5, 3, 3);
    if (pda) renderPda();
  }

  function collectSprites() {
    var p = G.p, W2 = G.W, out = [], i;
    var dirX = Math.cos(p.a), dirY = Math.sin(p.a);
    function push(o, kind, hw, opt) {
      var rx = o.x - p.x, ry = o.y - p.y;
      var t = rx * dirX + ry * dirY;
      if (t < 0.25) return;
      var lat = -rx * dirY + ry * dirX;
      var relAng = Math.atan2(lat, t);
      if (Math.abs(relAng) > FOV / 2 + 0.15) return;
      var col = clamp(Math.round(W / 2 * (1 + Math.tan(relAng) / tanF)) / RES, 0, NR - 1);
      var zb = zbuf[col] || 99;
      if (zb < t - 0.3) return; /* mur devant */
      out.push({ kind: kind, o: o, t: t, sx: W / 2 * (1 + Math.tan(relAng) / tanF), hw: hw, opt: opt || {} });
    }
    for (i = 0; i < W2.anom.length; i++) { var an = W2.anom[i]; push(an, 'anom', 0.9, { an: an }); }
    for (i = 0; i < W2.arte.length; i++) { var ar = W2.arte[i]; if (!ar.taken) push(ar, 'arte', 0.3); }
    for (i = 0; i < W2.muts.length; i++) { var mu = W2.muts[i]; if (mu.hp > 0) push(mu, 'mut', 0.7); else if (!mu.gone) push(mu, 'corpse', 0.3); }
    for (i = 0; i < W2.stash.length; i++) push(W2.stash[i], 'stash', 0.55);
    for (i = 0; i < W2.props.length; i++) push(W2.props[i], W2.props[i].k, W2.props[i].k === 'epave' ? 1.1 : 1.4);
    push(W2.campS, 'flag', 1.2, { col: '#ff9a3c' });
    push(W2.campN, 'flag', 1.2, { col: '#7ecbff' });
    for (i = 0; i < G.bolts.length; i++) push(G.bolts[i], 'bolt', 0.12);
    return out;
  }

  function drawSprite(sp, now) {
    var t = sp.t, s = H / t; /* px par unité de monde */
    var bottom = H / 2 + (0.5 * H) / t;
    var sx = sp.sx;
    if (sx < -40 || sx > W + 40) return;
    var o = sp.o, k = sp.kind;
    ctx.save();
    if (k === 'anom') {
      var an = sp.opt.an, A = Z.ANOMALIES[an.type];
      var pul = 0.5 + 0.5 * Math.sin(now * 0.004 + an.ph * 6);
      var fade = an.type === 'tremplin' && !(an.rev > G.time) ? 0.1 : 0.75;
      ctx.globalAlpha = fade;
      ctx.globalCompositeOperation = 'lighter';
      if (an.type === 'vortex') {
        for (var vi = 0; vi < 3; vi++) {
          ctx.strokeStyle = A.col; ctx.lineWidth = Math.max(1, s * 0.03);
          ctx.beginPath();
          ctx.arc(sx, bottom - s * 0.3, s * (0.12 + vi * 0.1) * (0.8 + 0.2 * pul), now * 0.003 + vi, now * 0.003 + vi + 4);
          ctx.stroke();
        }
      } else if (an.type === 'electra') {
        ctx.strokeStyle = A.col; ctx.lineWidth = Math.max(1, s * 0.04);
        var zig = 5 + Math.floor(pul * 3);
        ctx.beginPath();
        var zx = sx, zy = bottom - s * 0.55;
        ctx.moveTo(zx, zy);
        for (var zi = 0; zi < zig; zi++) { zx += (Math.random() - 0.5) * s * 0.16; zy += s * 0.09; ctx.lineTo(zx, zy); }
        ctx.stroke();
      } else if (an.type === 'torche') {
        if (an.hot) {
          var fh = s * (0.5 + 0.2 * Math.random());
          var gr = ctx.createLinearGradient(sx, bottom - s * 0.7, sx, bottom);
          gr.addColorStop(0, 'rgba(255,220,120,0)'); gr.addColorStop(1, A.col);
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.moveTo(sx - s * 0.18, bottom); ctx.quadraticCurveTo(sx, bottom - fh, sx + s * 0.18, bottom);
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(255,138,60,0.25)';
          ctx.beginPath(); ctx.arc(sx, bottom - s * 0.15, s * 0.12 * (0.6 + pul * 0.4), 0, 7); ctx.fill();
        }
      } else if (an.type === 'brume') {
        ctx.fillStyle = 'rgba(159,220,106,0.16)';
        for (var bi = 0; bi < 3; bi++) {
          ctx.beginPath();
          ctx.arc(sx + Math.sin(now * 0.001 + bi * 2) * s * 0.15, bottom - s * (0.1 + bi * 0.12), s * (0.2 + bi * 0.06), 0, 7);
          ctx.fill();
        }
      } else if (an.type === 'bourdon') {
        ctx.strokeStyle = A.col;
        for (var ri = 0; ri < 3; ri++) {
          ctx.globalAlpha = fade * (0.7 - ri * 0.2) * (0.5 + 0.5 * pul);
          ctx.lineWidth = Math.max(1, s * 0.02);
          ctx.beginPath(); ctx.arc(sx, bottom - s * 0.35, s * (0.1 + ri * 0.09 + pul * 0.04), 0, 7); ctx.stroke();
        }
      } else { /* tremplin révélé : scintillement */
        ctx.strokeStyle = A.col; ctx.lineWidth = Math.max(1, s * 0.03);
        ctx.globalAlpha = 0.5 * pul;
        ctx.beginPath(); ctx.ellipse(sx, bottom - s * 0.08, s * 0.25, s * 0.08, 0, 0, 7); ctx.stroke();
      }
    } else if (k === 'arte') {
      var col2 = ARTE_COL[o.key] || '#fff';
      var fl = Math.sin(now * 0.005 + o.x) * s * 0.04;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = col2;
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(now * 0.006 + o.y);
      ctx.beginPath(); ctx.arc(sx, bottom - s * 0.22 + fl, s * 0.14, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.translate(sx, bottom - s * 0.22 + fl);
      ctx.rotate(now * 0.002);
      ctx.fillRect(-s * 0.05, -s * 0.05, s * 0.1, s * 0.1);
    } else if (k === 'mut') {
      var M = Z.MUTANTS[o.type];
      var col3 = o.type === 'chien' ? '#4a3f33' : (o.type === 'aveugle' ? '#8a8078' : '#3a3230');
      var hgt = o.type === 'chien' ? 0.32 : (o.type === 'aveugle' ? 0.62 : 0.85);
      var wdt = o.type === 'chien' ? 0.5 : 0.3;
      ctx.fillStyle = col3;
      if (o.type === 'chien') {
        ctx.fillRect(sx - s * wdt / 2, bottom - s * hgt, s * wdt, s * hgt * 0.6);
        ctx.fillRect(sx + s * wdt * 0.3, bottom - s * hgt * 0.95, s * 0.14, s * 0.14); /* tête */
        ctx.fillRect(sx - s * wdt / 2, bottom - s * hgt * 0.4, s * 0.06, s * hgt * 0.4);
        ctx.fillRect(sx + s * wdt * 0.3, bottom - s * hgt * 0.4, s * 0.06, s * hgt * 0.4);
      } else {
        ctx.fillRect(sx - s * wdt / 2, bottom - s * hgt, s * wdt, s * hgt);
        ctx.fillStyle = o.type === 'aveugle' ? '#a89c92' : '#2a2422';
        ctx.beginPath(); ctx.arc(sx, bottom - s * hgt - s * 0.07, s * 0.09, 0, 7); ctx.fill();
        /* bras / tentacules */
        ctx.strokeStyle = col3; ctx.lineWidth = Math.max(1, s * 0.04);
        ctx.beginPath();
        ctx.moveTo(sx - s * 0.12, bottom - s * hgt * 0.7);
        ctx.lineTo(sx - s * 0.2, bottom - s * 0.1);
        ctx.moveTo(sx + s * 0.12, bottom - s * hgt * 0.7);
        ctx.lineTo(sx + s * 0.2, bottom - s * 0.1);
        ctx.stroke();
      }
      /* barre de vie */
      if (o.hp < M.hp) {
        ctx.fillStyle = '#300'; ctx.fillRect(sx - s * 0.2, bottom - s * hgt - s * 0.2, s * 0.4, s * 0.035);
        ctx.fillStyle = '#c0392b'; ctx.fillRect(sx - s * 0.2, bottom - s * hgt - s * 0.2, s * 0.4 * clamp(o.hp / M.hp, 0, 1), s * 0.035);
      }
    } else if (k === 'corpse') {
      ctx.fillStyle = 'rgba(40,34,30,0.8)';
      ctx.beginPath(); ctx.ellipse(sx, bottom - s * 0.03, s * 0.28, s * 0.07, 0, 0, 7); ctx.fill();
    } else if (k === 'stash') {
      ctx.fillStyle = o.opened ? '#4a4038' : '#6a5638';
      ctx.fillRect(sx - s * 0.2, bottom - s * 0.3, s * 0.4, s * 0.3);
      ctx.strokeStyle = '#2c241c'; ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.strokeRect(sx - s * 0.2, bottom - s * 0.3, s * 0.4, s * 0.3);
      if (!o.opened) { ctx.fillStyle = '#c9a04a'; ctx.fillRect(sx - s * 0.04, bottom - s * 0.18, s * 0.08, s * 0.07); }
    } else if (k === 'arbre') {
      ctx.strokeStyle = '#1c1e1a'; ctx.lineWidth = Math.max(1.5, s * 0.06);
      ctx.beginPath();
      ctx.moveTo(sx, bottom); ctx.lineTo(sx, bottom - s * 0.8);
      ctx.moveTo(sx, bottom - s * 0.55); ctx.lineTo(sx - s * 0.22, bottom - s * 0.85);
      ctx.moveTo(sx, bottom - s * 0.45); ctx.lineTo(sx + s * 0.2, bottom - s * 0.75);
      ctx.stroke();
    } else if (k === 'epave') {
      ctx.fillStyle = '#5a4636';
      ctx.fillRect(sx - s * 0.5, bottom - s * 0.45, s * 1.0, s * 0.35);
      ctx.fillStyle = '#6e543c';
      ctx.fillRect(sx - s * 0.25, bottom - s * 0.68, s * 0.5, s * 0.25);
      ctx.fillStyle = '#2a2622';
      ctx.beginPath(); ctx.arc(sx - s * 0.3, bottom - s * 0.06, s * 0.09, 0, 7); ctx.arc(sx + s * 0.3, bottom - s * 0.06, s * 0.09, 0, 7); ctx.fill();
      ctx.strokeStyle = '#7a5c40'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx - s * 0.5, bottom - s * 0.3); ctx.lineTo(sx + s * 0.5, bottom - s * 0.38); ctx.stroke();
    } else if (k === 'flag') {
      ctx.strokeStyle = '#777'; ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.beginPath(); ctx.moveTo(sx, bottom); ctx.lineTo(sx, bottom - s * 0.9); ctx.stroke();
      ctx.fillStyle = sp.opt.col;
      ctx.beginPath(); ctx.moveTo(sx, bottom - s * 0.9);
      ctx.lineTo(sx + s * 0.3 * (0.7 + 0.3 * Math.sin(now * 0.004 + o.x)), bottom - s * 0.82);
      ctx.lineTo(sx, bottom - s * 0.74); ctx.fill();
    } else if (k === 'bolt') {
      var bz = clamp(o.z, 0, 1);
      ctx.fillStyle = '#c8b890';
      ctx.fillRect(sx - 1, bottom - s * (0.05 + bz * 0.5), 3, 2);
    }
    ctx.restore();
  }

  function drawWeapon(now) {
    var wp = Z.ARMES[camp.cur];
    var bobX = Math.sin(G.p.bob) * 5, bobY = Math.abs(Math.cos(G.p.bob)) * 4;
    var rel = G.reloading > 0 ? 26 : 0;
    var cx = W / 2 + bobX, cy = H - 6 + bobY + rel;
    ctx.save();
    /* mains */
    ctx.fillStyle = '#7a6a52';
    ctx.fillRect(cx - 26, cy - 34, 16, 26);
    ctx.fillRect(cx + 12, cy - 40, 16, 26);
    if (camp.cur === 'couteau') {
      var sw = G.flash > 0 ? -0.9 : 0;
      ctx.translate(cx + 4, cy - 30); ctx.rotate(sw);
      ctx.fillStyle = '#5a5248'; ctx.fillRect(-4, -12, 8, 16);
      ctx.fillStyle = '#b8bcc0';
      ctx.beginPath(); ctx.moveTo(-3, -12); ctx.lineTo(0, -44); ctx.lineTo(3, -12); ctx.fill();
    } else if (camp.cur === 'pm') {
      ctx.fillStyle = '#3c3e40';
      ctx.fillRect(cx - 8, cy - 52, 14, 30);
      ctx.fillRect(cx - 5, cy - 62, 8, 12);
      ctx.fillStyle = '#2a2c2e'; ctx.fillRect(cx - 4, cy - 30, 8, 10);
    } else {
      ctx.fillStyle = '#4a3a28';
      ctx.fillRect(cx - 10, cy - 66, 18, 44);
      ctx.fillStyle = '#6a5438'; ctx.fillRect(cx - 14, cy - 58, 10, 14);
      ctx.fillStyle = '#2a2c2e'; ctx.fillRect(cx - 6, cy - 78, 10, 14);
    }
    if (G.flash > 0 && camp.cur !== 'couteau') {
      ctx.fillStyle = 'rgba(255,220,120,' + clamp(G.flash * 10, 0, 0.9) + ')';
      ctx.beginPath(); ctx.arc(cx, cy - 78, 10 + Math.random() * 6, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  /* ══════════ PDA ══════════ */
  function renderPda() {
    var W2 = G.W, p = G.p, TS = 3, half = 32;
    ctx.fillStyle = 'rgba(8,12,8,0.88)';
    ctx.fillRect(W / 2 - half * TS - 8, 12, half * 2 * TS + 16, half * 2 * TS + 34);
    var ox = W / 2 - p.x * TS, oy = 16 + half * TS - p.y * TS;
    var q = Z.activeQuest(camp);
    for (var y2 = 0; y2 < Z.MAP; y2++) for (var x2 = 0; x2 < Z.MAP; x2++) {
      if (!G.explored[y2 * Z.MAP + x2]) continue;
      ctx.fillStyle = W2.grid[y2][x2] ? '#5a6158' : '#141814';
      ctx.fillRect(ox + x2 * TS, oy + y2 * TS, TS, TS);
    }
    /* anomalies repérées (case explorée) */
    for (var i = 0; i < W2.anom.length; i++) {
      var an = W2.anom[i];
      if (!G.explored[(an.y | 0) * Z.MAP + (an.x | 0)]) continue;
      ctx.fillStyle = Z.ANOMALIES[an.type].col;
      ctx.fillRect(ox + an.x * TS - 1, oy + an.y * TS - 1, 3, 3);
    }
    for (i = 0; i < W2.stash.length; i++) {
      var s2 = W2.stash[i];
      if (!G.explored[(s2.y | 0) * Z.MAP + (s2.x | 0)]) continue;
      ctx.fillStyle = s2.opened ? '#666' : '#c9a04a';
      ctx.fillRect(ox + s2.x * TS - 1, oy + s2.y * TS - 1, 3, 3);
    }
    [[W2.campS, '#ff9a3c'], [W2.campN, '#7ecbff']].forEach(function (fc) {
      ctx.fillStyle = fc[1];
      ctx.fillRect(ox + fc[0].x * TS - 2, oy + fc[0].y * TS - 2, 5, 5);
    });
    if (q === 'epave') {
      ctx.fillStyle = '#ffe9a8';
      ctx.fillRect(ox + W2.epave.x * TS - 2, oy + W2.epave.y * TS - 2, 5, 5);
    }
    if (q === 'coeur') {
      ctx.strokeStyle = '#ff5a6e'; ctx.lineWidth = 1;
      ctx.strokeRect(ox + 30 * TS, oy + 30 * TS, 4 * TS, 4 * TS);
    }
    /* joueur */
    ctx.save();
    ctx.translate(ox + p.x * TS, oy + p.y * TS);
    ctx.rotate(p.a);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-3, -3); ctx.lineTo(-3, 3); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#9fb89a';
    ctx.font = '9px monospace';
    ctx.fillText('PDA — blanc : vous · losanges : anomalies · carrés or : caches', W / 2 - half * TS, 16 + half * 2 * TS + 28);
  }

  /* ══════════ BOUCLE ══════════ */
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = clamp((now - lastFrame) / 1000, 0, 0.05);
    lastFrame = now;
    if (ST !== 'zone' || !G) return;
    if (!G.over) {
      var fwd = (keys.KeyW || keys.KeyZ || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      var strafe = (keys.KeyD ? 1 : 0) - (keys.KeyA || keys.KeyQ ? 1 : 0);
      var turn = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
      if (turn) Z.cmdTurn(G, turn * 2.4 * dt);
      Z.cmdMove(G, fwd, strafe, dt, keys.ShiftLeft || keys.ShiftRight);
      Z.step(G, dt);
      /* tir maintenu */
      if (mouseLock && d.pointerLockElement === cv && (now - (loop._lastFire || 0)) > Z.ARMES[camp.cur].rate * 1000) {
        loop._lastFire = now;
        if (Z.cmdFire(G)) playShotSfx();
      }
    }
    /* audio ambiant piloté par les données du moteur */
    audioTick(dt, now);
    /* fx → sons */
    while (fxN < G.fx.length) {
      var f = G.fx[fxN++];
      if (f.t === 'zap' || f.t === 'spring' || f.t === 'tele') sfx(f.t);
      else if (f.t === 'bite') sfx('bite');
      else if (f.t === 'growl') sfx('growl');
    }
    renderZone(now);
    logPump();
    hudT -= dt;
    if (hudT <= 0) { hudT = 0.12; updateHud(); $('znPrompt').textContent = promptFor(); }
    if (G.over === 'dead' && $('znDead').style.display === 'none') {
      show($('znDead'), true);
      $('znDeadStats').innerHTML = 'Jour ' + camp.day + ' — la Zone vous a repris.<br>' +
        'Artefacts perdus : <b>' + G.bag.length + '</b> · Crédits −30 % · Vous vous réveillez au Hangar.';
    }
  }

  function audioTick(dt, now) {
    if (AU.mute) return;
    /* geiger cliquette selon la radiation reçue */
    if (G.radRate > 0.03) {
      geigT -= dt * (2 + G.radRate * 26);
      if (geigT <= 0) { geigT = 1; sfx('geiger'); }
    }
    /* détecteur : bips plus rapides près d'un artefact */
    var nd = 1e9, i;
    for (i = 0; i < G.W.arte.length; i++) {
      var a = G.W.arte[i];
      if (a.taken) continue;
      var dd = Math.sqrt((a.x - G.p.x) * (a.x - G.p.x) + (a.y - G.p.y) * (a.y - G.p.y));
      if (dd < nd) nd = dd;
    }
    if (nd < 3.4) {
      detT -= dt;
      if (detT <= 0) { detT = clamp(nd / 3.4, 0.1, 1.1); sfx('det'); }
    }
    /* bourdonnement des anomalies proches */
    humT -= dt;
    if (humT <= 0) {
      humT = 2.2;
      for (i = 0; i < G.W.anom.length; i++) {
        var an = G.W.anom[i];
        var d2 = Math.sqrt((an.x - G.p.x) * (an.x - G.p.x) + (an.y - G.p.y) * (an.y - G.p.y));
        if (d2 < 1.6) { sfx(an.type === 'electra' ? 'zap' : (an.type === 'torche' ? 'flame' : 'tele')); break; }
      }
    }
    /* sirène de redout */
    if (G.redout.phase === 'alerte') {
      sirenT -= dt;
      if (sirenT <= 0) { sirenT = 2.8; sfx('siren'); }
    } else if (G.redout.phase === 'plein') {
      windT -= dt;
      if (windT <= 0) { windT = 1.6; sfx('rumble'); }
    }
  }

  /* boutons rapides (soins / rad / faim) */
  ['bandage', 'antirad', 'conserve', 'saucisse'].forEach(function (k) {
    $('znUse_' + k).addEventListener('click', function () {
      if (Z.cmdUse(G, k)) { sfx(k === 'antirad' ? 'heal' : 'heal'); updateHud(); }
      else sfx('empty');
    });
  });
  $('znMute2').addEventListener('click', function () {
    setMute(!AU.mute); camp.mute = AU.mute; Z.saveCamp(camp);
    $('znMute2').textContent = AU.mute ? '🔇 Son coupé' : '🔊 Son';
  });
  $('znQuit').addEventListener('click', function () {
    /* abandon : extraction forcée au camp d'origine, la journée est finie */
    Z.finishRun(G, true);
    toCamp(G.atCamp);
  });
  $('znDeadBtn').addEventListener('click', function () {
    Z.finishRun(G, false);
    sfx('ui');
    campAt = 'S';
    toCamp('S');
  });
  $('znDeadMenu').addEventListener('click', function () { Z.finishRun(G, false); toMenu(); });

  /* ══════════ MENU ══════════ */
  $('znNew').addEventListener('click', function () {
    camp = Z.newCamp();
    AU.mute = !!camp.mute;
    campAt = 'S';
    sfx('ui');
    toCamp('S');
  });
  $('znContinue').addEventListener('click', function () {
    camp = Z.loadCamp();
    if (!camp) return;
    AU.mute = !!camp.mute;
    campAt = 'S';
    sfx('ui');
    toCamp('S');
  });
  $('znAideBtn').addEventListener('click', function () { show($('znAide'), true); });
  $('znAideClose').addEventListener('click', function () { show($('znAide'), false); });
  $('znMute').addEventListener('click', function () {
    setMute(!AU.mute);
    if (camp) { camp.mute = AU.mute; Z.saveCamp(camp); }
    $('znMute').textContent = AU.mute ? '🔇 Son coupé' : '🔊 Son';
  });

  /* boot */
  setMute(false);
  toMenu();
  requestAnimationFrame(function (t) { lastFrame = t; requestAnimationFrame(loop); });
})(typeof window !== 'undefined' ? window : global);
