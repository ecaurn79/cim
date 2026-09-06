/* ═══ HUB OF DUTY — PARTIE 3 : joueur, arme, HUD, boucle ═══ */

/* ── Joueur ── */
var player = {
  pos: new T.Vector3(0, 0, 14),
  vel: new T.Vector3(),
  yaw: Math.PI, pitch: 0,
  hp: 100, lastHurt: -99, onGround: true,
  bob: 0, fovBase: 75
};
var keys = {};
var mouseDown = false, adsHeld = false;

/* ── Arme (viewmodel) ── */
var weapon = new T.Group();
var vmBase = new T.Vector3(0.34, -0.32, -0.62);
var vmAds = new T.Vector3(0, -0.205, -0.42);
var muzzleFlash, weaponMuzzle;
(function buildWeapon() {
  var matGun = new T.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.5, metalness: 0.7 });
  var matGun2 = new T.MeshStandardMaterial({ color: 0x171b20, roughness: 0.6, metalness: 0.5 });
  var matGlowB = new T.MeshBasicMaterial({ color: 0x35d0ff });
  var receiver = new T.Mesh(new T.BoxGeometry(0.09, 0.13, 0.52), matGun); weapon.add(receiver);
  var barrel = new T.Mesh(new T.CylinderGeometry(0.025, 0.028, 0.46, 10), matGun2);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -0.44); weapon.add(barrel);
  var cell = new T.Mesh(new T.CylinderGeometry(0.034, 0.034, 0.3, 10), matGlowB);
  cell.rotation.x = Math.PI / 2; cell.position.set(0, -0.045, -0.18); weapon.add(cell);
  var grip = new T.Mesh(new T.BoxGeometry(0.07, 0.16, 0.09), matGun2);
  grip.position.set(0, -0.13, 0.08); grip.rotation.x = 0.28; weapon.add(grip);
  var sight = new T.Mesh(new T.BoxGeometry(0.02, 0.05, 0.06), matGun2);
  sight.position.set(0, 0.09, -0.2); weapon.add(sight);
  var dot = new T.Mesh(new T.SphereGeometry(0.008, 6, 6), matGlowB);
  dot.position.set(0, 0.115, -0.2); weapon.add(dot);
  weaponMuzzle = new T.Object3D();
  weaponMuzzle.position.set(0, 0.02, -0.68);
  weapon.add(weaponMuzzle);
  muzzleFlash = glowSprite(texGlowBlue, 0.3, 0);
  muzzleFlash.position.copy(weaponMuzzle.position);
  weapon.add(muzzleFlash);
  weapon.position.copy(vmBase);
  weapon.traverse(function (o) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; });
  camera.add(weapon);
  scene.add(camera);
})();
var WPN = { ammo: 30, mag: 30, cd: 0, reloading: 0, rate: 0.125, dmg: 24, spread: 0.02, adsSpread: 0.006, recoil: 0.0042 };

/* ── HUD ── */
var el = function (id) { return document.getElementById(id); };
var hudHp = el('fpsHp'), hudHpNum = el('fpsHpNum'), hudAmmo = el('fpsAmmo'),
    hudWave = el('fpsWave'), hudScore = el('fpsScore'), hudBanner = el('fpsBanner'),
    hudVign = el('fpsVign'), hudHitm = el('fpsHitm'), hudFeed = el('fpsFeed'),
    scrMenu = el('fpsMenu'), scrPause = el('fpsPause'), scrOver = el('fpsOver'),
    hudRoot = el('fpsHud'), bannerT = null;

