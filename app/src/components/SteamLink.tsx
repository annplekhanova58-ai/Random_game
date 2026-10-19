import type { ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { steamUrl } from '../data/mock';
import { isDesktop } from '../desktop';

/** WebView2 does not open `target=_blank`. The desktop build asks the OS browser instead. */
export function SteamLink({
  appId,
  className,
  children,
}: {
  appId: number;
  className?: string;
  children: ReactNode;
}) {
  if (!isDesktop()) {
    return (
      <a href={steamUrl(appId)} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={`cursor-pointer border-0 bg-transparent p-0 text-left ${className ?? ''}`}
      onClick={() => {
        void invoke('open_steam', { appId });
      }}
    >
      {children}
    </button>
  );
}
