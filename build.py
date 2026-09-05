#!/usr/bin/env python3
"""Build du site Hub IA C.I.M. — assemble header/nav/footer + corps de pages depuis src/,
+ SEO complet : meta suite, JSON-LD (graph), sitemap.xml, robots.txt, llms.txt."""
import os
import re
import json

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')

LOGO = '''<svg width="36" height="36" viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect x="2" y="2" width="36" height="36" rx="11" fill="#0c87a8"/><circle cx="14" cy="15" r="3.2" fill="#fff"/><circle cx="26" cy="15" r="3.2" fill="#a5e3f4"/><circle cx="20" cy="26" r="3.2" fill="#fff"/><path d="M14 15 L26 15 M14 15 L20 26 M26 15 L20 26" stroke="#fff" stroke-width="1.6" stroke-opacity=".7"/></svg>'''

# Navigation aplatie : chaque page accessible en un clic (pas de sous-menus)
NAV = [
    ('index.html', 'Accueil'),
    ('demo-ia.html', 'Chat IA'),
    ('demo-image.html', 'Images IA'),
    ('agents-ia.html', 'Agents IA'),
    ('machine-editoriale.html', 'Éditoriale'),
    ('ia-souveraine.html', 'Souveraine'),
    ('open-source.html', 'Open source'),
    ('jeux-video.html', 'Jeux IA'),
    ('actualites.html', 'Actus'),
    ('medias.html', 'Médias'),
    ('realisations.html', 'Réalisations'),
    ('services.html', 'Services'),
]

def nav_html(current):
    items = []
    for href, label in NAV:
        active = ' class="active"' if current == href else ''
        items.append(f'<li><a href="{href}"{active}>{label}</a></li>')
    return ''.join(items)

SITE = 'https://cim.alwaysdata.net'
LASTMOD = '2026-08-30'
SAME_AS = [
    'https://www.youtube.com/@nexus-horizon-ai',
    'https://www.youtube.com/@melodyz2026',
    'https://www.youtube.com/@essentiel2026',
    'https://www.youtube.com/@k-antiques1823',
    'https://www.youtube.com/@sfr2026',
]

