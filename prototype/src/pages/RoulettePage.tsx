import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GameCover } from '../components/GameCover';
import { catalog, createRoll, type SteamGame } from '../data/mock';
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
import { t } from '../i18n';
import { useSession } from '../session';
import { primaryBtn } from '../ui';

const SPIN_MS = 2600;

export function RoulettePage() {
  const navigate = useNavigate();
  const { lang, savedPrice, setSavedPrice, history, currentRoll, spinning, setSpinning, commitRoll } =
    useSession();

  const resting = useMemo(() => [...catalog, ...catalog, ...catalog], []);
  const [priceInput, setPriceInput] = useState(() => String(savedPrice));
  const [fieldError, setFieldError] = useState(false);
  const [emptyCatalog, setEmptyCatalog] = useState(false);
  const [steamError, setSteamError] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'landed'>('idle');
  const [strip, setStrip] = useState<SteamGame[]>(resting);
  const [offset, setOffset] = useState(() => cardOffset(3, 1100));
  const [animate, setAnimate] = useState(false);
  const [spinId, setSpinId] = useState(0);

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

  function startSpin(pool: SteamGame[], winner: SteamGame) {
    commitRoll(createRoll(winner));
    doneRef.current = false;
    setStrip(buildStrip(pool, winner));
    setAnimate(false);
    setOffset(0);
    setSpinId((value) => value + 1);
    setPhaseBoth('spinning');
    setSpinning(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!mountedRef.current) return;
        const measured = viewportRef.current?.clientWidth ?? 0;
        const width = measured > 0 ? measured : 640;
        setAnimate(true);
        setOffset(landOffset(width));
      });
    });
    if (backupRef.current != null) window.clearTimeout(backupRef.current);
    backupRef.current = window.setTimeout(() => {
      if (phaseRef.current === 'spinning') finishSpin();
    }, SPIN_MS + 700);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (spinning || phaseRef.current === 'spinning') return;
    const price = parseUsd(priceInput);
    if (price == null) {
      setFieldError(true);
      setEmptyCatalog(false);
      return;
    }
    setFieldError(false);
    setSavedPrice(price);
    const pool = eligibleGames(catalog, history, price);
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
    startSpin(pool, winner);
  }

  const shown = phase === 'idle' ? resting : strip;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">{t(lang, 'roulette')}</h1>
      <p className="mt-1 text-sm text-[#8f98a0]">{t(lang, 'rouletteLead')}</p>

      <form onSubmit={onSubmit} className="mt-5 flex flex-wrap items-end gap-3">
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
            disabled={spinning}
            aria-invalid={fieldError}
            aria-describedby={fieldError ? 'price-error' : undefined}
            onChange={(event) => {
              setPriceInput(event.target.value);
              setFieldError(false);
            }}
            className={`w-44 rounded border bg-[#0e1419] px-3 py-2 text-base text-white outline-none focus:border-[#66c0f4] disabled:opacity-50 ${
              fieldError ? 'border-[#e06c75]' : 'border-[#2a475e]'
            }`}
          />
        </label>
        <button type="submit" className={primaryBtn} disabled={spinning}>
          {phase === 'landed' ? t(lang, 'landed') : spinning ? t(lang, 'spinning') : t(lang, 'draw')}
        </button>
      </form>
      {fieldError ? (
        <p id="price-error" className="mt-2 text-sm text-[#ff8b8b]">
          {t(lang, 'priceError')}
        </p>
      ) : null}

      {emptyCatalog ? (
        <div role="status" className="mt-4 rounded border border-[#4c6b22] bg-[#1c2814] px-4 py-3">
          <p className="text-sm leading-relaxed text-[#d7e8b8]">{t(lang, 'emptyCatalog')}</p>
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
        <div ref={viewportRef} className="relative h-[108px] overflow-hidden rounded-lg border border-[#2a475e] bg-[#0b1016]">
          <div
            data-marker
            className="pointer-events-none absolute top-1/2 left-1/2 z-20 h-[78px] w-[168px] -translate-x-1/2 -translate-y-1/2 rounded ring-2 ring-[#a4d007]"
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#0b1016] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#0b1016] to-transparent" />
          <div
            key={spinId}
            className="absolute top-0 left-0 flex h-full w-max items-center"
            style={{
              transform: `translate3d(${offset}px, 0, 0)`,
              transition: animate ? `transform ${SPIN_MS}ms cubic-bezier(0.07, 0.55, 0.05, 1)` : 'none',
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
                key={`${spinId}-${game.appId}-${index}`}
                className="shrink-0 overflow-hidden rounded"
                style={{ width: CARD_W, height: CARD_H, marginRight: CARD_GAP }}
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
        {phase === 'spinning' ? t(lang, 'spinning') : null}
        {phase === 'landed' && currentRoll ? (
          <>
            {t(lang, 'landed')}: <span translate="no">{currentRoll.name}</span>
          </>
        ) : null}
      </p>

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
    </div>
  );
}
