/**
 * CreateTournamentEntryScreen
 *
 * The fork in the road. Two paths, each saying what it sets up, what it
 * leaves for later, and roughly how long it takes, so the choice is informed
 * rather than a guess. Quick start is the recommended default.
 */
import React from 'react';
import { Check, SlidersHorizontal, Zap } from 'lucide-react';
import { ChoiceCard, PageIntro } from '@/components/ui/kit';

interface Props {
  onQuickTemplate: () => void;
  onAdvanced: () => void;
}

function PathFacts({ time, items }: { time: string; items: string[] }) {
  return (
    <span className="block space-y-3">
      <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">{time}</span>
      <span className="block space-y-1.5">
        {items.map((item) => (
          <span key={item} className="flex items-start gap-2 text-[13px] text-zinc-300">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
            {item}
          </span>
        ))}
      </span>
    </span>
  );
}

export const CreateTournamentEntryScreen: React.FC<Props> = ({ onQuickTemplate, onAdvanced }) => (
  <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 md:py-16">
    <PageIntro
      eyebrow="New tournament"
      title="How do you want to set it up?"
      description="Both paths create a draft you can edit from the dashboard. Nothing goes public until you publish."
    />

    <div className="mt-10 grid gap-3 md:grid-cols-2">
      <ChoiceCard
        layout="stack"
        mode="action"
        selected={false}
        onSelect={onQuickTemplate}
        badge="Recommended"
        icon={<Zap className="h-7 w-7" aria-hidden />}
        title="Quick start"
        description="Pick a game and we fill in proven defaults. You check a few details and you're done."
        meta={
          <PathFacts
            time="About 1 minute"
            items={['Game rules and series length preset', 'Pick a bracket style and team count', 'Prizes and branding later, in the dashboard']}
          />
        }
        className="min-h-[300px]"
      />
      <ChoiceCard
        layout="stack"
        mode="action"
        selected={false}
        onSelect={onAdvanced}
        icon={<SlidersHorizontal className="h-7 w-7" aria-hidden />}
        title="Full setup"
        description="Walk through every option in 7 steps before you create anything."
        meta={
          <PathFacts
            time="About 10 minutes"
            items={['Custom stages, rules and map pool', 'Prize pool, entry fee and payouts', 'Registration, check-in and branding']}
          />
        }
        className="min-h-[300px]"
      />
    </div>
  </div>
);
