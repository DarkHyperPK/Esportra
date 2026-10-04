import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TONE_DOT, TONE_TEXT, EYEBROW_CLASS, type Tone } from '@/components/ui/kit';
import { getApiErrorMessage, ApiError } from '@/lib/apiClient';
import type { ScoreboardOcrHealth } from '@/types/scoreboardOcr';

interface Props {
  health: ScoreboardOcrHealth | undefined;
  loading: boolean;
  error: unknown;
  onRefresh: () => void;
}

const SCRIPT_NAMES: Record<string, string> = { default: 'Latin + CJK', arabic: 'Arabic', korean: 'Korean' };

function details(health: ScoreboardOcrHealth): string {
  const scripts = (health.scripts ?? ['default']).map((s) => SCRIPT_NAMES[s] ?? s).join(', ');
  const parts = [`Names: ${scripts}`, `${health.bankAgents ?? 0} agents learned from game portraits`, `${health.agents} valorant-api icons`];
  if (health.catalogVersion) parts.push(`catalog ${health.catalogVersion}`);
  return parts.join(' · ');
}

function describe(health: ScoreboardOcrHealth | undefined, error: unknown): { tone: Tone; label: string; detail: string } {
  if (error instanceof ApiError && error.status === 403) return { tone: 'critical', label: 'Staff only', detail: 'Sign in with a staff or admin account.' };
  if (error) return { tone: 'critical', label: 'Health check failed', detail: getApiErrorMessage(error, 'The API did not answer.') };
  if (!health) return { tone: 'neutral', label: 'Checking…', detail: '' };
  if (!health.configured) return { tone: 'critical', label: 'Not configured', detail: 'Set ScoreboardOcr__BaseUrl and ScoreboardOcr__ServiceToken on the API, then restart it.' };
  if (!health.reachable) return { tone: 'critical', label: 'Unreachable', detail: 'The API cannot reach the OCR container. Check the hostname, port 8095 and that both share a network.' };
  const missingScripts = !(health.scripts ?? []).includes('arabic');
  if (missingScripts) return { tone: 'warning', label: 'Online · Arabic/Korean names off', detail: `${details(health)}. Rebuild the image so it can download the name recognisers.` };
  return { tone: 'success', label: 'Online', detail: details(health) };
}

/** Live status of the OCR service as seen from the API. */
export function OcrServiceStatus({ health, loading, error, onRefresh }: Props) {
  const state = describe(health, error);
  return (
    <div className="flex items-start gap-3 border border-white/[0.07] bg-card/70 px-4 py-3">
      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', TONE_DOT[state.tone])} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={EYEBROW_CLASS}>OCR service</p>
        <p className={cn('text-sm font-semibold', TONE_TEXT[state.tone])} role="status">{state.label}</p>
        {state.detail && <p className="text-xs text-zinc-500">{state.detail}</p>}
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        aria-label="Check OCR service again"
        className="p-1 text-zinc-500 transition-colors hover:text-white disabled:opacity-40"
      >
        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin motion-reduce:animate-none')} aria-hidden />
      </button>
    </div>
  );
}
