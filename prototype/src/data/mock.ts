export interface SteamGame {
  appId: number;
  name: string;
  priceUsd: number;
  initials: string;
  color: string;
  cover: string;
  noteRu: string;
  noteEn: string;
}

export interface RollRecord {
  id: string;
  appId: number;
  name: string;
  priceUsd: number;
  cover: string;
  initials: string;
  color: string;
  noteRu: string;
  noteEn: string;
  rolledAt: string;
}

function coverUri(initials: string, color: string, accent: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="215" viewBox="0 0 460 215">
    <rect width="460" height="215" fill="${color}"/>
    <polygon points="0,215 190,0 280,0 40,215" fill="${accent}" opacity="0.35"/>
    <circle cx="390" cy="48" r="58" fill="${accent}" opacity="0.28"/>
    <rect x="0" y="168" width="460" height="47" fill="#000000" opacity="0.28"/>
    <text x="230" y="104" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="78" font-weight="700">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const seeds: Array<Omit<SteamGame, 'cover'> & { accent: string }> = [
  {
    appId: 1145350,
    name: 'Hades II',
    priceUsd: 29.99,
    initials: 'H2',
    color: '#6b2d3c',
    accent: '#e35d4a',
    noteRu: 'Ранний доступ: забеги по подземному миру.',
    noteEn: 'Early access runs through the underworld.',
  },
  {
    appId: 2379780,
    name: 'Balatro',
    priceUsd: 14.99,
    initials: 'BA',
    color: '#1f6b4a',
    accent: '#d6b25e',
    noteRu: 'Покерный рогалик про безумные комбинации.',
    noteEn: 'A poker roguelike about absurd hands.',
  },
  {
    appId: 413150,
    name: 'Stardew Valley',
    priceUsd: 14.99,
    initials: 'SV',
    color: '#6a8f2b',
    accent: '#f2d16b',
    noteRu: 'Ферма, шахта и небольшой городок.',
    noteEn: 'A farm, a mine, and a small town.',
  },
  {
    appId: 367520,
    name: 'Hollow Knight',
    priceUsd: 14.99,
    initials: 'HK',
    color: '#243044',
    accent: '#8ea0bf',
    noteRu: 'Метроидвания в забытом королевстве.',
    noteEn: 'A metroidvania in a forgotten kingdom.',
  },
  {
    appId: 504230,
    name: 'Celeste',
    priceUsd: 19.99,
    initials: 'CE',
    color: '#8d3a5a',
    accent: '#f0a0c0',
    noteRu: 'Трудное восхождение на гору.',
    noteEn: 'A hard climb up a mountain.',
  },
  {
    appId: 632470,
    name: 'Disco Elysium',
    priceUsd: 39.99,
    initials: 'DE',
    color: '#c47b2b',
    accent: '#f3e2b3',
    noteRu: 'Ролевая история в городе с похмелья.',
    noteEn: 'A role-playing story in a hungover city.',
  },
  {
    appId: 1794680,
    name: 'Vampire Survivors',
    priceUsd: 4.99,
    initials: 'VS',
    color: '#5a1830',
    accent: '#e23b4a',
    noteRu: 'Орды монстров и автоматическая атака.',
    noteEn: 'Monster hordes and automatic attacks.',
  },
  {
    appId: 620,
    name: 'Portal 2',
    priceUsd: 9.99,
    initials: 'P2',
    color: '#e36a1e',
    accent: '#f6d2b0',
    noteRu: 'Головоломки с порталами и гелем.',
    noteEn: 'Puzzles with portals and gel.',
  },
  {
    appId: 548430,
    name: 'Deep Rock Galactic',
    priceUsd: 29.99,
    initials: 'DR',
    color: '#8a5a22',
    accent: '#f0c36a',
    noteRu: 'Шахтёры и жуки в кооперативе.',
    noteEn: 'Miners and bugs, played in co-op.',
  },
  {
    appId: 730,
    name: 'Counter-Strike 2',
    priceUsd: 0,
    initials: 'CS',
    color: '#b08a2a',
    accent: '#efe3b0',
    noteRu: 'Тактический шутер, сейчас бесплатно.',
    noteEn: 'A tactical shooter, free to play.',
  },
];

export const catalog: SteamGame[] = seeds.map(({ accent, ...seed }) => ({
  ...seed,
  cover: coverUri(seed.initials, seed.color, accent),
}));

export function steamUrl(appId: number): string {
  return `https://store.steampowered.com/app/${appId}`;
}

export function snapshotRoll(game: SteamGame, id: string, rolledAt: string): RollRecord {
  return {
    id,
    appId: game.appId,
    name: game.name,
    priceUsd: game.priceUsd,
    cover: game.cover,
    initials: game.initials,
    color: game.color,
    noteRu: game.noteRu,
    noteEn: game.noteEn,
    rolledAt,
  };
}

export function createRoll(game: SteamGame): RollRecord {
  return snapshotRoll(game, `roll-${crypto.randomUUID()}`, new Date().toISOString());
}

function gameById(appId: number): SteamGame {
  const game = catalog.find((item) => item.appId === appId);
  if (!game) {
    throw new Error(`Unknown app ${appId}`);
  }
  return game;
}

/** Three past draws, newest first. These games stay out of the next roll. */
export const seedHistory: RollRecord[] = [
  snapshotRoll(gameById(620), 'seed-portal-2', '2026-10-17T21:14:00.000Z'),
  snapshotRoll(gameById(504230), 'seed-celeste', '2026-10-16T19:02:00.000Z'),
  snapshotRoll(gameById(548430), 'seed-drg', '2026-10-12T11:40:00.000Z'),
];
