/* ═══════════════════════════════════════════════════════════════
   Échecs IA — interface du Hub C.I.M.
   Plateau animé (2D / 3D), glisser-déposer, annulation de coup,
   indices, 8 niveaux, barre d'évaluation, « réflexion » de l'IA.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var ChessLib = window.Chess;
  if (ChessLib && ChessLib.Chess) ChessLib = ChessLib.Chess; /* UMD namespace → classe */
  var SEARCH = window.ECH_AI.makeSearch(ChessLib);
  var PIECES = window.ECH_PIECES;

  var LEVELS = [
    { nom: 'Découverte',    desc: 'il découvre le jeu, au hasard',            cfg: { random: true } },
    { nom: 'Débutant',      desc: 'il ne voit qu\u2019un coup devant',        cfg: { maxDepth: 1, timeMs: 400, noise: 120 } },
    { nom: 'Amateur',       desc: 'deux coups devant, et des fautes',         cfg: { maxDepth: 2, timeMs: 700, noise: 70, blunder: 0.3 } },
    { nom: 'Club',          desc: 'deux coups, quelques oublis',              cfg: { maxDepth: 2, timeMs: 900, noise: 25, blunder: 0.12 } },
    { nom: 'Confirmé',      desc: 'trois coups devant',                       cfg: { maxDepth: 3, timeMs: 1200 } },
    { nom: 'Expert',        desc: 'trois coups, gains sécurisés',             cfg: { maxDepth: 3, timeMs: 1800 } },
    { nom: 'Maître',        desc: 'quatre coups devant',                      cfg: { maxDepth: 4, timeMs: 2400 } },
    { nom: 'Grand Maître',  desc: 'le maximum en ~3 secondes',                cfg: { maxDepth: 6, timeMs: 3000 } }
  ];

  /* ── Raccourcis DOM ── */
  function $(id) { return document.getElementById(id); }
  var wrap = $('echWrap'), sqLayer = $('echSquares'), pcLayer = $('echPieces'),
      arLayer = $('echArrows'), statusEl = $('echStatus'), thinkEl = $('echThink'),
      evalFill = $('echEvalFill'), evalNum = $('echEvalNum'), listEl = $('echMoves'),
      topEl = $('echTop'), lvlSel = $('echLevel'), banner = $('echBanner'),
      capTop = $('echCapTop'), capBot = $('echCapBot'), lblTop = $('echLblTop'), lblBot = $('echLblBot');

  var game = new ChessLib(), humanColor = 'w', flipped = false, level = 4,
      busy = false, over = false, pieceEls = {}, sqEls = {}, lastMove = null,
      sel = null, audioCtx = null, muted = false;

  /* ── Utilitaires coordonnées ── */
  function sqFile(s) { return s.charCodeAt(0) - 97; }
  function sqRank(s) { return s.charCodeAt(1) - 49; }
  function xy(s) { /* position visuelle (x, y) selon l'orientation */
    var f = sqFile(s), r = sqRank(s);
    return flipped ? { x: 7 - f, y: r } : { x: f, y: 7 - r };
  }
  function sqAt(vx, vy) {
    if (vx < 0 || vx > 7 || vy < 0 || vy > 7) return null;
    return flipped
      ? String.fromCharCode(97 + (7 - vx)) + (vy + 1)
      : String.fromCharCode(97 + vx) + (8 - vy);
  }
  function center(s) { var p = xy(s); return { x: p.x + 0.5, y: p.y + 0.5 }; }

  /* ── Construction du plateau ── */
  function buildSquares() {
    sqLayer.innerHTML = ''; sqEls = {};
    var files = 'abcdefgh', ranks = '87654321', vr, vc, f, r, d, lab;
    if (flipped) { files = 'hgfedcba'; ranks = '12345678'; }
    for (vr = 0; vr < 8; vr++) for (vc = 0; vc < 8; vc++) {
      d = document.createElement('div');
      d.className = 'ech-sq ' + (((vr + vc) % 2) ? 'ech-light' : 'ech-dark');
      f = files[vc]; r = ranks[vr];
      sqEls[f + r] = d;
      if (vr === 7) { lab = document.createElement('span'); lab.className = 'ech-coord ech-cf'; lab.textContent = f; d.appendChild(lab); }
      if (vc === 0) { lab = document.createElement('span'); lab.className = 'ech-coord ech-cr'; lab.textContent = r; d.appendChild(lab); }
      sqLayer.appendChild(d);
    }
  }

  function pieceSVG(p) {
    var d = document.createElement('div');
    d.className = 'ech-pc-inner';
    d.innerHTML = '<svg viewBox="0 0 45 45">' + PIECES[p.color + p.type.toUpperCase()] + '</svg>';
    return d;
  }

  function sqOf(i, j) { return 'abcdefgh'[j] + (8 - i); }
  function renderPieces() {
    pcLayer.innerHTML = ''; pieceEls = {};
    var board = game.board(), i, j, row, pc, el, sq;
    for (i = 0; i < 8; i++) { row = board[i];
      for (j = 0; j < 8; j++) { pc = row[j]; if (!pc) continue;
        sq = sqOf(i, j);
        el = document.createElement('div');
        el.className = 'ech-pc';
        el.appendChild(pieceSVG(pc));
        place(el, sq);
        pcLayer.appendChild(el);
        pieceEls[sq] = el;
      }
    }
  }

  function place(el, s) { var p = xy(s); el.style.transform = 'translate(' + p.x * 100 + '%,' + p.y * 100 + '%)'; }

  function clearMarks() {
    var k;
    for (k in sqEls) sqEls[k].classList.remove('ech-sel', 'ech-dot', 'ech-cap', 'ech-lm', 'ech-chk');
  }
  function markLast() {
    if (!lastMove) return;
    sqEls[lastMove.from].classList.add('ech-lm');
    sqEls[lastMove.to].classList.add('ech-lm');
    if (game.in_check()) {
      var board = game.board(), i, j, row, pc;
      for (i = 0; i < 8; i++) { row = board[i];
        for (j = 0; j < 8; j++) { pc = row[j];
          if (pc && pc.type === 'k' && pc.color === game.turn()) sqEls[sqOf(i, j)].classList.add('ech-chk');
        }
      }
    }
  }

  function redrawAll() {
    buildSquares(); renderPieces(); clearMarks(); markLast();
    drawArrow('ai', lastMove && lastMove.color !== humanColor ? lastMove : null);
    renderList(); renderCaptured(); updateEval(); status(); checkEnd();
  }

  /* ── Flèches (coup de l'IA, indice) ── */
  function drawArrow(kind, mv) {
    var svg = kind === 'ai' ? $('echArrowAI') : $('echArrowHint');
    svg.innerHTML = '';
    if (!mv) return;
    var a = center(mv.from), b = center(mv.to);
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy);
    var ux = dx / len, uy = dy / len, w = 0.14, head = 0.3;
    var ex = b.x - ux * head, ey = b.y - uy * head;
    var px = -uy, py = ux;
    var pts = (a.x + px * w) + ',' + (a.y + py * w) + ' ' + (ex + px * w) + ',' + (ey + py * w) + ' ' +
              (ex + px * 0.32) + ',' + (ey + py * 0.32) + ' ' + b.x + ',' + b.y + ' ' +
              (ex - px * 0.32) + ',' + (ey - py * 0.32) + ' ' + (ex - px * w) + ',' + (ey - py * w) + ' ' +
              (a.x - px * w) + ',' + (a.y - py * w);
    var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', pts);
    poly.setAttribute('class', kind === 'ai' ? 'ech-ar-ai' : 'ech-ar-hint');
    svg.appendChild(poly);
  }

  /* ── Sons (Web Audio, générés) ── */
  function snd(notes, dur, type, gain) {
    if (muted) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var t = audioCtx.currentTime;
      notes.forEach(function (f, i) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = type || 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(gain || 0.07, t + i * dur);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * dur + dur * 1.4);
        o.connect(g).connect(audioCtx.destination);
        o.start(t + i * dur); o.stop(t + i * dur + dur * 1.5);
      });
    } catch (e) { /* audio indisponible : silencieux */ }
  }
  var sMove = function () { snd([340], 0.07); },
      sCap = function () { snd([190, 120], 0.08, 'square', 0.05); },
      sCheck = function () { snd([660, 880], 0.09, 'sine', 0.06); },
      sEnd = function () { snd([523, 659, 784], 0.14, 'sine', 0.06); },
      sNope = function () { snd([110], 0.09, 'sawtooth', 0.04); };

  /* ── Exécuter un coup (avec animation) ── */
  function findVerbose(from, to) {
    var ms = game.moves({ verbose: true }), i, out = [];
    for (i = 0; i < ms.length; i++) if (ms[i].from === from && ms[i].to === to) out.push(ms[i]);
    return out;
  }

  async function doMove(mvObj) {
    var preFrom = mvObj.from, preTo = mvObj.to;
    var mvs = findVerbose(preFrom, preTo);
    var needsPromo = mvs.length > 1 && mvs[0].promotion;
    var mv;
    if (needsPromo && !mvObj.promotion) {
      mvObj = { from: preFrom, to: preTo, promotion: await askPromotion(mvs[0].color) };
    }
    var el = pieceEls[preFrom], board, i, j, row, pc;
    /* pièces capturées (y compris prise en passant) à retirer visuellement */
    var captureSq = preTo;
    if (mvs[0] && mvs[0].flags.indexOf('e') >= 0)
      captureSq = preTo[0] + (mvs[0].color === 'w' ? String(+preTo[1] - 1) : String(+preTo[1] + 1));
    var capturedEl = pieceEls[captureSq] && captureSq !== preFrom ? pieceEls[captureSq] : null;

    mv = game.move(mvObj);
    if (!mv) { sNope(); return; }
    lastMove = mv; sel = null; clearMarks();

    if (capturedEl) { capturedEl.classList.add('ech-fade'); sCap(); }
    else sMove();
    if (el) { place(el, preTo); pieceEls[preTo] = el; delete pieceEls[preFrom]; }
    /* roque : bouger aussi la tour */
    if (mv.flags.indexOf('k') >= 0 || mv.flags.indexOf('q') >= 0) {
      var rank = mv.color === 'w' ? '1' : '8', rf, rt;
      if (mv.flags.indexOf('k') >= 0) { rf = 'h' + rank; rt = 'f' + rank; }
      else { rf = 'a' + rank; rt = 'd' + rank; }
      var rok = pieceEls[rf];
      if (rok) { place(rok, rt); pieceEls[rt] = rok; delete pieceEls[rf]; }
    }
    if (mv.promotion) {
      setTimeout(function () {
        var pEl = pieceEls[mv.to];
        if (pEl) { pEl.innerHTML = ''; pEl.appendChild(pieceSVG({ type: mv.promotion, color: mv.color })); }
      }, 200);
    }
    await new Promise(function (r) { setTimeout(r, 240); });
    drawArrow('ai', mv.color !== humanColor ? mv : null);
    drawArrow('hint', null);
    renderPieces(); clearMarks(); markLast();
    renderList(); renderCaptured(); updateEval(); status(); checkEnd();
  }

  /* ── Promotion ── */
  function askPromotion(color) {
    return new Promise(function (resolve) {
      var modal = $('echPromo');
      modal.innerHTML = '';
      ['q', 'r', 'n', 'b'].forEach(function (t) {
        var b = document.createElement('button');
        b.className = 'ech-promo-btn';
        b.innerHTML = '<svg viewBox="0 0 45 45">' + PIECES[color + t.toUpperCase()] + '</svg>';
        b.addEventListener('click', function () { modal.classList.remove('open'); resolve(t); });
        modal.appendChild(b);
      });
      modal.classList.add('open');
    });
  }

  /* ── Interactions pointeur (clic-clic + glisser-déposer) ── */
  var drag = null;
  function myTurn() { return !busy && !over && game.turn() === humanColor; }

  document.querySelector('.ech-board').addEventListener('pointerdown', function (e) {
    if (!myTurn() || $('echPromo').classList.contains('open')) return;
    var sq = pointerSquare(e); if (!sq) return;
    var pc = game.get(sq);
    if (sel && sq !== sel) {
      var own = pc && pc.color === humanColor;
      if (!own) { tryMove(sel, sq); return; } /* case vide ou pièce adverse : on tente le coup */
    }
    if (pc && pc.color === humanColor) {
      selectSquare(sq);
      var el = pieceEls[sq];
      if (el) {
        drag = { from: sq, el: el, sx: e.clientX, sy: e.clientY, moved: false };
        el.setPointerCapture && el.setPointerCapture(e.pointerId);
        el.classList.add('ech-drag');
      }
      e.preventDefault();
    }
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
    drag.moved = true;
    var r = pcLayer.getBoundingClientRect(), cell = r.width / 8;
    var p = xy(drag.from);
    drag.el.style.transition = 'none';
    drag.el.style.zIndex = 30;
    drag.el.style.transform = 'translate(' + (p.x * 100 + (dx / cell) * 100) + '%,' + (p.y * 100 + (dy / cell) * 100) + '%) scale(1.08)';
  });
  window.addEventListener('pointerup', function (e) {
    if (!drag) return;
    var d = drag; drag = null;
    d.el.classList.remove('ech-drag');
    d.el.style.zIndex = '';
    if (!d.moved) return; /* simple clic : la sélection reste */
    var sq = pointerSquare(e);
    if (sq && sq !== d.from) tryMove(d.from, sq);
    else { place(d.el, d.from); d.el.style.transition = ''; }
  });

  function pointerSquare(e) {
    var r = pcLayer.getBoundingClientRect();
    var vx = Math.floor((e.clientX - r.left) / (r.width / 8));
    var vy = Math.floor((e.clientY - r.top) / (r.height / 8));
    return sqAt(vx, vy);
  }
  function selectSquare(sq) {
    sel = sq; clearMarks(); markLast();
    sqEls[sq].classList.add('ech-sel');
    var ms = game.moves({ verbose: true }), i;
    for (i = 0; i < ms.length; i++) if (ms[i].from === sq) {
      sqEls[ms[i].to].classList.add(ms[i].captured ? 'ech-cap' : 'ech-dot');
    }
    snd([420], 0.03, 'sine', 0.025);
  }
  function tryMove(from, to) {
    var mvs = findVerbose(from, to);
    if (!mvs.length) {
      sNope();
      var el0 = pieceEls[from];
      if (el0) { place(el0, from); el0.style.transition = ''; }
      clearMarks(); markLast(); sel = null; return;
    }
    var el1 = pieceEls[from];
    if (el1) el1.style.transition = '';
    doMove({ from: from, to: to }).then(function () { maybeAI(); });
  }

  /* ── Tour de l'IA ── */
  function maybeAI() {
    if (over || busy || game.turn() === humanColor) return;
    busy = true;
    var L = LEVELS[level - 1];
    thinkEl.style.display = 'flex';
    status();
    var t0 = Date.now();
    SEARCH.bestMove(game.fen(), L.cfg, function (p) {
      thinkEl.textContent = 'L\u2019IA réfléchit… ' + p.nodes.toLocaleString('fr-FR') +
        ' positions examinées · profondeur ' + p.depth;
    }).then(function (res) {
      busy = false;
      thinkEl.style.display = 'none';
      if (!res || over) return;
      showThinking(res, Date.now() - t0);
      doMove({ from: res.move.from, to: res.move.to, promotion: res.move.promotion });
    });
  }
  function status() {
    if (over) return;
    if (game.turn() === humanColor) {
      statusEl.innerHTML = game.in_check()
        ? '<span class="ech-alert">⚠️ Votre roi est en échec !</span>'
        : 'À vous de jouer — vous avez les ' + (humanColor === 'w' ? 'Blancs ♔' : 'Noirs ♚');
    } else statusEl.innerHTML = 'L\u2019IA joue son coup…';
  }
  function showThinking(res, ms) {
    if (!topEl) return;
    var nps = res.nodes && res.ms ? Math.round(res.nodes / res.ms * 1000) : 0;
    var rows = res.top.map(function (t, i) {
      var cls = i === 0 ? ' ech-best' : '';
      var pawns = (t.score / 100), sign = pawns > 0 ? '+' : '';
      return '<div class="ech-top-row' + cls + '"><b>' + t.san + '</b><span>' + sign +
             pawns.toFixed(1) + '</span></div>';
    });
    topEl.innerHTML = '<div class="ech-think-meta">Profondeur ' + res.depth + ' · ' +
      res.nodes.toLocaleString('fr-FR') + ' positions · ' + (res.ms / 1000).toFixed(1) + ' s · ' +
      nps.toLocaleString('fr-FR') + ' positions/s</div>' + (rows.join('') || '<div class="ech-top-row"><i>coup choisi au hasard</i></div>');
    evalFill.dataset.last = res.score * (game.turn() === 'w' ? -1 : 1);
  }

  /* ── Évaluation, listes, fin de partie ── */
  function updateEval() {
    var white = window.ECH_AI.evaluate(game);
    var pct = 50 + 50 * Math.tanh(white / 600);
    evalFill.style.height = pct + '%';
    var p = white / 100, sign = p > 0 ? '+' : '';
    evalNum.textContent = Math.abs(white) > 90000 ? (white > 0 ? 'Mat' : 'Mat') : sign + p.toFixed(1);
  }
  function renderList() {
    var h = game.history({ verbose: true }), html = '', i;
    for (i = 0; i < h.length; i += 2) {
      html += '<div class="ech-mrow"><span class="ech-mnum">' + (i / 2 + 1) + '.</span><span>' + h[i].san +
        '</span><span>' + (h[i + 1] ? h[i + 1].san : '') + '</span></div>';
    }
    listEl.innerHTML = html || '<div class="ech-mempty">La partie commence — à vous !</div>';
    listEl.scrollTop = listEl.scrollHeight;
  }
  function renderCaptured() {
    var h = game.history({ verbose: true }), w = [], b = [], i, m, diffW = 0;
    var V = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    for (i = 0; i < h.length; i++) { m = h[i]; if (!m.captured) continue;
      if (m.color === 'w') { w.push(m.captured); diffW += V[m.captured]; }
      else { b.push(m.captured); diffW -= V[m.captured]; }
    }
    function tray(list) {
      return list.sort(function (a, c) { return V[c] - V[a]; }).map(function (t) {
        return '<svg viewBox="0 0 45 45" class="ech-capsq">' + PIECES[(t === t.toUpperCase() ? 'w' : 'b') + t.toUpperCase()] + '</svg>';
      }).join('');
    }
    capTop.innerHTML = tray(b);
    capBot.innerHTML = tray(w);
    var badge = diffW !== 0 ? ' <span class="ech-diff">' + (diffW > 0 ? '+' : '') + diffW + '</span>' : '';
    lblBot.innerHTML = lblBot.dataset.name + badge;
    lblTop.innerHTML = lblTop.dataset.name;
  }
  function checkEnd() {
    var msg = null, titre = null;
    if (game.in_checkmate()) {
      over = true; sEnd();
      var winner = game.turn() === 'w' ? 'n' : 'w';
      titre = winner === humanColor ? '🏆 Échec et mat — vous gagnez !' : '🤖 Échec et mat — l\u2019IA gagne.';
      msg = winner === humanColor
        ? 'Bravo ! Vous avez battu le niveau « ' + LEVELS[level - 1].nom + ' ». Montez d\u2019un cran ?'
        : 'L\u2019IA de niveau « ' + LEVELS[level - 1].nom + ' » l\u2019emporte. Annulez le coup fatal ou recommencez !';
    } else if (game.in_stalemate()) { over = true; titre = '🤝 Pat !'; msg = 'Aucun coup légal sans être en échec : la partie est nulle.'; }
    else if (game.in_threefold_repetition()) { over = true; titre = '🤝 Nulle'; msg = 'Même position trois fois : par répétition, la partie est nulle.'; }
    else if (game.insufficient_material()) { over = true; titre = '🤝 Nulle'; msg = 'Matériel insuffisant pour mater : la partie est nulle.'; }
    else if (parseInt(game.fen().split(' ')[4], 10) >= 100) { over = true; titre = '🤝 Nulle'; msg = 'Règle des 50 coups : la partie est nulle.'; }
    if (over && titre) {
      banner.innerHTML = '<div class="ech-banner-in"><h3>' + titre + '</h3><p>' + msg +
        '</p><button class="btn btn-primary btn-sm" id="echAgain">Nouvelle partie</button></div>';
      banner.classList.add('open');
      $('echAgain').addEventListener('click', newGame);
      statusEl.textContent = 'Partie terminée.';
      thinkEl.style.display = 'none';
    }
  }

  /* ── Contrôles ── */
  function newGame() {
    game = new ChessLib(); over = false; busy = false; lastMove = null; sel = null;
    flipped = humanColor === 'b';
    banner.classList.remove('open');
    drawArrow('ai', null); drawArrow('hint', null);
    topEl.innerHTML = '<div class="ech-top-row"><i>En attente du premier coup de l\u2019IA…</i></div>';
    lblBot.dataset.name = 'Vous — ' + (humanColor === 'w' ? 'Blancs ♔' : 'Noirs ♚');
    lblTop.dataset.name = 'IA — niveau ' + level + ' · ' + LEVELS[level - 1].nom;
    redrawAll();
    maybeAI();
  }
  $('echNew').addEventListener('click', function () { if (!busy) newGame(); });
  $('echUndo').addEventListener('click', function () {
    if (busy || over || !game.history().length) return;
    game.undo();
    if (game.history().length && game.turn() !== humanColor) game.undo();
    var h = game.history({ verbose: true });
    lastMove = h.length ? h[h.length - 1] : null;
    sel = null; banner.classList.remove('open');
    drawArrow('ai', null);
    redrawAll();
    statusEl.innerHTML = '↩ Coup annulé — à vous de rejouer.';
  });
  $('echHint').addEventListener('click', function () {
    if (!myTurn()) return;
    statusEl.innerHTML = '💡 L\u2019IA calcule un indice…';
    SEARCH.bestMove(game.fen(), { maxDepth: 3, timeMs: 900 }).then(function (res) {
      if (!res) return;
      drawArrow('hint', res.move);
      statusEl.innerHTML = '💡 Suggestion de l\u2019IA : <b>' + res.san + '</b>';
      snd([500, 600], 0.06, 'sine', 0.05);
    });
  });
  $('echFlip').addEventListener('click', function () { flipped = !flipped; redrawAll(); });
  $('echSound').addEventListener('click', function () {
    muted = !muted;
    $('echSound').textContent = muted ? '🔇' : '🔊';
  });
  $('echView').addEventListener('click', function () {
    wrap.classList.toggle('is3d');
    $('echView').textContent = wrap.classList.contains('is3d') ? 'Vue 2D' : 'Vue 3D';
    snd([440, 550], 0.07, 'sine', 0.04);
  });
  lvlSel.addEventListener('change', function () {
    level = parseInt(lvlSel.value, 10);
    lblTop.dataset.name = 'IA — niveau ' + level + ' · ' + LEVELS[level - 1].nom;
    renderCaptured();
    statusEl.innerHTML = 'Niveau « ' + LEVELS[level - 1].nom + ' » : ' + LEVELS[level - 1].desc + '.';
  });
  document.querySelectorAll('input[name=echColor]').forEach(function (r) {
    r.addEventListener('change', function () {
      humanColor = r.value; newGame();
    });
  });

  /* ── Démarrage ── */
  newGame();

  /* Harnais de test (usage interne) */
  window.ECH_TEST = {
    game: function () { return game; },
    stats: function () { return { hist: game.history().length, pcs: Object.keys(pieceEls).length,
      busy: busy, over: over, squares: Object.keys(sqEls).length }; },
    play: function (f, t) { return doMove({ from: f, to: t }).then(function () { maybeAI(); }); },
    setLevel: function (n) { level = n; },
    is3d: function () { return wrap.classList.contains('is3d'); }
  };
})();
