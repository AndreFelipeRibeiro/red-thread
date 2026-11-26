// MCU titles data — public factual info; posters are abstract original art
// Phases 1–6, films + series, including announced titles through 2027
// Title ids are permanent collection keys: never rename or reuse an id, even
// when a display title changes. Cloud/guest collections refer to TITLES[].id.
// release is a US first-release day (YYYY-MM-DD), or an announced month
// (YYYY-MM) when no day is confirmed. Month-only windows sort at that month,
// but do not count as released until replaced by a confirmed day.
// chronOrder is the in-universe order (1 = earliest), following the story
// timeframes below: years always move forward. Within a year it follows the
// official timeline's seasons; titles with no place in the Sacred Timeline (Loki,
// What If…?) keep their neighbours, and unreleased titles sit at the end.
// story is the in-universe timeframe shown to visitors (a year, range, or label
// such as 'Outside time'); storyNote adds context for alternate realities.
// Sourced from Marvel's 2023 official timeline book where it gives a year,
// otherwise the Wikipedia MCU timeline article (see docs/CATALOG-AUDIT.md).
// Omitted for unreleased titles.

import type { Title, Character, Edition } from '../types/catalog';

const TITLES: Title[] = [
  // Phase 1
  { id: 'iron-man', title: 'Iron Man', year: 2008, phase: 1, type: 'film', release: '2008-05-02', chronOrder: 5, story: '2008', accent: '#d4a05a', cast: ['tony', 'rhodey', 'pepper', 'happy'], credits: { rhodey: 'Terrence Howard' } },
  { id: 'incredible-hulk', title: 'The Incredible Hulk', year: 2008, phase: 1, type: 'film', release: '2008-06-13', chronOrder: 6, story: '2010', accent: '#5fa856', cast: ['ross', 'bruce', 'tony'], credits: { bruce: 'Edward Norton', ross: 'William Hurt' } },
  { id: 'iron-man-2', title: 'Iron Man 2', year: 2010, phase: 1, type: 'film', release: '2010-05-07', chronOrder: 7, story: '2010', accent: '#c25a3a', cast: ['tony', 'rhodey', 'pepper', 'natasha', 'fury', 'happy'] },
  { id: 'thor', title: 'Thor', year: 2011, phase: 1, type: 'film', release: '2011-05-06', chronOrder: 8, story: '2010', accent: '#7e9bd6', cast: ['jane', 'sif', 'odin', 'heimdall', 'thor', 'loki', 'clint'] },
  { id: 'cap-first-avenger', title: 'Captain America: The First Avenger', year: 2011, phase: 1, type: 'film', release: '2011-07-22', chronOrder: 2, story: '1943–1945', accent: '#4a6da3', cast: ['peggy', 'steve', 'bucky', 'fury'] },
  { id: 'avengers', title: 'The Avengers', year: 2012, phase: 1, type: 'film', release: '2012-05-04', chronOrder: 9, story: '2012', accent: '#a23a3a', cast: ['tony', 'steve', 'thor', 'bruce', 'natasha', 'clint', 'loki', 'fury', 'pepper', 'hill'] },

  // Phase 2
  { id: 'iron-man-3', title: 'Iron Man 3', year: 2013, phase: 2, type: 'film', release: '2013-05-03', chronOrder: 11, story: '2013–2014', accent: '#c25a3a', cast: ['trevor', 'tony', 'rhodey', 'pepper', 'happy'] },
  { id: 'thor-dark-world', title: 'Thor: The Dark World', year: 2013, phase: 2, type: 'film', release: '2013-11-08', chronOrder: 10, story: '2013', accent: '#5a4a8a', cast: ['jane', 'sif', 'odin', 'heimdall', 'thor', 'loki'] },
  { id: 'cap-winter-soldier', title: 'Captain America: The Winter Soldier', year: 2014, phase: 2, type: 'film', release: '2014-04-04', chronOrder: 12, story: '2014', accent: '#3a5a7a', cast: ['peggy', 'steve', 'bucky', 'natasha', 'fury', 'sam', 'hill'] },
  { id: 'gotg', title: 'Guardians of the Galaxy', year: 2014, phase: 2, type: 'film', release: '2014-08-01', chronOrder: 13, story: '2014', accent: '#7a4ea0', cast: ['quill', 'gamora', 'rocket', 'groot', 'drax', 'nebula', 'yondu'] },
  { id: 'aou', title: 'Avengers: Age of Ultron', year: 2015, phase: 2, type: 'film', release: '2015-05-01', chronOrder: 15, story: '2015', accent: '#a04040', cast: ['ultron', 'peggy', 'tony', 'steve', 'thor', 'bruce', 'natasha', 'clint', 'wanda', 'vision', 'rhodey', 'sam', 'fury', 'hill'] },
  { id: 'ant-man', title: 'Ant-Man', year: 2015, phase: 2, type: 'film', release: '2015-07-17', chronOrder: 16, story: '2015', accent: '#c25a3a', cast: ['hope', 'hank', 'peggy', 'scott', 'sam', 'cassie'], credits: { cassie: 'Abby Ryder Fortson' } },

  // Phase 3
  { id: 'civil-war', title: 'Captain America: Civil War', year: 2016, phase: 3, type: 'film', release: '2016-05-06', chronOrder: 17, story: '2016', accent: '#3a5a7a', cast: ['tchalla', 'steve', 'tony', 'bucky', 'natasha', 'sam', 'rhodey', 'wanda', 'vision', 'scott', 'peter', 'clint', 'ross'], credits: { ross: 'William Hurt' } },
  { id: 'doctor-strange', title: 'Doctor Strange', year: 2016, phase: 3, type: 'film', release: '2016-11-04', chronOrder: 22, story: '2016–2017', accent: '#a04040', cast: ['wong', 'strange'] },
  { id: 'gotg-2', title: 'Guardians of the Galaxy Vol. 2', year: 2017, phase: 3, type: 'film', release: '2017-05-05', chronOrder: 14, story: '2014', accent: '#c060a0', cast: ['quill', 'gamora', 'rocket', 'groot', 'drax', 'nebula', 'mantis', 'yondu'] },
  { id: 'homecoming', title: 'Spider-Man: Homecoming', year: 2017, phase: 3, type: 'film', release: '2017-07-07', chronOrder: 20, story: '2016', accent: '#a23a3a', cast: ['peter', 'tony', 'happy', 'pepper'] },
  { id: 'thor-ragnarok', title: 'Thor: Ragnarok', year: 2017, phase: 3, type: 'film', release: '2017-11-03', chronOrder: 23, story: '2017', accent: '#a05ca0', cast: ['valkyrie', 'heimdall', 'thor', 'loki', 'bruce', 'strange', 'odin'] },
  { id: 'black-panther', title: 'Black Panther', year: 2018, phase: 3, type: 'film', release: '2018-02-16', chronOrder: 19, story: '2016', accent: '#3a3a5a', cast: ['tchalla', 'shuri', 'okoye', 'mbaku', 'ramonda'] },
  { id: 'infinity-war', title: 'Avengers: Infinity War', year: 2018, phase: 3, type: 'film', release: '2018-04-27', chronOrder: 25, story: '2018', accent: '#7a4060', cast: ['wong', 'tchalla', 'shuri', 'okoye', 'quill', 'gamora', 'rocket', 'groot', 'drax', 'nebula', 'mantis', 'tony', 'steve', 'thor', 'bruce', 'natasha', 'wanda', 'vision', 'sam', 'rhodey', 'strange', 'peter', 'bucky', 'loki', 'pepper', 'mbaku', 'ross', 'heimdall'], credits: { ross: 'William Hurt' } },
  { id: 'ant-man-wasp', title: 'Ant-Man and the Wasp', year: 2018, phase: 3, type: 'film', release: '2018-07-06', chronOrder: 24, story: '2018', accent: '#c25a3a', cast: ['hope', 'hank', 'scott', 'ghost', 'cassie'], credits: { cassie: 'Abby Ryder Fortson' } },
  { id: 'captain-marvel', title: 'Captain Marvel', year: 2019, phase: 3, type: 'film', release: '2019-03-08', chronOrder: 4, story: '1995', accent: '#a06030', cast: ['carol', 'fury', 'talos', 'monica'] , credits: { monica: 'Akira Akbar' } },
  { id: 'endgame', title: 'Avengers: Endgame', year: 2019, phase: 3, type: 'film', release: '2019-04-26', chronOrder: 26, story: '2018–2023', storyNote: 'Opens in 2018, then jumps five years', accent: '#704040', cast: ['hope', 'tchalla', 'shuri', 'okoye', 'quill', 'gamora', 'rocket', 'groot', 'drax', 'nebula', 'mantis', 'valkyrie', 'peggy', 'tony', 'steve', 'thor', 'bruce', 'natasha', 'clint', 'rhodey', 'sam', 'wanda', 'scott', 'strange', 'peter', 'bucky', 'carol', 'pepper', 'loki', 'fury', 'happy', 'mbaku', 'wong', 'ross', 'hank', 'jane', 'hill', 'cassie'], credits: { cassie: 'Emma Fuhrmann', ross: 'William Hurt' } },
  { id: 'far-from-home', title: 'Spider-Man: Far From Home', year: 2019, phase: 3, type: 'film', release: '2019-07-02', chronOrder: 33, story: '2024', accent: '#3a6090', cast: ['peter', 'happy', 'fury', 'hill'] },

  // Phase 4
  { id: 'wandavision', title: 'WandaVision', year: 2021, phase: 4, type: 'series', release: '2021-01-15', chronOrder: 27, story: '2023', accent: '#a02020', cast: ['white-vision', 'agatha', 'billy', 'wanda', 'vision', 'monica'] },
  { id: 'falcon-winter', title: 'The Falcon and the Winter Soldier', year: 2021, phase: 4, type: 'series', release: '2021-03-19', chronOrder: 30, story: '2024', accent: '#a04040', cast: ['sam', 'bucky', 'rhodey', 'walker', 'torres'] },
  { id: 'loki-s1', title: 'Loki', year: 2021, phase: 4, type: 'series', release: '2021-06-09', chronOrder: 31, story: 'Outside time', storyNote: 'The TVA, outside the timeline', accent: '#3a7050', cast: ['he-who-remains', 'loki', 'mobius', 'sylvie'] },
  { id: 'black-widow', title: 'Black Widow', year: 2021, phase: 4, type: 'film', release: '2021-07-09', chronOrder: 18, story: '2016', accent: '#404050', cast: ['yelena', 'alexei', 'natasha', 'ross'], credits: { ross: 'William Hurt' } },
  { id: 'what-if', title: 'What If…?', year: 2021, phase: 4, type: 'series', release: '2021-08-11', chronOrder: 32, story: 'Multiverse', storyNote: 'Alternate realities', accent: '#a06030', cast: ['captain-carter', 'yondu', 'tony', 'steve', 'thor', 'natasha', 'bruce', 'clint', 'loki', 'fury', 'rhodey', 'happy', 'bucky', 'wanda', 'vision', 'peter', 'strange', 'scott', 'carol', 'quill', 'gamora', 'groot', 'drax', 'nebula', 'tchalla', 'shuri', 'wong', 'ross', 'hope', 'jane', 'ultron'], credits: { ross: 'Mike McGill' } },
  { id: 'shang-chi', title: 'Shang-Chi and the Legend of the Ten Rings', year: 2021, phase: 4, type: 'film', release: '2021-09-03', chronOrder: 29, story: '2024', accent: '#a04030', cast: ['shangchi', 'wong', 'trevor'] },
  { id: 'eternals', title: 'Eternals', year: 2021, phase: 4, type: 'film', release: '2021-11-05', chronOrder: 34, story: '2024', accent: '#a08030', cast: ['sersi', 'ikaris', 'thena', 'kingo', 'ajak', 'druig', 'makkari'] },
  { id: 'hawkeye', title: 'Hawkeye', year: 2021, phase: 4, type: 'series', release: '2021-11-24', chronOrder: 37, story: '2024', accent: '#a04030', cast: ['yelena', 'fisk', 'maya', 'clint'] },
  { id: 'no-way-home', title: 'Spider-Man: No Way Home', year: 2021, phase: 4, type: 'film', release: '2021-12-17', chronOrder: 35, story: '2024', accent: '#a02020', cast: ['peter-raimi', 'peter-webb', 'wong', 'peter', 'strange', 'happy', 'matt'] },
  { id: 'ms-marvel', title: 'Ms. Marvel', year: 2022, phase: 4, type: 'series', release: '2022-06-08', chronOrder: 43, story: '2025', accent: '#a04060', cast: ['kamala'] },
  { id: 'multiverse-madness', title: 'Doctor Strange in the Multiverse of Madness', year: 2022, phase: 4, type: 'film', release: '2022-05-06', chronOrder: 36, story: '2024', accent: '#603a80', cast: ['wong', 'captain-carter', 'strange', 'wanda', 'xavier'] },
  { id: 'thor-love', title: 'Thor: Love and Thunder', year: 2022, phase: 4, type: 'film', release: '2022-07-08', chronOrder: 44, story: '2025', accent: '#a04080', cast: ['jane', 'valkyrie', 'quill', 'thor', 'rocket', 'groot', 'drax', 'nebula', 'mantis'] },
  { id: 'moon-knight', title: 'Moon Knight', year: 2022, phase: 4, type: 'series', release: '2022-03-30', chronOrder: 40, story: '2025', accent: '#605030', cast: ['marc', 'layla', 'khonshu'] },
  { id: 'she-hulk', title: 'She-Hulk: Attorney at Law', year: 2022, phase: 4, type: 'series', release: '2022-08-18', chronOrder: 39, story: '2024–2025', accent: '#5fa856', cast: ['wong', 'bruce', 'matt'] },
  { id: 'wakanda-forever', title: 'Black Panther: Wakanda Forever', year: 2022, phase: 4, type: 'film', release: '2022-11-11', chronOrder: 41, story: '2025', accent: '#3a3a6a', cast: ['shuri', 'okoye', 'mbaku', 'ramonda', 'riri', 'namor'] },

  // Phase 5
  { id: 'quantumania', title: 'Ant-Man and the Wasp: Quantumania', year: 2023, phase: 5, type: 'film', release: '2023-02-17', chronOrder: 48, story: '2026', accent: '#5fa080', cast: ['hope', 'hank', 'kang', 'scott', 'cassie'] },
  { id: 'gotg-3', title: 'Guardians of the Galaxy Vol. 3', year: 2023, phase: 5, type: 'film', release: '2023-05-05', chronOrder: 49, story: '2026', accent: '#a06030', cast: ['quill', 'rocket', 'groot', 'drax', 'nebula', 'mantis', 'gamora'] },
  { id: 'secret-invasion', title: 'Secret Invasion', year: 2023, phase: 5, type: 'series', release: '2023-06-21', chronOrder: 50, story: 'c. 2026', accent: '#3a6050', cast: ['fury', 'rhodey', 'hill', 'talos'] },
  { id: 'loki-s2', title: 'Loki: Season 2', year: 2023, phase: 5, type: 'series', release: '2023-10-05', chronOrder: 51, story: 'Outside time', storyNote: 'The TVA, outside the timeline', accent: '#3a7050', cast: ['victor-timely', 'loki', 'mobius', 'sylvie'] },
  { id: 'marvels', title: 'The Marvels', year: 2023, phase: 5, type: 'film', release: '2023-11-10', chronOrder: 54, story: '2026', accent: '#a08030', cast: ['kamala', 'carol', 'fury', 'monica'] },
  { id: 'what-if-s2', title: 'What If…? Season 2', year: 2023, phase: 5, type: 'series', release: '2023-12-22', chronOrder: 52, story: 'Multiverse', storyNote: 'Alternate realities', accent: '#a06030', cast: ['captain-carter', 'yondu', 'happy', 'strange', 'scott', 'nebula', 'hope'] },
  { id: 'echo', title: 'Echo', year: 2024, phase: 5, type: 'series', release: '2024-01-09', chronOrder: 42, story: '2025', accent: '#a04040', cast: ['maya', 'fisk', 'matt'] },
  { id: 'deadpool-3', title: 'Deadpool & Wolverine', year: 2024, phase: 5, type: 'film', release: '2024-07-26', chronOrder: 38, story: '2024', storyNote: 'Mostly Earth-10005 and the Void', accent: '#a02030', cast: ['deadpool', 'wolverine', 'happy', 'gambit'] },
  { id: 'agatha', title: 'Agatha All Along', year: 2024, phase: 5, type: 'series', release: '2024-09-18', chronOrder: 55, story: '2026', accent: '#603a80', cast: ['agatha', 'billy'] },
  { id: 'what-if-s3', title: 'What If…? Season 3', year: 2024, phase: 5, type: 'series', release: '2024-12-22', chronOrder: 53, story: 'Multiverse', storyNote: 'Alternate realities', accent: '#a06030', cast: ['captain-carter', 'wong', 'alexei', 'shangchi', 'agatha', 'walker'] },
  { id: 'friendly-spidey', title: 'Your Friendly Neighborhood Spider-Man', year: 2025, phase: 5, type: 'series', release: '2025-01-29', chronOrder: 21, story: 'c. 2016', storyNote: 'Earth-86445, outside the Sacred Timeline', accent: '#a02020', cast: ['peter', 'tony', 'strange', 'ross', 'matt'], credits: { ross: 'Travis Willingham' } },
  { id: 'cap-brave', title: 'Captain America: Brave New World', year: 2025, phase: 5, type: 'film', release: '2025-02-14', chronOrder: 56, story: '2026–2027', accent: '#a04040', cast: ['ross', 'sam', 'bucky', 'torres'] },
  { id: 'daredevil-born-again', title: 'Daredevil: Born Again', year: 2025, phase: 5, type: 'series', release: '2025-03-04', chronOrder: 46, story: '2025–2027', accent: '#a02020', cast: ['matt', 'fisk', 'frank'] },
  { id: 'thunderbolts', title: 'Thunderbolts*', year: 2025, phase: 5, type: 'film', release: '2025-05-02', chronOrder: 57, story: '2027', accent: '#5a5a5a', cast: ['yelena', 'alexei', 'bucky', 'walker', 'ghost', 'bob'] },
  { id: 'ironheart', title: 'Ironheart', year: 2025, phase: 5, type: 'series', release: '2025-06-24', chronOrder: 45, story: '2025', accent: '#c25a3a', cast: ['riri'] },

  // Phase 6
  { id: 'fantastic-four', title: 'The Fantastic Four: First Steps', year: 2025, phase: 6, type: 'film', release: '2025-07-25', chronOrder: 3, story: '1964', storyNote: 'Earth-828, outside the Sacred Timeline', accent: '#3a6ab0', cast: ['reed', 'sue', 'johnny', 'ben', 'galactus', 'silver-surfer'] },
  { id: 'eyes-of-wakanda', title: 'Eyes of Wakanda', year: 2025, phase: 6, type: 'series', release: '2025-08-01', chronOrder: 1, story: '1260 BC–1896', storyNote: 'Four episodes in different past eras', accent: '#3a3a5a', cast: [] },
  { id: 'marvel-zombies', title: 'Marvel Zombies', year: 2025, phase: 6, type: 'series', release: '2025-09-24', chronOrder: 28, story: '2023', storyNote: 'Alternate reality from What If…?', accent: '#5a7a3a', cast: ['kamala', 'shangchi', 'alexei', 'wanda', 'thor', 'peter', 'scott', 'groot', 'hope', 'yelena', 'walker', 'namor', 'ghost'] },
  { id: 'wonder-man', title: 'Wonder Man', year: 2026, phase: 6, type: 'series', release: '2026-01-27', chronOrder: 47, story: '2025–2027', accent: '#c02a4a', cast: ['simon', 'trevor'] },
  { id: 'daredevil-born-again-s2', title: 'Daredevil: Born Again Season 2', year: 2026, phase: 6, type: 'series', release: '2026-03-24', chronOrder: 58, story: '2027', accent: '#a02020', cast: ['matt', 'fisk'] },
  { id: 'brand-new-day', title: 'Spider-Man: Brand New Day', year: 2026, phase: 6, type: 'film', release: '2026-07-31', chronOrder: 59, story: '2028', accent: '#a02020', cast: ['peter', 'bruce', 'yelena', 'frank'] },
  { id: 'visionquest', title: 'VisionQuest', year: 2026, phase: 6, type: 'series', release: '2026-10-13', chronOrder: 60, story: 'c. 2028', accent: '#9b3030', cast: ['ultron', 'white-vision', 'tommy', 'paladin'] },
  { id: 'friendly-spidey-s2', title: 'Your Friendly Neighborhood Spider-Man Season 2', year: 2027, phase: 6, type: 'series', release: '2027-01-13', chronOrder: 61, accent: '#a02020', cast: ['peter'] },
  { id: 'doomsday', title: 'Avengers: Doomsday', year: 2026, phase: 6, type: 'film', release: '2026-12-18', chronOrder: 62, accent: '#704040', cast: ['shangchi', 'mbaku', 'reed', 'sue', 'johnny', 'ben', 'doom', 'peggy', 'thor', 'loki', 'sam', 'scott', 'bucky', 'steve', 'yelena', 'alexei', 'shuri', 'walker', 'torres', 'namor', 'ghost', 'cassie', 'bob', 'xavier', 'magneto', 'beast', 'nightcrawler', 'mystique', 'cyclops', 'gambit'] },
  { id: 'daredevil-born-again-s3', title: 'Daredevil: Born Again Season 3', year: 2027, phase: 6, type: 'series', release: '2027-03', chronOrder: 63, accent: '#a02020', cast: ['matt', 'fisk'] },
  { id: 'secret-wars', title: 'Avengers: Secret Wars', year: 2027, phase: 6, type: 'film', release: '2027-12-17', chronOrder: 64, accent: '#6a3a5a', cast: ['doom', 'steve', 'shangchi', 'shuri'] },
];

