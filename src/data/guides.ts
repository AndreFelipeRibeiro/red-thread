// Guides: short, curated paths through the catalogue for a reason ("Catch up
// before Avengers: Doomsday", "Spider-Man", ...). Each stop says why it is
// there. Loaded after data.js. Every stop is essential: optional stops were
// dropped on 2026-11-16 (Andre: a guide is the titles that matter for its
// storyline; what made a title optional was too loose).
//
// DRAFT: the lists, order, weights and wording need Andre's approval before
// this ships (V3 Tasks, "Create curated watch guides"). The Doomsday guide
// follows the ticket's draft (2026-10-29); the other five are Claude's drafts.
//
// Guides 4/4 (2026-11-16): every guide after the animated series was a draft
// until Andre approved them all the same day, when The Avengers and the
// animated series moved shelf (teams, corners). A new guide can wait for
// approval the same way: `draft: true` (and `draftGroup` for a shelf move).
//
// Fields: `group` places the guide on a Guides page shelf (coming, stories,
// characters, teams, corners: "Corners of the universe", which replaced
// animation); `short` is the name on the pill and the meter;
// `color` tints its art; `done` is the line shown when every essential stop is
// seen; event guides name their unreleased `target`. Any other guide can name
// the upcoming title it prepares for with `preparesFor`: from 60 days before
// that title's release (or the target's), the guide is promoted to returning
// visitors. One guide is `evergreen`: promoted when nothing is coming up.
// A Secret Wars guide added later as an event guide needs no code.
//
// Rules for editing:
//   - Ids are permanent: they are used in addresses (?guide=) and progress.
//   - Every stop has a reason a fan would agree with. Shared cast alone is not
//     a reason, so a cameo stays out.
//   - Reasons name what a title introduces or sets up, never how it ends.
//     Event guides say nothing about the unreleased target's plot.
//   - Both languages, written for this app (not studio or press copy).
//   - Stops are in viewing order (release order unless a guide says otherwise).
//   - `reviewed` is the date of the last editorial check; an event guide is
//     re-checked when its target is released.

// Where each title sits in the story: 'main' (the Sacred Timeline), 'alternate'
// (another reality: What If…?, Marvel Zombies, Earth-828, Earth-86445) or
// 'anthology' (stand-alone episodes in the main timeline's past). Anything not
// listed is 'main'. Used by guides now, and by "last seen" logic later, so an
// alternate reality is never taken for the main story's "previously on".
window.CONTINUITY = {
  'what-if': 'alternate',
  'what-if-s2': 'alternate',
  'what-if-s3': 'alternate',
  'marvel-zombies': 'alternate',
  'friendly-spidey': 'alternate',
  'friendly-spidey-s2': 'alternate',
  'fantastic-four': 'alternate',
  'eyes-of-wakanda': 'anthology',
};
(window.TITLES || []).forEach((t) => { t.continuity = window.CONTINUITY[t.id] || 'main'; });

