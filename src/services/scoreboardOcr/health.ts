import type { ScoreboardOcrHealth } from '@/types/scoreboardOcr';

export type OcrHealthTone = 'success' | 'warning' | 'critical' | 'neutral';

export interface OcrHealthSummary {
  tone: OcrHealthTone;
  label: string;
  detail: string;
}

const SCRIPT_NAMES: Record<string, string> = { default: 'Latin + CJK', arabic: 'Arabic', korean: 'Korean' };
const OPTIONAL_SCRIPTS = ['arabic', 'korean'] as const;

function scriptName(script: string): string {
  return SCRIPT_NAMES[script] ?? script;
}

function details(health: ScoreboardOcrHealth): string {
  const scripts = (health.scripts ?? ['default']).map(scriptName).join(', ');
  const parts = [`Names: ${scripts}`, `${health.bankAgents ?? 0} agents learned from game portraits`, `${health.agents} valorant-api icons`];
  if (health.catalogVersion) parts.push(`catalog ${health.catalogVersion}`);
  return parts.join(' · ');
}

/** Status of a reachable, configured service: old build, recognisers still installing, or ready. */
export function describeOnlineOcr(health: ScoreboardOcrHealth): OcrHealthSummary {
  const scripts = health.scripts ?? [];
  // Builds since v3 always list "default"; an empty list is an image from before the name recognisers.
  if (scripts.length === 0) {
    return { tone: 'warning', label: 'Online · older OCR build', detail: `${details(health)}. Redeploy the OCR service to get Arabic and Korean names.` };
  }
  const missing = OPTIONAL_SCRIPTS.filter((s) => !scripts.includes(s));
  if (missing.length === 0) return { tone: 'success', label: 'Online', detail: details(health) };
  const reasons = missing.map((s) => `${scriptName(s)}: ${health.missingScripts?.[s] ?? 'not installed'}`).join('; ');
  return {
    tone: 'warning',
    label: `Online · ${missing.map(scriptName).join('/')} names off`,
    detail: `${details(health)}. ${reasons}. The service retries the download on its own; check that it can reach modelscope.cn.`,
  };
}
