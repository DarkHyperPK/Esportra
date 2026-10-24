import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageIntro, ActionBar, InlineNotice, Field, ChoiceGroup, ChoiceCard, ChipGroup } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateLfgListing } from '@/hooks/competitive/useLfg';
import { useRankTiers, useGameRoles, useGameRegions } from '@/hooks/competitive/useCatalogCompetitive';
import { getApiErrorMessage, ApiError } from '@/lib/apiClient';
import type { LfgIntent, CreateLfgListingRequest } from '@/types/competitive';
import { RoleChip } from '@/components/competitive/RoleChip';

const GAME_SLUG = 'valorant';
const DESC_MAX = 280;
const DESC_WARN = 260;

const INTENT_OPTIONS: { slug: LfgIntent; label: string; description: string }[] = [
  { slug: 'ranked', label: 'Ranked', description: 'Climb the ladder with teammates.' },
  { slug: 'scrims', label: 'Scrims', description: 'Structured practice against real opponents.' },
  { slug: 'casual', label: 'Casual', description: 'Unranked play, low pressure.' },
  { slug: 'coaching', label: 'Coaching', description: 'Learn from or teach other players.' },
];

const MODE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'premier', label: 'Premier' },
  { value: 'unrated', label: 'Unrated' },
];

const EXPIRY_OPTIONS = [
  { value: '24', label: '24 hours' },
  { value: '72', label: '3 days' },
  { value: '168', label: '7 days' },
];

