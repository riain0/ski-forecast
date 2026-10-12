import { useSyncExternalStore } from 'react';
import type { CustomSpot, ElevationBand, OverviewWindow, SnowMode } from '#shared/types';
import type { PassFilter } from './passes';

export type Units = 'us' | 'metric';
export type Theme = 'system' | 'light' | 'dark';
export type BoardSort = 'name' | OverviewWindow;

export interface Prefs {
  units: Units;
  snowMode: SnowMode;
  theme: Theme;
  band: ElevationBand;
  starred: string[];
  spots: CustomSpot[];
  boardRegion: string;
  /** Pass filter shared by the board and the map. */
  pass: PassFilter;
  boardSort: BoardSort;
  boardSortDesc: boolean;
  hourlyRange: number;
  mapWindow: OverviewWindow;
}

const KEY = 'upslope:prefs:v1';

const DEFAULTS: Prefs = {
  units: navigator.language === 'en-US' ? 'us' : 'metric',
  snowMode: 'auto',
  theme: 'system',
  band: 'mid',
  starred: [],
  spots: [],
  boardRegion: 'All',
  pass: 'all',
  boardSort: 'next72',
  boardSortDesc: true,
  hourlyRange: 72,
  mapWindow: 'next7d',
};

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

let state = load();
const listeners = new Set<() => void>();

export function setPrefs(patch: Partial<Prefs> | ((p: Prefs) => Partial<Prefs>)): void {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode or storage full: preferences just won't persist.
  }
  listeners.forEach(l => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const usePrefs = (): Prefs => useSyncExternalStore(subscribe, () => state);
export const getPrefs = (): Prefs => state;

export const toggleStar = (id: string) =>
  setPrefs(p => ({ starred: p.starred.includes(id) ? p.starred.filter(s => s !== id) : [...p.starred, id] }));
