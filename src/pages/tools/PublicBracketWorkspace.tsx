import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Code2, Copy, Download, Link2, Link2Off, RotateCcw, Trash2 } from "lucide-react";
import { getApiErrorMessage } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { useToolBracket, useToolBracketActions } from "@/hooks/useToolBrackets";
import { bracketChampion, computeBracketLayout, summarizeBracket } from "@/services/bracket/bracketLayout";
import type { BracketMatch } from "@/types/bracketTypes";
import { CommandButton, CommandIconButton } from "@/components/management/CommandSurface";
import { EYEBROW_CLASS, StatusPill } from "@/components/ui/kit";
import { BracketExporter } from "@/components/bracket/BracketExporter";
import { BracketRenderer } from "@/components/bracket/BracketRenderer";
import { BracketSummaryStrip } from "@/components/bracket/BracketSummaryStrip";
import { BracketCanvasSkeleton } from "@/components/bracket/BracketCanvasSkeleton";
import { BracketReportPanel } from "@/components/bracket/tool/BracketReportPanel";
import { ConfirmBracketActionDialog } from "@/components/bracket/tool/ConfirmBracketActionDialog";
import { BracketEmbedDialog } from "@/components/bracket/tool/BracketEmbedDialog";
import { adaptPublicBracketPayload, buildPublicBracketEmbedCode, buildPublicBracketShareUrl, copyText, formatBracketFormat, slugifyBracketFileName } from "./publicToolUtils";

type Confirm = "delete" | "reset" | null;