// Characters with unique connection-line colors
const CHARACTERS: Record<string, Character> = {
  tony:      { name: 'Tony Stark',       actor: 'Robert Downey Jr.',  color: '#e84a3a', initials: 'TS' },
  steve:     { name: 'Steve Rogers',     actor: 'Chris Evans',         color: '#4a8de8', initials: 'SR' },
  thor:      { name: 'Thor',             actor: 'Chris Hemsworth',     color: '#e8c14a', initials: 'TH' },
  bruce:     { name: 'Bruce Banner',     actor: 'Mark Ruffalo',        color: '#5fa856', initials: 'BB' },
  natasha:   { name: 'Natasha Romanoff', actor: 'Scarlett Johansson',  color: '#a04040', initials: 'NR' },
  clint:     { name: 'Clint Barton',     actor: 'Jeremy Renner',       color: '#9b6a3a', initials: 'CB' },
  loki:      { name: 'Loki',             actor: 'Tom Hiddleston',      color: '#3aa07a', initials: 'LK' },
  fury:      { name: 'Nick Fury',        actor: 'Samuel L. Jackson',   color: '#888894', initials: 'NF' },
  rhodey:    { name: 'James Rhodes',     actor: 'Don Cheadle',         color: '#6a7ab0', initials: 'JR' },
  pepper:    { name: 'Pepper Potts',     actor: 'Gwyneth Paltrow',     color: '#e89a4a', initials: 'PP' },
  bucky:     { name: 'Bucky Barnes',     actor: 'Sebastian Stan',      color: '#5070a8', initials: 'BB' },
  peggy:     { name: 'Peggy Carter',     actor: 'Hayley Atwell',       color: '#c84a6a', initials: 'PC' },
  sam:       { name: 'Sam Wilson',       actor: 'Anthony Mackie',      color: '#d04040', initials: 'SW' },
  wanda:     { name: 'Wanda Maximoff',   actor: 'Elizabeth Olsen',     color: '#c8304a', initials: 'WM' },
  vision:    { name: 'Vision',           actor: 'Paul Bettany',        color: '#9b3030', initials: 'VS' },
  scott:     { name: 'Scott Lang',       actor: 'Paul Rudd',           color: '#c8704a', initials: 'SL' },
  hope:      { name: 'Hope Van Dyne',    actor: 'Evangeline Lilly',    color: '#a05f3a', initials: 'HV' },
  hank:      { name: 'Hank Pym',         actor: 'Michael Douglas',     color: '#7a6a5a', initials: 'HP' },
  peter:     { name: 'Peter Parker',     actor: 'Tom Holland',         color: '#e8344a', initials: 'PP' },
  tchalla:   { name: "T'Challa",         actor: 'Chadwick Boseman',    color: '#3a3aa0', initials: 'TC' },
  shuri:     { name: 'Shuri',            actor: 'Letitia Wright',      color: '#5a5ab0', initials: 'SH' },
  okoye:     { name: 'Okoye',            actor: 'Danai Gurira',        color: '#a07050', initials: 'OK' },
  mbaku:     { name: "M'Baku",           actor: 'Winston Duke',        color: '#7a5030', initials: 'MB' },
  ramonda:   { name: 'Ramonda',          actor: 'Angela Bassett',      color: '#9a6080', initials: 'RM' },
  strange:   { name: 'Stephen Strange',  actor: 'Benedict Cumberbatch',color: '#c83a8a', initials: 'DS' },
  wong:      { name: 'Wong',             actor: 'Benedict Wong',       color: '#a05030', initials: 'WG' },
  quill:     { name: 'Peter Quill',      actor: 'Chris Pratt',         color: '#a060d0', initials: 'PQ' },
  gamora:    { name: 'Gamora',           actor: 'Zoe Saldana',         color: '#8ec96a', initials: 'GM' },
  rocket:    { name: 'Rocket',           actor: 'Bradley Cooper',      color: '#b5854a', initials: 'RK' },
  groot:     { name: 'Groot',            actor: 'Vin Diesel',          color: '#7a8a40', initials: 'GR' },
  drax:      { name: 'Drax',             actor: 'Dave Bautista',       color: '#7a9aa0', initials: 'DX' },
  nebula:    { name: 'Nebula',           actor: 'Karen Gillan',        color: '#5050a0', initials: 'NB' },
  mantis:    { name: 'Mantis',           actor: 'Pom Klementieff',     color: '#5fa080', initials: 'MT' },
  yondu:     { name: 'Yondu',            actor: 'Michael Rooker',      color: '#3a90a0', initials: 'YD' },
  carol:     { name: 'Carol Danvers',    actor: 'Brie Larson',         color: '#e88a4a', initials: 'CD' },
  jane:      { name: 'Jane Foster',      actor: 'Natalie Portman',     color: '#c890d0', initials: 'JF' },
  sif:       { name: 'Sif',              actor: 'Jaimie Alexander',    color: '#7a90b0', initials: 'SF' },
  odin:      { name: 'Odin',             actor: 'Anthony Hopkins',     color: '#a09060', initials: 'OD' },
  heimdall:  { name: 'Heimdall',         actor: 'Idris Elba',          color: '#a07a3a', initials: 'HD' },
  valkyrie:  { name: 'Valkyrie',         actor: 'Tessa Thompson',      color: '#5070b0', initials: 'VK' },
  ross:      { name: 'Thaddeus Ross',    actor: 'Harrison Ford',       color: '#807060', initials: 'TR' },
  happy:     { name: 'Happy Hogan',      actor: 'Jon Favreau',         color: '#a06a4a', initials: 'HH' },
  matt:      { name: 'Matt Murdock',     actor: 'Charlie Cox',         color: '#b02a2a', initials: 'MM' },
  fisk:      { name: 'Wilson Fisk',      actor: "Vincent D'Onofrio",   color: '#c8c8d4', initials: 'WF' },
  riri:      { name: 'Riri Williams',    actor: 'Dominique Thorne',    color: '#d0603a', initials: 'RW' },
  simon:     { name: 'Simon Williams',   actor: 'Yahya Abdul-Mateen II', color: '#c02a4a', initials: 'SW' },
  trevor:    { name: 'Trevor Slattery',  actor: 'Ben Kingsley',        color: '#c8a040', initials: 'TS' },
  shangchi:  { name: 'Shang-Chi',        actor: 'Simu Liu',            color: '#c85a30', initials: 'SC' },
  kamala:    { name: 'Kamala Khan',      actor: 'Iman Vellani',        color: '#4aa0c8', initials: 'KK' },
  yelena:    { name: 'Yelena Belova',    actor: 'Florence Pugh',       color: '#7ab0d0', initials: 'YB' },
  alexei:    { name: 'Alexei Shostakov', actor: 'David Harbour',       color: '#8a3a5a', initials: 'AS' },
  ultron:    { name: 'Ultron',           actor: 'James Spader',        color: '#7a6ab0', initials: 'UL' },
  hill:      { name: 'Maria Hill',       actor: 'Cobie Smulders',      color: '#5b7a95', initials: 'MH' },
  talos:     { name: 'Talos',            actor: 'Ben Mendelsohn',      color: '#6a9e4a', initials: 'TA' },
  monica:    { name: 'Monica Rambeau',   actor: 'Teyonah Parris',      color: '#38b2a3', initials: 'MR' },
  mobius:    { name: 'Mobius M. Mobius', actor: 'Owen Wilson',          color: '#bf8f55', initials: 'MO' },

  frank:     { name: 'Frank Castle',      actor: 'Jon Bernthal',        color: '#b4b7bc', initials: 'FC' },
  tommy:     { name: 'Tommy Shepherd',    actor: 'Ruaridh Mollica',     color: '#54b6a0', initials: 'TS' },
  paladin:   { name: 'Paladin',           actor: 'Todd Stashwick',     color: '#557d87', initials: 'PA' },
  'silver-surfer': { name: 'Shalla-Bal / Silver Surfer', actor: 'Julia Garner', color: '#a6bbd2', initials: 'SS' },

  // — Variant identities —
  // `prime` points at the through-line identity. Variants keep their own name and
  // colour, but connection threading chains on the prime so the arc stays continuous.
  kang:            { name: 'Kang the Conqueror', actor: 'Jonathan Majors', color: '#3f9fa8', initials: 'KC' },
  'he-who-remains':{ name: 'He Who Remains',     actor: 'Jonathan Majors', color: '#6fd0c0', initials: 'HW', prime: 'kang' },
  'victor-timely': { name: 'Victor Timely',      actor: 'Jonathan Majors', color: '#2f7f8f', initials: 'VT', prime: 'kang' },
  'sylvie':        { name: 'Sylvie',            actor: 'Sophia Di Martino', color: '#4f9a6a', initials: 'SY', prime: 'loki' },
  'captain-carter':{ name: 'Captain Carter',     actor: 'Hayley Atwell',   color: '#e0607f', initials: 'CC', prime: 'peggy' },
  'white-vision':  { name: 'White Vision',       actor: 'Paul Bettany',    color: '#d8dce8', initials: 'WV', prime: 'vision' },
  'peter-raimi':   { name: 'Peter Parker (Raimi)', actor: 'Tobey Maguire',   color: '#c04a6a', initials: 'P2', prime: 'peter' },
  'peter-webb':    { name: 'Peter Parker (Webb)',  actor: 'Andrew Garfield', color: '#d06a8a', initials: 'P3', prime: 'peter' },

  // — Backfill for previously castless titles —
  maya:      { name: 'Maya Lopez',       actor: 'Alaqua Cox',          color: '#a85a70', initials: 'ML' },
  agatha:    { name: 'Agatha Harkness',  actor: 'Kathryn Hahn',        color: '#7a3f9f', initials: 'AH' },
  billy:     { name: 'Billy Maximoff',   actor: 'Joe Locke',           color: '#5a6fd0', initials: 'BM' },
  deadpool:  { name: 'Wade Wilson',      actor: 'Ryan Reynolds',       color: '#d02a2a', initials: 'DP' },
  wolverine: { name: 'Logan',            actor: 'Hugh Jackman',        color: '#c8b028', initials: 'WL' },
  reed:      { name: 'Reed Richards',    actor: 'Pedro Pascal',        color: '#4a7fd0', initials: 'RR' },
  sue:       { name: 'Sue Storm',        actor: 'Vanessa Kirby',       color: '#6f9fe0', initials: 'SS' },
  johnny:    { name: 'Johnny Storm',     actor: 'Joseph Quinn',        color: '#e08a3a', initials: 'JS' },
  ben:       { name: 'Ben Grimm',        actor: 'Ebon Moss-Bachrach',  color: '#b07a4a', initials: 'BG' },
  galactus:  { name: 'Galactus',         actor: 'Ralph Ineson',        color: '#8a5fd0', initials: 'GL' },
  doom:      { name: 'Victor von Doom',  actor: 'Robert Downey Jr.',   color: '#4f8f5f', initials: 'VD' },
  marc:      { name: 'Marc Spector',     actor: 'Oscar Isaac',         color: '#9fa8c8', initials: 'MS' },
  layla:     { name: 'Layla El-Faouly',  actor: 'May Calamawy',        color: '#c89a5f', initials: 'LF' },
  khonshu:   { name: 'Khonshu',          actor: 'F. Murray Abraham',   color: '#8fa8b8', initials: 'KH' },
  sersi:     { name: 'Sersi',            actor: 'Gemma Chan',          color: '#c8a8d8', initials: 'SR' },
  ikaris:    { name: 'Ikaris',           actor: 'Richard Madden',      color: '#d0c060', initials: 'IK' },
  thena:     { name: 'Thena',            actor: 'Angelina Jolie',      color: '#c0d0a0', initials: 'TN' },
  kingo:     { name: 'Kingo',            actor: 'Kumail Nanjiani',     color: '#d07a5a', initials: 'KG' },
  ajak:      { name: 'Ajak',             actor: 'Salma Hayek',         color: '#a89060', initials: 'AJ' },
  druig:     { name: 'Druig',            actor: 'Barry Keoghan',       color: '#7a9a7a', initials: 'DR' },
  makkari:   { name: 'Makkari',          actor: 'Lauren Ridloff',      color: '#a0c0c8', initials: 'MK' },

  // — Avengers: Doomsday newcomers (Notion V4 Tasks, "Add the confirmed
  // Doomsday newcomers to the catalog"; sources in docs/CATALOG-AUDIT.md) —
  walker:    { name: 'John Walker',      actor: 'Wyatt Russell',       color: '#5a78c8', initials: 'JW' },
  torres:    { name: 'Joaquín Torres',   actor: 'Danny Ramirez',       color: '#5ab0d8', initials: 'JT' },
  namor:     { name: 'Namor',            actor: 'Tenoch Huerta Mejía', color: '#2f9f9a', initials: 'NM' },
  ghost:     { name: 'Ava Starr',        actor: 'Hannah John-Kamen',   color: '#9aa6b8', initials: 'AS' },
  cassie:    { name: 'Cassie Lang',      actor: 'Kathryn Newton',      color: '#d8906a', initials: 'CL' },
  bob:       { name: 'Bob Reynolds',     actor: 'Lewis Pullman',       color: '#e0c070', initials: 'BR' },
  xavier:    { name: 'Charles Xavier',   actor: 'Patrick Stewart',     color: '#8a90c0', initials: 'CX' },
  magneto:   { name: 'Erik Lehnsherr',   actor: 'Ian McKellen',        color: '#b04a6a', initials: 'EL' },
  beast:     { name: 'Hank McCoy',       actor: 'Kelsey Grammer',      color: '#4a62c0', initials: 'HM' },
  nightcrawler: { name: 'Kurt Wagner',   actor: 'Alan Cumming',        color: '#6a4aa8', initials: 'KW' },
  mystique:  { name: 'Raven Darkhölme',  actor: 'Rebecca Romijn',      color: '#3a8ab8', initials: 'RD' },
  cyclops:   { name: 'Scott Summers',    actor: 'James Marsden',       color: '#d0a030', initials: 'SS' },
  gambit:    { name: 'Remy LeBeau',      actor: 'Channing Tatum',      color: '#c04a8a', initials: 'RL' },
};

