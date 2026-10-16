import { BroadcastShell } from './BroadcastShell';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Settings2 } from 'lucide-react';
import { CommandButton } from '@/components/management/CommandSurface';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { InlineNotice } from '@/components/ui/kit/InlineNotice';
import { useShowPreparation } from '@/hooks/useShowPreparation';
import { useBroadcastSetupNavigation } from '@/hooks/useBroadcastSetupNavigation';
import { SETUP_STEPS } from '@/services/broadcast/broadcastSetup';
import { ShowSettingsDialog } from './ShowSettingsDialog';
import { PairNodeDialog } from './PairNodeDialog';
import { PreparationStepContent } from './PreparationStepContent';
import { SetupSidebar } from './SetupSidebar';
import { SetupMatchHeading } from './SetupMatchHeading';
import { BroadcastJourney } from './BroadcastJourney';
import './broadcast-setup.css';

const NEXT_ACTIONS = ['Choose a match', 'Preview the HUD', 'Choose broadcast screens', 'Continue to sponsors', 'Continue to talent', 'Continue to crew', 'Review broadcast setup'];
const HINTS = [
  'Pair the PC where you will produce this broadcast.',
  'Select the match your audience will watch.',
  'Check your teams and the graphics viewers will see.',
  'Preview a template or individual screen, then add it to your sequence.',
  'Use saved sponsor assets or add a sponsor for this broadcast.',
  'Add commentators and hosts, if your broadcast needs them.',
  'Invite your production team, or continue as a solo producer.',
  'Check the setup, then publish it for your production PC.',
];

