import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { useCatalogGameRoles, useCatalogRankTiers, useCatalogRegions } from '@/hooks/competitive/useCatalog';
import { useLfgCaptainTeams, useMyGameStats, useSaveLfgDraft } from '@/hooks/competitive/useLfg';
import { VALORANT_AGENTS } from '@/lib/valorantAgents';
import { LfgWorkspace } from '@/components/competitive/LfgWorkspace';
import { LfgLanguagePicker } from '@/components/competitive/LfgLanguagePicker';
import { LfgListingCard } from '@/components/competitive/LfgListingCard';
import type { CreateLfgListingRequest, LfgListing } from '@/types/competitive';

export default function LfgCreateWizardPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const catalog = useGameCatalogContext();
  const initialType = params.get('type') === 'lfp' ? 'team' : 'player';
  const [type, setType] = useState<'player' | 'team'>(initialType);
  const [chosenGame, setGame] = useState(params.get('game') || '');
  const game = chosenGame || catalog.games.find(item => item.slug === 'valorant')?.slug || catalog.games[0]?.slug || '';
  const [step, setStep] = useState(1);
  const [teamId, setTeamId] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const [mode, setMode] = useState('');
  const [region, setRegion] = useState('');
  const [server, setServer] = useState('');
  const [minRank, setMinRank] = useState('');
  const [maxRank, setMaxRank] = useState('');
  const [languages, setLanguages] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(3);
  const [error, setError] = useState('');
  const save = useSaveLfgDraft();
  const teams = useLfgCaptainTeams(user?.id, type === 'team');
  const stats = useMyGameStats(game === 'valorant' && type === 'player' ? game : '');
  const roleQuery = useCatalogGameRoles(game);
  const rankQuery = useCatalogRankTiers(game);
  const regionQuery = useCatalogRegions(game);
  const activeGame = catalog.games.find(item => item.slug === game);
  const serverOptions = [...new Set((regionQuery.data ?? []).filter(item => !region || item.regionKey === region).flatMap(item => item.serverIds ?? []))];
  const realTeams = teams.data ?? [];
  const selectedTeam = realTeams.find(team => team.id === teamId);
  const currentStats = game === 'valorant' && type === 'player' ? stats.data : undefined;
  const previewListing: LfgListing = {
    id: 'preview', userId: user?.id ?? '', teamId: type === 'team' ? teamId || null : null,
    gameSlug: game, intent: type === 'player' ? 'looking_for_team' : 'looking_for_player', status: 'draft', createdAt: '', updatedAt: '',
    username: profile?.username || 'Your profile', avatarSeed: profile?.avatar_seed ?? null,
    profileAvatarUrl: profile?.avatar_url ?? null, avatarStyle: profile?.avatar_style ?? null,
    modeKey: mode || null, regionKey: region || null, regionDisplayName: regionQuery.data?.find(item => item.regionKey === region)?.displayName ?? null,
    preferredServers: server ? [server] : [], minRankSortOrder: minRank ? Number(minRank) : null, maxRankSortOrder: maxRank ? Number(maxRank) : null,
    minRankDisplayName: rankQuery.data?.find(item => item.sortOrder === Number(minRank))?.displayName ?? null,
    maxRankDisplayName: rankQuery.data?.find(item => item.sortOrder === Number(maxRank))?.displayName ?? null,
    minRankIconUrl: rankQuery.data?.find(item => item.sortOrder === Number(minRank))?.iconUrl ?? null, maxRankIconUrl: null,
    preferredRoles: roles, preferredAgents: agents, languages: languages.split(',').map(item => item.trim()).filter(Boolean),
    description: description || null, expiresAt: null, mode: null, minRankSlug: null, maxRankSlug: null, regionSlug: null,
    servers: [], roles: [], publishedAt: null, closedAt: null, avatarUrl: null,
    competitiveTier: currentStats?.competitiveTier ?? null, competitiveTierName: currentStats?.competitiveTierName ?? null,
    winCount: currentStats?.winCount ?? null, lossCount: currentStats?.lossCount ?? null, winRate: currentStats?.winRate ?? null,
    kdRatio: currentStats?.kdRatio ?? null, popularAgents: currentStats?.popularAgents ?? null,
    matchesAnalyzed: currentStats?.matchesAnalyzed ?? null, riotSyncedAt: currentStats?.syncedAt ?? null,
    riotGameName: currentStats?.riotGameName ?? null, riotTagLine: currentStats?.riotTagLine ?? null,
    teamName: selectedTeam?.name ?? (type === 'team' ? 'Your team' : null), teamTag: selectedTeam?.tag ?? null,
    teamLogoUrl: selectedTeam?.logo_url ?? null, teamMemberCount: null, teamVerifiedCount: null,
  };
  const toggle = (values: string[], value: string, set: (next: string[]) => void) => set(values.includes(value) ? values.filter(item => item !== value) : [...values, value]);
  function changeGame(value: string) {
    setGame(value); setRoles([]); setAgents([]); setMode(''); setRegion(''); setServer(''); setMinRank(''); setMaxRank(''); setTeamId('');
  }
  async function submit(publish: boolean) {
    setError('');
    if (!game || (type === 'team' && !teamId)) { setError('Choose a game and an eligible team.'); return; }
    if (minRank && maxRank && Number(minRank) > Number(maxRank)) { setError('Minimum rank must not exceed maximum rank.'); return; }
    const request: CreateLfgListingRequest = { gameSlug: game, intent: type === 'player' ? 'looking_for_team' : 'looking_for_player',
      teamId: type === 'team' ? teamId : undefined, modeKey: mode || null, regionKey: region || null,
      preferredServers: server.trim() ? [server.trim()] : [], preferredRoles: roles, preferredAgents: game === 'valorant' ? agents : [],
      minRankSortOrder: minRank ? Number(minRank) : null, maxRankSortOrder: maxRank ? Number(maxRank) : null,
      languages: languages.split(',').map(item => item.trim()).filter(Boolean), description: description.trim() || null,
      expiresAt: new Date(Date.now() + duration * 86400000).toISOString() };
    try { await save.mutateAsync({ request, publish }); navigate('/competitive/lfg/mine'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save listing. Try again.'); }
  }
  return <LfgWorkspace><header className="lfg-heading"><div><div className="lfg-eyebrow">Find a group / Create listing</div><h1>Put yourself on the board.</h1><p>Tell people what you play and what you are looking for.</p></div></header>
    <div className="lfg-page lfg-wizard-layout"><div className="lfg-panel lfg-wizard-form">
      <div className="lfg-segmented" aria-label="Creation progress"><span className="lfg-chip">{step} / 3</span><span className="lfg-chip">{['Your search', 'Your details', 'Review'][step - 1]}</span></div>
      {step === 1 && <div style={{ marginTop:24 }}><h2 className="lfg-name">What are you looking for?</h2><div className="lfg-row-actions" style={{ margin:'14px 0 22px' }}><button className="lfg-button" type="button" disabled={!!save.draftId} aria-pressed={type === 'player'} onClick={() => setType('player')}>I need a team</button><button className="lfg-button" type="button" disabled={!!save.draftId} aria-pressed={type === 'team'} onClick={() => setType('team')}>We need a player</button></div><label className="lfg-field">Game<select className="lfg-input" value={game} disabled={!!save.draftId || !catalog.games.length} onChange={event => changeGame(event.target.value)}>{!catalog.games.length && <option value="">Game catalog unavailable</option>}{catalog.games.map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label></div>}
      {step === 2 && <div style={{ marginTop:24 }}>
        {type === 'team' ? <label className="lfg-field">Recruiting team<select className="lfg-input" value={teamId} disabled={!!save.draftId} onChange={event => setTeamId(event.target.value)}><option value="">Choose a team</option>{realTeams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select>{teams.isError && <span className="lfg-error">Teams could not load. <button type="button" onClick={() => void teams.refetch()}>Try again</button></span>}{!teams.isLoading && !teams.isError && !realTeams.length && <span>No captain teams found. <Link to="/teams">Manage teams</Link></span>}</label> : game === 'valorant' && <div className="lfg-panel" style={{ padding:16, marginBottom:20 }}><strong>Riot stats</strong><p className="lfg-sub">{stats.isLoading ? 'Loading…' : stats.data?.riotLinked ? `${stats.data.competitiveTierName || 'Rank unavailable'} · ${stats.data.winRate != null ? `${stats.data.winRate}% win rate` : 'Stats unavailable'}` : 'Link your Riot account to show available stats.'}</p>{!stats.data?.riotLinked && <Link className="lfg-sub" to="/settings/connections">Connect account</Link>}</div>}
        {!!roleQuery.data?.length && <div className="lfg-field">{type === 'team' ? 'Roles needed' : 'Your roles'}<div className="lfg-row-actions">{roleQuery.data.map(role => <button className="lfg-button" type="button" key={role.id} aria-pressed={roles.includes(role.roleKey)} onClick={() => toggle(roles, role.roleKey, setRoles)}>{role.displayName}</button>)}</div></div>}
        {game === 'valorant' && type === 'player' && <div className="lfg-field">Preferred agents <div className="lfg-row-actions">{[...VALORANT_AGENTS].map(([id, agent]) => <button type="button" className="lfg-button" key={id} aria-pressed={agents.includes(id)} onClick={() => toggle(agents, id, setAgents)}>{agent.displayName}</button>)}</div></div>}
      </div>}
      {step === 3 && <div style={{ marginTop:24 }}>
        {!!activeGame?.modes?.length && <label className="lfg-field">Mode<select className="lfg-input" value={mode} onChange={event => setMode(event.target.value)}><option value="">Any mode</option>{activeGame.modes.map(item => <option key={item.key || item.value} value={item.key || item.value}>{item.name}</option>)}</select></label>}
        {!!regionQuery.data?.length && <label className="lfg-field">Region<select className="lfg-input" value={region} onChange={event => { setRegion(event.target.value); setServer(''); }}><option value="">Any region</option>{regionQuery.data.map(item => <option key={item.id} value={item.regionKey}>{item.displayName}</option>)}</select></label>}
        <label className="lfg-field">Preferred server{serverOptions.length ? <select className="lfg-input" value={server} onChange={event => setServer(event.target.value)}><option value="">Any server</option>{serverOptions.map(item => <option key={item} value={item}>{item}</option>)}</select> : <input className="lfg-input" value={server} onChange={event => setServer(event.target.value)} />}</label>
        {!!rankQuery.data?.length && <div className="lfg-row-actions"><label className="lfg-field" style={{ flex:1 }}>Minimum rank<select className="lfg-input" value={minRank} onChange={event => setMinRank(event.target.value)}><option value="">Any rank</option>{rankQuery.data.map(item => <option key={item.id} value={item.sortOrder}>{item.displayName}</option>)}</select></label><label className="lfg-field" style={{ flex:1 }}>Maximum rank<select className="lfg-input" value={maxRank} onChange={event => setMaxRank(event.target.value)}><option value="">Any rank</option>{rankQuery.data.map(item => <option key={item.id} value={item.sortOrder}>{item.displayName}</option>)}</select></label></div>}
        <div className="lfg-field">Languages<LfgLanguagePicker value={languages.split(',').map(item => item.trim()).filter(Boolean)} onChange={value => setLanguages(value.join(', '))} /></div>
        <label className="lfg-field">About your search <span className="lfg-sub">{description.length}/280</span><textarea className="lfg-input" rows={4} maxLength={280} value={description} onChange={event => setDescription(event.target.value)} /></label>
        <label className="lfg-field">Listing duration<select className="lfg-input" value={duration} onChange={event => setDuration(Number(event.target.value))}><option value={1}>1 day</option><option value={3}>3 days</option><option value={7}>7 days</option></select></label>
        <div className="lfg-panel" style={{ padding:16 }}><div className="lfg-eyebrow">Review listing</div><strong>{type === 'player' ? 'Player looking for a team' : realTeams.find(team => team.id === teamId)?.name || 'Team recruiting'}</strong><p className="lfg-sub">{activeGame?.name} · {roles.join(', ') || 'Any role'} · {region || 'Any region'}</p><p className="lfg-description" style={{ marginTop:10 }}>{description || 'No description provided.'}</p></div>
      </div>}
      {error && <p className="lfg-error" role="alert">{error}{save.draftId && <> Your draft is saved. <Link to="/competitive/lfg/mine">View drafts</Link> or retry.</>}</p>}
      <div className="lfg-row-actions" style={{ marginTop:24, justifyContent:'flex-end' }}>{step > 1 && <button className="lfg-button" type="button" onClick={() => setStep(step - 1)}>Back</button>}{step < 3 ? <button className="lfg-button lfg-button-primary" type="button" disabled={!game || (step === 2 && type === 'team' && !teamId)} onClick={() => setStep(step + 1)}>Continue</button> : <><button className="lfg-button" type="button" disabled={save.isPending} onClick={() => void submit(false)}>Save draft</button><button className="lfg-button lfg-button-primary" type="button" disabled={save.isPending} onClick={() => void submit(true)}>{save.isPending ? 'Saving…' : 'Publish listing'}</button></>}</div>
    </div><aside className="lfg-wizard-preview" aria-label="Listing preview"><div className="lfg-eyebrow">How you’ll appear</div><p className="lfg-sub">Your listing updates as you make changes.</p><div className="lfg-wizard-preview-card"><LfgListingCard listing={previewListing} roles={roleQuery.data ?? []} artwork={activeGame?.banner || activeGame?.logo} selected={false} onSelect={() => {}} onSave={() => {}} savePending={false} isOwn preview /></div><p className="lfg-sub lfg-preview-label">List view</p><div className="lfg-grid list lfg-wizard-preview-list"><LfgListingCard listing={previewListing} roles={roleQuery.data ?? []} artwork={activeGame?.banner || activeGame?.logo} selected={false} onSelect={() => {}} onSave={() => {}} savePending={false} isOwn preview /></div></aside></div>
  </LfgWorkspace>;
}
