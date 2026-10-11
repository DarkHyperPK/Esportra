import { useState } from "react";
import { ArrowDown, ArrowUp, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicVetoOverlayConfig } from "./PublicVetoOverlayConfig";
import { Switch } from "@/components/ui/switch";
import { generateSequence } from "@/services/vetoService/sequences";
import { type PublicVetoState, type PublicVetoStep } from "./publicMapVetoUtils";

type Props = {
  state: PublicVetoState;
  acting: boolean;
  onSave: (tossEnabled: boolean, sequence: PublicVetoStep[]) => Promise<void>;
};

const toBlocks = (sequence: PublicVetoStep[]) => {
  const blocks: PublicVetoStep[][] = [];
  for (let index = 0; index < sequence.length; index++) {
    const step = sequence[index];
    if (step.action === "pick" && sequence[index + 1]?.action === "pick_side") {
      blocks.push([step, sequence[++index]]);
    } else {
      blocks.push([step]);
    }
  }
  return blocks;
};

const numberBlocks = (blocks: PublicVetoStep[][]) =>
  blocks.flat().map((step, index) => ({ ...step, actionNumber: index + 1 }));

export const PublicVetoHostSettings = ({ state, acting, onSave }: Props) => {
  const [tossEnabled, setTossEnabled] = useState(state.tossEnabled);
  const [sequence, setSequence] = useState(state.sequence);
  const [expanded, setExpanded] = useState(false);
  const blocks = toBlocks(sequence);
  const canEdit = sequence.length > 0 && !acting && !state.tossWinnerTeamId &&
    (state.status === "pending_toss" || state.status === "in_progress" && state.currentActionNumber === 1);
  const changed = tossEnabled !== state.tossEnabled || JSON.stringify(sequence) !== JSON.stringify(state.sequence);

  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= blocks.length - 1) return;
    const reordered = [...blocks];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setSequence(numberBlocks(reordered));
  };

  const setTeam = (actionNumber: number, team: "T1" | "T2") =>
    setSequence((current) => current.map((step) =>
      step.actionNumber === actionNumber ? { ...step, team } : step));

  const restoreDefaultOrder = () => {
    const bestOf = state.bestOf === 3 || state.bestOf === 5 ? state.bestOf : 1;
    setSequence(generateSequence(state.maps.length, bestOf)
      .map((step) => ({ ...step, isDecider: Boolean(step.isDecider) })));
  };

  return (
    <section className="border border-white/10 bg-card p-4 sm:p-5" aria-label="Host veto controls">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-rose-400">Host controls</p>
          <h3 className="mt-1 font-heading text-lg font-black text-white">Stream overlay and veto settings</h3>
        </div>
      </div>
      {state.overlayToken ? <PublicVetoOverlayConfig token={state.overlayToken} /> : (
        <p className="mt-4 text-sm text-amber-200">A stream overlay link is not available for this room yet.</p>
      )}

      <button type="button" onClick={() => setExpanded((value) => !value)}
        className="mt-4 flex w-full items-center gap-2 border-t border-white/10 pt-4 text-left text-xs font-bold uppercase tracking-[0.16em] text-zinc-300 hover:text-white"
        aria-expanded={expanded}>
        <Settings2 className="h-4 w-4 text-rose-400" /> Veto settings {expanded ? "−" : "+"}
      </button>
      {expanded && (
        <div className="mt-4 space-y-4">
          <p className="text-xs text-zinc-400">Set the order and toss before the toss runs or a map action begins.</p>
          <div className="flex items-center justify-between gap-4 border border-white/10 bg-black/40 p-3">
            <div>
              <p className="text-sm font-semibold text-white">Coin toss</p>
              <p className="text-xs text-zinc-400">When off, Team A takes the first configured turn.</p>
            </div>
            <Switch checked={tossEnabled} onCheckedChange={setTossEnabled} disabled={!canEdit} aria-label="Enable coin toss" />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Ban and pick order</p>
            <p className="mb-3 text-xs text-zinc-500">First side means the team chosen to open after toss; second side is its opponent. Picks keep their side choices when moved.</p>
            {blocks.length === 0 && <p className="border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-300">The veto order is not available for this room yet.</p>}
            <ol className="space-y-1">
              {blocks.map((block, index) => (
                <li key={block[0].actionNumber} className="flex flex-wrap items-center gap-2 border border-white/[0.07] bg-white/[0.02] px-3 py-2">
                  <span className="w-7 font-mono text-xs font-bold text-rose-400">{String(block[0].actionNumber).padStart(2, "0")}</span>
                  <span className="min-w-24 flex-1 text-xs font-bold uppercase tracking-wide text-white">
                    {block[0].isDecider ? "Decider side" : block[0].action === "pick" ? "Pick + side" : "Ban"}
                  </span>
                  {block.map((step) => (
                    <label key={step.actionNumber} className="flex items-center gap-1 text-[11px] text-zinc-400">
                      {block.length > 1 ? step.action === "pick" ? "Pick" : "Side" : "Team"}
                      <select value={step.team} disabled={!canEdit} onChange={(event) => setTeam(step.actionNumber, event.target.value as "T1" | "T2")}
                        className="h-8 border border-white/15 bg-[#17171b] px-2 text-xs text-white">
                        <option value="T1">First side</option><option value="T2">Second side</option>
                      </select>
                    </label>
                  ))}
                  {!block[0].isDecider && (
                    <div className="flex gap-1">
                      <button type="button" aria-label={`Move step ${index + 1} up`} disabled={!canEdit || index === 0} onClick={() => move(index, -1)} className="p-2 text-zinc-400 hover:text-white disabled:opacity-25"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" aria-label={`Move step ${index + 1} down`} disabled={!canEdit || index >= blocks.length - 2} onClick={() => move(index, 1)} className="p-2 text-zinc-400 hover:text-white disabled:opacity-25"><ArrowDown className="h-4 w-4" /></button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={!canEdit || !changed} onClick={() => void onSave(tossEnabled, sequence)}>Save settings</Button>
            <Button type="button" variant="outline" disabled={!canEdit} onClick={() => { setTossEnabled(state.tossEnabled); setSequence(state.sequence); }}>Discard edits</Button>
            <Button type="button" variant="ghost" disabled={!canEdit} onClick={restoreDefaultOrder}>Restore default order</Button>
          </div>
          {!canEdit && blocks.length > 0 && <p className="text-xs text-amber-300">Reset the veto to edit its settings.</p>}
        </div>
      )}
    </section>
  );
};
