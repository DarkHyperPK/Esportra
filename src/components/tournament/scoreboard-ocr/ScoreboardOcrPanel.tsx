import { useScoreboardOcr } from '@/hooks/useScoreboardOcr';
import { useSubmitRiotReport } from '@/hooks/useSubmitRiotReport';
import { ScoreboardOcrFlow, type OcrTransport } from './ScoreboardOcrFlow';

type FlowProps = Parameters<typeof ScoreboardOcrFlow>[0];

/** Tournament match: the screenshot is read and reported through the match's own endpoints. */
export function ScoreboardOcrPanel(props: Omit<FlowProps, 'transport'>) {
  const { matchId, gameNumber, reportedByTeamId } = props;
  const { parse, submit } = useScoreboardOcr(matchId);
  const submitRiot = useSubmitRiotReport(matchId, gameNumber);

  const transport: OcrTransport = {
    parse: (file) => parse.mutateAsync({ file, reportedByTeamId, gameNumber }),
    parsing: parse.isPending,
    parseError: parse.isError ? parse.error : null,
    submitOcr: (submission) => submit.mutateAsync(submission),
    submittingOcr: submit.isPending,
    submitRiot: (candidate, ctx) => submitRiot.mutateAsync({ candidate, ctx }),
    submittingRiot: submitRiot.isPending,
  };

  return <ScoreboardOcrFlow {...props} transport={transport} />;
}
