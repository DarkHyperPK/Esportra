import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { useCatalogGameRoles, useCatalogRankTiers, useCatalogRegions } from '@/hooks/competitive/useCatalog';
import { useLfgListing, useUpdateLfgListing, useMyGameStats } from '@/hooks/competitive/useLfg';
import { LfgWorkspace } from '@/components/competitive/LfgWorkspace';
import { LfgLanguagePicker } from '@/components/competitive/LfgLanguagePicker';
import { LfgAgentPicker } from '@/components/competitive/LfgAgentPicker';
import { LfgRolePicker } from '@/components/competitive/LfgRolePicker';
import { LfgRankSelect } from '@/components/competitive/LfgRankSelect';

export default function LfgEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const catalog = useGameCatalogContext();
  const listing = useLfgListing(id);
  const update = useUpdateLfgListing(id);
  const game = listing.data?.gameSlug || '';
  const roles = useCatalogGameRoles(game).data ?? [];
  const ranks = useCatalogRankTiers(game).data ?? [];
  const regions = useCatalogRegions(game).data ?? [];
  const modes = catalog.games.find(item => item.slug === game)?.modes ?? [];
  const stats = useMyGameStats(game === 'valorant' && listing.data?.intent === 'looking_for_team' ? game : '');
  const [seeded, setSeeded] = useState(false);
  const [description, setDescription] = useState('');
  const [role, setRole] = useState<string[]>([]);
  const [mode, setMode] = useState('');
  const [region, setRegion] = useState('');
  const [agents, setAgents] = useState<string[]>([]);
  const [languages, setLanguages] = useState('');
  const [minRank, setMinRank] = useState('');
  const [maxRank, setMaxRank] = useState('');
  const [duration, setDuration] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!listing.data || seeded) return;
    const item = listing.data;
    setDescription(item.description ?? ''); setRole(item.preferredRoles ?? []); setMode(item.modeKey ?? ''); setRegion(item.regionKey ?? '');
    setAgents(item.preferredAgents ?? []); setLanguages((item.languages ?? []).join(', '));
    setMinRank(item.minRankSortOrder == null ? '' : String(item.minRankSortOrder)); setMaxRank(item.maxRankSortOrder == null ? '' : String(item.maxRankSortOrder));
    setSeeded(true);
  }, [listing.data, seeded]);
  async function save() {
    setError('');
    if (minRank && maxRank && Number(minRank) > Number(maxRank)) { setError('Minimum rank must not exceed maximum rank.'); return; }
    try {
      await update.mutateAsync({ description: description.trim() || null, clearDescription: !description.trim(), modeKey: mode || null, clearMode: !mode,
        regionKey: region || null, clearRegion: !region, minRankSortOrder: minRank ? Number(minRank) : null, clearMinRank: !minRank,
        maxRankSortOrder: maxRank ? Number(maxRank) : null, clearMaxRank: !maxRank, preferredRoles: role,
        ...(game === 'valorant' && listing.data?.intent === 'looking_for_team' ? { preferredAgents: agents } : {}), languages: languages.split(',').map(item => item.trim()).filter(Boolean),
        ...(duration ? { expiresAt: new Date(Date.now() + Number(duration) * 86400000).toISOString() } : {}) });
      navigate(`/competitive/lfg/${id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save changes. Try again.'); }
  }
  return <LfgWorkspace><header className="lfg-heading"><div><div className="lfg-eyebrow">Find a group / Edit listing</div><h1>Update your listing.</h1><p>Game remains fixed for this listing.</p></div></header><div className="lfg-page">
    {listing.isLoading ? <div className="lfg-panel lfg-empty">Loading listing…</div> : listing.isError || !listing.data || listing.data.userId !== user?.id ? <div className="lfg-panel lfg-empty"><strong>Listing is unavailable.</strong><Link className="lfg-button" to="/competitive/lfg/mine">My listings</Link></div> : <div className="lfg-panel" style={{ maxWidth:760, padding:24 }}>
      <p className="lfg-sub" style={{ marginBottom:20 }}>{catalog.games.find(item => item.slug === game)?.name || game} · {listing.data.status}</p>
      {!!roles.length && <div className="lfg-field">Roles<LfgRolePicker game={game} roles={roles} value={role} onChange={setRole} /></div>}
      {game === 'valorant' && listing.data.intent === 'looking_for_team' && <LfgAgentPicker value={agents} onChange={setAgents} stats={stats.data?.popularAgents} />}
      {!!modes.length && <label className="lfg-field">Mode<select className="lfg-input" value={mode} onChange={event => setMode(event.target.value)}><option value="">Any mode</option>{modes.map(item => <option key={item.key || item.value} value={item.key || item.value}>{item.name}</option>)}</select></label>}
      {!!regions.length && <label className="lfg-field">Region<select className="lfg-input" value={region} onChange={event => setRegion(event.target.value)}><option value="">Any region</option>{regions.map(item => <option key={item.id} value={item.regionKey}>{item.displayName}</option>)}</select></label>}
      {!!ranks.length && <div className="lfg-row-actions"><LfgRankSelect label="Minimum rank" game={game} ranks={ranks} value={minRank} onChange={setMinRank} /><LfgRankSelect label="Maximum rank" game={game} ranks={ranks} value={maxRank} onChange={setMaxRank} /></div>}
      <div className="lfg-field">Languages<LfgLanguagePicker value={languages.split(',').map(item => item.trim()).filter(Boolean)} onChange={value => setLanguages(value.join(', '))} /></div>
      <label className="lfg-field">Description ({description.length}/280)<textarea className="lfg-input" rows={4} maxLength={280} value={description} onChange={event => setDescription(event.target.value)} /></label><label className="lfg-field">Expiry<select className="lfg-input" value={duration} onChange={event => setDuration(event.target.value)}><option value="">Keep current expiry</option><option value="1">Extend to 1 day</option><option value="3">Extend to 3 days</option><option value="7">Extend to 7 days</option></select></label>
      {error && <p className="lfg-error" role="alert">{error}</p>}<div className="lfg-row-actions"><Link className="lfg-button" to={`/competitive/lfg/${id}`}>Cancel</Link><button className="lfg-button lfg-button-primary" type="button" disabled={update.isPending} onClick={() => void save()}>{update.isPending ? 'Saving…' : 'Save changes'}</button></div>
    </div>}
  </div></LfgWorkspace>;
}