window.TITLES = TITLES;
window.CHARACTERS = CHARACTERS;

// Who actually played a character in a given production. A character keeps one
// identity — one colour, one portrait, one connection thread — while the
// performer can change between titles, so the credit lives on the title and the
// character's `actor` is only the default. Iron Man credits Terrence Howard as
// Rhodes; The Incredible Hulk credits Edward Norton and William Hurt.
window.MCU_credit = function (title: Title, charId: string) {
  if (title && title.credits && title.credits[charId]) return title.credits[charId];
  const c = CHARACTERS[charId];
  return c ? c.actor : '';
};

// Every performer credited for each character, with how many titles each one
// carries, ordered by that count. Built once and shared, because the banner,
// the phone pill and the search suggestions all have to agree on who a
// character's performers are — naming them differently in two places is the
// bug this replaced.
type CreditRow = { name: string; n: number };
let CREDIT_ROSTER: Record<string, CreditRow[]> | null = null;
window.MCU_creditRoster = function () {
  if (CREDIT_ROSTER) return CREDIT_ROSTER;
  const m: Record<string, CreditRow[]> = {};
  window.TITLES.forEach(t => t.cast.forEach(id => {
    if (!CHARACTERS[id]) return;
    const name = window.MCU_credit(t, id);
    const list = m[id] || (m[id] = []);
    const row = list.find(r => r.name === name);
    if (row) row.n += 1; else list.push({ name, n: 1 });
  }));
  Object.keys(m).forEach(id => m[id].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)));
  CREDIT_ROSTER = m;
  return m;
};