# Mots-clés par page (meta keywords + JSON-LD) — invisibles, ciblés sur les requêtes réelles
KEY = {
    'index.html': "hub intelligence artificielle Montpellier, club informatique multimédia, IA souveraine, agents IA autonomes, machine éditoriale, FabLab, chatbot local gratuit, générateur d'images IA gratuit, jeux contre l'IA, échecs contre ordinateur, actualité IA française, IA expliquée simplement, atelier mémoire IA, open source LLM, économie sociale et solidaire",
    'demo-ia.html': 'chatbot gratuit sans inscription, IA dans le navigateur, WebLLM, WebGPU, chatbot local, IA privée, tester une IA gratuitement, modèle de langage navigateur, IA sans compte, confidentialité IA, démo IA française, Ollama, Mistral local',
    'demo-image.html': "générateur d'images IA gratuit, texte vers image, text to image français, IA dessin gratuit, création d'images par intelligence artificielle, sans inscription, Pollinations, style BD aquarelle pixel art, illustration par IA",
    'agents-ia.html': "agents IA autonomes, équipe d'agents IA, automatisation des tâches répétitives, CrewAI, LangGraph, différence agent et chatbot, appels d'offres automatisés, veille automatisée, orchestration multi-agents, Hermes Agent, OpenClaw, agence d'agents",
    'machine-editoriale.html': "machine éditoriale, écrire un livre avec l'IA, créer une BD avec l'intelligence artificielle, podcast IA, auto-édition assistée par IA, Kindle KDP, chaîne éditoriale avec relecture humaine, contenu pour influenceurs, fiches pédagogiques IA, documentation d'entreprise IA",
    'ia-souveraine.html': "IA souveraine, RAG explication simple, assistant IA sur documents internes, hébergement en France, RGPD et intelligence artificielle, chatbot d'entreprise, sortir des GAFAM, base vectorielle locale, souveraineté numérique, IA on-premise",
    'open-source.html': 'LLM open source, Mistral, Qwen, Llama, DeepSeek, modèles ouverts, Ollama, LM Studio, Cursor, Claude Code, Codex, Antigravity de Google, VSCode, agents de code, robotique éducative, poids ouverts, agentique',
    'jeux-video.html': "jeux contre l'IA, intelligence artificielle dans les jeux vidéo, minimax expliqué, morpion parfait, puissance 4 IA, Othello, 2048, Mastermind, Snake autonome, jeux gratuits dans le navigateur, pédagogie par le jeu",
    'bibliotheque-3d.html': "bibliothèque des mondes 3D, galerie 3D navigateur, WebGL Three.js, 40 romans en accès libre, liseuses en ligne gratuites, romans français à lire, science-fiction thrillers romans, couvertures de romans, visite 3D bibliothèque, lecture en ligne",
    'echecs.html': "échecs contre ordinateur, jouer aux échecs gratuitement, échecs en ligne sans inscription, IA d'échecs à niveaux, alpha-bêta, moteur d'échecs javascript, apprendre les échecs, échecs 3D, échecs contre IA, partie d'échecs facile",
    'hub-of-duty.html': "FPS Terminator, jeu de tir 3D navigateur, Skynet, endosquelette, chasseur HK, laser, vagues de robots, FPS gratuit sans téléchargement, jeu de tir français, résistance aux machines, hommage Terminator",
    'cendres.html': 'roguelike gratuit navigateur, jeu de rôle français, donjon procédural, rogue like sans inscription, dungeon crawler web, potions à identifier, permadeath, défi du jour donjon, IA des jeux vidéo expliquée, FOV ray casting, BFS expliqué simplement, rpg tour par tour navigateur',
    'confrerie.html': 'jeu tactique tour par tour gratuit, rpg tactique navigateur, mercenaires jeu de role, wargame hexagones navigateur, tactical rpg français sans inscription, Battle Brothers like gratuit, jeu de stratégie au tour par tour, compagnie de mercenaires, initiative fatigue riposte',
    'logres.html': 'jeu de stratégie médiéval 3d navigateur, wargame hexagones gratuit, légende arthurienne jeu, chevaliers de la table ronde jeu, jeu tactique 3d léger, conquête provinces tour par tour, roi légitime ou tyran, jeu de bataille hexagonal français, Three.js jeu, wargame gratuit sans inscription',
    'arkhantis.html': 'hack and slash navigateur gratuit, jeu de loot français, diablo like sans inscription, rpg action isométrique navigateur, affixes objets aléatoires, berserker jeu navigateur, faille du jour jeu, donjon procédural temps réel, arbre de compétences jeu, butin légendaire',
    'zone.html': 'jeu de survie navigateur gratuit, fps navigateur sans inscription, raycasting jeu français, jeu anomalies artefacts radiation, survival horror navigateur, détecteur artefacts jeu, émission redout survie, jeu post-apocalyptique gratuit, moteur raycasting javascript, jeu de zone interdite',
    'nordheim.html': 'open world navigateur gratuit, rpg 3d navigateur sans téléchargement, jeu viking procédural français, three.js open world, jeu de chasse et forge, guilde quêtes jeu navigateur, montagne neige vallée jeu, monde généré par graine, troll boss jeu gratuit, rpg nordique browser',
    'caravanes.html': 'jeu de caravane commerce navigateur, sandbox escouade gratuit, kenshi like navigateur français, jeu désert post-apocalyptique, acheter vendre marchandises jeu, base building jeu navigateur, gestion escouade browser, jeu de survie désert gratuit, factions opinions jeu, avant-poste oasis',
    'actualites.html': "actualité intelligence artificielle, news IA en français, veille IA, articles d'investigation IA, agents IA actualité, nouveaux modèles LLM, robots humanoïdes, jeux vidéo et IA, livres et BD, régulation de l'IA",
    'medias.html': 'podcasts intelligence artificielle, chaîne YouTube IA, Nexus Horizon AI, musique générée par IA, K-pop virtuelle Melodyz, livres KDP, BD photoréaliste, médias génératifs, studio IA',
    'realisations.html': "réalisations IA, portfolio intelligence artificielle, romans en ligne, jeux faits avec l'IA, groupe virtuel de K-pop, album musical IA, BD par IA, projets IA en France, FabLab Montpellier",
    'services.html': 'solutions IA pour entreprises, formation IA Montpellier, ateliers IA pour particuliers, assistant IA souverain, conseil en intelligence artificielle, accompagnement IA, FabLab, économie sociale et solidaire, projet IA sur mesure',
    'contact.html': 'contact Hub IA, association intelligence artificielle Montpellier, contacter le C.I.M., projet IA accompagnement, premier échange offert, écrire au Hub IA',
}

