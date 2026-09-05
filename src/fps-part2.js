/* ═══ HUB OF DUTY — PARTIE 2 : machines de Skynet, IA, lasers, vagues ═══ */

/* ── Matériaux des machines ── */
var matBody = new T.MeshStandardMaterial({ color: 0x8f959c, roughness: 0.42, metalness: 0.88 });
var matJoint = new T.MeshStandardMaterial({ color: 0x565b62, roughness: 0.5, metalness: 0.85 });
var matChrome = new T.MeshStandardMaterial({ color: 0xd4dde6, roughness: 0.14, metalness: 1.0 });
var matEye = new T.MeshBasicMaterial({ color: 0xff2211 });
var texGlowRed = texGlow('rgba(255,60,30,1)');
var texGlowBlue = texGlow('rgba(90,210,255,1)');
var texGlowOrange = texGlow('rgba(255,170,60,1)');

function glowSprite(tex, size, opacity) {
  var s = new T.Sprite(new T.SpriteMaterial({ map: tex, blending: T.AdditiveBlending, depthWrite: false, opacity: opacity || 0.9 }));
  s.scale.set(size, size, 1);
  return s;
}

/* ── Fabriques de machines (primitives, 100 % code) ── */
function box(w, h, d, mat) {
  var m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  m.castShadow = true; return m;
}
function sph(r, mat, seg) {
  var m = new T.Mesh(new T.SphereGeometry(r, seg || 10, seg || 8), mat);
  m.castShadow = true; return m;
}
function cyl(r, h, mat) {
  var m = new T.Mesh(new T.CylinderGeometry(r, r, h, 10), mat);
  m.castShadow = true; return m;
}

