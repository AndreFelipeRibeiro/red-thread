// Guides: short, curated paths through the catalogue for a reason ("Catch up
// before Avengers: Doomsday", "Spider-Man", ...). Each stop says why it is
// there and how much it matters (essential or optional). Loaded after data.js.
//
// DRAFT: the lists, order, weights and wording need Andre's approval before
// this ships (V3 Tasks, "Create curated watch guides"). The Doomsday guide
// follows the ticket's draft (2026-10-29); the other five are Claude's drafts.
//
// DRAFT (Guides 4/4, 2026-11-16): every guide after the animated series is a
// new draft for Andre to keep, change or drop, and The Avengers and the
// animated series moved shelf (teams, corners). Not to ship before approval.
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
//     a reason, so a cameo is optional at most.
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
    reviewed: '2026-10-29',
    name: { en: 'Catch up before Avengers: Doomsday', 'pt-BR': 'Prepare-se para Vingadores: Doomsday' },
    short: { en: 'Before Doomsday', 'pt-BR': 'Antes de Doomsday' },
    blurb: {
      en: "Five films and series that set up December's team-up. Nothing about Doomsday itself.",
      'pt-BR': 'Cinco filmes e séries que preparam o encontro de dezembro. Nada sobre Doomsday em si.',
    },
    done: { en: "Ready for Doomsday.", 'pt-BR': 'Pronto para Doomsday.' },
    stops: [
      { id: 'endgame', weight: 'essential', why: { en: 'The last time the original Avengers stood together.', 'pt-BR': 'A última vez que os Vingadores originais estiveram juntos.' } },
      { id: 'shang-chi', weight: 'optional', why: { en: 'Introduces Shang-Chi.', 'pt-BR': 'Apresenta Shang-Chi.' } },
      { id: 'wakanda-forever', weight: 'optional', why: { en: "Shuri and M'Baku lead Wakanda's next chapter.", 'pt-BR': 'Shuri e M’Baku conduzem o novo capítulo de Wakanda.' } },
      { id: 'quantumania', weight: 'optional', why: { en: "Scott Lang's most recent adventure.", 'pt-BR': 'A aventura mais recente de Scott Lang.' } },
      { id: 'loki-s2', weight: 'essential', why: { en: "Loki's latest chapter with the TVA.", 'pt-BR': 'O capítulo mais recente de Loki com a AVT.' } },
      { id: 'cap-brave', weight: 'essential', why: { en: "Sam Wilson's first film as Captain America.", 'pt-BR': 'O primeiro filme de Sam Wilson como Capitão América.' } },
      { id: 'thunderbolts', weight: 'essential', why: { en: 'Introduces a new team, with Yelena and Bucky.', 'pt-BR': 'Apresenta uma nova equipe, com Yelena e Bucky.' } },
      { id: 'fantastic-four', weight: 'essential', why: { en: 'Meet the Fantastic Four, on their own Earth.', 'pt-BR': 'Conheça o Quarteto Fantástico, na sua própria Terra.' } },
    ],
  },
  {
    id: 'infinity-saga',
    group: 'stories',
    color: '#7a4060',
    evergreen: true,
    short: { en: 'Infinity Saga', 'pt-BR': 'Saga do Infinito' },
    kind: 'arc',
    reviewed: '2026-10-29',
    name: { en: 'The Infinity Saga essentials', 'pt-BR': 'O essencial da Saga do Infinito' },
    blurb: {
      en: 'The ten films that carry the story from Iron Man to Endgame.',
      'pt-BR': 'Os dez filmes que levam a história de Homem de Ferro a Ultimato.',
    },
    stops: [
      { id: 'iron-man', weight: 'essential', why: { en: 'Where it all starts: Tony Stark builds the suit.', 'pt-BR': 'Onde tudo começa: Tony Stark constrói a armadura.' } },
      { id: 'cap-first-avenger', weight: 'essential', why: { en: 'Steve Rogers becomes Captain America, and the Tesseract appears.', 'pt-BR': 'Steve Rogers vira o Capitão América, e o Tesseract aparece.' } },
      { id: 'avengers', weight: 'essential', why: { en: 'The team assembles for the first time.', 'pt-BR': 'A equipe se reúne pela primeira vez.' } },
      { id: 'cap-winter-soldier', weight: 'essential', why: { en: 'S.H.I.E.L.D. is shaken, and Bucky returns.', 'pt-BR': 'A S.H.I.E.L.D. é abalada, e Bucky volta.' } },
      { id: 'gotg', weight: 'essential', why: { en: 'Introduces the Guardians and the wider cosmos.', 'pt-BR': 'Apresenta os Guardiões e o lado cósmico do universo.' } },
      { id: 'aou', weight: 'optional', why: { en: 'Introduces Wanda and Vision.', 'pt-BR': 'Apresenta Wanda e Visão.' } },
      { id: 'civil-war', weight: 'essential', why: { en: 'The Avengers split over who should oversee them.', 'pt-BR': 'Os Vingadores se dividem sobre quem deve supervisioná-los.' } },
      { id: 'doctor-strange', weight: 'optional', why: { en: 'Introduces Stephen Strange and the mystic arts.', 'pt-BR': 'Apresenta Stephen Strange e as artes místicas.' } },
      { id: 'thor-ragnarok', weight: 'essential', why: { en: "Thor and Loki's road to Infinity War begins here.", 'pt-BR': 'O caminho de Thor e Loki até Guerra Infinita começa aqui.' } },
      { id: 'black-panther', weight: 'essential', why: { en: "Introduces T'Challa's Wakanda.", 'pt-BR': 'Apresenta a Wakanda de T’Challa.' } },
      { id: 'infinity-war', weight: 'essential', why: { en: 'Thanos comes for the Infinity Stones.', 'pt-BR': 'Thanos vem atrás das Joias do Infinito.' } },
      { id: 'endgame', weight: 'essential', why: { en: 'The end of the Infinity Saga.', 'pt-BR': 'O fim da Saga do Infinito.' } },
    ],
  },
  {
    id: 'spider-man',
    group: 'characters',
    color: '#a23a3a',
    short: { en: 'Spider-Man', 'pt-BR': 'Homem-Aranha' },
    kind: 'character',
    character: 'peter',
    reviewed: '2026-10-29',
    name: { en: 'Spider-Man', 'pt-BR': 'Homem-Aranha' },
    blurb: {
      en: "Tom Holland's Peter Parker, from his first suit to today.",
      'pt-BR': 'O Peter Parker de Tom Holland, do primeiro uniforme até hoje.',
    },
    stops: [
      { id: 'civil-war', weight: 'essential', why: { en: "Peter's first outing as Spider-Man.", 'pt-BR': 'A primeira aparição de Peter como Homem-Aranha.' } },
      { id: 'homecoming', weight: 'essential', why: { en: 'His first film of his own, in high school.', 'pt-BR': 'O primeiro filme solo dele, no colégio.' } },
      { id: 'infinity-war', weight: 'essential', why: { en: 'Peter joins the fight against Thanos.', 'pt-BR': 'Peter entra na luta contra Thanos.' } },
      { id: 'endgame', weight: 'essential', why: { en: "Peter's part in the Infinity Saga's ending.", 'pt-BR': 'O papel de Peter no fim da Saga do Infinito.' } },
      { id: 'far-from-home', weight: 'essential', why: { en: 'A school trip to Europe, and a new threat.', 'pt-BR': 'Uma viagem escolar à Europa, e uma nova ameaça.' } },
      { id: 'what-if', weight: 'optional', why: { en: 'Alternate-reality episodes with other versions of Peter.', 'pt-BR': 'Episódios de realidades alternativas com outras versões de Peter.' } },
      { id: 'no-way-home', weight: 'essential', why: { en: 'The multiverse comes to Peter.', 'pt-BR': 'O multiverso chega até Peter.' } },
      { id: 'friendly-spidey', weight: 'optional', why: { en: 'An animated retelling on another Earth.', 'pt-BR': 'Uma releitura animada em outra Terra.' } },
      { id: 'marvel-zombies', weight: 'optional', why: { en: "Another reality's Peter, in a zombie outbreak.", 'pt-BR': 'O Peter de outra realidade, em um surto zumbi.' } },
      { id: 'brand-new-day', weight: 'essential', why: { en: "Peter's latest film.", 'pt-BR': 'O filme mais recente de Peter.' } },
    ],
  },
  {
    id: 'avengers',
    group: 'stories',
    draftGroup: 'teams',
    color: '#4a6da3',
    short: { en: 'The Avengers', 'pt-BR': 'Os Vingadores' },
    kind: 'arc',
    reviewed: '2026-10-29',
    name: { en: 'The Avengers', 'pt-BR': 'Os Vingadores' },
    blurb: {
      en: 'The team films, from the first assembly to Endgame.',
      'pt-BR': 'Os filmes da equipe, da primeira reunião a Ultimato.',
    },
    stops: [
      { id: 'avengers', weight: 'essential', why: { en: 'The team assembles for the first time.', 'pt-BR': 'A equipe se reúne pela primeira vez.' } },
      { id: 'aou', weight: 'essential', why: { en: 'Tony builds a peacekeeper, and it goes wrong.', 'pt-BR': 'Tony cria um pacificador, e tudo dá errado.' } },
      { id: 'civil-war', weight: 'optional', why: { en: 'The team splits: an Avengers story in a Captain America film.', 'pt-BR': 'A equipe se divide: uma história dos Vingadores num filme do Capitão América.' } },
      { id: 'infinity-war', weight: 'essential', why: { en: 'Thanos comes for the Infinity Stones.', 'pt-BR': 'Thanos vem atrás das Joias do Infinito.' } },
      { id: 'endgame', weight: 'essential', why: { en: 'The last time the original Avengers assembled.', 'pt-BR': 'A última vez que os Vingadores originais se reuniram.' } },
    ],
  },
  {
    id: 'multiverse-saga',
    group: 'stories',
    color: '#603a80',
    short: { en: 'Multiverse Saga', 'pt-BR': 'Saga do Multiverso' },
    kind: 'arc',
    reviewed: '2026-10-29',
    name: { en: 'The Multiverse Saga', 'pt-BR': 'A Saga do Multiverso' },
    blurb: {
      en: 'How the multiverse opened up, on the way to Doomsday and Secret Wars.',
      'pt-BR': 'Como o multiverso se abriu, a caminho de Doomsday e Guerras Secretas.',
    },
    stops: [
      { id: 'loki-s1', weight: 'essential', why: { en: 'Introduces the TVA and the Sacred Timeline.', 'pt-BR': 'Apresenta a AVT e a Linha do Tempo Sagrada.' } },
      { id: 'what-if', weight: 'optional', why: { en: 'A tour of other realities.', 'pt-BR': 'Um passeio por outras realidades.' } },
      { id: 'no-way-home', weight: 'essential', why: { en: 'Visitors from other universes reach Peter Parker.', 'pt-BR': 'Visitantes de outros universos chegam até Peter Parker.' } },
      { id: 'multiverse-madness', weight: 'essential', why: { en: 'Doctor Strange travels between universes.', 'pt-BR': 'Doutor Estranho viaja entre universos.' } },
      { id: 'quantumania', weight: 'essential', why: { en: 'Introduces Kang the Conqueror.', 'pt-BR': 'Apresenta Kang, o Conquistador.' } },
      { id: 'loki-s2', weight: 'essential', why: { en: 'The TVA tries to hold the timelines together.', 'pt-BR': 'A AVT tenta manter as linhas do tempo unidas.' } },
      { id: 'deadpool-3', weight: 'essential', why: { en: 'Deadpool and Wolverine collide with the TVA.', 'pt-BR': 'Deadpool e Wolverine se chocam com a AVT.' } },
    ],
  },
  {
    id: 'animated',
    group: 'animation',
    draftGroup: 'corners',
    color: '#a06030',
    preparesFor: 'friendly-spidey-s2',
    short: { en: 'Animated series', 'pt-BR': 'Séries animadas' },
    kind: 'arc',
    reviewed: '2026-10-29',
    name: { en: 'The animated series', 'pt-BR': 'As séries animadas' },
    blurb: {
      en: "Marvel Studios' animated stories, mostly from other realities.",
      'pt-BR': 'As histórias animadas da Marvel Studios, quase todas de outras realidades.',
    },
    stops: [
      { id: 'what-if', weight: 'essential', why: { en: 'What if key moments had gone another way?', 'pt-BR': 'E se momentos-chave tivessem sido diferentes?' } },
      { id: 'what-if-s2', weight: 'essential', why: { en: 'More realities, and the Watcher steps in.', 'pt-BR': 'Mais realidades, e o Vigia entra em cena.' } },
      { id: 'what-if-s3', weight: 'essential', why: { en: 'The final season of What If…?', 'pt-BR': 'A última temporada de What If…?' } },
      { id: 'friendly-spidey', weight: 'essential', why: { en: "Peter Parker's first year, on another Earth.", 'pt-BR': 'O primeiro ano de Peter Parker, em outra Terra.' } },
      { id: 'eyes-of-wakanda', weight: 'essential', why: { en: "Wakanda's warriors across history.", 'pt-BR': 'Os guerreiros de Wakanda ao longo da história.' } },
      { id: 'marvel-zombies', weight: 'essential', why: { en: 'A What If…? reality overrun by zombies.', 'pt-BR': 'Uma realidade de What If…? tomada por zumbis.' } },
    ],
  },

  // ---- DRAFT (Guides 4/4, 2026-11-16): new guides for Andre's approval ------
  // Characters
  {
    id: 'iron-man',
    draft: true,
    group: 'characters',
    color: '#9a3c2c',
    short: { en: 'Iron Man', 'pt-BR': 'Homem de Ferro' },
    kind: 'character',
    character: 'tony',
    reviewed: '2026-11-16',
    name: { en: 'Iron Man', 'pt-BR': 'Homem de Ferro' },
    blurb: {
      en: "Robert Downey Jr.'s Tony Stark, from the cave to the Infinity Saga's end.",
      'pt-BR': 'O Tony Stark de Robert Downey Jr., da caverna ao fim da Saga do Infinito.',
    },
    stops: [
      { id: 'iron-man', weight: 'essential', why: { en: 'Tony builds the first suit and goes public.', 'pt-BR': 'Tony constrói a primeira armadura e se revela ao mundo.' } },
      { id: 'iron-man-2', weight: 'essential', why: { en: 'Tony under pressure, and S.H.I.E.L.D. comes calling.', 'pt-BR': 'Tony sob pressão, e a S.H.I.E.L.D. bate à porta.' } },
      { id: 'avengers', weight: 'essential', why: { en: 'Tony joins the team.', 'pt-BR': 'Tony entra para a equipe.' } },
      { id: 'iron-man-3', weight: 'essential', why: { en: 'Tony after New York, without the suit to hide behind.', 'pt-BR': 'Tony depois de Nova York, sem a armadura para se esconder.' } },
      { id: 'aou', weight: 'essential', why: { en: "Tony's plan to protect the world creates Ultron.", 'pt-BR': 'O plano de Tony para proteger o mundo cria Ultron.' } },
      { id: 'civil-war', weight: 'essential', why: { en: 'Tony backs the Accords against Steve.', 'pt-BR': 'Tony apoia o Tratado contra Steve.' } },
      { id: 'homecoming', weight: 'optional', why: { en: 'Tony as Peter Parker\'s mentor.', 'pt-BR': 'Tony como mentor de Peter Parker.' } },
      { id: 'infinity-war', weight: 'essential', why: { en: 'Tony faces Thanos.', 'pt-BR': 'Tony enfrenta Thanos.' } },
      { id: 'endgame', weight: 'essential', why: { en: "Tony's part in the Infinity Saga's finale.", 'pt-BR': 'O papel de Tony no fim da Saga do Infinito.' } },
    ],
  },
  {
    id: 'captain-america',
    draft: true,
    group: 'characters',
    color: '#34507e',
    short: { en: 'Captain America', 'pt-BR': 'Capitão América' },
    kind: 'character',
    character: 'steve',
    reviewed: '2026-11-16',
    name: { en: 'Captain America: Steve to Sam', 'pt-BR': 'Capitão América: de Steve a Sam' },
    blurb: {
      en: 'Steve Rogers takes up the shield, and Sam Wilson carries it on.',
      'pt-BR': 'Steve Rogers assume o escudo, e Sam Wilson o leva adiante.',
    },
    stops: [
      { id: 'cap-first-avenger', weight: 'essential', why: { en: 'Steve becomes Captain America in the Second World War.', 'pt-BR': 'Steve vira o Capitão América na Segunda Guerra.' } },
      { id: 'avengers', weight: 'essential', why: { en: 'Steve wakes up in a new century and leads the team.', 'pt-BR': 'Steve acorda num novo século e lidera a equipe.' } },
      { id: 'cap-winter-soldier', weight: 'essential', why: { en: 'Steve meets Sam, and finds Bucky again.', 'pt-BR': 'Steve conhece Sam e reencontra Bucky.' } },
      { id: 'aou', weight: 'optional', why: { en: 'Steve leads the Avengers against Ultron.', 'pt-BR': 'Steve lidera os Vingadores contra Ultron.' } },
      { id: 'civil-war', weight: 'essential', why: { en: 'Steve refuses the Accords to protect Bucky.', 'pt-BR': 'Steve recusa o Tratado para proteger Bucky.' } },
      { id: 'infinity-war', weight: 'essential', why: { en: 'Steve returns from the shadows to face Thanos.', 'pt-BR': 'Steve volta das sombras para enfrentar Thanos.' } },
      { id: 'endgame', weight: 'essential', why: { en: "Steve's part in the Infinity Saga's finale.", 'pt-BR': 'O papel de Steve no fim da Saga do Infinito.' } },
      { id: 'falcon-winter', weight: 'essential', why: { en: 'Sam and Bucky wrestle with what the shield means.', 'pt-BR': 'Sam e Bucky lidam com o que o escudo significa.' } },
      { id: 'cap-brave', weight: 'essential', why: { en: "Sam Wilson's first film as Captain America.", 'pt-BR': 'O primeiro filme de Sam Wilson como Capitão América.' } },
    ],
  },
  {
    id: 'thor',
    draft: true,
    group: 'characters',
    color: '#566f8f',
    short: { en: 'Thor', 'pt-BR': 'Thor' },
    kind: 'character',
    character: 'thor',
    reviewed: '2026-11-16',
    name: { en: 'Thor', 'pt-BR': 'Thor' },
    blurb: {
      en: "Chris Hemsworth's Thor, from Asgard's heir to a god finding his way.",
      'pt-BR': 'O Thor de Chris Hemsworth, de herdeiro de Asgard a um deus em busca do seu caminho.',
    },
    stops: [
      { id: 'thor', weight: 'essential', why: { en: 'Thor is banished to Earth and has to earn his hammer.', 'pt-BR': 'Thor é banido para a Terra e precisa merecer o martelo.' } },
      { id: 'avengers', weight: 'essential', why: { en: 'Thor comes back for Loki and joins the team.', 'pt-BR': 'Thor volta atrás de Loki e entra para a equipe.' } },
      { id: 'thor-dark-world', weight: 'optional', why: { en: 'The Dark Elves, and the Aether.', 'pt-BR': 'Os Elfos Negros, e o Éter.' } },
      { id: 'aou', weight: 'optional', why: { en: 'Thor fights Ultron, and sees what is coming.', 'pt-BR': 'Thor enfrenta Ultron e tem visões do que está por vir.' } },
      { id: 'thor-ragnarok', weight: 'essential', why: { en: 'Asgard is in danger, and Thor finds a new tone.', 'pt-BR': 'Asgard corre perigo, e Thor encontra um novo tom.' } },
      { id: 'infinity-war', weight: 'essential', why: { en: 'Thor goes after Thanos.', 'pt-BR': 'Thor vai atrás de Thanos.' } },
      { id: 'endgame', weight: 'essential', why: { en: "Thor's part in the Infinity Saga's ending.", 'pt-BR': 'O papel de Thor no fim da Saga do Infinito.' } },
      { id: 'thor-love', weight: 'essential', why: { en: 'Thor meets Jane again, and a god-killer.', 'pt-BR': 'Thor reencontra Jane, e um assassino de deuses.' } },
    ],
  },
  {
    id: 'hulk',
    draft: true,
    group: 'characters',
    color: '#3f6b45',
    short: { en: 'Hulk', 'pt-BR': 'Hulk' },
    kind: 'character',
    character: 'bruce',
    reviewed: '2026-11-16',
    name: { en: 'Hulk', 'pt-BR': 'Hulk' },
    blurb: {
      en: 'Bruce Banner and the other guy, learning to live together.',
      'pt-BR': 'Bruce Banner e o outro cara, aprendendo a conviver.',
    },
    stops: [
      { id: 'incredible-hulk', weight: 'optional', why: { en: 'Bruce on the run (played by Edward Norton).', 'pt-BR': 'Bruce em fuga (vivido por Edward Norton).' } },
      { id: 'avengers', weight: 'essential', why: { en: 'Mark Ruffalo\'s Bruce joins the team.', 'pt-BR': 'O Bruce de Mark Ruffalo entra para a equipe.' } },
      { id: 'aou', weight: 'essential', why: { en: 'Bruce and Natasha, and Ultron.', 'pt-BR': 'Bruce e Natasha, e Ultron.' } },
      { id: 'thor-ragnarok', weight: 'essential', why: { en: 'The Hulk turns up far from Earth.', 'pt-BR': 'O Hulk aparece longe da Terra.' } },
      { id: 'infinity-war', weight: 'essential', why: { en: 'Bruce brings the warning to Earth.', 'pt-BR': 'Bruce traz o alerta para a Terra.' } },
      { id: 'endgame', weight: 'essential', why: { en: "Bruce's part in the Infinity Saga's finale.", 'pt-BR': 'O papel de Bruce no fim da Saga do Infinito.' } },
      { id: 'she-hulk', weight: 'optional', why: { en: 'Bruce trains his cousin Jennifer Walters.', 'pt-BR': 'Bruce treina a prima, Jennifer Walters.' } },
    ],
  },
  {
    id: 'black-widow',
    draft: true,
    group: 'characters',
    color: '#5a3a46',
    short: { en: 'Black Widow', 'pt-BR': 'Viúva Negra' },
    kind: 'character',
    character: 'natasha',
    reviewed: '2026-11-16',
    name: { en: 'Black Widow: Natasha and Yelena', 'pt-BR': 'Viúva Negra: Natasha e Yelena' },
    blurb: {
      en: 'Natasha Romanoff, then the sister who picks up the story.',
      'pt-BR': 'Natasha Romanoff, e depois a irmã que continua a história.',
    },
    stops: [
      { id: 'iron-man-2', weight: 'optional', why: { en: 'Natasha arrives undercover.', 'pt-BR': 'Natasha chega disfarçada.' } },
      { id: 'avengers', weight: 'essential', why: { en: 'Natasha joins the team.', 'pt-BR': 'Natasha entra para a equipe.' } },
      { id: 'cap-winter-soldier', weight: 'essential', why: { en: 'Natasha and Steve uncover the truth about S.H.I.E.L.D.', 'pt-BR': 'Natasha e Steve descobrem a verdade sobre a S.H.I.E.L.D.' } },
      { id: 'civil-war', weight: 'essential', why: { en: 'Natasha caught between both sides.', 'pt-BR': 'Natasha entre os dois lados.' } },
      { id: 'endgame', weight: 'essential', why: { en: "Natasha's part in the Infinity Saga's ending.", 'pt-BR': 'O papel de Natasha no fim da Saga do Infinito.' } },
      { id: 'black-widow', weight: 'essential', why: { en: 'Natasha\'s past, and her sister Yelena.', 'pt-BR': 'O passado de Natasha, e a irmã, Yelena.' } },
      { id: 'hawkeye', weight: 'essential', why: { en: 'Yelena comes looking for answers.', 'pt-BR': 'Yelena vem atrás de respostas.' } },
      { id: 'thunderbolts', weight: 'essential', why: { en: 'Yelena finds a new team.', 'pt-BR': 'Yelena encontra uma nova equipe.' } },
    ],
  },
  {
    id: 'doctor-strange',
    draft: true,
    group: 'characters',
    color: '#5c3f7a',
    short: { en: 'Doctor Strange', 'pt-BR': 'Doutor Estranho' },
    kind: 'character',
    character: 'strange',
    reviewed: '2026-11-16',
    name: { en: 'Doctor Strange', 'pt-BR': 'Doutor Estranho' },
    blurb: {
      en: 'A surgeon becomes the Sorcerer Supreme, and the multiverse gets in the way.',
      'pt-BR': 'Um cirurgião vira o Mago Supremo, e o multiverso entra no caminho.',
    },
    stops: [
      { id: 'doctor-strange', weight: 'essential', why: { en: 'Stephen Strange discovers the mystic arts.', 'pt-BR': 'Stephen Strange descobre as artes místicas.' } },
      { id: 'thor-ragnarok', weight: 'optional', why: { en: 'A short visit to the Sanctum.', 'pt-BR': 'Uma visita rápida ao Sanctum.' } },
      { id: 'infinity-war', weight: 'essential', why: { en: 'Strange guards the Time Stone.', 'pt-BR': 'Estranho protege a Joia do Tempo.' } },
      { id: 'endgame', weight: 'essential', why: { en: "Strange's part in the Infinity Saga's ending.", 'pt-BR': 'O papel de Estranho no fim da Saga do Infinito.' } },
      { id: 'what-if', weight: 'optional', why: { en: 'An alternate Strange, in one of its best episodes.', 'pt-BR': 'Um Estranho alternativo, num dos melhores episódios.' } },
      { id: 'no-way-home', weight: 'essential', why: { en: "Peter asks for a spell, and it goes wrong.", 'pt-BR': 'Peter pede um feitiço, e tudo dá errado.' } },
      { id: 'multiverse-madness', weight: 'essential', why: { en: 'Strange travels between universes.', 'pt-BR': 'Estranho viaja entre universos.' } },
    ],
  },
  {
    id: 'wanda',
    draft: true,
    group: 'characters',
    color: '#8a2f3e',
    short: { en: 'Wanda', 'pt-BR': 'Wanda' },
    kind: 'character',
    character: 'wanda',
    reviewed: '2026-11-16',
    name: { en: 'Wanda Maximoff', 'pt-BR': 'Wanda Maximoff' },
    blurb: {
      en: 'From Sokovia to Westview: how Wanda became the Scarlet Witch.',
      'pt-BR': 'De Sokóvia a Westview: como Wanda virou a Feiticeira Escarlate.',
    },
    stops: [
      { id: 'aou', weight: 'essential', why: { en: 'Wanda and her brother meet the Avengers.', 'pt-BR': 'Wanda e o irmão conhecem os Vingadores.' } },
      { id: 'civil-war', weight: 'essential', why: { en: 'Wanda sides with Steve.', 'pt-BR': 'Wanda fica do lado de Steve.' } },
      { id: 'infinity-war', weight: 'essential', why: { en: 'Wanda and Vision, and the Mind Stone.', 'pt-BR': 'Wanda e Visão, e a Joia da Mente.' } },
      { id: 'endgame', weight: 'optional', why: { en: "Wanda's part in the final battle.", 'pt-BR': 'O papel de Wanda na batalha final.' } },
      { id: 'wandavision', weight: 'essential', why: { en: 'A sitcom life in Westview that is not what it seems.', 'pt-BR': 'Uma vida de sitcom em Westview que não é o que parece.' } },
      { id: 'multiverse-madness', weight: 'essential', why: { en: 'Wanda goes looking for what she lost.', 'pt-BR': 'Wanda vai atrás do que perdeu.' } },
      { id: 'agatha', weight: 'optional', why: { en: "Agatha's story, picking up from Westview.", 'pt-BR': 'A história de Agatha, depois de Westview.' } },
    ],
  },
  {
    id: 'loki',
    draft: true,
    group: 'characters',
    color: '#3f6a46',
    short: { en: 'Loki', 'pt-BR': 'Loki' },
    kind: 'character',
    character: 'loki',
    reviewed: '2026-11-16',
    name: { en: 'Loki', 'pt-BR': 'Loki' },
    blurb: {
      en: "Tom Hiddleston's Loki, from Asgard's outsider to the TVA.",
      'pt-BR': 'O Loki de Tom Hiddleston, de excluído de Asgard à AVT.',
    },
    stops: [
      { id: 'thor', weight: 'essential', why: { en: 'Loki learns where he comes from.', 'pt-BR': 'Loki descobre de onde veio.' } },
      { id: 'avengers', weight: 'essential', why: { en: 'Loki brings an army to New York.', 'pt-BR': 'Loki traz um exército para Nova York.' } },
      { id: 'thor-dark-world', weight: 'optional', why: { en: 'Loki and Thor, an uneasy alliance.', 'pt-BR': 'Loki e Thor, uma aliança desconfortável.' } },
      { id: 'thor-ragnarok', weight: 'essential', why: { en: 'The brothers on Sakaar.', 'pt-BR': 'Os irmãos em Sakaar.' } },
      { id: 'endgame', weight: 'essential', why: { en: "Sets up Loki's own series.", 'pt-BR': 'Prepara a série do próprio Loki.' } },
      { id: 'loki-s1', weight: 'essential', why: { en: 'Loki meets the TVA.', 'pt-BR': 'Loki conhece a AVT.' } },
      { id: 'loki-s2', weight: 'essential', why: { en: 'The TVA tries to hold the timelines together.', 'pt-BR': 'A AVT tenta manter as linhas do tempo unidas.' } },
    ],
  },
  {
    id: 'ant-man',
    draft: true,
    group: 'characters',
    color: '#7a3434',
    short: { en: 'Ant-Man', 'pt-BR': 'Homem-Formiga' },
    kind: 'character',
    character: 'scott',
    reviewed: '2026-11-16',
    name: { en: 'Ant-Man', 'pt-BR': 'Homem-Formiga' },
    blurb: {
      en: "Scott Lang's heists, family and trips to the Quantum Realm.",
      'pt-BR': 'Os golpes, a família e as viagens de Scott Lang ao Reino Quântico.',
    },
    stops: [
      { id: 'ant-man', weight: 'essential', why: { en: 'Scott gets the suit from Hank Pym.', 'pt-BR': 'Scott recebe a armadura de Hank Pym.' } },
      { id: 'civil-war', weight: 'optional', why: { en: 'Scott joins Steve\'s side at the airport.', 'pt-BR': 'Scott entra para o lado de Steve no aeroporto.' } },
      { id: 'ant-man-wasp', weight: 'essential', why: { en: 'Scott and Hope go into the Quantum Realm.', 'pt-BR': 'Scott e Hope entram no Reino Quântico.' } },
      { id: 'endgame', weight: 'essential', why: { en: 'Scott brings an idea to the Avengers.', 'pt-BR': 'Scott traz uma ideia para os Vingadores.' } },
      { id: 'quantumania', weight: 'essential', why: { en: 'The family meets Kang.', 'pt-BR': 'A família conhece Kang.' } },
    ],
  },
  {
    id: 'black-panther',
    draft: true,
    group: 'characters',
    color: '#4a3a6a',
    short: { en: 'Black Panther', 'pt-BR': 'Pantera Negra' },
    kind: 'character',
    character: 'tchalla',
    reviewed: '2026-11-16',
    name: { en: "Black Panther: T'Challa and Shuri", 'pt-BR': 'Pantera Negra: T’Challa e Shuri' },
    blurb: {
      en: "Wakanda's kings and its next protector.",
      'pt-BR': 'Os reis de Wakanda e sua próxima protetora.',
    },
    stops: [
      { id: 'civil-war', weight: 'essential', why: { en: "T'Challa's first appearance.", 'pt-BR': 'A primeira aparição de T’Challa.' } },
      { id: 'black-panther', weight: 'essential', why: { en: "T'Challa becomes king, and Wakanda opens up.", 'pt-BR': 'T’Challa vira rei, e Wakanda se abre.' } },
      { id: 'infinity-war', weight: 'essential', why: { en: 'Wakanda stands against Thanos.', 'pt-BR': 'Wakanda enfrenta Thanos.' } },
      { id: 'endgame', weight: 'optional', why: { en: "Wakanda's part in the final battle.", 'pt-BR': 'O papel de Wakanda na batalha final.' } },
      { id: 'wakanda-forever', weight: 'essential', why: { en: "Shuri leads Wakanda's next chapter.", 'pt-BR': 'Shuri conduz o novo capítulo de Wakanda.' } },
      { id: 'eyes-of-wakanda', weight: 'optional', why: { en: "Wakanda's warriors across history.", 'pt-BR': 'Os guerreiros de Wakanda ao longo da história.' } },
    ],
  },
  {
    id: 'captain-marvel',
    draft: true,
    group: 'characters',
    color: '#8a5a2c',
    short: { en: 'Captain Marvel', 'pt-BR': 'Capitã Marvel' },
    kind: 'character',
    character: 'carol',
    reviewed: '2026-11-16',
    name: { en: 'Captain Marvel', 'pt-BR': 'Capitã Marvel' },
    blurb: {
      en: "Carol Danvers, and the heroes who look up to her.",
      'pt-BR': 'Carol Danvers, e as heroínas que se inspiram nela.',
    },
    stops: [
      { id: 'captain-marvel', weight: 'essential', why: { en: 'Carol finds out who she was, in the 1990s.', 'pt-BR': 'Carol descobre quem era, nos anos 1990.' } },
      { id: 'endgame', weight: 'essential', why: { en: 'Carol answers the call.', 'pt-BR': 'Carol atende ao chamado.' } },
      { id: 'wandavision', weight: 'optional', why: { en: 'Introduces Monica Rambeau as an adult.', 'pt-BR': 'Apresenta Monica Rambeau adulta.' } },
      { id: 'ms-marvel', weight: 'essential', why: { en: "Kamala Khan, Carol's biggest fan.", 'pt-BR': 'Kamala Khan, a maior fã de Carol.' } },
      { id: 'marvels', weight: 'essential', why: { en: 'Carol, Monica and Kamala, tangled together.', 'pt-BR': 'Carol, Monica e Kamala, conectadas.' } },
    ],
  },
  // Teams (The Avengers above is the fourth)
  {
    id: 'guardians',
    draft: true,
    group: 'teams',
    color: '#4e3a7a',
    short: { en: 'Guardians', 'pt-BR': 'Guardiões' },
    kind: 'arc',
    reviewed: '2026-11-16',
    name: { en: 'Guardians of the Galaxy', 'pt-BR': 'Guardiões da Galáxia' },
    blurb: {
      en: "A trilogy about a found family, and where they turn up in between.",
      'pt-BR': 'Uma trilogia sobre uma família escolhida, e por onde eles passam no caminho.',
    },
    stops: [
      { id: 'gotg', weight: 'essential', why: { en: 'Five outlaws become a team.', 'pt-BR': 'Cinco foras da lei viram uma equipe.' } },
      { id: 'gotg-2', weight: 'essential', why: { en: "Peter Quill meets his father.", 'pt-BR': 'Peter Quill conhece o pai.' } },
      { id: 'infinity-war', weight: 'essential', why: { en: 'The Guardians cross paths with Thor and Thanos.', 'pt-BR': 'Os Guardiões cruzam com Thor e Thanos.' } },
      { id: 'endgame', weight: 'optional', why: { en: "The Guardians' part in the final battle.", 'pt-BR': 'O papel dos Guardiões na batalha final.' } },
      { id: 'thor-love', weight: 'optional', why: { en: 'A short trip with Thor.', 'pt-BR': 'Uma viagem curta com Thor.' } },
      { id: 'gotg-3', weight: 'essential', why: { en: "Rocket's past catches up with the team.", 'pt-BR': 'O passado de Rocket alcança a equipe.' } },
    ],
  },
  {
    id: 'thunderbolts',
    draft: true,
    group: 'teams',
    color: '#4c4c56',
    short: { en: 'Thunderbolts*', 'pt-BR': 'Thunderbolts*' },
    kind: 'arc',
    reviewed: '2026-11-16',
    name: { en: 'Thunderbolts*', 'pt-BR': 'Thunderbolts*' },
    blurb: {
      en: 'Where each of the misfits came from, before they end up in one room.',
      'pt-BR': 'De onde vem cada um dos desajustados, antes de acabarem na mesma sala.',
    },
    stops: [
      { id: 'cap-winter-soldier', weight: 'optional', why: { en: 'Bucky as the Winter Soldier.', 'pt-BR': 'Bucky como o Soldado Invernal.' } },
      { id: 'ant-man-wasp', weight: 'optional', why: { en: 'Introduces Ghost.', 'pt-BR': 'Apresenta Fantasma.' } },
      { id: 'falcon-winter', weight: 'essential', why: { en: 'Introduces John Walker, and Valentina.', 'pt-BR': 'Apresenta John Walker, e Valentina.' } },
      { id: 'black-widow', weight: 'essential', why: { en: 'Introduces Yelena, Red Guardian and Taskmaster.', 'pt-BR': 'Apresenta Yelena, Guardião Vermelho e Treinadora.' } },
      { id: 'hawkeye', weight: 'optional', why: { en: 'Yelena after Black Widow.', 'pt-BR': 'Yelena depois de Viúva Negra.' } },
      { id: 'thunderbolts', weight: 'essential', why: { en: 'The team, together at last.', 'pt-BR': 'A equipe, enfim reunida.' } },
    ],
  },
  {
    id: 'next-generation',
    draft: true,
    group: 'teams',
    color: '#7a4f2c',
    short: { en: 'Next generation', 'pt-BR': 'Nova geração' },
    kind: 'arc',
    reviewed: '2026-11-16',
    name: { en: 'The next generation', 'pt-BR': 'A nova geração' },
    blurb: {
      en: 'The young heroes the MCU has been gathering since Endgame.',
      'pt-BR': 'Os jovens heróis que o MCU vem reunindo desde Ultimato.',
    },
    stops: [
      { id: 'wandavision', weight: 'optional', why: { en: "Introduces Wanda's twins.", 'pt-BR': 'Apresenta os gêmeos de Wanda.' } },
      { id: 'hawkeye', weight: 'essential', why: { en: 'Introduces Kate Bishop.', 'pt-BR': 'Apresenta Kate Bishop.' } },
      { id: 'multiverse-madness', weight: 'essential', why: { en: 'Introduces America Chavez.', 'pt-BR': 'Apresenta America Chavez.' } },
      { id: 'ms-marvel', weight: 'essential', why: { en: 'Introduces Kamala Khan.', 'pt-BR': 'Apresenta Kamala Khan.' } },
      { id: 'quantumania', weight: 'optional', why: { en: 'Cassie Lang suits up.', 'pt-BR': 'Cassie Lang veste o uniforme.' } },
      { id: 'marvels', weight: 'essential', why: { en: 'Kamala starts recruiting.', 'pt-BR': 'Kamala começa a recrutar.' } },
      { id: 'agatha', weight: 'optional', why: { en: 'Billy Maximoff, grown up.', 'pt-BR': 'Billy Maximoff, crescido.' } },
      { id: 'ironheart', weight: 'essential', why: { en: 'Introduces Riri Williams.', 'pt-BR': 'Apresenta Riri Williams.' } },
    ],
  },
  // Corners of the universe (the animated series above is the fourth)
  {
    id: 'cosmic',
    draft: true,
    group: 'corners',
    color: '#2f4a7a',
    short: { en: 'Cosmic', 'pt-BR': 'Cósmico' },
    kind: 'arc',
    reviewed: '2026-11-16',
    name: { en: 'Cosmic', 'pt-BR': 'O lado cósmico' },
    blurb: {
      en: 'Beyond Earth: the Kree, the Skrulls, the Eternals and the Guardians.',
      'pt-BR': 'Além da Terra: os Kree, os Skrulls, os Eternos e os Guardiões.',
    },
    stops: [
      { id: 'gotg', weight: 'essential', why: { en: 'The wider galaxy opens up.', 'pt-BR': 'A galáxia se abre.' } },
      { id: 'thor-ragnarok', weight: 'optional', why: { en: 'Sakaar and the Grandmaster.', 'pt-BR': 'Sakaar e o Grão-Mestre.' } },
      { id: 'captain-marvel', weight: 'essential', why: { en: 'The Kree and the Skrulls.', 'pt-BR': 'Os Kree e os Skrulls.' } },
      { id: 'eternals', weight: 'essential', why: { en: 'Introduces the Eternals and the Celestials.', 'pt-BR': 'Apresenta os Eternos e os Celestiais.' } },
      { id: 'secret-invasion', weight: 'optional', why: { en: 'The Skrulls on Earth.', 'pt-BR': 'Os Skrulls na Terra.' } },
      { id: 'marvels', weight: 'essential', why: { en: 'The Kree come back.', 'pt-BR': 'Os Kree voltam.' } },
      { id: 'fantastic-four', weight: 'essential', why: { en: 'Galactus and the Silver Surfer, on another Earth.', 'pt-BR': 'Galactus e a Surfista Prateada, em outra Terra.' } },
    ],
  },
  {
    id: 'street-level',
    draft: true,
    group: 'corners',
    color: '#6a2a2a',
    short: { en: 'Street level', 'pt-BR': 'Nas ruas' },
    kind: 'arc',
    reviewed: '2026-11-16',
    name: { en: 'Street level', 'pt-BR': 'Nas ruas' },
    blurb: {
      en: "New York's neighbourhood heroes, far from the cosmic fights.",
      'pt-BR': 'Os heróis de bairro de Nova York, longe das lutas cósmicas.',
    },
    stops: [
      { id: 'hawkeye', weight: 'essential', why: { en: 'Clint and Kate at Christmas, and the Tracksuit Mafia.', 'pt-BR': 'Clint e Kate no Natal, e a Máfia do Agasalho.' } },
      { id: 'she-hulk', weight: 'optional', why: { en: 'A lawyer meets a certain Hell\'s Kitchen attorney.', 'pt-BR': 'Uma advogada conhece um certo advogado de Hell’s Kitchen.' } },
      { id: 'echo', weight: 'essential', why: { en: 'Maya Lopez, and Kingpin.', 'pt-BR': 'Maya Lopez, e o Rei do Crime.' } },
      { id: 'daredevil-born-again', weight: 'essential', why: { en: 'Matt Murdock back in Hell\'s Kitchen.', 'pt-BR': 'Matt Murdock de volta a Hell’s Kitchen.' } },
      { id: 'ironheart', weight: 'optional', why: { en: "Riri Williams at home in Chicago.", 'pt-BR': 'Riri Williams em casa, em Chicago.' } },
      { id: 'daredevil-born-again-s2', weight: 'essential', why: { en: 'Daredevil and New York, the next chapter.', 'pt-BR': 'O Demolidor e Nova York, o próximo capítulo.' } },
    ],
  },
  {
    id: 'mystic',
    draft: true,
    group: 'corners',
    color: '#4a2a5a',
    short: { en: 'The mystic arts', 'pt-BR': 'Artes místicas' },
    kind: 'arc',
    reviewed: '2026-11-16',
    name: { en: 'The mystic arts', 'pt-BR': 'As artes místicas' },
    blurb: {
      en: 'Sorcerers, witches and gods of the night.',
      'pt-BR': 'Feiticeiros, bruxas e deuses da noite.',
    },
    stops: [
      { id: 'doctor-strange', weight: 'essential', why: { en: 'Strange learns the mystic arts in Kamar-Taj.', 'pt-BR': 'Estranho aprende as artes místicas em Kamar-Taj.' } },
      { id: 'wandavision', weight: 'essential', why: { en: 'Chaos magic, and a witch next door.', 'pt-BR': 'Magia do caos, e uma bruxa na vizinhança.' } },
      { id: 'moon-knight', weight: 'essential', why: { en: 'Egyptian gods, and a man with more than one life.', 'pt-BR': 'Deuses egípcios, e um homem com mais de uma vida.' } },
      { id: 'multiverse-madness', weight: 'essential', why: { en: 'The Darkhold and the Scarlet Witch.', 'pt-BR': 'O Darkhold e a Feiticeira Escarlate.' } },
      { id: 'agatha', weight: 'essential', why: { en: "A coven on the Witches' Road.", 'pt-BR': 'Um coven na Estrada das Bruxas.' } },
    ],
  },
  // Story threads
  {
    id: 'infinity-stones',
    draft: true,
    group: 'stories',
    color: '#6a5a2a',
    short: { en: 'Infinity Stones', 'pt-BR': 'Joias do Infinito' },
    kind: 'arc',
    reviewed: '2026-11-16',
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
    draft: true,
    group: 'stories',
    color: '#5a3a6a',
    short: { en: 'Thanos', 'pt-BR': 'Thanos' },
    kind: 'arc',
    reviewed: '2026-11-16',
    name: { en: 'The Thanos arc', 'pt-BR': 'O arco de Thanos' },
    blurb: {
      en: 'The Mad Titan, from a smile in a credits scene to the snap.',
      'pt-BR': 'O Titã Louco, de um sorriso na cena pós-créditos ao estalo.',
    },
    stops: [
      { id: 'avengers', weight: 'optional', why: { en: 'His first appearance, after the credits.', 'pt-BR': 'A primeira aparição dele, depois dos créditos.' } },
      { id: 'gotg', weight: 'essential', why: { en: 'His daughters Gamora and Nebula.', 'pt-BR': 'As filhas dele, Gamora e Nebulosa.' } },
      { id: 'aou', weight: 'optional', why: { en: 'Thanos decides to act himself.', 'pt-BR': 'Thanos decide agir por conta própria.' } },
      { id: 'gotg-2', weight: 'optional', why: { en: 'Gamora and Nebula, and what he made of them.', 'pt-BR': 'Gamora e Nebulosa, e o que ele fez delas.' } },
      { id: 'infinity-war', weight: 'essential', why: { en: 'His film: Thanos collects the stones.', 'pt-BR': 'O filme dele: Thanos reúne as joias.' } },
      { id: 'endgame', weight: 'essential', why: { en: 'The Avengers answer him.', 'pt-BR': 'Os Vingadores respondem a ele.' } },
    ],
  },
  // Event guide after Doomsday, made like it
  {
    id: 'before-secret-wars',
    draft: true,
    kind: 'event',
    group: 'coming',
    target: 'secret-wars',
    color: '#5a2f4a',
    reviewed: '2026-11-16',
    name: { en: 'Catch up before Avengers: Secret Wars', 'pt-BR': 'Prepare-se para Vingadores: Guerras Secretas' },
    short: { en: 'Before Secret Wars', 'pt-BR': 'Antes de Guerras Secretas' },
    blurb: {
      en: 'The multiverse story so far, on the way to the end of the Multiverse Saga. Nothing about Secret Wars itself.',
      'pt-BR': 'A história do multiverso até aqui, a caminho do fim da Saga do Multiverso. Nada sobre Guerras Secretas em si.',
    },
    done: { en: 'Ready for Secret Wars.', 'pt-BR': 'Pronto para Guerras Secretas.' },
    stops: [
      { id: 'loki-s1', weight: 'essential', why: { en: 'Introduces the TVA and the Sacred Timeline.', 'pt-BR': 'Apresenta a AVT e a Linha do Tempo Sagrada.' } },
      { id: 'no-way-home', weight: 'optional', why: { en: 'Visitors from other universes reach Peter Parker.', 'pt-BR': 'Visitantes de outros universos chegam até Peter Parker.' } },
      { id: 'multiverse-madness', weight: 'essential', why: { en: 'Incursions: when universes collide.', 'pt-BR': 'Incursões: quando universos colidem.' } },
      { id: 'loki-s2', weight: 'essential', why: { en: 'The TVA tries to hold the timelines together.', 'pt-BR': 'A AVT tenta manter as linhas do tempo unidas.' } },
      { id: 'deadpool-3', weight: 'optional', why: { en: 'The TVA, and the edge of the multiverse.', 'pt-BR': 'A AVT, e a beira do multiverso.' } },
      { id: 'fantastic-four', weight: 'essential', why: { en: 'Meet the Fantastic Four, on their own Earth.', 'pt-BR': 'Conheça o Quarteto Fantástico, na sua própria Terra.' } },
      { id: 'doomsday', weight: 'essential', why: { en: 'The first half of the finale.', 'pt-BR': 'A primeira metade do final.' } },
    ],
  },
];

// Drafts (Guides 4/4) show only where Andre reviews them: on localhost, on
// Vercel previews (*.vercel.app), or when a QA check asks
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
window.GUIDES = ALL_GUIDES
  .filter((g) => draftsShown || !g.draft)
  .map((g) => (draftsShown && g.draftGroup ? { ...g, group: g.draftGroup } : g));
