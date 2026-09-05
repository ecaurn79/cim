# 🎮 Idéation — L'arène de jeux IA du Hub C.I.M.

> Mission : faire du site une **destination de jeu** pour que les gens reviennent souvent,
> chaque jeu étant une **vitrine technologique de l'IA**. Zéro code dans ce document :
> uniquement la recherche (GitHub, forums, presse) et les concepts.
> Étude menée le 30 août 2026.

---

## 1. Le socle : pourquoi c'est crédible et faisable

- **Site 100 % statique** (alwaysdata) → tous les jeux doivent tourner **dans le navigateur**.
  C'est exactement la force du Hub : *« ça tourne chez vous, rien n'est envoyé nulle part »*.
- Le site a déjà une culture jeu : page Jeux IA (6 jeux), **Échecs IA** (moteur maison,
  8 niveaux). L'arène capitalise dessus.
- Les technologies clés sont matures et libres : **Three.js** (3D, MIT), **Phaser/PixiJS/KAPLAY**
  (2D, MIT), **Babylon.js** (3D complet, Apache-2.0), **rot.js** (roguelike/pathfinding, MIT),
  **Matter.js/Planck.js** (physique, MIT), **TensorFlow.js** (ML, Apache-2.0), **WebLLM**
  (LLM dans le navigateur, déjà utilisé par notre Démo chat).
- **Preuve éclatante du moment** : « Claude of Duty » (juillet 2026) — un FPS complet
  100 % procédural écrit par une flotte d'agents IA, **licencié MIT** (voir §3).

### Mécaniques de rétention transverses (à construire dès le 1er jeu)
| Mécanique | Détail |
|---|---|
| **Défi du jour** | Graine aléatoire dérivée de la date → même niveau pour tout le monde chaque jour, score du jour, série de jours joués (streak) |
| **Tableau d'honneur local** | Meilleurs scores en `localStorage` + « partagez votre score » en texte spoiler (style Wordle) |
| **Échelle de l'IA** | Chaque jeu expose ses niveaux d'IA (comme les échecs) → rejouer pour monter |
| **Badges** | Première victoire, battre le niveau max, défi du jour réussi 3 jours de suite… |
| **Hall « IA vs vous »** | Sur chaque jeu : un bouton « regardez l'IA jouer » (vitrine pédagogique signature du Hub) |
| **Page « Arène »** | Un hub de jeux unique avec cartes, badges gagnés, défis du jour — une raison quotidienne de revenir |

---

## 2. Les 12 concepts (classés par vague)

### 🌊 VAGUE 1 — Vitrines fortes, effort maîtrisé

#### 1. « Hub of Duty » — le FPS 3D né d'une équipe d'agents IA ⭐ (la demande du président)
- **Pitch** : un vrai FPS 3D dans le navigateur — et le jeu entier est **généré par des IA** :
  textures, sons, décors, animations 100 % procéduraux, zéro fichier artistique.
  Version du Hub : arène d'entraînement contre des **robots sparring** (laser/paintball,
  zéro sang) sur une place de marché réinterprétée en « place du FabLab ».
- **Vitrine IA** : les ennemis utilisent **perception, navmesh, comportement de couverture**
  (sous-système `ai` du dépôt). Bouton pédagogique « voir le cerveau des robots » :
  cônes de vision, points de couverture, chemins calculés affichés en surimpression.
  C'est LA démonstration « une IA vous traque vraiment ».