function makeESK() { /* endosquelette inspiré du T-800 */
  var g = new T.Group();
  var pelvis = box(0.42, 0.22, 0.28, matJoint); pelvis.position.y = 1.02; g.add(pelvis);
  var torso = box(0.52, 0.55, 0.3, matBody); torso.position.y = 1.42; g.add(torso);
  for (var r = 0; r < 3; r++) { /* côtes */
    var rib = box(0.46, 0.05, 0.24, matJoint); rib.position.set(0, 1.28 + r * 0.14, 0.03); g.add(rib);
  }
  var head = box(0.24, 0.26, 0.28, matBody); head.position.y = 1.86; g.add(head);
  var jaw = box(0.18, 0.09, 0.2, matJoint); jaw.position.set(0, 1.72, 0.03); g.add(jaw);
  var eL = sph(0.038, matEye); eL.position.set(-0.06, 1.9, 0.15); g.add(eL);
  var eR = sph(0.038, matEye); eR.position.set(0.06, 1.9, 0.15); g.add(eR);
  var gl = glowSprite(texGlowRed, 0.3); gl.position.set(0, 1.9, 0.19); g.add(gl); g.userData.eyeGlow = gl;
  var armL = new T.Group(), armR = new T.Group();
  var uaL = box(0.11, 0.42, 0.11, matJoint); uaL.position.y = -0.2; armL.add(uaL);
  var laL = box(0.1, 0.4, 0.1, matBody); laL.position.y = -0.58; armL.add(laL);
  armL.position.set(-0.34, 1.66, 0); g.add(armL);
  var uaR = box(0.11, 0.42, 0.11, matJoint); uaR.position.y = -0.2; armR.add(uaR);
  var laR = box(0.1, 0.4, 0.1, matBody); laR.position.y = -0.58; armR.add(laR);
  var gun = box(0.09, 0.14, 0.62, matDark); gun.position.set(0, -0.82, 0.2); armR.add(gun);
  var bar = cyl(0.025, 0.3, matDark); bar.rotation.x = Math.PI / 2; bar.position.set(0, -0.82, 0.6); armR.add(bar);
  var mz = new T.Object3D(); mz.position.set(0, -0.82, 0.78); armR.add(mz); g.userData.muzzle = mz;
  armR.position.set(0.34, 1.66, 0); g.add(armR);
  var legL = new T.Group(), legR = new T.Group();
  var thL = box(0.15, 0.5, 0.15, matJoint); thL.position.y = -0.26; legL.add(thL);
  var shL = box(0.12, 0.48, 0.13, matBody); shL.position.y = -0.74; legL.add(shL);
  var ftL = box(0.13, 0.08, 0.3, matJoint); ftL.position.set(0, -1.0, 0.07); legL.add(ftL);
  legL.position.set(-0.16, 1.02, 0); g.add(legL);
  var thR = box(0.15, 0.5, 0.15, matJoint); thR.position.y = -0.26; legR.add(thR);
  var shR = box(0.12, 0.48, 0.13, matBody); shR.position.y = -0.74; legR.add(shR);
  var ftR = box(0.13, 0.08, 0.3, matJoint); ftR.position.set(0, -1.0, 0.07); legR.add(ftR);
  legR.position.set(0.16, 1.02, 0); g.add(legR);
  g.userData.anim = { legL: legL, legR: legR, armL: armL, armR: armR };
  return g;
}
function makeMIM() { /* infiltrateur en polyalliage mimétique (inspiré T-1000) */
  var g = new T.Group();
  var body = new T.Mesh(T.CapsuleGeometry ? new T.CapsuleGeometry(0.26, 0.9, 6, 12) : new T.CylinderGeometry(0.26, 0.26, 1.3, 12), matChrome);
  body.position.y = 1.15; body.castShadow = true; g.add(body);
  var head = sph(0.19, matChrome, 14); head.position.y = 1.86; g.add(head);
  var slit = box(0.16, 0.03, 0.02, matEye); slit.position.set(0, 1.88, 0.17); g.add(slit);
  var gl = glowSprite(texGlowRed, 0.36); gl.position.set(0, 1.88, 0.2); g.add(gl); g.userData.eyeGlow = gl;
  var armL = box(0.09, 0.85, 0.09, matChrome); armL.position.set(-0.34, 1.2, 0); armL.rotation.z = 0.12; g.add(armL);
  var armR = box(0.09, 0.85, 0.09, matChrome); armR.position.set(0.34, 1.2, 0); armR.rotation.z = -0.12; g.add(armR);
  var legL = box(0.11, 0.9, 0.11, matChrome); legL.position.set(-0.14, 0.48, 0); g.add(legL);
  var legR = box(0.11, 0.9, 0.11, matChrome); legR.position.set(0.14, 0.48, 0); g.add(legR);
  g.userData.anim = { legL: legL, legR: legR, armL: armL, armR: armR };
  return g;
}
function makeHK() { /* chasseur volant (inspiré HK-Aerial) */
  var g = new T.Group();
  var hull = sph(0.85, matBody, 12); hull.scale.set(1.7, 0.55, 1.1); g.add(hull);
  var tail = box(1.3, 0.16, 0.5, matJoint); tail.position.set(-1.2, 0.1, 0); g.add(tail);
  var eyeL = cyl(0.22, 1.5, matJoint); eyeL.rotation.z = Math.PI / 2; eyeL.position.set(1.15, -0.1, -0.5); g.add(eyeL);
  var eyeR = cyl(0.22, 1.5, matJoint); eyeR.rotation.z = Math.PI / 2; eyeR.position.set(1.15, -0.1, 0.5); g.add(eyeR);
  var search = glowSprite(texGlowRed, 1.6, 0.8); search.position.set(1.0, -0.55, 0); g.add(search);
  var gun = cyl(0.07, 1.1, matDark); gun.rotation.z = Math.PI / 2; gun.position.set(1.0, -0.32, 0); g.add(gun);
  var mz = new T.Object3D(); mz.position.set(1.6, -0.32, 0); g.add(mz); g.userData.muzzle = mz;
  var gl = glowSprite(texGlowRed, 0.7, 0.65); gl.position.set(0.6, -0.1, 0); g.add(gl); g.userData.eyeGlow = gl;
  return g;
}
function makeTANK() { /* HK terrestre lourd (inspiré HK-Tank) */
  var g = new T.Group();
  var hull = box(2.0, 1.25, 3.1, matBody); hull.position.y = 1.9; g.add(hull);
  var deck = box(1.4, 0.5, 1.6, matJoint); deck.position.set(0, 2.7, -0.3); g.add(deck);
  var visor = box(1.1, 0.12, 0.1, matEye); visor.position.set(0, 2.1, 1.58); g.add(visor);
  var gl = glowSprite(texGlowRed, 1.5, 0.8); gl.position.set(0, 2.1, 1.66); g.add(gl); g.userData.eyeGlow = gl;
  var canL = cyl(0.14, 1.5, matDark); canL.rotation.x = Math.PI / 2; canL.position.set(-0.55, 2.45, 1.5); g.add(canL);
  var canR = cyl(0.14, 1.5, matDark); canR.rotation.x = Math.PI / 2; canR.position.set(0.55, 2.45, 1.5); g.add(canR);
  var mz = new T.Object3D(); mz.position.set(0, 2.45, 2.3); g.add(mz); g.userData.muzzle = mz;
  var tL = box(0.6, 1.15, 3.0, matJoint); tL.position.set(-1.15, 0.62, 0); g.add(tL);
  var tR = box(0.6, 1.15, 3.0, matJoint); tR.position.set(1.15, 0.62, 0); g.add(tR);
  g.userData.anim = { legL: tL, legR: tR, armL: null, armR: null };
  return g;
}

