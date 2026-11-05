import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { CommandButton } from '@/components/management/CommandSurface';
import { getCountryFlagUrl } from '@/utils/countries';
import { countryName } from '@/lib/countryAreas';
import { LobbyRail, type RailSlot } from '../shared/LobbyRail';
import { DEMO_LOBBY } from './demoData';

type Step = 'browse' | 'requested' | 'accepted' | 'full';

/** How long the sample host takes to accept, and the last sample player takes to join (ms). */
export const DEMO_ACCEPT_MS = 1400;
export const DEMO_FILL_MS = 1300;

/** Lobby tab of the public demo: request a role in a sample lobby and watch it fill to five. */
export function DemoLobby() {
  const [step, setStep] = useState<Step>('browse');
  const [role, setRole] = useState(DEMO_LOBBY.wanted[0]);

  useEffect(() => {
    if (step === 'requested') { const t = window.setTimeout(() => setStep('accepted'), DEMO_ACCEPT_MS); return () => window.clearTimeout(t); }
    if (step === 'accepted') { const t = window.setTimeout(() => setStep('full'), DEMO_FILL_MS); return () => window.clearTimeout(t); }
    return undefined;
  }, [step]);

  const slots: (RailSlot | null)[] = [
    { ...DEMO_LOBBY.host }, ...DEMO_LOBBY.members.map((m) => ({ ...m })),
    step === 'accepted' || step === 'full' ? { name: 'You', you: true, role } : null,
    step === 'full' ? { ...DEMO_LOBBY.lastToJoin } : null,
  ];
  const stillWanted = DEMO_LOBBY.wanted.filter((item) => !(step !== 'browse' && step !== 'requested' && item === role));
  const status = {
    browse: 'Pick the role you will play and ask for a slot.',
    requested: `Request sent to ${DEMO_LOBBY.host.name}…`,
    accepted: `${DEMO_LOBBY.host.name} accepted you. One slot left.`,
    full: 'Lobby full. The group chat is open: share the party code and queue.',
  }[step];

  return (
    <section className="su-demo-lobby" aria-label="Sample lobby">
      <header>
        <h3>{DEMO_LOBBY.title}</h3>
        <p className="su-demo-lobby-meta">
          <span>{DEMO_LOBBY.rank}</span>
          <span className="su-demo-flags">
            {DEMO_LOBBY.countries.map((code) => <img key={code} src={getCountryFlagUrl(code)} alt={countryName(code)} title={countryName(code)} />)}
          </span>
          <span>Mic required</span>
        </p>
      </header>
      <LobbyRail slots={slots} wanted={stillWanted} label="Sample lobby" />
      <p className="su-demo-lobby-status" role="status">{status}</p>
      {step === 'browse' && (
        <div className="su-demo-lobby-pick">
          <div className="su-choice" role="radiogroup" aria-label="Your role">
            {DEMO_LOBBY.wanted.map((item) => (
              <button key={item} type="button" role="radio" aria-checked={role === item} onClick={() => setRole(item)}>{item}</button>
            ))}
          </div>
          <CommandButton variant="primary" size="lg" slide onClick={() => setStep('requested')}>Ask to join as {role}</CommandButton>
        </div>
      )}
      {step === 'full' && (
        <CommandButton variant="secondary" size="md" onClick={() => setStep('browse')}><RotateCcw size={14} aria-hidden /> Run it again</CommandButton>
      )}
    </section>
  );
}