- **Source** : [mshumer/Claude-of-Duty](https://github.com/mshumer/Claude-of-Duty) — **MIT** ✓
  Three.js r180 + WebGL2, ~55 000 lignes, 11 sous-systèmes (rendu HDR, physique maison,
  ballistique, IA, audio synthétisé, HUD). Livré avec `ARCHITECTURE.md` (le contrat lu par
  les agents) et `prompt.md` — parfaits pour un article « comment une flotte d'agents
  construit un jeu » (méthode « Gauntlet Loop » de Matt Shumer, critique à l'aveugle).
- **Adaptation nécessaire** : build Vite → dist statique ; reskin non-violent (robots,
  laser tag) ; sélecteur de qualité (le pipeline HDR/GTAO/TAA est gourmand — le README
  documente les chutes à 12-17 fps sans optimisation : prévoir mode « Performance ») ;
  interface en français ; ajout des niveaux (1 robot lent → escouade tactique).
- **Contraintes** : desktop uniquement (souris + pointer lock), GPU requis pour le mode max.
- **Plan B léger (maison)** : un raycaster type « couloirs 3D » écrit par nous (pure JS, zéro
  dépendance) — tourne partout, même sur vieux PC, et reste une vitrine du « fait au club ».
  Idéal en niveau 1 si la machine du visiteur est faible : le jeu détecte et propose le mode.

#### 2. « L'IA apprend sous vos yeux » — neuroévolution vivante ⭐
- **Pitch** : 50 petits robots tâtonnent dans un parcours. Chaque génération, les meilleurs
  « se reproduisent » (réseaux de neurones + algorithme génétique). En 2 minutes, on VOIT
  l'IA passer du chaos au sans-faute. Le visiteur peut courir contre le champion entraîné.
- **Vitrine IA** : la seule démo où l'on **regarde l'IA apprendre en direct** — graphique de
  fitness par génération, réseau du meilleur agent affiché, curseur de vitesse ×1-×50.
- **Source** : [xviniette/FlappyLearning](https://github.com/xviniette/FlappyLearning) (**MIT** ✓,
  démonstration célèbre) ; variantes [DerWaldi](https://github.com/DerWaldi/neuroevolution-flappy-birds) (MIT),
  [romainsimon/neuroevolution](https://github.com/romainsimon/neuroevolution) (MIT, TensorFlow.js).
- **Effort** : faible-moyen (reskin « drones du FabLab », obstacle course, IHM pédagogique).

#### 3. « Donjon du Hub » — roguelike à génération procédurale ⭐ (rétention maximale)
- **Pitch** : un donjon différent à chaque partie (génération procédurale), monstres qui
  **vous poursuivent avec A\***, butin, pièges, mort définitive. « Défi du jour » = même
  donjon pour tout le monde, classement du meilleur exploreur.
- **Vitrine IA** : pathfinding visible (« voir les intentions des monstres » : lignes de
  marche A*), génération procédurale expliquée (découpage BSP + couloirs).
- **Source** : [rot.js](https://github.com/ondras/rot.js) (**MIT**) — boîte à outils roguelike
  de référence (donjons, FOV, A*, Dijkstra maps) ; inspiration : Hauberk (donjon procédural
  de Bob Nystrom, listé dans awesome-open-source-games).
- **Effort** : moyen. Contrôles flèches + tactile (grille). Rendu « pixels » Canvas 2D,
  esthétique cohérente avec le site (palette teal/pêche).

#### 4. « Motus IA » — le solveur qui lit dans vos mots
- **Pitch** : Wordle/Motus français jouable + mode **« l'IA devine votre mot »** : l'IA
  élimine les impossibles par **théorie de l'information** (entropie) et annonce ses
  probabilités avant chaque essai (« ce mot a 42 % de chances d'être le bon »).
- **Vitrine IA** : la pédagogie la plus simple du site — « comment une machine raisonne
  avec l'incertitude ». Panneau des mots candidats restants en direct.
- **Source** : clones Wordle MIT très nombreux sur GitHub + listes de mots français
  libres (dépôts « liste de mots français » CC/MIT). Le solveur est ~100 lignes.
- **Effort** : faible. Mobile parfait. Rétention : défi du jour évident.

### 🌊 VAGUE 2 — Le laboratoire

#### 5. « Le labo de particules » — sable qui tombe, chimie vivante
- **Pitch** : simulateur de sable avec 50+ éléments (eau, feu, glace, huile, plantes, poudre…)
  et milliers de réactions. Le joueur construit des expériences ; des **missions de physique**
  (éteindre l'incendie, refroidir le magma…) donnent des objectifs.
- **Vitrine IA/simulation** : physique à base de règles émergentes + un « assistant IA » qui
  propose des montages et explique les réactions (mode LLM léger optionnel).
- **Source** : [R74nCom/sandboxels](https://github.com/R74nCom/sandboxels) (447 ⭐, jeu familial
  affiché, licence à vérifier dans license.txt avant port) ; alternative GPL à éviter :
  ProjectSand (GPL-3.0 — contamination de licence, on s'abstient).
- **Effort** : moyen-moyen. Très « FabLab » dans l'esprit.

#### 6. « Défense du FabLab » — tower defense au cerveau visible
- **Pitch** : vagues de robots adverses cherchent le chemin le plus court vers l'imprimante 3D
  du club ; vous placez des tourelles. La difficulté ajuste la **qualité du pathfinding**
  ennemi (Dijkstra complet → glouton myope).
- **Vitrine IA** : A*/flux de terrain affichable en surimpression ; « regardez l'IA planifier ».
- **Source** : conception maison (rot.js pour le pathfinding), rendu Phaser/PixiJS (MIT).
- **Effort** : moyen. Genre hyper accrocheur, très demandé, mobile-friendly.

#### 7. « L'aquarium vivant » — écosystème de créatures qui évoluent
- **Pitch** : un étang avec plancton, poissons, prédateurs. Chaque créature a un petit génome
  (vitesse, vision, faim) ; les générations se reproduisent — on observe l'évolution et les
  **essaimeurs (boids)**. Le visiteur lâche la nourriture et perturbe l'écosystème.
- **Vitrine IA** : agents autonomes + sélection naturelle simulée ; compteur de générations,
  panneau génome du spécimen cliqué.
- **Source** : algorithme boids (Reynolds, domaine public) + génomes maison ; zéro dépendance.
- **Effort** : moyen. Magnifique en fond d'écran animé — très partagé.

#### 8. Jeux de plateau de grand format — « le club vous défie »
- **Pitch** : Gomoku (puissance 5) avec menace de victoire immédiate, Othello/Reversi solide,
  Dots-and-Boxes, **Backgammon** (expectiminimax avec dés — nouveau concept pédagogique :
  l'IA sous *incertitude*), Puissance 4 « grand maître » (actuel approfondi).
- **Vitrine IA** : chaque plateau affiche sa barre d'évaluation (déjà notre signature échecs).
- **Source** : moteurs maison (les nôtres) + [2048](https://github.com/gabrielecirulli/2048)
  (MIT) à intégrer à l'arène.
- **Effort** : faible par jeu, gros effet « plein de jeux ».

### 🌊 VAGUE 3 — Les signatures inoubliables

#### 9. « Le petit monde des agents » — notre Smallville 🏙️ (vitrine absolue)
- **Pitch** : une mini-ville vue de dessus où 8-12 agents-avatars (le chef d'équipe, la
  rédactrice, le vérificateur… — la famille de la page Agents IA) vivent leur journée :
  routines, déplacements A*, rencontres, mémoires, petites histoires émergentes.
  Le visiteur observe, clique un agent pour lire son « journal de bord » et peut poser une
  cake dans le parc pour bousculer les plans. Mode LLM local optionnel (WebLLM) pour des
  dialogues générés — sinon dialogues scrités à base de templates + mémoire.
- **Vitrine IA** : la figure de proue de la page « Agents IA », rendue monde vivant.
  Inspirée de Smallville/Stanford (joonspk-research/generative_agents, Phaser + backend
  lourd → nous : version 100 % navigateur, règles + mémoire, LLM en option).
- **Effort** : élevé mais décomposable (commencer par 4 agents + routines, puis émergence).
  Unique sur le web francophone grand public — énorme potentiel presse locale.

#### 10. « Grand Prix du Hub » — course 3D contre des pilotes IA 🏎️
- **Pitch** : circuit 3D low-poly, 3 pilotes IA (suivi de waypoints + anticipation de
  trajectoire + rubber-banding ajustable). Chrono, fantôme du meilleur tour, « défi du jour ».
- **Vitrine IA** : cônes de décision des IA en mode spectateur ; éditeur de difficulté.
- **Source** : base possible [HexGL](https://github.com/BKcore/HexGL) (Three.js, MIT),
  physique Matter.js/Planck.js si 2D vue de dessus.
- **Effort** : moyen-élevé (tuning pilotage). Gros effet waouh mobile impossible → desktop.

#### 11. « Dessine, l'IA devine » — Pictionary neuronal 🎨
- **Pitch** : on dessine un objet, un réseau de neurones (DoodleNet, 345 classes, 1 Mo,
  tourne dans le navigateur) devine en direct avec ses scores de confiance. Mode duel :
  faire deviner à l'IA en moins de 20 secondes.
- **Vitrine IA** : réseaux convolutionnels expliqués simplement, barres de confiance,
  « voir ce que voit l'IA » (carte de chaleur).
- **Source** : [DoodleNet + doodleClassifier de Yining Shi](https://github.com/yining1023/doodleNet)
  (MIT/Apache, modèles TensorFlow.js), jeu inspiré de « Quick, Draw! » de Google.
- **Effort** : faible-moyen (le modèle existe, il faut l'UI française + le jeu).

#### 12. « Aventurier du texte » — le récit piloté par notre WebLLM 📖
- **Pitch** : mini-JDR textuel français où le **LLM local** (WebLLM, déjà intégré dans la
  Démo chat) incarne le maître du jeu : scénario en graine, choix proposés, dés gérés par
  un moteur déterministe (le LLM ne « décide » pas les règles — honnêteté technique).
  Mode léger sans LLM : moteur à branches écrit maison.
- **Vitrine IA** : prolongement naturel de la Démo chat ; mémoire de partie = RAG miniature.
- **Source** : inspirations [RezixDev/llm-game](https://github.com/RezixDev/llm-game)
  (RPG à NPCs LLM, LM Studio) et AI Dungeon — nous : 100 % navigateur, modèles 0,5-1 B.
- **Effort** : moyen-élevé ; mobile limité (RAM) → prévoir détection + mode sans modèle.

---

## 3. Zoom « Claude of Duty » (vérifié sur le dépôt)

| Aspect | Constat |
|---|---|
| Licence | **MIT** ✓ (réutilisation et modification autorisées, crédit requis) |
| Technologie | Three.js r180 + WebGL2, uniquement ; **zéro asset** (textures/meshes/sons générés au chargement) |
| Contenu | ~55 000 lignes, 11 sous-systèmes : rendu HDR (ombres, GTAO, TAA, bloom), physique maison (BVH, capsule, ragdolls), armes balistiques, **IA : navmesh, perception, couverture**, audio spatialisé synthétisé, HUD complet |
| Origine | Écrit par une flotte d'agents Claude (juillet 2026), méthode « Gauntlet Loop » : constructeur + critiques à l'aveugle contre un benchmark réel ; `prompt.md` et `ARCHITECTURE.md` publics |
| Limites | Vite (à builder en statique — trivial) ; exigeant en GPU (prévoir mode performance) ; contenu militaire à **reskinner** pour l'association ; desktop only |
| Intérêt pour nous | (a) base FPS crédible en CC-BY-MIT, (b) **récit formidable** pour un article des Actus (« on a adapté le jeu construit par une armée d'IA »), (c) le sous-système IA navmesh/perception/couverture = démonstration vivante pour nos formations |

---

## 4. Hygiène des licences (à respecter absolument)

| Ressource | Licence | Verdict |
|---|---|---|
| Claude-of-Duty, Three.js, Phaser, PixiJS, KAPLAY, rot.js, Matter.js, Planck.js, FlappyLearning, 2048, HexGL, DoodleNet | MIT | ✅ fork/rebrand autorisé, conserver la mention d'auteur |
| Babylon.js, TensorFlow.js | Apache-2.0 | ✅ (mention + NOTICE) |
| ProjectSand | GPL-3.0 | ⛔ éviter (contagieux pour un site vitrine) |
| Sandboxels | « license.txt » dédiée | ⚠️ vérifier avant tout port |
| Smallville (Stanford) | code de recherche + backend GPT | ⚠️ inspiration conceptuelle uniquement |
| QuakeJS / Doom-wasm | GPL + contenus soumis à conditions | ⛔ écarter |
| Noms commerciaux (Pac-Man, Tetris, CoD…) | marques déposées | ⛔ jamais de nom repris : titres maison (« Tétracubes », « Hub of Duty ») |

---

## 5. Architecture technique commune (décisions à figer)

1. **Une page = un jeu** : `/jeu-<nom>.html` générée par `build.py` (SEO + menu « Arène »).
2. **Chargement paresseux** : le code du jeu (et les gros modèles) ne charge qu'au clic —
   `loading=lazy` et import dynamique ; rien ne pénalise le reste du site.
3. **« Regardez l'IA jouer »** : bouton standard présent sur CHAQUE jeu (signature du Hub).
4. **Défi du jour** : PRNG semé par la date (`seed = YYYYMMDD`) partagé par tous les jeux.
5. **Scores** : localStorage + export texte partageable ; (option phase 2 : micro-service
   alwaysdata pour un vrai classement — toujoursdata accepte Python/PHP).
6. **Accessibilité & confort** : contrôles clavier + tactile quand possible, réduction
   d'animations respectée, son coupable, détection de performance → mode allégé.
7. **Tests** : comme les échecs — moteurs testés en Node, pages en smoke-test jsdom,
   `node --check` systématique.

---

## 6. Proposition de séquencement (à valider par le président)

| Vague | Contenu | Effet |
|---|---|---|
| **v14 — Lancement de l'Arène** | Page « Arène » + Motus IA (4) + IA-qui-apprend (2) + Dots-and-Boxes (8) → 3 jeux, mécanique défi du jour | arène vivante, effort raisonnable |
| **v15 — Le grand FPS** | Hub of Duty (1) : fork CoD reskinné + mode raycaster maison en repli | LA vitrine virale |
| **v16 — Le laboratoire** | Donjon du Hub (3) + Défense du FabLab (6) | rétention longue |
| **v17 — Signatures** | Petit monde des agents (9) puis Dessine-devine (11) | presse & fierté |
| **v18+** | Aquarium (7), Grand Prix (10), Aventurier (12), plateau grand format (8) | catalogue complet |

> **Prochaine étape proposée** : valider la vague v14 (choix des 3 premiers jeux + nom de
> l'arène), puis on code. Chaque jeu suivra le pipeline éprouvé : moteur testé en Node →
> page assemblée par build.py → smoke-tests jsdom → validation complète du site.
