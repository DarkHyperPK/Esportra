import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Monitor, Plus } from 'lucide-react';
import { CommandButton } from '@/components/management/CommandSurface';
import { BroadcastShell } from '@/components/broadcast/BroadcastShell';
import { BroadcastJourney } from '@/components/broadcast/BroadcastJourney';
import { PairNodeDialog } from '@/components/broadcast/PairNodeDialog';
import { InlineNotice } from '@/components/ui/kit/InlineNotice';
import { useBroadcastHome } from '@/hooks/useBroadcastPlanning';
import { useMyOrganizationId } from '@/hooks/useMyOrganizationId';
import { useNow } from '@/hooks/useNow';

export default function BroadcastHomePage() {
  const orgId = useMyOrganizationId(), home = useBroadcastHome(orgId), now = useNow(5000);
  const [pairing, setPairing] = useState(false);
  const online = home.data?.nodes.filter(node => node.isActive && node.lastSeenAt && now - Date.parse(node.lastSeenAt) >= -5000 && now - Date.parse(node.lastSeenAt) < 30000).length ?? 0;
  const active = home.data?.shows.filter(show => ['draft','scheduled','live'].includes(show.status)).sort((a,b) => Number(b.status === 'live') - Number(a.status === 'live')) ?? [];
  const featured = active[0], live = featured?.status === 'live';
  return <BroadcastShell>
    <header className="broadcast-overview-header"><div><h1>Broadcast workspace</h1><p>Prepare your match here. Produce it in Esportra Air.</p></div>
      {orgId && featured && <CommandButton variant="ghost" asChild><Link to="/broadcast/shows?create=1"><Plus size={14} /> Create broadcast</Link></CommandButton>}
    </header>
    {!orgId && <InlineNotice tone="warning">Choose an organizer organization to manage broadcasts. For an independent broadcast, open Independent projects.</InlineNotice>}
    {home.isLoading && orgId && <div role="status" className="broadcast-loading">Loading your broadcast workspace…</div>}
    {home.isError && <InlineNotice tone="critical">Could not load the workspace. <button className="underline" onClick={() => void home.refetch()}>Retry</button></InlineNotice>}
    {home.data && <>
      <section className="broadcast-feature" aria-label="Next broadcast action"><div className="broadcast-feature-copy">
        <span className="broadcast-caption">{featured ? live ? 'Live broadcast' : 'Continue preparation' : 'Your first broadcast'}</span>
        <h2>{featured?.title || 'A match. A plan. Your broadcast.'}</h2>
        <p>{featured?.tournamentName || (featured ? 'Link a tournament in broadcast settings.' : 'Choose a tournament match. Its teams, players and saved assets come with it.')}</p>
        <CommandButton asChild><Link to={featured ? `/broadcast/shows/${featured.id}/${live ? 'activity' : 'setup'}` : '/broadcast/shows?create=1'}>{featured ? live ? 'View broadcast activity' : 'Continue setup' : 'Create broadcast'}<ArrowRight size={15} /></Link></CommandButton>
      </div><aside className="broadcast-feature-aside"><Monitor size={22} /><h3>{online ? `${online} desktop${online === 1 ? '' : 's'} online` : 'Connect your production PC'}</h3><p>{online ? 'Desktop heartbeat received within the last 30 seconds. OBS and game capture are checked in Air.' : 'Generate a pairing code here, then enter it in Air on your production PC.'}</p><button className="broadcast-text-link" onClick={() => setPairing(true)}>{online ? 'Pair another desktop' : 'Pair desktop app'}<ArrowRight size={13} /></button></aside></section>
      <BroadcastJourney />
      <div className="broadcast-section-heading"><h2>Broadcasts in progress</h2><Link to="/broadcast/shows" className="broadcast-text-link">All broadcasts <ArrowRight size={13} /></Link></div>
      {!active.length ? <p className="text-zinc-400">Your saved broadcasts appear here. Completed broadcasts stay in All broadcasts.</p> : <ul className="broadcast-ledger">{active.map(show => <li key={show.id}><div><strong>{show.title}</strong><small>{show.tournamentName || 'Tournament not linked'} · {show.status === 'live' ? 'Marked live' : show.status === 'draft' ? 'Draft' : 'Scheduled'}</small></div><Link to={`/broadcast/shows/${show.id}/${show.status === 'live' ? 'activity' : 'setup'}`}>{show.status === 'live' ? 'View activity' : 'Continue setup'}<ArrowRight size={14} /></Link></li>)}</ul>}
      <p className="broadcast-footnote"><Monitor size={16} /> Web preparation does not start streaming or change OBS output.</p>
    </>}
    {orgId && <PairNodeDialog orgId={orgId} open={pairing} onOpenChange={setPairing} />}
  </BroadcastShell>;
}
