import React, { useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CommandButton } from '@/components/management/CommandSurface';
import { CONTROL_CLASS, InlineNotice, PageIntro } from '@/components/ui/kit';
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
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative flex flex-col bg-white/[0.02] text-left transition-colors',
        'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-white/[0.04] hover:shadow-[inset_0_0_0_1px_rgba(244,63,94,0.6)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
      )}
    >
      <span className="relative flex aspect-[16/9] items-center justify-center overflow-hidden border-b border-white/[0.06] bg-black/30">
        {template.logoUrl && !logoFailed ? (
          <img
            src={template.logoUrl}
            alt=""
            loading="lazy"
            onError={() => setLogoFailed(true)}
            className="h-full w-full object-contain p-6 transition-transform duration-200 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="font-heading text-2xl font-black tracking-tight text-white/20">
            {template.gameName.slice(0, 2).toUpperCase()}
          </span>
        )}
        {template.isPublisherEndorsed && (
          <span className="absolute left-2 top-2 bg-rose-500 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-white">
            Official
          </span>
        )}
      </span>
      <span className="px-3 py-3">
        <span className="block truncate text-sm font-semibold text-white">{template.gameName}</span>
        <span className="mt-0.5 block text-xs text-zinc-500">{formatLabel(template)}</span>
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
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:py-12">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Change setup path
      </button>

      <PageIntro
        eyebrow="Quick start · Step 1 of 2"
        title="Pick a game"
        description="Each game comes with its usual rules, series length and team size. You can change any of it afterwards."
        aside={
          (templates?.length ?? 0) > 8 ? (
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
              <Input
                aria-label="Search games"
                placeholder="Search games"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={cn(CONTROL_CLASS, 'pl-9')}
              />
            </div>
          ) : undefined
        }
      />

      <div className="mt-10">
        {isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-busy="true" aria-label="Loading games">
            {Array.from({ length: 10 }, (_, i) => <div key={i} className="aspect-[4/3] animate-pulse bg-white/[0.04]" />)}
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

        {templates && visible.length === 0 && (
          <p className="text-sm text-zinc-500">
            No games match “{query}”. Try another name, or use Full setup to pick from every supported game.
          </p>
        )}

        {visible.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((template) => (
              <GameCard key={template.id} template={template} onSelect={() => onSelect(template)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
