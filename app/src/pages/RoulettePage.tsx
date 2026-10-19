import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { GameCover } from '../components/GameCover';
import { catalog, createRoll, type RollRecord, type SteamGame } from '../data/mock';
import { drawFromSteam, isDesktop, previewStorefront } from '../desktop';
import { drawFixedWinner, fixedPreview, isFixedWinner } from '../fixedDraw';
import {
  CARD_GAP,
  CARD_H,
  CARD_W,
  WIN_INDEX,
  buildStrip,
  cardOffset,
  eligibleGames,
  landOffset,
  parseUsd,
  pickGame,
} from '../draw';
import { formatPoolCount, t } from '../i18n';
import { useSession } from '../session';
import { primaryBtn } from '../ui';

const SPIN_MS = 2600;
const COVER_WAIT_MS = 900;

/** Decode strip covers before the transform starts, so WebView2 does not hitch on the first frames. */
function preloadCovers(urls: string[]): Promise<void> {
  const unique = [...new Set(urls.filter((url) => url.length > 0))];
  if (unique.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve();
    };
    let pending = unique.length;
    const one = () => {
      pending -= 1;
      if (pending <= 0) finish();
    };
    const timer = window.setTimeout(finish, COVER_WAIT_MS);
    for (const url of unique) {
      const img = new Image();
      let reported = false;
      const report = () => {
        if (reported) return;
        reported = true;
        if (typeof img.decode === 'function') {
          img.decode().then(one, one);
          return;
        }
        one();
      };
      img.onload = report;
      img.onerror = report;
      img.decoding = 'async';
      img.src = url;
      if (img.complete) report();
    }
  });
}

