import { useRef, useState } from 'react';
import { CommandButton } from '@/components/management/CommandSurface';
import { InlineNotice } from '@/components/ui/kit/InlineNotice';
import { useRundownTemplates, useRundownPlanWrites } from '@/hooks/useRundownPlans';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { ShowMatchSlot } from '@/types/broadcast';
export function RundownTemplates({ showId, match, locked, onPreview }: { showId: string; match?: ShowMatchSlot; locked: boolean; onPreview?: (overlays: string[]) => void }) {
  const templates = useRundownTemplates(), { importTemplate } = useRundownPlanWrites(showId);
  const [preview, setPreview] = useState<string | null>(null), [notice, setNotice] = useState('');
  const retry = useRef<{ key: string; id: string } | null>(null);
  async function add(template: 'bo1' | 'bo3') {
    if (!match) return;
    const key = `${match.matchId}:${template}`;
    if (retry.current?.key !== key) retry.current = { key, id: crypto.randomUUID() };
    try { const result = await importTemplate.mutateAsync({ matchId: match.matchId, template, requestId: retry.current.id }); setNotice(`${result.count} flow items ${result.alreadyImported ? 'already added' : 'added'}. Review their order before sending.`); retry.current = null; }
    catch (error) { setNotice(getApiErrorMessage(error, 'Could not add this flow. Retry keeps the same request to avoid duplicates.')); }
  }
  return <div className="mb-5 border-b border-white/10 pb-4">
    <h4 className="mb-2 font-semibold text-white">Series broadcast screenss</h4>
    <p className="mb-3 text-sm text-zinc-400">Opening, introduction, veto, each map and its results, breaks and closing. Imported items start with manual Take.</p>
    {templates.isError && <InlineNotice tone="warning">Could not load series flows. <button onClick={() => void templates.refetch()}>Retry</button></InlineNotice>}
    {templates.data?.map(template => <div key={template.id} className="my-3">
      <div className="flex flex-wrap items-center gap-3"><strong className="mr-auto">{template.name} · {template.items.length} items</strong>
        <CommandButton size="sm" variant="ghost" onClick={() => { setPreview(preview === template.id ? null : template.id); onPreview?.([...new Set(template.items.map(item => item.overlay))]); }}>Preview {template.name}</CommandButton>
        <CommandButton size="sm" variant="secondary" disabled={locked || importTemplate.isPending || match?.bestOf !== template.bestOf} onClick={() => void add(template.id)}>Add {template.name} flow</CommandButton>
      </div>
      {preview === template.id && <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-zinc-400">{template.items.map((item, index) => <li key={index}>{item.title} · {item.plan.trigger.split('_').join(' ')} · Manual Take</li>)}</ol>}
    </div>)}
    {!match && <p className="text-xs text-zinc-500">Choose a match before adding its series flow.</p>}
    {match && ![1, 3].includes(match.bestOf || 0) && <p className="text-xs text-zinc-500">These flows support a confirmed Best of 1 or Best of 3 match. Use individual screens for other formats.</p>}
    {notice && <p role="status" className="mt-3 text-sm text-zinc-300">{notice}</p>}
  </div>;
}
