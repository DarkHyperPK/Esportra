import type { TournamentMapOption } from './TournamentMapPoolSelector';

export function filterTournamentMaps(
  maps: TournamentMapOption[],
  search: string,
  showSelectedOnly: boolean,
  selectedIds: string[],
): TournamentMapOption[] {
  const selectedSet = new Set(selectedIds);
  const query = search.trim().toLowerCase();
  return maps.filter((map) => {
    if (showSelectedOnly && !selectedSet.has(map.id)) return false;
    if (!query) return true;
    return map.map_name.toLowerCase().includes(query);
  });
}

export function canSelectAdditionalMap(
  selectedCount: number,
  requiredCount: number,
  mapVetoEnabled: boolean,
): boolean {
  if (mapVetoEnabled) return selectedCount < requiredCount;
  return selectedCount < requiredCount;
}