OGIMG = {
    'index.html': 'img/home-hero.jpg', 'demo-ia.html': 'img/voix-hero.jpg',
    'demo-image.html': 'img/imagination.jpg', 'agents-ia.html': 'img/agents-hero.jpg',
    'machine-editoriale.html': 'img/me-hero.jpg', 'jeux-video.html': 'img/arcade2.jpg',
    'echecs.html': 'img/echecs-hero.jpg', 'cendres.html': 'img/cendres-hero.jpg', 'confrerie.html': 'img/gris-hero.jpg', 'logres.html': 'img/logres-hero.jpg', 'arkhantis.html': 'img/arkhantis-hero.jpg', 'zone.html': 'img/zone-hero.jpg', 'nordheim.html': 'img/nordheim-hero.jpg', 'caravanes.html': 'img/caravanes-hero.jpg',
    'hub-of-duty.html': 'img/fps-hero.jpg', 'open-source.html': 'img/fablab.jpg',
    'ia-souveraine.html': 'img/sovereign.jpg', 'actualites.html': 'img/actu-hero.jpg',
    'medias.html': 'img/studio-hero.jpg', 'realisations.html': 'img/bdwall.jpg',
    'bibliotheque-3d.html': 'img/bibliotheque/le_plus_grand_des_secrets.jpg',
    'services.html': 'img/services.jpg', 'contact.html': 'img/reunion.jpg',
}

# FAQ visible sur la page « IA souveraine » → FAQPage JSON-LD fidèle au contenu
FAQ_SOVER = [
    ("L'IA peut-elle « fuiter » nos informations ?",
     "Non, c'est le principe même de l'offre : le modèle fonctionne chez vous ou chez un hébergeur français, sans envoyer vos documents sur des services étrangers. Nous vous fournissons le schéma d'architecture qui le prouve, noir sur blanc."),
    ("Et si l'assistant se trompe ?",
     "Il ne peut citer que vos documents, et chaque réponse affiche sa source. Si l'information n'existe pas dans vos documents, il le dit plutôt que d'inventer. Pour les sujets sensibles, une validation humaine peut être exigée avant diffusion."),
    ("Combien de documents peut-il absorber ?",
     "De quelques centaines à plusieurs dizaines de milliers. Le diagnostic offert permet de dimensionner précisément — et le premier prototype se limite volontairement à un périmètre bien choisi pour prouver la valeur vite."),
    ("Nos équipes doivent-elles être techniques ?",
     "Pas du tout : elles posent des questions en français, comme à un collègue. La formation incluse dans nos offres s'adresse aux utilisateurs finaux, pas aux informaticiens."),
]

# Étapes réelles de la démo « machine éditoriale » → HowTo JSON-LD
HOWTO_STEPS = [
    ("Vous", "Vous choisissez le sujet, le plan et le ton : la machine ne part jamais d'une page blanche toute seule."),
    ("Agent rédacteur", "Un agent IA écrit le brouillon du chapitre ou de la planche à partir de votre plan."),
    ("Agent RAG", "Un second agent s'appuie sur vos documents et sources pour vérifier les faits et les noms."),
    ("Agent correcteur", "Un troisième agent corrige style, cohérence et orthographe, et signale ses modifications."),
    ("Validation humaine", "Vous relisez, coupez, reformulez : rien n'est publié sans votre accord à cette étape."),
    ("Couverture IA", "Un visuel de couverture est proposé, décliné aux formats impression et écran."),
    ("Publication", "Mise en page finale puis impression ou publication Kindle, avec vos mentions d'auteur."),
]

PTYPE = {
    'demo-ia.html': 'WebApplication', 'demo-image.html': 'WebApplication',
    'echecs.html': 'SoftwareApplication', 'actualites.html': 'Blog',
    'ia-souveraine.html': 'FAQPage', 'contact.html': 'ContactPage',
    'medias.html': 'CollectionPage', 'realisations.html': 'CollectionPage',
}

MOIS_ISO = {'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04', 'mai': '05', 'juin': '06',
            'juillet': '07', 'août': '08', 'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'}

def _iso_date(fr):
    m = re.match(r'(\d+)\s+([a-zéûà]+)\s+(\d+)', fr)
    if not m:
        return LASTMOD
    return f'{m.group(3)}-{MOIS_ISO.get(m.group(2), "01")}-{int(m.group(1)):02d}'

