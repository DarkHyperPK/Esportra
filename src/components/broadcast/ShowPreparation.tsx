import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CommandButton } from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import { ShowSettingsDialog } from "./ShowSettingsDialog";
import { PairNodeDialog } from "./PairNodeDialog";
import { PreparationStepContent } from "./PreparationStepContent";
import { useShowPreparation } from "@/hooks/useShowPreparation";
import {
  SETUP_STEPS,
  isBroadcastEligible,
  matchTime,
} from "@/services/broadcast/broadcastSetup";
import { SetupSidebar } from "./SetupSidebar";
import "./broadcast-setup.css";

export function ShowPreparation({
  showId,
}: {
  showId: string;
  orgId?: string;
}) {
  const [params, setParams] = useSearchParams();
  const step = Math.max(0, Math.min(7, Math.trunc(Number(params.get("step")) || 0)));
  const [settings, setSettings] = useState(false),
    [pairing, setPairing] = useState(false),
    [previewed, setPreviewed] = useState("");
  const prepared = useShowPreparation(showId),
    { showQuery, show, online } = prepared;
  const slots =
    show?.matchSlots.filter((slot) =>
      isBroadcastEligible(slot.matchStatus ?? slot.status),
    ) ?? [];
  const match = params.get("match")
    ? slots.find((slot) => slot.matchId === params.get("match"))
    : slots[0];
  const screens =
    prepared.segments.data?.filter(
      (segment) => !segment.matchId || segment.matchId === match?.matchId,
    ) ?? [];
  const optional = step >= 4 && step <= 6;
  const checks = [
    online > 0,
    !!match,
    !!match && previewed === match.matchId,
    screens.length > 0,
    !!prepared.sponsors.data?.length,
    !!prepared.talent.data?.length,
    !!prepared.crew.data?.crew.length,
    prepared.push.isSuccess,
  ];
  function select(index: number, selectedMatch = match?.matchId) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("step", String(index));
      if (selectedMatch) next.set("match", selectedMatch);
      return next;
    });
  }
  if (showQuery.isLoading)
    return (
      <p role="status" className="text-zinc-400">
        Loading broadcast setup…
      </p>
    );
  if (showQuery.isError || !show)
    return (
      <InlineNotice tone="critical">
        Could not load this broadcast.{" "}
        <CommandButton variant="ghost" onClick={() => void showQuery.refetch()}>
          Retry
        </CommandButton>
      </InlineNotice>
    );
  const canContinue =
    step === 0
      ? online > 0
      : step === 1 || step === 2
        ? !!match
        : step === 3
          ? screens.length > 0 && !prepared.segments.isError
          : true;
  return (
    <div className="broadcast-setup">
      <header className="setup-header">
        <div>
          <p className="setup-eyebrow">Esportra Air · Broadcast setup</p>
          <h1>Prepare your match.</h1>
          <p>{show.tournamentName || show.title}</p>
        </div>
        <div className="setup-header-actions">
          {show.tournamentSlug && (
            <CommandButton asChild variant="ghost">
              <Link
                to={`/organizer/tournament/${encodeURIComponent(show.tournamentSlug)}?tab=broadcast`}
              >
                Back to tournament
              </Link>
            </CommandButton>
          )}
          <CommandButton variant="ghost" onClick={() => setSettings(true)}>
            Show settings
          </CommandButton>
        </div>
      </header>
      <div className="setup-workspace">
        <SetupSidebar
          step={step}
          checks={checks}
          attention={[
            prepared.nodes.isError,
            !!params.get("match") && !match,
            false,
            prepared.segments.isError,
            prepared.sponsors.isError ||
              !!prepared.sponsors.data?.some(
                (item) => item.isActive && !item.logoUrl,
              ),
            prepared.talent.isError,
            prepared.crew.isError,
            prepared.push.isError,
          ]}
          onSelect={select}
        />
        <main className="setup-main">
          <div
            className="setup-match-context"
            aria-label="Selected broadcast match"
          >
            <span className="setup-eyebrow">Selected match</span>
            <strong>
              {match
                ? match.matchTitle || `${match.teamA} vs ${match.teamB}`
                : "Choose a match to begin"}
            </strong>
            <span>
              {show.tournamentName}{" "}
              {match ? `· ${matchTime(match.scheduledAt)}` : ""}
            </span>
          </div>
          <div className="setup-step-heading">
            <div>
              <p className="setup-eyebrow">
                Step {step + 1} of 8{optional ? " · Optional" : ""}
              </p>
              <h2>{SETUP_STEPS[step]}</h2>
            </div>
            {online > 0 && (
              <span className="setup-connection">Desktop connected</span>
            )}
          </div>
          <PreparationStepContent
            step={step}
            show={show}
            prepared={prepared}
            match={match}
            onSelect={(id) => select(1, id)}
            onEdit={() => setSettings(true)}
            onPair={() => setPairing(true)}
          />
          <footer className="setup-footer">
            <CommandButton
              variant="ghost"
              disabled={step === 0}
              onClick={() => select(step - 1)}
            >
              Back
            </CommandButton>
            {step < 7 && (
              <CommandButton
                disabled={!canContinue}
                onClick={() => {
                  if (step === 2 && match) setPreviewed(match.matchId);
                  select(step + 1);
                }}
              >
                {optional && !checks[step]
                  ? "Skip for now"
                  : `Continue to ${SETUP_STEPS[step + 1].toLowerCase()}`}
              </CommandButton>
            )}
          </footer>
        </main>
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
    </div>
  );
}
