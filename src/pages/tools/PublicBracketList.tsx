import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Share2, Trash2, Trophy } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
import { formatBracketFormat } from "./publicToolUtils";

const value = (row: any, ...keys: string[]) => {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key];
  return undefined;
};

const PublicBracketList = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { data = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["tool-brackets", "mine"],
    queryFn: () => apiClient.get<any[]>("/api/tools/brackets/mine"),
    enabled: !!user,
    retry: 1,
  });

  const showSignIn = !authLoading && !user;
  const showListLoading = authLoading || (!!user && isLoading);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/tools/brackets/${deleteTarget.id}`);
      await queryClient.invalidateQueries({ queryKey: ["tool-brackets", "mine"] });
      toast({ title: "Bracket deleted" });
      setDeleteTarget(null);
    } catch (err) {
      toast({ title: "Could not delete bracket", description: getApiErrorMessage(err), variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 text-white">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-rose-400">Public tools</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Bracket Builder</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Generate a bracket from pasted teams or a file, then save it to your account when you are ready to run it.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
            <Link to="/tools/map-veto">Map veto</Link>
          </Button>
          <Button asChild className="bg-rose-600 text-white hover:bg-rose-500">
            <Link to="/tools/brackets/new"><Plus className="mr-2 h-4 w-4" /> New bracket</Link>
          </Button>
        </div>
      </div>

      {showSignIn ? (
        <section className="border border-white/10 bg-black/35 p-8">
          <Trophy className="mb-4 h-8 w-8 text-rose-400" />
          <h2 className="text-xl font-bold">Sign in to view saved brackets</h2>
          <p className="mt-2 text-sm text-zinc-400">Preview generation is public. Saving and running brackets keeps them attached to your account.</p>
          <Button asChild className="mt-5 bg-white text-black hover:bg-zinc-200">
            <Link to="/auth/signin?redirect=/tools/brackets">Sign in</Link>
          </Button>
        </section>
      ) : error ? (
        <section className="border border-red-500/30 bg-red-500/10 p-5">
          <p className="text-sm text-red-200">{getApiErrorMessage(error, "Could not load your saved brackets.")}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 border-red-400/30 bg-transparent text-red-100 hover:bg-red-500/10"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? "Retrying..." : "Try again"}
          </Button>
        </section>
      ) : showListLoading ? (
        <section className="border border-white/10 bg-black/35 p-8 text-sm text-zinc-400">Loading saved brackets...</section>
      ) : data.length === 0 ? (
        <section className="border border-white/10 bg-black/35 p-8">
          <h2 className="text-xl font-bold">No saved brackets yet</h2>
          <p className="mt-2 text-sm text-zinc-400">Create a single or double elimination bracket and it will appear here.</p>
        </section>
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.map((row: any) => {
            const id = value(row, "id");
            const shareToken = value(row, "shareToken", "share_token");
            return (
              <article key={id} className="border border-white/10 bg-black/35 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold">{value(row, "title") || "Untitled bracket"}</h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatBracketFormat(String(value(row, "format") || ""))} · BO{value(row, "bestOf", "best_of") || 1}
                    </p>
                  </div>
                  {shareToken && <Share2 className="h-4 w-4 shrink-0 text-rose-300" />}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button asChild size="sm" className="flex-1 bg-white text-black hover:bg-zinc-200">
                    <Link to={`/tools/brackets/${id}`}>Open runner</Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-red-500/30 bg-transparent text-red-300 hover:bg-red-500/10 hover:text-red-200"
                    onClick={() => setDeleteTarget({ id: String(id), title: value(row, "title") || "Untitled bracket" })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent className="border-white/10 bg-[#0a0a0c] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bracket?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {deleteTarget ? `"${deleteTarget.title}" will be permanently removed. Shared links will stop working.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-500"
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default PublicBracketList;
