/* ═══════════════════════════════════════════════════════════════
   Échecs IA — moteur de jeu du Hub C.I.M.
   Négamax + élagage alpha-bêta + recherche de quiescence + tables
   de positions (fonction d'évaluation "simplifiée" classique).
   Tourne au-dessus de chess.js (règles complètes : roque, prise
   en passant, promotion, pat, répétition, règle des 50 coups).
   ═══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var MATE = 100000;

  var VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

  /* Tables de positions (blancs, 1re ligne = rangée 8) — source :
     "Simplified Evaluation Function", chessprogramming.org */
  var PST = {
    p: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10,
        5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5,
        5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
    n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40,
        -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30,
        -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30,
        -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
    b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10,
        -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10,
        -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10,
        -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
    r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5,
        -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
        -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
    q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10,
        -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5,
        0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10,
        -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
    k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
        -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10,
        20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
    kFin: [-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30,
        -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30,
        -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30,
        -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50]
  };

  function evaluate(game) { /* score du point de vue des Blancs (centipions) */
    var board = game.board(), score = 0, phase = 0, i, j, row, pc, t, idx;
    for (i = 0; i < 8; i++) { row = board[i];
      for (j = 0; j < 8; j++) { pc = row[j]; if (!pc) continue;
        if (pc.type !== 'p' && pc.type !== 'k') phase += VAL[pc.type];
      }
    }
    var fin = phase <= 2400;
    for (i = 0; i < 8; i++) { row = board[i];
      for (j = 0; j < 8; j++) { pc = row[j]; if (!pc) continue;
        t = pc.type; idx = i * 8 + j;
        if (pc.color === 'w') score += VAL[t] + PST[t === 'k' ? (fin ? 'kFin' : 'k') : t][idx];
        else score -= VAL[t] + PST[t === 'k' ? (fin ? 'kFin' : 'k') : t][idx ^ 56];
      }
    }
    return score;
  }

  function orderMoves(moves) {
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i], s = 0;
      if (m.captured) s += 10 * VAL[m.captured] - VAL[m.piece] / 10;
      if (m.promotion) s += 900;
      m._s = s;
    }
    moves.sort(function (a, b) { return b._s - a._s; });
    return moves;
  }

  function makeSearch(Chess) {
    var stats = { nodes: 0 }, deadline = 0, stop = false;

    function tick() {
      stats.nodes++;
      if ((stats.nodes & 1023) === 0) {
        if (Date.now() > deadline) stop = true;
        return true; /* demande un point de reprise à l'UI */
      }
      return false;
    }

    function quiesce(game, alpha, beta, qd) {
      if (tick() && stop) return 0;
      var sign = game.turn() === 'w' ? 1 : -1;
      var stand = sign * evaluate(game);
      if (qd > 4) return stand;
      if (stand >= beta) return stand;
      if (stand > alpha) alpha = stand;
      var moves = game.moves({ verbose: true }), i, sc;
      for (i = 0; i < moves.length; i++) {
        if (!moves[i].captured && !moves[i].promotion) continue;
        game.move(moves[i]);
        sc = -quiesce(game, -beta, -alpha, qd + 1);
        game.undo();
        if (stop) return 0;
        if (sc >= beta) return sc;
        if (sc > alpha) alpha = sc;
      }
      return alpha;
    }

    async function search(game, depth, alpha, beta, ply) {
      if (tick()) { if (stop) return 0; await null; if (stop) return 0; }
      var moves = game.moves({ verbose: true });
      if (moves.length === 0) return game.in_check() ? -MATE + ply : 0;
      if (depth <= 0) return quiesce(game, alpha, beta, 0);
      orderMoves(moves);
      var best = -Infinity, i, sc;
      for (i = 0; i < moves.length; i++) {
        game.move(moves[i]);
        sc = await search(game, depth - 1, -beta, -alpha, ply + 1);
        game.undo();
        if (stop) return 0;
        if (sc > best) best = sc;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
      }
      return best;
    }

    /* ── Choix d'un coup pour le camp au trait ── */
    async function bestMove(fen, cfg, onProgress) {
      cfg = cfg || {};
      var game = new Chess(fen);
      var moves = game.moves({ verbose: true });
      if (moves.length === 0) return null;
      var t0 = Date.now();
      stats.nodes = 0; stop = false; deadline = t0 + (cfg.timeMs || 800);

      if (cfg.random) { /* niveau 1 : il découvre le jeu */
        var rm = moves[Math.floor(Math.random() * moves.length)];
        return { move: rm, san: rm.san, score: 0, depth: 0, nodes: 1,
                 ms: Date.now() - t0, top: [] };
      }

      orderMoves(moves);
      var scored = [], d, bestMv = moves[0], reachedDepth = 0;
      for (d = 1; d <= (cfg.maxDepth || 2); d++) {
        var alpha = -Infinity, iter = [], aborted = false, i, sc;
        for (i = 0; i < moves.length; i++) {
          game.move(moves[i]);
          sc = -await search(game, d - 1, -Infinity, -alpha, 1);
          game.undo();
          if (stop) { aborted = true; break; }
          iter.push({ mv: moves[i], score: sc });
          if (sc > alpha) alpha = sc;
        }
        if (iter.length === 0) break;
        if (aborted && iter.length < moves.length && d > 1) { /* profondeur partielle : on la garde quand même */ }
        iter.sort(function (a, b) { return b.score - a.score; });
        scored = iter;
        scored.forEach(function (it, k) { moves[k] = it.mv; }); /* meilleur d'abord */
        bestMv = scored[0].mv; reachedDepth = d;
        if (Math.abs(scored[0].score) > MATE - 100) break; /* mat trouvé */
        if (Date.now() > deadline) break;
        if (onProgress) onProgress({ nodes: stats.nodes, depth: d });
      }

      var pick = 0;
      if (cfg.blunder && scored.length > 1 && Math.random() < cfg.blunder)
        pick = 1 + Math.floor(Math.random() * Math.min(2, scored.length - 1));
      var chosen = scored[pick] || { mv: bestMv, score: 0 };
      var noise = cfg.noise ? (Math.random() - 0.5) * 2 * cfg.noise : 0;

      return { move: chosen.mv, san: chosen.mv.san,
               score: chosen.score + noise,
               depth: reachedDepth, nodes: stats.nodes,
               ms: Date.now() - t0,
               top: scored.slice(0, 3).map(function (it) {
                 return { san: it.mv.san, from: it.mv.from, to: it.mv.to,
                          score: it.score };
               }) };
    }

    return { bestMove: bestMove, stats: stats, evaluate: evaluate };
  }

  var api = { MATE: MATE, makeSearch: makeSearch, evaluate: evaluate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.ECH_AI = api;
})(typeof window !== 'undefined' ? window : globalThis);
