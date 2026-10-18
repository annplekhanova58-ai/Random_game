import type { RollRecord, SteamGame } from './data/mock';

export const CARD_W = 168;
export const CARD_H = 78;
export const CARD_GAP = 12;
export const CARD_STEP = CARD_W + CARD_GAP;
export const WIN_INDEX = 18;
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
 * A ceiling of exactly 0 is the review control for the empty catalog.
 * The free game stays in the mock and can be drawn at any higher ceiling.
 */
export function eligibleGames(games: SteamGame[], history: RollRecord[], maxPrice: number): SteamGame[] {
  if (toCents(maxPrice) === 0) return [];
  const seen = new Set(history.map((roll) => roll.appId));
  const ceiling = toCents(maxPrice);
  return games.filter((game) => toCents(game.priceUsd) <= ceiling && !seen.has(game.appId));
}

export function pickGame(pool: SteamGame[]): SteamGame | null {
  if (pool.length === 0) return null;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? null;
}

export function buildStrip(pool: SteamGame[], winner: SteamGame): SteamGame[] {
  if (pool.length === 0) return [];
  const strip: SteamGame[] = [];
  for (let index = 0; index < STRIP_LENGTH; index += 1) {
    strip.push(pool[index % pool.length]!);
  }
  strip[WIN_INDEX] = winner;
  if (pool.length > 1) {
    const other = pool.find((game) => game.appId !== winner.appId) ?? winner;
    const before = strip[WIN_INDEX - 1];
    const after = strip[WIN_INDEX + 1];
    if (before && before.appId === winner.appId) strip[WIN_INDEX - 1] = other;
    if (after && after.appId === winner.appId) strip[WIN_INDEX + 1] = other;
  }
  return strip;
}

export function cardOffset(index: number, viewportWidth: number): number {
  return -(index * CARD_STEP) + (viewportWidth - CARD_W) / 2;
}

export function landOffset(viewportWidth: number): number {
  return cardOffset(WIN_INDEX, viewportWidth);
}
