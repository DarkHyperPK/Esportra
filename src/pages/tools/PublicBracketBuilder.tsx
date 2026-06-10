import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FileUp, Save, Shuffle, Upload } from "lucide-react";
import { apiClient, ApiError, getApiErrorMessage } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BracketRenderer } from "@/components/bracket/BracketRenderer";
import { adaptPublicBracketPayload, normalizeToolBracketPayload, parseTeamText, PublicBracketPayload } from "./publicToolUtils";
import { SingleEliminationGenerator } from "@/services/bracket/SingleEliminationGenerator";
import { DoubleEliminationGenerator } from "@/services/bracket/DoubleEliminationGenerator";

const DRAFT_KEY = "publicBracketDraft";

const PublicBracketBuilder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [title, setTitle] = useState("Untitled bracket");
  const [format, setFormat] = useState("single_elimination");
  const [bestOf, setBestOf] = useState("1");
  const [bracketSize, setBracketSize] = useState("8");
  const [teamText, setTeamText] = useState("Buffer Overflow\nStorm Riders\nWar Machine\nHex Runners\nGhost Protocol\nStatic Charge\nIce Breakers\nBlack Horizon");
  const [preview, setPreview] = useState<PublicBracketPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => parseTeamText(teamText), [teamText]);
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
          title: "Preview generated locally",
          description: "The tools API is not deployed on this backend yet, so saving still needs the backend route.",
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
      navigate(`/tools/brackets/${response.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title, format, bestOf, bracketSize, teamText }));
        navigate(`/auth/signin?redirect=${encodeURIComponent(location.pathname)}`);
        return;
      }
      if (error instanceof ApiError && error.status === 404) {
        toast({
          title: "Saving is not available yet",
          description: "The frontend is running against an API that does not have /api/tools/brackets deployed.",
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
    <main className="mx-auto w-full max-w-7xl px-4 py-8 text-white">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-rose-400">Bracket tool</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Create Bracket</h1>
        </div>
        <Button asChild variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
          <Link to="/tools/brackets">Saved brackets</Link>
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="border border-white/10 bg-black/40 p-4">
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
              <p className="text-xs text-zinc-500">{parsed.names.length} teams detected. Seeds follow list order.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" disabled={busy} onClick={generatePreview} variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                <Shuffle className="mr-2 h-4 w-4" /> Preview
              </Button>
              <Button type="button" disabled={busy} onClick={saveBracket} className="bg-rose-600 text-white hover:bg-rose-500">
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            </div>
          </div>
        </section>

        <section className="min-h-[620px] overflow-hidden border border-white/10 bg-black/35">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold">Preview</h2>
              <p className="text-xs text-zinc-500">{preview ? `${matches.length} matches generated` : "Generate a preview to inspect the bracket"}</p>
            </div>
            <Upload className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="h-[640px] overflow-auto p-3">
            {preview ? (
              <BracketRenderer matches={matches} activeFilter={{ type: "all" }} disableAnimations cardWidth={260} cardHeight={86} roundGap={64} matchGap={18} />
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
