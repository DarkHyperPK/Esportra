import { OcrMatchScoreboard } from '@/components/tournament/ocr-scoreboard/OcrMatchScoreboard';
import { useScrimGames } from '@/hooks/competitive/useScrimGames';
import { useScrimSession } from '@/hooks/competitive/useScrims';
import { resolveStoredEnrichedMatch } from '@/hooks/useRiotGameDetails';
import { PanelSkeleton } from '@/components/competitive/scrims/data/PanelStates';

interface Props { sessionId: string; gameNumber: number; mapName: string | null }

/** For a map reported from a scoreboard screenshot: the scoreboard read from it and the screenshot itself. Shows nothing when neither was stored. */
export function ScreenshotEvidence({ sessionId, gameNumber, mapName }: Props) {
  const games = useScrimGames(sessionId);
  const session = useScrimSession(sessionId);
  if (games.isLoading) return <PanelSkeleton />;
  const game = games.data?.games.find((g) => g.gameNumber === gameNumber);
  if (!game) return null;
  const players = resolveStoredEnrichedMatch(game.matchData)?.enrichedPlayers ?? game.matchData?.players ?? [];
  const shots = game.screenshotUrls.slice(0, 3);
  return (
    <div className="space-y-4">
      {players.length > 0 && (
        <OcrMatchScoreboard players={players} team1Name={session.data?.team1Name ?? 'Team 1'} team2Name={session.data?.team2Name ?? 'Team 2'}
          team1Score={game.team1Score} team2Score={game.team2Score} mapName={mapName ?? undefined} />
      )}
      {shots.length > 0 && (
        <section aria-label="Reported screenshot" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shots.map((url, i) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer"
              className="group block overflow-hidden rounded-xl border border-white/[0.06] bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
              <img src={url} alt={`Scoreboard screenshot ${i + 1} for map ${gameNumber}`} loading="lazy" className="aspect-video w-full object-contain transition-opacity group-hover:opacity-80" />
            </a>
          ))}
        </section>
      )}
    </div>
  );
}
