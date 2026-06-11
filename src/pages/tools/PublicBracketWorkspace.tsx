import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Code2, Copy, Download, RotateCcw, Share2, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getApiErrorMessage } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BracketExporter } from "@/components/bracket/BracketExporter";
import { BracketRenderer } from "@/components/bracket/BracketRenderer";
import { BracketMatch } from "@/types/bracketTypes";
import {
  adaptPublicBracketPayload,
  buildPublicBracketEmbedCode,
  copyText,
  formatBracketFormat,
  normalizeToolBracketPayload,
  normalizeToolBracketResponse,
  PublicBracketResponse,
  slugifyBracketFileName,
} from "./publicToolUtils";

type WorkspaceProps = {
  mode: "owner" | "share";
};

const rawId = (id: string) => id.replace(/^(db-|wb-|lb-|source-)/, "");

const PublicBracketWorkspace = ({ mode }: WorkspaceProps) => {
  const { id, token } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null);
  const { toast } = useToast();
  const [selected, setSelected] = useState<BracketMatch | null>(null);
  const [team1Score, setTeam1Score] = useState("0");
  const [team2Score, setTeam2Score] = useState("0");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);

  const queryKey = mode === "owner" ? ["tool-bracket", id] : ["tool-bracket-share", token];
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const raw = mode === "owner"
        ? await apiClient.get<any>(`/api/tools/brackets/${id}`)
        : await apiClient.get<any>(`/api/tools/brackets/share/${token}`);
      return normalizeToolBracketResponse(raw);
    },
    enabled: mode === "owner" ? Boolean(id) : Boolean(token),
  });

  const matches = useMemo(() => data ? adaptPublicBracketPayload(data.payload) : [], [data]);
  const shareUrl = data?.shareToken ? `${window.location.origin}/tools/brackets/share/${data.shareToken}` : "";
  const canEmbed = Boolean(data?.shareToken && data.visibility === "unlisted");
  const embedCode = data?.shareToken ? buildPublicBracketEmbedCode(data.shareToken) : "";
  const exportFileName = data ? `${slugifyBracketFileName(data.title)}.png` : undefined;

  const openEmbedDialog = () => {
    if (!canEmbed) {
      toast({
        title: "Enable sharing first",
        description: "Turn on the share link before copying an embed code.",
        variant: "destructive",
      });
      return;
    }
    setEmbedOpen(true);
  };

  const selectMatch = (match: BracketMatch) => {
    setSelected(match);
    setTeam1Score(String(match.team1_score ?? 0));
    setTeam2Score(String(match.team2_score ?? 0));
  };

  const refreshWithPayload = (payload: any) => {
    if (!data) return;
    const next: PublicBracketResponse = {
      ...data,
      payload: normalizeToolBracketPayload(payload),
    };
    queryClient.setQueryData(queryKey, next);
    setSelected(null);
  };

  const saveMatch = async (winnerId?: string) => {
    if (!data || !selected || !winnerId) return;
    setSaving(true);
    try {
      const payload = await apiClient.patch<any>(`/api/tools/brackets/${data.id}/matches/${rawId(String(selected.id))}`, {
        team1Score: Number(team1Score),
        team2Score: Number(team2Score),
        winnerId,
      });
      refreshWithPayload(payload);
      toast({ title: "Match updated" });
    } catch (err) {
      toast({ title: "Could not update match", description: getApiErrorMessage(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetBracket = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const payload = await apiClient.post<any>(`/api/tools/brackets/${data.id}/reset`, {});
      refreshWithPayload(payload);
      toast({ title: "Bracket reset" });
    } catch (err) {
      toast({ title: "Could not reset bracket", description: getApiErrorMessage(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteBracket = async () => {
    if (!data || mode !== "owner") return;
    setSaving(true);
    try {
      await apiClient.delete(`/api/tools/brackets/${data.id}`);
      await queryClient.invalidateQueries({ queryKey: ["tool-brackets", "mine"] });
      toast({ title: "Bracket deleted" });
      setDeleteOpen(false);
      navigate("/tools/brackets");
    } catch (err) {
      toast({ title: "Could not delete bracket", description: getApiErrorMessage(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleSharing = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const raw = await apiClient.patch<any>(`/api/tools/brackets/${data.id}/sharing`, { enabled: data.visibility !== "unlisted" });
      const next = normalizeToolBracketResponse(raw);
      queryClient.setQueryData(queryKey, next);
      toast({ title: next.visibility === "unlisted" ? "Share link enabled" : "Share link disabled" });
    } catch (err) {
      toast({ title: "Could not update sharing", description: getApiErrorMessage(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <main className="mx-auto max-w-7xl px-4 py-8 text-sm text-zinc-400">Loading bracket...</main>;
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 text-white">
        <section className="border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
          {getApiErrorMessage(error, "Bracket was not found.")}
        </section>
        <Button asChild className="mt-4 bg-white text-black hover:bg-zinc-200">
          <Link to="/tools/brackets">Back to brackets</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="w-full px-4 py-6 text-white sm:px-6 xl:px-8">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-rose-400">
            {mode === "share" ? "Shared bracket" : "Bracket runner"}
          </p>
          <h1 className="mt-2 truncate text-3xl font-black tracking-tight">{data.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">{formatBracketFormat(data.format)} · BO{data.bestOf} · {matches.length} matches</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
            <Link to="/tools/brackets">Saved brackets</Link>
          </Button>
          {matches.length > 0 && (
            <BracketExporter
              matches={matches}
              downloadFileName={exportFileName}
              triggerButton={(
                <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                  <Download className="mr-2 h-4 w-4" /> Export PNG
                </Button>
              )}
            />
          )}
          {mode === "owner" && canEmbed && (
            <Button variant="outline" onClick={openEmbedDialog} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              <Code2 className="mr-2 h-4 w-4" /> Embed
            </Button>
          )}
          {mode === "owner" && (
            <>
              <Button disabled={saving} variant="outline" onClick={toggleSharing} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                <Share2 className="mr-2 h-4 w-4" /> {data.visibility === "unlisted" ? "Disable share" : "Enable share"}
              </Button>
              <Button disabled={saving} variant="outline" onClick={resetBracket} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                <RotateCcw className="mr-2 h-4 w-4" /> Reset
              </Button>
              <Button
                disabled={saving}
                variant="outline"
                onClick={() => setDeleteOpen(true)}
                className="border-red-500/30 bg-transparent text-red-300 hover:bg-red-500/10 hover:text-red-200"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {mode === "owner" && data.visibility === "unlisted" && shareUrl && (
        <section className="mb-4 flex flex-col gap-2 border border-white/10 bg-black/35 p-3 text-sm sm:flex-row sm:items-center">
          <span className="text-zinc-400">Share:</span>
          <code className="min-w-0 flex-1 truncate text-xs text-zinc-300">{shareUrl}</code>
          <Button size="sm" variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => copyText(shareUrl).then(() => toast({ title: "Link copied" }))}>
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
        </section>
      )}

      <div className="grid gap-4 xl:min-h-[calc(100dvh-12rem)] xl:grid-cols-[minmax(0,1fr)_320px] xl:items-stretch">
        <section className="min-h-[520px] overflow-auto border border-white/10 bg-black/35 p-3 xl:min-h-[calc(100dvh-12rem)]">
          <BracketRenderer
            matches={matches}
            activeFilter={{ type: "all" }}
            disableAnimations
            onMatchClick={mode === "owner" ? selectMatch : undefined}
            hoveredTeamId={hoveredTeamId}
            onTeamHover={setHoveredTeamId}
            cardWidth={260}
            cardHeight={86}
            roundGap={64}
            matchGap={18}
          />
        </section>

        <aside className="border border-white/10 bg-black/40 p-4">
          {mode === "share" ? (
            <div>
              <h2 className="text-base font-bold">Read-only view</h2>
              <p className="mt-2 text-sm text-zinc-400">Scores and advancement are controlled by the bracket owner.</p>
            </div>
          ) : selected ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold">R{selected.round}.M{selected.matchNumber}</h2>
                <p className="mt-1 text-xs text-zinc-500">Enter scores and choose the advancing team.</p>
              </div>
              <div className="space-y-2">
                <Label>{selected.team1?.name ?? "TBD"} score</Label>
                <Input type="number" min={0} value={team1Score} onChange={(e) => setTeam1Score(e.target.value)} className="border-white/10 bg-black/40 text-white" />
              </div>
              <div className="space-y-2">
                <Label>{selected.team2?.name ?? "TBD"} score</Label>
                <Input type="number" min={0} value={team2Score} onChange={(e) => setTeam2Score(e.target.value)} className="border-white/10 bg-black/40 text-white" />
              </div>
              <div className="grid gap-2">
                <Button disabled={saving || !selected.team1} onClick={() => saveMatch(selected.team1?.id)} className="bg-rose-600 text-white hover:bg-rose-500">
                  {selected.team1?.name ?? "Team 1"} wins
                </Button>
                <Button disabled={saving || !selected.team2} onClick={() => saveMatch(selected.team2?.id)} className="bg-rose-600 text-white hover:bg-rose-500">
                  {selected.team2?.name ?? "Team 2"} wins
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-base font-bold">Select a match</h2>
              <p className="mt-2 text-sm text-zinc-400">Click a bracket card to report a score and advance the winner.</p>
            </div>
          )}
        </aside>
      </div>

      <Dialog open={embedOpen} onOpenChange={setEmbedOpen}>
        <DialogContent className="border-white/10 bg-[#0a0a0c] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Embed bracket</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Paste this iframe on your site or stream overlay. The embed updates when you change match results.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <textarea
              readOnly
              value={embedCode}
              rows={5}
              className="w-full resize-none rounded-md border border-white/10 bg-black/50 p-3 font-mono text-xs text-zinc-300"
            />
            <Button
              className="w-full bg-rose-600 text-white hover:bg-rose-500"
              onClick={() => copyText(embedCode).then(() => toast({ title: "Embed code copied" }))}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy embed code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {mode === "owner" && (
        <AlertDialog open={deleteOpen} onOpenChange={(open) => !saving && setDeleteOpen(open)}>
          <AlertDialogContent className="border-white/10 bg-[#0a0a0c] text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete bracket?</AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                {`"${data.title}" will be permanently removed. Shared links will stop working.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={saving}
                className="bg-red-600 text-white hover:bg-red-500"
                onClick={(event) => {
                  event.preventDefault();
                  void deleteBracket();
                }}
              >
                {saving ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </main>
  );
};

export default PublicBracketWorkspace;
