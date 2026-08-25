import { Link } from 'react-router-dom';
import { PowerOff, ArrowLeft } from 'lucide-react';

interface FeatureUnavailableProps {
  featureName: string;
  backTo?: string;
  backLabel?: string;
}

/**
 * Rendered when a platform feature is switched off in the Admin Centre.
 * The middleware already blocks the APIs — this is the matching UI state.
 */
export function FeatureUnavailable({ featureName, backTo = '/admin/dashboard', backLabel = 'Command Centre' }: FeatureUnavailableProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center border border-white/10 bg-white/[0.02]">
        <PowerOff className="h-7 w-7 text-zinc-500" />
      </div>
      <div>
        <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.45em] text-rose-400">Feature Off</p>
        <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-white">{featureName} is disabled</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-500">
          Platform administrators have turned this feature off. All data is preserved and
          it will come back the moment it is re-enabled.
        </p>
      </div>
      <Link
        to={backTo}
        className="inline-flex items-center gap-2 border border-white/25 bg-transparent px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-white transition-colors hover:border-rose-500/60"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {backLabel}
      </Link>
    </div>
  );
}
