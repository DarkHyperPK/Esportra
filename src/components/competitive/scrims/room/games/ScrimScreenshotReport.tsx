import { ScoreboardOcrFlow } from '@/components/tournament/scoreboard-ocr/ScoreboardOcrFlow';
import { useScrimOcrTransport } from '@/hooks/competitive/useScrimOcrTransport';

interface Props {
  sessionId: string;
  gameNumber: number;
  myTeamId: string;
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  team1Logo?: string;
  team2Logo?: string;
  onDone: () => void;
  onManual: () => void;
}

/** The match room's screenshot upload and full scoreboard review, reporting one scrim map. */
export function ScrimScreenshotReport({ sessionId, gameNumber, myTeamId, team1Id, team2Id, team1Name, team2Name, team1Logo, team2Logo, onDone, onManual }: Props) {
  const transport = useScrimOcrTransport(sessionId, myTeamId, gameNumber);
  return (
    <ScoreboardOcrFlow
      matchId={sessionId}
      transport={transport}
      gameNumber={gameNumber}
      reportedByTeamId={myTeamId}
      team1Id={team1Id}
      team2Id={team2Id}
      team1Name={team1Name}
      team2Name={team2Name}
      team1Logo={team1Logo}
      team2Logo={team2Logo}
      onSubmitted={onDone}
      onManual={onManual}
    />
  );
}
