import { Link } from 'react-router-dom';
import { GameCover } from '../components/GameCover';
import { SteamLink } from '../components/SteamLink';
import { formatPrice, localizedNote, t } from '../i18n';
import { useSession } from '../session';
import { primaryBtn, secondaryBtn } from '../ui';

export function ResultPage() {
  const { lang, currentRoll } = useSession();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">{t(lang, 'result')}</h1>
      {currentRoll ? (
        <>
          <p className="mt-1 text-sm text-[#8f98a0]">{t(lang, 'winner')}</p>
          <article
            data-app-id={currentRoll.appId}
            className="mt-5 flex gap-6 rounded-lg border border-[#2a475e] bg-[#16202d] p-5"
          >
            <div className="h-[172px] w-[368px] shrink-0 overflow-hidden rounded">
              <GameCover
                game={currentRoll}
                alt={currentRoll.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <h2 className="text-2xl font-semibold text-white" translate="no">
                {currentRoll.name}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#8f98a0]">
                {localizedNote(currentRoll.noteRu, currentRoll.noteEn, lang)}
              </p>
              <p className="mt-4 text-xs tracking-wide text-[#8f98a0] uppercase">{t(lang, 'priceAtDraw')}</p>
              <p className="text-3xl font-semibold text-[#c6e05a]">{formatPrice(currentRoll.priceUsd, lang)}</p>
              <SteamLink appId={currentRoll.appId} className="mt-4 inline-flex text-sm text-[#66c0f4] underline">
                {t(lang, 'openSteam')}
              </SteamLink>
            </div>
          </article>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/" className={primaryBtn}>
              {t(lang, 'newDraw')}
            </Link>
            <Link to="/history" className={secondaryBtn}>
              {t(lang, 'history')}
            </Link>
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-lg border border-[#2a475e] bg-[#16202d] px-6 py-8">
          <p className="text-sm leading-relaxed text-[#c7d5e0]">{t(lang, 'noResult')}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/" className={primaryBtn}>
              {t(lang, 'goRoulette')}
            </Link>
            <Link to="/history" className={secondaryBtn}>
              {t(lang, 'history')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
