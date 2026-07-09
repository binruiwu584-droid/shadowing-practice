import type { Settings, Stats } from '../types';

const read = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = <T,>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const defaultSettings: Settings = {
  darkMode: false,
  language: 'en',
  defaultSpeed: 1,
  fontSize: 'md',
};

export const defaultStats: Stats = {
  streakDays: 0,
  todayPracticeCount: 0,
  totalRecordings: 0,
  totalPracticeSeconds: 0,
  lastPracticeDate: '',
};

export const storage = {
  getSettings: () => read('shadowing.settings', defaultSettings),
  setSettings: (settings: Settings) => write('shadowing.settings', settings),
  getFavorites: () => read<string[]>('shadowing.favorites', []),
  setFavorites: (favorites: string[]) => write('shadowing.favorites', favorites),
  getStats: () => read<Stats>('shadowing.stats', defaultStats),
  setStats: (stats: Stats) => write('shadowing.stats', stats),
};
