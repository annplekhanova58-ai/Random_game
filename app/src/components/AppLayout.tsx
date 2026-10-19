import { Link, Outlet, useLocation } from 'react-router-dom';
import { fixedAppTitle } from '../fixedDraw';
import { t } from '../i18n';
import { useSession } from '../session';

export function AppLayout() {
  const { lang, setLang, spinning } = useSession();
  const { pathname } = useLocation();
  const title = fixedAppTitle() ?? t(lang, 'productName');

  return (
    <div className="min-h-screen bg-[#0e1419] px-4 py-6 text-[#c7d5e0]">
      <div className="mx-auto flex min-h-[680px] w-full max-w-[1180px] flex-col overflow-hidden rounded-lg border border-[#2a475e] bg-[#1b2838] shadow-2xl">
        <div className="grid h-9 grid-cols-[4.5rem_1fr_4.5rem] items-center bg-[#171a21] px-3">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="truncate text-center text-xs text-[#8f98a0]">{title}</div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-[#1b2838] via-[#66c0f4] to-[#5c7e10]" />
        <header className="flex items-center gap-4 border-b border-[#2a475e] bg-[#171a21] px-5 py-3">
          <div className="truncate text-lg font-semibold tracking-tight text-white">
            {title}
          </div>
          <nav className="flex items-center gap-1">
            <ShellLink to="/" label={t(lang, 'roulette')} active={pathname === '/'} disabled={spinning} />
            <ShellLink
              to="/history"
              label={t(lang, 'history')}
              active={pathname === '/history'}
              disabled={spinning}
            />
          </nav>
          <div
            role="group"
            aria-label={t(lang, 'language')}
            className="ml-auto flex shrink-0 rounded border border-[#2a475e] p-0.5 text-xs"
          >
            <button
              type="button"
              aria-pressed={lang === 'ru'}
              onClick={() => setLang('ru')}
              className={langButtonClass(lang === 'ru')}
            >
              Русский
            </button>
            <button
              type="button"
              aria-pressed={lang === 'en'}
              onClick={() => setLang('en')}
              className={langButtonClass(lang === 'en')}
            >
              English
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-6 py-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function langButtonClass(active: boolean): string {
  return active
    ? 'rounded bg-[#66c0f4] px-2.5 py-1 font-semibold text-[#0e1419]'
    : 'rounded px-2.5 py-1 text-[#8f98a0] hover:text-white';
}

function ShellLink({
  to,
  label,
  active,
  disabled,
}: {
  to: string;
  label: string;
  active: boolean;
  disabled: boolean;
}) {
  return (
    <Link
      to={to}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={(event) => {
        if (disabled) event.preventDefault();
      }}
      className={`rounded px-3 py-1.5 text-sm ${
        active ? 'bg-[#2a475e] text-white' : 'text-[#c7d5e0] hover:bg-[#1e2c3a] hover:text-white'
      } ${disabled ? 'pointer-events-none opacity-40' : ''}`}
    >
      {label}
    </Link>
  );
}
