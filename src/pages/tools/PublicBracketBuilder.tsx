import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileUp, Network } from "lucide-react";
import { getApiErrorMessage } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { readTeamFile, useToolBracketBuilder, type BracketBuildRequest } from "@/hooks/useToolBracketBuilder";
import { CommandButton, CommandIconButton } from "@/components/management/CommandSurface";
import { CONTROL_CLASS, EYEBROW_CLASS, Field } from "@/components/ui/kit";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BracketExporter } from "@/components/bracket/BracketExporter";
import { BracketRenderer } from "@/components/bracket/BracketRenderer";
import { SegmentedChoice } from "@/components/bracket/tool/SegmentedChoice";
import { TeamSlotsMeter } from "@/components/bracket/tool/TeamSlotsMeter";
import { adaptPublicBracketPayload, parseTeamText, slugifyBracketFileName, validateBracketTeamCount, type PublicBracketPayload } from "./publicToolUtils";

const DRAFT_KEY = "publicBracketDraft";
const SAMPLE_TEAMS = "Buffer Overflow\nStorm Riders\nWar Machine\nHex Runners\nGhost Protocol\nStatic Charge\nIce Breakers\nBlack Horizon";
type Format = BracketBuildRequest["format"];

const FORMATS: { value: Format; label: string }[] = [
  { value: "single_elimination", label: "Single elim" },
  { value: "double_elimination", label: "Double elim" },
];
const BEST_OF = ["1", "3", "5"].map((value) => ({ value, label: value }));
const SIZES = ["4", "8", "16", "32", "64"].map((value) => ({ value, label: value }));

