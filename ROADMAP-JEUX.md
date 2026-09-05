# Feuille de route — transformer nos jeux en vrais jeux plein écran, jouables et professionnels

> Document de pilotage, écrit pour tout le monde (pas seulement les ingénieurs).
> État au 4 septembre 2026 · vague v30 livrée · prochaine vague : profondeur de jeu (progression, économie, contenu par jeu).

---

## v35 (livrée) : la piste du blocage GPU réel — coques supprimées, orbe au cœur, télémétrie à l'écran

Analyse du dernier playtest (capture joueur : halos et losanges DOM visibles, mais TOUT le WebGL des ennemis absent, y compris la boule rouge pourtant visible en v31) : entre v31 et v33, la seule nouveauté structurelle côté rendu était les « coques » inversées (matériau exotique : BackSide + depthTest:false + transparent + renderOrder élevé). Sur le banc logiciel elles passent ; sur GPU réel elles sont le suspect n°1 d'un blocage du rendu des groupes ennemis. v35 : (1) coques SUPPRIMÉES du pipeline ; (2) remplacées par un orbe orange AU CŒUR de chaque machine — même famille de sprite que la boule rouge vue chez le joueur (chemin de rendu prouvé sur son GPU) ; (3) télémétrie 3D AFFICHÉE DANS LE HUD (« n obj · n tri » à côté de la version) : la prochaine capture du joueur dira immédiatement si son GPU dessine les ennemis. Banc : 18 enfants par groupe (17 + orbe), delta 544 triangles / 25 draw calls par ennemi, corps mesuré à 7 m (916 px, luminance 114). Reste à la vague suivante : passe beauté des modèles (robots plus détaillés façon Terminator) une fois le rendu confirmé chez le joueur. Syntaxe 3/3, smoke 22/22.

---

## v34 (livrée) : le corps enfin rendu — la chasse à la « miniature invisible » est close

Le signalement « les marqueurs s'affichent mais pas les modèles 3D qui se déplacent » a mené à trois causes réelles, chacune prouvée par instrument :

| Cause prouvée | Correctif | Mesure |
|---|---|---|
| Apparition en MINIATURE : la « matérialisation » (échelle 5 % → 100 % en 0,55 s de temps de jeu) durait des dizaines de secondes en FPS faibles — les ennemis chargeaient à 25 cm de haut (échelle mesurée 0,12 à 7 m du joueur !) | apparition à TAILLE RÉELLE, la colonne d'énergie reste le signal d'arrivée | gscale mesuré : 0,12 → 1,00 |
| Corps MeshStandard dans une chaîne nuit + tone mapping ACES : même l'émissif fort restait noir (luminance 19 puis 64/255 mesurées) | matériaux NON ÉCLAIRÉS (MeshBasic, même chemin que le ciel qui s'affiche toujours) puis teinte INCANDESCENTE | 2,2 m : 10 980 px · 7 m : 508 px · 20 m : 170 px à luminance 110-125 |
| Halo thermale v33c ×7,4 trop grand (8 300 au lieu de 1 115 px·m) : inondait l'écran | facteur corrigé (586,7 px·m × 1,9 m / distance) | halo mesuré 158 px à 7 m ≈ 1,9 m réels |

