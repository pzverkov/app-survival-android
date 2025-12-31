export type Lang =
  | 'en'
  | 'en-AU'
  | 'en-ZA'
  | 'es'
  | 'fr'
  | 'fr-CH'
  | 'de'
  | 'de-CH'
  | 'pt'
  | 'nl'
  | 'it'
  | 'it-CH'
  | 'rm'
  | 'nb'
  | 'nn'
  | 'af'
  | 'zu'
  | 'xh'
  | 'uk'
  | 'ru'
  | 'ja'
  | 'zh-Hans'
  | 'hi';

export const LANG_KEY = 'lang';

type Dict = Record<string, string>;

const DICTS: Partial<Record<Lang, Dict>> = {
  en: {
    'app.title': 'App Survival: Android Release Night',
    'app.badge': 'M3 • TS + Vite',

    'nav.overview': 'Overview',
    'nav.backlog': 'Backlog',
    'nav.signals': 'Signals',
    'nav.history': 'History',

    'btn.start': '▶ Start',
    'btn.pause': '⏸ Pause',
    'btn.reset': '↺ Reset',
    'btn.profile': '👤 Profile',

    'mode.label': 'Mode:',
    'mode.select': 'Select',
    'mode.link': 'Link',
    'mode.unlink': 'Unlink',

    'card.selected': 'Selected',
    'card.metrics': 'Metrics',
    'card.seed': 'Seed',
    'card.achievements': 'Achievements',
    'card.trust': 'Trust & accessibility',
    'card.platform': 'Platform',
    'card.regions': 'Regions',
    'card.votes': 'User votes (live sentiment)',
    'card.incidents': 'Incidents',
    'card.postmortem': 'Postmortem',
    'card.scoreboard': 'Scoreboard (local)',
    'card.roadmap': 'Refactor Roadmap',

    'lbl.budget': 'Budget',
    'lbl.time': 'Time',
    'lbl.shift': 'Shift',
    'lbl.rating': 'Rating',
    'lbl.score': 'Score',
    'lbl.arch': 'Architecture',
    'lbl.failures': 'Failures',
    'lbl.coverage': 'Coverage',
    'lbl.anr': 'ANR Risk',
    'lbl.latency': 'p95 Latency',
    'lbl.battery': 'Battery',
    'lbl.jank': 'Jank',
    'lbl.heap': 'Heap',

    'hint.budget': 'Run ends at $0 or rating 1.0★',
    'hint.time': 'Sim time',
    'hint.shift': 'Target session length',
    'hint.rating': 'Drops from failures / ANRs / slow',
    'hint.score': 'Deterministic per seed',
    'hint.arch': 'Debt (0..100)',
    'hint.failures': 'Too many = review bombs',
    'hint.coverage': 'Target',
    'hint.anr': 'Main thread pain',
    'hint.latency': 'Queueing makes it worse',
    'hint.battery': 'Work spam drains',
    'hint.jank': 'FrameGuard 16ms',
    'hint.heap': 'HeapWatch GC • OOM',

    'seed.active': 'Active:',
    'seed.placeholder': 'Seed (optional)',
    'seed.daily': 'Daily',
    'seed.note': 'Reset uses the seed above (if set).',

    'ach.preset': 'Preset:',
    'ach.unlocked': 'Unlocked:',
    'ach.openProfile': 'Open profile',

    'profile.title': 'Profile',
    'profile.preset': 'Preset',
    'profile.unlocked': 'Unlocked:',
    'profile.best': 'Best survival:',
    'profile.hiddenNote': 'Hidden achievements show up as “Hidden achievement” until you unlock them.',

    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.glass': 'Glass',

    'theme.system': 'System',
    'theme.light': 'Light',
    'theme.dark': 'Dark',

    'glass.off': 'Off',
    'glass.on': 'On',
    'glass.unsupported': 'Liquid glass not supported in this browser',

    'canvas.zoomIn': 'Zoom in',
    'canvas.zoomOut': 'Zoom out',
    'canvas.fit': 'Fit',

    'toast.achUnlocked': 'Achievement unlocked: {title}{tier}{reward}',
    'toast.reward': ' (+{reward})',
    'toast.tier': ' {tier}',
  
    'btn.profileTitle': 'Profile & achievements',
    'seed.dailyTitle': 'Use a deterministic daily seed',
    'ach.someHidden': 'Some are hidden 👀',
    'sel.title': 'Selected',
    'sel.none': 'None',
    'sel.hint': 'Upgrades raise capacity & reliability. Repairs restore health. Both cost budget',
    'btn.upgrade': 'Upgrade',
    'btn.repair': 'Repair',
    'btn.delete': 'Delete',
    'trust.a11y': 'A11y',
    'trust.privacy': 'Privacy',
    'trust.security': 'Security',
    'trust.supportLoad': 'Support load',
    'setup.evalPreset': 'Evaluation preset',
    'setup.evalPresetHint': 'CoverageGate and enforcement weight',
    'preset.juniorMid': 'Junior-Mid',
    'preset.senior': 'Senior',
    'preset.staff': 'Staff',
    'preset.principal': 'Principal',
    'setup.placeComponent': 'Place component',
    'btn.add': '+ Add',
    'component.UI': 'UI',
    'component.VM': 'ViewModel',
    'component.DOMAIN': 'Domain',
    'component.REPO': 'Repository',
    'component.CACHE': 'Cache',
    'component.DB': 'Room DB',
    'component.NET': 'Network',
    'component.WORK': 'WorkManager',
    'component.OBS': 'Observability',
    'component.FLAGS': 'Feature Flags',
    'component.AUTH': 'Auth / Sessions',
    'component.PINNING': 'TLS Pinning',
    'component.KEYSTORE': 'Keystore / Crypto',
    'component.SANITIZER': 'Input Sanitizer',
    'component.ABUSE': 'Abuse Protection',
    'component.A11Y': 'Accessibility Layer',
    'setup.dragHintPrefix': 'Drag components to rearrange. Link mode: click',
    'setup.dragHintSource': 'source',
    'setup.dragHintThen': 'click',
    'setup.dragHintDest': 'destination',
    'backlog.capacity': 'Capacity',
    'btn.refill': 'Refill',
    'btn.boostRegen': 'Boost regen',
    'btn.energyDrink': 'Energy drink',
    'btn.energyDrinkTitle': 'Temporary regen booster (unlocks via achievements)',
    'btn.incidentShield': 'Incident shield',
    'btn.incidentShieldTitle': 'Blocks the next incident penalty once (unlocks via achievements)',
    'btn.hire': 'Hire',
    'backlog.fixOrDefer': 'Fix tickets or defer',
    'platform.latestApi': 'Latest API',
    'platform.minApi': 'Min API',
    'platform.oldDevices': 'Old devices',
    'platform.lowRam': 'Low RAM',
    'regions.regPressure': 'Reg pressure',
    'regions.hint': 'Compliance and rollout gates',
    'votes.perf': 'Perf',
    'votes.reliability': 'Reliability',
    'votes.privacy': 'Privacy',
    'votes.a11y': 'A11y',
    'votes.battery': 'Battery',
    'signals.noReviews': 'No reviews yet.',
    'signals.noIncidents': 'No incidents… yet.',
    'btn.copyRunJson': 'Copy run JSON',
    'btn.clear': 'Clear',
    'history.scoreboardHint': 'Top runs stored in localStorage.',
    'history.noRun': 'No run yet.',
    'history.noScores': 'No scores yet.',
    'btn.applyNext': 'Apply next',
    'history.roadmapHint': 'Suggested sequence to pay down architecture debt (Staff/Principal-style).',
    'history.noRoadmap': 'No roadmap yet.',
    'history.realismTitle': 'Android realism features (implemented)',
    'history.realism.frameguard': 'frame budget and jank meter (16ms model)',
    'history.realism.mainthread': 'IO on main strictness (adds ANR and jank)',
    'history.realism.heapwatch': 'heap meter with GC pauses and OOM crashes',
    'history.recoPrefix': 'Recommended starter graph:',
    'history.recoAnd': 'and',
    'history.recoAdd': 'Add',
    'history.recoSuffix': 'to reduce blast radius',
    'incident.label': 'Incident',
    'incident.dismiss': 'Dismiss incident',
    'incident.hint': 'Respond fast: fix or defer the top ticket to stop the bleed.',
    'btn.openBacklog': 'Open backlog',
    'btn.quickTriage': 'Quick triage',
    'profile.close': 'Close profile',
    'heapwatch.gc': 'HeapWatch GC',
    'heapwatch.msOom': 'ms • OOM',
    'history.copyPrompt': 'Copy run JSON:',
    'build.info': 'Build {sha} • base {base}',
    'coverage.below': 'Below {threshold}% increases regressions',
    'coverage.target': 'Target {threshold}%+ for stable releases',
    'advisory.active': 'Active: {title}',
    'roadmap.action': 'Action',
    'roadmap.why': 'Why',

    'toast.achievementUnlocked': 'Achievement unlocked: {title}{tier}{reward}',
    'toast.runCopied': 'Run JSON copied',
    'toast.scoreboardCleared': 'Scoreboard cleared',
    'toast.noRoadmapTicket': 'No architecture debt ticket to refactor',

    'backlog.noTickets': 'No open tickets',
    'ticket.fix': 'Fix ({effort})',
    'ticket.need': 'Need {effort}',
    'ticket.defer': 'Defer',
    'ticket.undefer': 'Undefer',
    'ticket.impact': 'impact {impact}',
    'ticket.age': 'age {minutes}m',
    'ticket.deferred': 'deferred',
    'ticket.refactorOptions': 'Refactor options',
    'ticket.autoTarget': 'Auto-target (worst violation)',

    'shop.full': 'Full',
    'shop.refillCost': 'Refill ($${cost})',
    'shop.boostCost': 'Boost regen ($${cost})',
    'shop.boostMax': 'Boost regen (max)',
    'shop.hireCost': 'Hire (+2 max $${cost})',
    'shop.hireMax': 'Hire (max)',
    'shop.shieldReady': 'Shield ready',
    'shop.shieldCost': 'Incident shield ($${cost})',
    'shop.energyDrinkCharges': 'Energy drink x{n}',
    'shop.energyDrinkCost': 'Energy drink ($${cost})',
},

  es: {
    'app.title': 'Supervivencia App: Noche de Release Android',
    'app.badge': 'M3 • TS + Vite',
    'nav.overview': 'Resumen',
    'nav.backlog': 'Backlog',
    'nav.signals': 'Señales',
    'nav.history': 'Historial',
    'btn.start': '▶ Iniciar',
    'btn.pause': '⏸ Pausa',
    'btn.reset': '↺ Reiniciar',
    'btn.profile': '👤 Perfil',
    'mode.label': 'Modo:',
    'mode.select': 'Seleccionar',
    'mode.link': 'Enlazar',
    'mode.unlink': 'Desenlazar',
    'card.selected': 'Seleccionado',
    'card.metrics': 'Métricas',
    'card.seed': 'Semilla',
    'card.achievements': 'Logros',
    'card.trust': 'Confianza y accesibilidad',
    'card.platform': 'Plataforma',
    'card.regions': 'Regiones',
    'card.votes': 'Votos (sentimiento)',
    'card.incidents': 'Incidentes',
    'card.postmortem': 'Postmortem',
    'card.scoreboard': 'Marcador (local)',
    'card.roadmap': 'Hoja de ruta',
    'lbl.budget': 'Presupuesto',
    'lbl.time': 'Tiempo',
    'lbl.shift': 'Turno',
    'lbl.rating': 'Valoración',
    'lbl.score': 'Puntuación',
    'lbl.arch': 'Arquitectura',
    'lbl.failures': 'Fallos',
    'lbl.coverage': 'Cobertura',
    'lbl.anr': 'Riesgo ANR',
    'lbl.latency': 'Latencia p95',
    'lbl.battery': 'Batería',
    'lbl.jank': 'Jank',
    'lbl.heap': 'Heap',
    'hint.budget': 'Acaba con $0 o 1.0★',
    'hint.time': 'Tiempo de simulación',
    'hint.shift': 'Duración objetivo',
    'hint.rating': 'Baja por fallos / ANR / lento',
    'hint.score': 'Determinista por semilla',
    'hint.arch': 'Deuda (0..100)',
    'hint.failures': 'Demasiados = malas reviews',
    'hint.coverage': 'Objetivo',
    'hint.anr': 'Dolor del hilo principal',
    'hint.latency': 'La cola la empeora',
    'hint.battery': 'Spam de trabajo drena',
    'hint.jank': 'FrameGuard 16ms',
    'hint.heap': 'HeapWatch GC • OOM',
    'seed.active': 'Activa:',
    'seed.placeholder': 'Semilla (opcional)',
    'seed.daily': 'Diaria',
    'seed.note': 'Reiniciar usa la semilla (si está).',
    'ach.preset': 'Preset:',
    'ach.unlocked': 'Desbloqueados:',
    'ach.openProfile': 'Abrir perfil',
    'profile.title': 'Perfil',
    'profile.preset': 'Preset',
    'profile.unlocked': 'Desbloqueados:',
    'profile.best': 'Mejor supervivencia:',
    'profile.hiddenNote': 'Los logros ocultos aparecen como “Logro oculto” hasta desbloquearlos.',
    'settings.title': 'Ajustes',
    'settings.language': 'Idioma',
    'settings.theme': 'Tema',
    'settings.glass': 'Cristal',
    'theme.system': 'Sistema',
    'theme.light': 'Claro',
    'theme.dark': 'Oscuro',
    'glass.off': 'Desactivado',
    'glass.on': 'Activado',
    'canvas.zoomIn': 'Acercar',
    'canvas.zoomOut': 'Alejar',
    'canvas.fit': 'Ajustar',
    'toast.achUnlocked': 'Logro desbloqueado: {title}{tier}{reward}',
    'toast.reward': ' (+{reward})',
    'toast.tier': ' {tier}',
  },

  fr: {
    'app.title': 'Survie App : Nuit de Release Android',
    'app.badge': 'M3 • TS + Vite',
    'nav.overview': 'Vue',
    'nav.backlog': 'Backlog',
    'nav.signals': 'Signaux',
    'nav.history': 'Historique',
    'btn.start': '▶ Démarrer',
    'btn.pause': '⏸ Pause',
    'btn.reset': '↺ Réinitialiser',
    'btn.profile': '👤 Profil',
    'mode.label': 'Mode :',
    'mode.select': 'Sélection',
    'mode.link': 'Lier',
    'mode.unlink': 'Délier',
    'card.selected': 'Sélection',
    'card.metrics': 'Métriques',
    'card.seed': 'Graine',
    'card.achievements': 'Succès',
    'card.trust': 'Confiance & accessibilité',
    'card.platform': 'Plateforme',
    'card.regions': 'Régions',
    'card.votes': 'Votes (sentiment)',
    'card.incidents': 'Incidents',
    'card.postmortem': 'Postmortem',
    'card.scoreboard': 'Scores (local)',
    'card.roadmap': 'Feuille de route',
    'lbl.budget': 'Budget',
    'lbl.time': 'Temps',
    'lbl.shift': 'Service',
    'lbl.rating': 'Note',
    'lbl.score': 'Score',
    'lbl.arch': 'Architecture',
    'lbl.failures': 'Pannes',
    'lbl.coverage': 'Couverture',
    'lbl.anr': 'Risque ANR',
    'lbl.latency': 'Latence p95',
    'lbl.battery': 'Batterie',
    'lbl.jank': 'Jank',
    'lbl.heap': 'Heap',
    'hint.budget': 'Fin à $0 ou 1.0★',
    'hint.time': 'Temps de simu',
    'hint.shift': 'Durée cible',
    'hint.rating': 'Baisse par pannes / ANR',
    'hint.score': 'Déterministe par graine',
    'hint.arch': 'Dette (0..100)',
    'hint.failures': 'Trop = mauvaises reviews',
    'hint.coverage': 'Cible',
    'hint.anr': 'Thread principal',
    'hint.latency': 'La file empire',
    'hint.battery': 'Spam de jobs',
    'hint.jank': 'FrameGuard 16ms',
    'hint.heap': 'HeapWatch GC • OOM',
    'seed.active': 'Active :',
    'seed.placeholder': 'Graine (optionnel)',
    'seed.daily': 'Jour',
    'seed.note': 'Reset utilise la graine ci-dessus.',
    'ach.preset': 'Preset :',
    'ach.unlocked': 'Débloqués :',
    'ach.openProfile': 'Ouvrir profil',
    'profile.title': 'Profil',
    'profile.preset': 'Preset',
    'profile.unlocked': 'Débloqués :',
    'profile.best': 'Meilleure survie :',
    'profile.hiddenNote': 'Les succès cachés apparaissent comme “Succès caché” jusqu’à déblocage.',
    'settings.title': 'Réglages',
    'settings.language': 'Langue',
    'settings.theme': 'Thème',
    'settings.glass': 'Verre',
    'theme.system': 'Système',
    'theme.light': 'Clair',
    'theme.dark': 'Sombre',
    'glass.off': 'Désactivé',
    'glass.on': 'Activé',
    'canvas.zoomIn': 'Zoom +',
    'canvas.zoomOut': 'Zoom −',
    'canvas.fit': 'Ajuster',
    'toast.achUnlocked': 'Succès débloqué : {title}{tier}{reward}',
    'toast.reward': ' (+{reward})',
    'toast.tier': ' {tier}',
  },

  de: {
    'app.title': 'App Survival: Android Release Night',
    'app.badge': 'M3 • TS + Vite',
    'nav.overview': 'Übersicht',
    'nav.backlog': 'Backlog',
    'nav.signals': 'Signale',
    'nav.history': 'Verlauf',
    'btn.start': '▶ Start',
    'btn.pause': '⏸ Pause',
    'btn.reset': '↺ Zurücksetzen',
    'btn.profile': '👤 Profil',
    'mode.label': 'Modus:',
    'mode.select': 'Auswählen',
    'mode.link': 'Verknüpfen',
    'mode.unlink': 'Trennen',
    'card.selected': 'Ausgewählt',
    'card.metrics': 'Metriken',
    'card.seed': 'Seed',
    'card.achievements': 'Erfolge',
    'card.trust': 'Vertrauen & Barrierefreiheit',
    'card.platform': 'Plattform',
    'card.regions': 'Regionen',
    'card.votes': 'Votes (Stimmung)',
    'card.incidents': 'Incidents',
    'card.postmortem': 'Postmortem',
    'card.scoreboard': 'Scoreboard (lokal)',
    'card.roadmap': 'Roadmap',
    'lbl.budget': 'Budget',
    'lbl.time': 'Zeit',
    'lbl.shift': 'Schicht',
    'lbl.rating': 'Rating',
    'lbl.score': 'Score',
    'lbl.arch': 'Architektur',
    'lbl.failures': 'Fehler',
    'lbl.coverage': 'Coverage',
    'lbl.anr': 'ANR-Risiko',
    'lbl.latency': 'p95-Latenz',
    'lbl.battery': 'Batterie',
    'lbl.jank': 'Jank',
    'lbl.heap': 'Heap',
    'hint.budget': 'Ende bei $0 oder 1.0★',
    'hint.time': 'Sim-Zeit',
    'hint.shift': 'Ziel-Dauer',
    'hint.rating': 'Fällt bei Failures / ANRs',
    'hint.score': 'Deterministisch pro Seed',
    'hint.arch': 'Debt (0..100)',
    'hint.failures': 'Zu viele = schlechte Reviews',
    'hint.coverage': 'Ziel',
    'hint.anr': 'Main-Thread Stress',
    'hint.latency': 'Queues verschlimmern',
    'hint.battery': 'Job-Spam frisst Akku',
    'hint.jank': 'FrameGuard 16ms',
    'hint.heap': 'HeapWatch GC • OOM',
    'seed.active': 'Aktiv:',
    'seed.placeholder': 'Seed (optional)',
    'seed.daily': 'Täglich',
    'seed.note': 'Reset nutzt Seed oben (falls gesetzt).',
    'ach.preset': 'Preset:',
    'ach.unlocked': 'Freigeschaltet:',
    'ach.openProfile': 'Profil öffnen',
    'profile.title': 'Profil',
    'profile.preset': 'Preset',
    'profile.unlocked': 'Freigeschaltet:',
    'profile.best': 'Beste Survival:',
    'profile.hiddenNote': 'Versteckte Erfolge erscheinen als “Hidden achievement”, bis sie freigeschaltet sind.',
    'settings.title': 'Einstellungen',
    'settings.language': 'Sprache',
    'settings.theme': 'Theme',
    'settings.glass': 'Glass',
    'theme.system': 'System',
    'theme.light': 'Hell',
    'theme.dark': 'Dunkel',
    'glass.off': 'Aus',
    'glass.on': 'An',
    'canvas.zoomIn': 'Zoom +',
    'canvas.zoomOut': 'Zoom −',
    'canvas.fit': 'Einpassen',
    'toast.achUnlocked': 'Erfolg freigeschaltet: {title}{tier}{reward}',
    'toast.reward': ' (+{reward})',
    'toast.tier': ' {tier}',
  },

  pt: {
    'app.title': 'Sobrevivência App: Noite de Release Android',
    'app.badge': 'M3 • TS + Vite',
    'nav.overview': 'Visão',
    'nav.backlog': 'Backlog',
    'nav.signals': 'Sinais',
    'nav.history': 'Histórico',
    'btn.start': '▶ Iniciar',
    'btn.pause': '⏸ Pausa',
    'btn.reset': '↺ Reset',
    'btn.profile': '👤 Perfil',
    'mode.label': 'Modo:',
    'mode.select': 'Selecionar',
    'mode.link': 'Vincular',
    'mode.unlink': 'Desvincular',
    'card.selected': 'Selecionado',
    'card.metrics': 'Métricas',
    'card.seed': 'Seed',
    'card.achievements': 'Conquistas',
    'card.trust': 'Confiança e acessibilidade',
    'card.platform': 'Plataforma',
    'card.regions': 'Regiões',
    'card.votes': 'Votos (sentimento)',
    'card.incidents': 'Incidentes',
    'card.postmortem': 'Postmortem',
    'card.scoreboard': 'Placares (local)',
    'card.roadmap': 'Roadmap',
    'lbl.budget': 'Budget',
    'lbl.time': 'Tempo',
    'lbl.shift': 'Turno',
    'lbl.rating': 'Rating',
    'lbl.score': 'Score',
    'lbl.arch': 'Arquitetura',
    'lbl.failures': 'Falhas',
    'lbl.coverage': 'Cobertura',
    'lbl.anr': 'Risco ANR',
    'lbl.latency': 'Latência p95',
    'lbl.battery': 'Bateria',
    'lbl.jank': 'Jank',
    'lbl.heap': 'Heap',
    'hint.budget': 'Termina em $0 ou 1.0★',
    'hint.time': 'Tempo da simulação',
    'hint.shift': 'Duração alvo',
    'hint.rating': 'Cai por falhas / ANR',
    'hint.score': 'Determinístico por seed',
    'hint.arch': 'Dívida (0..100)',
    'hint.failures': 'Muitas = reviews ruins',
    'hint.coverage': 'Alvo',
    'hint.anr': 'Thread principal',
    'hint.latency': 'Fila piora',
    'hint.battery': 'Spam drena',
    'hint.jank': 'FrameGuard 16ms',
    'hint.heap': 'HeapWatch GC • OOM',
    'seed.active': 'Ativa:',
    'seed.placeholder': 'Seed (opcional)',
    'seed.daily': 'Diária',
    'seed.note': 'Reset usa a seed acima (se definida).',
    'ach.preset': 'Preset:',
    'ach.unlocked': 'Desbloqueadas:',
    'ach.openProfile': 'Abrir perfil',
    'profile.title': 'Perfil',
    'profile.preset': 'Preset',
    'profile.unlocked': 'Desbloqueadas:',
    'profile.best': 'Melhor sobrevivência:',
    'profile.hiddenNote': 'Conquistas ocultas aparecem como “Hidden achievement” até desbloquear.',
    'settings.title': 'Configurações',
    'settings.language': 'Idioma',
    'settings.theme': 'Tema',
    'settings.glass': 'Glass',
    'theme.system': 'Sistema',
    'theme.light': 'Claro',
    'theme.dark': 'Escuro',
    'glass.off': 'Desligado',
    'glass.on': 'Ligado',
    'canvas.zoomIn': 'Zoom +',
    'canvas.zoomOut': 'Zoom −',
    'canvas.fit': 'Ajustar',
    'toast.achUnlocked': 'Conquista desbloqueada: {title}{tier}{reward}',
    'toast.reward': ' (+{reward})',
    'toast.tier': ' {tier}',
  },

  uk: {
    'app.title': 'App Survival: Ніч релізу Android',
    'app.badge': 'M3 • TS + Vite',
    'nav.overview': 'Огляд',
    'nav.backlog': 'Backlog',
    'nav.signals': 'Сигнали',
    'nav.history': 'Історія',
    'btn.start': '▶ Старт',
    'btn.pause': '⏸ Пауза',
    'btn.reset': '↺ Скинути',
    'btn.profile': '👤 Профіль',
    'mode.label': 'Режим:',
    'mode.select': 'Вибір',
    'mode.link': 'Зв’язати',
    'mode.unlink': 'Розірвати',
    'card.selected': 'Вибране',
    'card.metrics': 'Метрики',
    'card.seed': 'Seed',
    'card.achievements': 'Досягнення',
    'card.trust': 'Довіра й доступність',
    'card.platform': 'Платформа',
    'card.regions': 'Регіони',
    'card.votes': 'Голоси (настрій)',
    'card.incidents': 'Інциденти',
    'card.postmortem': 'Postmortem',
    'card.scoreboard': 'Рекорди (локально)',
    'card.roadmap': 'Roadmap',
    'lbl.budget': 'Бюджет',
    'lbl.time': 'Час',
    'lbl.shift': 'Зміна',
    'lbl.rating': 'Рейтинг',
    'lbl.score': 'Бали',
    'lbl.arch': 'Архітектура',
    'lbl.failures': 'Збої',
    'lbl.coverage': 'Coverage',
    'lbl.anr': 'Ризик ANR',
    'lbl.latency': 'p95 Латентність',
    'lbl.battery': 'Батарея',
    'lbl.jank': 'Jank',
    'lbl.heap': 'Heap',
    'hint.budget': 'Кінець при $0 або 1.0★',
    'hint.time': 'Час симуляції',
    'hint.shift': 'Цільова тривалість',
    'hint.rating': 'Падає через збої / ANR',
    'hint.score': 'Детерміновано по seed',
    'hint.arch': 'Борг (0..100)',
    'hint.failures': 'Забагато = погані відгуки',
    'hint.coverage': 'Ціль',
    'hint.anr': 'Головний потік',
    'hint.latency': 'Черга погіршує',
    'hint.battery': 'Спам робіт з’їдає',
    'hint.jank': 'FrameGuard 16ms',
    'hint.heap': 'HeapWatch GC • OOM',
    'seed.active': 'Активна:',
    'seed.placeholder': 'Seed (опційно)',
    'seed.daily': 'Денний',
    'seed.note': 'Reset використовує seed вище (якщо задано).',
    'ach.preset': 'Preset:',
    'ach.unlocked': 'Відкрито:',
    'ach.openProfile': 'Відкрити профіль',
    'profile.title': 'Профіль',
    'profile.preset': 'Preset',
    'profile.unlocked': 'Відкрито:',
    'profile.best': 'Найкраще виживання:',
    'profile.hiddenNote': 'Приховані досягнення відображаються як “Hidden achievement”, доки ви їх не відкриєте.',
    'settings.title': 'Налаштування',
    'settings.language': 'Мова',
    'settings.theme': 'Тема',
    'settings.glass': 'Glass',
    'theme.system': 'Система',
    'theme.light': 'Світла',
    'theme.dark': 'Темна',
    'glass.off': 'Вимкнено',
    'glass.on': 'Увімкнено',
    'canvas.zoomIn': 'Збільшити',
    'canvas.zoomOut': 'Зменшити',
    'canvas.fit': 'Вмістити',
    'toast.achUnlocked': 'Досягнення відкрито: {title}{tier}{reward}',
    'toast.reward': ' (+{reward})',
    'toast.tier': ' {tier}',
  },

  ru: {
    'app.title': 'App Survival: Ночь релиза Android',
    'app.badge': 'M3 • TS + Vite',
    'nav.overview': 'Обзор',
    'nav.backlog': 'Backlog',
    'nav.signals': 'Сигналы',
    'nav.history': 'История',
    'btn.start': '▶ Старт',
    'btn.pause': '⏸ Пауза',
    'btn.reset': '↺ Сброс',
    'btn.profile': '👤 Профиль',
    'mode.label': 'Режим:',
    'mode.select': 'Выбор',
    'mode.link': 'Связать',
    'mode.unlink': 'Разорвать',
    'card.selected': 'Выбрано',
    'card.metrics': 'Метрики',
    'card.seed': 'Seed',
    'card.achievements': 'Достижения',
    'card.trust': 'Доверие и доступность',
    'card.platform': 'Платформа',
    'card.regions': 'Регионы',
    'card.votes': 'Голоса (настроение)',
    'card.incidents': 'Инциденты',
    'card.postmortem': 'Postmortem',
    'card.scoreboard': 'Рекорды (локально)',
    'card.roadmap': 'Roadmap',
    'lbl.budget': 'Бюджет',
    'lbl.time': 'Время',
    'lbl.shift': 'Смена',
    'lbl.rating': 'Рейтинг',
    'lbl.score': 'Очки',
    'lbl.arch': 'Архитектура',
    'lbl.failures': 'Сбои',
    'lbl.coverage': 'Coverage',
    'lbl.anr': 'Риск ANR',
    'lbl.latency': 'p95 Латентность',
    'lbl.battery': 'Батарея',
    'lbl.jank': 'Jank',
    'lbl.heap': 'Heap',
    'hint.budget': 'Конец при $0 или 1.0★',
    'hint.time': 'Время симуляции',
    'hint.shift': 'Целевая длительность',
    'hint.rating': 'Падает от сбоев / ANR',
    'hint.score': 'Детерминировано по seed',
    'hint.arch': 'Долг (0..100)',
    'hint.failures': 'Слишком много = плохие отзывы',
    'hint.coverage': 'Цель',
    'hint.anr': 'Главный поток',
    'hint.latency': 'Очереди ухудшают',
    'hint.battery': 'Спам работ садит',
    'hint.jank': 'FrameGuard 16ms',
    'hint.heap': 'HeapWatch GC • OOM',
    'seed.active': 'Активная:',
    'seed.placeholder': 'Seed (опционально)',
    'seed.daily': 'Дневной',
    'seed.note': 'Reset использует seed выше (если задано).',
    'ach.preset': 'Preset:',
    'ach.unlocked': 'Открыто:',
    'ach.openProfile': 'Открыть профиль',
    'profile.title': 'Профиль',
    'profile.preset': 'Preset',
    'profile.unlocked': 'Открыто:',
    'profile.best': 'Лучшее выживание:',
    'profile.hiddenNote': 'Скрытые достижения отображаются как “Hidden achievement”, пока не откроете.',
    'settings.title': 'Настройки',
    'settings.language': 'Язык',
    'settings.theme': 'Тема',
    'settings.glass': 'Glass',
    'theme.system': 'Система',
    'theme.light': 'Светлая',
    'theme.dark': 'Тёмная',
    'glass.off': 'Выкл.',
    'glass.on': 'Вкл.',
    'canvas.zoomIn': 'Увеличить',
    'canvas.zoomOut': 'Уменьшить',
    'canvas.fit': 'Вписать',
    'toast.achUnlocked': 'Достижение открыто: {title}{tier}{reward}',
    'toast.reward': ' (+{reward})',
    'toast.tier': ' {tier}',
  },

  // --- Additional locales (production strategy: ship partial + fall back cleanly) ---
  'zh-Hans': {
    'app.title': '应用生存：Android 发布之夜',
    'nav.overview': '概览',
    'nav.backlog': '待办',
    'nav.signals': '信号',
    'nav.history': '历史',
    'btn.start': '▶ 开始',
    'btn.pause': '⏸ 暂停',
    'btn.reset': '↺ 重置',
    'btn.profile': '👤 个人资料',
    'profile.title': '个人资料',
    'settings.title': '设置',
    'settings.language': '语言',
    'settings.theme': '主题',
    'settings.glass': '玻璃效果',
    'theme.system': '跟随系统',
    'theme.light': '浅色',
    'theme.dark': '深色',
    'glass.off': '关闭',
    'glass.on': '开启',
    'canvas.zoomIn': '放大',
    'canvas.zoomOut': '缩小',
    'canvas.fit': '适配',
  },

  ja: {
    'app.title': 'アプリ生存：Android リリースの夜',
    'nav.overview': '概要',
    'nav.backlog': 'バックログ',
    'nav.signals': 'シグナル',
    'nav.history': '履歴',
    'btn.start': '▶ 開始',
    'btn.pause': '⏸ 一時停止',
    'btn.reset': '↺ リセット',
    'btn.profile': '👤 プロフィール',
    'profile.title': 'プロフィール',
    'settings.title': '設定',
    'settings.language': '言語',
    'settings.theme': 'テーマ',
    'settings.glass': 'ガラス',
    'theme.system': 'システム',
    'theme.light': 'ライト',
    'theme.dark': 'ダーク',
    'glass.off': 'オフ',
    'glass.on': 'オン',
    'canvas.zoomIn': 'ズームイン',
    'canvas.zoomOut': 'ズームアウト',
    'canvas.fit': '全体表示',
  },

  hi: {
    'app.title': 'ऐप सर्वाइवल: Android रिलीज़ नाइट',
    'nav.overview': 'सारांश',
    'nav.backlog': 'बैकलॉग',
    'nav.signals': 'संकेत',
    'nav.history': 'इतिहास',
    'btn.start': '▶ शुरू',
    'btn.pause': '⏸ रोकें',
    'btn.reset': '↺ रीसेट',
    'btn.profile': '👤 प्रोफ़ाइल',
    'profile.title': 'प्रोफ़ाइल',
    'settings.title': 'सेटिंग्स',
    'settings.language': 'भाषा',
    'settings.theme': 'थीम',
    'settings.glass': 'ग्लास',
    'theme.system': 'सिस्टम',
    'theme.light': 'लाइट',
    'theme.dark': 'डार्क',
    'glass.off': 'ऑफ',
    'glass.on': 'ऑन',
    'canvas.zoomIn': 'ज़ूम इन',
    'canvas.zoomOut': 'ज़ूम आउट',
    'canvas.fit': 'फिट',
  },

  nl: {
    'app.title': 'App Survival: Android Release Night',
    'nav.overview': 'Overzicht',
    'nav.backlog': 'Backlog',
    'nav.signals': 'Signalen',
    'nav.history': 'Geschiedenis',
    'btn.start': '▶ Start',
    'btn.pause': '⏸ Pauze',
    'btn.reset': '↺ Reset',
    'btn.profile': '👤 Profiel',
    'profile.title': 'Profiel',
    'settings.title': 'Instellingen',
    'settings.language': 'Taal',
    'settings.theme': 'Thema',
    'settings.glass': 'Glas',
    'theme.system': 'Systeem',
    'theme.light': 'Licht',
    'theme.dark': 'Donker',
  
    'glass.off': 'Uit',

    'glass.on': 'Aan',
},

  it: {
    'app.title': 'Sopravvivenza App: Notte di release Android',
    'nav.overview': 'Panoramica',
    'nav.backlog': 'Backlog',
    'nav.signals': 'Segnali',
    'nav.history': 'Cronologia',
    'btn.start': '▶ Avvia',
    'btn.pause': '⏸ Pausa',
    'btn.reset': '↺ Reset',
    'btn.profile': '👤 Profilo',
    'profile.title': 'Profilo',
    'settings.title': 'Impostazioni',
    'settings.language': 'Lingua',
    'settings.theme': 'Tema',
    'settings.glass': 'Vetro',
    'theme.system': 'Sistema',
    'theme.light': 'Chiaro',
    'theme.dark': 'Scuro',
  
    'glass.off': 'Off',

    'glass.on': 'On',
    'glass.unsupported': 'Liquid glass not supported in this browser',
},

  nb: {
    'app.title': 'App Survival: Android-releasekveld',
    'nav.overview': 'Oversikt',
    'nav.backlog': 'Backlog',
    'nav.signals': 'Signaler',
    'nav.history': 'Historikk',
    'btn.start': '▶ Start',
    'btn.pause': '⏸ Pause',
    'btn.reset': '↺ Tilbakestill',
    'btn.profile': '👤 Profil',
    'profile.title': 'Profil',
    'settings.title': 'Innstillinger',
    'settings.language': 'Språk',
    'settings.theme': 'Tema',
    'settings.glass': 'Glass',
    'theme.system': 'System',
    'theme.light': 'Lys',
    'theme.dark': 'Mørk',
  
    'glass.off': 'Av',

    'glass.on': 'På',
},

  af: {
    'app.title': 'App Survival: Android-vrystellingsnag',
    'nav.overview': 'Oorsig',
    'nav.backlog': 'Agterstand',
    'nav.signals': 'Seine',
    'nav.history': 'Geskiedenis',
    'btn.start': '▶ Begin',
    'btn.pause': '⏸ Pouse',
    'btn.reset': '↺ Herstel',
    'btn.profile': '👤 Profiel',
    'profile.title': 'Profiel',
    'settings.title': 'Instellings',
    'settings.language': 'Taal',
    'settings.theme': 'Tema',
  
    'glass.off': 'Af',

    'glass.on': 'Aan',
},

  zu: {
    'app.title': 'Ukusinda kwe-App: Ubusuku bokukhishwa kwe-Android',
    'nav.overview': 'Ukubuka',
    'nav.backlog': 'Umsebenzi osele',
    'btn.start': '▶ Qala',
    'btn.pause': '⏸ Misa',
    'btn.reset': '↺ Setha kabusha',
    'btn.profile': '👤 Iphrofayela',
    'settings.title': 'Izilungiselelo',
    'settings.language': 'Ulimi',
  
    'glass.off': 'Valiwe',

    'glass.on': 'Vuliwe',
},

  xh: {
    'app.title': 'Ukusinda kwe-App: Ubusuku bokukhutshwa kwe-Android',
    'nav.overview': 'Isishwankathelo',
    'nav.backlog': 'I-backlog',
    'btn.start': '▶ Qalisa',
    'btn.pause': '⏸ Yima',
    'btn.reset': '↺ Seta kwakhona',
    'btn.profile': '👤 Iprofayile',
    'settings.title': 'Iisetingi',
    'settings.language': 'Ulwimi',
  
    'glass.off': 'Cima',

    'glass.on': 'Vula',
},

};
type LocaleGroup = 'core' | 'regional' | 'more';