function updateHUD() {
  hudHp.style.width = Math.max(0, player.hp) + '%';
  hudHp.style.background = player.hp > 55 ? '#38d178' : (player.hp > 25 ? '#ffb020' : '#ff4444');
  hudHpNum.textContent = Math.max(0, Math.round(player.hp));
  hudAmmo.textContent = WPN.reloading > 0 ? '···' : WPN.ammo;
  hudWave.textContent = G.wave > 0 ? ('VAGUE ' + G.wave) : '—';
  hudScore.textContent = G.score.toLocaleString('fr-FR');
}
function showBanner(t, sub) {
  hudBanner.innerHTML = '<b>' + t + '</b>' + (sub ? '<span>' + sub + '</span>' : '');
  hudBanner.classList.add('on');
  clearTimeout(bannerT);
  bannerT = setTimeout(function () { hudBanner.classList.remove('on'); }, 3400);
}
function killPopup(txt) {
  var s = document.createElement('span');
  s.textContent = txt;
  s.className = 'fps-kp';
  hudFeed.appendChild(s);
  setTimeout(function () { s.remove(); }, 900);
}
function hitMarker(head) {
  hudHitm.classList.remove('on', 'crit');
  void hudHitm.offsetWidth;
  hudHitm.classList.add('on');
  if (head) hudHitm.classList.add('crit');
  updateHUD();
}
function hurtPlayer(dmg) {
  if (G.mode !== 'play' || player.hp <= 0) return;
  player.hp -= dmg;
  player.lastHurt = G.time;
  G.shake = Math.max(G.shake, 0.35);
  sfx.hurt();
  hudVign.classList.remove('pulse'); void hudVign.offsetWidth; hudVign.classList.add('pulse');
  updateHUD();
  if (player.hp <= 0) gameOver();
}

/* ── Écrans ── */
function fmtTime() { return Math.floor(G.time / 60) + ':' + ('0' + Math.floor(G.time % 60)).slice(-2); }
function gameOver() {
  G.mode = 'over';
  document.exitPointerLock && document.exitPointerLock();
  var acc = G.fired ? Math.round(100 * G.hitC / G.fired) : 0;
  var isBest = G.score > G.best;
  if (isBest) { G.best = G.score; localStorage.setItem('hod_best', String(G.best)); }
  el('fpsOverStats').innerHTML =
    '<div><b>' + G.score.toLocaleString('fr-FR') + '</b><span>points' + (isBest ? ' · 🏆 record !' : '') + '</span></div>' +
    '<div><b>Vague ' + G.wave + '</b><span>tenue ' + fmtTime() + '</span></div>' +
    '<div><b>' + G.kills + '</b><span>machines détruites (' + G.head + ' à la tête)</span></div>' +
    '<div><b>' + acc + ' %</b><span>de précision</span></div>';
  hudRoot.style.display = 'none';
  scrOver.classList.add('on');
}
function startGame() {
  /* reset complet */
  enemies.forEach(function (e) { scene.remove(e.g); });
  enemies.length = 0;
  bolts.forEach(function (b) { scene.remove(b.m); });
  bolts.length = 0;
  player.pos.set(0, 0, 14); player.vel.set(0, 0, 0);
  player.yaw = Math.PI; player.pitch = 0;
  player.hp = 100; player.lastHurt = -99;
  WPN.ammo = WPN.mag; WPN.reloading = 0;
  G.wave = 0; G.score = 0; G.kills = 0; G.head = 0; G.fired = 0; G.hitC = 0;
  G.shake = 0; G.restTimer = 0; G.spawnQueue = [];
  scrMenu.classList.remove('on'); scrPause.classList.remove('on'); scrOver.classList.remove('on');
  hudRoot.style.display = 'block';
  G.mode = 'play';
  audioInit();
  startWave();
  updateHUD();
  renderer.domElement.requestPointerLock();
}
function pauseGame() {
  if (G.mode !== 'play') return;
  G.mode = 'pause';
  hudRoot.style.display = 'none';
  scrPause.classList.add('on');
}
function resumeGame() {
  scrPause.classList.remove('on');
  hudRoot.style.display = 'block';
  G.mode = 'play';
  renderer.domElement.requestPointerLock();
}