Le paquet complet de visibilité v34 : corps incandescents toujours peints (indépendants de l'éclairage) + silhouette orange à travers les obstacles (hull depthTest:false, 21 coques vérifiées en scène) + halo thermale à taille réelle du corps + losange avec distance sur chaque ennemi + balise/pilier à échelle de distance + compteur MACHINES + pings audio + pastille de version (menu, HUD, bannière, console). Outils de diagnostic créés : HUBD_DEBUG.{gfx() (renderer.info + positions réelles), toggle(i) (A/B triangles), dump(i) (matériaux des meshes), coques(i), proj(i), glows(), brackets()}. Pièges rencontrés : addHull sur les helpers invisibles (dôme plein écran), récursion traverse (crash), échantillonnage avant l'apparition réelle du spawn, métriques polluées par les sprites — tous documentés pour éviter la répétition. Syntaxe 3/3, smoke 22/22.

---

## v33 (livrée) : « ils me foncent dessus mais on ne les voit pas » — le corps enfin mesuré, puis rendu visible

Cette fois le signalement était précis et la mesure a donné raison au joueur : ennemi placé à 5 m en ligne de vue → **luminance du corps 19/255** (noir sur noir). Toutes nos preuves antérieures mesuraient le halo des balises, jamais le corps. Causes empilées et corrigées :

| Cause mesurée | Correctif | Preuve |
|---|---|---|
| Corps gris sombre + soleil rasant + tone mapping ACES : noirs dans l'ombre (19/255 à 5 m) | émissifs forts 0x94402a/0x74301f + « torche » du joueur (PointLight suit la caméra, constante) | luminance torse mesurée en hausse ; matériaux vérifiés live via HUBD_DEBUG.mat() |
| Balises XL v30 : le halo masquait le corps de près (soleil additif devant la silhouette) | balise + pilier à échelle de distance (gros au loin, discret à moins de 7 m) | capture v32 : halo réduit, silhouette réapparue |
| Machines en charge PASSANT DANS les gravats (colliders 0,3 < rayon visuel) et s'y fondant (pierre beige) | colliders gravats 1,1 | positions ennemis désormais hors des amas |
| Un corps peut rester masqué quelques secondes en pleine charge (immeuble) | 1) contour 3D orange « coque inversée » depthTest:false : silhouette À TRAVERS les obstacles ; 2) cadre DOM orange + distance « n m » sur CHAQUE ennemi à l'écran, dessiné par le navigateur au-dessus de tout | capture : ennemi derrière l'immeuble → losange « 7 m » affiché à sa position exacte ; coques vérifiées (21 en scène, test vert FrontSide 1 576 px) |

Enseignement bancaire de test : `HUBD_DEBUG.{proj(i) (torse projeté écran), mat(), hulls(), hul(side,hex), brackets()}` ; attendre l'APPARITION réelle du premier spawn (boucle 1,5 s) — les ennemis naissent à 5 % d'échelle (0,55 s) et toute mesure avant = faux négatif ; toujours échantillonner À LA POSITION PROJETÉE du torse, jamais au centre d'écran. Deux faux positifs éliminés au passage : addHull sur les helpers invisibles (dôme saumon plein écran — le cône de vision), récursion traverse→add→traverse (crash du contexte). Syntaxe 3/3, smoke 22/22.

---

## v31 (livrée) : l'ennemi caché est désormais INDIQUÉ, et il vient à vous

Nouveau signalement avec capture à l'appui : on voit la lueur rouge au bord d'un rocher/immeuble, mais pas l'ennemi. Le scanner du code a trouvé le mécanisme réel : un endosquelette qui vous VOIT s'arrête à sa distance de tir préférée (9-18 m) — s'il a un rocher ou un coin d'immeuble entre lui et vous, **son corps reste derrière l'obstacle indéfiniment** (seule sa balise dépasse). Ce n'était ni le spawn, ni le fog, ni les matériaux : c'est l'IA « cover » elle-même.

