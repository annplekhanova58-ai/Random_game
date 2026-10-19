import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GameCover } from '../components/GameCover';
import { SteamLink } from '../components/SteamLink';
import { isFixedWinner } from '../fixedDraw';
import { formatPrice, formatWhen, localizedNote, t } from '../i18n';
import { useSession } from '../session';
import { dangerBtn, primaryBtn, secondaryBtn } from '../ui';

export function HistoryPage() {
  const { lang, history, deleteRoll, clearHistory } = useSession();
  const [confirming, setConfirming] = useState(false);
  const rows = [...history].sort((a, b) => (a.rolledAt < b.rolledAt ? 1 : a.rolledAt > b.rolledAt ? -1 : 0));

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t(lang, 'history')}</h1>
          <p className="mt-1 text-sm text-[#8f98a0]">
            {t(lang, isFixedWinner() ? 'fixedHistoryLead' : 'historyLead')}
          </p>
        </div>
        {rows.length > 0 ? (
          <button type="button" className={secondaryBtn} onClick={() => setConfirming(true)}>
            {t(lang, 'clearHistory')}
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="mt-5 rounded-lg border border-[#2a475e] bg-[#16202d] px-6 py-10 text-center">
          <p className="text-sm text-[#c7d5e0]">{t(lang, 'emptyHistory')}</p>
          <Link to="/" className={`${primaryBtn} mt-4`}>
            {t(lang, 'goRoulette')}
          </Link>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-[#2a475e] overflow-hidden rounded-lg border border-[#2a475e] bg-[#16202d]">
          {rows.map((roll) => (
            <li key={roll.id} className="flex items-center gap-3 px-4 py-3">
              <div className="h-14 w-[120px] shrink-0 overflow-hidden rounded">
                <GameCover game={roll} alt={roll.name} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-white" translate="no">
                  {roll.name}
                </div>
                <div className="truncate text-xs text-[#8f98a0]">
                  {localizedNote(roll.noteRu, roll.noteEn, lang)}
                </div>
              </div>
              <div className="w-28 shrink-0 text-right text-sm text-[#c6e05a]">
                {formatPrice(roll.priceUsd, lang)}
              </div>
              <time dateTime={roll.rolledAt} className="w-44 shrink-0 text-right text-xs text-[#8f98a0]">
                {formatWhen(roll.rolledAt, lang)}
              </time>
              <SteamLink appId={roll.appId} className="shrink-0 text-sm text-[#66c0f4] underline">
                {t(lang, 'openSteam')}
              </SteamLink>
              <button
                type="button"
                onClick={() => deleteRoll(roll.id)}
                className="shrink-0 text-sm text-[#e07a82] underline"
              >
                {t(lang, 'delete')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {confirming ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setConfirming(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-history-title"
            className="w-full max-w-md rounded-lg border border-[#2a475e] bg-[#1b2838] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="clear-history-title" className="text-lg font-semibold text-white">
              {t(lang, 'confirmClearTitle')}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#c7d5e0]">{t(lang, 'confirmClearBody')}</p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className={secondaryBtn} autoFocus onClick={() => setConfirming(false)}>
                {t(lang, 'cancel')}
              </button>
              <button
                type="button"
                className={dangerBtn}
                onClick={() => {
                  clearHistory();
                  setConfirming(false);
                }}
              >
                {t(lang, 'confirmClear')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