/* ── Catalogue des machines ── */
var TYPES = {
  esk:  { make: makeESK,  hp: 60,  speed: 3.6, view: 48, fovDeg: 120, score: 100, h: 2.05, headR: 0.26, bodyR: 0.5,
          bolt: { dmg: 9,  spd: 55, r: 0.09, color: 0xff5522 }, range: 30, fav: [9, 18], burst: 3, bcd: [1.1, 2.0] },
  mim:  { make: makeMIM,  hp: 45,  speed: 6.4, view: 60, fovDeg: 150, score: 150, h: 1.95, headR: 0.22, bodyR: 0.42,
          melee: 12, range: 0 },
  hk:   { make: makeHK,   hp: 90,  speed: 6.0, view: 80, fovDeg: 360, score: 250, h: 11.5, headR: 0, bodyR: 1.1,
          bolt: { dmg: 11, spd: 46, r: 0.1, color: 0xff4418 }, range: 42, fav: [16, 26], burst: 2, bcd: [1.4, 2.4] },
  tank: { make: makeTANK, hp: 240, speed: 1.5, view: 55, fovDeg: 140, score: 400, h: 2.7, headR: 0, bodyR: 1.35,
          bolt: { dmg: 30, spd: 30, r: 0.3, color: 0xff6622 }, range: 34, fav: [14, 24], burst: 1, bcd: [2.6, 3.4] }
};

/* ── Tableaux d'entités ── */
var enemies = [], bolts = [], sparks = [];
var botGeoCache = null;