def _blog_posts():
    s = open(os.path.join(SRC, 'actualites.body.html'), encoding='utf-8').read()
    out = []
    for m in re.finditer(r'<article class="post" id="(art\d+)">.*?<span class="post-date">([^<]+)</span>.*?<h2>([^<]+)</h2>', s, re.S):
        out.append({"@type": "BlogPosting", "url": SITE + '/actualites.html#' + m.group(1),
                    "name": m.group(3).strip(), "datePublished": _iso_date(m.group(2))})
        if len(out) >= 12:
            break
    return out

def _org():
    return {"@type": "Organization", "@id": SITE + '/#org',
            "name": "Hub IA du C.I.M. — Club Informatique & Multimédia",
            "url": SITE + '/', "foundingDate": "2015-08-12",
            "description": "Hub IA & FabLab associatif (ESS) à Montpellier : IA souveraine, agents autonomes, machine éditoriale, open source, robotique, jeux vidéo.",
            "areaServed": ["Montpellier", "La Grande-Motte", "Pérols", "Lattes", "Hérault", "Occitanie", "France"],
            "address": {"@type": "PostalAddress", "addressLocality": "Montpellier",
                        "addressRegion": "Occitanie", "postalCode": "34000", "addressCountry": "FR"},
            "sameAs": SAME_AS}

def _website():
    return {"@type": "WebSite", "@id": SITE + '/#website', "url": SITE + '/',
            "name": "Hub IA C.I.M.", "inLanguage": "fr-FR", "publisher": {"@id": SITE + '/#org'}}

def _breadcrumb(fname, label):
    items = [{"@type": "ListItem", "position": 1, "name": "Accueil", "item": SITE + '/'}]
    if fname != 'index.html':
        items.append({"@type": "ListItem", "position": 2, "name": label, "item": SITE + '/' + fname})
    return {"@type": "BreadcrumbList", "itemListElement": items}