/* ── Entrées ── */
document.addEventListener('keydown', function (e) {
  keys[e.code] = true;
  if (e.code === 'KeyR' && G.mode === 'play' && WPN.ammo < WPN.mag && WPN.reloading <= 0) {
    WPN.reloading = 1.3; sfx.reload();
  }
  if (e.code === 'KeyB' && G.mode === 'play') {
    G.brain = !G.brain;
    showBanner('🧠 CERVEAU DES MACHINES ' + (G.brain ? 'ACTIVÉ' : 'DÉSACTIVÉ'),
      G.brain ? 'Cônes de vision et engagemement des robots affichés' : '');
  }
});
document.addEventListener('keyup', function (e) { keys[e.code] = false; });
document.addEventListener('mousedown', function (e) {
  if (G.mode !== 'play') return;
  if (e.button === 0) mouseDown = true;
  if (e.button === 2) adsHeld = true;
});
document.addEventListener('mouseup', function (e) {
  if (e.button === 0) mouseDown = false;
  if (e.button === 2) adsHeld = false;
});
document.addEventListener('contextmenu', function (e) { if (G.mode === 'play') e.preventDefault(); });
document.addEventListener('mousemove', function (e) {
  if (G.mode !== 'play' || document.pointerLockElement !== renderer.domElement) return;
  var sens = 0.0021 * (adsHeld ? 0.6 : 1);
  player.yaw -= e.movementX * sens;
  player.pitch = clamp(player.pitch - e.movementY * sens, -1.45, 1.45);
});
document.addEventListener('pointerlockchange', function () {
  if (document.pointerLockElement !== renderer.domElement && G.mode === 'play') pauseGame();
});
el('fpsStart').addEventListener('click', startGame);
el('fpsRetry').addEventListener('click', startGame);
el('fpsResume').addEventListener('click', resumeGame);
el('fpsQuit').addEventListener('click', function () {
  scrPause.classList.remove('on');
  scrMenu.classList.add('on');
  G.mode = 'menu';
});
el('fpsMute').addEventListener('click', function () {
  G.muted = !G.muted;
  if (master) master.gain.value = G.muted ? 0 : 0.5;
  el('fpsMute').textContent = G.muted ? '🔇 Son coupé' : '🔊 Son actif';
});
[el('fpsDiffRecrue'), el('fpsDiffRes'), el('fpsDiffVet')].forEach(function (r) {
  r.addEventListener('change', function () { G.diff = r.value; });
});
el('fpsQual').addEventListener('change', function () { G.quality = el('fpsQual').value; });

/* ── Qualité ── */
function applyQuality() {
  var q = QUAL[G.quality];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pr));
  renderer.shadowMap.enabled = q.shadow;
  sun.castShadow = q.shadow;
  sun.shadow.mapSize.set(q.shadowRes, q.shadowRes);
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
}
applyQuality();

