import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CommandHeader,
  CommandSection,
  CommandButton,
} from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import { ShowSettingsDialog } from "./ShowSettingsDialog";
import { PairNodeDialog } from "./PairNodeDialog";
import { PreparationStepContent } from "./PreparationStepContent";
import { useShowPreparation } from "@/hooks/useShowPreparation";

const steps = [
  "Show identity",
  "Tournament",
  "Matches & codes",
  "Desktop nodes",
  "Crew",
  "On-air talent",
  "Sponsors",
  "Rundown",
  "Send to desktop",
];
export function ShowPreparation({
  showId,
}: {
  showId: string;
  orgId?: string;
}) {
  const [params, setParams] = useSearchParams(),
    step = Math.max(0, Math.min(8, Number(params.get("step")) || 0));
  const [settings, setSettings] = useState(false),
    [pairing, setPairing] = useState(false);
  const prepared = useShowPreparation(showId);
  const { showQuery, show, checks } = prepared;
  const base = `/broadcast/shows/${showId}`;
  function select(index: number) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("step", String(index));
      return next;
    });
  }
  if (showQuery.isLoading)
    return (
      <p role="status" className="text-zinc-400">
        Loading show preparation…
      </p>
    );
  if (showQuery.isError || !show)
    return (
      <InlineNotice tone="critical">
        Could not load show.{" "}
        <button onClick={() => void showQuery.refetch()}>Retry</button>
      </InlineNotice>
    );
  const optional = step >= 4 && step <= 6;
  return (
    <>
      {show.tournamentSlug && (
        <CommandButton asChild variant="ghost" className="mb-4 w-fit">
          <Link
            to={`/organizer/tournament/${encodeURIComponent(show.tournamentSlug)}?tab=broadcast`}
          >
            Back to tournament broadcast
          </Link>
        </CommandButton>
      )}
      <CommandHeader
        eyebrow={`PREPARE · ${show.title}`}
        title="Build your show."
        description="Nine steps from planning to the production desk. Crew, talent and sponsors are optional."
      />
      <label className="mb-4 block text-sm text-zinc-400 lg:hidden">
        Setup step
        <select
          className="mt-2 h-12 w-full border border-white/20 bg-zinc-950 px-3 text-white"
          value={step}
          onChange={(event) => select(Number(event.target.value))}
        >
          {steps.map((label, index) => (
            <option key={label} value={index}>
              {index + 1} / 9 · {label}
              {checks[index] ? " ✓" : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav
          className="hidden border border-white/10 p-3 lg:block"
          aria-label="Setup steps"
        >
          {steps.map((label, index) => (
            <button
              key={label}
              className={`flex min-h-12 w-full items-center gap-3 border-l-2 px-3 py-3 text-left text-sm focus-visible:outline-white ${step === index ? "border-white bg-white/10 text-white" : "border-transparent text-zinc-400"}`}
              onClick={() => select(index)}
              aria-current={step === index ? "step" : undefined}
            >
              <span
                className={checks[index] ? "text-emerald-400" : "text-zinc-500"}
              >
                {checks[index] ? "✓" : String(index + 1).padStart(2, "0")}
              </span>
              {label}
            </button>
          ))}
        </nav>
        <CommandSection>
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-white">{steps[step]}</h2>
            <span className="font-mono text-xs text-zinc-500">
              {step + 1} / 9{optional ? " · OPTIONAL" : ""}
            </span>
          </div>
          <PreparationStepContent
            step={step}
            show={show}
            prepared={prepared}
            onEdit={() => setSettings(true)}
            onPair={() => setPairing(true)}
          />
          <div className="mt-10 flex justify-between border-t border-white/10 pt-5">
            <CommandButton
              variant="ghost"
              disabled={step === 0}
              onClick={() => select(step - 1)}
            >
              Back
            </CommandButton>
            {step < 8 ? (
              <CommandButton onClick={() => select(step + 1)}>
                {optional && !checks[step] ? "Skip this step" : "Continue"}
              </CommandButton>
            ) : (
              <CommandButton asChild variant="ghost">
                <Link to={base}>Open show plan</Link>
              </CommandButton>
            )}
          </div>
        </CommandSection>
      </div>
      <ShowSettingsDialog
        show={show}
        orgId={show.orgId}
        open={settings}
        onOpenChange={setSettings}
      />
      <PairNodeDialog
        orgId={show.orgId}
        open={pairing}
        onOpenChange={setPairing}
      />
    </>
  );
}
