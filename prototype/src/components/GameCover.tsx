import { useState } from 'react';

interface CoverGame {
  cover: string;
  name: string;
  initials: string;
  color: string;
}

export function GameCover({
  game,
  className,
  alt,
}: {
  game: CoverGame;
  className?: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center text-lg font-bold text-white ${className ?? ''}`}
        style={{ backgroundColor: game.color }}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
      >
        {game.initials}
      </div>
    );
  }

  return (
    <img
      src={game.cover}
      alt={alt}
      className={className}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