/** Paste teams, pick a format, preview the tree, save it to run. Anyone can preview; saving needs an account. */
const PublicBracketBuilder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const builder = useToolBracketBuilder();
  const [title, setTitle] = useState("Untitled bracket");
  const [format, setFormat] = useState<Format>("single_elimination");
  const [bestOf, setBestOf] = useState("1");
  const [size, setSize] = useState("8");
  const [teamText, setTeamText] = useState(SAMPLE_TEAMS);
  const [preview, setPreview] = useState<PublicBracketPayload | null>(null);
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"preview" | "save" | null>(null);
  const parsed = useMemo(() => parseTeamText(teamText), [teamText]);
  const sizeError = validateBracketTeamCount(parsed.names.length, Number(size));
  const blocked = Boolean(sizeError) || parsed.duplicates.length > 0 || parsed.names.length === 1;
  const matches = useMemo(() => (preview ? adaptPublicBracketPayload(preview) : []), [preview]);

  // Coming back from sign-in: restore what they were building.
  useEffect(() => {
    const saved = sessionStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    sessionStorage.removeItem(DRAFT_KEY);
    try {
      const draft = JSON.parse(saved);
      setTitle(draft.title ?? "Untitled bracket");
      setFormat(draft.format === "double_elimination" ? "double_elimination" : "single_elimination");
      setBestOf(String(draft.bestOf ?? 1));
      setSize(String(draft.bracketSize ?? 8));
      setTeamText(draft.teamText ?? "");
    } catch {
      // A stale draft is not worth an error.
    }
  }, []);

  const request = (): BracketBuildRequest => ({ title, format, teams: parsed.names, bestOf: Number(bestOf), bracketSize: Number(size) });

  const runPreview = async () => {
    setBusy("preview");
    try {
      const result = await builder.preview(request());
      setPreview(result.payload);
      if (result.local) toast({ title: "Preview built on this device", description: "The bracket service didn't answer, so this preview is local." });
    } catch (error) {
      toast({ title: "Couldn't build the preview", description: getApiErrorMessage(error), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy("save");
    try {
      const id = await builder.save(request());
      if (id) {
        navigate(`/tools/brackets/${id}`);
        return;
      }
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title, format, bestOf, bracketSize: size, teamText }));
      navigate(`/auth/signin?redirect=${encodeURIComponent(location.pathname)}`);
    } catch (error) {
      toast({ title: "Couldn't save the bracket", description: getApiErrorMessage(error), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const importFile = async (file: File | null) => {
    if (!file) return;
    try {
      const { text, csv } = await readTeamFile(file);
      setTeamText(parseTeamText(text, csv ? "csv" : "lines").names.join("\n"));
    } catch (error) {
      toast({ title: "Couldn't import that file", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    }
  };

  return (
    <main className="w-full px-4 pb-12 pt-6 text-white sm:px-6 xl:px-8">
      <header className="mb-6">
        <Link to="/tools/brackets" className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500 hover:text-white">
          <ArrowLeft className="h-3 w-3" /> Your brackets
        </Link>
        <p className={`${EYEBROW_CLASS} mt-4`}>Bracket tool</p>
        <h1 className="mt-1.5 font-heading text-[32px] font-black leading-none tracking-tight sm:text-[40px]">New bracket</h1>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] lg:items-start">
        <section aria-label="Bracket settings" className="space-y-6 border border-white/[0.07] bg-card p-5 sm:p-6 lg:sticky lg:top-24">
          <Field label="Name" htmlFor="bracket-title">
            <Input id="bracket-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={CONTROL_CLASS} />
          </Field>
          <Field label="Format" hint={format === "double_elimination" ? "A team is out after two losses." : "A team is out after one loss."}>
            <SegmentedChoice label="Format" value={format} options={FORMATS} onChange={setFormat} />
          </Field>
          <div className="grid grid-cols-[2fr_3fr] gap-4">
            <Field label="Best of"><SegmentedChoice label="Best of" value={bestOf} options={BEST_OF} onChange={setBestOf} /></Field>
            <Field label="Size"><SegmentedChoice label="Bracket size" value={size} options={SIZES} onChange={setSize} /></Field>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="teams" className="text-[13px] font-medium text-zinc-200">Teams, one per line</label>
              <label className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 hover:text-white">
                <FileUp className="h-3.5 w-3.5" /> Import .txt / .csv
                <input type="file" accept=".txt,.csv,text/plain,text/csv" className="sr-only" onChange={(e) => { void importFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              </label>
            </div>
            <Textarea id="teams" value={teamText} onChange={(e) => setTeamText(e.target.value)} className="min-h-[220px] rounded-none border-white/10 bg-black/30 font-mono text-[13px] leading-6 text-white focus-visible:border-rose-400/60 focus-visible:ring-0 focus-visible:ring-offset-0" />
            <TeamSlotsMeter teams={parsed.names.length} slots={Number(size)} duplicates={parsed.duplicates} />
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-white/[0.07] pt-5">
            <CommandButton variant="secondary" disabled={busy !== null || blocked} onClick={runPreview}>{busy === "preview" ? "Building…" : "Preview"}</CommandButton>
            <CommandButton disabled={busy !== null || blocked} onClick={save}>{busy === "save" ? "Saving…" : "Save bracket"}</CommandButton>
          </div>
        </section>

        <section aria-label="Preview" className="flex min-h-[520px] flex-col border border-white/[0.07] bg-background lg:h-[calc(100dvh-12rem)]">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-3">
            <div>
              <p className="font-heading text-[15px] font-bold">Preview</p>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{preview ? `${matches.length} matches` : "Not built yet"}</p>
            </div>
            {preview && matches.length > 0 ? (
              <BracketExporter matches={matches} downloadFileName={`${slugifyBracketFileName(title)}-preview.png`}
                triggerButton={<CommandIconButton variant="secondary" label="Download preview as PNG" className="h-8 w-8"><Download /></CommandIconButton>} />
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-auto" data-lenis-prevent>
            {preview ? (
              <BracketRenderer matches={matches} activeFilter={{ type: "all" }} disableAnimations hoveredTeamId={hoveredTeamId} onTeamHover={setHoveredTeamId} />
            ) : (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center bg-white/[0.04]"><Network className="h-5 w-5 text-zinc-500" /></span>
                <p className="mt-4 font-heading text-[16px] font-bold">Your bracket appears here</p>
                <p className="mt-1 max-w-xs text-sm text-zinc-500">Add your teams, then press Preview to see the full tree before you save it.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default PublicBracketBuilder;
