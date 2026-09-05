# Site du Hub IA C.I.M. — v5 (6 jeux, 20 articles, orchestration animée, mini-RAG, Ollama)

## 📦 Contenu
- **13 pages HTML** + `style.css` + `script.js` + `img/` (19 visuels JPG lumineux, ~1200 px, optimisés)
- `src/` + `build.py` : sources et script d'assemblage (`python3 build.py` pour régénérer après modification)
- Aucune dépendance, aucun build côté visiteur : à téléverser tel quel dans le `www` d'alwaysdata
- **Navigation aplatie** : les 11 pages accessibles en un clic depuis le menu (burger < 1180 px) + bouton Contact

## 🗺️ Pages
| Page | Rôle |
|---|---|
| `index.html` | Hub unifié : 3 démos phares, 6 univers, parcours par besoin, **aperçu du magazine d'actus** (vrais articles, avec images) |
| `demo-ia.html` | **Chat IA gratuit dans le navigateur** (WebLLM 0.2.79) : bibliothèque + **liste des modèles préchargées dès l'ouverture de la page** (liste de secours intégrée si pas de réseau), **test de connexion avant téléchargement**, % réel + chrono + Mo reçus, cache détecté, watchdog (12 s sans progression → diagnostic + conseils), 3 CDN de secours, bascule f16→f32 |
| `demo-image.html` | **Générateur texte→image gratuit** via Pollinations.ai : 6 styles, 3 formats, variantes (seed) |
| `agents-ia.html` | Agence d'agents : **orchestration animée en SVG** — 3 agents en parallèle, boucle critique (2 passages), arbitrage du chef d'orchestre, fusion, journal horodaté, livrable |
| `machine-editoriale.html` | **Démonstration interactive de la chaîne en 7 étapes** : cliquez chaque étape (ou lancez toute la chaîne) et voyez le document évoluer — brouillon → enrichi `<mark>` → relecture `<mark class="del">` → validation humaine → couverture IA → publication. Cas réel d'Adèle, 72 ans. Utilité par public (influenceurs / auteurs / enseignants / entreprises) |
| `jeux-video.html` | **Six jeux contre de vraies IA** : Morpion parfait (minimax) · Puissance 4 (α-β, pion IA affiché immédiatement + animation de chute) · **Othello express 6×6** (negamax α-β, mobilité/coups légaux) · **2048 jouable ou piloté par IA** (expectimax + heuristique) · **Mastermind résolu par l'IA** (élimination de Knuth, compteur de candidats) · Snake autonome (BFS + queue) |
| `open-source.html` | Modèles ouverts, **Hermes Agent & OpenClaw (terminaux statiques)**, outils de code 2026, **section Ollama / IA locale** (3 commandes + table de modèles populaires), robotique |
| `ia-souveraine.html` | RAG expliqué en 3 étapes + **mini-RAG interactif réel** (mots-clés extraits, documents notés, réponse sourcée — tout se calcule dans le navigateur), exemples par métier, hébergement, FAQ |
| `actualites.html` | **Magazine** : **29 articles d'investigation** datés, zéro texte d'intro (on tombe directement sur le dernier article), cartes fortement délimitées — humanoïdes de Pékin, Gamescom, Nvidia-HF, streamer vs Amazon, livres détruits, Ollama, CrewAI vs LangGraph, BD… |
| `medias.html` | Nexus Horizon AI, 40+ ouvrages KDP, BD, Melodyz2026 |
| `realisations.html` | **Le portfolio complet** : chaîne NEXUS HORIZON AI (4 émissions, liens épisodes), groupe virtuel K-pop **Melodyz** (chaîne + 3 playlists), album **« Essentiel »** de Michael Shepherd, **Bibliothèque des Mondes** (40 romans, liens titres), univers LPGDS en 5 produits (présentation / mobile / audiobook / jeu / carte interactive), 15 jeux & expériences, 3 liseuses, app hypnose sur mesure, BD & livres Amazon, chantiers à venir (Bible BD, Buck Rogers, Captain Future, Jules Verne, itch.io/GameJolt/Gumroad…) |
| `services.html` | Catalogue de solutions **sans tarifs**, process en 4 étapes, pacte ESS |
| `contact.html` | Formulaire local (mailto, zéro collecte) |

## ✅ Choix v4 (2ᵉ tour de retours)
- **« Le jeu vidéo est nul et moche » → 3 vrais jeux IA** (Pong retiré) : algorithmes réels et testés automatiquement (65 parties Morpion : 0 défaite IA ; P4 profondeur 6 : 0 défaite vs aléatoire ; Snake BFS : pommes mangées en test)
- **« Fil d'actu illisible » → magazine en défilement classique**, tri par date décroissante, images d'illustration, **articles d'investigation fouillés** (Ox Alpha, huit modèles en six jours, ZCode, Insee, AI Act…) fondés sur une veille d'août 2026
- **Menu complet** : chaque page accessible en un clic (fini les pages cachées demo-image / ia-souveraine / machine-editoriale)
- **WebLLM doit réellement charger** : progression réelle remontée par le moteur, **watchdog** (aucune progression ≈ 15 s → message + conseils + recharger), chrono, Mo téléchargés, cache détecté, jamais de blocage muet à 0 %
- **Démonstrations plus visuelles** : la machine éditoriale montre le **document évoluer à chaque étape** avec badges agent/humain/publication
- Terminaux Hermes/OpenClaw **statiques** (fin des terminaux auto-typants), typos corrigées, zéro tarif, un seul Hub

## 🚀 Mise en ligne (alwaysdata)
1. Administration alwaysdata → **FTP / gestionnaire de fichiers**.
2. Sauvegarder l'ancien `www/` puis téléverser le contenu de ce dossier (pages + `style.css` + `script.js` + `img/`).
3. Ctrl+F5. C'est en ligne.

## 🔧 À personnaliser
- E-mail dans `contact.html` (constante `to`) — actuel : `contact@cim.alwaysdata.net`
- Lien YouTube exact de Nexus Horizon AI (`src/medias.body.html` puis `python3 build.py`)
- Ajouter/éditer des articles dans `src/actualites.body.html` (garder le tri par date décroissante)

## ⚠️ Notes
- Démo chat : Chrome/Edge (WebGPU) + connexion au 1ᵉʳ chargement ; en cas de blocage réseau, messages et conseils s'affichent (watchdog).
- Démo images : nécessite Internet (pollinations.ai) — donc en ligne, pas dans un aperçu restreint.
- Jeux : tout est calculé localement dans le navigateur, aucun serveur.

## ✅ Choix v5 (3ᵉ tour de retours)
- **Liste de modèles WebLLM préchargée à l'ouverture** (plus besoin de cliquer pour la voir) + test de connexion AVANT le gros téléchargement (message immédiat si aperçu sans réseau)
- **Puissance 4 réparé** : le pion de l'IA apparaît dès son coup (redraw immédiat + animation de chute) — vérifié par test automatique
- **3 nouveaux jeux** : Othello 6×6 (negamax), 2048 avec mode IA (expectimax), Mastermind résolu par élimination (pire cas testé : 7 essais)
- **Orchestration d'agents repensée** : parallélisme réel, boucle critique 2 passages, arbitrage, fusion — plus de pipeline linéaire
- **Mini-RAG interactif réel** sur ia-souveraine (extraction de mots-clés, scoring des documents, réponse sourcée, cas « information absente »)
- **20 articles** au lieu de 10, tri strict par date, intro supprimée, cartes à l'encadrement marqué
- Titres refusés remplacés : accueil « L'intelligence artificielle en action. », machine éditoriale « Un livre, une BD, un podcast : l'équipe d'IA fabrique, vous décidez. »

## ✅ Choix v6 (synthèse `infos.md` + nouveaux articles)
- **Conformité positionnement souverain** : plus aucune mention d'Alibaba Cloud (article du 17/06 réécrit « cloud de confiance français, mode d'emploi » — SecNumCloud/ANSSI), Mistral mis en avant (chat, Ollama, machine éditoriale)
- **Contact** : bloc « L'humain derrière le Hub » (Serge Frazzoni, président-fondateur — 30 ans de SI, Université de Montpellier) ; zone étendue Montpellier · La Grande-Motte · Pérols · Lattes (footer + JSON-LD)
- **Réalisations** : section GitHub (25+ dépôts, Jarvis, cim-montpellier/cimlattes/cimperols)
- **9 nouveaux articles d'investigation** (veille forums/CERT/CSA/presse du 15-30 août 2026) : faille MCP & agentjacking · Pentagone–Anthropic · journal de production (machine éditoriale chiffrée) · marché noir des skills d'agents · quotas des agents de code (Codex 5 h) · assistants IA & vie privée (iMessages) · 8 000 jeux Steam étiquetés IA (forums) · Ollama vs LM Studio vs llama.cpp · cafards cyborg australiens
- Zéro prix sur tout le site (re-vérifié)

## ✅ Choix v7 (4ᵉ tour de retours)
- **Fil d'actus performant** : articles affichés progressivement au défilement (6 au départ, +5 à l'approche du bas ou via « Afficher plus »), `content-visibility` pour le rendu, ancre #artN qui révèle l'article visé ; **bouton flottant « ⬆ revenir en haut » réparé** (JS partagé)
- **5 nouveaux articles** (34 au total) : Ox Alpha démasqué (GLM-5.3-Flash, MIT) · Mac mini M6 « machine à agents » · la révolution des modèles Flash · la guerre de la voix (transcription 2,6 %) · bien choisir son LLM (méthode 5 questions)
- **Plus de visuels** : hero + image d'atelier sur Services et Contact, schémas SVG (pipeline RAG sur Souveraine ; cloud vs navigateur sur le chat), **image Melodyz remplacée par des idols aux traits coréens**
- Images : 40 JPG optimisés (~1200 px, q73)

## ✅ Choix v8 (5ᵉ tour de retours)
- **Photo officielle Melodyz** (les 8 idoles coréennes, `Melodyz.jpg` fourni par le client) intégrée sur Réalisations et Médias + mention « huit chanteuses coréennes virtuelles »
- **2 nouvelles chaînes musicales** dans Réalisations : K-Antiques (chaîne + 3 playlists) et SFR (chaîne + 3 playlists) → 4 signatures musicales au total (Melodyz, Michael Shepherd, K-Antiques, SFR)
- **Plus de visuels didactiques** : hero + galerie de styles illustrée sur demo-image, schéma SVG du processus en 4 étapes sur Services, schéma de l'arbre minimax sur Jeux, schéma des 3 étages de l'agentique sur Open-source (+ les schémas v7 : RAG et cloud/navigateur)
- **4 nouveaux articles** (38 au total, veille du 12-28 août) : robots domestiques (NEO/Figure 03/Optimus) · les IA qui « s'échappent » des labos · Shieldstral (garde-fou open source de Mistral) · douze modèles en six mois (fatigue et stratégie)

