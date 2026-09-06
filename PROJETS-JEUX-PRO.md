# ⚔️ PROJETS-JEUX-PRO.md — La collection « Grands Jeux du Hub »
### Dossier de développement — v1 · 30 août 2026
> Objectif : des **vrais jeux professionnels jouables dans le navigateur**, pour faire du Hub
> une destination de jeu. Chaque jeu est une vitrine technologique (IA, simulation, 3D)
> et réutilise au maximum nos atouts : moteur FPS « Hub of Duty », moteur d'échecs/tactique,
> pipeline build.py + tests Node/jsdom, veille open source vérifiée (licences).
> Étude fondée sur : awesome-open-source-games, open-source-games.com, libhunt, libregamewiki,
> dépôts officiels GitHub (licences contrôlées une à une).

---

## 0. La règle d'or juridique (lue une fois, respectée partout)

- Les **mécaniques de jeu ne sont pas protégées** par le droit d'auteur : un « clone de Skyrim »
  est légal si ce sont *nos* noms, *nos* univers, *nos* visuels, *nos* textes.
- **Jamais** de marques ni d'assets originaux (Bethesda, NeocoreGames, GSC Game World, Lo-Fi Games…).
- Code tiers : MIT/Apache = réutilisable avec crédit ; **GPL = inspiration conceptuelle seulement**
  (on ne copie pas le code, pour garder notre site simple) ; CC0 = tout est permis.
