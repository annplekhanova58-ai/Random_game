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

function accepts(details: AppDetails, freeOnly: boolean, maxPriceUsd: number | null, seen: Set<number>): boolean {
  if (seen.has(details.appId)) return false;
  if (details.kind !== 'game' || details.comingSoon) return false;
  if (details.priceUsd == null) return false;
  if (freeOnly) return details.priceUsd === 0;
  if (maxPriceUsd == null) return false;
  return Math.round(details.priceUsd * 100) <= Math.round(maxPriceUsd * 100);
}

export async function drawFromSteam(input: {
  freeOnly: boolean;
  maxPriceUsd: number | null;
  seen: Set<number>;
}): Promise<DrawOutcome> {
  let first: SearchPage;
  try {
    first = await invoke<SearchPage>('steam_search', {
      start: 0,
      count: 1,
      freeOnly: input.freeOnly,
      maxPriceUsd: input.freeOnly ? null : input.maxPriceUsd,
    });
  } catch {
    return { kind: 'steam' };
  }
  if (first.totalCount === 0) return { kind: 'empty' };

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const start = Math.floor(Math.random() * first.totalCount);
    let page: SearchPage;
    let details: AppDetails | null;
    try {
      page = await invoke<SearchPage>('steam_search', {
        start,
        count: 1,
        freeOnly: input.freeOnly,
        maxPriceUsd: input.freeOnly ? null : input.maxPriceUsd,
      });
      const hit = page.hits[0];
      if (!hit || input.seen.has(hit.appId)) continue;
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
          cover: details.cover || page.hits[0]?.cover || '',
          description: details.description,
        },
      });
    } catch {
      return { kind: 'steam' };
    }

    const winner = toGame({
      appId: details.appId,
      name: details.name,
      priceUsd,
      cover: saved.cover,
      description: details.description,
    });
    const strip = page.hits.length > 0 ? [winner] : [winner];
    return { kind: 'card', roll: toRoll(saved), strip, winner };
  }
  return { kind: 'empty' };
}