/* ── Déplacement joueur ── */
function updatePlayer(dt) {
  var fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  var strafe = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  var sprint = keys.ShiftLeft || keys.ShiftRight;
  var speed = (sprint ? 8.2 : 5.2) * (adsHeld ? 0.6 : 1);
  var dir = _v1.set(strafe, 0, -fwd);
  if (dir.lengthSq() > 0) dir.normalize().applyAxisAngle(_v2.set(0, 1, 0), player.yaw);
  player.vel.x = lerp(player.vel.x, dir.x * speed, Math.min(1, dt * 10));
  player.vel.z = lerp(player.vel.z, dir.z * speed, Math.min(1, dt * 10));
  /* gravité + saut */
  player.vel.y -= 21 * dt;
  if (player.onGround && keys.Space) { player.vel.y = 7.6; player.onGround = false; }
  player.pos.x += player.vel.x * dt;
  player.pos.z += player.vel.z * dt;
  player.pos.y += player.vel.y * dt;
  if (player.pos.y <= 0) { player.pos.y = 0; player.vel.y = 0; player.onGround = true; }
  collide(player.pos, 0.45);
  /* bob de marche */
  var moving = Math.abs(player.vel.x) + Math.abs(player.vel.z);
  player.bob += dt * moving * 1.4;
  var bobY = Math.sin(player.bob) * 0.03 * clamp(moving / 8, 0, 1);
  /* caméra */
  camera.position.set(player.pos.x, player.pos.y + 1.62 + bobY, player.pos.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch + G.shake * rnd(-0.02, 0.02);
  camera.rotation.z = G.shake * rnd(-0.015, 0.015);
  G.shake = Math.max(0, G.shake - dt * 1.6);
  /* ADS */
  var targetFov = adsHeld ? 52 : player.fovBase;
  if (Math.abs(camera.fov - targetFov) > 0.2) {
    camera.fov = lerp(camera.fov, targetFov, Math.min(1, dt * 12));
    camera.updateProjectionMatrix();
  }
  weapon.position.lerp(adsHeld ? vmAds : vmBase, Math.min(1, dt * 12));
  weapon.position.y += bobY * 0.4;
  /* régénération */
  if (player.hp < 100 && G.time - player.lastHurt > 5) {
    player.hp = Math.min(100, player.hp + dt * 6);
    updateHUD();
  }
}

/* ── Tir du joueur ── */
function updateWeapon(dt) {
  if (WPN.reloading > 0) {
    WPN.reloading -= dt;
    weapon.rotation.x = Math.sin(Math.min(1, 1 - WPN.reloading / 1.3) * Math.PI) * 0.5;
    if (WPN.reloading <= 0) { WPN.ammo = WPN.mag; weapon.rotation.x = 0; updateHUD(); }
    return;
  }
  WPN.cd -= dt;
  muzzleFlash.material.opacity = Math.max(0, muzzleFlash.material.opacity - dt * 14);
  if (mouseDown && G.mode === 'play') {
    if (WPN.ammo <= 0) { if (WPN.cd <= 0) { sfx.dry(); WPN.cd = 0.3; } return; }
    if (WPN.cd <= 0) {
      WPN.cd = WPN.rate;
      WPN.ammo--;
      G.fired++;
      sfx.shoot();
      muzzleFlash.material.opacity = 0.95;
      muzzleFlash.scale.set(rnd(0.25, 0.42), rnd(0.25, 0.42), 1);
      player.pitch += WPN.recoil * (adsHeld ? 0.5 : 1);
      player.yaw += rnd(-WPN.recoil, WPN.recoil) * 0.4;
      weapon.position.z += 0.045; /* recul viewmodel */
      weaponMuzzle.getWorldPosition(_v3);
      var spread = (adsHeld ? WPN.adsSpread : WPN.spread) * (player.vel.length() > 6 ? 1.6 : 1);
      var dir = _v2.set(rnd(-spread, spread), rnd(-spread, spread), -1).normalize().applyEuler(camera.rotation);
      fireBolt(_v3, dir, { bolt: { dmg: WPN.dmg, spd: 95, r: 0.07, color: 0x35d0ff } }, 'p');
      updateHUD();
    }
  }
  weapon.position.z = lerp(weapon.position.z, (adsHeld ? vmAds : vmBase).z, Math.min(1, dt * 10));
}

/* ── Lasers ── */
var _p0 = new T.Vector3(), _p1 = new T.Vector3();
function updateBolts(dt) {
  for (var i = bolts.length - 1; i >= 0; i--) {
    var b = bolts[i];
    b.life -= dt;
    if (b.life <= 0) { scene.remove(b.m); bolts.splice(i, 1); continue; }
    _p0.copy(b.m.position);
    _p1.copy(_p0).addScaledVector(b.dir, b.spd * dt);
    var hitD = Infinity, hitEnemy = null, hitHead = false, blocked = false;
    /* obstacles */
    for (var j = 0; j < COL.length; j++) {
      var d = segBox(_p0, _p1, COL[j]);
      if (d >= 0 && d < hitD) { hitD = d; blocked = true; hitEnemy = null; }
    }
    /* sol */
    if (_p1.y < 0.03) {
      var tGround = _p0.y > 0 ? (0.03 - _p0.y) / (_p1.y - _p0.y) : 0;
      if (tGround >= 0 && tGround * b.spd * dt < hitD) { hitD = tGround * b.spd * dt; blocked = true; hitEnemy = null; }
    }
    if (b.owner === 'p') { /* vs machines */
      for (j = 0; j < enemies.length; j++) {
        var e = enemies[j];
        if (e.dead > 0 || e.gone) continue;
        if (e.type === 'hk') {
          var dH = segSphere(_p0, _p1, e.pos, e.tp.bodyR);
          if (dH >= 0 && dH < hitD) { hitD = dH; hitEnemy = e; hitHead = false; blocked = false; }
        } else {
          _v3.set(e.pos.x, e.pos.y + 1.15, e.pos.z);
          var dB = segSphere(_p0, _p1, _v3, e.tp.bodyR);
          if (dB >= 0 && dB < hitD) { hitD = dB; hitEnemy = e; hitHead = false; blocked = false; }
          _v3.set(e.pos.x, e.pos.y + 1.87, e.pos.z);
          var dHd = segSphere(_p0, _p1, _v3, e.tp.headR);
          if (dHd >= 0 && dHd < hitD) { hitD = dHd; hitEnemy = e; hitHead = true; blocked = false; }
        }
      }
    } else { /* vs joueur */
      _v3.set(player.pos.x, player.pos.y + 1.0, player.pos.z);
      var dP = segSphere(_p0, _p1, _v3, 0.55);
      if (dP >= 0 && dP < hitD) { hitD = dP; blocked = false; hitEnemy = 'player'; }
    }
    if (hitEnemy !== null || blocked) {
      if (hitD === Infinity) hitD = b.spd * dt;
      var hp = _v3.copy(_p0).addScaledVector(b.dir, hitD);
      if (hitEnemy === 'player') { hurtPlayer(b.dmg); }
      else if (hitEnemy) { G.hitC++; hurtEnemy(hitEnemy, b.dmg, hp, hitHead); }
      else sparkAt(hp, 0xffb060, 0.45);
      scene.remove(b.m);
      bolts.splice(i, 1);
      continue;
    }
    b.m.position.copy(_p1);
  }
}

/* ── Vagues : file de spawn ── */
function updateWaves(dt) {
  if (G.restTimer > 0) {
    G.restTimer -= dt;
    if (G.restTimer <= 0) { startWave(); }
    return;
  }
  var alive = 0;
  for (var i = 0; i < enemies.length; i++) if (enemies[i].dead <= 0 && !enemies[i].gone) alive++;
  var maxAlive = Math.min(4 + G.wave, 13);
  if (G.spawnQueue.length > 0) {
    G.spawnTimer -= dt;
    if (G.spawnTimer <= 0 && alive < maxAlive) {
      var t = G.spawnQueue.shift();
      spawnEnemy(t);
      G.spawnTimer = 0.8;
      updateHUD();
    }
  }
}

/* ── Redimensionnement ── */
function resize() {
  var w = wrap.clientWidth, h = wrap.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ── Boucle ── */
var lastT = performance.now(), fpsAcc = 0, fpsN = 0;
function loop(now) {
  requestAnimationFrame(loop);
  var dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (G.mode === 'play') {
    G.time += dt;
    updatePlayer(dt);
    updateWeapon(dt);
    for (var i = enemies.length - 1; i >= 0; i--) {
      updateEnemy(enemies[i], dt, G.time, player);
      if (enemies[i].gone) enemies.splice(i, 1);
    }
    updateBolts(dt);
    updateWaves(dt);
    sky.rotation.y += dt * 0.002;
    if (dustObj) dustObj.rotation.y += dt * 0.006;
    for (var f = 0; f < fires.length; f++) {
      var fl = fires[f];
      fl.scale.y = fl.userData.by || (fl.userData.by = fl.scale.y);
      fl.scale.y = fl.userData.by * (1 + Math.sin(G.time * 9 + f * 2.1) * 0.16);
      fl.material.opacity = 0.65 + Math.sin(G.time * 13 + f) * 0.2;
    }
  } else if (G.mode === 'menu') {
    /* caméra orbitale de présentation */
    var t = now * 0.00012;
    camera.position.set(Math.cos(t) * 46, 9 + Math.sin(t * 1.7) * 2, Math.sin(t) * 46);
    camera.lookAt(0, 3, 0);
    camera.rotation.order = 'YXZ';
    weapon.visible = false;
    for (i = 0; i < enemies.length; i++) if (!enemies[i].gone) updateEnemy(enemies[i], dt, now / 1000, player);
    updateBolts(dt);
  }
  if (G.mode !== 'menu') weapon.visible = true;
  updateSparks(dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
updateHUD();
el('fpsBest').textContent = G.best.toLocaleString('fr-FR');

/* ── API de test interne ── */
window.HOD_TEST = {
  state: function () { return G; },
  player: function () { return player; },
  enemies: function () { return enemies; },
  bolts: function () { return bolts; },
  spawn: function (t) { return spawnEnemy(t); },
  wave: function () { G.restTimer = 0; startWave(); },
  damage: function (n) { hurtPlayer(n); },
  fireOnce: function () { mouseDown = true; updateWeapon(0.016); mouseDown = false; }
};
})();