export type LocaleMeta = {
  id: Lang;
  nativeLabel: string; // self label
  label: string;       // English label
  group: LocaleGroup;
  beta?: boolean;      // partial translation; cleanly falls back
  base?: Lang;         // for regional variants
};

export const LOCALES: ReadonlyArray<LocaleMeta> = [
  // Core
  { id: 'en', label: 'English', nativeLabel: 'English', group: 'core' },
  { id: 'es', label: 'Spanish', nativeLabel: 'Español', group: 'core' },
  { id: 'fr', label: 'French', nativeLabel: 'Français', group: 'core' },
  { id: 'de', label: 'German', nativeLabel: 'Deutsch', group: 'core' },
  { id: 'pt', label: 'Portuguese', nativeLabel: 'Português', group: 'core' },
  { id: 'uk', label: 'Ukrainian', nativeLabel: 'Українська', group: 'core' },
  { id: 'ru', label: 'Russian', nativeLabel: 'Русский', group: 'core' },

  // Regional variants (inherit base language)
  { id: 'en-AU', label: 'English (Australia)', nativeLabel: 'English (Australia)', group: 'regional', base: 'en' },
  { id: 'en-ZA', label: 'English (South Africa)', nativeLabel: 'English (South Africa)', group: 'regional', base: 'en' },
  { id: 'de-CH', label: 'German (Switzerland)', nativeLabel: 'Deutsch (Schweiz)', group: 'regional', base: 'de' },
  { id: 'fr-CH', label: 'French (Switzerland)', nativeLabel: 'Français (Suisse)', group: 'regional', base: 'fr' },
  { id: 'it-CH', label: 'Italian (Switzerland)', nativeLabel: 'Italiano (Svizzera)', group: 'regional', base: 'it', beta: true },
  { id: 'rm', label: 'Romansh', nativeLabel: 'Rumantsch', group: 'regional', base: 'de-CH', beta: true },
  { id: 'nn', label: 'Norwegian (Nynorsk)', nativeLabel: 'Norsk (Nynorsk)', group: 'regional', base: 'nb', beta: true },

  // More languages (partial for now; production fallbacks make them safe to ship)
  { id: 'nl', label: 'Dutch', nativeLabel: 'Nederlands', group: 'more', beta: true },
  { id: 'it', label: 'Italian', nativeLabel: 'Italiano', group: 'more', beta: true },
  { id: 'nb', label: 'Norwegian (Bokmål)', nativeLabel: 'Norsk (Bokmål)', group: 'more', beta: true },
  { id: 'af', label: 'Afrikaans', nativeLabel: 'Afrikaans', group: 'more', beta: true },
  { id: 'zu', label: 'Zulu', nativeLabel: 'isiZulu', group: 'more', beta: true },
  { id: 'xh', label: 'Xhosa', nativeLabel: 'isiXhosa', group: 'more', beta: true },
  { id: 'ja', label: 'Japanese', nativeLabel: '日本語', group: 'more', beta: true },
  { id: 'zh-Hans', label: 'Chinese (Simplified)', nativeLabel: '中文（简体）', group: 'more', beta: true },
  { id: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', group: 'more', beta: true },
];

const META: Record<Lang, LocaleMeta> = Object.fromEntries(LOCALES.map((l) => [l.id, l])) as any;
const CANONICAL: Record<string, Lang> = Object.fromEntries(LOCALES.map((l) => [l.id.toLowerCase(), l.id]));

function normalizeLocale(input: string): Lang | null {
  const raw = (input || '').replace(/_/g, '-').trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();

  // Exact supported match
  if (CANONICAL[lower]) return CANONICAL[lower];

  // Mandarin: treat any zh-* as Simplified by default (safe for UI)
  if (lower.startsWith('zh')) return 'zh-Hans';

  // Norwegian aliases
  if (lower === 'no' || lower.startsWith('no-')) return 'nb';

  // Base language match
  const base = lower.split('-')[0];
  if (CANONICAL[base]) return CANONICAL[base];

  // Ukrainian: some environments report 'ua'
  if (base === 'ua') return 'uk';

  return null;
}

function fallbackOf(lang: Lang): Lang | null {
  const meta = META[lang];
  if (meta?.base) return meta.base;
  if (lang === 'en') return null;
  return 'en';
}

function templateFor(key: string, lang: Lang): string | null {
  const dict = DICTS[lang];
  return dict ? (dict[key] ?? null) : null;
}

let currentLang: Lang = 'en';

export function getLanguage(): Lang {
  return currentLang;
}

export function setLanguage(lang: Lang) {
  currentLang = lang;
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
  document.documentElement.lang = lang;
}

export function loadLanguage(): Lang {
  const saved = (() => {
    try { return localStorage.getItem(LANG_KEY) || ''; } catch { return ''; }
  })();

  const savedNorm = normalizeLocale(saved);
  if (savedNorm) {
    setLanguage(savedNorm);
    return currentLang;
  }

  const candidates: string[] = Array.isArray(navigator.languages) && navigator.languages.length
    ? [...navigator.languages]
    : [navigator.language || 'en'];

  for (const cand of candidates) {
    const norm = normalizeLocale(cand);
    if (norm) {
      setLanguage(norm);
      return currentLang;
    }
  }

  setLanguage('en');
  return currentLang;
}

export function populateLanguageSelect(select: HTMLSelectElement, selected?: Lang) {
  while (select.firstChild) select.removeChild(select.firstChild);

  const groups: { id: LocaleGroup; label: string }[] = [
    { id: 'core', label: 'Core' },
    { id: 'regional', label: 'Regional' },
    { id: 'more', label: 'More languages' },
  ];

  for (const g of groups) {
    const og = document.createElement('optgroup');
    og.label = g.label;

    for (const loc of LOCALES.filter((l) => l.group === g.id)) {
      const opt = document.createElement('option');
      opt.value = loc.id;
      opt.textContent = loc.beta ? `${loc.nativeLabel} (beta)` : loc.nativeLabel;
      og.appendChild(opt);
    }

    select.appendChild(og);
  }

  select.value = selected || currentLang;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  let lang: Lang | null = currentLang;
  const visited = new Set<string>();

  while (lang && !visited.has(lang)) {
    visited.add(lang);
    const hit = templateFor(key, lang);
    if (hit != null) {
      return vars ? hit.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')) : hit;
    }
    lang = fallbackOf(lang);
  }

  const enHit = templateFor(key, 'en');
  const tmpl = enHit ?? key;

  const isDev = (import.meta as any)?.env?.DEV === true;
  if (isDev && tmpl === key) warnMissing(key);

  if (!vars) return tmpl;
  return tmpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

// Dev-only missing key warnings (non-fatal)
function warnMissing(key: string) {
  const isDev = (import.meta as any)?.env?.DEV === true;
  if (!isDev) return;

  (window as any).__i18nMissing = (window as any).__i18nMissing || new Set();
  const s: Set<string> = (window as any).__i18nMissing;
  if (s.has(key)) return;
  s.add(key);
  // eslint-disable-next-line no-console
  console.warn('[i18n] missing key', key, 'lang=', currentLang);
}

/**
 * Applies translations to the DOM.
 * - data-i18n="key" => textContent
 * - data-i18n-placeholder="key" => placeholder
 * - data-i18n-title="key" => title
 */
export function applyTranslations(root: ParentNode = document) {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-i18n]'));
  for (const el of nodes) {
    const key = el.getAttribute('data-i18n');
    if (key) {
      const value = t(key);
      if (value === key) warnMissing(key);
      el.textContent = value;
    }
  }
  const ph = Array.from(root.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]'));
  for (const el of ph) {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      const value = t(key);
      if (value === key) warnMissing(key);
      el.placeholder = value;
    }
  }

  const aria = Array.from(root.querySelectorAll<HTMLElement>('[data-i18n-aria-label]'));
  for (const el of aria) {
    const key = el.getAttribute('data-i18n-aria-label');
    if (key) {
      const value = t(key);
      if (value === key) warnMissing(key);
      el.setAttribute('aria-label', value);
    }
  }

  const title = Array.from(root.querySelectorAll<HTMLElement>('[data-i18n-title]'));
  for (const el of title) {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      const value = t(key);
      if (value === key) warnMissing(key);
      el.title = value;
    }
  }
}