export function RoulettePage() {
  const navigate = useNavigate();
  const {
    lang,
    savedPrice,
    setSavedPrice,
    freeOnly,
    setFreeOnly,
    history,
    currentRoll,
    spinning,
    setSpinning,
    commitRoll,
    ready,
  } = useSession();

  const fixed = isFixedWinner();
  const resting = useMemo(() => [...catalog, ...catalog, ...catalog], []);
  const [priceInput, setPriceInput] = useState(() => String(savedPrice));
  const [fieldError, setFieldError] = useState(false);
  const [emptyCatalog, setEmptyCatalog] = useState(false);
  const [steamError, setSteamError] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'landed'>('idle');
  const [preview, setPreview] = useState<SteamGame[]>(() => (fixed ? fixedPreview() : []));
  const [poolCount, setPoolCount] = useState<number | null>(() => (fixed ? 1 : null));
  const [poolStatus, setPoolStatus] = useState<'loading' | 'ready' | 'error' | 'invalid'>(() =>
    fixed ? 'ready' : 'loading',
  );
  const [strip, setStrip] = useState<SteamGame[]>(() =>
    fixed ? fixedPreview() : isDesktop() ? [] : [...catalog, ...catalog, ...catalog],
  );
  const [offset, setOffset] = useState(() => cardOffset(3, 1100));
  const [animate, setAnimate] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  const doneRef = useRef(false);
  const backupRef = useRef<number | null>(null);
  const navRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (backupRef.current != null) window.clearTimeout(backupRef.current);
      if (navRef.current != null) window.clearTimeout(navRef.current);
    };
  }, []);

  useEffect(() => {
    if (fixed) {
      setPreview(fixedPreview());
      setPoolCount(1);
      setPoolStatus('ready');
      return;
    }
    if (!isDesktop() || !ready) return;
    const price = freeOnly ? null : parseUsd(priceInput);
    if (!freeOnly && price == null) {
      setPoolCount(null);
      setPoolStatus('invalid');
      return;
    }
    setPoolStatus('loading');
    let cancel = false;
    const timer = window.setTimeout(() => {
      void previewStorefront({ freeOnly, maxPriceUsd: price }).then((page) => {
        if (cancel) return;
        if (!page) {
          setPreview([]);
          setPoolCount(null);
          setPoolStatus('error');
          return;
        }
        setPreview(page.games);
        setPoolCount(page.totalCount);
        setPoolStatus('ready');
      });
    }, 350);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [fixed, ready, freeOnly, priceInput]);

  useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const alignIdle = () => {
      if (phaseRef.current !== 'idle') return;
      const width = node.clientWidth;
      if (width > 0) setOffset(cardOffset(3, width));
    };
    alignIdle();
    window.addEventListener('resize', alignIdle);
    return () => window.removeEventListener('resize', alignIdle);
  }, []);

  function setPhaseBoth(next: 'idle' | 'spinning' | 'landed') {
    phaseRef.current = next;
    setPhase(next);
  }

  function finishSpin() {
    if (doneRef.current) return;
    doneRef.current = true;
    if (backupRef.current != null) {
      window.clearTimeout(backupRef.current);
      backupRef.current = null;
    }
    setPhaseBoth('landed');
    navRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return;
      setSpinning(false);
      navigate('/result');
    }, 800);
  }

  async function startSpin(pool: SteamGame[], winner: SteamGame, existing?: RollRecord) {
    const next = buildStrip(pool, winner);
    commitRoll(existing ?? createRoll(winner));
    doneRef.current = false;
    setSpinning(true);
    await preloadCovers(next.map((game) => game.cover));
    if (!mountedRef.current) return;
    flushSync(() => {
      setStrip(next);
      setAnimate(false);
      setOffset(0);
      setPhaseBoth('spinning');
    });
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!mountedRef.current) return;
        const measured = viewportRef.current?.clientWidth ?? 0;
        const width = measured > 0 ? measured : 640;
        setAnimate(true);
        setOffset(landOffset(width));
        if (backupRef.current != null) window.clearTimeout(backupRef.current);
        backupRef.current = window.setTimeout(() => {
          if (phaseRef.current === 'spinning') finishSpin();
        }, SPIN_MS + 400);
      });
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (spinning || phaseRef.current === 'spinning' || !ready) return;

    if (fixed) {
      setFieldError(false);
      setEmptyCatalog(false);
      setSteamError(false);
      setSpinning(true);
      const outcome = await drawFixedWinner();
      if (!mountedRef.current) return;
      void startSpin(outcome.strip, outcome.winner, outcome.roll);
      return;
    }

    if (isDesktop()) {
      if (!freeOnly) {
        const price = parseUsd(priceInput);
        if (price == null) {
          setFieldError(true);
          setEmptyCatalog(false);
          return;
        }
        setFieldError(false);
        setSavedPrice(price);
      } else {
        setFieldError(false);
      }
      setEmptyCatalog(false);
      setSteamError(false);
      setSpinning(true);
      const outcome = await drawFromSteam({
        freeOnly,
        maxPriceUsd: freeOnly ? null : parseUsd(priceInput),
        seen: new Set(history.map((roll) => roll.appId)),
      });
      if (!mountedRef.current) return;
      if (outcome.kind === 'steam') {
        setSteamError(true);
        setSpinning(false);
        return;
      }
      if (outcome.kind === 'empty') {
        setEmptyCatalog(true);
        setSpinning(false);
        return;
      }
      void startSpin(outcome.strip, outcome.winner, outcome.roll);
      return;
    }

    let pool;
    if (freeOnly) {
      setFieldError(false);
      pool = eligibleGames(catalog, history, 0, true);
    } else {
      const price = parseUsd(priceInput);
      if (price == null) {
        setFieldError(true);
        setEmptyCatalog(false);
        return;
      }
      setFieldError(false);
      setSavedPrice(price);
      pool = eligibleGames(catalog, history, price, false);
    }

    if (pool.length === 0) {
      setEmptyCatalog(true);
      setSteamError(false);
      return;
    }
    setEmptyCatalog(false);
    setSteamError(false);
    const winner = pickGame(pool);
    if (!winner) {
      setEmptyCatalog(true);
      return;
    }
    void startSpin(pool, winner);
  }

  const prototypeCount = useMemo(() => {
    if (isDesktop()) return null;
    if (freeOnly) return eligibleGames(catalog, history, 0, true).length;
    const price = parseUsd(priceInput);
    if (price == null) return null;
    return eligibleGames(catalog, history, price, false).length;
  }, [freeOnly, history, priceInput]);

  const shown = phase === 'idle' ? (isDesktop() || fixed ? preview : resting) : strip;
  const visibleCount = fixed ? 1 : isDesktop() ? poolCount : prototypeCount;

  return (
    <div data-fixed-winner={fixed ? '665740' : undefined}>
      <h1 className="text-2xl font-semibold text-white">{t(lang, 'roulette')}</h1>
      <p className="mt-1 text-sm text-[#8f98a0]">{t(lang, fixed ? 'fixedLead' : 'rouletteLead')}</p>

      <form onSubmit={onSubmit} className="mt-5">
        <div className="flex flex-wrap items-end gap-3">
          {fixed ? null : (
          <label className="flex flex-col gap-1.5 text-sm text-[#c7d5e0]" htmlFor="max-price">
            {t(lang, 'maxPrice')}
            <input
              id="max-price"
              name="maxPrice"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              value={priceInput}
              disabled={spinning || freeOnly}
              aria-invalid={fieldError}
              aria-describedby={fieldError ? 'price-error' : undefined}
              onChange={(event) => {
                setPriceInput(event.target.value);
                setFieldError(false);
              }}
              className={`w-44 rounded border bg-[#0e1419] px-3 py-2 text-base text-white outline-none focus:border-[#66c0f4] disabled:cursor-not-allowed disabled:opacity-50 ${
                fieldError ? 'border-[#e06c75]' : 'border-[#2a475e]'
              }`}
            />
          </label>
          )}
          <button type="submit" className={primaryBtn} disabled={spinning || !ready}>
            {phase === 'landed' ? t(lang, 'landed') : spinning ? t(lang, 'spinning') : t(lang, 'draw')}
          </button>
        </div>
        {fixed ? null : (
        <label
          className={`mt-3 inline-flex items-center gap-2.5 text-sm text-[#c7d5e0] ${
            spinning ? 'cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <span className="relative inline-flex h-6 w-11 shrink-0">
            <input
              id="free-only"
              type="checkbox"
              role="switch"
              checked={freeOnly}
              disabled={spinning}
              onChange={(event) => {
                setFreeOnly(event.target.checked);
                setFieldError(false);
                setEmptyCatalog(false);
              }}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className="h-6 w-11 rounded-full bg-[#2a475e] transition-colors peer-checked:bg-[#5c7e10] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#66c0f4] peer-disabled:opacity-40"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5 peer-disabled:opacity-40"
            />
          </span>
          {t(lang, 'freeOnly')}
        </label>
        )}
        <p className="mt-3 text-sm text-[#c7d5e0]" aria-live="polite">
          {isDesktop() && poolStatus === 'loading' ? t(lang, 'poolCountLoading') : null}
          {isDesktop() && poolStatus === 'error' ? t(lang, 'poolCountError') : null}
          {visibleCount != null ? formatPoolCount(visibleCount, lang) : null}
        </p>
      </form>
      {fieldError ? (
        <p id="price-error" className="mt-2 text-sm text-[#ff8b8b]">
          {t(lang, 'priceError')}
        </p>
      ) : null}

      {emptyCatalog ? (
        <div role="status" className="mt-4 rounded border border-[#4c6b22] bg-[#1c2814] px-4 py-3">
          <p className="text-sm leading-relaxed text-[#d7e8b8]">
            {t(lang, freeOnly ? 'emptyFreeCatalog' : 'emptyCatalog')}
          </p>
          <Link to="/history" className="mt-2 inline-block text-sm text-[#66c0f4] underline">
            {t(lang, 'openHistory')}
          </Link>
        </div>
      ) : null}

      {steamError ? (
        <div role="alert" className="mt-4 rounded border border-[#a94442] bg-[#3a1d1d] px-4 py-3">
          <p className="text-sm text-[#ffb4b4]">{t(lang, 'steamError')}</p>
          <button
            type="button"
            onClick={() => setSteamError(false)}
            className="mt-3 rounded bg-[#c7d5e0] px-3 py-1.5 text-sm font-semibold text-[#1b2838] hover:bg-white"
          >
            {t(lang, 'retry')}
          </button>
        </div>
      ) : null}

      <div className="relative mt-6">
        <div className="pointer-events-none absolute top-0 left-1/2 z-30 -translate-x-1/2 -translate-y-px">
          <div className="h-0 w-0 border-x-8 border-t-8 border-x-transparent border-t-[#a4d007]" />
        </div>
        <div
          ref={viewportRef}
          className="relative h-[108px] overflow-hidden rounded-lg border border-[#2a475e] bg-[#0b1016]"
          style={{ transform: 'translateZ(0)' }}
        >
          <div
            data-marker
            className="pointer-events-none absolute top-1/2 left-1/2 z-20 h-[78px] w-[168px] -translate-x-1/2 -translate-y-1/2 rounded ring-2 ring-[#a4d007]"
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#0b1016] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#0b1016] to-transparent" />
          <div
            className="absolute top-0 left-0 flex h-full w-max items-center"
            style={{
              transform: `translate3d(${offset}px, 0, 0)`,
              transition: animate ? `transform ${SPIN_MS}ms cubic-bezier(0.07, 0.55, 0.05, 1)` : 'none',
              willChange: phase === 'spinning' ? 'transform' : 'auto',
            }}
            onTransitionEnd={(event) => {
              if (event.propertyName !== 'transform') return;
              if (event.target !== event.currentTarget) return;
              if (phaseRef.current !== 'spinning') return;
              finishSpin();
            }}
          >
            {shown.map((game, index) => (
              <div
                key={`${game.appId}-${index}`}
                className="shrink-0 overflow-hidden rounded"
                style={{ width: CARD_W, height: CARD_H, marginRight: CARD_GAP, contain: 'strict' }}
                data-name={game.name}
                data-landing={phase !== 'idle' && index === WIN_INDEX ? 'true' : undefined}
              >
                <GameCover game={game} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 min-h-5 text-center text-sm text-[#8f98a0]" aria-live="polite">
        {phase === 'idle' && isDesktop() && preview.length === 0 ? t(lang, 'loadingStore') : null}
        {phase === 'spinning' ? t(lang, 'spinning') : null}
        {phase === 'landed' && currentRoll ? (
          <>
            {t(lang, 'landed')}: <span translate="no">{currentRoll.name}</span>
          </>
        ) : null}
      </p>

      {isDesktop() || fixed ? null : (
      <div className="mt-2 flex items-center justify-between gap-3 rounded border border-dashed border-[#4f6b84] bg-[#121a24] px-3 py-2">
        <p className="text-xs text-[#8f98a0]">
          <span className="mr-2 rounded bg-[#2a475e] px-1.5 py-0.5 text-[10px] tracking-wide text-[#c7d5e0] uppercase">
            {t(lang, 'prototypeState')}
          </span>
          {t(lang, 'prototypeHint')}
        </p>
        <button
          type="button"
          disabled={spinning}
          onClick={() => {
            setSteamError(true);
            setEmptyCatalog(false);
            setFieldError(false);
          }}
          className="shrink-0 text-xs text-[#66c0f4] underline disabled:opacity-40"
        >
          {t(lang, 'showSteamError')}
        </button>
      </div>
      )}
    </div>
  );
}
