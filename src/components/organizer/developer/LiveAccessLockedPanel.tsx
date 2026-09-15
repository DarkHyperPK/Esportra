import { useState } from 'react';
import { Loader2, Shield } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { CommandButton, CommandPanel } from '@/components/management/CommandSurface';
import { useSubmitAccessRequest } from '@/hooks/useDeveloperApi';
import { useAuth } from '@/hooks/useAuth';

const MIN_CHARS = 50;

interface LiveAccessLockedPanelProps {
  orgId: string;
}

/**
 * Shown in the live keys section when the org has not yet applied for API access.
 * Submits a POST /api/developer/access-requests with the intended_use.
 */
export function LiveAccessLockedPanel({ orgId }: LiveAccessLockedPanelProps) {
  const { user, profile } = useAuth();
  const [intendedUse, setIntendedUse] = useState('');
  const submitMutation = useSubmitAccessRequest(orgId);
  const charCount = intendedUse.trim().length;
  const canSubmit = charCount >= MIN_CHARS && !submitMutation.isPending;

  const handleSubmit = () => {
    submitMutation.mutate({ intended_use: intendedUse.trim() });
  };

  return (
    <CommandPanel className="border-amber-500/25 bg-amber-950/10">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-amber-500/35 bg-amber-950/20">
          <Shield className="h-5 w-5 text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-amber-400">
            Live Access Required
          </p>
          <h3 className="mt-1 text-base font-black uppercase text-white">
            Apply for Live API Access
          </h3>
          <p className="mt-2 text-sm text-amber-200/70">
            Live keys connect to production data. Tell us how you plan to use the API and
            your application will be reviewed within 2 business days.
          </p>

          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Organization
                </p>
                <p className="text-sm text-zinc-300">{profile?.full_name || user?.email}</p>
              </div>
              <div>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Contact Email
                </p>
                <p className="text-sm text-zinc-300">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Intended Use <span className="text-rose-400">*</span>
              </label>
              <Textarea
                value={intendedUse}
                onChange={(e) => setIntendedUse(e.target.value)}
                placeholder="Describe how you plan to use the Esportra API (e.g., building a tournament dashboard, automating bracket management, integrating with your streaming platform)..."
                className="min-h-[120px] rounded-none border-white/10 bg-[#0a0a0c] text-white placeholder:text-zinc-600 focus:border-amber-500"
              />
              <p className={`text-right font-mono text-[10px] ${charCount >= MIN_CHARS ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {charCount} / {MIN_CHARS} min characters
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                Applications reviewed within 2 business days.
              </p>
              <CommandButton
                variant="warning"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {submitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Submit Application
              </CommandButton>
            </div>
          </div>
        </div>
      </div>
    </CommandPanel>
  );
}