export function ShowPreparation({ showId }: { showId: string; orgId?: string }) {
  const [settings, setSettings] = useState(false), [pairing, setPairing] = useState(false);
  const [appearance, setAppearance] = useState({ dirty: false, saving: false });
  const [pendingStep, setPendingStep] = useState<number | null>(null);
  const prepared = useShowPreparation(showId), { showQuery, show, online } = prepared;
  const { step, match, checks, blocked, blockedReason, select, next, invalidMatch, canPublish } = useBroadcastSetupNavigation(showId, prepared);
  function requestStep(index: number) {
    if (step === 2 && appearance.dirty && index !== 2) setPendingStep(index);
    else select(index);
  }
  if (showQuery.isLoading) return <BroadcastShell focused><div className="broadcast-loading" role="status">Loading broadcast setup…</div></BroadcastShell>;
  if (showQuery.isError || !show) return <BroadcastShell focused><InlineNotice tone="critical">Could not load this broadcast. <CommandButton variant="ghost" onClick={() => void showQuery.refetch()}>Retry</CommandButton></InlineNotice></BroadcastShell>;
  const optional = step >= 4 && step <= 6;
  const published = checks[7];
  const checking = step === 0 && prepared.nodes.isLoading;
  const retryConnection = step === 0 && prepared.nodes.isError;
  const needsPairing = step === 0 && online === 0 && !checking && !retryConnection;
  return <BroadcastShell focused sidebar={<SetupSidebar step={step} checks={checks} attention={[
        prepared.nodes.isError, invalidMatch, false, prepared.segments.isError,
        prepared.sponsors.isError || !!prepared.sponsors.data?.some(item => item.isActive && !item.logoUrl),
        prepared.talent.isError, prepared.crew.isError, prepared.push.isError,
      ]} onSelect={requestStep} />}><div className="broadcast-setup">
    <header className="setup-header">
      <div className="setup-breadcrumb"><Link to="/broadcast/shows">Broadcasts</Link><span>/</span><span>{show.title}</span></div>
      <div className="setup-header-actions">
        {show.tournamentSlug && <Link to={`/organizer/tournament/${encodeURIComponent(show.tournamentSlug)}?tab=broadcast`}>Back to tournament</Link>}
        <CommandButton variant="ghost" size="sm" onClick={() => setSettings(true)}><Settings2 size={14} /> Show settings</CommandButton>
      </div>
    </header>
    <SetupMatchHeading show={show} match={match} online={online} connection={prepared.nodes.isLoading ? "checking" : prepared.nodes.isError ? "unavailable" : undefined} />
    <BroadcastJourney published={checks[7]} />
    <div className="setup-workspace">
      <main className="setup-main">
        <div className="setup-step-heading"><div><p className="setup-eyebrow">{optional ? 'Optional details' : 'Broadcast setup'} <span>Step {step + 1} / 8</span></p><h2>{step === 7 && published ? "Continue in Esportra Air" : SETUP_STEPS[step]}</h2><p>{step === 7 && published ? "Your next steps are on the production PC." : HINTS[step]}</p></div></div>
        {invalidMatch && <InlineNotice tone="warning">The previous match is no longer available for broadcast. <button className="underline" onClick={() => select(1)}>Choose another match</button></InlineNotice>}
        {step > 1 && !match ? <div className="broadcast-empty"><h3>Choose a match first</h3><p>Preview and screens use the teams from your selected match.</p><CommandButton variant="secondary" onClick={() => select(1)}>Choose a match</CommandButton></div> : <PreparationStepContent step={step} show={show} prepared={prepared} match={match} onSelect={id => select(1, id)} onEdit={() => setSettings(true)} onPair={() => setPairing(true)} onAppearanceStatus={setAppearance} />}
        <footer className="setup-footer">
          <div><span className="setup-footer-label">{step === 7 && published ? 'Setup published' : step === 7 ? 'Finish on your production PC' : 'Next action'}</span><p>{step === 2 && appearance.dirty ? "Save your HUD changes before choosing screens." : blocked ? blockedReason : optional ? 'You can add these details later.' : step === 7 && published ? 'Next: open Air and confirm this match is loaded.' : step === 7 ? 'Publishing does not change OBS output.' : NEXT_ACTIONS[step]}</p></div>
          <div className="setup-footer-actions"><CommandButton variant="ghost" disabled={step === 0} onClick={() => requestStep(step - 1)}><ArrowLeft size={14} /> Back</CommandButton>
          {step === 2 && appearance.dirty ? <CommandButton type="submit" form={`air-hud-appearance-${showId}`} disabled={appearance.saving}>{appearance.saving ? 'Saving HUD changes…' : 'Save HUD changes'}</CommandButton> : step === 7 ? <CommandButton variant={published ? "secondary" : "primary"} type="submit" form={`air-publish-${showId}`} disabled={!canPublish}>{prepared.push.isPending ? "Sending setup…" : published ? "Send setup again" : "Send match to Air"}<ArrowRight size={14} /></CommandButton> : step < 7 && <CommandButton disabled={checking || (blocked && !needsPairing && !retryConnection)} onClick={retryConnection ? () => void prepared.nodes.refetch() : needsPairing ? () => setPairing(true) : next}>{checking ? "Checking connection…" : retryConnection ? "Retry connection" : needsPairing ? 'Generate pairing code' : optional && !checks[step] ? 'Skip for now' : NEXT_ACTIONS[step]}<ArrowRight size={14} /></CommandButton>}</div>
        </footer>
      </main>
    </div>
    <AlertDialog open={pendingStep !== null} onOpenChange={open => { if (!open) setPendingStep(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Keep your HUD changes?</AlertDialogTitle><AlertDialogDescription>Your appearance changes have not been saved. Keep editing to save them, or discard them to leave this step.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={() => { if (pendingStep !== null) select(pendingStep); setPendingStep(null); setAppearance({ dirty: false, saving: false }); }}>Discard changes</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <ShowSettingsDialog show={show} orgId={show.orgId} open={settings} onOpenChange={setSettings} />
    <PairNodeDialog orgId={show.orgId} open={pairing} onOpenChange={setPairing} />
  </div></BroadcastShell>;
}