// Approximate production budgets in millions USD (publicly reported figures).
// Production totals only: a series is listed only when a figure for that
// series itself was reported (decision 2026-10-30). The generic "up to $25M
// per episode" once used for every series was removed, so those read "Not
// published". Sources and dates: docs/CATALOG-AUDIT.md.
const BUDGETS: Record<string, number> = {
  'brand-new-day': 225, // IMDb production estimate; USD millions, checked 2026-10-24.
  'iron-man': 140, 'incredible-hulk': 150, 'iron-man-2': 200, 'thor': 150,
  'cap-first-avenger': 140, 'avengers': 220,
  'iron-man-3': 200, 'thor-dark-world': 170, 'cap-winter-soldier': 170,
  'gotg': 195.9, 'aou': 365, 'ant-man': 130,
  'civil-war': 250, 'doctor-strange': 165, 'gotg-2': 200, 'homecoming': 175,
  'thor-ragnarok': 180, 'black-panther': 200, 'infinity-war': 316,
  'ant-man-wasp': 162, 'captain-marvel': 175, 'endgame': 356, 'far-from-home': 160,
  'black-widow': 200,
  'shang-chi': 200, 'eternals': 200,
  'no-way-home': 200, 'multiverse-madness': 200, 'thor-love': 250,
  'wakanda-forever': 250,
  'quantumania': 200, 'gotg-3': 250,
  'marvels': 274.8, 'deadpool-3': 200, 'cap-brave': 180,
  // Series with a reported total of their own (Forbes, from Disney's public UK
  // filings), checked 2026-10-30.
  'secret-invasion': 211.6, // final cost, six episodes
  'echo': 40, // five episodes
  // Reported production budgets (trade press), checked 2026-10-30; totals,
  // before marketing, not audited figures. Sources in docs/CATALOG-AUDIT.md.
  'thunderbolts': 180, // Variety, The Hollywood Reporter, The Numbers
  'fantastic-four': 200, // Variety (via The Numbers); some outlets estimate more
};
TITLES.forEach(t => { t.budget = BUDGETS[t.id] || null; });
window.BUDGETS = BUDGETS;

