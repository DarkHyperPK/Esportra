import React from "react";
import { Link } from "react-router-dom";
import { Plus, Share2, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { ApiError, getApiErrorMessage } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { formatBracketFormat } from "./publicToolUtils";

const value = (row: any, ...keys: string[]) => {
  for (const key of keys) if (row?.[key] !== undefined && row?.[key] !== null) return row[key];
  return undefined;
};

const PublicBracketList = () => {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["tool-brackets", "mine"],
    queryFn: () => apiClient.get<any[]>("/api/tools/brackets/mine"),
    retry: (count, err) => !(err instanceof ApiError && (err.status === 401 || err.status === 404)) && count < 2,
  });

  const unauthorized = error instanceof ApiError && error.status === 401;
  const toolsApiMissing = error instanceof ApiError && error.status === 404;

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

      {unauthorized ? (
        <section className="border border-white/10 bg-black/35 p-8">
          <Trophy className="mb-4 h-8 w-8 text-rose-400" />
          <h2 className="text-xl font-bold">Sign in to view saved brackets</h2>
          <p className="mt-2 text-sm text-zinc-400">Preview generation is public. Saving and running brackets keeps them attached to your account.</p>
          <Button asChild className="mt-5 bg-white text-black hover:bg-zinc-200">
            <Link to="/auth/signin?redirect=/tools/brackets">Sign in</Link>
          </Button>
        </section>
      ) : toolsApiMissing ? (
        <section className="border border-amber-500/30 bg-amber-500/10 p-8">
          <Trophy className="mb-4 h-8 w-8 text-amber-300" />
          <h2 className="text-xl font-bold">Saved brackets are not connected yet</h2>
          <p className="mt-2 text-sm text-amber-100/80">
            This frontend is pointed at an API that does not have the public tools routes deployed. You can still open the builder and generate a local preview.
          </p>
          <Button asChild className="mt-5 bg-white text-black hover:bg-zinc-200">
            <Link to="/tools/brackets/new">Open builder</Link>
          </Button>
        </section>
      ) : error ? (
        <section className="border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">{getApiErrorMessage(error)}</section>
      ) : isLoading ? (
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
                <Button asChild size="sm" className="mt-4 w-full bg-white text-black hover:bg-zinc-200">
                  <Link to={`/tools/brackets/${id}`}>Open runner</Link>
                </Button>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
};

export default PublicBracketList;
