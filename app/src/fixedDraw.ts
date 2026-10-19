import { invoke } from '@tauri-apps/api/core';
import { createRoll, type RollRecord, type SteamGame } from './data/mock';
import { isDesktop, type DrawOutcome } from './desktop';

const FIXED_APP_ID = 665740;
const FIXED_NAME = 'Book Of Potentia 2';
const NOTE =
  "Book Of Potentia 2 is a dungeon crawler where you play as a sorceress on her journey to retrieve her stolen spell book. The best part is it's 100% free!";

const FILLERS: Array<{ appId: number; name: string; initials: string }> = [
  { appId: 570, name: 'Dota 2', initials: 'D2' },
  { appId: 730, name: 'Counter-Strike 2', initials: 'CS' },
  { appId: 2379780, name: 'Balatro', initials: 'BA' },
  { appId: 413150, name: 'Stardew Valley', initials: 'SV' },
  { appId: 367520, name: 'Hollow Knight', initials: 'HK' },
  { appId: 504230, name: 'Celeste', initials: 'CE' },
  { appId: 620, name: 'Portal 2', initials: 'P2' },
  { appId: 105600, name: 'Terraria', initials: 'TE' },
  { appId: 1145350, name: 'Hades II', initials: 'H2' },
];

/** True only in the separate build that always lands on Book Of Potentia 2. */
export function isFixedWinner(): boolean {
  return import.meta.env.VITE_FIXED_WINNER === String(FIXED_APP_ID);
}

function capsule(appId: number, name: string, initials: string): SteamGame {
  return {
    appId,
    name,
    priceUsd: 0,
    initials,
    color: '#1b2838',
    cover: `/fixed/c${appId}.jpg`,
    noteRu: '',
    noteEn: '',
  };
}

function resultCard(): SteamGame {
  return {
    appId: FIXED_APP_ID,
    name: FIXED_NAME,
    priceUsd: 0,
    initials: 'BP',
    color: '#1b2838',
    cover: '/fixed/header665740.jpg',
    noteRu: NOTE,
    noteEn: NOTE,
  };
}

function fallbackNeighbors(): SteamGame[] {
  return FILLERS.map((item) => capsule(item.appId, item.name, item.initials));
}

interface SavedRoll {
  id: string;
  appId: number;
  name: string;
  priceUsd: number;
  cover: string;
  description: string;
  rolledAt: string;
}

function rollFromSaved(saved: SavedRoll, card: SteamGame): RollRecord {
  return {
    id: saved.id,
    appId: saved.appId,
    name: saved.name,
    priceUsd: saved.priceUsd,
    cover: saved.cover || card.cover,
    initials: card.initials,
    color: card.color,
    noteRu: card.noteRu,
    noteEn: card.noteEn,
    rolledAt: saved.rolledAt,
  };
}

/**
 * The rest of the draw stays on the storefront strip. The card that stops in the marker is always Book Of Potentia 2.
 * A duplicate history row still shows the card.
 */
export async function drawFixedWinner(neighbors: SteamGame[] = []): Promise<Extract<DrawOutcome, { kind: 'card' }>> {
  const card = resultCard();
  const winner = capsule(FIXED_APP_ID, FIXED_NAME, 'BP');
  const strip = neighbors.some((game) => game.appId !== FIXED_APP_ID && game.cover)
    ? neighbors.filter((game) => game.appId !== FIXED_APP_ID)
    : fallbackNeighbors();
  if (isDesktop()) {
    try {
      const saved = await invoke<SavedRoll>('history_add', {
        roll: {
          appId: card.appId,
          name: card.name,
          priceUsd: card.priceUsd,
          cover: card.cover,
          description: NOTE,
        },
      });
      return { kind: 'card', roll: rollFromSaved(saved, card), strip, winner };
    } catch {
      /* UNIQUE or a write failure still lands on this game. */
    }
  }
  return { kind: 'card', roll: createRoll(card), strip, winner };
}