// IMDb weighted movie/whole-series ratings, checked 2026-10-24. Released
// seasons share the series score; these are NOT averages of episode scores.
// Brand New Day refreshed 2026-10-26 from indexed IMDb ratings-page evidence.
// Sources, scopes and evidence limits: docs/CATALOG-AUDIT.md / CATALOG-SOURCES.json.
const IMDB_RATINGS: Record<string, number> = {
  'iron-man': 7.9, 'incredible-hulk': 6.6, 'iron-man-2': 6.9, 'thor': 7.0,
  'cap-first-avenger': 6.9, 'avengers': 8.0, 'iron-man-3': 7.1, 'thor-dark-world': 6.7,
  'cap-winter-soldier': 7.7, 'gotg': 8.0, 'aou': 7.3, 'ant-man': 7.2,
  'civil-war': 7.8, 'doctor-strange': 7.5, 'gotg-2': 7.6, 'homecoming': 7.4,
  'thor-ragnarok': 7.9, 'black-panther': 7.3, 'infinity-war': 8.4, 'ant-man-wasp': 7.0,
  'captain-marvel': 6.7, 'endgame': 8.4, 'far-from-home': 7.3, 'wandavision': 7.9,
  'falcon-winter': 7.1, 'loki-s1': 8.2, 'black-widow': 6.6, 'what-if': 7.3,
  'shang-chi': 7.3, 'eternals': 6.2, 'hawkeye': 7.4, 'no-way-home': 8.1,
  'ms-marvel': 6.2, 'multiverse-madness': 6.8, 'thor-love': 6.1, 'moon-knight': 7.3,
  'she-hulk': 5.2, 'wakanda-forever': 6.6, 'quantumania': 6.0, 'gotg-3': 7.9,
  'secret-invasion': 5.8, 'loki-s2': 8.2, 'marvels': 5.4, 'what-if-s2': 7.3,
  'echo': 5.9, 'deadpool-3': 7.5, 'agatha': 7.2, 'what-if-s3': 7.3,
  'friendly-spidey': 7.5, 'cap-brave': 5.6, 'daredevil-born-again': 8.1, 'thunderbolts': 7.1,
  'ironheart': 4.5, 'fantastic-four': 6.8, 'eyes-of-wakanda': 6.2, 'marvel-zombies': 7.0,
  'wonder-man': 7.4, 'daredevil-born-again-s2': 8.1, 'brand-new-day': 7.9, 'visionquest': 8.0,
};

