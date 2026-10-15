import { useRundownPublication } from '@/hooks/useRundownPublication';
export function RundownPublication({ showId }: { showId: string }) {
  const publication = useRundownPublication(showId);
  if (publication.isLoading) return <p role="status" className="text-sm text-zinc-400">Checking published rundown…</p>;
  if (!publication.data) return <p className="text-xs text-zinc-500">Published version unavailable. Check the broadcast screens on desktop.</p>;
  const { version, nodes } = publication.data;
  return <div className="my-4 space-y-2 text-sm text-zinc-400" aria-label="Published broadcast screens version">
    <p className="font-semibold text-zinc-200">{version ? `Published rundown v${version}` : 'Rundown not published yet'}</p>
    {version > 0 && <p className="text-xs">Each send saves a version. Active Air nodes apply upcoming items after a confirmed Take or Skip; the current item and Program stay unchanged.</p>}
    {nodes.length === 0 && version > 0 && <p>No node has reported this show’s version yet. Sending does not confirm receipt.</p>}
    {nodes.map(node => {
      const age = node.seenAt ? Date.now() - Date.parse(node.seenAt) : NaN;
      const fresh = Number.isFinite(age) && age >= -5000 && age <= 15000;
      return <p key={node.id}>{node.name} · {fresh && node.plan ? `v${node.plan.version}${node.plan.pendingVersion ? ` · v${node.plan.pendingVersion} waiting` : node.plan.version < version ? ' · older version' : ' · current'}` : 'last report stale · verify on desktop'}</p>;
    })}
  </div>;
}
