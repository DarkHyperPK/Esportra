import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CommandButton } from '@/components/management/CommandSurface';
import { CONTROL_CLASS, InlineNotice } from '@/components/ui/kit';
import { useTournamentTemplates } from '@/hooks/useTournamentTemplates';
import { cn } from '@/lib/utils';
import type { TournamentTemplateDto } from '@/types/tournamentTemplate';

interface Props {
  onSelect: (template: TournamentTemplateDto) => void;
  onBack: () => void;
}

const formatLabel = (t: TournamentTemplateDto) =>
  t.gameType === 'battle_royale' ? 'Battle royale · points' : `Bracket · Best of ${t.defaultBestOf}`;

function GameCard({ template, onSelect }: { template: TournamentTemplateDto; onSelect: () => void }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const artwork = template.bannerUrl || template.logoUrl || template.iconUrl;
  const hasBanner = Boolean(template.bannerUrl);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Choose ${template.gameName}, ${formatLabel(template)}`}
      className={cn(
        'group relative isolate flex min-w-0 flex-col overflow-hidden border border-white/[0.09] bg-[#101013] text-left',
        'transition-[border-color,background-color] duration-200 hover:border-rose-400/55 hover:bg-[#151317]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]',
      )}
    >
      <span className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-[#17171b]">
        {artwork && !logoFailed ? (
          <img
            src={artwork}
            alt=""
            loading="lazy"
            onError={() => setLogoFailed(true)}
            className={cn(
              'h-full w-full',
              hasBanner
                ? 'object-cover opacity-80 transition-opacity duration-200 group-hover:opacity-100'
                : 'object-contain p-10 opacity-90',
            )}
          />
        ) : (
          <span className="font-heading text-4xl font-black tracking-tight text-white/25">
            {template.gameName.slice(0, 2).toUpperCase()}
          </span>
        )}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/5" aria-hidden />
        {template.isPublisherEndorsed && (
          <span className="absolute left-3 top-3 border border-white/15 bg-black/65 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-white">
            Official
          </span>
        )}
        <span className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
          <span className="min-w-0 truncate font-heading text-lg font-bold leading-tight text-white drop-shadow sm:text-xl">
            {template.gameName}
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-white/25 bg-black/35 text-white transition-colors group-hover:border-rose-400 group-hover:bg-rose-500" aria-hidden>
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </span>
      </span>
      <span className="flex min-h-12 items-center justify-between gap-3 border-t border-white/[0.06] px-3 py-2.5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
          {template.gameType === 'battle_royale' ? 'Battle royale' : 'Bracket'}
        </span>
        <span className="truncate text-xs text-zinc-500">
          {template.gameType === 'battle_royale' ? 'Points format' : `Best of ${template.defaultBestOf}`}
        </span>
      </span>
    </button>
  );
}

export const GameTemplateSelectScreen: React.FC<Props> = ({ onSelect, onBack }) => {
  const { data: templates, isLoading, isError, refetch } = useTournamentTemplates();
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (templates ?? []).filter((t) => !needle || t.gameName.toLowerCase().includes(needle));
  }, [templates, query]);

  return (
    <div className="w-full px-4 py-7 sm:px-7 sm:py-10 xl:px-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Change setup path
        </button>
        <div className="flex items-center gap-2" aria-label="Quick start, step 1 of 2">
          <span className="h-1 w-8 bg-rose-500" aria-hidden />
          <span className="h-1 w-8 bg-white/15" aria-hidden />
          <span className="ml-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Step 1 of 2</span>
        </div>
      </div>

      <header className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-end">
        <div className="max-w-3xl">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-rose-300">Quick start</p>
          <h1 className="font-heading text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl">Choose your game</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            Start with a ready-made tournament format. You can tune the rules and team size in the next step.
          </p>
        </div>
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
          <Input
            aria-label="Search games"
            placeholder="Search games"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn(CONTROL_CLASS, 'h-11 pl-10')}
          />
        </div>
      </header>

      {templates && !isLoading && !isError && (
        <div className="mb-4 flex items-center justify-between gap-4 border-b border-white/[0.07] pb-3">
          <p className="text-xs text-zinc-500">
            <span className="font-semibold text-zinc-300">{visible.length}</span> {visible.length === 1 ? 'game' : 'games'} available
          </p>
          {query && (
          <button type="button" onClick={() => setQuery('')} className="text-xs text-zinc-400 underline decoration-white/20 underline-offset-4 hover:text-white">
            Clear search
          </button>
          )}
        </div>
      )}

      <div>
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading games">
            {Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-[4/3] animate-pulse border border-white/[0.06] bg-white/[0.035]" />)}
          </div>
        )}

        {isError && (
          <InlineNotice
            tone="critical"
            title="We couldn't load the game list"
            action={<CommandButton variant="secondary" size="sm" onClick={() => void refetch()}>Try again</CommandButton>}
          >
            Check your connection, or use Full setup instead.
          </InlineNotice>
        )}

        {templates && !isLoading && !isError && visible.length === 0 && (
          <div className="border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
            <p className="font-heading text-lg font-bold text-white">{query ? 'No games found' : 'No games available'}</p>
            <p className="mt-2 text-sm text-zinc-500">
              {query ? 'Try a different name, or use Full setup to browse every supported game.' : 'Use Full setup to browse every supported game.'}
            </p>
          </div>
        )}

        {visible.length > 0 && !isLoading && !isError && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((template) => (
              <GameCard key={template.id} template={template} onSelect={() => onSelect(template)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
