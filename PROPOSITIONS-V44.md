# 10 propositions d'améliorations & nouvelles fonctions — site C.I.M. (sept. 2026)

Toutes compatibles avec nos contraintes : site **statique** (alwaysdata), JS **inline ES5/UMD ou module sans build**, aucun backend, aucun « € », images JPG ≤ 10/vague. Classées du plus accrocheur/immédiat au plus structurant.

## 1. Le Laboratoire IA du navigateur (Transformers.js v4 + WebGPU)
Nouvelle page-vitrine avec 3 micro-démos **réelles** qui tournent chez le visiteur : classification de sentiment en français, **détection d'objets** sur une photo déposée (ViT ~91 Mo, chargée au clic puis mise en cache), **dictée vocale** (Whisper tiny). Argument massue réaffiché : « rien ne quitte votre navigateur ». Hors ligne après 1ʳᵉ charge. ← Transformers.js v4/WebGPU (r/javascript, avr. 2026) ; WebGPU ~80 % de couverture (krisdigital).
**Page** : demo-ia.html ou nouvelle labo-navigateur.html · **Effort** : ●●● (gros mais différenciant)

## 2. Le Planétarium sémantique (RAG visible à l'œil)
~200 phrases du site (romans, émissions, services) projetées en 2D par **embeddings calculés dans le navigateur** ; le visiteur tape une phrase, les points proches s'illuminent avec des fils. Le RAG « distances dans le sens » enfin visible, en direct. Précédent : Semantic Galaxy de Simon Willison. Complète le mini-RAG à mots-clés d'ia-souveraine.
**Page** : ia-souveraine.html (section RAG) · **Effort** : ●●●

## 3. Scrollytelling « Les six étages de la machine éditoriale »
machine-editoriale.html devient un récit au défilement : chapitres épinglés, une visual qui se transforme à chaque étage (domaine public → BD → relecture → publication), **IntersectionObserver + CSS view-timeline**, transform/opacity uniquement, fallback statique pour petits appareils. ← tendance 2026 mainstream (r/webdev, svilenkovic) ; sites « living demo » (scrollytelling.ai).
**Page** : machine-editoriale.html 🔒 (additif) · **Effort** : ●●

## 4. La nuit d'OpenClaw — journal d'orchestrateur en direct simulé
Un tableau de bord nocturne : tâches qui s'enchaînent, logs tapés à l'écran, outils MCP appelés, cases qui se cochent, budget de permissions respecté (gouvernance visible). Simulation **déterministe et honnête** (badge « reconstitution »), zéro faux live.← tendance MCP/A2A 2026 (olostep).
**Page** : open-source.html · **Effort** : ●

## 5. Galerie 3D de la Bibliothèque des Mondes
Une salle Three.js (notre stack ES5 éprouvée des 9 jeux) : 10 fenêtres-mondes alignées, chacune l'ambiance d'un roman (couleur, brume, particules) ; clic → fiche + lien vers la liseuse. Le « 40 romans » devient un lieu qu'on visite.
**Page** : realisations.html → bibliotheque-3d.html · **Effort** : ●●

## 6. L'œil de la machine — jeu de reconnaissance en webcam
« Trouvez 5 objets que l'IA reconnaît » : détection live devant la webcam ou sur photo, score, partie en 60 s. Pédagogique, viral, 100 % local. Réutilise le modèle du Labo (§1). Badge vie privée permanent.
**Page** : demo-image.html ou labo · **Effort** : ●● (après §1)

## 7. Le comparateur de modèles ouverts
 « Vingt-quatre modèles en un mois » (notre article) devient un outil : filtres taille/licence/contexte/usage + radar SVG inline par modèle. Vitrine d'expertise pour pros, données statiques mises à jour à chaque vague.
**Page** : open-source.html · **Effort** : ●

## 8. Séance d'hypnose d'essai — voix, souffle et progression
Le vrai premier chapitre de l'app hypnose en démonstration : cercle de respiration SVG animé, voix off guidée (vraie audio française générée), minuterie douce, fond sonore Web Audio. Accrocheur, sensoriel, unique sur un site d'association.
**Page** : realisations.html (section Hypnose) · **Effort** : ●

## 9. Quiz « IA ou humain ? »
10 extraits (nos émissions, nos romans, des textes IA) : devinez qui a écrit. Score, explications pédagogiques après chaque réponse, partage du score en texte. Alimente Mental OS et le discours « esprit critique » du site.
**Page** : medias.html ou accueil · **Effort** : ●

## 10. Le pouls du Hub — tableau de bord vivant du site
Chiffres honnêtes injectés par build.py : pages, images (79+), lignes de code des 9 jeux, articles publiés, épisodes — mini-graphes SVG animés au scroll + « dernière mise à jour ». La vitrine de notre propre production, toujours juste car générée au build.
**Page** : index.html ou nouveau hub-stats.html · **Effort** : ●

## Ordre de bataille suggéré
- **Vague rapide (v44)** : §8 hypnose, §9 quiz, §7 comparateur, §4 journal OpenClaw, §10 pouls — 5 démos légères, 0-2 images.
- **Vague lourde (v45+)** : §3 scrollytelling, §5 galerie 3D, puis §1 labo navigateur → §6 œil de la machine, §2 planétarium.
