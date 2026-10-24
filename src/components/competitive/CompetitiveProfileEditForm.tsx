import { useState } from 'react';
import { Field, ActionBar, InlineNotice, ToggleRow } from '@/components/ui/kit';
import { RoleChip } from './RoleChip';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { CompetitiveProfile, UpsertCompetitiveProfileRequest } from '@/types/competitive';
import type { RankTier, GameRole, GameRegion } from '@/types/competitive';

interface CompetitiveProfileEditFormProps {
  profile: CompetitiveProfile | null;
  rankTiers: RankTier[];
  gameRoles: GameRole[];
  regions: GameRegion[];
  onSave: (req: UpsertCompetitiveProfileRequest) => void;
  onCancel: () => void;
  isSaving: boolean;
  saveError: string | null;
}

/**
 * Inline edit form for the competitive profile section.
 * Used on desktop (inline expansion) and on the mobile edit route.
 */
export function CompetitiveProfileEditForm({
  profile, rankTiers, gameRoles, regions, onSave, onCancel, isSaving, saveError,
}: CompetitiveProfileEditFormProps) {
  const [rankSlug, setRankSlug] = useState(profile?.rankTierSlug ?? '');
  const [roles, setRoles] = useState<string[]>(profile?.roles ?? []);
  const [mainRole, setMainRole] = useState<string | null>(profile?.mainRole ?? null);
  const [regionSlug, setRegionSlug] = useState(profile?.regionSlug ?? '');
  const [servers, setServers] = useState<string[]>(profile?.servers ?? []);
  const [serverInput, setServerInput] = useState('');
  const [lftOpen, setLftOpen] = useState(profile?.lftStatus === 'open');
  const [experience, setExperience] = useState(profile?.experienceLevel ?? '');
  const [environment, setEnvironment] = useState(profile?.preferredEnvironment ?? '');
  const [languages, setLanguages] = useState<string[]>(profile?.languages ?? []);
  const [langInput, setLangInput] = useState('');
  const [notes, setNotes] = useState(profile?.notes ?? '');
  const [profileVisible, setProfileVisible] = useState(profile?.profileVisible ?? true);
  const [lftVisible, setLftVisible] = useState(profile?.lftVisible ?? true);
  const [riotIdVisible, setRiotIdVisible] = useState(profile?.riotIdVisible ?? false);
  const [recruitmentVisible, setRecruitmentVisible] = useState(profile?.recruitmentVisible ?? false);

  function toggleRole(slug: string) {
    setRoles((prev) => {
      if (prev.includes(slug)) {
        const next = prev.filter((r) => r !== slug);
        if (mainRole === slug) setMainRole(next[0] ?? null);
        return next;
      }
      if (prev.length >= 5) return prev;
      return [...prev, slug];
    });
  }

  function addServer() {
    const val = serverInput.trim().toUpperCase();
    if (val && servers.length < 5 && !servers.includes(val)) {
      setServers((p) => [...p, val]);
    }
    setServerInput('');
  }

  function addLanguage() {
    const val = langInput.trim();
    if (val && !languages.includes(val)) setLanguages((p) => [...p, val]);
    setLangInput('');
  }

  function handleSave() {
    onSave({
      gameSlug: 'valorant',
      rankTierSlug: rankSlug || null,
      roles,
      mainRole: mainRole || null,
      regionSlug: regionSlug || null,
      servers,
      lftStatus: lftOpen ? 'open' : 'not_looking',
      experienceLevel: (experience as CompetitiveProfile['experienceLevel']) || null,
      preferredEnvironment: (environment as CompetitiveProfile['preferredEnvironment']) || null,
      languages,
      notes: notes || null,
      profileVisible,
      lftVisible,
      riotIdVisible,
      recruitmentVisible,
    });
  }

  return (
    <div className="space-y-5">
      {/* Game — locked */}
      <Field label="Game" hint="Phase 1 only. More games coming soon." htmlFor="cp-game">
        <div id="cp-game" className="flex h-11 items-center border border-white/10 bg-black/30 px-3 text-[15px] text-white/55 cursor-not-allowed">
          VALORANT
        </div>
      </Field>

      {/* Rank */}
      <Field label="Rank" htmlFor="cp-rank">
        <Select value={rankSlug} onValueChange={setRankSlug}>
          <SelectTrigger id="cp-rank" className="rounded-none border-white/10 bg-black/30 text-white">
            <SelectValue placeholder="Select rank" />
          </SelectTrigger>
          <SelectContent className="rounded-none bg-[#1a1a1a] border-white/10">
            {rankTiers.map((t) => (
              <SelectItem key={t.slug} value={t.slug}>{t.displayName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Roles */}
      <Field label="Roles" hint="Select up to 5. Your main role has a stronger border." htmlFor="cp-roles">
        <div id="cp-roles" className="flex flex-wrap gap-2" role="group" aria-label="Select roles">
          {gameRoles.map((r) => (
            <RoleChip
              key={r.slug} role={r.slug} displayName={r.displayName}
              mode="toggle" active={roles.includes(r.slug)} onClick={() => toggleRole(r.slug)}
            />
          ))}
        </div>
      </Field>

      {/* Main role */}
      {roles.length > 0 && (
        <Field label="Main role" hint="Must match one of your selected roles." htmlFor="cp-main-role">
          <div id="cp-main-role" className="flex flex-wrap gap-2" role="group" aria-label="Select main role">
            {roles.map((r) => {
              const label = gameRoles.find((gr) => gr.slug === r)?.displayName ?? r;
              return (
                <RoleChip
                  key={r} role={r} displayName={label}
                  mode="toggle" active={mainRole === r} isMain={mainRole === r}
                  onClick={() => setMainRole(r)}
                />
              );
            })}
          </div>
        </Field>
      )}

      {/* Region */}
      <Field label="Region" htmlFor="cp-region">
        <Select value={regionSlug} onValueChange={setRegionSlug}>
          <SelectTrigger id="cp-region" className="rounded-none border-white/10 bg-black/30 text-white">
            <SelectValue placeholder="Select region" />
          </SelectTrigger>
          <SelectContent className="rounded-none bg-[#1a1a1a] border-white/10">
            {regions.map((r) => (
              <SelectItem key={r.slug} value={r.slug}>{r.displayName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Servers */}
      <Field label="Preferred servers" hint="Short server codes, e.g. PAK, UAE." htmlFor="cp-servers">
        <div className="flex flex-wrap gap-2 mb-2">
          {servers.map((s) => (
            <button
              key={s} type="button" onClick={() => setServers((p) => p.filter((x) => x !== s))}
              className="inline-flex items-center gap-1 border border-white/[0.08] bg-white/[0.04] px-2 h-6 font-rajdhani text-[11px] uppercase text-white hover:bg-red-500/20"
            >
              {s} ×
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            id="cp-servers"
            value={serverInput}
            onChange={(e) => setServerInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addServer())}
            placeholder="PAK"
            maxLength={6}
            className="h-9 flex-1 border border-white/10 bg-black/30 px-3 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
          <button
            type="button" onClick={addServer}
            className="h-9 px-3 border border-white/10 bg-white/[0.04] text-[13px] text-white hover:bg-white/[0.07]"
          >
            + Add
          </button>
        </div>
      </Field>

      {/* LFT toggle */}
      <ToggleRow
        id="cp-lft"
        title="Open to team"
        description="Lets others know you're looking for a team or duo."
        checked={lftOpen}
        onCheckedChange={setLftOpen}
      />

      {/* Experience */}
      <Field label="Experience level" htmlFor="cp-exp">
        <div id="cp-exp" className="flex flex-wrap gap-3" role="radiogroup" aria-label="Experience level">
          {(['casual', 'amateur', 'semi_pro', 'pro'] as const).map((val) => {
            const label = { casual: 'Casual', amateur: 'Amateur', semi_pro: 'Semi-pro', pro: 'Pro' }[val];
            return (
              <label key={val} className="flex items-center gap-2 cursor-pointer text-[13px] text-white/80">
                <input type="radio" name="experience" value={val} checked={experience === val}
                  onChange={() => setExperience(val)} className="accent-white" />
                {label}
              </label>
            );
          })}
        </div>
      </Field>

      {/* Environment */}
      <Field label="Preferred environment" htmlFor="cp-env">
        <div id="cp-env" className="flex flex-wrap gap-3" role="radiogroup" aria-label="Preferred environment">
          {(['casual', 'competitive', 'pro'] as const).map((val) => {
            const label = { casual: 'Casual', competitive: 'Competitive', pro: 'Pro' }[val];
            return (
              <label key={val} className="flex items-center gap-2 cursor-pointer text-[13px] text-white/80">
                <input type="radio" name="environment" value={val} checked={environment === val}
                  onChange={() => setEnvironment(val)} className="accent-white" />
                {label}
              </label>
            );
          })}
        </div>
      </Field>

      {/* Languages */}
      <Field label="Languages" hint={undefined} optional htmlFor="cp-lang">
        <div className="flex flex-wrap gap-2 mb-2">
          {languages.map((l) => (
            <button
              key={l} type="button" onClick={() => setLanguages((p) => p.filter((x) => x !== l))}
              className="inline-flex items-center gap-1 border border-white/[0.08] bg-white/[0.04] px-2 h-6 font-rajdhani text-[11px] uppercase text-white hover:bg-red-500/20"
            >
              {l} ×
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            id="cp-lang"
            value={langInput}
            onChange={(e) => setLangInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
            placeholder="e.g. English"
            className="h-9 flex-1 border border-white/10 bg-black/30 px-3 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
          <button type="button" onClick={addLanguage}
            className="h-9 px-3 border border-white/10 bg-white/[0.04] text-[13px] text-white hover:bg-white/[0.07]">
            + Add language
          </button>
        </div>
      </Field>

      {/* Notes */}
      <Field label="Notes" hint="Optional. 280 characters max." optional htmlFor="cp-notes">
        <Textarea
          id="cp-notes" value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 280))}
          placeholder="Add anything teammates should know."
          rows={3}
          className="rounded-none border-white/10 bg-black/30 text-white placeholder:text-zinc-600 resize-none"
        />
      </Field>

      {/* Privacy */}
      <div className="space-y-2 pt-2">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">PRIVACY</p>
        <ToggleRow id="cp-visible" title="Profile visible"
          description="Shown in search results and visible on your profile to others."
          checked={profileVisible} onCheckedChange={setProfileVisible} />
        <ToggleRow id="cp-lft-vis" title="LFT status visible"
          description='Shows "Open to team" badge.'
          checked={lftVisible} onCheckedChange={setLftVisible} />
        <ToggleRow id="cp-riot" title="Riot ID visible"
          description="Shows your Riot ID below your username."
          checked={riotIdVisible} onCheckedChange={setRiotIdVisible} />
        <ToggleRow id="cp-recruit" title="Recruitment visible"
          description="Shown when organizers search for players to recruit."
          checked={recruitmentVisible} onCheckedChange={setRecruitmentVisible} />
      </div>

      {/* Save error */}
      {saveError && (
        <InlineNotice tone="critical">{saveError}</InlineNotice>
      )}

      {/* ActionBar */}
      <ActionBar
        start={
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}
            className="text-[13px] text-white/55 hover:text-white">
            Cancel
          </Button>
        }
        end={
          <Button type="button" onClick={handleSave} disabled={isSaving}
            className="bg-white text-[#0A0A0A] hover:bg-white/90 rounded-none px-6">
            {isSaving ? 'Saving…' : 'Save competitive profile'}
          </Button>
        }
      />
    </div>
  );
}