/** Run a saved bracket (owner) or follow a shared one (anyone with the link). */
const PublicBracketWorkspace = ({ mode }: { mode: "owner" | "share" }) => {
  const { id, token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, error, queryKey } = useToolBracket(mode, mode === "owner" ? id : token);
  const actions = useToolBracketActions(data, queryKey);
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null);
  const [selected, setSelected] = useState<BracketMatch | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [embedOpen, setEmbedOpen] = useState(false);

  const matches = useMemo(() => (data ? adaptPublicBracketPayload(data.payload) : []), [data]);
  const layout = useMemo(() => computeBracketLayout(matches), [matches]);
  const champion = useMemo(() => bracketChampion(matches, layout.champion?.sourceId), [matches, layout.champion?.sourceId]);
  const summary = useMemo(() => summarizeBracket(matches), [matches]);
  const ready = useMemo(() => matches.filter((m) => m.team1 && m.team2 && m.status !== "completed").sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber).slice(0, 6), [matches]);
  const owner = mode === "owner";
  const shared = data?.visibility === "unlisted" && Boolean(data?.shareToken);
  const shareUrl = shared && data?.shareToken ? buildPublicBracketShareUrl(data.shareToken) : "";

  const run = async (task: () => Promise<unknown>, success: string, failure: string) => {
    setSaving(true);
    try {
      await task();
      toast({ title: success });
      return true;
    } catch (err) {
      toast({ title: failure, description: getApiErrorMessage(err), variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <main className="w-full px-4 py-8 sm:px-6"><div className="mb-6 h-10 w-72 animate-pulse bg-white/[0.06]" /><div className="border border-white/[0.07]"><BracketCanvasSkeleton /></div></main>;
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center text-white">
        <p className="font-heading text-xl font-bold">Bracket not found</p>
        <p className="mt-2 text-sm text-zinc-500">{getApiErrorMessage(error, "The link may have expired or the bracket was deleted.")}</p>
        <CommandButton asChild variant="secondary" className="mt-6"><Link to="/tools/brackets">Your brackets</Link></CommandButton>
      </main>
    );
  }

  return (
    <main className="w-full px-4 pb-12 pt-6 text-white sm:px-6 xl:px-8">
      <header className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          {owner ? (
            <Link to="/tools/brackets" className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500 hover:text-white">
              <ArrowLeft className="h-3 w-3" /> Your brackets
            </Link>
          ) : null}
          <p className={`${EYEBROW_CLASS} ${owner ? "mt-4" : ""}`}>{[formatBracketFormat(data.format), `Best of ${data.bestOf}`].join(" · ")}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <h1 className="truncate font-heading text-[30px] font-black leading-none tracking-tight sm:text-[38px]">{data.title}</h1>
            {owner ? <StatusPill label={shared ? "Shared" : "Private"} tone={shared ? "accent" : "neutral"} /> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {owner ? (
            <CommandButton variant="secondary" size="sm" disabled={saving} onClick={() => void run(actions.toggleSharing, shared ? "Share link turned off" : "Share link on", "Couldn't change sharing")}>
              {shared ? <Link2Off className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />} {shared ? "Stop sharing" : "Share"}
            </CommandButton>
          ) : null}
          {owner && shared ? <CommandButton variant="secondary" size="sm" onClick={() => setEmbedOpen(true)}><Code2 className="h-3.5 w-3.5" /> Embed</CommandButton> : null}
          {matches.length > 0 ? (
            <BracketExporter matches={matches} downloadFileName={`${slugifyBracketFileName(data.title)}.png`}
              triggerButton={<CommandIconButton variant="secondary" label="Download as PNG" className="h-8 w-8"><Download /></CommandIconButton>} />
          ) : null}
          {owner ? (
            <>
              <CommandIconButton variant="secondary" label="Reset all results" className="h-8 w-8" disabled={saving} onClick={() => setConfirm("reset")}><RotateCcw /></CommandIconButton>
              <CommandIconButton variant="ghost" label="Delete bracket" className="h-8 w-8 text-zinc-500 hover:text-red-300" disabled={saving} onClick={() => setConfirm("delete")}><Trash2 /></CommandIconButton>
            </>
          ) : null}
        </div>
      </header>

      {owner && shareUrl ? (
        <div className="mb-4 flex items-center gap-3 border border-white/[0.07] bg-card px-4 py-2.5">
          <span className={EYEBROW_CLASS}>Link</span>
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-300">{shareUrl}</code>
          <CommandButton variant="ghost" size="sm" onClick={() => void copyText(shareUrl).then(() => toast({ title: "Link copied" }))}><Copy className="h-3.5 w-3.5" /> Copy</CommandButton>
        </div>
      ) : null}

      <div className="border border-white/[0.07] bg-background">
        <BracketSummaryStrip played={summary.played} total={summary.total} live={summary.live} teams={summary.teams} champion={champion} />
        <div className="grid xl:grid-cols-[minmax(0,1fr)_320px]">
          <section aria-label="Bracket" className="bracket-canvas min-h-[520px] overflow-auto border-t border-white/[0.07] xl:h-[calc(100dvh-20rem)]" data-lenis-prevent>
            <BracketRenderer matches={matches} activeFilter={{ type: "all" }} disableAnimations hoveredTeamId={hoveredTeamId} onTeamHover={setHoveredTeamId} selectedMatchId={selected?.id ?? null}
              onMatchClick={owner ? (match) => (match.team1 && match.team2 ? setSelected(match) : undefined) : undefined} />
          </section>
          <aside className="border-t border-white/[0.07] bg-card p-5 xl:border-l">
            <BracketReportPanel
              selected={selected}
              ready={ready}
              champion={champion}
              doubleElimination={layout.sections.length > 0}
              canReport={owner}
              saving={saving}
              onSelect={setSelected}
              onCancel={() => setSelected(null)}
              onSave={(result) => {
                if (!selected) return;
                void run(() => actions.reportResult(String(selected.id), result), "Result saved", "Couldn't save the result").then((ok) => ok && setSelected(null));
              }}
            />
          </aside>
        </div>
      </div>

      {owner && data.shareToken ? (
        <BracketEmbedDialog open={embedOpen} onOpenChange={setEmbedOpen} code={buildPublicBracketEmbedCode(data.shareToken)} onCopy={(code) => void copyText(code).then(() => toast({ title: "Embed code copied" }))} />
      ) : null}
      <ConfirmBracketActionDialog
        open={confirm !== null}
        title={confirm === "delete" ? `Delete “${data.title}”?` : "Reset every result?"}
        description={confirm === "delete" ? "It's removed for good. Share links and embeds stop working." : "All scores are cleared and every team goes back to round one. This can't be undone."}
        confirmLabel={confirm === "delete" ? "Delete bracket" : "Reset results"}
        busyLabel={confirm === "delete" ? "Deleting…" : "Resetting…"}
        busy={saving}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === "delete") {
            void run(actions.remove, "Bracket deleted", "Couldn't delete the bracket").then((ok) => ok && navigate("/tools/brackets"));
          } else {
            void run(actions.reset, "Results reset", "Couldn't reset the bracket").then(() => { setConfirm(null); setSelected(null); });
          }
        }}
      />
    </main>
  );
};

export default PublicBracketWorkspace;
