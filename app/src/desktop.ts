import { invoke } from '@tauri-apps/api/core';
import type { RollRecord, SteamGame } from './data/mock';

export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

interface SettingsDto {
  maxPriceUsd: number | null;
  freeOnly: boolean;
  language: string;
}

interface RollDto {
  id: string;
  appId: number;
  name: string;
  priceUsd: number;
  cover: string;
  description: string;
  rolledAt: string;
}

interface SearchHit {
  appId: number;
  name: string;
  cover: string;
  priceCents: number | null;
  prePurchase: boolean;
}

interface SearchPage {
  totalCount: number;
  hits: SearchHit[];
}

interface AppDetails {
  appId: number;
  name: string;
  kind: string;
  comingSoon: boolean;
  isFree: boolean;
  priceUsd: number | null;
  cover: string;
  description: string;
}

export interface DesktopState {
  maxPriceUsd: number | null;
  freeOnly: boolean;
  language: 'ru' | 'en';
  history: RollRecord[];
}

function initials(name: string): string {
  const letters = name.replace(/[^A-Za-zА-Яа-я0-9]/g, '');
  return (letters.slice(0, 2) || '??').toUpperCase();
}

function toGame(details: { appId: number; name: string; priceUsd: number; cover: string; description: string }): SteamGame {
  return {
    appId: details.appId,
    name: details.name,
    priceUsd: details.priceUsd,
    initials: initials(details.name),
    color: '#1b2838',
    cover: details.cover,
    noteRu: details.description,
    noteEn: details.description,
  };
}

function toRoll(row: RollDto): RollRecord {
  const game = toGame({
    appId: row.appId,
    name: row.name,
    priceUsd: row.priceUsd,
    cover: row.cover,
    description: row.description,
  });
  return {
    id: row.id,
    appId: game.appId,
    name: game.name,
    priceUsd: game.priceUsd,
    cover: game.cover,
    initials: game.initials,
    color: game.color,
    noteRu: game.noteRu,
    noteEn: game.noteEn,
    rolledAt: row.rolledAt,
  };
}

export async function loadDesktop(): Promise<DesktopState> {
  const [settings, rows] = await Promise.all([
    invoke<SettingsDto>('settings_get'),
    invoke<RollDto[]>('history_list'),
  ]);
  return {
    maxPriceUsd: settings.maxPriceUsd,
    freeOnly: settings.freeOnly,
    language: settings.language === 'en' ? 'en' : 'ru',
    history: rows.map(toRoll),
  };
}

export async function saveSettings(patch: {
  maxPriceUsd?: number;
  freeOnly?: boolean;
  language?: 'ru' | 'en';
}): Promise<void> {
  await invoke('settings_set', { patch });
}

export async function removeHistory(id: string): Promise<void> {
  await invoke('history_delete', { id });
}

export async function wipeHistory(): Promise<void> {
  await invoke('history_clear');
}

export type DrawOutcome =
  | { kind: 'card'; roll: RollRecord; strip: SteamGame[]; winner: SteamGame }
  | { kind: 'empty' }
  | { kind: 'steam' };

/** Steam's search snaps `start` down to a multiple of this and returns one page. */
const PAGE = 25;
const DRAW_ATTEMPTS = 24;

function accepts(details: AppDetails, freeOnly: boolean, maxPriceUsd: number | null, seen: Set<number>): boolean {
  if (seen.has(details.appId)) return false;
  if (details.kind !== 'game' || details.comingSoon) return false;
  if (details.priceUsd == null) return false;
  if (freeOnly) return details.priceUsd === 0;
  if (maxPriceUsd == null) return false;
  return Math.round(details.priceUsd * 100) <= Math.round(maxPriceUsd * 100);
}

function hitPriceOk(hit: SearchHit, freeOnly: boolean, maxPriceUsd: number | null): boolean {
  if (hit.prePurchase || hit.priceCents == null) return false;
  if (freeOnly) return hit.priceCents === 0;
  if (maxPriceUsd == null) return false;
  return hit.priceCents <= Math.round(maxPriceUsd * 100);
}

function hitToGame(hit: SearchHit): SteamGame {
  return toGame({
    appId: hit.appId,
    name: hit.name,
    priceUsd: (hit.priceCents ?? 0) / 100,
    cover: hit.cover,
    description: '',
  });
}

async function searchPage(start: number, freeOnly: boolean, maxPriceUsd: number | null): Promise<SearchPage> {
  return invoke<SearchPage>('steam_search', {
    start,
    count: PAGE,
    freeOnly,
    maxPriceUsd: freeOnly ? null : maxPriceUsd,
  });
}

export async function previewStorefront(input: {
  freeOnly: boolean;
  maxPriceUsd: number | null;
}): Promise<SteamGame[]> {
  try {
    const page = await searchPage(0, input.freeOnly, input.maxPriceUsd);
    return page.hits.filter((hit) => hitPriceOk(hit, input.freeOnly, input.maxPriceUsd)).map(hitToGame);
  } catch {
    return [];
  }
}

export async function drawFromSteam(input: {
  freeOnly: boolean;
  maxPriceUsd: number | null;
  seen: Set<number>;
}): Promise<DrawOutcome> {
  let first: SearchPage;
  try {
    first = await searchPage(0, input.freeOnly, input.maxPriceUsd);
  } catch {
    return { kind: 'steam' };
  }
  if (first.totalCount === 0) return { kind: 'empty' };

  for (let attempt = 0; attempt < DRAW_ATTEMPTS; attempt += 1) {
    const index = Math.floor(Math.random() * first.totalCount);
    const start = index - (index % PAGE);
    const slot = index % PAGE;
    let page: SearchPage;
    let details: AppDetails | null;
    let hit: SearchHit | undefined;
    try {
      page = await searchPage(start, input.freeOnly, input.maxPriceUsd);
      hit = page.hits[slot];
      if (!hit || input.seen.has(hit.appId) || !hitPriceOk(hit, input.freeOnly, input.maxPriceUsd)) continue;
      details = await invoke<AppDetails | null>('steam_details', { appId: hit.appId });
    } catch {
      return { kind: 'steam' };
    }
    if (!details || !accepts(details, input.freeOnly, input.maxPriceUsd, input.seen)) continue;

    const priceUsd = details.priceUsd ?? 0;
    let saved: RollDto;
    try {
      saved = await invoke<RollDto>('history_add', {
        roll: {
          appId: details.appId,
          name: details.name,
          priceUsd,
          cover: details.cover || hit.cover,
          description: details.description,
        },
      });
    } catch (error) {
      const message = typeof error === 'string' ? error : error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes('unique')) continue;
      return { kind: 'steam' };
    }

    const winner = toGame({
      appId: details.appId,
      name: details.name,
      priceUsd,
      cover: saved.cover,
      description: details.description,
    });
    const pool = page.hits
      .filter((item) => hitPriceOk(item, input.freeOnly, input.maxPriceUsd) && !input.seen.has(item.appId))
      .map(hitToGame);
    if (!pool.some((game) => game.appId === winner.appId)) pool.unshift(winner);
    return { kind: 'card', roll: toRoll(saved), strip: pool, winner };
  }
  return { kind: 'empty' };
}