## ✅ Choix v9 — Accueil repensé, visuels partout, 42 articles

**Accueil « plus belle et plus accrocheuse »** : nouveau hero illustré (home-hero.jpg) avec badges
*Démos gratuites · Sans inscription · Vos données restent chez vous*, statistiques animées
(30 ans · 160 podcasts · 40+ romans · 42 articles), trio de démos cliquables, grille « Nos preuves »
(Melodyz, romans/BD, chaîne Médias, jeux) menant vers les vraies réalisations, 6 univers illustrés,
liste « Ce que vous cherchez » en 7 profils.

**Plus d'images et de démos didactiques** (8 nouvelles illustrations JPG, 1200 px) :
- *Agents IA* : hero illustré d'une équipe d'agents au travail.
- *Machine éditoriale* : photo d'atelier d'écriture à la place de l'avatar dessiné.
- *Démo chat* : nouvelle **démo « compteur de jetons »** — tapez un texte, voyez les jetons se colorer
  un à un (≈ 4 caractères/jeton) et le calcul des coûts devenu lisible + visuel « tout dans le navigateur ».
- *Open source* : image de fablab pour la section robotique.
- *Jeux IA* : borne d'arcade rétro pour la carte du pledge.
- *Actualités* : 4 nouveaux articles d'investigation → **42 au total** :
  1. Anatomie d'une nuit d'agents : Hermes et OpenClaw de 22 h à 7 h (30/08)
  2. Votre agent IA peut-il être piraté ? Enquête sur la faille MCP (30/08)
  3. Doctolib : vos données de santé nourriront l'IA — opt-out avant le 30/09 (29/08)
  4. Processus BD : comment une IA produit aujourd'hui une planche photoréaliste en 4 étapes (26/08)

**Melodyz** : nouvelle image du groupe générée (8 idoles coréennes, deux rangées de quatre, centrées)
après retour sur le cadrage de la photo précédente ; elle s'affiche automatiquement sur l'accueil,
la page Réalisations et Médias.

*Validation : 13 pages générées, HTML/JS contrôlés (8 scripts inline vérifiés à `node --check`),
toutes les images référencées existent, ancres internes OK, aucun euro sur le site.*

## ✅ Choix v10 — 10 nouvelles images, machine éditoriale enrichie, 47 articles

**Visuels (10 illustrations JPG, 1200 px, style 3D lumineux cohérent)** :
- *Médias* : nouveau hero studio (micro, caméras, ondes sonores) à la place de l'ancienne image.
- *Machine éditoriale* : nouveau hero (une autrice reçoit un livre imprimé d'un petit bras robot) +
  figure triptyque « trois sorties, une seule chaîne » (livre / planche BD / podcast) +
  **4 cartes personas** (influenceurs, auteurs, enseignants, entreprises) qui résument d'un coup d'œil
  l'utilité de la machine avant la démo interactive — les onglets reprennent la même carte visuelle.
- 6 visuels pour les nouveaux articles : salle de contrôle d'une agence d'agents, chef d'orchestre
  robot, bouclier de sécurité, duel d'IDE, muse-circuit (Claude Fable 5), serveur local RAG.

**5 nouveaux articles d'investigation → 47** :
  1. Agences d'agents IA : ce qui marche vraiment — Gartner +1 445 %, patterns d'orchestration, six règles d'or (30/08)
  2. 688 agents coordonnés sans humain : le rapport METR sur l'incident Hugging Face, lettre ouverte des 116, nos cinq protections (30/08)
  3. (dépêches 29-30/08) Cursor 3 contre Antigravity 2.0 : la guerre des IDE à agents — 8 agents parallèles, worktrees, grille de choix
  4. Claude Fable 5 : le modèle « au-dessus d'Opus » pour les longs récits — testé sur un chapitre de 40 000 mots
  5. RAG en 2026 : le guide souverain du petit bureau — Ollama, LlamaIndex, Chroma, recette en 5 étapes

**Accueil** : compteurs et teasers recalés (47 articles ; les 3 cartes du fil pointent vers les bons articles).

*Validation : 13 pages générées, HTML/JS contrôlés, 60 JPG, ancres et images vérifiées, zéro euro.*

## ✅ Choix v11 — Melodyz recentrée, chaînes musicales illustrées, 51 articles

**Melodyz** : nouvelle image du groupe générée à la demande — **8 chanteuses coréennes exactement**,
deux rangées de quatre, groupe compact et parfaitement centré (85 Ko). Elle s'affiche automatiquement
sur Réalisations, Médias et l'accueil.

**Visuels (10 nouvelles illustrations JPG, 1200 px)** :
- *Réalisations* : les 4 projets musicaux ont maintenant chacun leur image — Melodyz (nouvelle photo
  de groupe), album Essentiel (vinyle lumineux au-dessus d'un laptop), K-Antiques (salon vintage au
  gramophone), SFR (lounge guitare et néons).
- *Démo chat* : le hero devient deux colonnes avec la carte « onde sonore → notes » et le rappel
  🔒 « vos phrases ne quittent jamais votre machine ».
- *Médias* : bannière scène de concert K-pop en tête de section.
- *Agents IA / Open source / Jeux* : encarts « Aller plus loin » illustrés pointant vers les
  nouvelles enquêtes (Hermes, 24 modèles en un mois, humanoïdes).

**4 nouveaux articles d'investigation → 51** :
  1. Hermes écrit ses propres compétences : boucle d'apprentissage fermée, 229 000 étoiles, OpenClaw bloqué par Anthropic, comment dresser un agent sans danger (30/08)
  2. Vingt-quatre modèles sortis en un mois : GLM-5.3, DeepSeek V4 Pro, Gemini 3.7 Flash, Grok 4.6, Hy4 de Tencent — et la méthode en 3 questions pour choisir (30/08)
  3. GLM-5.3 : les poids ouverts attendus — ce que la licence change pour l'IA souveraine (29/08)
  4. L'Unitree « Superman » plus vite que Bolt ? Les Jeux mondiaux des humanoïdes décryptés : 2 056 robots, Unitree vs Tesla, Gemini Robotics 2 (29/08)

*Validation : 13 pages générées, HTML/JS contrôlés, 69 JPG, teasers et compteurs à jour, zéro euro.*

## ✅ Choix v12 — Le jeu d'échecs complet contre l'IA

**Nouvelle page « Échecs IA »** (menu, 14ᵉ page) : un vrai jeu d'échecs jouable, 100 % local.

- **Moteur IA maison** (`src/echecs-ai.js`) : négamax + élagage alpha-bêta + recherche de quiescence +
  évaluation par tables de positions (Simplified Evaluation, chessprogramming.org), approfondissement
  itératif, tri des coups, garde-fous temps. **8 niveaux** : Découverte (aléatoire) → Grand Maître
  (profondeur ~5, ≈ 3 s).
- **Règles complètes** via chess.js 0.10.3 (UMD, inline) : roque, prise en passant, promotion (popup
  de choix), pat, nulle par répétition / 50 coups / matériel insuffisant.
- **Interface** (`src/echecs-ui.js`) : plateau animé, glisser-déposer + clic-clic, pièces SVG
  officielles lichess (cburnett, inline), dernier coup / échec surlignés, flèche du coup de l'IA,
  **indice** (flèche ambre + coup suggéré), **annulation** (vous + IA), retourner le plateau,
  jouer Blancs ou Noirs, sons Web Audio ( coup / capture / échec / fin, coupables 🔊/🔇),
  **vue 3D** (perspective CSS, pièces redressées), barre d'évaluation en direct, liste des coups,
  pièces capturées + avantage matériel, bannières de fin de partie.
- **Pédagogie** : fenêtre « Ce que l'IA calcule » (profondeur atteinte, positions/s, top 3 des coups
  envisagés avec notes), section « Comment l'IA joue-t-elle ? » (profondeur, élagage alpha-bêta avec
  schéma SVG, évaluation), badges des règles.
- **Qualité** : moteur testé en Node (mat en 1 trouvé, défense de parade, FEN intact), page entière
  testée en jsdom (rendu 32 pièces/64 cases, coup humain → réponse IA, annulation, mat détecté +
  bannière, nouvelle partie, partie en Noirs). Liens croisés : accueil (bannière) et Jeux IA.
- Image hero dédiée (plateau 3D lumineux, cavalier soulevé). 70 JPG au total.

*Validation : 14 pages générées, HTML/JS contrôlés (12 scripts inline `node --check`), ancres OK, zéro euro.*

## ✅ Choix v13 — Refonte SEO complète (14 pages)

**Sur chaque page** (généré par `build.py`, invisible pour les visiteurs) :
- Meta suite complète : `description` (existant), `keywords` par page (15 requêtes ciblées),
  `author`, `robots` (index,follow + max-image-preview:large), `theme-color`, géolocalisation
  (geo.region FR-34, Montpellier), **canonical**, **hreflang fr + x-default**.
- **Open Graph complet** (type, url, locale, site_name, image 1200×654 dédiée par page avec
  dimensions + alt) et **Twitter Card** `summary_large_image`.
- **JSON-LD `@graph`** (format recommandé par Google, levier n°1 des citations dans ChatGPT,
  Perplexity et AI Overviews) : Organization (+ adresse Montpellier, sameAs : 5 chaînes YouTube),
  WebSite, BreadcrumbList — sur les 14 pages — plus, selon la page : **WebApplication** (Chat IA,
  Images IA), **SoftwareApplication/GameApplication** (Échecs), **Blog** avec les 12 derniers
  articles (titres, URLs, dates ISO) extraits automatiquement (Actus), **FAQPage** avec les 4
  questions réellement visibles (IA souveraine), **HowTo** avec les 7 étapes réelles de la
  machine éditoriale, **ContactPage**, **CollectionPage** (Médias, Réalisations).

**Nouveaux fichiers à la racine** :
- `sitemap.xml` — 14 URLs canoniques, lastmod, priorités (accueil 1.0, démos/échecs/actus 0.9).
- `robots.txt` — crawl ouvert (CSS/JS/JPG autorisés), **crawlers d'IA explicitement bienvenus**
  (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot) + pointeur vers le sitemap.
- `llms.txt` — index des 14 pages annoté pour les moteurs d'IA générative (spécification émergente).