| Cause trouvée | Correctif v31 | Preuve |
|---|---|---|
| L'IA garde la position derrière un couvert sans jamais déborder | si un ennemi est caché du joueur depuis > 2,5 s, il AVANCE vers lui (assaut) jusqu'à être visible | sonde : ennemi téléporté dans un immeuble → il en ressort seul (dJ 43 → 24) |
| Rien n'indique un ennemi masqué qui ne bouge pas | losange rouge « rayons X » affiché SUR l'ennemi dès qu'il est à l'écran mais occlus (suivi d'occlusion 4×/s, maths pures) | capture v31 : losange visible sur l'ennemi caché, HUD « MACHINES 4 » |
| Vagues 1-2 parfois trop patientes pour un premier contact | vagues 1-2 : traque permanente à pleine vitesse | distances mesurées 11 → 9-10 m et décroissantes |
| Impossible de savoir quelle version on joue | pastille « v31 » DANS le HUD en jeu + badge au menu + version dans la bannière de la vague 1 + message console | capture : « v31 » à droite du score |

 Banc de test : hook HUBD_DEBUG.tp(i,x,z) (téléportation d'ennemi), .col() (boîtes des bâtiments), .marks() (état des marqueurs), ennemis() enrichi (cache: booléen, dJ: distance au joueur). Protocole de preuve reproductible : téléporter un ennemi au centre du bâtiment le plus proche dans l'axe du regard → sonder 1×/700 ms → le losange apparaît tant que `cache:true` et disparaît quand il ressort. Syntaxe 3/3, smoke 22/22.

---

## v30 (livrée) : « je ne vois toujours pas les ennemis » — la lisibilité passée au scanner

Nouveau signalement sur HUB après v28. Cette fois, la preuve a changé de nature : on ne compte plus des pixels, on REGARDE l'écran du joueur (captures jointes au banc de test).

| Cause trouvée | Correctif v30 | Preuve |
|---|---|---|
| Corps des machines (matériau partagé) sans émissif : face au joueur, elles pêchent dans leur propre ombre, noires sur fond noir | émissif sombre chaud sur les 3 matériaux de corps — lisibles même à l'ombre | capture t=8 s : silhouette visible près du viseur |
| Balise rouge de 1 unité ≈ 5-7 pixels à 12 m : invisible pour un œil humain (nos sondes la comptaient, pas vous) | balise XL 2,2-2,8 unités + PILIER de lumière vertical de 8,5 unités au-dessus de chaque machine | capture t=8 s : halo rouge plein centre, impossible à rater |
| Aucune information « combien et où » | compteur rouge « MACHINES n » en haut d'écran (vivantes + en file) + ping audio de détection à chaque apparition | HUD « MACHINES 4 » sur les captures |
| Spawn 11-16 m parfois loin d'un premier regard | spawn à 9-13 m, toujours en ligne de vue | sonde : ennemis à 25 m sur x=-3/z=25 (vague 1) |

Mesures : pixels rouges 8 478 (t=8 s) et 13 023 (t=16 s) contre 1 289-1 573 en v28 — présence visuelle ×8. Marqueur anti-cache : badge « VERSION v30 » au-dessus du bouton de lancement + message console. Syntaxe 51/51, smoke 22/22 pages.

Même vague, côté images : les 10 visuels éditoriaux ont été RÉGÉNÉRÉS en style photoréaliste-cinématographique (langage d'appareil photo : boîtier, focale, ouverture ; éclairage volumétrique, pratiques, rim light ; imperfections : grain, poussière, usure ; négatifs anti-CGI — synthèse des pratiques 2026, guides + Reddit/r-archviz + cookbook OpenAI). Mêmes noms de fichiers : les légendes et les 6 pages intègrent automatiquement.

---

## v28 (livrée) : ennemis toujours lisibles, clic au millimètre

| Jeu | Signalement | Cause | Correctif | Preuve |
|---|---|---|---|---|
| HUB | « clignotent en rouge puis disparaissent » | spawn parfois derrière un immeuble + balise stroboscopique | spawn testé en ligne de vue, balise calme, hit-stop sélectif, strafe réduit | pixels rouges 1289/449/1573 à 8/14/20 s ; capture t=20 s |
| Caravanes | « pas centré, ne va pas où l'on clique » | repère écran à +40 px du haut ; décalage de formation caché | repère à 55 % de hauteur ; membre 0 exactement au clic | centre (724,450)/1440×900 ; écart clic→arrivée 0,00 |

Référence étudiée : mshumer/Claude-of-Duty (MIT) — perception testée, effets budgétés, déterminisme. Prochaine vague (v29) : profondeur de jeu (progression, économie, contenu).

---

## v27 (livrée) : « Corrige, améliore et complète » — la jouabilité et le ressenti

| Jeu | Signalement | Réponse |
|---|---|---|
| LOGRES | « cliquer fin de tour pour chaque adversaire qui ne bouge jamais » | BUG RÉEL : `R.showMoves` inexistant cassait la boucle de tours — API exposée, bannières de phase ; prouvé : ennemis actifs seuls, 0 erreur |
| Confrérie | « exactement les mêmes jeux » | moteur partagé assumé, mais phase annoncée + identité cramoisie distincte |
| Caravanes | « pas déplaçable, injouable, zones identiques, quitter impossible » | vitesse ×3, repère pulsé, tuteur, ✕ de sortie, villes seedées par graine, refonte visuelle (dunes, ombres, palmiers, nuit) |
| Nordheim | « zones identiques → niveaux complètement différents » | génération paramétrée par vallée (relief, forêt, rochers, essences) + palettes |
| HUB | « ennemis clignotent puis disparaissent » | télégraphe d'apparition, balises lumineuses, flèches hors-écran, hit-stop — lisibilité prouvée par capture |
| Cendres | « très moche » | lumière de torche, palette crypte, sols variés, vignette |
| Arkhantis | « rien d'un hack & slash » | combo ×N, tremblement d'impact, feedbacks (recherche Vlambeer appliquée) |
| La Zone | « améliorer graphismes et contenu » | arbres morts, cristaux lumineux + resync zn2-game.js |

Leçon de la vague : TOUT patch doit être suivi de la resynchronisation de sa copie (logres-3d.js, caravanes-ui.js, zn2-game.js cette fois encore) et d'une preuve DANS LE FLOW RÉEL du joueur (la sonde « cliquer les bons boutons » a révélé le bug LOGRES que le smoke passait à côté). Prochaine vague (v28) : profondeur — progression, économie, contenu additionnel par jeu.

---

## v26 (livrée) : chaque « pourquoi » du playtest a sa réponse et sa preuve

| Signalement | Cause racine | Correctif | Preuve |
|---|---|---|---|
| HUB « toujours aucun ennemi » | spawn ancré à l'origine du monde | spawn relatif au joueur (9–14 m, cône frontal) | sonde (2 esk · 8,9 m · devant 0,89) + capture VAGUE 1 |
| La Zone « vide et grise » | `#znView` en `display:none` | conteneur affiché + lumière repolie | capture : monde, anomalies, intro |
| Cendres/Confrérie/Logres/Arkhantis gris | stages sans hauteur CSS ; `#akHud` écrasait la grille | hauteurs + HUD en bloc | Arkhantis capturé : donjon, monstres, portail |
| Nordheim : 3 vallées identiques | graines à différences imperceptibles | palette + brume + décor par graine | 3 captures : vert / olive / brun |
| Caravanes : 3 zones identiques | sable codé en dur + code vivant ≠ code patché | palettes par graine (sol + minimap) + resync | pixels rgb distincts ×3 |
| Caravanes : perso immobile, quitter impossible | l'aide auto recouvrait le canvas ; Échap refait v25 | auto-aide supprimée ; clic gauche = marcher ; rappel permanent | (440,440) → (451,446) ; Échap → menu |

Leçon transverse : quand deux copies du même code coexistent (body inline + src), TOUT patch doit être suivi d'une resynchronisation — zn2-game.js et caravanes-ui.js l'ont toutes deux subie. Prochaine vague (v27) : enrichir les boucles de jeu (progression, sauvegardes, contenus) sur ces bases désormais saines.

---

## v25 (livrée) : lisible d'abord — la leçon du deuxième playtest

Les jeux existaient, les menus aussi : ils étaient **illisibles** (boîtes noires sur fond noir) et certains
parcours bloquaient (aide non fermable, ennemis hors de vue, spawn dos à l'action). Recherche UX à l'appui
(jouable en 15 s, une action par écran, enseigner en jouant) : panneaux contrastés + gros boutons sur les
8 jeux, plein écran qui occupe vraiment l'écran, vagues 1-2 du HUB à 20-32 m, La Zone orientée vers une
anomalie visible dès l'entrée + message d'accueil + alerte si le rendu est bloqué, « Premiers pas »
permanents sur Nordheim, Échap (aide → sauvegarde → menu) sur Caravanes, et zéro lien jeu dans le menu
(échecs compris).

---

## v24 (livrée) : La Zone nouvelle sur le moteur de HUB OF DUTY + finitions

- **La Zone est reconstruite** : le raycasting 2D a laissé place à une vraie 3D maison (WebGL via Three.js) qui réutilise le squelette de HUB OF DUTY — contrôleur ZQSD/flèches en positions physiques (AZERTY natif), visée libre quand la capture de souris est refusée (flèches ← → pour pivoter), hitscan, vagues, HUD, audio synthétisé, plein écran au lancement. Boucle complète : Hangar (soins, boulons, munitions, ceinture, détecteur MK II) → Zone (7 anomalies pulsantes, boulons-sondes (F), artefacts à malus, chiens aveugles qui chassent au bruit) → émission (sirène 15 s, abri béton ou porte sud) → extraction → revente. Après chaque émission la Zone se réorganise ; trois émissions et la sortie se termine.
- **Testé en partie pilotée de bout en bout** (navigateur simulé, WebGL simulé) : achat au Hangar, lancement, ramassage d'artefact, émission à découvert (-30 PV), émission à l'abri (0 dégât), extraction (+300 or crédités), écran de fin — et zéro erreur. Un message propre s'affiche si WebGL est absent.
- **Finitions transverses** : ligne de commandes ajoutée au-dessus des aires de jeu de la Confrérie, de LOGRES et d'Arkhantis ; nouvelle image-clé pour La Zone ; caps de pixels déjà vérifiés sur les jeux 3D (fluidité).

---

## Où nous en sommes (v23, livré)

Chaque point correspond à une remarque de playtest. Tout est corrigé, reconstruit et re-testé.

| # | Constat du playtest | Ce qui a été fait en v23 |
|---|---|---|
| 1 | « L'IA des échecs joue très mal, même au niveau maximum » | Le moteur était étranglé : il écrivait la notation de chaque coup **pendant** la réflexion (~2 800 positions/s, profondeur 4 max). Il réfléchit maintenant sans cet overhead (~22 400 positions/s, **×8**), avec une règle anti-« effet d'horizon » en plus. Résultats mesurés : le Grand Maître trouve le mat en 1, capture la dame pendante qu'il ratait avant, et **mate le niveau Découverte en 29 demi-coups** (+22 de matériel). Maître = 4-5 coups d'avance, Grand Maître = jusqu'à 8 en 3,5 s. |
| 2 | « Des liens de jeux partout dans le menu » | Les 8 liens jeux sont retirés du menu de **toutes** les pages. Les jeux restent liés depuis l'accueil via **une seule carte-portail** vers `jeux-video.html`, qui liste bien les 9 jeux (les 8 vérifiés + échecs). |
| 3 | « Les jeux ne se lancent pas en plein écran » | Les 8 jeux démarrent maintenant en plein écran au clic sur le bouton de lancement : **plein écran natif** du navigateur quand il l'autorise, sinon **plein écran simulé** (l'aire de jeu remplit tout l'écran — utile dans les fenêtres intégrées). Un bouton « ⛶ Plein écran » reste disponible en jeu ; **Échap** sort. Testé automatiquement : lancement, sortie par Échap, relance, sortie par « Sauver & menu ». |
| 4 | « Ça doit marcher en AZERTY » | Audit complet : tous les jeux pilotés au clavier utilisaient déjà les **positions physiques des touches** (ZQSD fonctionne donc nativement). Deux vrais bugs corrigés : la touche **M** (carte/PDA de Nordheim et La Zone) était cherchée au mauvais endroit sur AZERTY ; les **compétences 1-4 d'Arkhantis** ne répondaient pas sur AZERTY sans Maj. |
| 5 | « HUB OF DUTY : plein écran au lancement, et aucun ennemi rencontré » | Deux causes : le jeu exigeait la « capture de souris » (refusée dans les fenêtres intégrées → caméra bloquée, on meurt sans rien voir) ; et pas de plein écran automatique. Corrigé : plein écran au lancement + **visée libre de secours** (la souris vise sans capture, flèches ← → pour pivoter, Échap pour la pause) avec un bandeau qui prévient le joueur. Les ennemis apparaissent dès ~1,3 s après le lancement (première vague de 3 endosquelettes ESK-800). |
| 6 | « Cendres, Gris, LOGRES, Arkhantis : pas de jeu à lancer » | Vrai bug trouvé sur **Arkhantis** : le gros bouton « Descendre dans les ruines » plantait silencieusement si on n'avait pas d'abord créé un camp — corrigé, le bouton crée désormais la partie tout seul. Les 4 jeux ont un écran-menu avec un bouton géant et évident, qui lance maintenant aussi le plein écran. |
| 7 | « Caravanes : impossible de quitter » | « 🏳 Sauver & menu » fonctionne : il sauvegarde, revient au menu **et sort du plein écran**. Vérifié par test automatique. |
| 8 | « La Zone : à refaire avec le code de HUB OF DUTY » | Non traité dans cette vague (chantier lourd, voir la feuille de route ci-dessous, priorité n° 1 de v24). En attendant, La Zone démarre elle aussi en plein écran et sa touche M est réparée. |

Contrôles automatiques passés après ces changements : les 8 jeux + la page échecs démarrent **sans aucune erreur** dans un navigateur simulé (8/8), le scénario plein écran de Caravanes passe de bout en bout, et le site se reconstruit en 22 pages validées.

---

## La destination : « un vrai jeu », ça veut dire quoi ?

Nos critères, dans l'ordre où un joueur les remarque :

1. **Ça se lance en un clic** — plein écran, pas de doute sur le bouton, pas d'écran mort.
2. **Ça se comprend en 30 secondes** — un écran de commandes clair (ZQSD/flèches), une première minute qui apprend en jouant.
3. **Ça répond toujours** — aucune action qui « ne fait rien », aucun blocage silencieux.
4. **Ça se lit** — HUD lisible : vie, objectif, progression, danger.
5. **Ça se termine en beauté** — victoire et défaite racontent quelque chose et donnent envie de relancer.
6. **Ça se souvient** — sauvegarde, records, progression visible.
7. **Le polish** — sons cohérents, animations d'impact, équilibrage vérifié par tests.

---

## Par jeu : actions progressives

Pour chaque jeu : ce qui est acquis, puis les prochaines vagues. Notation : 🟢 fait · 🟡 prochaine vague (v24-v25) · 🔵 ensuite (v26+).

### 1. HUB OF DUTY (FPS) — socle le plus solide, il devient le moteur des autres
- 🟢 Plein écran au lancement + bouton ⛶ + Échap.
- 🟢 Visée libre quand la capture de souris est refusée (flèches ← → pour pivoter).
- 🟢 Vagues visibles dès 1,3 s (3 endosquelettes), composition annoncée par bandeau.
- 🟡 **Didacticiel intégré** : 3 panneaux au sol dans l'arène (bouger, viser/tirer, recharger) franchis au démarrage.
- 🟡 **Équilibrage des vagues** : courbe testée automatiquement (temps de survie médian cible : 4-6 min à la vague 5).
- 🔵 **Arènes multiples** (entrepôt de Skynet, pont du chasseur HK) + armes secondaires + sauvegarde du meilleur score.
- 🔵 **Audio spatialisé** (pas des robots à gauche/droite) et cadre photo (écran de fin cinématique).

### 2. LA ZONE (survie/exclusion) — ✅ reconstruite sur le socle HUB OF DUTY (v24)
- 🟢 Vraie 3D (Three.js) : contrôleur ZQSD + visée libre, hitscan, chiens aveugles, anomalies, émission, PDA, Hangar avec boutique, plein écran au lancement.
- 🟢 Boucle lisible *entrer → sonder → ramasser → extraire* ; testée de bout en bout par scénario automatisé.
- 🟡 Didacticiel d'une minute au Hangar (panneaux pas-à-pas) + équilibrage fin (valeurs d'artefacts, fréquence des meutes) après retours de parties réelles.
- 🔵 Météo d'émission visible au loin, marchand ambulant en Zone, artefacts à effets actifs.

### 3. NORDHEIM (open world viking)
- 🟢 Plein écran au lancement, M réparée.
- 🟢 Monde par graines, chasse, forge, guilde, troll : déjà riches.
- 🟡 **Objectif de première session balisé** : flèche de boussole vers la première quête + panneau « que faire maintenant ? ».
- 🟡 Équilibrage du troll (test automatique : un joueur équipé correctement doit pouvoir gagner).
- 🔵 Cycle jour/nuit visible, cabanes habitables, pêche, monture.

### 4. CARAVANES (commerce d'escouade)
- 🟢 « Impossible de quitter » réparé : sauvegarde + retour menu + sortie du plein écran.
- 🟢 Économie, compétences par l'usage, avant-poste, factions : le cœur est là.
- 🟡 **Écran de première partie guidé** : contrat tutoriel « Corail → Poussière » en 3 étapes cochées.
- 🟡 Carte du monde plein écran (touche M) avec routes et distances.
- 🔵 Caravanes rivales visibles, événements de route (tempête de sable, embuscade), commerce au long cours.

### 5. CENDRES (roguelike)
- 🟢 Plein écran au lancement (menu → classe → descente).
- 🟢 Défi du jour, potions à identifier, dieux : l'ossature roguelike est complète.
- 🟡 **Première profondeur plus accueillante** : 2 monstres faciles maximum à l'étage 1, une potion identifiée offerte, message « Descendez avec > » rappelé en jeu.
- 🟡 Journal de mort (« tué par un rake à l'étage 3 — vous aviez 12 PV ») avec records conservés.
- 🔵 Événements d'étage (autel maudit, marchand fantôme), 5ᵉ classe, palier boss tous les 4 étages.

### 6. LA CONFRÉRIE DU GRIS (tactique tour par tour)
- 🟢 Plein écran au lancement (fondation de confrérie → contrat).
- 🟢 Initiative, ripostes, blessures permanentes, salaires : la tactical a du caractère.
- 🟡 **Bataille tutorée** : le premier contrat affiche 3 bulles d'aide (déplacer, attaquer, finir le tour).
- 🟡 Prévisualisation des dégâts au survol d'une cible (combien de PV perdrait l'ennemi).
- 🔵 Trait de commande visible (ordre d'initiative), terrain couvert/hauteur, mercenaires recrutables nommés.

### 7. LOGRES — LA TABLE RONDE (wargame 3D léger)
- 🟢 Plein écran au lancement.
- 🟢 Provinces, héros aux traits uniques, jauge Légitime ↔ Tyran.
- 🟡 **Tutoriel des 2 premiers tours** (renfort, mouvement, assaut) + rappel des objectifs en un coup d'œil.
- 🟡 Résumé de bataille en fin de tour (pertes des deux camps).
- 🔵 Siège de Camelot, événements de cour avec arbitrages, 2ᵉ faction jouable.

### 8. LES RUINES D'ARKHANTIS (hack & slash)
- 🟢 Bouton « Descendre dans les ruines » réparé (il plantait silencieusement sans camp — corrigé).
- 🟢 Compétences 1-4 fonctionnelles sur AZERTY.
- 🟢 Plein écran au lancement.
- 🟡 **Butin plus parlant** : nom + affixe affichés en gros à la ramassage, comparaison avec l'objet équipé.
- 🟡 Équilibrage de la Faille du jour (test automatique de la montée en difficulté).
- 🔵 Boss à patterns, sets d'objets, arbre de compétences enrichi.

### 9. ÉCHECS IA
- 🟢 Moteur ×8 plus rapide (22 400 positions/s), Maître = 4-5 coups, Grand Maître = jusqu'à 8 en 3,5 s.
- 🟢 Mat en 1 et pièces pendantes détectés par tests ; extension anti-effet d'horizon.
- 🟡 **Table de transposition + mémoire d'ouverture** (quelques dizaines de coups connus) : encore un ou deux demi-coups de profondeur.
- 🟡 Barème Elo affiché honnêtement par niveau, mesuré par matchs automatiques entre niveaux.
- 🔵 Analyse de partie en fin de match (« votre 12ᵉ coup perdait une pièce »), puzzles de mat du jour.

---

## Les 5 prochaines vagues, dans l'ordre

1. ~~v24 — La Zone nouvelle~~ ✅ livrée (voir plus haut).
2. **v25 — Onboarding** : un didacticiel d'une minute pour chaque jeu (HUB au sol, Zone au Hangar, Nordheim boussole, Caravanes contrat guidé, Cendres étage 1 doux, Gris bulles, LOGRES 2 tours, Arkhantis butin parlant).
3. **v26 — Équilibrage par tests** : chaque jeu gagne son test automatique de courbe de difficulté (survie, dégâts, montée), et on corrige les chiffres jusqu'aux cibles.
4. **v27 — Mémorisation** : records, journaux de mort, sauvegardes complètes partout, écrans de fin qui donnent envie de relancer.
5. **v28 — Polish** : audio spatialisé HUB/Zone, animations d'impact partout, écrans titre soignés, et la table de transposition des échecs.

Chaque vague reste « page par page, testée, en français, sans euro » — comme toujours.
