import { StatusPill } from '@/components/ui/kit';
import { presentProviderMatch } from '@/services/providerMatch/presentation';
import type { ProviderMatchDetail } from '@/types/providerMatch';

interface Props {
  detail: ProviderMatchDetail | undefined;
  /** Shows the one-line meaning under the pill (default) or the pill alone. */
  compact?: boolean;
}

/**
 * Whether Riot's own record of a match backs a reported result. Says nothing when no Riot match is attached,
 * and always says in words what the status means, so it never relies on colour alone.
 */
export function MatchDataStatusBadge({ detail, compact = false }: Props) {
  const view = presentProviderMatch(detail);
  if (!view) return null;

  return (
    <div className="space-y-1.5" data-testid="match-data-status">
      <StatusPill label={view.label} tone={view.tone} />
      {!compact && <p className="text-[12px] leading-relaxed text-zinc-400">{view.summary}</p>}
      {!compact && view.details.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-4 text-[12px] leading-relaxed text-zinc-500">
          {view.details.map((line) => <li key={line}>{line}</li>)}
        </ul>
      )}
    </div>
  );
}
