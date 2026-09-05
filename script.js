/* ═══ C.I.M. — scripts partagés ═══ */
document.addEventListener('DOMContentLoaded', () => {
  // Année
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());

  // Menu mobile
  const burger = document.getElementById('burger'), list = document.getElementById('navList');
  if (burger && list) {
    burger.addEventListener('click', () => list.classList.toggle('open'));
    list.addEventListener('click', e => { if (e.target.tagName === 'A') list.classList.remove('open'); });
  }

  // Apparitions au scroll
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); }
  }), { threshold: .1 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Compteurs animés
  const io2 = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io2.unobserve(e.target);
    const el = e.target, target = +el.dataset.count, dur = 1200, start = performance.now();
    (function step(now) {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }), { threshold: .5 });
  document.querySelectorAll('[data-count]').forEach(el => io2.observe(el));
});

/* ═══ Actus : chargement progressif des articles + retour en haut ═══ */
document.addEventListener('DOMContentLoaded', () => {
  // Bouton "revenir en haut"
  const topBtn = document.getElementById('topBtn');
  if (topBtn) {
    topBtn.hidden = false;
    topBtn.style.display = 'none';
    window.addEventListener('scroll', () => {
      topBtn.style.display = window.scrollY > 700 ? 'grid' : 'none';
    }, { passive: true });
    topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // Fil d'actus : on n'affiche les articles qu'au fur et à mesure
  const feed = document.querySelector('.feed');
  const moreBtn = document.getElementById('feedMore');
  if (!feed || !moreBtn) return;
  const posts = Array.from(feed.querySelectorAll('.post'));
  const BATCH = 5, INITIAL = 6;
  let shown = 0;
  function show(n) {
    const upto = Math.min(posts.length, shown + n);
    for (let i = shown; i < upto; i++) posts[i].style.display = '';
    shown = upto;
    if (shown >= posts.length) moreBtn.hidden = true;
    else { moreBtn.hidden = false; moreBtn.textContent = '⬇️ Afficher plus d\'articles (' + (posts.length - shown) + ' restants)'; }
  }
  posts.forEach((p, i) => { if (i >= INITIAL) p.style.display = 'none'; });
  shown = Math.min(INITIAL, posts.length);
  show(0);
  moreBtn.addEventListener('click', () => show(BATCH));
  // Chargement automatique juste avant d'arriver en bas
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && shown < posts.length) show(BATCH);
  }), { rootMargin: '900px 0px' });
  io.observe(moreBtn);
  // Ancre directe (#art12) : on révèle jusqu'à l'article visé
  function revealTo(hash) {
    if (!hash || !hash.startsWith('#art')) return;
    const idx = posts.findIndex(p => p.id === hash.slice(1));
    if (idx >= shown) { show(idx - shown + 1); }
  }
  revealTo(location.hash);
  window.addEventListener('hashchange', () => revealTo(location.hash));
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="#art"]');
    if (a) setTimeout(() => revealTo(new URL(a.href).hash), 0);
  });
});
