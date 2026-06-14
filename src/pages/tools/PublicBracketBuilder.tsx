import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Download, FileUp, Save, Shuffle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError, getApiErrorMessage } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { CtaButton, OutlineButton } from '@/components/ui/app-buttons';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button-variants';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BracketExporter } from "@/components/bracket/BracketExporter";
import { BracketRenderer } from "@/components/bracket/BracketRenderer";
import {
  adaptPublicBracketPayload,
  normalizeToolBracketPayload,
  parseTeamText,
  PublicBracketPayload,
  slugifyBracketFileName,
  validateBracketTeamCount,
} from "./publicToolUtils";
import { SingleEliminationGenerator } from "@/services/bracket/SingleEliminationGenerator";
import { DoubleEliminationGenerator } from "@/services/bracket/DoubleEliminationGenerator";

const DRAFT_KEY = "publicBracketDraft";

const PublicBracketBuilder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("Untitled bracket");
  const [format, setFormat] = useState("single_elimination");
  const [bestOf, setBestOf] = useState("1");
  const [bracketSize, setBracketSize] = useState("8");
  const [teamText, setTeamText] = useState("Buffer Overflow\nStorm Riders\nWar Machine\nHex Runners\nGhost Protocol\nStatic Charge\nIce Breakers\nBlack Horizon");
  const [preview, setPreview] = useState<PublicBracketPayload | null>(null);
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => parseTeamText(teamText), [teamText]);
  const selectedBracketSize = Number(bracketSize);
  const teamCountError = useMemo(
    () => validateBracketTeamCount(parsed.names.length, selectedBracketSize),
    [parsed.names.length, selectedBracketSize],
  );
  const matches = useMemo(() => preview ? adaptPublicBracketPayload(preview) : [], [preview]);

  useEffect(() => {
    const saved = sessionStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    sessionStorage.removeItem(DRAFT_KEY);
    try {
      const draft = JSON.parse(saved);
      setTitle(draft.title ?? "Untitled bracket");
      setFormat(draft.format ?? "single_elimination");
      setBestOf(String(draft.bestOf ?? 1));
      setBracketSize(String(draft.bracketSize ?? 8));
      setTeamText(draft.teamText ?? "");
    } catch {
      // Ignore stale draft payloads.
    }
  }, []);

  const buildRequest = () => ({
    title,
    format,
    teams: parsed.names,
    bestOf: Number(bestOf),
    bracketSize: Number(bracketSize),
  });

  const buildLocalPreview = (): PublicBracketPayload => {
    const teams = parsed.names.map((name, index) => ({
      id: crypto.randomUUID(),
      name,
      seed: index + 1,
    }));
    const generator = format === "double_elimination"
      ? new DoubleEliminationGenerator()
      : new SingleEliminationGenerator();
    const graph = generator.generate(teams, "public-tool-preview", undefined, Number(bestOf), Number(bracketSize));

    return {
      title: title.trim() || "Untitled bracket",
      format,
      bestOf: Number(bestOf),
      bracketSize: Number(bracketSize),
      teams,
      graph,
    };
  };

  const validate = () => {
    if (parsed.duplicates.length > 0) {
      toast({ title: "Duplicate team names", description: parsed.duplicates.join(", "), variant: "destructive" });
      return false;
    }
    if (parsed.names.length === 1) {
      toast({ title: "Add another team", description: "Use at least two team names or clear the list for an empty bracket.", variant: "destructive" });
      return false;
    }
    if (teamCountError) {
      toast({ title: "Too many teams for bracket size", description: teamCountError, variant: "destructive" });
      return false;
    }
    return true;
  };

  const generatePreview = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      const response = await apiClient.post<any>("/api/tools/brackets/preview", buildRequest());
      setPreview(normalizeToolBracketPayload(response));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setPreview(buildLocalPreview());
        toast({
          title: "Preview generated on this device",
          description: "We could not reach the bracket service, so this preview was built locally.",
        });
        return;
      }
      toast({ title: "Could not generate bracket", description: getApiErrorMessage(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const saveBracket = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      const response = await apiClient.post<{ id: string }>("/api/tools/brackets", buildRequest());
      await queryClient.invalidateQueries({ queryKey: ["tool-brackets", "mine"] });
      navigate(`/tools/brackets/${response.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title, format, bestOf, bracketSize, teamText }));
        navigate(`/auth/signin?redirect=${encodeURIComponent(location.pathname)}`);
        return;
      }
      if (error instanceof ApiError && error.status === 404) {
        toast({
          title: "Could not save bracket",
          description: "The save endpoint was not found. Try again in a moment or contact support if this persists.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Could not save bracket", description: getApiErrorMessage(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const importFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setTeamText(parseTeamText(text, file.name.toLowerCase().endsWith(".csv") ? "csv" : "lines").names.join("\n"));
  };

  return (
    <main className="w-full px-4 py-6 text-white sm:px-6 xl:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-rose-400">Bracket tool</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Create Bracket</h1>
        </div>
        <OutlineButton asChild>
          <Link to="/tools/brackets">Saved brackets</Link>
        </OutlineButton>
      </div>

      <div className="grid gap-5 lg:min-h-[calc(100dvh-11rem)] lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] lg:items-stretch">
        <section className="border border-white/10 bg-black/40 p-4 lg:overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bracket-title">Title</Label>
              <Input id="bracket-title" value={title} onChange={(e) => setTitle(e.target.value)} className="border-white/10 bg-black/40 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger className="border-white/10 bg-black/40 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_elimination">Single</SelectItem>
                    <SelectItem value="double_elimination">Double</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Best of</Label>
                <Select value={bestOf} onValueChange={setBestOf}>
                  <SelectTrigger className="border-white/10 bg-black/40 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">BO1</SelectItem>
                    <SelectItem value="3">BO3</SelectItem>
                    <SelectItem value="5">BO5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bracket size</Label>
              <Select value={bracketSize} onValueChange={setBracketSize}>
                <SelectTrigger className="border-white/10 bg-black/40 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[4, 8, 16, 32, 64].map((size) => <SelectItem key={size} value={String(size)}>{size} slots</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="teams">Teams</Label>
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-300">
                  <FileUp className="h-3.5 w-3.5" />
                  Import
                  <input type="file" accept=".txt,.csv,text/plain,text/csv" className="sr-only" onChange={(e) => importFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <Textarea
                id="teams"
                value={teamText}
                onChange={(e) => setTeamText(e.target.value)}
                className="min-h-[260px] border-white/10 bg-black/40 font-mono text-xs text-white"
              />
              <p className={teamCountError ? "text-xs text-red-300" : "text-xs text-zinc-500"}>
                {parsed.names.length} teams detected for {selectedBracketSize} slots.
                {teamCountError ? ` ${teamCountError}` : " Seeds follow list order."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <OutlineButton type="button" disabled={busy || Boolean(teamCountError)} onClick={generatePreview}>
                <Shuffle className="mr-2 h-4 w-4" /> Preview
              </OutlineButton>
              <CtaButton type="button" disabled={busy || Boolean(teamCountError)} onClick={saveBracket}>
                <Save className="mr-2 h-4 w-4" /> Save
              </CtaButton>
            </div>
          </div>
        </section>

        <section className="flex min-h-[520px] flex-col overflow-hidden border border-white/10 bg-black/35 lg:min-h-[calc(100dvh-11rem)]">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold">Preview</h2>
              <p className="text-xs text-zinc-500">{preview ? `${matches.length} matches generated` : "Generate a preview to inspect the bracket"}</p>
            </div>
            {preview && matches.length > 0 ? (
              <BracketExporter
                matches={matches}
                downloadFileName={`${slugifyBracketFileName(title)}-preview.png`}
                triggerButton={(
                  <OutlineButton type="button" size="sm">
                    <Download className="mr-2 h-4 w-4" /> Export PNG
                  </OutlineButton>
                )}
              />
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {preview ? (
              <BracketRenderer
                matches={matches}
                activeFilter={{ type: "all" }}
                disableAnimations
                hoveredTeamId={hoveredTeamId}
                onTeamHover={setHoveredTeamId}
                cardWidth={260}
                cardHeight={86}
                roundGap={64}
                matchGap={18}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">No preview yet</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default PublicBracketBuilder;
