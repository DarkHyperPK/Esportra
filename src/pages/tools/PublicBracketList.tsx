import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { getApiErrorMessage } from "@/lib/apiClient";
import { formatLocalTime } from "@/lib/timeUtils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useToolBracketActions, useToolBracketList, type ToolBracketRow } from "@/hooks/useToolBrackets";
import { CommandButton, CommandIconButton } from "@/components/management/CommandSurface";
import { EYEBROW_CLASS, StatusPill } from "@/components/ui/kit";
import { ConfirmBracketActionDialog } from "@/components/bracket/tool/ConfirmBracketActionDialog";
import { formatBracketFormat } from "./publicToolUtils";

const Panel = ({ title, body, action }: { title: string; body: string; action?: ReactNode }) => (
  <section className="border border-white/[0.07] bg-card px-6 py-10 sm:px-8">
    <h2 className="font-heading text-lg font-bold text-white">{title}</h2>
    <p className="mt-1.5 max-w-xl text-sm text-zinc-400">{body}</p>
    {action ? <div className="mt-6">{action}</div> : null}
  </section>
);

const BracketRow = ({ row, onDelete }: { row: ToolBracketRow; onDelete: () => void }) => (
  <li className="group flex items-center gap-4 bg-card px-4 py-3.5 transition-colors hover:bg-white/[0.03] sm:px-5">
    <Link to={`/tools/brackets/${row.id}`} className="min-w-0 flex-1 focus-visible:outline-none">
      <p className="truncate font-heading text-[15px] font-bold text-white group-hover:underline group-hover:decoration-white/30 group-hover:underline-offset-4">{row.title}</p>
      <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {[formatBracketFormat(row.format), `BO${row.bestOf}`, row.updatedAt ? formatLocalTime(row.updatedAt, "MMM d") : null].filter(Boolean).join(" · ")}
      </p>
    </Link>
    <StatusPill label={row.shared ? "Shared" : "Private"} tone={row.shared ? "accent" : "neutral"} className="hidden sm:inline-flex" />
    <CommandIconButton variant="ghost" label={`Delete ${row.title}`} onClick={onDelete} className="h-8 w-8 text-zinc-500 hover:text-red-300">
      <Trash2 />
    </CommandIconButton>
    <Link to={`/tools/brackets/${row.id}`} aria-hidden tabIndex={-1} className="text-zinc-600 transition-colors group-hover:text-white">
      <ArrowRight className="h-4 w-4" />
    </Link>
  </li>
);

/** The signed-in organizer's saved brackets, with the way into a new one. */
const PublicBracketList = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const signedIn = Boolean(user) && !authLoading;
  const list = useToolBracketList(signedIn);
  const { remove } = useToolBracketActions(undefined, ["tool-brackets", "mine"]);
  const [target, setTarget] = useState<ToolBracketRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const rows = list.data ?? [];

  const confirmDelete = async () => {
    if (!target) return;
    setDeleting(true);
    try {
      await remove(target.id);
      toast({ title: "Bracket deleted" });
      setTarget(null);
    } catch (err) {
      toast({ title: "Couldn't delete the bracket", description: getApiErrorMessage(err), variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const newBracket = (
    <CommandButton asChild>
      <Link to="/tools/brackets/new"><Plus className="h-4 w-4" /> New bracket</Link>
    </CommandButton>
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 text-white sm:px-6">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={EYEBROW_CLASS}>Public tools · Brackets</p>
          <h1 className="mt-2 font-heading text-[34px] font-black leading-none tracking-tight sm:text-[42px]">Your brackets</h1>
          <p className="mt-3 max-w-xl text-sm text-zinc-400">
            Build a single or double elimination bracket, run it match by match, and share a link or embed it on stream.
          </p>
        </div>
        <div className="flex gap-2">
          <CommandButton asChild variant="secondary"><Link to="/tools/map-veto">Map veto</Link></CommandButton>
          {newBracket}
        </div>
      </header>

      {!authLoading && !user ? (
        <Panel
          title="Sign in to see your saved brackets"
          body="Anyone can build and preview a bracket. Saving one keeps it on your account so you can run it, share it and come back to it."
          action={<div className="flex flex-wrap gap-2"><CommandButton asChild><Link to="/auth/signin?redirect=/tools/brackets">Sign in</Link></CommandButton><CommandButton asChild variant="secondary"><Link to="/tools/brackets/new">Build without saving</Link></CommandButton></div>}
        />
      ) : list.error ? (
        <Panel
          title="Couldn't load your brackets"
          body={getApiErrorMessage(list.error, "Check your connection and try again.")}
          action={<CommandButton variant="secondary" disabled={list.isFetching} onClick={() => void list.refetch()}>{list.isFetching ? "Trying again…" : "Try again"}</CommandButton>}
        />
      ) : authLoading || list.isPending ? (
        <ul aria-label="Loading brackets" className="grid gap-px bg-white/[0.06]">
          {[0, 1, 2].map((i) => <li key={i} className="h-[68px] animate-pulse bg-card" />)}
        </ul>
      ) : rows.length === 0 ? (
        <Panel title="No brackets yet" body="Paste your teams, pick a format and you'll have a bracket in under a minute." action={newBracket} />
      ) : (
        <ul className="grid gap-px border border-white/[0.07] bg-white/[0.06]">
          {rows.map((row) => <BracketRow key={row.id} row={row} onDelete={() => setTarget(row)} />)}
        </ul>
      )}

      <ConfirmBracketActionDialog
        open={target !== null}
        title={`Delete “${target?.title ?? ""}”?`}
        description="It's removed for good. Share links and embeds stop working."
        confirmLabel="Delete bracket"
        busyLabel="Deleting…"
        busy={deleting}
        onCancel={() => setTarget(null)}
        onConfirm={confirmDelete}
      />
    </main>
  );
};

export default PublicBracketList;
