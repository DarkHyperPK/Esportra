import { useEffect, useState } from 'react';
import type { EsportsGame } from '@/utils/gameFeatures';
import { resolveGameLogoUrl, resolveNextGameLogoFallback } from '@/utils/gameLogoResolver';

type GameLogoImageProps = {
  gameName: string;
  catalogLogo?: string | null;
  className?: string;
  alt?: string;
};

export function GameLogoImage({
  gameName,
  catalogLogo,
  className,
  alt = '',
}: GameLogoImageProps) {
  const [src, setSrc] = useState(() => resolveGameLogoUrl(gameName, catalogLogo));

  useEffect(() => {
    setSrc(resolveGameLogoUrl(gameName, catalogLogo));
  }, [gameName, catalogLogo]);

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        setSrc((current) => resolveNextGameLogoFallback(current, gameName, catalogLogo));
      }}
    />
  );
}

export function GameLogoImageFromCatalog({
  game,
  className,
  alt = '',
}: {
  game: EsportsGame;
  className?: string;
  alt?: string;
}) {
  return (
    <GameLogoImage
      gameName={game.name}
      catalogLogo={game.logo}
      className={className}
      alt={alt}
    />
  );
}
