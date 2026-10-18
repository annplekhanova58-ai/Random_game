import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { seedHistory, type RollRecord } from './data/mock';
import { t, type Lang } from './i18n';

const LANG_KEY = 'rsg-lang';
const PRICE_KEY = 'rsg-max-price';
const FREE_ONLY_KEY = 'rsg-free-only';

function readLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === 'ru' || stored === 'en') return stored;
  } catch {
    /* storage unavailable */
  }
  return 'ru';
}

function readPrice(): number {
  try {
    const stored = localStorage.getItem(PRICE_KEY);
    if (stored == null || stored === '') return 20;
    const value = Number(stored);
    if (Number.isFinite(value) && value >= 0) return value;
  } catch {
    /* storage unavailable */
  }
  return 20;
}

function readFreeOnly(): boolean {
  try {
    return localStorage.getItem(FREE_ONLY_KEY) === '1';
  } catch {
    /* storage unavailable */
  }
  return false;
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

interface SessionValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  savedPrice: number;
  setSavedPrice: (price: number) => void;
  freeOnly: boolean;
  setFreeOnly: (freeOnly: boolean) => void;
  history: RollRecord[];
  currentRoll: RollRecord | null;
  spinning: boolean;
  setSpinning: (spinning: boolean) => void;
  commitRoll: (roll: RollRecord) => void;
  deleteRoll: (id: string) => void;
  clearHistory: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);
  const [savedPrice, setSavedPriceState] = useState<number>(readPrice);
  const [freeOnly, setFreeOnlyState] = useState<boolean>(readFreeOnly);
  const [history, setHistory] = useState<RollRecord[]>(seedHistory);
  const [currentRoll, setCurrentRoll] = useState<RollRecord | null>(null);
  const [spinning, setSpinning] = useState(false);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    writeStorage(LANG_KEY, next);
  }, []);

  const setSavedPrice = useCallback((price: number) => {
    setSavedPriceState(price);
    writeStorage(PRICE_KEY, String(price));
  }, []);

  const setFreeOnly = useCallback((next: boolean) => {
    setFreeOnlyState(next);
    writeStorage(FREE_ONLY_KEY, next ? '1' : '0');
  }, []);

  const commitRoll = useCallback((roll: RollRecord) => {
    setHistory((prev) => [roll, ...prev.filter((item) => item.appId !== roll.appId)]);
    setCurrentRoll(roll);
  }, []);

  const deleteRoll = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t(lang, 'productName');
  }, [lang]);

  const value = useMemo<SessionValue>(
    () => ({
      lang,
      setLang,
      savedPrice,
      setSavedPrice,
      freeOnly,
      setFreeOnly,
      history,
      currentRoll,
      spinning,
      setSpinning,
      commitRoll,
      deleteRoll,
      clearHistory,
    }),
    [
      lang,
      setLang,
      savedPrice,
      setSavedPrice,
      freeOnly,
      setFreeOnly,
      history,
      currentRoll,
      spinning,
      commitRoll,
      deleteRoll,
      clearHistory,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return value;
}
