import type { UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';
import type { CareerGame, CareerGamesPage } from '@/types/career';

/** Flattens the paged game list into what the list component needs. */
export function useCareerGames(query: UseInfiniteQueryResult<InfiniteData<CareerGamesPage>>) {
  const games: CareerGame[] = query.data?.pages.flatMap((p) => p.matches) ?? [];
  return {
    games,
    hasMore: !!query.hasNextPage,
    loadingMore: query.isFetchingNextPage,
    failed: query.isError,
    loadMore: () => { void query.fetchNextPage(); },
  };
}
