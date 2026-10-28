import type { RollRecord, SteamGame } from './data/mock';

export const CARD_W = 220;
export const CARD_H = 103;
export const CARD_GAP = 16;
export const CARD_STEP = CARD_W + CARD_GAP;
export const WIN_INDEX = 18;
/** Cover that is already in the marker when the spin begins. Far from the winner so the strip can travel. */
export const START_INDEX = 3;
export const STRIP_LENGTH = 28;

/** Comma and dot are both decimal separators. Empty, negative, and junk return null. */
export function parseUsd(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return value;
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

/**
 * Free games (priceUsd === 0) stay eligible whenever the ceiling covers them, including 0.
 * When freeOnly is set, the ceiling is ignored and only those free games remain.
 * History still excludes a game either way.
 */
export function eligibleGames(
  games: SteamGame[],
  history: RollRecord[],
  maxPrice: number,
  freeOnly = false,
): SteamGame[] {
  const seen = new Set(history.map((roll) => roll.appId));
  if (freeOnly) {
    return games.filter((game) => game.priceUsd === 0 && !seen.has(game.appId));
  }
  const ceiling = toCents(maxPrice);
  return games.filter((game) => toCents(game.priceUsd) <= ceiling && !seen.has(game.appId));
}

export function pickGame(pool: SteamGame[]): SteamGame | null {
  if (pool.length === 0) return null;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? null;
}

export function shuffleGames<T>(items: readonly T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = next[index]!;
    next[index] = next[swap]!;
    next[swap] = current;
  }
  return next;
}

/** Index of the cover that sits in the marker. Stays away from either end so neighbors stay visible. */
export function idleFocusIndex(length: number): number {
  if (length <= 1) return 0;
  const start = Math.min(2, length - 1);
  const end = Math.max(start, length - 3);
  return start + Math.floor(Math.random() * (end - start + 1));
}

export function buildStrip(pool: SteamGame[], winner: SteamGame, start?: SteamGame | null): SteamGame[] {
  if (pool.length === 0) return [];
  const strip: SteamGame[] = [];
  let previous: SteamGame | null = null;
  while (strip.length < STRIP_LENGTH) {
    for (const game of shuffleGames(pool)) {
      if (strip.length >= STRIP_LENGTH) break;
      if (previous && game.appId === previous.appId && pool.length > 1) continue;
      strip.push(game);
      previous = game;
    }
    if (pool.length === 1) {
      while (strip.length < STRIP_LENGTH) strip.push(pool[0]!);
      break;
    }
  }
  strip[WIN_INDEX] = winner;
  if (pool.length > 1) {
    const other = pool.find((game) => game.appId !== winner.appId) ?? winner;
    const before = strip[WIN_INDEX - 1];
    const after = strip[WIN_INDEX + 1];
    if (before && before.appId === winner.appId) strip[WIN_INDEX - 1] = other;
    if (after && after.appId === winner.appId) strip[WIN_INDEX + 1] = other;
  }
  if (start && START_INDEX < strip.length) {
    strip[START_INDEX] = start;
  }
  return strip;
}

export function cardOffset(index: number, viewportWidth: number): number {
  return -(index * CARD_STEP) + (viewportWidth - CARD_W) / 2;
}

export function landOffset(viewportWidth: number): number {
  return cardOffset(WIN_INDEX, viewportWidth);
}
