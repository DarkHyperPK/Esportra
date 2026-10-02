import { useEffect, useMemo, useState } from "react";
import { chooseMapImage, valorantMapSplash } from "@/services/maps/valorantMapAssets";

type MapImageInput = { id: string; map_name: string; map_image_url?: string | null };

/**
 * Loads every map's stored image once and checks its real size. A Valorant map
 * whose stored art is too small for a tall card (it would render blurred) or
 * fails to load switches to Riot's full-resolution splash. Returns the maps with
 * the image each should use; other games keep their stored art. Pass a memoized
 * array: every new array re-checks the images (cheap, they're cached).
 */
export function useCrispMapImages<T extends MapImageInput>(maps: T[], game: string): T[] {
  const [upgrades, setUpgrades] = useState<Record<string, string>>({});

  useEffect(() => {
    if (game !== "valorant") return undefined;
    let cancelled = false;
    maps.forEach((map) => {
      const stored = map.map_image_url?.trim();
      const fallback = valorantMapSplash(map.map_name);
      if (!stored || !fallback || stored === fallback) return;
      const image = new Image();
      const settle = (loaded: { width: number; height: number } | "error") => {
        const chosen = chooseMapImage(stored, fallback, loaded);
        if (cancelled || chosen === stored) return;
        setUpgrades((current) => ({ ...current, [map.id]: chosen }));
      };
      image.onload = () => settle({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => settle("error");
      image.src = stored;
    });
    return () => {
      cancelled = true;
    };
  }, [maps, game]);

  return useMemo(
    () => maps.map((map) => (upgrades[map.id] ? { ...map, map_image_url: upgrades[map.id] } : map)),
    [maps, upgrades],
  );
}