function spawnEnemy(typeKey) {
  var tp = TYPES[typeKey];
  var g = tp.make();
  var a = rnd(0, Math.PI * 2), r = rnd(72, 98);
  var e = {
    type: typeKey, tp: tp, g: g,
    pos: new T.Vector3(Math.cos(a) * r, typeKey === 'hk' ? rnd(10, 13) : 0, Math.sin(a) * r),
    hp: tp.hp * DIFFS[G.diff].ehp,
    yaw: rnd(0, Math.PI * 2), phase: rnd(0, 6),
    state: 'patrol', seen: 0, lastLOS: -9, lastHurt: -9,
    strafe: Math.random() < 0.5 ? 1 : -1, strafeT: 0,
    cd: rnd(0.5, 1.6), burstLeft: 0, burstT: 0,
    losT: rnd(0, 0.25), engaged: false,
    dead: 0, walkPh: rnd(0, 6)
  };
  g.position.copy(e.pos);
  /* cône de vision (bouton « cerveau des machines ») */
  if (!botGeoCache) {
    botGeoCache = new T.ConeGeometry(1, 1, 20, 1, true);
    botGeoCache.rotateX(-Math.PI / 2);
    botGeoCache.translate(0, 0, 0.5);
  }
  var cone = new T.Mesh(botGeoCache, new T.MeshBasicMaterial({
    color: 0xff3322, transparent: true, opacity: 0.1,
    blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide
  }));
  cone.scale.set(tp.view * 0.55, tp.view * 0.55, tp.view);
  cone.position.y = typeKey === 'hk' ? 0 : 1.85;
  cone.visible = false;
  g.add(cone); e.cone = cone;
  scene.add(g);
  enemies.push(e);
  return e;
}

/* ── Tir : lasers (segments testés en pur math, zéro Raycaster) ── */
var boltGeo = new T.BoxGeometry(0.09, 0.09, 1.5);
var boltMats = {};
function boltMat(color) {
  if (!boltMats[color]) boltMats[color] = new T.MeshBasicMaterial({ color: color, blending: T.AdditiveBlending, transparent: true, opacity: 0.95, depthWrite: false });
  return boltMats[color];
}
function fireBolt(from, dir, tp, owner) {
  var b = tp.bolt;
  var m = new T.Mesh(boltGeo, boltMat(b.color));
  var len = b.r > 0.2 ? 2.6 : 1.5;
  m.scale.set(b.r / 0.09, b.r / 0.09, len / 1.5);
  m.position.copy(from);
  var g = glowSprite(b.color === 0x35d0ff ? texGlowBlue : texGlowRed, b.r * 14, 0.85);
  m.add(g);
  m.lookAt(_v1.copy(from).add(dir));
  scene.add(m);
  bolts.push({ m: m, dir: dir.clone(), spd: b.spd, dmg: b.dmg * (owner === 'e' ? DIFFS[G.diff].edmg : 1), life: 2.6, owner: owner });
  G.fired += (owner === 'p' ? 1 : 0);
}
/* segment→boîte : renvoie la distance d'impact ou -1 */
function segBox(p0, p1, box) {
  _v1.subVectors(p1, p0);
  var len = _v1.length();
  if (len < 1e-6) return -1;
  _v1.normalize();
  _ray.origin.copy(p0); _ray.direction.copy(_v1);
  var hit = _ray.intersectBox(box, _v2);
  if (!hit) return -1;
  var d = _v2.distanceTo(p0);
  return d <= len ? d : -1;
}
/* segment→sphère : renvoie la distance d'impact ou -1 */
function segSphere(p0, p1, c, r) {
  _v1.subVectors(p1, p0);
  var len = _v1.length();
  if (len < 1e-6) return -1;
  _v2.subVectors(c, p0);
  var t = clamp(_v2.dot(_v1) / len, 0, 1);
  _v3.copy(p0).addScaledVector(_v1, t * len);
  var d2 = _v3.distanceToSquared(c);
  return d2 <= r * r ? t * len : -1;
}

/* ── Impacts (flashes additifs mis en commun) ── */
function sparkAt(pos, color, size) {
  var s = glowSprite(color === 0x35d0ff ? texGlowBlue : texGlowOrange, size || 0.7, 0.95);
  s.position.copy(pos);
  scene.add(s);
  sparks.push({ s: s, life: 0.22, grow: (size || 0.7) * 3 });
}
function updateSparks(dt) {
  for (var i = sparks.length - 1; i >= 0; i--) {
    var p = sparks[i];
    p.life -= dt;
    if (p.life <= 0) { scene.remove(p.s); p.s.material.dispose(); sparks.splice(i, 1); continue; }
    var k = 1 - p.life / 0.22;
    p.s.scale.setScalar(p.s.scale.x + p.grow * dt);
    p.s.material.opacity = 0.95 * (1 - k);
  }
}