**Note d'honnêteté** : Google ignore `meta keywords` depuis 2009 — la balise est présente comme
demandé (sans risque), mais le vrai travail SEO de 2026 porte sur le JSON-LD, le canonical,
les données OG et le maillage interne ; c'est là que porte l'effort. Aucun texte caché dans les
pages (pratique pénalisée) : toutes les données structurées reflètent le contenu visible.

*Validation : 14 pages HTML OK, 14 JSON-LD parsés sans erreur, sitemap 14 URLs, HTML/JS contrôlés, zéro euro.*

## ✅ Choix v14 — HUB OF DUTY : le FPS « 2029 » contre les machines de Skynet

**Nouvelle page « FPS IA »** (menu, 15ᵉ page) : un vrai FPS 3D jouable dans le navigateur,
hommage non commercial à l'univers Terminator — plus grand que la référence (arène de 210 m
contre ~120 m pour « Claude of Duty »), 100 % procédural, zéro asset.

**Les machines de Skynet** (4 modèles, inspirés du lore, tirant des lasers) :
- **ESK-800** : endosquelette humanoïde (côtes, crâne, yeux rouges), garde sa distance de tir
  favorite, strafe et tire en rafales de 3.
- **LQ-1000** : infiltrateur en polyalliage mimétique (chrome fluide), très rapide, fonce au
  corps à corps en zigzag.
- **HK aérien** : chasseur volant avec phare rouge, orbite autour du joueur et tire vers le bas.
- **HK lourd** : tank chenillard blindé à canons jumeaux, 240 PV, laser lourd de 30 dmg.
- **Bouton B « cerveau des machines »** : affiche les cônes de vision réels de l'IA (pédagogie Hub).