// Rotten Tomatoes Tomatometer (critics), %, checked 2026-10-24.
// TV entries use their specific season, not audience or series-average scores.
const RT_SCORES: Record<string, number> = {
  'iron-man': 94, 'incredible-hulk': 68, 'iron-man-2': 72, 'thor': 77,
  'cap-first-avenger': 80, 'avengers': 91, 'iron-man-3': 79, 'thor-dark-world': 67,
  'cap-winter-soldier': 90, 'gotg': 91, 'aou': 75, 'ant-man': 83,
  'civil-war': 90, 'doctor-strange': 89, 'gotg-2': 85, 'homecoming': 92,
  'thor-ragnarok': 93, 'black-panther': 96, 'infinity-war': 85, 'ant-man-wasp': 87,
  'captain-marvel': 79, 'endgame': 94, 'far-from-home': 91, 'wandavision': 92,
  'falcon-winter': 85, 'loki-s1': 92, 'black-widow': 79, 'what-if': 89,
  'shang-chi': 92, 'eternals': 48, 'hawkeye': 92, 'no-way-home': 93,
  'ms-marvel': 98, 'multiverse-madness': 73, 'thor-love': 64, 'moon-knight': 86,
  'she-hulk': 77, 'wakanda-forever': 84, 'quantumania': 46, 'gotg-3': 82,
  'secret-invasion': 53, 'loki-s2': 82, 'marvels': 63, 'what-if-s2': 88,
  'echo': 71, 'deadpool-3': 77, 'agatha': 84, 'what-if-s3': 80,
  'friendly-spidey': 97, 'cap-brave': 46, 'daredevil-born-again': 87, 'thunderbolts': 88,
  'ironheart': 76, 'fantastic-four': 86, 'eyes-of-wakanda': 92, 'marvel-zombies': 66,
  'wonder-man': 91, 'daredevil-born-again-s2': 87, 'brand-new-day': 90, 'visionquest': 90,
};
TITLES.forEach(t => { t.rt = RT_SCORES[t.id] != null ? RT_SCORES[t.id] : null; });
window.RT_SCORES = RT_SCORES;
TITLES.forEach(t => { t.imdb = IMDB_RATINGS[t.id] || null; });
window.IMDB_RATINGS = IMDB_RATINGS;