const ALL_GUIDES = [
  {
    id: 'before-doomsday',
    kind: 'event',
    group: 'coming',
    target: 'doomsday',
    color: '#8a4a4a',
    reviewed: '2026-11-22',
    name: { en: 'Catch up before Avengers: Doomsday', 'pt-BR': 'Prepare-se para Vingadores: Doomsday' },
    short: { en: 'Before Doomsday', 'pt-BR': 'Antes de Doomsday' },
    blurb: {
      en: "Eight films and series that set up December's team-up. Nothing about Doomsday itself.",
      'pt-BR': 'Oito filmes e séries que preparam o encontro de dezembro. Nada sobre Doomsday em si.',
    },
    done: { en: "Ready for Doomsday.", 'pt-BR': 'Pronto para Doomsday.' },
    stops: [
      { id: 'endgame', weight: 'essential', why: { en: 'Watch the Encore cut: its new scenes lead into Doomsday.', 'pt-BR': 'Veja a versão Encore: as cenas novas levam a Doomsday.' },
        seenNote: { en: 'Seen the original? The Encore adds about 4 minutes that lead into Doomsday.', 'pt-BR': 'Já viu o original? A Encore traz cerca de 4 minutos que levam a Doomsday.' } },
      { id: 'shang-chi', weight: 'essential', why: { en: "Meet Shang-Chi, part of Doomsday's lineup.", 'pt-BR': 'Conheça Shang-Chi, parte do elenco de Doomsday.' } },
      { id: 'wakanda-forever', weight: 'essential', why: { en: "Shuri, M'Baku and Namor: Wakanda and Talokan after T'Challa.", 'pt-BR': "Shuri, M'Baku e Namor: Wakanda e Talokan depois de T'Challa." } },
      { id: 'quantumania', weight: 'essential', why: { en: "Scott Lang's latest adventure, and the first look at Kang.", 'pt-BR': 'A aventura mais recente de Scott Lang, e o primeiro encontro com Kang.' } },
      { id: 'loki-s2', weight: 'essential', why: { en: "What became of the multiverse, and the TVA, after Kang.", 'pt-BR': "O que restou do multiverso, e da AVT, depois de Kang." } },
      { id: 'cap-brave', weight: 'essential', why: { en: "Sam takes up the shield he'll carry into Doomsday.", 'pt-BR': "Sam assume o escudo que levará a Doomsday." } },
      { id: 'thunderbolts', weight: 'essential', why: { en: "Yelena and Bucky's new team, part of Doomsday's lineup.", 'pt-BR': "A nova equipe de Yelena e Bucky, parte do elenco de Doomsday." } },
      { id: 'fantastic-four', weight: 'essential', why: { en: "Marvel's First Family, set to join the Avengers in Doomsday.", 'pt-BR': "A Primeira Família da Marvel, que se junta aos Vingadores em Doomsday." } },
    ],
  },
  {
    id: 'infinity-saga',
    group: 'stories',
    color: '#7a4060',
    evergreen: true,
    short: { en: 'Infinity Saga', 'pt-BR': 'Saga do Infinito' },
    kind: 'arc',
    reviewed: '2026-11-23',
    name: { en: 'The Infinity Saga essentials', 'pt-BR': 'O essencial da Saga do Infinito' },
    blurb: {
      en: 'The twelve films that carry the story from Iron Man to Endgame.',
      'pt-BR': 'Os doze filmes que levam a história de Homem de Ferro a Ultimato.',
    },
    stops: [
      { id: 'iron-man', weight: 'essential', why: { en: "Tony builds the suit: the first step toward the Avengers.", 'pt-BR': "Tony constrói a armadura: o primeiro passo rumo aos Vingadores." } },
      { id: 'cap-first-avenger', weight: 'essential', why: { en: "The Tesseract, the first Infinity Stone, and Steve's origin.", 'pt-BR': "O Tesserato, a primeira Joia do Infinito, e a origem de Steve." } },
      { id: 'avengers', weight: 'essential', why: { en: "Loki's scepter, another Stone, and the team assembles.", 'pt-BR': "O cetro de Loki, outra Joia, e a equipe se reúne." } },
      { id: 'cap-winter-soldier', weight: 'essential', why: { en: "S.H.I.E.L.D. falls; Bucky's return sets up the team's split.", 'pt-BR': "A S.H.I.E.L.D. cai; a volta de Bucky prepara a divisão da equipe." } },
      { id: 'gotg', weight: 'essential', why: { en: "Gamora, Nebula and the Power Stone: Thanos's first moves.", 'pt-BR': "Gamora, Nebulosa e a Joia do Poder: os primeiros passos de Thanos." } },
      { id: 'aou', weight: 'essential', why: { en: "The Mind Stone gives Vision life, and Wanda joins the team.", 'pt-BR': "A Joia da Mente dá vida ao Visão, e Wanda entra para a equipe." } },
      { id: 'civil-war', weight: 'essential', why: { en: "The Avengers split, just before Thanos arrives.", 'pt-BR': "Os Vingadores se dividem, pouco antes de Thanos chegar." } },
      { id: 'doctor-strange', weight: 'essential', why: { en: "Strange becomes the keeper of the Time Stone.", 'pt-BR': "Strange se torna o guardião da Joia do Tempo." } },
      { id: 'thor-ragnarok', weight: 'essential', why: { en: "Thor and Loki's journey ends where Infinity War begins.", 'pt-BR': "A jornada de Thor e Loki termina onde Guerra Infinita começa." } },
      { id: 'black-panther', weight: 'essential', why: { en: "Wakanda, where Infinity War's last stand is fought.", 'pt-BR': "Wakanda, onde se trava a última batalha de Guerra Infinita." } },
      { id: 'infinity-war', weight: 'essential', why: { en: "Thanos goes after all six Stones.", 'pt-BR': "Thanos vai atrás das seis Joias." } },
      { id: 'endgame', weight: 'essential', why: { en: "Everything the Saga built comes to its end.", 'pt-BR': "Tudo o que a Saga construiu chega ao fim." } },
    ],
  },
  {
    id: 'spider-man',
    group: 'characters',
    color: '#a23a3a',
    short: { en: 'Spider-Man', 'pt-BR': 'Homem-Aranha' },
    kind: 'character',
    character: 'peter',
    reviewed: '2026-11-18',
    name: { en: 'Spider-Man', 'pt-BR': 'Homem-Aranha' },
    blurb: {
      en: "Tom Holland's Peter Parker, from his first suit to today.",
      'pt-BR': 'O Peter Parker de Tom Holland, do primeiro uniforme até hoje.',
    },
    stops: [
      { id: 'civil-war', weight: 'essential', why: { en: "Tony recruits Peter: where his MCU story begins.", 'pt-BR': "Tony recruta Peter: onde começa sua história no MCU." } },
      { id: 'homecoming', weight: 'essential', why: { en: "Peter tries to prove himself to Tony, and to Queens.", 'pt-BR': "Peter tenta provar seu valor a Tony, e ao Queens." } },
      { id: 'infinity-war', weight: 'essential', why: { en: "Peter's first fight far from New York, against Thanos.", 'pt-BR': "A primeira luta de Peter longe de Nova York, contra Thanos." } },
      { id: 'endgame', weight: 'essential', why: { en: "What Tony's story leaves Peter to carry.", 'pt-BR': "O que a história de Tony deixa para Peter carregar." } },
      { id: 'far-from-home', weight: 'essential', why: { en: "Peter, missing Tony, meets Mysterio; the ending changes everything.", 'pt-BR': "Peter, sentindo falta de Tony, conhece Mystério; o final muda tudo." } },
      { id: 'no-way-home', weight: 'essential', why: { en: "Peter's identity, the multiverse, and the price he pays.", 'pt-BR': "A identidade de Peter, o multiverso e o preço que ele paga." } },
      { id: 'brand-new-day', weight: 'essential', why: { en: "Peter starts over on his own: where his story stands now.", 'pt-BR': "Peter recomeça sozinho: onde sua história está hoje." } },
    ],
  },
  {
    id: 'avengers',
    group: 'teams',
    color: '#4a6da3',
    short: { en: 'The Avengers', 'pt-BR': 'Os Vingadores' },
    kind: 'arc',
    reviewed: '2026-11-22',
    name: { en: 'The Avengers', 'pt-BR': 'Os Vingadores' },
    blurb: {
      en: 'The team films, from the first assembly to Endgame.',
      'pt-BR': 'Os filmes da equipe, da primeira reunião a Ultimato.',
    },
    stops: [
      { id: 'avengers', weight: 'essential', why: { en: "Six heroes become a team for the first time.", 'pt-BR': "Seis heróis viram uma equipe pela primeira vez." } },
      { id: 'aou', weight: 'essential', why: { en: "Ultron, Vision and the Mind Stone: the first cracks.", 'pt-BR': "Ultron, Visão e a Joia da Mente: as primeiras rachaduras." } },
      { id: 'civil-war', weight: 'essential', why: { en: 'The team splits over the Sokovia Accords.', 'pt-BR': 'A equipe se divide por causa do Tratado de Sokovia.' } },
      { id: 'infinity-war', weight: 'essential', why: { en: "The team, scattered, faces Thanos.", 'pt-BR': "A equipe, dispersa, enfrenta Thanos." } },
      { id: 'endgame', weight: 'essential', why: { en: 'The last time the original Avengers assembled.', 'pt-BR': 'A última vez que os Vingadores originais se reuniram.' } },
    ],
  },
  {
    id: 'multiverse-saga',
    group: 'stories',
    color: '#603a80',
    short: { en: 'Multiverse Saga', 'pt-BR': 'Saga do Multiverso' },
    kind: 'arc',
    reviewed: '2026-11-18',
    name: { en: 'The Multiverse Saga', 'pt-BR': 'A Saga do Multiverso' },
    blurb: {
      en: 'How the multiverse opened up, on the way to Doomsday and Secret Wars.',
      'pt-BR': 'Como o multiverso se abriu, a caminho de Doomsday e Guerras Secretas.',
    },
    stops: [
      { id: 'loki-s1', weight: 'essential', why: { en: "The TVA and the Sacred Timeline: how the multiverse opens up.", 'pt-BR': "A AVT e a Linha do Tempo Sagrada: como o multiverso se abre." } },
      { id: 'no-way-home', weight: 'essential', why: { en: "A spell gone wrong lets other universes' villains in.", 'pt-BR': "Um feitiço que dá errado traz vilões de outros universos." } },
      { id: 'multiverse-madness', weight: 'essential', why: { en: "Incursions: what happens when universes collide.", 'pt-BR': "Incursões: o que acontece quando universos colidem." } },
      { id: 'quantumania', weight: 'essential', why: { en: "Kang, the conqueror the TVA was afraid of.", 'pt-BR': "Kang, o conquistador que a AVT temia." } },
      { id: 'loki-s2', weight: 'essential', why: { en: "The TVA races to keep the timelines from collapsing.", 'pt-BR': "A AVT corre para impedir que as linhas do tempo desabem." } },
      { id: 'deadpool-3', weight: 'essential', why: { en: "The TVA and a dying universe, Deadpool style.", 'pt-BR': "A AVT e um universo à beira do fim, ao estilo Deadpool." } },
    ],
  },
  {
    id: 'animated',
    group: 'corners',
    color: '#a06030',
    preparesFor: 'friendly-spidey-s2',
    short: { en: 'Animated series', 'pt-BR': 'Séries animadas' },
    kind: 'arc',
    reviewed: '2026-11-18',
    name: { en: 'The animated series', 'pt-BR': 'As séries animadas' },
    blurb: {
      en: "Marvel Studios' animated stories, mostly from other realities.",
      'pt-BR': 'As histórias animadas da Marvel Studios, quase todas de outras realidades.',
    },
    stops: [
      { id: 'what-if', weight: 'essential', why: { en: "The Watcher's multiverse: familiar heroes, other choices.", 'pt-BR': "O multiverso do Vigia: heróis conhecidos, outras escolhas." } },
      { id: 'what-if-s2', weight: 'essential', why: { en: "New realities, and the Watcher stops just watching.", 'pt-BR': "Novas realidades, e o Vigia deixa de só observar." } },
      { id: 'what-if-s3', weight: 'essential', why: { en: "The Watcher's story comes to its end.", 'pt-BR': "A história do Vigia chega ao fim." } },
      { id: 'friendly-spidey', weight: 'essential', why: { en: "A different Peter's first year, with a different mentor.", 'pt-BR': "O primeiro ano de outro Peter, com outro mentor." } },
      { id: 'eyes-of-wakanda', weight: 'essential', why: { en: "Wakanda's warriors guarding its secrets across history.", 'pt-BR': "Guerreiros de Wakanda protegendo seus segredos ao longo da história." } },
      { id: 'marvel-zombies', weight: 'essential', why: { en: "The zombie world from What If…?, now a story of its own.", 'pt-BR': "O mundo zumbi de What If…?, agora com história própria." } },
    ],
  },

  // ---- DRAFT (Guides 4/4, 2026-11-16): new guides for Andre's approval ------
  // Characters
  {
    id: 'iron-man',
    group: 'characters',
    color: '#9a3c2c',
    short: { en: 'Iron Man', 'pt-BR': 'Homem de Ferro' },
    kind: 'character',
    character: 'tony',
    reviewed: '2026-11-18',
    name: { en: 'Iron Man', 'pt-BR': 'Homem de Ferro' },
    blurb: {
      en: "Robert Downey Jr.'s Tony Stark, from the cave to the Infinity Saga's end.",
      'pt-BR': 'O Tony Stark de Robert Downey Jr., da caverna ao fim da Saga do Infinito.',
    },
    stops: [
      { id: 'iron-man', weight: 'essential', why: { en: "Tony builds the suit and tells the world who he is.", 'pt-BR': "Tony constrói a armadura e conta ao mundo quem é." } },
      { id: 'iron-man-2', weight: 'essential', why: { en: "Tony's legacy, his father, and the first Avengers recruiting.", 'pt-BR': "O legado de Tony, seu pai, e o primeiro recrutamento dos Vingadores." } },
      { id: 'avengers', weight: 'essential', why: { en: "Tony learns to fight for a team, not just himself.", 'pt-BR': "Tony aprende a lutar em equipe, não só por si." } },
      { id: 'iron-man-3', weight: 'essential', why: { en: "After New York, Tony faces his anxiety without the suit.", 'pt-BR': "Depois de Nova York, Tony enfrenta a ansiedade sem a armadura." } },
      { id: 'aou', weight: 'essential', why: { en: "Tony's fear of the next threat builds Ultron.", 'pt-BR': "O medo de Tony da próxima ameaça cria Ultron." } },
      { id: 'civil-war', weight: 'essential', why: { en: "Tony's guilt puts him against Steve.", 'pt-BR': "A culpa de Tony o coloca contra Steve." } },
      { id: 'infinity-war', weight: 'essential', why: { en: "The threat Tony feared since New York arrives.", 'pt-BR': "A ameaça que Tony temia desde Nova York chega." } },
      { id: 'endgame', weight: 'essential', why: { en: "Where Tony's story has been heading all along.", 'pt-BR': "Para onde a história de Tony sempre caminhou." } },
    ],
  },
  {
    id: 'captain-america',
    group: 'characters',
    color: '#34507e',
    short: { en: 'Captain America', 'pt-BR': 'Capitão América' },
    kind: 'character',
    character: 'steve',
    reviewed: '2026-11-22',
    name: { en: 'Captain America: Steve to Sam', 'pt-BR': 'Capitão América: de Steve a Sam' },
    blurb: {
      en: 'Steve Rogers takes up the shield, and Sam Wilson carries it on.',
      'pt-BR': 'Steve Rogers assume o escudo, e Sam Wilson o leva adiante.',
    },
    stops: [
      { id: 'cap-first-avenger', weight: 'essential', why: { en: "Steve becomes Captain America alongside Bucky.", 'pt-BR': "Steve vira Capitão América ao lado de Bucky." } },
      { id: 'avengers', weight: 'essential', why: { en: "A man out of his time finds a team to lead.", 'pt-BR': "Um homem fora do seu tempo encontra uma equipe para liderar." } },
      { id: 'cap-winter-soldier', weight: 'essential', why: { en: "Steve meets Sam, and Bucky comes back as an enemy.", 'pt-BR': "Steve conhece Sam, e Bucky volta como inimigo." } },
      { id: 'aou', weight: 'essential', why: { en: 'Steve leads the team against Ultron, and Sokovia sets up the Accords.', 'pt-BR': 'Steve lidera a equipe contra Ultron, e Sokovia prepara o Tratado.' } },
      { id: 'civil-war', weight: 'essential', why: { en: "Steve chooses Bucky over the Accords.", 'pt-BR': "Steve escolhe Bucky em vez dos Acordos." } },
      { id: 'infinity-war', weight: 'essential', why: { en: "Steve comes out of hiding to face Thanos.", 'pt-BR': "Steve sai das sombras para enfrentar Thanos." } },
      { id: 'endgame', weight: 'essential', why: { en: "Steve's last stand, and the question of the shield.", 'pt-BR': "A última luta de Steve, e a questão do escudo." } },
      { id: 'falcon-winter', weight: 'essential', why: { en: "Sam weighs whether to take up the shield.", 'pt-BR': "Sam pondera se deve assumir o escudo." } },
      { id: 'cap-brave', weight: 'essential', why: { en: "Sam's first mission as the new Captain America.", 'pt-BR': "A primeira missão de Sam como o novo Capitão América." } },
    ],
  },
  {
    id: 'thor',
    group: 'characters',
    color: '#566f8f',
    short: { en: 'Thor', 'pt-BR': 'Thor' },
    kind: 'character',
    character: 'thor',
    reviewed: '2026-11-22',
    name: { en: 'Thor', 'pt-BR': 'Thor' },
    blurb: {
      en: "Chris Hemsworth's Thor, from Asgard's heir to a god finding his way.",
      'pt-BR': 'O Thor de Chris Hemsworth, de herdeiro de Asgard a um deus em busca do seu caminho.',
    },
    stops: [
      { id: 'thor', weight: 'essential', why: { en: "Banished to Earth, Thor has to earn his hammer back.", 'pt-BR': "Banido para a Terra, Thor precisa reconquistar o martelo." } },
      { id: 'avengers', weight: 'essential', why: { en: "Thor chases Loki to Earth and fights beside humans.", 'pt-BR': "Thor persegue Loki até a Terra e luta ao lado de humanos." } },
      { id: 'thor-dark-world', weight: 'essential', why: { en: "The Dark Elves, the Aether, and Thor and Loki's uneasy alliance.", 'pt-BR': 'Os Elfos Negros, o Éter e a aliança desconfortável entre Thor e Loki.' } },
      { id: 'thor-ragnarok', weight: 'essential', why: { en: "Thor loses everything, and finds out who he is without it.", 'pt-BR': "Thor perde tudo, e descobre quem é sem isso." } },
      { id: 'infinity-war', weight: 'essential', why: { en: "Thor's quest for a weapon that can stop Thanos.", 'pt-BR': "A busca de Thor por uma arma capaz de deter Thanos." } },
      { id: 'endgame', weight: 'essential', why: { en: "A Thor nobody expected, and where he goes next.", 'pt-BR': "Um Thor que ninguém esperava, e para onde ele vai." } },
      { id: 'thor-love', weight: 'essential', why: { en: "Thor finds Jane again, wielding his old hammer.", 'pt-BR': "Thor reencontra Jane, empunhando seu antigo martelo." } },
    ],
  },
  {
    id: 'hulk',
    group: 'characters',
    color: '#3f6b45',
    short: { en: 'Hulk', 'pt-BR': 'Hulk' },
    kind: 'character',
    character: 'bruce',
    reviewed: '2026-11-22',
    name: { en: 'Hulk', 'pt-BR': 'Hulk' },
    blurb: {
      en: 'Bruce Banner and the other guy, learning to live together.',
      'pt-BR': 'Bruce Banner e o outro cara, aprendendo a conviver.',
    },
    stops: [
      { id: 'incredible-hulk', weight: 'essential', why: { en: 'Bruce on the run from General Ross (played by Edward Norton).', 'pt-BR': 'Bruce em fuga do General Ross (vivido por Edward Norton).' } },
      { id: 'avengers', weight: 'essential', why: { en: "Bruce learns to count on the Hulk, not fight him.", 'pt-BR': "Bruce aprende a contar com o Hulk, não lutar contra ele." } },
      { id: 'aou', weight: 'essential', why: { en: "Bruce fears what the Hulk does, and grows close to Natasha.", 'pt-BR': "Bruce teme o que o Hulk faz, e se aproxima de Natasha." } },
      { id: 'thor-ragnarok', weight: 'essential', why: { en: "The Hulk in charge, two years and a galaxy away.", 'pt-BR': "O Hulk no comando, dois anos e uma galáxia depois." } },
      { id: 'infinity-war', weight: 'essential', why: { en: "Bruce crashes back to Earth with Thanos's warning.", 'pt-BR': "Bruce cai de volta na Terra com o aviso sobre Thanos." } },
      { id: 'endgame', weight: 'essential', why: { en: "Bruce and the Hulk, finally on the same side.", 'pt-BR': "Bruce e o Hulk, enfim do mesmo lado." } },
    ],
  },
  {
    id: 'black-widow',
    group: 'characters',
    color: '#5a3a46',
    short: { en: 'Black Widow', 'pt-BR': 'Viúva Negra' },
    kind: 'character',
    character: 'natasha',
    reviewed: '2026-11-18',
    name: { en: 'Black Widow: Natasha and Yelena', 'pt-BR': 'Viúva Negra: Natasha e Yelena' },
    blurb: {
      en: 'Natasha Romanoff, then the sister who picks up the story.',
      'pt-BR': 'Natasha Romanoff, e depois a irmã que continua a história.',
    },
    stops: [
      { id: 'avengers', weight: 'essential', why: { en: "Natasha joins the team, with a past she won't talk about.", 'pt-BR': "Natasha entra na equipe, com um passado que ela não conta." } },
      { id: 'cap-winter-soldier', weight: 'essential', why: { en: "Natasha's secrets meet S.H.I.E.L.D.'s.", 'pt-BR': "Os segredos de Natasha encontram os da S.H.I.E.L.D." } },
      { id: 'civil-war', weight: 'essential', why: { en: "Natasha torn between the team and the Accords.", 'pt-BR': "Natasha dividida entre a equipe e os Acordos." } },
      { id: 'endgame', weight: 'essential', why: { en: "Natasha keeps what's left of the team together.", 'pt-BR': "Natasha mantém unido o que restou da equipe." } },
      { id: 'black-widow', weight: 'essential', why: { en: "Natasha's Red Room past, and the sister she left behind.", 'pt-BR': "O passado de Natasha na Sala Vermelha, e a irmã que ela deixou." } },
      { id: 'hawkeye', weight: 'essential', why: { en: "Yelena comes after Clint for what happened to Natasha.", 'pt-BR': "Yelena vai atrás de Clint pelo que houve com Natasha." } },
      { id: 'thunderbolts', weight: 'essential', why: { en: "Yelena finds a new team, and a reason to keep going.", 'pt-BR': "Yelena encontra uma nova equipe, e um motivo para seguir." } },
    ],
  },
  {
    id: 'doctor-strange',
    group: 'characters',
    color: '#5c3f7a',
    short: { en: 'Doctor Strange', 'pt-BR': 'Doutor Estranho' },
    kind: 'character',
    character: 'strange',
    reviewed: '2026-11-18',
    name: { en: 'Doctor Strange', 'pt-BR': 'Doutor Estranho' },
    blurb: {
      en: 'A surgeon becomes the Sorcerer Supreme, and the multiverse gets in the way.',
      'pt-BR': 'Um cirurgião vira o Mago Supremo, e o multiverso entra no caminho.',
    },
    stops: [
      { id: 'doctor-strange', weight: 'essential', why: { en: "A surgeon loses his hands and finds the mystic arts.", 'pt-BR': "Um cirurgião perde as mãos e encontra as artes místicas." } },
      { id: 'infinity-war', weight: 'essential', why: { en: "Strange swore to guard the Time Stone; Thanos wants it.", 'pt-BR': "Strange jurou proteger a Joia do Tempo; Thanos a quer." } },
      { id: 'endgame', weight: 'essential', why: { en: "Why Strange made the choice he did.", 'pt-BR': "Por que Strange fez a escolha que fez." } },
      { id: 'no-way-home', weight: 'essential', why: { en: "Strange's spell for Peter cracks the multiverse open.", 'pt-BR': "O feitiço de Strange para Peter abre fendas no multiverso." } },
      { id: 'multiverse-madness', weight: 'essential', why: { en: "Strange crosses universes and meets other versions of himself.", 'pt-BR': "Strange atravessa universos e encontra outras versões de si." } },
    ],
  },
  {
    id: 'wanda',
    group: 'characters',
    color: '#8a2f3e',
    short: { en: 'Wanda', 'pt-BR': 'Wanda' },
    kind: 'character',
    character: 'wanda',
    reviewed: '2026-11-18',
    name: { en: 'Wanda Maximoff', 'pt-BR': 'Wanda Maximoff' },
    blurb: {
      en: 'From Sokovia to Westview: how Wanda became the Scarlet Witch.',
      'pt-BR': 'De Sokóvia a Westview: como Wanda virou a Feiticeira Escarlate.',
    },
    stops: [
      { id: 'aou', weight: 'essential', why: { en: "Wanda's grudge against Tony, and how she joins the Avengers.", 'pt-BR': "A mágoa de Wanda contra Tony, e como ela entra nos Vingadores." } },
      { id: 'civil-war', weight: 'essential', why: { en: "Wanda's mistake starts the fight over the Accords.", 'pt-BR': "O erro de Wanda dá início à briga pelos Acordos." } },
      { id: 'infinity-war', weight: 'essential', why: { en: "Wanda and Vision, and the Stone in his head.", 'pt-BR': "Wanda e Visão, e a Joia na cabeça dele." } },
      { id: 'wandavision', weight: 'essential', why: { en: "Wanda's grief builds a sitcom town, and her power shows.", 'pt-BR': "O luto de Wanda cria uma cidade de sitcom, e seu poder aparece." } },
      { id: 'multiverse-madness', weight: 'essential', why: { en: "Wanda goes after the life she lost, at any cost.", 'pt-BR': "Wanda vai atrás da vida que perdeu, a qualquer custo." } },
    ],
  },
  {
    id: 'loki',
    group: 'characters',
    color: '#3f6a46',
    short: { en: 'Loki', 'pt-BR': 'Loki' },
    kind: 'character',
    character: 'loki',
    reviewed: '2026-11-22',
    name: { en: 'Loki', 'pt-BR': 'Loki' },
    blurb: {
      en: "Tom Hiddleston's Loki, from Asgard's outsider to the TVA.",
      'pt-BR': 'O Loki de Tom Hiddleston, de excluído de Asgard à AVT.',
    },
    stops: [
      { id: 'thor', weight: 'essential', why: { en: "Loki learns he was adopted, and it breaks him.", 'pt-BR': "Loki descobre que foi adotado, e isso o quebra." } },
      { id: 'avengers', weight: 'essential', why: { en: "Loki invades New York with Thanos's army.", 'pt-BR': "Loki invade Nova York com o exército de Thanos." } },
      { id: 'thor-dark-world', weight: 'essential', why: { en: 'Loki and Thor, an uneasy alliance.', 'pt-BR': 'Loki e Thor, uma aliança desconfortável.' } },
      { id: 'thor-ragnarok', weight: 'essential', why: { en: "Loki and Thor, brothers again on Sakaar.", 'pt-BR': "Loki e Thor, irmãos de novo em Sakaar." } },
      { id: 'endgame', weight: 'essential', why: { en: "A 2012 Loki slips away with the Tesseract.", 'pt-BR': "Um Loki de 2012 escapa com o Tesserato." } },
      { id: 'loki-s1', weight: 'essential', why: { en: "That Loki, caught by the TVA, faces who he is.", 'pt-BR': "Esse Loki, preso pela AVT, encara quem ele é." } },
      { id: 'loki-s2', weight: 'essential', why: { en: "Loki tries to keep the TVA, and time, from falling apart.", 'pt-BR': "Loki tenta impedir que a AVT, e o tempo, desmoronem." } },
    ],
  },
  {
    id: 'ant-man',
    group: 'characters',
    color: '#7a3434',
    short: { en: 'Ant-Man', 'pt-BR': 'Homem-Formiga' },
    kind: 'character',
    character: 'scott',
    reviewed: '2026-11-22',
    name: { en: 'Ant-Man', 'pt-BR': 'Homem-Formiga' },
    blurb: {
      en: "Scott Lang's heists, family and trips to the Quantum Realm.",
      'pt-BR': 'Os golpes, a família e as viagens de Scott Lang ao Reino Quântico.',
    },
    stops: [
      { id: 'ant-man', weight: 'essential', why: { en: "Scott takes Hank Pym's suit and learns of the Quantum Realm.", 'pt-BR': "Scott veste o traje de Hank Pym e descobre o Reino Quântico." } },
      { id: 'civil-war', weight: 'essential', why: { en: "Scott joins Steve's side in the airport fight.", 'pt-BR': 'Scott fica do lado de Steve na luta do aeroporto.' } },
      { id: 'ant-man-wasp', weight: 'essential', why: { en: "Scott and Hope go after Janet in the Quantum Realm.", 'pt-BR': "Scott e Hope vão atrás de Janet no Reino Quântico." } },
      { id: 'endgame', weight: 'essential', why: { en: "Scott's time in the Quantum Realm gives the Avengers an idea.", 'pt-BR': "O tempo de Scott no Reino Quântico dá uma ideia aos Vingadores." } },
      { id: 'quantumania', weight: 'essential', why: { en: "The family pulled into the Quantum Realm, where Kang waits.", 'pt-BR': "A família tragada pelo Reino Quântico, onde Kang espera." } },
    ],
  },
  {
    id: 'black-panther',
    group: 'characters',
    color: '#4a3a6a',
    short: { en: 'Black Panther', 'pt-BR': 'Pantera Negra' },
    kind: 'character',
    character: 'tchalla',
    reviewed: '2026-11-18',
    name: { en: "Black Panther: T'Challa and Shuri", 'pt-BR': 'Pantera Negra: T’Challa e Shuri' },
    blurb: {
      en: "Wakanda's kings and its next protector.",
      'pt-BR': 'Os reis de Wakanda e sua próxima protetora.',
    },
    stops: [
      { id: 'civil-war', weight: 'essential', why: { en: "T'Challa's first appearance, chasing his father's killer.", 'pt-BR': "A primeira aparição de T'Challa, atrás do assassino do pai." } },
      { id: 'black-panther', weight: 'essential', why: { en: "T'Challa becomes king and decides Wakanda's place in the world.", 'pt-BR': "T'Challa vira rei e decide o lugar de Wakanda no mundo." } },
      { id: 'infinity-war', weight: 'essential', why: { en: "Wakanda opens its gates to fight Thanos.", 'pt-BR': "Wakanda abre os portões para enfrentar Thanos." } },
      { id: 'wakanda-forever', weight: 'essential', why: { en: "Shuri carries Wakanda forward.", 'pt-BR': "Shuri leva Wakanda adiante." } },
    ],
  },
  {
    id: 'captain-marvel',
    group: 'characters',
    color: '#8a5a2c',
    short: { en: 'Captain Marvel', 'pt-BR': 'Capitã Marvel' },
    kind: 'character',
    character: 'carol',
    reviewed: '2026-11-22',
    name: { en: 'Captain Marvel', 'pt-BR': 'Capitã Marvel' },
    blurb: {
      en: "Carol Danvers, and the heroes who look up to her.",
      'pt-BR': 'Carol Danvers, e as heroínas que se inspiram nela.',
    },
    stops: [
      { id: 'captain-marvel', weight: 'essential', why: { en: "Carol, in the 1990s, finds out who she was before the Kree.", 'pt-BR': "Carol, nos anos 1990, descobre quem era antes dos Kree." } },
      { id: 'endgame', weight: 'essential', why: { en: "Carol answers Fury's call.", 'pt-BR': "Carol atende ao chamado de Fury." } },
      { id: 'wandavision', weight: 'essential', why: { en: 'Introduces Monica Rambeau as an adult.', 'pt-BR': 'Apresenta Monica Rambeau adulta.' } },
      { id: 'ms-marvel', weight: 'essential', why: { en: "Kamala Khan, Carol's biggest fan, gets powers of her own.", 'pt-BR': "Kamala Khan, a maior fã de Carol, ganha poderes próprios." } },
      { id: 'marvels', weight: 'essential', why: { en: "Carol, Monica and Kamala swap places, and team up.", 'pt-BR': "Carol, Monica e Kamala trocam de lugar e se unem." } },
    ],
  },
  // Teams (The Avengers above is the fourth)
  {
    id: 'guardians',
    group: 'teams',
    color: '#4e3a7a',
    short: { en: 'Guardians', 'pt-BR': 'Guardiões' },
    kind: 'arc',
    reviewed: '2026-11-22',
    name: { en: 'Guardians of the Galaxy', 'pt-BR': 'Guardiões da Galáxia' },
    blurb: {
      en: "A trilogy about a found family, and where they turn up in between.",
      'pt-BR': 'Uma trilogia sobre uma família escolhida, e por onde eles passam no caminho.',
    },
    stops: [
      { id: 'gotg', weight: 'essential', why: { en: "Five outlaws become a team, and Gamora runs from Thanos.", 'pt-BR': "Cinco foras da lei viram equipe, e Gamora foge de Thanos." } },
      { id: 'gotg-2', weight: 'essential', why: { en: "Peter Quill meets his father, and the team becomes a family.", 'pt-BR': "Peter Quill conhece o pai, e a equipe vira família." } },
      { id: 'infinity-war', weight: 'essential', why: { en: "The Guardians find Thor, and Gamora faces Thanos.", 'pt-BR': "Os Guardiões encontram Thor, e Gamora enfrenta Thanos." } },
      { id: 'endgame', weight: 'essential', why: { en: 'Where the team stands after Infinity War, and the Gamora Vol. 3 follows.', 'pt-BR': 'Como a equipe fica depois de Guerra Infinita, e a Gamora que o Vol. 3 acompanha.' } },
      { id: 'gotg-3', weight: 'essential', why: { en: "Rocket's past catches up with the team.", 'pt-BR': 'O passado de Rocket alcança a equipe.' } },
    ],
  },
  {
    id: 'thunderbolts',
    group: 'teams',
    color: '#4c4c56',
    short: { en: 'Thunderbolts*', 'pt-BR': 'Thunderbolts*' },
    kind: 'arc',
    reviewed: '2026-11-22',
    name: { en: 'Thunderbolts*', 'pt-BR': 'Thunderbolts*' },
    blurb: {
      en: 'Where each of the misfits came from, before they end up in one room.',
      'pt-BR': 'De onde vem cada um dos desajustados, antes de acabarem na mesma sala.',
    },
    stops: [
      { id: 'cap-winter-soldier', weight: 'essential', why: { en: 'Introduces Bucky as the Winter Soldier.', 'pt-BR': 'Apresenta Bucky como o Soldado Invernal.' } },
      { id: 'ant-man-wasp', weight: 'essential', why: { en: 'Introduces Ghost.', 'pt-BR': 'Apresenta a Fantasma.' } },
      { id: 'falcon-winter', weight: 'essential', why: { en: "John Walker's fall, and Valentina's first offer.", 'pt-BR': "A queda de John Walker, e a primeira oferta de Valentina." } },
      { id: 'black-widow', weight: 'essential', why: { en: "Yelena, Red Guardian and Taskmaster, before the team.", 'pt-BR': "Yelena, Guardião Vermelho e Treinadora, antes da equipe." } },
      { id: 'hawkeye', weight: 'essential', why: { en: 'Yelena after Black Widow, looking for answers.', 'pt-BR': 'Yelena depois de Viúva Negra, em busca de respostas.' } },
      { id: 'thunderbolts', weight: 'essential', why: { en: "Valentina's castoffs, forced to work together.", 'pt-BR': "Os descartados de Valentina, obrigados a trabalhar juntos." } },
    ],
  },
  {
    id: 'next-generation',
    group: 'teams',
    color: '#7a4f2c',
    short: { en: 'Next generation', 'pt-BR': 'Nova geração' },
    kind: 'arc',
    reviewed: '2026-11-22',
    name: { en: 'The next generation', 'pt-BR': 'A nova geração' },
    blurb: {
      en: 'The young heroes the MCU has been gathering since Endgame.',
      'pt-BR': 'Os jovens heróis que o MCU vem reunindo desde Ultimato.',
    },
    stops: [
      { id: 'hawkeye', weight: 'essential', why: { en: "Kate Bishop learns from Clint, and earns the name.", 'pt-BR': "Kate Bishop aprende com Clint, e conquista o nome." } },
      { id: 'multiverse-madness', weight: 'essential', why: { en: "America Chavez, who opens doors between universes.", 'pt-BR': "America Chavez, que abre portas entre universos." } },
      { id: 'ms-marvel', weight: 'essential', why: { en: "Kamala Khan finds her powers, and her heritage.", 'pt-BR': "Kamala Khan descobre seus poderes, e suas origens." } },
      { id: 'quantumania', weight: 'essential', why: { en: 'Cassie Lang suits up.', 'pt-BR': 'Cassie Lang veste o uniforme.' } },
      { id: 'marvels', weight: 'essential', why: { en: "Kamala's first mission with her heroes, and a team in sight.", 'pt-BR': "A primeira missão de Kamala com suas heroínas, e uma equipe à vista." } },
      { id: 'agatha', weight: 'essential', why: { en: 'Billy Maximoff, grown up.', 'pt-BR': 'Billy Maximoff, crescido.' } },
      { id: 'ironheart', weight: 'essential', why: { en: "Riri Williams builds her own armor, Tony's heir.", 'pt-BR': "Riri Williams constrói sua própria armadura, herdeira de Tony." } },
    ],
  },
  // Corners of the universe (the animated series above is the fourth)
  {
    id: 'cosmic',
    group: 'corners',
    color: '#2f4a7a',
    short: { en: 'Cosmic', 'pt-BR': 'Cósmico' },
    kind: 'arc',
    reviewed: '2026-11-18',
    name: { en: 'Cosmic', 'pt-BR': 'O lado cósmico' },
    blurb: {
      en: 'Beyond Earth: the Kree, the Skrulls, the Eternals and the Guardians.',
      'pt-BR': 'Além da Terra: os Kree, os Skrulls, os Eternos e os Guardiões.',
    },
    stops: [
      { id: 'gotg', weight: 'essential', why: { en: "The galaxy beyond Earth: the Nova Corps, Xandar, the Collector.", 'pt-BR': "A galáxia além da Terra: a Tropa Nova, Xandar, o Colecionador." } },
      { id: 'captain-marvel', weight: 'essential', why: { en: "The Kree–Skrull war, under way since the 1990s.", 'pt-BR': "A guerra Kree–Skrull, que vem dos anos 1990." } },
      { id: 'eternals', weight: 'essential', why: { en: "The Celestials, the cosmic beings who shaped worlds.", 'pt-BR': "Os Celestiais, seres cósmicos que moldaram mundos." } },
      { id: 'marvels', weight: 'essential', why: { en: "The Kree's broken homeworld strikes back.", 'pt-BR': "O mundo natal dos Kree, em ruínas, contra-ataca." } },
      { id: 'fantastic-four', weight: 'essential', why: { en: "Galactus and the Silver Surfer: the cosmos at its biggest.", 'pt-BR': "Galactus e a Surfista Prateada: o cosmos em escala máxima." } },
    ],
  },
  {
    id: 'street-level',
    group: 'corners',
    color: '#6a2a2a',
    short: { en: 'Street level', 'pt-BR': 'Nas ruas' },
    kind: 'arc',
    reviewed: '2026-11-18',
    name: { en: 'Street level', 'pt-BR': 'Nas ruas' },
    blurb: {
      en: "New York's neighbourhood heroes, far from the cosmic fights.",
      'pt-BR': 'Os heróis de bairro de Nova York, longe das lutas cósmicas.',
    },
    stops: [
      { id: 'hawkeye', weight: 'essential', why: { en: "Clint and Kate against a New York gang, and who runs it.", 'pt-BR': "Clint e Kate contra uma gangue de Nova York, e quem a comanda." } },
      { id: 'echo', weight: 'essential', why: { en: "Maya Lopez goes home, with Kingpin on her trail.", 'pt-BR': "Maya Lopez volta para casa, com o Rei do Crime no seu encalço." } },
      { id: 'daredevil-born-again', weight: 'essential', why: { en: "Matt Murdock and Wilson Fisk, back in Hell's Kitchen.", 'pt-BR': "Matt Murdock e Wilson Fisk, de volta a Hell's Kitchen." } },
      { id: 'daredevil-born-again-s2', weight: 'essential', why: { en: "New York under Mayor Fisk, and Daredevil fighting back.", 'pt-BR': "Nova York sob o prefeito Fisk, e o Demolidor reagindo." } },
    ],
  },
  {
    id: 'mystic',
    group: 'corners',
    color: '#4a2a5a',
    short: { en: 'The mystic arts', 'pt-BR': 'Artes místicas' },
    kind: 'arc',
    reviewed: '2026-11-18',
    name: { en: 'The mystic arts', 'pt-BR': 'As artes místicas' },
    blurb: {
      en: 'Sorcerers, witches and gods of the night.',
      'pt-BR': 'Feiticeiros, bruxas e deuses da noite.',
    },
    stops: [
      { id: 'doctor-strange', weight: 'essential', why: { en: "Kamar-Taj and the Ancient One: where the mystic arts begin.", 'pt-BR': "Kamar-Taj e a Anciã: onde começam as artes místicas." } },
      { id: 'wandavision', weight: 'essential', why: { en: "Chaos magic, and the witch living next door.", 'pt-BR': "Magia do caos, e a bruxa que mora ao lado." } },
      { id: 'moon-knight', weight: 'essential', why: { en: "Egyptian gods, and a man sharing his life with another.", 'pt-BR': "Deuses egípcios, e um homem que divide a vida com outro." } },
      { id: 'multiverse-madness', weight: 'essential', why: { en: "The Darkhold, the book that corrupts the Scarlet Witch.", 'pt-BR': "O Darkhold, o livro que corrompe a Feiticeira Escarlate." } },
      { id: 'agatha', weight: 'essential', why: { en: "Agatha and her coven walk the Witches' Road.", 'pt-BR': "Agatha e seu coven percorrem a Estrada das Bruxas." } },
    ],
  },
  // Story threads
  {
    id: 'infinity-stones',
    group: 'stories',
    color: '#6a5a2a',
    short: { en: 'Infinity Stones', 'pt-BR': 'Joias do Infinito' },
    kind: 'arc',
    reviewed: '2026-11-18',
    name: { en: 'The Infinity Stones', 'pt-BR': 'As Joias do Infinito' },
    blurb: {
      en: 'One stop for each stone, from its first appearance to Thanos.',
      'pt-BR': 'Uma parada para cada joia, da primeira aparição até Thanos.',
    },
    stops: [
      { id: 'cap-first-avenger', weight: 'essential', why: { en: 'Space: the Tesseract.', 'pt-BR': 'Espaço: o Tesseract.' } },
      { id: 'avengers', weight: 'essential', why: { en: "Mind: Loki's sceptre.", 'pt-BR': 'Mente: o cetro de Loki.' } },
      { id: 'thor-dark-world', weight: 'essential', why: { en: 'Reality: the Aether.', 'pt-BR': 'Realidade: o Éter.' } },
      { id: 'gotg', weight: 'essential', why: { en: 'Power: the Orb.', 'pt-BR': 'Poder: o Orbe.' } },
      { id: 'doctor-strange', weight: 'essential', why: { en: 'Time: the Eye of Agamotto.', 'pt-BR': 'Tempo: o Olho de Agamotto.' } },
      { id: 'infinity-war', weight: 'essential', why: { en: 'Soul, and Thanos comes for all six.', 'pt-BR': 'Alma, e Thanos vem atrás das seis.' } },
    ],
  },
  {
    id: 'thanos',
    group: 'stories',
    color: '#5a3a6a',
    short: { en: 'Thanos', 'pt-BR': 'Thanos' },
    kind: 'arc',
    reviewed: '2026-11-18',
    name: { en: 'The Thanos arc', 'pt-BR': 'O arco de Thanos' },
    blurb: {
      en: 'The Mad Titan, from a smile in a credits scene to the snap.',
      'pt-BR': 'O Titã Louco, de um sorriso na cena pós-créditos ao estalo.',
    },
    stops: [
      { id: 'gotg', weight: 'essential', why: { en: "His daughters Gamora and Nebula, and his first try for a Stone.", 'pt-BR': "As filhas Gamora e Nebulosa, e sua primeira investida por uma Joia." } },
      { id: 'infinity-war', weight: 'essential', why: { en: 'His film: Thanos collects the stones.', 'pt-BR': 'O filme dele: Thanos reúne as joias.' } },
      { id: 'endgame', weight: 'essential', why: { en: "What his victory costs, and the Avengers' answer.", 'pt-BR': "O preço da vitória dele, e a resposta dos Vingadores." } },
    ],
  },
  // Event guide after Doomsday, made like it
  {
    id: 'before-secret-wars',
    kind: 'event',
    group: 'coming',
    target: 'secret-wars',
    color: '#5a2f4a',
    reviewed: '2026-11-22',
    name: { en: 'Catch up before Avengers: Secret Wars', 'pt-BR': 'Prepare-se para Vingadores: Guerras Secretas' },
    short: { en: 'Before Secret Wars', 'pt-BR': 'Antes de Guerras Secretas' },
    blurb: {
      en: 'The multiverse story so far, on the way to the end of the Multiverse Saga. Nothing about Secret Wars itself.',
      'pt-BR': 'A história do multiverso até aqui, a caminho do fim da Saga do Multiverso. Nada sobre Guerras Secretas em si.',
    },
    done: { en: 'Ready for Secret Wars.', 'pt-BR': 'Pronto para Guerras Secretas.' },
    stops: [
      { id: 'loki-s1', weight: 'essential', why: { en: "The TVA, and the first sign the timelines can break.", 'pt-BR': "A AVT, e o primeiro sinal de que as linhas do tempo podem se partir." } },
      { id: 'no-way-home', weight: 'essential', why: { en: 'Visitors from other universes reach Peter Parker.', 'pt-BR': 'Visitantes de outros universos chegam até Peter Parker.' } },
      { id: 'multiverse-madness', weight: 'essential', why: { en: 'Incursions: when universes collide.', 'pt-BR': 'Incursões: quando universos colidem.' } },
      { id: 'loki-s2', weight: 'essential', why: { en: "What holds the multiverse together now, and at what cost.", 'pt-BR': "O que mantém o multiverso de pé agora, e a que preço." } },
      { id: 'fantastic-four', weight: 'essential', why: { en: "The Fantastic Four's Earth, another universe in play.", 'pt-BR': "A Terra do Quarteto Fantástico, outro universo em jogo." } },
      { id: 'doomsday', weight: 'essential', why: { en: 'The first half of the finale.', 'pt-BR': 'A primeira metade do final.' } },
    ],
  },
];

// Drafts (none right now) show only where Andre reviews them: on localhost,
// on Vercel previews (*.vercel.app), or when a QA check asks
// (window.__GUIDE_DRAFTS). Never on redthread.tv until approved, when the
// `draft` flags (and `draftGroup`, which moves a guide to its new shelf) are
// removed. Ids stay permanent either way.
const draftsShown = (() => {
  try {
    if ((window as unknown as { __GUIDE_DRAFTS?: boolean }).__GUIDE_DRAFTS === true) return true;
    // The dev server and `npm run preview` (localhost:8126); the QA checks
    // serve from 127.0.0.1 and see what production sees. No import.meta here:
    // the link-preview build step loads this file outside the bundle.
    const host = window.location.hostname;
    return host === 'localhost' || /\.vercel\.app$/.test(host);
  } catch (e) { return false; }
})();
// Typed here, not imported: the link-preview step loads this file on its own.
type MaybeDraft = (typeof ALL_GUIDES)[number] & { draft?: boolean; draftGroup?: string };
window.GUIDES = (ALL_GUIDES as MaybeDraft[])
  .filter((g) => draftsShown || !g.draft)
  .map((g) => (draftsShown && g.draftGroup ? { ...g, group: g.draftGroup } : g));