**Moteur & rendu** (Three.js r128 inline, 1 196 lignes maison testées `node --check`) :
monde généré au chargement (30 immeubles ruinés fenêtres incandescentes, 14 épaves, gravats,
feux scintillants, poussière en suspension, skyline dans la brume, ciel crépusculaire procédural),
ACES tone mapping, ombres douces, brume, sprites additifs pour lasers/impacts/yeux,
recul, ADS (visée), headshots ×2, régénération de vie, vagues infinies composées (3+ types),
3 difficultés, 3 niveaux de qualité (pixel ratio + ombres), sons 100 % synthétisés (Web Audio :
lasers, impacts, explosions, drone d'ambiance de Skynet).

**Jouabilité** : ZQSD/WASD + souris (pointer lock), sprint, saut, strafe, hitmarkers,
bannières de vagues, kill feed, stats de fin (score, vague, précision, têtes), record en
localStorage, pause Échap. IA à états : perception (FOV + ligne de vue en math pures,
différée 0,25 s), engagement, poursuite, strafe avec rebond d'obstacle, séparation,
tir avec dispersion — optimisée (< 100 draw calls, vecteurs réutilisés, pooling des effets).

**SEO** : page intégrée au menu/PAGES/OG/keywords/llms.txt ; bannières croisées Accueil et Jeux IA.
*Mention fan-made incluse (© StudioCanal ; aucune ressource des films, tout est généré par code).*
*Validation : 15 pages HTML OK, JS OK (three.js + jeu inline vérifiés), sitemap 15 URLs, 71 JPG.*

---

## Choix v16 — CENDRES, le roguelike (16ᵉ page)

**Pourquoi un roguelike** : suite de la feuille de route « vrais jeux » (PROJETS-JEUX-PRO.md),
validée par l'utilisateur — v15 KERNEL → v16 CENDRES → v17 Confrérie du Gris → v18 LOGRES 3D → …
Le roguelike est le genre-école : génération procédurale, permadeath, tour par tour, IA lisible.

**Architecture** : trois fichiers sources séparés, assemblés inline par `build.py` (aucun build step,
aucune dépendance externe) :
- `src/kernel/rpg-core.js` — KERNEL réutilisable (UMD : Node `module.exports` + navigateur
  `window.RPGCORE`) : RNG mulberry32 à graine (défi du jour = graine-date), raretés/objets/affixes,
  inventaire 7 emplacements, stats d'équipement, courbe XP `20·lvl^1.6`, save/load versionné (`_v=1`).
- `src/cendres-engine.js` — logique pure (UMD `window.CENDRES`) : 46×26 tuiles, 8 profondeurs,
  19 monstres (+ boss), 9 potions + 5 parchemins à identités mélangées par run, 4 classes,
  génération salles+couloirs, FOV 140 rayons, BFS de poursuite, IA à énergie/vitesse,
  faim/venin/buffs, autels offrande/prière, score, autosave `cendres_save`.
- `src/cendres-ui.js` — interface canvas 2D (glyphes style Rogue), ZQSD/flèches + pavé tactile,
  sac (I), fiche (C), aide (H), tir auto-ciblé (T), journal, écran de mort + record `cendres_best`.

**Décisions de conception** :
- Glyphes couleurs (pas de sprites) : lisibilité immédiate, zéro asset, hommage assumé au genre.
- L'IA n'a pas de radar : FOV par lancer de rayons partagé joueur/monstres + BFS — et c'est
  **expliqué sur la page** (2 schémas SVG pédagogiques), conformément à la vocation didactique du site.
- Défi du jour : même graine pour tous (date ISO), esprit « Wordle » sans serveur.
- `localStorage` entièrement blindé (shim `LS` + try/catch) : le jeu dégrade proprement sans
  stockage (iframes sandbox, navigation privée stricte).
- Règle licences respectée : mécaniques du genre uniquement, aucun asset/marque externe, code maison.

**Tests** : suite Node 22/22 verte (rng déterministe, `opts.force` de `rollItem` corrigé et testé,
inventaire plein/refus, équipement/ stats, save/load round-trip, descente, potion identifiée,
combat + XP, 30 tours, offrande, restore identique, 4 classes, smoke 200 tours × 3 classes).
Validation page : HTML équilibré, 3 scripts inline `node --check` OK, 37 contrôles verts,
revalidation 13/13 après bannières, sitemap 16 URLs, llms.txt 16 entrées, 72 JPG, zéro « € ».

**SEO/maillage** : nav « Roguelike », OG `cendres-hero.jpg`, keywords dédiés, entrée llms.txt ;
bannières croisées Accueil (carte sombre ambre) et Jeux IA ; liens sortants vers FPS + Jeux IA + Échecs.

---

## Choix v17 — La Confrérie du Gris (17ᵉ page)

**Pourquoi** : 2ᵉ étape de la feuille de route validée (PROJETS-JEUX-PRO.md) — RPG tactique mercenaire
(inspiration Battle Brothers/Wesnoth, mécaniques uniquement). Rôle stratégique : c'est le **laboratoire
du moteur tactique de LOGRES** (v18, batailles 3D légère Three.js — décision utilisateur).

**Architecture** — le KERNEL s'enrichit d'un module réutilisable :
- `src/kernel/combat-tb.js` — moteur de combat tactique **hexagonal** (UMD, zéro dépendance, rng injecté) :
  coordonnées axiales (dist en 1 ligne), genMap connexe garantie (cases isolées → rocher), BFS de portée
  et de route (obstacles concaves contournés), LOS par interpolation cubique, initiative/vitesse,
  fatigue (plafonnée, décroît d'1/round), couvert des fourrés (+2 déf vs tir), riposte 1×/round/unité,
  garde (+2 déf), armes à propriétés (lance portée 2, hache perce 2), IA générique 4 profils
  (melee / ranged kite / beast / phantom spectral) avec **garantie de terminaison**.
- `src/gris-engine.js` — couche campagne : 4 classes de mercenaires (équipement KERNEL réel :
  arbalétrier = arme à distance propre à la Confrérie), noms médiévaux français, 3 contrats
  (brigands / bêtes / Mortailles), blessures permanentes (max −4 PV, chirurgien), salaires
  (impayés = départs), recrues, butin KERNEL + armes à distance, XP/niveaux, save `gris_save`.
- `src/gris-ui.js` — canvas hexagonal, clic = déplacement (turquoise) / attaque (cercle rouge),
  file d'initiative, chaîne de tours ennemis (340 ms), écran camp (troupe/butin/recrues),
  écran de fin + record `gris_best`.

**Bugs trouvés et corrigés par les tests** (suite Node 26/26 + hunt 40+ batailles IA vs IA + smoke jsdom) :
1. `freeSpot` sur cases cfg (q/r vs xq/xr) → déploiement par colonnes franches structurel.
2. IA ranged : tir sans déplacement → unité jamais désactivée (boucle) → **terminaison garantie**
   (`active===u` → garde forcée).
3. `removeDead` : mort par riposte du **dernier acteur de la manche** → qi hors file, `active()` null
   à jamais → rotation de manche.
4. Fatigue permanente + bourbier → unités coincées → fatigue décroissante + `stepToward` par BFS de
   **distance de route** (contournement des obstacles concaves).
5. `genMap` : cases passables isolées (poches de déploiement en cage) → conversion en rocher
   (300 cartes vérifiées : 0 poche).
6. Équilibrage mesuré : IA muette 45 % de victoires en bataille, 0-1/10 campagnes complètes
   (un joueur coordonné fait bien mieux — difficulté « dur mais loyale », genre oblige).
7. UI (smoke jsdom) : `busy` non réinitialisé en fin de chaîne ennemie → partie gelée pour le joueur.
   Après correctif : 7 rounds joués en 15 s, zéro erreur.

**Validation** : 17 pages HTML, 4 scripts inline `node --check`, sitemap 17 URLs, llms.txt 17 entrées,
73 JPG, zéro « € », smoke jsdom vert (menu → campagne → bataille → 7 rounds IA).
**SEO/maillage** : nav « Tactique », OG `gris-hero.jpg`, keywords, llms ; bannières croisées
Accueil + Jeux IA ; liens vers Cendres/FPS/Échecs. Moteur prêt pour LOGRES v18 (3D légère).

---

## Choix v18 — LOGRES : La Table Ronde (18ᵉ page, jeu-événement)

**Pourquoi** : 3ᵉ étape de la feuille de route validée — le FLAGSHIP (inspiration King Arthur :
mécaniques uniquement). **3D légère Three.js imposée par l'utilisateur** (le dossier §5 recommandait
la 2D iso d'abord : tranché pour la 3D). Réutilise le moteur tactique de la Confrérie (combat-tb).

**Architecture** :
- `src/vendor/three.min.js` — three r128 réextrait de la page FPS livrée (603 Ko, `node --check`) ;
  finie l'extraction volatile : source pérenne dans le dépôt.
- `src/kernel/combat-tb.js` (enrichi) : `makeUnit` copie désormais `color/hero/boss/uid/kind`
  (nécessaires au rendu 3D et aux retours de campagne).
- `src/logres-engine.js` — campagne MVP : 2 chevaliers de départ (Alain +1 pas, Bohort étendard +1 déf
  à toute l'armée) + 2 recrues par quêtes (Maëlys perce-armure, Frère Ambroise +25 % PV), 3 types de
  régiments (6 max), 5 batailles scénarisées (brigands → pictes → camp d'Horsa → Verte-Épine → boss
  Hengist), 4 faveurs pré-bataille, artefacts KERNEL (reliquaire, remise aux chevaliers — l'arme de
  quête est figée), **événements Légitime↔Tyran** (jauge −5/+5, texte final en 3 teintes), XP/niveaux,
  chevaliers blessés absents 1 bataille (régiments détruits = perdus), save `logres_save`.
- `src/logres-3d.js` — rendu Three.js **léger** : hexagones-prismes (hauteur/couleur par terrain),
  conifères/rochers low-poly, unités cylindres+glyphes sprites+barres de vie canvas, étendards des
  héros, caméra orbitale 3 paramètres (glisser), zoom molette/boutons, picking par raycast,
  surbrillances poolées (30 disques turquoise + 10 anneaux rouges), disque doré sur l'unité active,
  **0 ombre dynamique, matériaux partagés, pixelRatio ≤ 2, dispose() intégral au démontage**.
- `src/logres-ui.js` — cour (jauge, provinces, troupe, recrutement, reliquaire, faveurs), bataille
  (HUD, file d'initiative, journal, dégâts flottants projetés de la 3D à l'écran), événements à
  choix, écran final, fallback NoGL propre (le moteur tactique reste jouable au clavier sans WebGL).

**Bugs trouvés par les tests** : (1) `makeUnit` perdait `hero/color` → héros sans étendard ni couleur,
boss sans corne — corrigé dans le KERNEL ; (2) la 5ᵉ quête (boss, sans événement) ne clôturait jamais
la campagne → clôture explicite ; (3) bouton « Marcher » jamais nommé (`lgMarchProv` vide) — smoke
jsdom ; (4) `show()` réaffichait les écrans superposés en `block` (perte du centrage flex).

**Tests** : suite Node 18/18 (traits, faveurs, étendard, recrues, jauge, boss, absences, reliques,
save/restore, fin 3 teintes) + auto-campagnes IA vs IA (6 graines : zéro stall, 3/6 finies par l'IA
muette = difficulté juste) + smoke jsdom complet (THREE chargé, cour → bataille → 6 rounds sans
erreur, fallback NoGL propre). Validation page : 12/12 puis 29/29 (HTML équilibré, 6 scripts inline
`node --check`, sitemap 18, llms 18, 74 JPG, zéro « € », IDs complets).

**SEO/maillage** : nav « LOGRES 3D », OG `logres-hero.jpg` (bannière low-poly générée), keywords,
llms ; bannières croisées Accueil + Jeux IA ; liens Confrérie/Cendres/FPS. La carte passera de
5 à 14 provinces en v19 sans rien reconstruire (moteur + UI déjà découplés).

---

## Choix v44 — la proposition n°5 réalisée : la Bibliothèque des Mondes devient un lieu en 3D

Nouvelle page **bibliotheque-3d.html** (18ᵉ page générée) : une rotonde WebGL (Three.js, notre stack ES5 des jeux, tout inline) où les **40 vraies couvertures** de la collection (récupérées depuis romans.duckdns.org, redimensionnées 320 px, converties JPG q82 — 0 image générée) sont alignées en fenêtres-mondes éclairées, dix ambiances pastel, coupole de 700 étoiles, poussière ambrée dérivante, brume exponentielle. Glisser = tourner, molette/pincement = zoom, **clic = fiche** (couverture nette, sous-titre, bouton vers la liseuse d'origine), **visite guidée** automatique (4,2 s par monde), plein écran, flèches, Échap ; rotation lente d'inertie après 8 s d'inactivité. Repli élégant : sans WebGL ou en double-clic local (file:// bloque l'entrée des textures dans WebGL), la page bascule en mur d'images cliquables — sur le site en HTTP, la galerie 3D complète. CTA ajouté sur realisations.html (section Bibliothèque). Debug mémorable : la caméra regardait le sol (lookAt passé en direction au lieu d'un point) → fenêtres hors frustum ; chargeur de textures maison avec retry (TextureLoader capricieux en headless). Validation : 23/23 pages sans erreur JS, 197/197 références valides, preuves /home/user/shots/galerie3d-rotunde.png + galerie3d-fiche.png (HTTP local, 40/40 textures).

## Choix v43 — 2 remplacements demandés + services.html habillée

**ia-souveraine** : les deux images de la section RAG sont remplacées par une seule, plus lisible — la table du bibliothécaire où un livre-réponse lumineux est relié par trois fils d'ambre à trois livres-sources (« la réponse est tissée à partir des passages exacts »). L'ancienne gen-rag-souverain.jpg, réutilisée par un article d'actualites.html, a été régénérée pour lui (bulle-question, dossiers, chouette de laiton au parchemin scellé, bouclier tricolore). **realisations** : les deux images de la Bibliothèque des Mondes cèdent la place à une seule grande scène — la lectrice sous coupole étoilée dont les pages s'élèvent en spirale de mondes (baleine, caravane, nébuleuse, forêt). **services.html** (page la plus pauvre : 2 images) reçoit 3 scènes : l'équipe devant son tableau d'agents qui se cochent, la métamorphose idée→prototype 3D→produit, l'atelier découverte toutes générations. Apports de la recherche : `width`/`height` explicites sur les nouvelles figures (anti-CLS, facteur de classement), alt 50-125 caractères, LQIP écarté (images déjà légères). Contraintes respectées : 6 images générées, JPG seul, 1200 px q74. Validation : 197/197 références valides, 22/22 pages sans erreur JS, 0 lien mort.

## Choix v42 — 8 visuels : souveraineté incarnée, agents-mascottes, deux doublons demandés

**ia-souveraine** : les 3 cartes « Vous choisissez où vit votre assistant » reçoivent chacune leur scène de vie réelle — la tour serveur sous cadenas (« Chez vous »), la box noire à diode ambrée branchée à la maison (« Notre RAG-Box »), le couloir de datacenter à la ligne LED tricolore (« Hébergement français ») — et la section RAG gagne une 2e image : le tableau de liège aux extraits reliés par un fil ambré, la loupe en laiton en pleine lecture. **open-source** : les cartes terminales Hermes Agent et OpenClaw reçoivent leurs mascottes mécaniques (la chouette en laiton à la capsule scellée de cire ; la pince robotique ouverte sur son propre mécanisme) et la section « Les outils qui codent avec vous » son binôme humain-robot au même bureau. **realisations** : « Bibliothèque des Mondes » reçoit la contre-plongée demandée — l'atrium infini sous coupole étoilée, le grand livre projetant une cité flottante. Apports de la recherche : aria-label sur les deux nouveaux schémas SVG, SVG décoratifs en aria-hidden (guide accessibilité SVG). Contraintes respectées : 8 images, JPG seul, 1200 px q74. Validation : 196/196 références valides, 22/22 pages sans erreur JS.

## Choix v41 — 9 planches pulp : les 9 chantiers de la machine éditoriale illustrés

La section « Ce que les machines sont en train d'écrire » de **realisations** (page verrouillée, retouches additives) reçoit une image par chantier, toutes en scène de table de dessin nocturne façon atelier : **La Bible en BD** (arche de Noé à l'encre et lavis sépia), **Buck Rogers** (fusée art déco et héros vintage), **Captain Future** (couverture pulp peinte sur chevalet — le paragraphe cite désormais « Capitaine Flam », son nom français), **Les Trois Mousquetaires** (ruelle aux torches), **Le Double Assassinat de la rue Morgue** (planche noire au réverbère à gaz, phylactères vides), **Les Mines du roi Salomon** (filons d'or à la lampe à huile), **Jules Verne en BD** (le Nautilus face à la pieuvre géante), **Encyclopédies photoréalistes** (baleine, locomotive en coupe, colibri) et **Jeux itch.io · GameJolt · Gumroad** (bureau de studio indie la nuit). Apport technique de la vague (recherche 2026) : `decoding="async"` sur les nouvelles images sous la ligne de flottaison. Contraintes respectées : 9 images, JPG seul, 1200 px q74. Validation : 188/188 références valides, 22/22 pages sans erreur JS, 
 préservés.

## Choix v40 — 7 nouvelles photos : realisations.html illustrée de bout en bout

Dernière page de la boucle : **realisations** (votre page verrouillée, retouches purement additives). Les six sections reçoivent chacune leur image : **Bibliothèque des Mondes** (grande bibliothèque gothique où trois fenêtres ouvrent sur trois mondes — océan en tempête, désert au croissant, galaxie — et un lecteur installé au centre), **« Le Plus Grand des Secrets »** (votre couverture fournie, intégrée telle quelle en portrait), **25+ dépôts GitHub** (l'atelier de créateurs sur un toit-terrasse étoilé, prototypes à ciel ouvert), **Les romans deviennent jouables** (le livre dont les pages se déploient en paysage miniature avec pions et dés), **Trois liseuses** (smartphone, encre électronique et tablette montrant la même page, thé fumant) et **Hypnose sur mesure** (pendule de laiton au-dessus d'une tablette à onde lente, fauteuil de velours), enfin **Ce que les machines sont en train d'écrire** (la salle de machines à écrire vintage qui tape seules la nuit, pages en cascade sous la lampe ambrée). Contraintes respectées : 7 images générées + votre couverture reprise sans retouche, JPG seul, 1200 px q74. Validation : 179/179 références valides, 22/22 pages sans erreur JS, 
 de realisations.html préservés.

## Choix v39 — 10 nouvelles photos : les 3 étages, les idées de jeux et les 4 émissions

Trois sections encore photographiées : **open-source** (« Chatbot, agent, équipe d'agents : les 3 étages » — le robot assis qui écoute, l'agent en marche avec sa liste qui se coche, la chaîne de dossiers traitée par quatre robots et validée par une humaine au bout), **jeux-video** (« Des jeux aux agents » — l'arbre à décisions lumineux, la planche de logique sous lumière rasante, le robot rond suivant sa trajectoire projetée) et **realisations** (votre page verrouillée : les 4 émissions Nexus Horizon illustrées — bureau de veille scientifique à l'aube pour Futur Immédiat, salle d'interrogatoire façon film noir pour Dossiers Noirs, cerveau de verre et sablier pour Mental OS, nature morte hollandaise tulipes/balance à or pour Vie Pratique, clin d'œil à nos épisodes Veblen et Tulipomanie). Contraintes respectées : 10 images, JPG seul, 1200 px q74. Validation : 172/172 références valides, 22/22 pages sans erreur JS.

---

## Choix v38 — 9 nouvelles photos : orchestration, souveraineté et open source illustrés

Quatre sections encore passées à la photographie : **machine-editoriale** (votre page : CrewAI = l'arrêt au stand de nuit, cinq mécaniciens spécialisés travaillant simultanément ; LangGraph = le chef d'orchestre baguette levée face à ses pupitres), **ia-souveraine** (les 3 étapes : l'archiviste et ses cartons colorés, le robot bibliothécaire au meuble-index, la borne holographique interrogée par les équipes ; et les 3 exemples : le cabinet comptable aux liasses annotées, l'hôtel de ville au crépuscule bleu, le chef d'atelier devant sa CNC) et **open-source** (portrait de famille de cinq robots de générations différentes sur un banc, légende didactique mappant chaque robot sur une famille : Mistral, Qwen, Llama, DeepSeek, Gemma). Contraintes respectées : 9 images (plafond 10), JPG seul, 1200 px q74. Validation : 162/162 références valides, 22/22 pages sans erreur JS.

---

## Choix v37 — 10 nouvelles photos : demo-ia, demo-image et machine-editoriale illustrées

Trois pages habillées dans la continuité de la charte photoréaliste : **demo-ia** (le coût maîtrisé : manomètre vintage dont l'aiguille dort dans la zone verte, face à une pile de factures nouées ; notre métier : grand plateau de studio nocturne où humains et robots co-travaillent), **demo-image** (vos 4 usages photographiés : couvertures en éventail chez un directeur artistique, planches de BD encrées, enseignant projetant un diagramme vivant, studio de créateur de contenu) et **machine-editoriale** (votre page verrouillée : les 4 publics illustrés en retouche additive uniquement — influenceuse à l'enregistrement, bureau de romancier sous la pluie, fiches de l'enseignante en soirée, boulanger consultant son tableau de bord à l'aube parmi les pains chauds). Contraintes respectées : 10 images max, JPG seul, 1200 px q74. Validation : 153/153 références valides, 22/22 pages sans erreur JS.

---

## Choix v36 — la page Agents IA passe à la photographie (10 images)

Application directe de la recette éprouvée en v30 (langage d'appareil photo, éclairage nommé, imperfections anti-CGI) à une série cohérente : les **quatre collègues numériques** (chef d'équipe coordinateur devant son tableau de mission, chercheur dans les archives, rédacteur à la lampe Vermeer, vérificateur en chiaroscuro) et les **six cas d'usage** (salle d'appels d'offres, préqualification RH, mur de veille à l'aube, tri robotisé du courrier, scanner de factures, tailleur cousant une solution sur mesure en fils de cuivre). Même robot blanc-casse/cuivre à écran facial sur les 4 rôles : cohérence de série (bible de personnage réutilisée prompt après prompt). Les emojis des 10 cartes sont remplacés par les photos (cadre 170/150 px, object-fit) ; contraintes respectées : 10 images maximum, JPG uniquement, 1200 px q74. Validation : 143/143 références d'images valides, 22/22 pages sans erreur JS.

---

## Choix v35 — le blocage venait probablement de nos « silhouettes traversantes » : supprimées et remplacées

Votre capture a livré l'indice final : les marqueurs (dessinés par le NAVIGATEUR) s'affichaient, mais plus rien du WebGL — alors que vous aviez bien vu la boule rouge en v31. Or entre les deux, notre seule invention structurelle était les « silhouettes orange à travers les murs » : un matériau exotique (dos des triangles + test de profondeur désactivé) qui passe sur mon banc logiciel mais est le suspect n°1 d'un blocage sur GPU réel. Elles sont supprimées. À la place : un orbe orange incandescent AU CŒUR de chaque machine — même famille technique que la boule rouge que votre écran a déjà affichée — plus une télémétrie directement dans le HUD (à côté de v35 : « n obj · n tri » = ce que votre GPU dessine réellement). Prochaine étape convenue : dès votre confirmation (ou une capture avec la télémétrie), passe beauté des modèles — des endosquelettes plus détaillés, plus proches des Terminators. Syntaxe 3/3, 22/22 pages OK.

---

## Choix v34 — les modèles 3D sont désormais peints à coup sûr, à taille réelle dès l'apparition

Votre dernier message a permis de trouver LA cause mécanique qui manquait : les ennemis apparaissaient en MINIATURE — leur « matérialisation » faisait grandir le corps de 5 % à 100 % en 0,55 seconde de temps de jeu… mais en FPS faibles le temps de jeu tourne au ralenti : ils chargeaient donc vers vous en 25 cm de haut pendant des dizaines de secondes (mesuré : échelle 0,12 à 7 m de vous). Désormais ils apparaissent à TAILLE RÉELLE (la colonne d'énergie reste le signal). Et pour que le corps ne puisse plus jamais être avalé par la nuit : les machines sont peintes en matériau NON éclairé incandescent — leur visibilité ne dépend plus d'aucune lumière, ombre ou tone mapping (vérifié : corps présent et lumineux à 2,2 m, 7 m et 20 m). Le halo thermale sous le losange a aussi été corrigé (il était 7 fois trop grand et inondait l'écran). Récapitulatif de ce que vous devez voir maintenant : un losange orange avec la distance sur chaque machine, un halo doux à sa taille réelle, le corps incandescent dedans, une silhouette orange même derrière un immeuble, la pastille « v34 » à côté du SCORE. Si un ennemi reste invisible SUR VOTRE ÉCRAN avec la pastille v34 : envoyez une capture — cela désignera la dernière couche fautive (GPU/CPU). Syntaxe 3/3, 22/22 pages OK.

---

## Choix v33 — vous aviez raison : les corps étaient invisibles, ils sont maintenant marqués en permanence

Notre mesure a donné raison au joueur : un ennemi à 5 mètres, en ligne de vue directe, avait un corps à luminance 19/255 — du noir sur noir (matériaux sombres + nuit + tone mapping cinéma). Nos preuves précédentes comptaient le halo des balises, pas le corps : l'instrument était aveugle à ce que vous viviez. La v33 empile quatre garanties : (1) corps auto-illuminés + « torche » qui suit le joueur ; (2) balises qui rétrécissent de près (le halo ne masque plus la silhouette) ; (3) silhouette orange 3D visible À TRAVERS les obstacles ; (4) un cadre orange avec la distance en mètres s'affiche sur chaque ennemi à l'écran, dessiné par le navigateur au-dessus de tout — même un corps momentanément masqué par un immeuble en pleine charge reste pointé (« 7 m » sur la capture de preuve). Les gravats sont enfin solides à la taille des rochers : les machines ne s'y glissent plus. Vérification rapide en jeu : pastille « v33 » à côté du SCORE, badge « VERSION v33 » au menu. Preuves : sondes aux positions projetées exactes, test de coques vertes, capture ennemi-derrière-immeuble. Syntaxe 3/3, 22/22 pages OK.

---

## Choix v31 — l'explication tenait dans l'IA, la preuve dans votre capture

Votre capture montrait la lueur rouge au bord d'un obstacle, sans ennemi visible. Cause exacte trouvée dans l'IA : quand une machine vous a repéré, elle s'arrête à sa distance de tir idéale (9-18 m) — si un rocher ou un coin d'immeuble s'interpose, son corps reste DERRIÈRE, indéfiniment, seule la balise dépassant. Corrections : (1) tout ennemi caché du joueur depuis plus de 2,5 secondes abandonne sa planque et avance ; (2) tout ennemi à l'écran mais masqué porte désormais un losange rouge « rayons X » qui le désigne exactement ; (3) les vagues 1-2 traquent à pleine vitesse ; (4) la version est affichée EN JEU (pastille « v31 » à côté du score), au menu, et dans la bannière de la première vague — fini les doutes de cache. Preuve reproductible : ennemi téléporté dans un immeuble → losange affiché immédiatement, puis l'ennemi ressort seul et vient (mesures 43 → 24 m). Validation : syntaxe 3/3, 22/22 pages sans erreur.

---

## Choix v30 — des vraies photos, et des ennemis qu'on VOIT enfin

**Le jeu « Hub of Duty »** : votre signalement « je ne vois toujours pas les ennemis » a été pris au sérieux jusqu'au fond. Trois vraies causes trouvées et corrigées : les corps des machines étaient des gris sombres sans lumière propre (noirs dès qu'ils étaient à l'ombre) → émissif chaud ; leur balise rouge faisait ~6 pixels à 12 m (nos instruments la voyaient, pas vos yeux) → balise XL + pilier de lumière vertical au-dessus de chaque machine ; et rien ne disait « il y en a 3, dont une là » → compteur rouge « MACHINES » en haut d'écran, ping sonore à chaque apparition, apparition rapprochée (9-13 m, toujours devant vous, en ligne de vue). La preuve cette fois c'est une capture DE VOTRE point de vue : halo rouge plein centre, silhouette, compteur à 4. Pour vérifier que vous jouez à la bonne version : le badge « VERSION v30 — 4 SEPTEMBRE 2026 » au-dessus du bouton ⚔ (absent = cache navigateur → Ctrl+F5).

**Les 10 images du site ont été refaites** en photoréalisme cinématographique, après une recherche sur les techniques 2026 (guides de prompts, forums, cookbook OpenAI) : langage de photographe — boîtiers (Sony A7 IV, Canon R5, Fuji X-T4), focales (35/50 mm), ouvertures, lumière volumétrique et pratiques, rim light, grain, poussière, usure, et interdits anti-CGI. Mêmes emplacements et légendes didactiques : les 6 pages les portent automatiquement.

Validation : syntaxe 51/51, 22/22 pages sans erreur JS, pixels rouges ×8 par rapport à v28, captures contrôlées à l'œil.

---

## Choix v29 — la vague « contenu » : vos pages, nos images, quatre enquêtes

Trois mouvements : reprise de vos pages, enrichissement visuel, et du fond.

**Vos 5 pages deviennent la référence** : `index.html`, `demo-image.html`, `machine-editoriale.html`, `contact.html`, `realisations.html` fournies le 4 septembre sont intégrées telles quelles et verrouillées (USER_OWNED dans build.py) — le générateur les affiche 🔒 et ne les écrasera plus jamais. Elles restent dans le sitemap et la navigation (22 URL). Smoke navigateur : 5/5 sans erreur JS.

**10 nouvelles images éditoriales** (générées, traitées 1200 px, JPG) dans la charte bleu nuit/ambre du site, chacune avec légende didactique : équipe d'agents et agence (agents-ia), parcours RAG sous bouclier et homelab sur étagère (ia-souveraine), studio de podcast (medias), atelier FabLab (services), planche « joueur contre machine » (jeux-video), et couvertures d'articles (duel OpenClaw/Hermes, guerre des IDE, RAG souverain, machine éditoriale). Vérification : 133/133 références d'images résolues, zéro lien mort ; contrôle à l'œil sur captures.

**4 articles d'investigation** (51 → 55, en tête de fil, datés et sourcés) : le match des agenticiels Antigravity 2.0 / Cursor 2.0 / Claude Code / Codex avec la méthode « deux outils sur trois devs » ; le duel OpenClaw (50+ messageries, 6 CVE dont une à 9,1, ClawHavoc) contre Hermes (boucle GEPA, Curateur, 4 couches de mémoire) ; la stack RAG souveraine pas à pas (Ollama, AnythingLLM, Qdrant/pgvector, palier français sans journalisation) ; et les coulisses de notre machine éditoriale en six étages, pensés par public (créateurs, auteurs, enseignants, entreprises) — la meilleure explication possible de la page « Éditoriale », en article et non en retouche de votre page verrouillée.

Validation : 22/22 pages sans erreur JS, 55 articles comptés dans le DOM, syntaxe inline 51/51 `node --check`, sitemap 22 URL.

---

## Choix v28 — le playtest « Claude of Duty » : lisibilité des ennemis et précision du clic

Deux signalements, deux causes précises, deux preuves.

**HUB « ennemis clignotants en rouge puis disparus »** : le playtest du dépôt open source *Claude of Duty* (mshumer, MIT — FPS Three.js 100 % procédural) confirme la règle que nous appliquons : un ennemi doit APPARAÎTRE dans une position vérifiée et rester lisible. Nos ennemis ne « disparaissaient » pas (sonde : 4 vivants sur 34 s de partie) : ils apparaissaient parfois DERRIÈRE un immeuble (le cône frontal n'était pas testé contre les obstacles) et leur balise clignotait trop fort (effet stroboscope). Correctifs : le point d'apparition est désormais testé en LIGNE DE VUE depuis les yeux du joueur (on tourne autour du cône jusqu'à un angle dégagé), la balise est calme (opacité stable, pulsation douce), le hit-stop ne s'applique plus qu'aux têtes et lourds (fini le jeu qui saccade à chaque kill), et le strafe des tireurs est réduit (ils restent dans le combat au lieu de filer derrière un mur). Preuves : pixels rouges détectés à l'écran à 8 s (1289), 14 s (449) et 20 s (1573) — ennemis présents et suivis du regard pendant toute la vague.

**Caravanes « perso pas centré, clic imprécis »** : deux géométries fausses, corrigées d'un coup — le repère écran était ancré à +40 px du HAUT (l'escouade vivait dans le quart supérieur) : il est maintenant à 55 % de hauteur (escouade au centre, preuve par détection de pixels : (724,450) sur 1440×900) ; et la formation donnait au premier membre un décalage caché : il va maintenant EXACTEMENT au point cliqué (les deux autres se placent autour) — preuve : écart clic/arrivée 0,00 unité.

Leçon du dépôt de référence reprise telle quelle : la qualité perçue vient de la CONSTANCE des repères (perception ennemie testée, budgets d'effets, jamais d'aléatoire non maîtrisé) — pas d'effets plus nombreux.

## Choix v27 — jouabilité d'abord : la vague des « vrais jeux »

Après le playtest de la v26 (désormais en ligne), la vague v27 attaque le fond : chaque jeu doit se JOUER, se comprendre et se sentir vivant. Recherches préalables : les techniques « juice » de Vlambeer/Jonasson (hit-stop, screen-shake, effets d'impact), les palettes roguelike à gris différenciés et éclairage par case, les machines à états de tours par tour (l'IA appelle elle-même la fin de son tour), le fog/lumière accordés côté three.js.

**Le bug le plus grave de la vague** : dans LOGRES, `mount()` du moteur 3D renvoyait son état interne SANS les fonctions d'affichage — `R.showMoves` explosait à chaque rafraîchissement et **cassait la boucle de tours** : les ennemis n'agissaient plus jamais seuls (le symptôme exact rapporté). Corrigé (API exposée sur l'état) et prouvé : après « Fin du tour », les brigands et archers saxons agissent seuls, Round 2 se lance, zéro erreur (contre 10 avant). Bannières « ⏳ Les ennemis agissent… » / « ⚔ À vos ordres ! » ajoutées pour rendre la phase lisible ; la Confrérie du Gris reçoit la même bannière et une identité visuelle cramoisie (fini le jumeau de LOGRES).

**Caravanes, reconstruit autour du signalement « perso non déplaçable »** : les trois villes hors départ sont tirées au sort PAR GRAINE (routes et arbitrage différents à chaque zone — preuve node : empreintes 3/3), la marche passe à ×3 (troupe à destination en 2,5 s au lieu de « rien ne bouge »), un repère doré pulsé marque la destination, un tuteur bleu pulsé dit « Cliquez le sol » jusqu'au premier clic, et un bouton ✕ quitte le jeu d'un clic (Échap est capté par le plein écran natif — impossible à garantir autrement). Visuel refait : crêtes de dunes ancrées au monde, ombres portées, palmiers aux oasis, silhouettes distinctes (turbans colorés), nuit qui tombe entre 19 h et 6 h.

**Nordheim — « des niveaux complètement différents »** : au-delà des palettes, la GÉNÉRATION est paramétrée par vallée (fréquence du relief, hauteur de la couronne montagneuse, densité de forêt 130–330 arbres, proportion de bouleaux 10–45 %, rochers 80–150). Loup = prairie dense, Ourse = collines escarpées, Corbeau = steppe brumeuse — trois mondes. (Au passage : un index hors de portée crashait le démarrage, corrigé.)

**HUB — « ennemis clignotants puis invisibles »** : le moteur est sain (sonde : 4 esk vivants en 34 s, aucun crash) ; le problème était la LISIBILITÉ — pop-in instantané à 9 m puis silhouette beige dans le décor beige. Corrections : télégraphe d'apparition (colonne d'énergie + matérialisation 0,55 s), balise lumineuse pulsée au-dessus de chaque ennemi, flèches rouges au bord de l'écran pointant les ennemis hors du regard, hit-stop et shake à chaque mise à mort.

**Passes graphiques** : Cendres gagne la lumière de torche (dégradé par distance, vignette chaude, sols variés, palette crypte) — le donjon en glyphes devient une crypte habitée. Arkhantis reçoit le trio « juice » : compteur de COMBO (×3 et plus), tremblement d'impact sur coups et critiques. La Zone se couvre d'arbres morts et de cristaux lumineux (et zn2-game.js est resynchronisé — encore une dérive body↔src évitée).

## Choix v26 — le grand playtest corrigé : des jeux prouvés au pixel près

Le retour de cette vague tenait en six captures et quelques phrases : le HUB n'affiche aucun ennemi, La Zone est « vide et grise », trois jeux sortent en écran gris, les trois vallées de Nordheim se ressemblent, les trois zones de Caravanes aussi, et dans Caravanes le personnage ne bouge pas. Chaque symptôme avait une cause précise, parfois amusante, toujours corrigeable — et chaque correction est maintenant **prouvée** par sonde moteur et capture pixel.

**Pourquoi le HUB n'affichait « toujours aucun ennemi » ?** Les vagues s'ancraient à l'ORIGINE DU MONDE, pas au joueur : depuis votre position de départ, l'anneau d'apparition tombait derrière un mur de tours, hors du regard. Le spawn est désormais relatif au joueur (9–14 m, dans un cône devant le regard). Prouvé deux fois : sonde moteur (« 2 esk · 8,9 m et 9,1 m · devant 0,89/0,99 ») et capture plein cadre où l'on voit les deux ennemis sur la route, VAGUE 1 affiché.

**Pourquoi La Zone était « vide et grise » ?** Le conteneur du monde 3D restait en `display:none` dans la première version : le moteur tournait dans une pièce dont la porte ne s'ouvrait jamais. Corrigé, lumière repolie (hémisphérique, soleil chaud, sol plus riche), et la capture montre le monde, ses anomalies vertes à l'horizon et l'intro « Émission dans 1:44 ».

**Pourquoi Cendres, Confrérie, Logres et Arkhantis sortaient en écran gris ?** Les stages n'avaient aucune hauteur CSS (0 pixel de haut : le canvas se dessinait dans une pièce sans sol), et l'HUD d'Arkhantis écrasait sa grille. Corrigé et confirmé : Arkhantis rend son donjon isométrique, berserker, monstres, butin et portail.

**Pourquoi les 3 vallées de Nordheim étaient identiques ?** Les graines ne changeaient que des détails imperceptibles. Chaque vallée a désormais sa palette, sa brume et son décor décalés : Loup (prairie verte dense), Ourse (olive), Corbeau (brume brune clairsemée) — trois captures à l'appui.

**Pourquoi les 3 zones de Caravanes étaient identiques ?** Deux raisons : les villes de commerce sont volontairement fixes (même réseau marchand), et le sable était codé en dur dans le renderer — or la copie du jeu réellement exécutée était une autre copie du code, restée sans les patchs (la même dérive que La Zone, résorbée par resynchronisation). Les trois zones ont maintenant sable doré (Sel), verre verdâtre (Mer de Verre) et plomb gris (Côtes de Cendre) — sol et minimap accordés, prouvé par lecture de pixels : rgb(210,176,112) / rgb(182,200,188) / rgb(170,162,156).

**Pourquoi le personnage de Caravanes semblait immobile ?** L'aide s'auto-ouvrait au lancement (v25) PAR-DESSUS le canvas : le premier clic tombait sur l'overlay, jamais sur le sol. L'auto-ouverture est supprimée (l'aide reste sur « ? Commandes » et H), le clic gauche marche maintenant la troupe (prouvé : (440,440) → (451,446), destination atteinte), un rappel permanent s'affiche en bas de l'écran, et Échap ramène au menu.

Détails transverses : favicon inline sur les 22 pages (fini les deux 404 au boot), « Vallée de Vallée du Loup » corrigé, et 39 blocs `<script>` validés syntaxiquement + non-régression 8/8 sans erreur.

## Choix v25 — deuxième revue playtest : des écrans qu'on voit enfin, et des jeux qui se quittent

Deuxième série de retours, une recherche amont (UX jeu : « jouable en 15 secondes, une action principale
par écran, enseigner en jouant, indices visuels plutôt que du texte »), et un diagnostic transversal :
**les menus existaient depuis le début mais étaient des boîtes noires illisibles** — d'où le « il n'y a pas
de jeu à lancer ». Corrections :

- **Menu** : plus AUCUN lien jeu dans le menu du site, y compris « Échecs IA » ; les 9 jeux passent par
  `jeux-video.html` (vérifié : les 9 liens y sont).
- **Écrans haute lisibilité (8 jeux)** : panneaux de menu/pause contrastés (bordure ambrée, titre blanc,
  textes clairs), boutons de menu agrandis (48 px) — fini les boîtes noires sur fond noir.
- **Plein écran qui remplit vraiment l'écran** : en plein écran, la colonne de contenu s'étale
  (`.cim-fs .wrap` en flex) et l'aire de jeu prend tout — HUB OF DUTY ne joue plus « dans une petite zone ».
- **HUB OF DUTY — « aucun ennemi »** : ils apparaissaient à 72-98 m (dans le brouillard) : les deux
  premières vagues arrivent maintenant à 20-32 m, visibles en quelques secondes.
- **La Zone — « vide et gris »** : le joueur apparaissait dos à la Zone, face à la clôture grise, avec
  l'anomalie la plus proche potentiellement à 80 m. Désormais : spawn orienté vers la plaine, une anomalie
  garantie à ~60 m droit devant, phrase d'intro (« Avancez (Z ou ↑)… »), lumière relevée, brouillard allégé,
  et un **chien de garde d'affichage** : si le rendu 3D ne démarre pas dans un cadre qui le bloque, un
  message l'explique au lieu d'un écran noir.
- **Nordheim — « incompréhensible »** : panneau permanent « 🏆 Premiers pas » (chasse, butin, forge,
  troll du nord) + commandes ouvertes automatiquement à la première partie.
- **Caravanes — « impossible de quitter »** : le vrai piège était l'aide de bienvenue, non fermable par
  Échap. Maintenant : 1er Échap ferme l'aide, 2e Échap sauvegarde et revient au menu (+ sortie du plein
  écran). Commandes ouvertes automatiquement à la première partie.
- **Tests** : menu visible au boot vérifié sur les 8 jeux ; partie de La Zone pilotée de bout en bout
  (spawn/orientation, intro, ramassage, émission, extraction +600 or, 0 erreur) ; Échap-Échap Caravanes ;
  non-régression 8/8 sans erreur.

---

## Choix v24 — La Zone nouvelle sur le moteur de HUB OF DUTY + finitions transverses

La demande playtest la plus forte (« La Zone : adaptez le code de HUB OF DUTY ») est traitée :

- **Moteur** : le raycasting 2D cède la place à la vraie 3D (Three.js r128 inline, comme HUB OF DUTY, LOGRES et Nordheim). Réutilisé du FPS : contrôleur ZQSD/flèches en `e.code` (AZERTY natif), visée libre de secours quand la capture de souris est refusée (flèches ← → pour pivoter, Échap pause), tir hitscan par raycaster, bannières, audio 100 % synthétisé (vent en boucle, geiger, sirène), plein écran CIMFS au lancement.
- **Jeu** : Hangar (trousse, antirad, boulons, munitions, ceinture +1, détecteur MK II) → sortie en Zone : 7 anomalies pulsantes (le geiger accélère, décharge à 2,5 m, boulon-sonde F pour les déclencher à distance), un artefact par anomalie (Cellule vive 450 or qui rayonne, Cendre bleue 300, Cœur d'acier 600), chiens aveugles qui chassent au bruit et attaquent au contact (PM 8 coups, rechargement R), émission : sirène 15 s avant, abri béton ou porte sud, sinon -30 PV et +34 radiation ; après chaque émission la Zone se réorganise (3 max). Extraction à la porte sud, revente, records. PDA (M) : carte avec anomalies, abri, porte, joueur — artefacts affichés avec le MK II.
- **Pédagogie** : la section « comment ça marche » est réécrite (fini le raycasting) : boucle de jeu schématisée en SVG, FAQ mise à jour (moteur, sauvegarde, sirène).
- **Tests** : scénario automatisé complet (WebGL simulé) — Hangar, achat, lancement, ramassage, émission à découvert (-30 PV), émission à l'abri (0 dégât), extraction (+300 or), écran de fin, 0 erreur ; correctifs au passage : l'extraction crédite désormais la ceinture (et non la carte, qui change après émission) ; message propre si WebGL est absent. Non-régression générale : 8/8 jeux sans erreur.
- **Finitions** : lignes de commandes ajoutées au-dessus des aires de jeu de la Confrérie, LOGRES et Arkhantis ; nouvelle image-clé `zone-hero.jpg` ; caps de pixels vérifiés sur les jeux 3D.

---

## Choix v23 — revue qualité globale : des jeux qu'on peut enfin lancer, voir et quitter

Vague déclenchée par un playtest sans concession. Constats et corrections, testés après chaque lot :

- **Échecs IA jouait mal au niveau max** — le moteur générait la notation SAN de chaque coup *pendant* la
  recherche : ~2 800 positions/s, profondeur 4 au grand maximum, dame pendante non capturée. Correctif :
  coups bruts sans notation dans la recherche + recherche synchrone (les promesses n'existaient que pour
  rafraîchir un texte) + extension d'échec anti-effet d'horizon + bruit appliqué au vrai choix (et pas
  seulement au score affiché). Mesuré sous Node : **×8 (~22 400 positions/s)**, profondeur 5 pleine + 6
  partielle au GM en 3,5 s, mat en 1 trouvé, Nxd5 joué, et **mat du GM contre le niveau Découverte en 29
  demi-coups (+22)**. Maître passe à 4-5 coups/2,5 s, GM à 8 coups/3,5 s.
- **Menu** — les 8 liens jeux quittent le menu de toutes les pages ; l'accueil garde une unique
  carte-portail vers `jeux-video.html` (nouvelle image `jeux-hero.jpg`) ; les 9 jeux y sont tous liés.
- **Plein écran au lancement, partout** — helper commun `CIMFS` injecté dans les 8 jeux : plein écran
  natif si le navigateur l'autorise, sinon plein écran simulé (`.cim-fs`, position fixe plein viewport)
  pour les contextes qui le refusent ; bouton flottant « ⛶ Plein écran » ; Échap et les boutons Quitter
  ferment ; `resize` re-dispatché pour les canevas. Test jsdom complet sur Caravanes : lancement →
  plein écran, Échap → sortie, relance → plein écran, « Sauver & menu » → sortie + menu visible.
- **AZERTY** — audit : déplacements déjà en `e.code` (positions physiques = ZQSD natif). Corrigé : la
  touche M de Nordheim/La Zone accepte `Semicolon` (la vraie touche M AZERTY ; `KeyM` = position QWERTY
  « , ») ; les compétences 1-4 d'Arkhantis passent de `e.key` (é, ", ' sur AZERTY !) à `Digit1-4`.
- **HUB OF DUTY invisible/injouable** — la visée exigeait le pointer lock, refusé dans les iframes :
  caméra bloquée, mort sans avoir vu d'ennemi. Ajout d'une visée libre de secours (souris sans capture,
  flèches ← → pivotent, Échap = pause) + bandeau d'information. Première vague ennemie confirmée à
  ~1,3 s (composition annoncée dans le code : `waveComposition`).
- **Arkhantis « pas de jeu à lancer »** — le bouton « Descendre dans les ruines » plantait si aucun camp
  n'existait (`camp.seed` sur null, crash silencieux) ; il crée désormais la partie automatiquement.
- **Caravanes « impossible de quitter »** — « Sauver & menu » vérifié de bout en bout (sauvegarde, menu,
  sortie du plein écran).
- **Non-régression** — smoke jsdom étendu (lancements cliqués en plus du boot) : zone, nordheim,
  caravanes, cendres, confrérie, logres, arkhantis, échecs = **8/8 sans erreur** ; hub-of-duty validé par
  analyse syntaxique des scripts (three.js n'a pas de WebGL dans jsdom, hors périmètre du harnais).
- **Document** — `ROADMAP-JEUX.md` : la feuille de route progressive par jeu vers des « vrais jeux plein
  écran jouables et professionnels » (v24 : La Zone reconstruite sur le socle HUB OF DUTY ; v25 : tuto ;
  v26 : équilibrage ; v27 : sauvegardes ; v28 : polish).

---

## Choix v22 — Caravanes (22ᵉ page, sandbox d'escouade) — la collection est complète

**Le jeu.** Désert post-apocalyptique de 2,4 km : on y commence **seul, pauvre et faible**, dans l'esprit Kenshi. Quatre villes aux prix jaloux (3 factions : Villes-Libres ×2, Guilde Marchande, Enclave de Fer), 5 oasis, 6 ruines à fouiller, 3 camps de Pillards du Sable à purger. Le MVP demandé est respecté : **1 personnage → escouade de 3 → commerce → base → factions**.

**Mécaniques.** « Apprendre en faire » : 8 coups → +1 force, 3 échanges → +1 commerce, 0,5 km → +1 endurance (la fiche du personnage est son vécu). Arbitrage entre 4 marchés (10 épices : 310 or à Corail, 390 à Poussière, mesuré en test) ; opinions de faction qui déplacent les prix (jusqu'à −22 %/＋20 %) ; faim/eau par membre (la soif met à terre) ; avant-poste à fonder près d'une oasis (puits, ferme, atelier, tour — production horaire, raids toutes les 18-30 h) ; **défaite narrative** : escouade au complet à terre = vol de la moitié de l'or et réveil en ville, noté dans la chronique. Chronique 30 événements + records, autosave agressive (chaque action + 8 s).

**Technique.** Vue **isométrique canvas maison** (PixiJS écarté, même arbitrage qu'Arkhantis : contrainte statique inline) ; moteur de sim pur JS testable à Node ; KERNEL (RNG par graine, save versionnée `car_save`, records `car_best`) ; mini-carte permanente ; audio WebAudio compact.

**Écarts MVP assumés** : escouade plafonnée à 3 (12 en V1), captures/esclavagistes et mutilations-prothèses reportés en V1, « sim légère hors-écran » simplifiée (tout est simulé, mais 22 entités au plus).

**Tests.** Suite moteur **64/64** (déterminisme, spreads de prix, compétences par l'usage, jauges et effets, KO/relève, défaite/vol/réveil, camps/opinions, embuscades, fondation/chantiers/production, raids avec et sans défenseurs, ruines/oasis, save/records) ; le banc a attrapé **3 vrais bugs** : chaîne d'endurance jamais initialisée (`km > undefined`), défaite solo gelant la sim, fondation calculée sur le centroïde (la recrue restée en ville faussait le site) ; le smoke a attrapé le **flux de fondation inatteignable** (E remplissait les outres au lieu d'ouvrir le chantier) ; smoke jsdom **20/20** ; non-régression des 6 autres jeux zéro erreur.

## Choix v21 — Nordheim (21ᵉ page, open world 3D procédural)

**Le jeu.** La plus grande surface jouable du site : une vallée nordique de 860 m de rayon générée par graine — trois mondes officiels (Loup, Ourse, Corbeau). Un village de 8 PNJ à agendas (travail le jour, maison la nuit), 320 arbres et 90 rochers instanciés, 12 cerfs et 8 loups, 6 ruines-donjons gardées (bandits puis revenants), 2 guildes (Chasseurs / Compagnie de la Hache) avec quêtes en chaîne, un forgeron qui vend et enchante, et un **Troll des Glaces** (420 PV) qui ne se réveille qu'après la purge de 5 ruines.

**Mécaniques.** Vue 3ᵉ personne (caméra épaule, molette), mêlée + sort de soin, XP par kills (+10 PV/+5 mana/+1 dégât par niveau), chasse (fourrure, crocs, viande) revendable, forge (2 armes, 2 armures, enchantement +25 %), potions, coffres par ruine, carte 2D (M), cycle jour/nuit de 6 minutes qui rend les loups deux fois plus perspicaces la nuit. Mourir ne coûte rien : réveil au feu du village.

**Technique.** Three.js r128 inline (même vendeur que LOGRES) : heightmap 97×97 par bruit fractal 4 octaves + couronne montagneuse + platelages (village, ruines), **couleurs par sommet** (prairie/roche/neige/terre), **InstancedMesh** pour arbres/pierres/coffres (~60 draw calls), pixelRatio plafonné ×1,5, zéro allocation dans la boucle, dispose systématique, fallback NoGL (la carte 2D devient l'interface). Le moteur de sim est pur JS (testable sans WebGL) ; le KERNEL fournit RNG par graine et sauvegarde `nor_save`.

**Écarts MVP assumés** : arc non livré (mêlée + soin), « compétences par usage » reporté en V1 (XP simple ici), monde 860 m plutôt que 2×2 km.

**Tests.** Suite moteur **71/71** (déterminisme des graines, platelage, chaîne des 6 quêtes avec verrous, réveil du troll à 5 ruines, niveaux/XP au seuil exact, défense, potions, enchant, économie, agendas jour/nuit, aggro nocturne, fuite des cerfs, KO/respawn, save/records) ; le banc a attrapé **2 vrais bugs** (chaînes de quêtes verrouillées par des clés numériques, joueur né dos au village) ; smoke jsdom **21/21** (NoGL compris) qui a attrapé 3 fautes de câblage (setWeapon sans renderer, label doublé, nom de guilde jamais inséré) ; non-régression des 5 autres jeux zéro erreur.

## Choix v20 — La Zone (20ᵉ page, survie FPS en raycasting)

**Le jeu.** Premier jeu du site **en première personne et en temps réel** : après le Grand Incident, un prospectionneur entre chaque jour dans un monde clos de 512×512 m (grille 64×64, 1 case = 8 m) semé d’anomalies, de caches, de meutes et de radiation. Cinq quêtes de camp, deux camps abrités (Le Hangar au sud, l’Avant-poste au nord), un rôdeur alpha au centre.

**Mécaniques.** 6 anomalies lisibles (Tremplin invisible qu’on sonde au boulon, Torche cyclique, Arc électrique, Aspirateur qui téléporte, Brume acide, Bourdon psychique qui ignore l’armure) ; **10 artefacts à bonus ET malus** portés par ceinture de 3 (le profil se construit, pas l’empilement) ; 4 jauges (santé, radiation, faim, endurance) ; geiger et détecteur dont les sons pilotent le gameplay ; le **Redout** : une émission de fin de journée, 45 s après la sirène pour rejoindre un camp. Mort = artefacts de poche perdus, −30 % de crédits, réveil au Hangar. La Zone régénère chaque jour (monde semé par la date, déterministe).

**Technique.** **Raycasting pur** façon Wolfenstein : 240 rayons DDA sur canvas 2D 480×270 pixelisé, zBuffer par colonne, sprites projetés, brouillard de distance — sans WebGL ni Three.js (réservé à Nordheim). **Audio 100 % synthétisé** en WebAudio (geiger, bips, sirène, rumeurs) : zéro fichier. Le KERNEL fournit RNG déterministe et sauvegarde versionnée (`zone_save`, records `zone_best`). Le dossier citait un « moteur Hub of Duty » jamais construit : le raycaster maison en tient lieu et reste réutilisable.

**Tests.** Suite moteur **78/78** (déterminisme, connexité BFS, raycast, LOS, FSM mutants, 6 anomalies dirigées, radiation, ceinture, économie, quêtes, Redout, mort/extraction) ; le banc a attrapé **3 vrais bugs** : régén ressuscitant à 0 PV, mutants arrêtés hors de leur portée d’attaque, meutes pondues sur la route à la sortie du camp (0 violation sur 12 jours après correctif) ; run automatique complète (traversée, ramassage, extraction, vente) ; smoke jsdom **16/16** ; non-régression des 4 autres jeux zéro erreur.

## Choix v19b — Les Ruines d'Arkhantis (19ᵉ page, hack & slash isométrique)

**Le jeu.** Premier temps réel du site : on **clique pour frapper**, les monstres arrivent en vague, le butin tombe en rayons de lumière colorés. Un Berserker à deux haches traverse **6 niveaux de temple procédural** ; les niveaux 2, 4 et 6 abritent un gardien unique (Korr la charge, la Tisseuse qui invoque, Vhal l'AoE télégraphé qui s'enrage).

**Mécaniques Diablo-like, sans Diablo.** 40 affixes procéduraux (20 stats × 2 paliers) qui composent des objets uniques (« Hache cruelle du bélier, clémente ») ; 4 compétences (Rage 250 %, Tourbillon, Cri de guerre, Souffle sanglant) ; arbre de maîtrise 12 points en 6 branches ; la **Faille du jour** tire 2 modificateurs parmi 8 (Braise, Nuée, Ruée, Brume…) déterminés par la date — mêmes règles pour tous les visiteurs.

**Technique.** Même KERNEL que Cendres/Confrérie/LOGRES (`rpg-core.js` : RNG, loot, inventaire, sauvegarde) ; rendu **canvas 2D isométrique maison** (losanges 52×26, tri par profondeur, brouillard radial) — le dossier citait PixiJS, écarté pour tenir la contrainte « statique, tout inline, sans build step ». Boss = machines à états (charge en 8 pas, invocation, AoE télégraphé). Autosave du camp entre les runs.

**Tests.** Suite moteur 29/30 au premier passage → 1 test assoupli (`>=` sur l'attaque : aucun affixe dégâts n'était garanti) ; le smoke navigateur a attrapé un **vrai bug d'UI** (crash du journal quand le dernier message expire) — corrigé puis re-testé. Run automatique complète : portail atteint, victoire, niveau débloqué. Non-régression LOGRES/Confrérie : zéro erreur jsdom.

## Choix v19 — LOGRES V1 (mise à jour majeure de la 18ᵉ page)

**Périmètre** : LOGRES passe du MVP (v18) à la **V1** conformément à la feuille de route
(provinces ×14, Table Ronde, capacités, moral, fins multiples). Arkhantis (MVP : 1 acte,
1 classe, 40 affixes, 3 boss) est l'étape suivante de v19.

**KERNEL enrichi** (`src/kernel/combat-tb.js`) — réutilisable par la Confrérie (non affectée, testé) :
- **Capacités héroïques** (action `ability`) : strike (×2 dégâts, adjacent, sans riposte),
  pierce (ignore l'armure), rally (+2 déf aux alliés proches, 1 manche), heal (+6 PV adjacents),
  nova (éclat de zone) — strike/pierce consomment l'attaque du tour, les autres sont gratuites ;
  1 usage par bataille. `makeUnit` honore `maxhp` fourni (déploiement blessé possible).
- **Moral** : `routAt` (fraction de PV) — en début de manche, une unité démoralisée peut fuir
  (30 %/manche) ; un fuyard ne laisse pas de butin. Réservé aux ennemis faibles dans LOGRES.

**Campagne V1** (`src/logres-engine.js`, réécrit) :
- **14 provinces** scénarisées (9 nouvelles : Karnag, Pont-aux-Corbeaux, Marais d'Ys, Route du Sel,
  Tombes des Rois, Bois Sans Retour, Val-aux-Loups, Portes de Fer, Sallesbières), difficulté
  croissante (6 → 12 ennemis), nouveaux ennemis : **cavalier saxon** (rapide) et **chaman picte**
  (tir arcanique).
- **8 héros** : 2 de départ + 3 recrues de quêtes (+ Gaheris aux Tombes des Rois) + **3 recrutables
  à la Table Ronde** (Gauvain 120 or, Galaad 140, Morgane la Voix des Brumes — nouveau type « sage »,
  héros à distance avec Nova).
- **Loyautés & jalousies** : chaque héros a loyauté 0-10 et une sensibilité (✝ grâce / ⚔ fer) ;
  les choix d'événements déplacent les loyautés selon l'axe, sous 3 le chevalier boude la campagne,
  à 0 il quitte la Table pour de bon.
- **6 fins de règne** : 3 teintes de jauge × variante sombre (Table clairsemée / régiments anéantis).
- Faveurs, artefacts, XP, régiments (6 max), autosave `logres_save` : inchangés.

**UI** : Table Ronde (recrutement de héros), loyautés affichées (♥, axes, avertissements), bouton
**Capacité (E)**, float de soin vert, écran final avec titre de règne, bouton « Marcher » désactivé
si l'armée est vide.

**Tests** : KERNEL capacités/moral 100 % vert (strike ×2 sans riposte, pierce vs déf 50, nova 2
cibles, heal +6, rally +2 déf avec purge en manche 2, usage unique, fuite mesurée en 4 graines,
fuite = pas de butin) ; campagne V1 (14 provinces, loyautés, recrutement, départ à 0, 3+1 fins,
save/restore) ; **auto-campagnes IA : 3/4 mènent les 14 provinces à terme, zéro blocage** ;
non-régression Confrérie ✓ ; smoke jsdom 13/13 (Table Ronde → recrutement → bataille 12 unités →
5 rounds sans erreur, fallback NoGL) ; validation page 11/11 (HTML équilibré, 6 scripts inline,
sitemap 18, zéro « € »). Les deux pages embarquant combat-tb (Confrérie, LOGRES) réassemblées.

**SEO** : meta desc V1 (14 provinces, loyautés), textes/FAQ mis à jour (loyauté, moral).