/* ── Vision : LOS en pur math (boîtes seulement) ── */
function hasLOS(from, to) {
  for (var i = 0; i < COL.length; i++) {
    var d = segBox(from, to, COL[i]);
    if (d >= 0) return false;
  }
  return true;
}

/* ── Collision cercle vs boîtes (XZ) ── */
function collide(pos, radius) {
  for (var i = 0; i < COL.length; i++) {
    var b = COL[i];
    if (pos.y > b.max.y - 0.1) continue;
    if (pos.x > b.min.x - radius && pos.x < b.max.x + radius &&
        pos.z > b.min.z - radius && pos.z < b.max.z + radius) {
      var dxl = pos.x - (b.min.x - radius), dxr = (b.max.x + radius) - pos.x;
      var dzl = pos.z - (b.min.z - radius), dzr = (b.max.z + radius) - pos.z;
      var m = Math.min(dxl, dxr, dzl, dzr);
      if (m === dxl) pos.x = b.min.x - radius;
      else if (m === dxr) pos.x = b.max.x + radius;
      else if (m === dzl) pos.z = b.min.z - radius;
      else pos.z = b.max.z + radius;
    }
  }
  pos.x = clamp(pos.x, -104, 104);
  pos.z = clamp(pos.z, -104, 104);
}

/* ── Mise a jour d’une machine (vecteurs dédiés : les _v* partagés
   sont réservés aux helpers qui les écrasent) ── */