- Dépôts « engine + data originale requise » (OpenMW, Daggerfall Unity, OpenXRay) : on étudie
  leur **architecture** (c'est open source), on ne redistribue pas leurs données.

---

## 1. Le socle transverse : le « KERNEL RPG » (à construire UNE fois)

Tout ce que les 7 jeux partagent — le vrai gain d'effort est là :

| Module | Contenu | Réutilisé par |
|---|---|---|
| **inv-core** | Inventaire par cases (drag & drop), slots d'équipement (arme, armure, casque, amulette, 2 anneaux…), poids, durabilité, **rareté** (commun → légendaire), **affixes procéduraux** (« +12 % coup critique »), comparaison d'objets | Tous |
| **loot-core** | Tables de butin, pondérations par niveau/rareté, « loot beam » sur les drops intéressants, graine déterministe (rejouabilité + défi du jour) | 1, 3, 4, 5, 6, 7 |
| **combat-tb** | Moteur tour par tour : initiative, actions par tour, dégâts élémentaires, statuts (poison, saignement, gel…), IA utilitaire (score des actions) | 1, 2, 4, 5 |
| **save-core** | Sauvegarde localStorage multi-slots + autosave + export/import (fichier texte partageable) | Tous |
| **hud-ui** | Panneaux du site déclinés en HUD de jeu (palette teal/pêche, cohérence visuelle C.I.M.) | Tous |
| **ia-vitrine** | Bouton standard « 🧠 voir le cerveau de l'IA » : intentions ennemies, scores de décision, chemins — la signature pédagogique du Hub | Tous |

Pipeline par jeu (identique aux échecs et au FPS) : `ARCHITECTURE.md` → moteur testé en Node →
page générée par build.py → smoke-tests jsdom → validation complète → page SEO sitemap.

---

## 2. Les 7 jeux (du plus stratégique au plus ambitieux)

### 🏰 JEU 1 — « LOGRES : La Table Ronde » — LE clone de King Arthur ⭐ FLAGSHIP
*(référence : King Arthur — The Role-Playing Wargame, NeocoreGames : mécaniques, pas les assets)*

- **Pitch** : La Bretagne des brumes s'effondre. Un souverain — vous — rassemble la Table Ronde,
  unifie les provinces une à une, et décide à chaque choix s'il passera à l'histoire comme un
  **roi légitime… ou un tyran**. Carte de campagne, héros-chevaliers, batailles tactiques au
  tour par tour, artefacts et quêtes : c'est LE jeu-événement du site.
- **Deux couches de jeu entrelacées** (comme l'original) :
  1. **Carte de campagne** : carte de Logres en ~12-16 provinces (nœuds), armées qui se déplacent
     au tour par tour, villages/gold, événements à choix narratifs (« Les paysans réclament justice :
     pendre le baron [-ordre] ou le juger [+fidélité] »), quêtes de chevalerie, **Table Ronde**
     (recruter des héros, gérer loyauté et jalousies), deux « confessions » à équilibrer
     (Ancienne Foi vs Clergé → bonus opposés), jauge **Légitime ↔ Tyran** qui débloque des
     capacités différentes.
  2. **Batailles tactiques** : grille hexagonale vue isométrique 3D légère (Three.js, terrain :
     forêts, collines, rivières — le terrain donne bonuses/malus de défense), 8-14 unités par camp,
     cavalerie/infanterie/archers/siège/mages, **héros** uniques avec artefacts équipés, sorts à
     mana, moral des régiments (fuite possible), objectifs variés (tuer le champion, tenir 6 tours,
     escorter).
- **Loot/équipement** (le cœur RPG) : chaque victoire donne **artefacts** (Épée dans la Pierre,
  reliques de saints, anneaux féeriques) avec affixes procéduraux ; inventaire complet des héros
  via **inv-core** ; forge/amélioration dans les provinces.
- **IA (la vitrine)** : IA utilitaire sur la carte (quand attaquer, quelle province défendre,
  quel chevalier recruter) + IA tactique (positionnement au terrain, ciblage, sorts) — et le
  bouton « cerveau » qui affiche les scores de décision de chaque unité ennemie.
- **Tech** : notre code (map hexagonale maison ou inspirée des algos Wesnoth), Three.js pour
  l'iso 3D, combat-tb + inv-core + save-core. Musique : génération Web Audio (cordes médiévales).
- **Inspiration/licences** : Battle for Wesnoth (GPL-2+ — inspiration des règles d'hex/moral,
  PAS de code), Battle Brothers (commercial — boucle mercenaire), King Arthur (mécaniques).
  Démos tactics utiles à étudier : Hexa Battle (TS+SVG), Ancient Beast, Tanks of Freedom (GPL).
- **MVP (v18-v19)** : 6 provinces, 4 chevaliers, 6 types d'unités, 5 batailles scénarisées,
  jauge tyran. **V1 complète (v20)** : 14 provinces, 10 héros, artefacts, Table Ronde, campagnes
  à fins multiples (3 fins).
- **Effort** : le plus gros du catalogue mais chaque brique sert aussi aux jeux 4, 5, 6.
  C'est l'ordre : KERNEL → Jeu 5 (tactique pure) → Jeu 1 (campagne autour).

---

### 🏹 JEU 2 — « La Confrérie du Gris » — RPG tactique mercenaire
*(référence : Battle Brothers ; Wesnoth pour le tour par tour)*

- **Pitch** : une confrérie de mercenaires endettés traverse un royaume en ruine. Contrats,
  salaires, blessures permanentes, chaque homme a un nom (et une famille qui pleurera).
- **Boucle** : carte du royaume (contrats → voyage → bataille tactique → butin → payer la troupe).
  Batailles : 6-12 mercenaires vs brigands/bêtes/morts-vivants, initiative, fatigue, couvert,
  armes avec zones d'atteinte (lance devant, hache traverse l'armure…).
- **Loot/équipement complet** : armes/armures piece par piece (tête/torse/mains), réparation,
  héritage des morts.
- **Rôle stratégique** : c'est le **laboratoire du moteur tactique de LOGRES** (jeu 1) — même
  combat-tb, sans la couche souverain. Sort AVANT Logres pour fiabiliser le cœur du jeu.
- **Tech** : 2D isométrique PixiJS (léger, mobile-friendly), combat-tb + inv-core.
- **MVP (v17)** : 1 carte, 3 contrats, 8 unités, 6 ennemis. V1 (v18) : économie complète, 20 ennemis.

---

### 💀 JEU 3 — « CENDRES » — le roguelike majeur
*(références : Dungeon Crawl Stone Soup, Brogue CE, NetHack)*

- **Pitch** : 26 niveaux procéduraux sous la Cité Cendrée, 12 classes, races, dieux qui
  **réagissent** à vos actes, Identification des objets, faim, mort définitive. La référence
  du genre, version navigateur français.
- **Systèmes clés** : génération procédurale par salles/couloirs (rot.js), FOV, identification
  (potions inconnues !), polymorphie, dieux avec piété/punitions, escaliers, branches.
- **Loot/équipement** : le plus riche du catalogue — armes/armures/joaillerie avec enchantements,
  maudits, artefacts uniques par run.
- **Tech** : rot.js (MIT) + rendu « tiles » Canvas, contrôles clavier + tactile.
- **Inspiration/licences** : DCSS (code GPL2+/media CC0 → inspiration + design de tables,
  pas de code), Brogue CE (GPL → inspiration), NetHack (licence NetHook-like → inspiration).
- **MVP (v16)** : 8 niveaux, 4 classes, 60 objets, 20 monstres, dieux simplifiés.

---

### 🔥 JEU 4 — « RUINES D'ARKHANTIS » — hack & slash isométrique (Diablo-like)
*(références : Diablo (moteur libre Freeablo pour l'étude), Flare RPG)*

- **Pitch** : cliquer, découper, ramasser, improviser un build. 5 actes de donjons procéduraux,
  boss uniques, 3 classes (Berserker / Occultiste / Chasseresse), arbres de compétences.
- **Le purgatoire du loot** : raretés colorées, affixes procéduraux (inv-core au maximum),
  sets, loot beams, cube de transmutation.
- **Tech** : PixiJS iso, loot-core, save-core (runs courtes → défi du jour : « faille du jour »
  avec modificateurs aléatoires partagés par tous).
- **Inspiration/licences** : Flare RPG (GPL → inspiration), Diablo JS (dépôt pédagogique,
  licence à vérifier avant tout usage — sinon inspiration), Freeablo (GPL → étude).
- **MVP (v19)** : 1 acte, 1 classe complète, 40 affixes, 3 boss.

---

### 🌨️ JEU 5 — « NORDHEIM » — le « clone de Skyrim » (open world 3D)
*(références : Skyrim/OpenMW/Daggerfall Unity — architectures étudiées, code non copié)*

- **Pitch** : une vallée nordique ouverte de 2×2 km à explorer librement : montagnes, forêts,
  villages, ruines-donjons, guildes, dragons antiques… En 3D procédurale Three.js,
  troisième personne, chamarré de systèmes RPG : niveau, compétences par usage, craft,
  maisons achetables, quêtes de guilde (Compagnons ↔ Collège ↔ Volontés).
- **Boucle** : quêtes courtes (chasse, escortes, ruines) → XP/compétences → équipement forgé →
  zones plus dangereuses. Monde généré par graine (2-3 mondes « officiels » + monde du jour).
- **Loot/équipement** : coffres, butin de bêtes (fourrure, crocs), forge, enchantements.
- **Tech** : Three.js (notre maîtrise Hub of Duty), terrain heightmap procédural, végétation
  instanciée (InstancedMesh), PNJ à agendas simples (journée type), combat mêlée/arc/magie.
  Étude d'architecture : Daggerfall Unity (**MIT** — lectures recommandées de leur génération
  de monde), OpenMW (GPL → concepts), OpenTESArena (Apache → concepts).
- **Honnêteté de scope** : c'est un « Skyrim-lite » (village→ruine→guilde→boss régional),
  PAS un MMO. Le monde 2×2 km avec 30 PNJ est déjà 10× plus grand que tout ce qu'on a fait.
- **MVP (v21)** : la vallée, 1 village, 6 donjons, chasse/craft, 2 guildes. V1 (v22) : dragons,
  maison, arcs narratifs.

---

### ☢️ JEU 6 — « LA ZONE » — le « clone de S.T.A.L.K.E.R. » (survie FPS)
*(référence : S.T.A.L.K.E.R. / moteur X-Ray OpenXRay GPL — étude uniquement)*

- **Pitch** : après le « Grand Incident », la Zone interdite attire des artefacts anormaux…
  et tue les imprudents. FPS survie **construit sur le moteur de Hub of Duty** (réutilisation
  directe : rendu, armes, IA, audio procédural) + : anomalies visuelles, détecteur d'artefacts
  (geiger cliquetant), radiations, faim/sommeil, emissions qui ragent, factions (militaires,
  chasseurs d'artefacts, culte de la Zone), stash et commerce, quêtes de camps.
- **Boucle** : préparer (équipement, anti-rad) → entrer en Zone → gérer ses jaunes → artefacts
  → vendre → améliorations → aller plus loin. Jours qui passent (cycle jour/nuit).
- **Loot/équipement** : artefacts (bénéfiques + malus !), armes réparables, combinaisons,
  munitions rares — l'inventaire le plus « survival » de la collection.
- **Tech** : extension du FPS existant (le plus rapide à démarrer de tous !), monde clos de
  500×500 m très dense, save-core (le joueur repart du camp).
- **MVP (v20)** : la Zone de jour, 6 types d'anomalies, 10 artefacts, 2 camps, quêtes simples.

---

### 🚚 JEU 7 — « CARAVANES » — le « clone de Kenshi » (sandbox d'équipe)
*(référence : Kenshi, Lo-Fi Games — mécaniques ; Cataclysm DDA pour la survie)*

- **Pitch** : dans un désert-post-apo sans héros élu, vous débutez **seul et faible**. Recrutez,
  formez, bâtissez un avant-poste, commerciez, perdez des bras (blessures permanentes,
  esclavagistes!), écrivez votre histoire. Le jeu où perdre fait partie du récit.
- **Systèmes clés** : escouade jusqu'à 12 personnages avec compétences par entraînement
  (« apprendre en faisant »), création de base (murs, fermes, ateliers, défense), factions avec
  territoires et opinions, commerce entre villes, captures/esclavage/rendez-vous, membres
  mutilés (prothèses !), lits/blessures/repas.
- **Tech** : 2.5D PixiJS (vue iso), sim légère hors-écran, save-core à autosave agressive.
- **Inspiration/licences** : Kenshi (mécaniques — rien d'autre), CDDA (GPL → inspiration survie),
  Veloren (open source action-RPG → étude de gameplay).
- **Scope honnête** : LE plus ambitieux après Logres ; recommandé en dernier (v22+) quand
  inv-core/save-core/loot-core sont rodés par 4 autres jeux. Découpage MVP strict :
  1 personnage → escouade de 3 → commerce → base → factions.

---

## 3. Ordre de développement recommandé (chaque pierre sert à la suivante)

| Phase | Livrable | Pourquoi cet ordre |
|---|---|---|
| **v15** | **KERNEL** : inv-core + loot-core + save-core + hud-ui (+ tests Node) | Fondation de 6 jeux sur 7 |
| **v16** | **CENDRES** (roguelike) — premier utilisateur du KERNEL | Genre le plus « autonome », forte rejouabilité immédiate |
| **v17** | **LA CONFRÉRIE DU GRIS** (tactique) | Fie le moteur de batailles tour par tour |
| **v18** | **LOGRES** MVP (le flagship) | Assemble carte + tactique + héros + artefacts |
| **v19** | LOGRES V1 + **RUINES D'ARKHANTIS** (hack&slash) | Loot poussé à son sommet |
| **v20** | **LA ZONE** (FPS survie, moteur Hub of Duty) | Réutilisation directe, vitesse élevée |
| **v21** | **NORDHEIM** (open world 3D) | Le plus spectaculaire, arrive quand la forge est chaude |
| **v22** | **CARAVANES** (Kenshi-like) | Le sandbox ultime, tous les systèmes prêts |

Entre chaque : une vague «maintenance/contenu» (articles, images, retours joueurs).

## 4. Points communs d'intégration au site
- Une page par jeu (build.py, SEO, menu « Arène »), bannières croisées, défi du jour
  (graine YYYYMMDD), records localStorage, bouton « 🧠 cerveau de l'IA », partage de score.
- Perf : chargement paresseux (le code du jeu ne se charge qu'au clic), budget < 100 draw calls
  (3D), pages 2D < 1 Mo de code inline, tests automatiques avant chaque déploiement.
- Page « Arène » refondue : 15+ jeux (7 petits + 7 grands + échecs + FPS) classés par genre,
  badges, séries de défis quotidiens.

## 5. Décisions attendues du président
1. Valider l'**ordre** des phases (ou le corriger).
2. Choisir le premier chantier : recommandation forte = **KERNEL + CENDRES** (v15-v16).
3. Nommer (ou laisser nommer) les jeux — titres de travail ci-dessus modifiables.
4. Pour LOGRES : préférer batailles en **hexagones 2D iso** (plus rapide, mobile) ou **3D
   légère Three.js** (plus proche de King Arthur) ? Recommandation : 2D iso d'abord, la 3D en V1.
