import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { CtaButton } from '@/components/ui/app-buttons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EYEBROW_CLASS, InlineNotice } from '@/components/ui/kit';
import { ScoreboardOcrDropzone } from '@/components/tournament/scoreboard-ocr/ScoreboardOcrDropzone';
import { OcrServiceStatus } from '@/components/debug/scoreboard-ocr/OcrServiceStatus';
import { OcrRosterInputs } from '@/components/debug/scoreboard-ocr/OcrRosterInputs';
import { OcrDebugSummary } from '@/components/debug/scoreboard-ocr/OcrDebugSummary';
import { OcrDebugTable } from '@/components/debug/scoreboard-ocr/OcrDebugTable';
import { OcrDebugJson } from '@/components/debug/scoreboard-ocr/OcrDebugJson';
import { OcrReviewPreview } from '@/components/debug/scoreboard-ocr/OcrReviewPreview';
import { OcrScoreboardPreview } from '@/components/debug/scoreboard-ocr/OcrScoreboardPreview';
import { useScoreboardOcrDebug } from '@/hooks/useScoreboardOcrDebug';
import { getApiErrorMessage } from '@/lib/apiClient';

/** Staff test bench for the Valorant scoreboard reader. Nothing is stored. */
export default function ScoreboardOcrDebug() {
  const { health, parse } = useScoreboardOcrDebug();
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [rosters, setRosters] = useState({ team1: '', team2: '' });

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (next: File) => {
    parse.reset();
    setFile(next);
  };
  const run = () => file && parse.mutate({ file, team1Names: rosters.team1, team2Names: rosters.team2 });
  const data = parse.data;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6 px-4 py-8 pb-40 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <Link to="/debug/riot" className="text-xs text-zinc-500 underline-offset-4 hover:text-white hover:underline">← Riot debug</Link>
        <p className={EYEBROW_CLASS}>Debug · staff only</p>
        <h1 className="font-heading text-3xl font-black tracking-tight text-white sm:text-4xl">Scoreboard OCR test bench</h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Drop a Valorant post-match Scoreboard screenshot to see exactly what the reader returns. No match, no report, nothing is saved.
        </p>
      </header>

      <OcrServiceStatus health={health.data} loading={health.isFetching} error={health.error} onRefresh={() => health.refetch()} />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <ScoreboardOcrDropzone disabled={parse.isPending} onFile={pick} />
          {file && <p className="truncate font-mono text-xs text-zinc-500">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
          <OcrRosterInputs team1={rosters.team1} team2={rosters.team2} onChange={(team, value) => setRosters((r) => ({ ...r, [team]: value }))} />
          <CtaButton type="button" onClick={run} disabled={!file || parse.isPending} className="w-full sm:w-auto">
            {parse.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />Reading…</> : 'Read screenshot'}
          </CtaButton>
          {parse.isError && <InlineNotice tone="critical" title="Read failed">{getApiErrorMessage(parse.error, 'The OCR request failed.')}</InlineNotice>}
        </div>
        {imageUrl ? (
          <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="block self-start border border-white/[0.07] bg-black/40">
            <img src={imageUrl} alt="Selected scoreboard screenshot" className="max-h-[26rem] w-full object-contain" />
          </a>
        ) : (
          <div className="hidden items-center justify-center border border-dashed border-white/10 text-sm text-zinc-600 lg:flex">Screenshot preview</div>
        )}
      </section>

      {data && (
        <section className="space-y-4 motion-safe:animate-in motion-safe:fade-in">
          <OcrDebugSummary result={data.result} elapsedMs={data.elapsedMs} />
          <Tabs defaultValue="scoreboard">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="scoreboard">Scoreboard</TabsTrigger>
              <TabsTrigger value="raw">Raw read</TabsTrigger>
              <TabsTrigger value="review">Captain review preview</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="scoreboard">
              <OcrScoreboardPreview key={data.elapsedMs + data.result.players.length} result={data.result} imageUrl={imageUrl} bankAgents={health.data?.reachable ? health.data.bankAgents ?? null : null} />
            </TabsContent>
            <TabsContent value="raw"><OcrDebugTable result={data.result} verification={data.verification} /></TabsContent>
            <TabsContent value="review"><OcrReviewPreview key={data.elapsedMs + data.result.players.length} result={data.result} imageUrl={imageUrl} verification={data.verification} /></TabsContent>
            <TabsContent value="json"><OcrDebugJson result={data.result} fileName={file?.name ?? 'scoreboard'} /></TabsContent>
          </Tabs>
        </section>
      )}
    </div>
  );
}