var _pp = new T.Vector3(), _mv = new T.Vector3(), _eye = new T.Vector3(), _tmp = new T.Vector3();
function updateEnemy(e, dt, time, player) {
  if (e.dead > 0) {
    e.dead -= dt;
    e.g.rotation.x = Math.max(-Math.PI / 2, e.g.rotation.x - dt * 3);
    e.g.position.y -= dt * 0.5;
    if (e.dead <= 0) { e.gone = true; scene.remove(e.g); }
    return;
  }
  var tp = e.tp, d = DIFFS[G.diff];
  var toP = _pp.subVectors(player.pos, e.pos);
  var dist = toP.length();
  e.losT -= dt;
  if (e.losT <= 0) {
    e.losT = 0.25;
    var eyeY = e.type === 'hk' ? e.pos.y : e.pos.y + (e.type === 'tank' ? 2.1 : 1.85);
    _eye.set(e.pos.x, eyeY, e.pos.z);
    _tmp.set(player.pos.x, player.pos.y + 1.55, player.pos.z);
    var canSee = dist < tp.view && hasLOS(_eye, _tmp);
    if (canSee && tp.fovDeg < 360) {
      var ang = Math.abs(((Math.atan2(toP.x, toP.z) - e.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      canSee = ang < (tp.fovDeg * Math.PI / 360) + 0.35;
    }
    e.lastLOS = canSee ? time : e.lastLOS;
    e.engaged = canSee || (time - e.lastHurt < 6) || (time - e.lastLOS < 3);
    if (e.cone.visible) e.cone.material.color.setHex(canSee ? 0xff2211 : 0x884433);
  }
  var sees = time - e.lastLOS < 0.4;
  _mv.set(0, 0, 0);
  var sp = tp.speed * (sees ? 1 : 0.45) * (e.type === 'mim' ? d.esp : 1);

  if (e.type === 'mim') {
    if (dist > 1.6) {
      _mv.copy(toP).normalize();
      _mv.applyAxisAngle(_tmp.set(0, 1, 0), Math.sin(time * 2.2 + e.phase) * 0.5);
    } else if (time - (e.lastHitT || 0) > 0.9) {
      e.lastHitT = time;
      hurtPlayer(tp.melee * d.edmg);
    }
  } else if (e.type === 'hk') {
    var favMid = (tp.fav[0] + tp.fav[1]) / 2;
    _tmp.set(-toP.z, 0, toP.x).normalize().multiplyScalar(e.strafe);
    var rr = dist > favMid + 4 ? 0.8 : (dist < favMid - 4 ? -0.8 : 0);
    _tmp.addScaledVector(_v3.set(toP.x, 0, toP.z).normalize(), rr);
    _mv.copy(_tmp).multiplyScalar(sp);
    e.pos.y += Math.sin(time * 1.3 + e.phase) * dt * 0.6;
    e.pos.y = clamp(e.pos.y, 8, 14);
  } else {
    var inFav = dist >= tp.fav[0] && dist <= tp.fav[1];
    if (!sees && dist > 6) {
      _mv.copy(toP).setY(0).normalize();
    } else if (!inFav) {
      _mv.copy(toP).setY(0).normalize().multiplyScalar(dist > tp.fav[1] ? 1 : -0.7);
    }
    e.strafeT -= dt;
    if (e.strafeT <= 0) { e.strafeT = rnd(1.2, 2.8); if (Math.random() < 0.5) e.strafe *= -1; }
    if (sees && dist < tp.range) {
      _tmp.set(-toP.z, 0, toP.x).normalize();
      _mv.addScaledVector(_tmp, e.strafe * 0.8);
    }
    if (_mv.lengthSq() > 0) _mv.normalize().multiplyScalar(sp);
  }

  if (_mv.lengthSq() > 0) {
    var oldX = e.pos.x, oldZ = e.pos.z;
    e.pos.x += _mv.x * dt;
    e.pos.z += _mv.z * dt;
    collide(e.pos, e.type === 'tank' ? 1.6 : 0.55);
    if (Math.abs(e.pos.x - oldX - _mv.x * dt) > 1e-4 || Math.abs(e.pos.z - oldZ - _mv.z * dt) > 1e-4) {
      e.strafeT = 0; e.strafe *= -1;
    }
  }
  for (var j = 0; j < enemies.length; j++) {
    var o = enemies[j];
    if (o === e || o.dead > 0 || o.gone || o.type === 'hk') continue;
    var dd = e.pos.distanceToSquared(o.pos);
    if (dd < 2.6 && dd > 1e-5 && e.type !== 'hk') {
      _tmp.subVectors(e.pos, o.pos).normalize();
      e.pos.addScaledVector(_tmp, dt * 1.6);
    }
  }
  e.g.position.copy(e.pos);
  var targetYaw = sees ? Math.atan2(toP.x, toP.z) : e.yaw + Math.sin(time * 0.4 + e.phase) * 0.002;
  var dyaw = ((targetYaw - e.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  e.yaw += dyaw * Math.min(1, dt * 6);
  e.g.rotation.y = e.yaw;
  var spdNow = _mv.length();
  var an = e.g.userData.anim;
  if (an && an.legL) {
    e.walkPh += dt * spdNow * 2.2;
    var sw = Math.sin(e.walkPh) * 0.55 * clamp(spdNow / tp.speed, 0, 1);
    an.legL.rotation.x = sw; an.legR.rotation.x = -sw;
    if (an.armL) { an.armL.rotation.x = -sw * 0.7; an.armR.rotation.x = sw * 0.7; }
  }
  if (tp.bolt && e.engaged && sees && dist < tp.range) {
    e.cd -= dt * d.erof;
    if (e.burstLeft > 0) {
      e.burstT -= dt;
      if (e.burstT <= 0) {
        e.burstLeft--; e.burstT = 0.14;
        var mz = e.g.userData.muzzle;
        e.g.updateMatrixWorld();
        mz.getWorldPosition(_v3);
        _v2.set(player.pos.x, player.pos.y + rnd(1.0, 1.5), player.pos.z).sub(_v3).normalize();
        var spread = 0.03 * d.esp * (1 + dist / 60);
        _v2.x += rnd(-spread, spread); _v2.y += rnd(-spread, spread); _v2.z += rnd(-spread, spread);
        _v2.normalize();
        fireBolt(_v3, _v2, tp, 'e');
        if (dist < 45) sfx.eshoot();
        var fl = glowSprite(texGlowRed, 0.8, 0.9); fl.position.copy(_v3); scene.add(fl);
        sparks.push({ s: fl, life: 0.1, grow: 2 });
      }
    } else if (e.cd <= 0) {
      e.burstLeft = tp.burst; e.burstT = 0;
      e.cd = rnd(tp.bcd[0], tp.bcd[1]);
      if (e.type === 'tank') sfx.tank();
    }
  }
  if (G.brain) e.cone.visible = true;
}

/* ── Dégâts aux machines ── */
function hurtEnemy(e, dmg, point, head) {
  if (e.dead > 0) return;
  e.hp -= dmg;
  e.lastHurt = G.time;
  e.engaged = true;
  sparkAt(point, 0xffaa66, 0.5);
  if (e.hp <= 0) {
    e.dead = 1.1;
    G.kills++;
    var pts = e.tp.score * (head ? 2 : 1);
    if (head) G.head++;
    G.score += pts;
    sfx.kill();
    if (e.type === 'tank') { sfx.boom(); G.shake = Math.max(G.shake, 0.5); sparkAt(e.pos.clone().setY(2), 0xff8844, 3.5); }
    killPopup((head ? 'TÊTE ! +' : '+') + pts);
    updateHUD();
    checkWave();
  } else {
    if (head) sfx.crit(); else sfx.hit();
    hitMarker(head);
  }
}

/* ── Vagues ── */
function waveComposition(n) {
  var list = [];
  var count = 2 + Math.round(n * 1.5);
  for (var i = 0; i < count; i++) {
    var r = Math.random(), t = 'esk';
    if (n >= 2 && r < 0.22) t = 'mim';
    else if (n >= 3 && r < 0.38) t = 'hk';
    list.push(t);
  }
  if (n >= 4 && n % 2 === 0) list.push('tank');
  return list;
}
function startWave() {
  G.wave++;
  G.spawnQueue = waveComposition(G.wave);
  G.spawnTimer = 0.5;
  var names = { esk: 'endosquelettes', mim: 'infiltrateurs mimétiques', hk: 'HK aériens', tank: 'HK lourds' };
  var counts = {};
  G.spawnQueue.forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
  var parts = Object.keys(counts).map(function (k) { return counts[k] + ' ' + names[k]; });
  showBanner('⚠ VAGUE ' + G.wave, 'Skynet déploie : ' + parts.join(' · '));
  sfx.wave();
  updateHUD();
}
function checkWave() {
  var alive = 0;
  for (var i = 0; i < enemies.length; i++) if (enemies[i].dead <= 0 && !enemies[i].gone) alive++;
  if (alive === 0 && G.spawnQueue.length === 0 && G.mode === 'play' && G.restTimer <= 0) {
    G.restTimer = 6;
    G.score += 150 * G.wave;
    showBanner('✅ VAGUE ' + G.wave + ' NETTOYÉE', '+' + (150 * G.wave) + ' pts · régénération… la prochaine vague arrive');
    sfx.pick();
  }
}
var SKYNET_LINES = [
  'SKYNET : production d\u2019endosquelettes augmentée de 40 %',
  'SIGNAUX HK DÉTECTÉS AU NORD DE LA ZONE',
  'SKYNET ANALYSE VOTRE COMPORTEMENT DE TIR…',
  'INfiltrateur mimétique signalé parmi la vague',
  'LA RÉSISTANCE SURVEILLE CETTE POSITION. TENEZ BON.'
];
