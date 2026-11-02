import { useEffect, useState } from 'react';
import type { EsportsGame } from '@/utils/gameFeatures';
import { resolveGameLogoUrl, resolveNextGameLogoFallback } from '@/utils/gameLogoResolver';

type GameLogoImageProps = {
  gameName: string;
  catalogLogo?: string | null;
  /** When provided, this icon URL is tried first before falling back to catalogLogo. */
  catalogIcon?: string | null;
  className?: string;
  alt?: string;
};

export function GameLogoImage({
  gameName,
  catalogLogo,
  catalogIcon,
  className,
  alt = '',
}: GameLogoImageProps) {
  const firstUrl = catalogIcon || catalogLogo || undefined;
  const [src, setSrc] = useState(() => resolveGameLogoUrl(gameName, firstUrl));

  useEffect(() => {
    setSrc(resolveGameLogoUrl(gameName, catalogIcon || catalogLogo || undefined));
  }, [gameName, catalogLogo, catalogIcon]);

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