def _entity(fname, title, desc):
    label = title.split(' | ')[0].split(' — ')[0].strip()
    url = SITE + '/' if fname == 'index.html' else SITE + '/' + fname
    e = {"@type": PTYPE.get(fname, 'WebPage'), "@id": url + '#page', "url": url,
         "name": label, "description": desc, "inLanguage": "fr-FR",
         "image": SITE + '/' + OGIMG.get(fname, 'img/home-hero.jpg'),
         "keywords": KEY.get(fname, ''), "isPartOf": {"@id": SITE + '/#website'},
         "about": {"@id": SITE + '/#org'}}
    if fname in ('demo-ia.html', 'demo-image.html', 'echecs.html'):
        e["isAccessibleForFree"] = True
        e["operatingSystem"] = "Navigateur web (Windows, macOS, Linux, Android, iOS)"
    if fname == 'demo-ia.html':
        e["applicationCategory"] = "BrowserApplication"
    if fname == 'demo-image.html':
        e["applicationCategory"] = "DesignApplication"
    if fname == 'echecs.html':
        e["applicationCategory"] = "GameApplication"
        e["applicationSubCategory"] = "Jeu d'échecs"
        e["playMode"] = "SinglePlayer"
        e["softwareVersion"] = "1.0"
        e["author"] = {"@id": SITE + '/#org'}
    if fname == 'actualites.html':
        e["blogPost"] = _blog_posts()
    if fname == 'ia-souveraine.html':
        e["mainEntity"] = [{"@type": "Question", "name": q,
                            "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ_SOVER]
    return e

def ld_graph(fname, title, desc):
    graph = [_org(), _website(),
             _breadcrumb(fname, title.split(' | ')[0].split(' — ')[0].strip()),
             _entity(fname, title, desc)]
    if fname == 'machine-editoriale.html':
        graph.append({"@type": "HowTo",
                      "name": "Comment fonctionne la machine éditoriale du Hub IA : du sujet au livre publié",
                      "step": [{"@type": "HowToStep", "position": i + 1, "name": n, "text": t}
                               for i, (n, t) in enumerate(HOWTO_STEPS)]})
    return json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)

def header(current, title, desc):
    img = SITE + '/' + OGIMG.get(current, 'img/home-hero.jpg')
    canon = SITE + '/' if current == 'index.html' else SITE + '/' + current
    ld = ld_graph(current, title, desc)
    return f'''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="data:,">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="keywords" content="{KEY[current]}">
<meta name="author" content="C.I.M. — Club Informatique & Multimédia, Montpellier">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta name="theme-color" content="#0c87a8">
<meta name="geo.region" content="FR-34">
<meta name="geo.placename" content="Montpellier">
<meta name="ICBM" content="43.6108, 3.8767">
<link rel="canonical" href="{canon}">
<link rel="alternate" hreflang="fr" href="{canon}">
<link rel="alternate" hreflang="x-default" href="{canon}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Hub IA C.I.M. — Montpellier">
<meta property="og:locale" content="fr_FR">
<meta property="og:url" content="{canon}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="654">
<meta property="og:image:alt" content="{title.split(" | ")[0]}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{img}">
<script type="application/ld+json">
{ld}
</script>
<link rel="stylesheet" href="style.css">
</head>
<body>
<header class="site-header" id="top">
  <nav class="nav" aria-label="Navigation principale">
    <a class="logo" href="index.html">{LOGO}<span>C.I.M.<small>HUB IA · FABLAB</small></span></a>
    <button class="burger" id="burger" aria-label="Ouvrir le menu">☰</button>
    <ul class="nav-list" id="navList">{nav_html(current)}<li><a class="btn btn-primary btn-sm nav-cta" href="contact.html">Nous écrire</a></li></ul>
  </nav>
</header>
'''

FOOTER = '''
<footer class="site-footer">
  <div class="foot-grid">
    <div class="foot-brand">
      <b style="color:#fff;font-size:1.05rem">C.I.M. — Hub IA & FabLab</b>
      <p style="margin-top:10px">Le hub d'intelligence artificielle du Club Informatique & Multimédia — association loi 1901, champ ESS.<br>Montpellier · La Grande-Motte · Pérols · Lattes — et à distance partout en France.</p>
    </div>
    <div>
      <h4>Démonstrations</h4>
      <ul>
        <li><a href="demo-ia.html">💬 Chat IA local</a></li>
        <li><a href="demo-image.html">🎨 Générateur d'images</a></li>
        <li><a href="jeux-video.html">🕹️ Jeux contre l'IA</a></li>
        <li><a href="agents-ia.html">🤖 Équipe d'agents</a></li>
      </ul>
    </div>
    <div>
      <h4>Expertises</h4>
      <ul>
        <li><a href="ia-souveraine.html">IA souveraine & RAG</a></li>
        <li><a href="agents-ia.html">Agents autonomes</a></li>
        <li><a href="machine-editoriale.html">Machine éditoriale</a></li>
        <li><a href="open-source.html">Open source & robotique</a></li>
      </ul>
    </div>
    <div>
      <h4>Explorer</h4>
      <ul>
        <li><a href="actualites.html">Fil d'actualité IA</a></li>
        <li><a href="medias.html">Nos médias</a></li>
        <li><a href="services.html">Solutions</a></li>
        <li><a href="contact.html">Contact</a></li>
      </ul>
    </div>
  </div>
  <div class="foot-bottom"><div class="foot-bottom-in">
    <span>© <span data-year></span> Hub IA C.I.M. — association loi 1901 · ESS · hébergé en France sur alwaysdata.</span>
    <span>Fait en Occitanie, avec des agents IA et beaucoup de café ☕</span>
  </div></div>
</footer>
<script src="script.js"></script>
</body>
</html>
'''

PAGES = {
    'index.html': ('C.I.M. — Hub IA & FabLab · Montpellier | IA souveraine, agents autonomes, machine éditoriale, jeux vidéo',
        "Le Hub IA du C.I.M. : démos gratuites (chat IA local, générateur d'images, jeux contre l'IA), IA souveraine, agents autonomes, machine éditoriale, open source & actualité IA expliquée simplement."),
    'demo-ia.html': ('Démo IA gratuite — un chatbot qui tourne sur votre ordinateur | Hub IA C.I.M.',
        'Testez gratuitement une IA qui fonctionne entièrement dans votre navigateur via WebLLM (MLC-AI) : aucune inscription, aucune donnée envoyée.'),
    'demo-image.html': ("Générateur d'images IA gratuit — texte vers image | Hub IA C.I.M.",
        "Transformez vos descriptions en images gratuitement grâce au texte-vers-image open source de Pollinations.ai : styles photo, BD, aquarelle, pixel art."),
    'agents-ia.html': ("Agents IA autonomes — une équipe numérique pour vos tâches répétitives | Hub IA C.I.M.",
        "Une équipe d'agents IA (chef d'équipe, chercheur, rédacteur, vérificateur) pour vos appels d'offres, veille et tri. Démonstration interactive."),
    'machine-editoriale.html': ('Machine éditoriale — livres, BD et podcasts avec IA + relecture humaine | Hub IA C.I.M.',
        "Comment transformer une expertise en livre, une histoire en BD, une voix en podcast. La chaîne de production expliquée de bout en bout, avec exemples."),
    'jeux-video.html': ("Jeux contre l'IA — Morpion parfait, Puissance 4, Othello, 2048, Mastermind, Snake | Hub IA C.I.M.",
        "Six jeux jouables contre de vraies IA : Morpion imbattable (minimax), Puissance 4 qui anticipe 6 coups, Othello express, 2048 piloté par une IA, Mastermind déduit par élimination et Snake autonome."),
    'bibliotheque-3d.html': ('La Bibliothèque des Mondes en 3D — 40 romans, 40 fenêtres-mondes | Hub IA C.I.M.',
        "Une rotonde 3D dans votre navigateur : les 40 couvertures de la collection deviennent des fenêtres-mondes éclairées à l'ambiance de chaque roman. Cliquez une couverture, la fiche s'ouvre, la liseuse vous attend. WebGL, tout local."),
    'echecs.html': ("Échecs contre l'IA — 8 niveaux, vue 3D, indices | Hub IA C.I.M.",
        "Jouez gratuitement aux échecs contre notre IA, directement dans le navigateur : 8 niveaux, annulation de coup, indices, vue 3D et fenêtre de réflexion en direct. Règles complètes, rien à installer."),
    'open-source.html': ('Open source, LLM & agentique — Mistral, Qwen, Hermes, OpenClaw, outils de code | Hub IA C.I.M.',
        "Les modèles ouverts (Mistral, Qwen, Llama, DeepSeek, Gemma), l'agentique expliquée, nos agents Hermes & OpenClaw, les outils de code (Cursor, Codex, Claude Code, Antigravity) et la robotique."),
    'ia-souveraine.html': ("IA souveraine — un assistant sur vos documents, sans cloud public | Hub IA C.I.M.",
        "Un assistant IA qui répond à partir de vos documents internes, en citant ses sources, hébergé chez vous ou en France. Explication simple et solutions."),
    'cendres.html': ('CENDRES — roguelike gratuit dans le navigateur : 4 classes, 8 profondeurs, IA expliquée | Hub IA C.I.M.',
        "Jouez gratuitement à CENDRES, un roguelike français 100 % navigateur : 4 classes, donjons générés à chaque partie, potions à identifier, dieux à honorer, Défi du jour et IA des monstres expliquée simplement. Sans compte, sans installation."),
    'confrerie.html': ('La Confrérie du Gris — RPG tactique gratuit au tour par tour | Hub IA C.I.M.',
        "Dirigez une confrérie de mercenaires dans ce RPG tactique hexagonal 100 % navigateur : initiative, fatigue, ripostes, arbalétriers, blessures permanentes, salaires. 3 contrats, IA ennemie expliquée. Gratuit, sans compte."),
    'logres.html': ('LOGRES — La Table Ronde : wargame 3D léger, 14 provinces, Légitime ou Tyran | Hub IA C.I.M.',
        "LOGRES V1 : quatorze provinces à reconquérir à la tête de la Table Ronde dans ce wargame hexagonal 3D léger 100 % navigateur. 8 chevaliers aux capacités uniques, loyautés et jalousies, artefacts, moral des ennemis, six fins de règne (Légitime ou Tyran). Gratuit, sans compte."),
    'caravanes.html': ('Caravanes — sandbox d\u2019escouade et de commerce dans le désert, gratuit | Hub IA C.I.M.',
        "Commencez seul et faible dans un désert post-apocalyptique : achetez bas, vendez haut entre quatre villes aux prix jaloux, engagez des compagnons qui apprennent en faisant, fondez un avant-poste près d\u2019une oasis et tenez-le contre les Pillards du Sable. Ici, perdre fait partie du récit."),
    'nordheim.html': ('Nordheim — open world viking 3D procédural, gratuit dans le navigateur | Hub IA C.I.M.',
        "Une vallée nordique générée par un mot : montagnes, forêts instanciées, village vivant, six ruines, deux guildes et un Troll des Glaces. Open world 3D en Three.js, chasse, forge, XP et quêtes — gratuit, sans compte, sans téléchargement."),
    'zone.html': ('La Zone — jeu de survie FPS en raycasting, gratuit dans le navigateur | Hub IA C.I.M.',
        "Après le Grand Incident : anomalies, artefacts à bonus et malus, radiation, détecteur qui chante et Redout à la sirène. Un FPS de survie en première personne rendu par raycasting pur (240 rayons, canvas 2D, audio synthétisé) — gratuit, sans compte, sans installation, explicable."),
    'arkhantis.html': ('Les Ruines d’Arkhantis — hack & slash isométrique gratuit dans le navigateur | Hub IA C.I.M.',
        "Cliquez, découpez, ramassez : un hack & slash isométrique 100 % navigateur. Un Berserker, 6 niveaux de temple procédural, 40 affixes d\'objets, 3 gardiens uniques et la Faille du jour avec modificateurs partagés. Gratuit, sans compte, sans installation."),
    'actualites.html': ("Actus IA — 51 articles d'investigation : agents, modèles, robots, outils, jeux, livres | Hub IA C.I.M.",
        "L'actualité de l'IA, enquêtée et expliquée : 51 articles fouillés classés du plus récent au plus ancien — Hermes et ses compétences, 24 modèles en un mois, GLM-5.3, humanoïdes de Pékin, agences d'agents, livres, BD."),
    'medias.html': ('Nos médias — Nexus Horizon AI, ouvrages KDP, BD, musique | Hub IA C.I.M.',
        "160+ podcasts, 40+ ouvrages, BD et musique générative : la preuve par l'exemple de nos chaînes de production IA."),
    'realisations.html': ("Nos réalisations — 160 podcasts, 40 romans, jeux, BD et musique faits avec l'IA | Hub IA C.I.M.",
        "Le portfolio : chaîne NEXUS HORIZON AI (4 émissions), groupe virtuel de K-pop Melodyz, album de Michael Shepherd, 40 romans en ligne, 15+ jeux, liseuses, BD photoréalistes et livres publiés sur Amazon."),
    'services.html': ('Solutions IA sur mesure — entreprises, créateurs, makers | Hub IA C.I.M.',
        "Assistants souverains, équipes d'agents, livres et BD, formation, FabLab : nos solutions expliquées, sur devis clair. Association ESS."),
    'hub-of-duty.html': ("Hub of Duty — FPS 3D gratuit dans le navigateur : vagues de machines de Skynet | Hub IA C.I.M.",
        "Le FPS hommage à l'univers Terminator, jouable sans téléchargement : endosquelettes ESK-800, infiltrateurs mimétiques, chasseurs HK aériens et lourds. Lasers, vagues infinies, IA traqueuse — 100 % procédural, 100 % local."),
    'contact.html': ('Contact — parlons de votre projet IA | Hub IA C.I.M.',
        'Premier échange offert, réponse sous 48 h. Entreprises, créateurs, étudiants, curieux : écrivez-nous.'),
}

# v28 : pages éditées à la main par le porteur du projet — JAMAIS régénérées par le build
USER_OWNED = {'index.html', 'demo-image.html', 'machine-editoriale.html', 'contact.html', 'realisations.html'}

def build():
    count = 0
    for fname, (title, desc) in PAGES.items():
        if fname in USER_OWNED:
            print(f'🔒 {fname} : version manuelle conservée (non régénérée)')
            continue
        body_path = os.path.join(SRC, fname.replace('.html', '.body.html'))
        if not os.path.exists(body_path):
            print(f'⚠️  corps manquant : {body_path}')
            continue
        body = open(body_path, encoding='utf-8').read()
        html = header(fname, title, desc) + body + FOOTER
        open(os.path.join(ROOT, fname), 'w', encoding='utf-8').write(html)
        count += 1

    # sitemap.xml — uniquement les pages canoniques indexables
    urls = []
    for fname in PAGES:
        loc = SITE + '/' if fname == 'index.html' else SITE + '/' + fname
        prio = '1.0' if fname == 'index.html' else ('0.9' if fname in ('demo-ia.html', 'echecs.html', 'actualites.html') else '0.8')
        freq = 'weekly' if fname in ('index.html', 'actualites.html') else 'monthly'
        urls.append(f'  <url><loc>{loc}</loc><lastmod>{LASTMOD}</lastmod><changefreq>{freq}</changefreq><priority>{prio}</priority></url>')
    sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + '\n'.join(urls) + '\n</urlset>\n'
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write(sitemap)

    # robots.txt — crawl complet, assets ouverts, crawlers d'IA bienvenus
    robots = f'''# Hub IA C.I.M. — Montpellier
User-agent: *
Allow: /
Allow: /*.css$
Allow: /*.js$
Allow: /*.jpg$

# Crawlers d'IA génératives : bienvenue (citations dans ChatGPT, Perplexity, AI Overviews)
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

Sitemap: {SITE}/sitemap.xml
'''
    open(os.path.join(ROOT, 'robots.txt'), 'w', encoding='utf-8').write(robots)

    # llms.txt — index des pages pour les moteurs d'IA (spécification émergente)
    LLD = {
        'index.html': 'Accueil : présentation du Hub, démos gratuites, statistiques',
        'demo-ia.html': 'Chat IA gratuit dans le navigateur (WebLLM), sans inscription, 100 % local',
        'demo-image.html': "Générateur d'images IA gratuit (texte vers image), sans inscription",
        'agents-ia.html': "Équipe d'agents IA autonomes : démonstration interactive d'orchestration",
        'machine-editoriale.html': 'Machine éditoriale : livre, BD, podcast avec IA + validation humaine (7 étapes)',
        'ia-souveraine.html': 'IA souveraine & RAG : assistant sur vos documents, hébergé en France',
        'open-source.html': 'Open source : LLM (Mistral, Qwen, DeepSeek), outils de code, robotique',
        'jeux-video.html': 'Six jeux jouables contre de vraies IA (minimax, Puissance 4, Othello…)',
        'bibliotheque-3d.html': "La Bibliothèque des Mondes en 3D : rotonde WebGL des 40 romans — chaque couverture est une fenêtre-monde, clic = fiche + liseuse",
        'echecs.html': "Échecs contre l'IA : 8 niveaux, vue 3D, indices, moteur maison",
        'hub-of-duty.html': "Hub of Duty : FPS 3D hommage à Terminator — vagues de machines de Skynet, lasers, IA traqueuse",
        'cendres.html': "CENDRES : roguelike français jouable dans le navigateur — donjons générés, 4 classes, potions à identifier, Défi du jour, IA des monstres expliquée",
        'confrerie.html': "La Confrérie du Gris : RPG tactique mercenaire au tour par tour — hexagones, initiative, ripostes, 3 contrats, IA expliquée",
        'logres.html': "LOGRES — La Table Ronde : wargame tactique 3D léger (Three.js) — chevaliers, hexagones, jauge Légitime/Tyran, IA expliquée",
        'arkhantis.html': "Les Ruines d'Arkhantis : hack & slash isométrique — Berserker, 40 affixes, 3 gardiens, Faille du jour, loot expliqué",
        'zone.html': "La Zone : survie FPS par raycasting — 6 anomalies, 10 artefacts à double tranchant, geiger, détecteur et Redout expliqués",
        'nordheim.html': "Nordheim : open world viking 3D procédural — heightmap, InstancedMesh, guildes, chasse, forge et Troll expliqués",
        'caravanes.html': "Caravanes : sandbox d\u2019escouade — commerce entre quatre villes, compétences par l\u2019usage, avant-poste et factions expliqués",
        'actualites.html': "Actus IA : 51 articles d'investigation en français",
        'medias.html': 'Nos médias : podcasts, livres, BD, musique produits par nos pipelines IA',
        'realisations.html': 'Réalisations : chaînes YouTube, K-pop virtuelle, romans, jeux, BD',
        'services.html': 'Solutions IA sur mesure : entreprises, créateurs, enseignants (ESS)',
        'contact.html': 'Contact : premier échange offert, réponse sous 48 h',
    }
    lines = ['# Hub IA C.I.M. — Montpellier (Hub IA & FabLab associatif, ESS)', '',
             "> Le hub d'intelligence artificielle du Club Informatique & Multimédia (Montpellier, France) :",
             '> IA souveraine, agents autonomes, machine éditoriale, démos gratuites jouables dans le navigateur,',
             "> actualité IA enquêtée (51 articles), médias et réalisations produits avec l'IA. Association loi 1901.", '',
             '## Pages', '']
    for fname, d in LLD.items():
        loc = SITE + '/' if fname == 'index.html' else SITE + '/' + fname
        lines.append(f'- [{PAGES[fname][0].split(" | ")[0]}]({loc}): {d}')
    open(os.path.join(ROOT, 'llms.txt'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')

    print(f'{count} pages générées (+ sitemap.xml, robots.txt, llms.txt).')

if __name__ == '__main__':
    build()