export default function LfgCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateLfgListing();
  const rankTiersQuery = useRankTiers(GAME_SLUG);
  const rolesQuery = useGameRoles(GAME_SLUG);
  const regionsQuery = useGameRegions(GAME_SLUG);

  const [intent, setIntent] = useState<LfgIntent | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [minRank, setMinRank] = useState('');
  const [maxRank, setMaxRank] = useState('');
  const [region, setRegion] = useState('');
  const [servers, setServers] = useState<string[]>([]);
  const [serverInput, setServerInput] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [langInput, setLangInput] = useState('');
  const [description, setDescription] = useState('');
  const [expiryHours, setExpiryHours] = useState('72');
  const [intentError, setIntentError] = useState('');
  const [apiError, setApiError] = useState('');
  const [apiWarning, setApiWarning] = useState('');

  const rankTiers = rankTiersQuery.data ?? [];
  const gameRoles = rolesQuery.data ?? [];
  const regions = regionsQuery.data ?? [];
  const catalogLoading = rankTiersQuery.isLoading || rolesQuery.isLoading || regionsQuery.isLoading;
  const catalogError = rankTiersQuery.isError || rolesQuery.isError || regionsQuery.isError;

  function toggleRole(slug: string) {
    setRoles((prev) =>
      prev.includes(slug) ? prev.filter((r) => r !== slug) : prev.length < 5 ? [...prev, slug] : prev,
    );
  }

  function addServer() {
    const val = serverInput.trim().toUpperCase();
    if (val && servers.length < 5 && !servers.includes(val)) setServers((p) => [...p, val]);
    setServerInput('');
  }

  function addLanguage() {
    const val = langInput.trim();
    if (val && !languages.includes(val)) setLanguages((p) => [...p, val]);
    setLangInput('');
  }

  async function handleSubmit(status: 'draft' | 'published') {
    setApiError('');
    setApiWarning('');
    setIntentError('');

    if (!intent) {
      setIntentError('Select an intent for your listing.');
      return;
    }

    const req: CreateLfgListingRequest = {
      gameSlug: GAME_SLUG,
      intent,
      status,
      mode: mode || null,
      minRankSlug: minRank || null,
      maxRankSlug: maxRank || null,
      regionSlug: region || null,
      servers: servers.length ? servers : undefined,
      roles: roles.length ? roles : undefined,
      languages: languages.length ? languages : undefined,
      description: description || null,
      expiryHours: parseInt(expiryHours),
    };

    try {
      const listing = await createMutation.mutateAsync(req);
      navigate(`/competitive/lfg/${listing.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setApiWarning('You already have an active Valorant listing. Close or pause it before publishing a new one.');
      } else if (err instanceof ApiError && err.status === 429) {
        setApiError("You've reached the listing limit. Wait 24 hours before posting again.");
      } else {
        setApiError(getApiErrorMessage(err, 'Could not publish. Check your connection and try again.'));
      }
    }
  }

  const charColor = description.length >= DESC_MAX ? 'text-red-300' : description.length >= DESC_WARN ? 'text-rose-400' : 'text-white/35';

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="px-4 py-8 max-w-2xl mx-auto lg:mx-0 lg:px-8">
        <Link to="/competitive/lfg" className="text-[13px] text-white/55 hover:text-white mb-6 inline-block">
          ‹ My listings
        </Link>

        <PageIntro
          eyebrow="NEW LFG LISTING"
          title="New LFG Listing"
          description="Create a listing so players can find you."
          className="mb-8"
        />

        {catalogError && (
          <InlineNotice tone="critical" className="mb-6">
            Could not load game data. Refresh to try again.
          </InlineNotice>
        )}

        <div className="space-y-6">
          {/* Game — locked */}
          <div>
            <div className="border-b border-white/[0.08] pb-6">
              <Field label="Game" hint="Phase 1 only. More games coming soon." htmlFor="lfg-game">
                <div id="lfg-game"
                  className="flex h-11 items-center border border-white/10 bg-black/30 px-3 text-[15px] text-white/55 cursor-not-allowed">
                  VALORANT
                </div>
              </Field>
            </div>
          </div>

          {/* Intent */}
          <div className="space-y-3">
            <p className="text-[13px] font-medium text-white/80">Intent</p>
            {catalogLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-white/[0.04] border border-white/[0.06] animate-pulse" />
                ))}
              </div>
            ) : (
              <ChoiceGroup label="Intent" columns={4}>
                {INTENT_OPTIONS.map((opt) => (
                  <ChoiceCard
                    key={opt.slug}
                    selected={intent === opt.slug}
                    onSelect={() => { setIntent(opt.slug); setIntentError(''); }}
                    title={opt.label}
                    description={opt.description}
                    layout="stack"
                  />
                ))}
              </ChoiceGroup>
            )}
            {intentError && <p role="alert" className="text-xs text-red-300">{intentError}</p>}
            <div className="border-b border-white/[0.08]" />
          </div>

          {/* Mode */}
          <Field label="Mode" htmlFor="lfg-mode">
            <ChipGroup
              label="Mode"
              options={MODE_OPTIONS}
              value={mode}
              onChange={(v) => setMode(v === mode ? null : v)}
            />
          </Field>

          {/* Rank range */}
          <Field label="Rank range" htmlFor="lfg-rank-min">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-white/35 mb-1">Min</p>
                <Select value={minRank} onValueChange={setMinRank}>
                  <SelectTrigger id="lfg-rank-min" aria-label="Minimum rank"
                    className="rounded-none border-white/10 bg-black/30 text-white">
                    <SelectValue placeholder="Any rank" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-[#1a1a1a] border-white/10">
                    {rankTiers.map((t) => <SelectItem key={t.slug} value={t.slug}>{t.displayName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-[11px] text-white/35 mb-1">Max</p>
                <Select value={maxRank} onValueChange={setMaxRank}>
                  <SelectTrigger aria-label="Maximum rank"
                    className="rounded-none border-white/10 bg-black/30 text-white">
                    <SelectValue placeholder="Any rank" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-[#1a1a1a] border-white/10">
                    {rankTiers.map((t) => <SelectItem key={t.slug} value={t.slug}>{t.displayName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Field>

          {/* Region */}
          <Field label="Region" htmlFor="lfg-region">
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger id="lfg-region" className="rounded-none border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent className="rounded-none bg-[#1a1a1a] border-white/10">
                {regions.map((r) => <SelectItem key={r.slug} value={r.slug}>{r.displayName}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          {/* Servers */}
          <Field label="Preferred servers" hint="Short server codes, e.g. PAK, UAE." optional htmlFor="lfg-servers">
            <div className="flex flex-wrap gap-2 mb-2">
              {servers.map((s) => (
                <button key={s} type="button" onClick={() => setServers((p) => p.filter((x) => x !== s))}
                  className="inline-flex items-center gap-1 border border-white/[0.08] bg-white/[0.04] px-2 h-6 font-rajdhani text-[11px] uppercase text-white hover:bg-red-500/20">
                  {s} ×
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input id="lfg-servers" value={serverInput} onChange={(e) => setServerInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addServer())}
                placeholder="PAK" maxLength={6}
                className="h-9 flex-1 border border-white/10 bg-black/30 px-3 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30" />
              <button type="button" onClick={addServer}
                className="h-9 px-3 border border-white/10 bg-white/[0.04] text-[13px] text-white hover:bg-white/[0.07]">
                + Add
              </button>
            </div>
          </Field>

          <div className="border-b border-white/[0.08]" />

          {/* Roles wanted */}
          <Field label="Roles wanted" optional htmlFor="lfg-roles">
            <div id="lfg-roles" className="flex flex-wrap gap-2" role="group" aria-label="Roles wanted">
              {gameRoles.map((r) => (
                <RoleChip key={r.slug} role={r.slug} displayName={r.displayName}
                  mode="toggle" active={roles.includes(r.slug)} onClick={() => toggleRole(r.slug)} />
              ))}
            </div>
          </Field>

          {/* Languages */}
          <Field label="Languages" optional htmlFor="lfg-lang">
            <div className="flex flex-wrap gap-2 mb-2">
              {languages.map((l) => (
                <button key={l} type="button" onClick={() => setLanguages((p) => p.filter((x) => x !== l))}
                  className="inline-flex items-center gap-1 border border-white/[0.08] bg-white/[0.04] px-2 h-6 font-rajdhani text-[11px] uppercase text-white hover:bg-red-500/20">
                  {l} ×
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input id="lfg-lang" value={langInput} onChange={(e) => setLangInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                placeholder="e.g. English"
                className="h-9 flex-1 border border-white/10 bg-black/30 px-3 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30" />
              <button type="button" onClick={addLanguage}
                className="h-9 px-3 border border-white/10 bg-white/[0.04] text-[13px] text-white hover:bg-white/[0.07]">
                + Add
              </button>
            </div>
          </Field>

          <div className="border-b border-white/[0.08]" />

          {/* Description */}
          <Field label="Description" optional htmlFor="lfg-desc">
            <Textarea id="lfg-desc" value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
              placeholder="Tell players what you're looking for. Be direct."
              rows={4}
              aria-describedby="lfg-desc-counter"
              className="rounded-none border-white/10 bg-black/30 text-white placeholder:text-zinc-600 resize-none" />
            <p id="lfg-desc-counter" aria-live="polite" className={`text-right text-[11px] ${charColor}`}>
              {description.length} / {DESC_MAX}
            </p>
          </Field>

          {/* Expiry */}
          <Field label="Expires in" htmlFor="lfg-expiry">
            <ChipGroup
              label="Expires in"
              options={EXPIRY_OPTIONS}
              value={expiryHours}
              onChange={setExpiryHours}
            />
          </Field>

          <div className="border-b border-white/[0.08]" />

          {/* Notices */}
          {apiWarning && <InlineNotice tone="warning">{apiWarning}</InlineNotice>}
          {apiError && <InlineNotice tone="critical">{apiError}</InlineNotice>}

          {/* ActionBar */}
          <ActionBar
            start={
              <Button variant="ghost" onClick={() => handleSubmit('draft')}
                disabled={createMutation.isPending}
                className="text-[13px] text-white/55 hover:text-white rounded-none border border-white/[0.08]">
                {createMutation.isPending ? 'Saving…' : 'Save as draft'}
              </Button>
            }
            end={
              <Button onClick={() => handleSubmit('published')}
                disabled={createMutation.isPending}
                className="bg-rose-500 hover:bg-rose-600 text-white rounded-none px-6">
                {createMutation.isPending ? 'Publishing…' : 'Publish listing'}
              </Button>
            }
            sticky
          />
        </div>
      </div>
    </div>
  );
}
