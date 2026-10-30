import ProEventRequestQueue from '@/components/admin/ProEventRequestQueue';

export default function ProEventRequestsTool() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">Admin centre</p>
        <h1 className="font-heading text-2xl font-semibold text-white">Pro event requests</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Review pro event briefs submitted from the pricing page. Follow up off-platform and mark status
          after agreeing scope and payment. No request grants an entitlement automatically.
        </p>
      </div>
      <ProEventRequestQueue />
    </div>
  );
}