// Other cuts of a title (Notion "Avengers: Endgame Encore: add it as a cut of
// Endgame"). The Encore is the same film with about four minutes of new
// scenes that lead into Avengers: Doomsday and a new color grade: in theaters
// from 2026-09-25, on Disney+ since 2026-11-13 (Disney+ and press, 2026-11).
// Not a title of its own, so it never counts twice.
const EDITIONS: Record<string, Edition[]> = {
  endgame: [{
    id: 'encore', name: { en: 'Encore', 'pt-BR': 'Encore' },
    theatrical: '2026-09-25', streaming: '2026-11-13', service: 'Disney+', extraMinutes: 4,
    note: {
      en: 'About 4 minutes of new scenes that lead into Avengers: Doomsday, and a new color grade.',
      'pt-BR': 'Cerca de 4 minutos de cenas novas que levam a Vingadores: Doutor Destino, e uma nova correção de cor.',
    },
  }],
};
TITLES.forEach(t => { if (EDITIONS[t.id]) t.editions = EDITIONS[t.id]; });
// Runtimes (Notion "Time to finish"): minutes to watch each released title
// (a series: the season's aired episodes, summed, and how many). A dated TMDB
// snapshot that tools/refresh-runtimes.cjs rewrites between the markers; do
// not edit it by hand. It lives here rather than in a module of its own
// because data.ts also runs on its own in Node (the link previews and the QA
// checks' catalog loader), with no imports. Unreleased titles have none and
// stay out of every total.
// BEGIN RUNTIMES (checked 2026-11-17)
const RUNTIMES: Record<string, { min: number; eps?: number }> = {
 "iron-man": {
  "min": 126
 },
 "incredible-hulk": {
  "min": 114
 },
 "iron-man-2": {
  "min": 124
 },
 "thor": {
  "min": 115
 },
 "cap-first-avenger": {
  "min": 124
 },
 "avengers": {
  "min": 143
 },
 "iron-man-3": {
  "min": 130
 },
 "thor-dark-world": {
  "min": 112
 },
 "cap-winter-soldier": {
  "min": 136
 },
 "gotg": {
  "min": 121
 },
 "aou": {
  "min": 141
 },
 "ant-man": {
  "min": 117
 },
 "civil-war": {
  "min": 147
 },
 "doctor-strange": {
  "min": 115
 },
 "gotg-2": {
  "min": 137
 },
 "homecoming": {
  "min": 133
 },
 "thor-ragnarok": {
  "min": 131
 },
 "black-panther": {
  "min": 135
 },
 "infinity-war": {
  "min": 149
 },
 "ant-man-wasp": {
  "min": 119
 },
 "captain-marvel": {
  "min": 124
 },
 "endgame": {
  "min": 181
 },
 "far-from-home": {
  "min": 129
 },
 "wandavision": {
  "min": 363,
  "eps": 9
 },
 "falcon-winter": {
  "min": 330,
  "eps": 6
 },
 "loki-s1": {
  "min": 302,
  "eps": 6
 },
 "black-widow": {
  "min": 134
 },
 "what-if": {
  "min": 323,
  "eps": 9
 },
 "shang-chi": {
  "min": 132
 },
 "eternals": {
  "min": 156
 },
 "hawkeye": {
  "min": 297,
  "eps": 6
 },
 "no-way-home": {
  "min": 148
 },
 "ms-marvel": {
  "min": 289,
  "eps": 6
 },
 "multiverse-madness": {
  "min": 126
 },
 "thor-love": {
  "min": 119
 },
 "moon-knight": {
  "min": 302,
  "eps": 6
 },
 "she-hulk": {
  "min": 309,
  "eps": 9
 },
 "wakanda-forever": {
  "min": 162
 },
 "quantumania": {
  "min": 125
 },
 "gotg-3": {
  "min": 150
 },
 "secret-invasion": {
  "min": 262,
  "eps": 6
 },
 "loki-s2": {
  "min": 313,
  "eps": 6
 },
 "marvels": {
  "min": 105
 },
 "what-if-s2": {
  "min": 289,
  "eps": 9
 },
 "echo": {
  "min": 213,
  "eps": 5
 },
 "deadpool-3": {
  "min": 128
 },
 "agatha": {
  "min": 379,
  "eps": 9
 },
 "what-if-s3": {
  "min": 253,
  "eps": 8
 },
 "friendly-spidey": {
  "min": 317,
  "eps": 10
 },
 "cap-brave": {
  "min": 119
 },
 "daredevil-born-again": {
  "min": 455,
  "eps": 9
 },
 "thunderbolts": {
  "min": 127
 },
 "ironheart": {
  "min": 305,
  "eps": 6
 },
 "fantastic-four": {
  "min": 115
 },
 "eyes-of-wakanda": {
  "min": 125,
  "eps": 4
 },
 "marvel-zombies": {
  "min": 137,
  "eps": 4
 },
 "wonder-man": {
  "min": 267,
  "eps": 8
 },
 "daredevil-born-again-s2": {
  "min": 413,
  "eps": 8
 },
 "brand-new-day": {
  "min": 145
 },
 "visionquest": {
  "min": 451,
  "eps": 8
 }
};
// END RUNTIMES
TITLES.forEach(t => { const r = RUNTIMES[t.id]; if (r) { t.runtime = r.min; if (r.eps) t.episodes = r.eps; } });
