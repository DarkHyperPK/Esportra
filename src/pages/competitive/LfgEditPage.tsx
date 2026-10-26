import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useLfgListing, useUpdateLfgListing } from '@/hooks/competitive/useLfg';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';

const DESC_MAX = 280;

export default function LfgEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const listingQuery = useLfgListing(id!);
  const updateMutation = useUpdateLfgListing(id!);

  const [description, setDescription] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<1 | 3 | 7>(3);
  const [seeded, setSeeded] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  const listing = listingQuery.data;

  useEffect(() => {
    if (listing && !seeded) {
      setDescription(listing.description ?? '');
      if (listing.expiresAt) {
        const daysLeft = Math.ceil(
          (new Date(listing.expiresAt).getTime() - Date.now()) / 86_400_000,
        );
        setExpiresInDays(daysLeft >= 7 ? 7 : daysLeft >= 3 ? 3 : 1);
      }
      setSeeded(true);
    }
  }, [listing, seeded]);

  async function handleSave() {
    setPhase('saving');
    try {
      const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000).toISOString();
      await updateMutation.mutateAsync({ description: description || null, expiresAt });
      setPhase('done');
      setTimeout(() => navigate(`/competitive/lfg/${id}`), 800);
    } catch {
      setPhase('error');
    }
  }

  if (listingQuery.isLoading) {
    return (
      <CompetitivePageShell>
        <div className="max-w-xl mx-auto px-4 py-8 space-y-3 animate-pulse">
          <div className="h-4 w-32 bg-white/[0.06] rounded" />
          <div className="h-8 w-48 bg-white/[0.06] rounded" />
        </div>
      </CompetitivePageShell>
    );
  }

  if (listingQuery.isError || !listing) {
    return (
      <CompetitivePageShell>
        <div className="max-w-xl mx-auto px-4 py-8">
          <p className="text-[14px] text-white/55">Could not load listing.</p>
        </div>
      </CompetitivePageShell>
    );
  }

  const charsLeft = DESC_MAX - description.length;

  return (
    <CompetitivePageShell>
      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        <Link to={`/competitive/lfg/${id}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to listing
        </Link>

        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1">Edit Listing</p>
        <h1 className="[font-family:var(--font-heading)] font-black text-[26px] text-white leading-tight mb-8">
          Update your listing
        </h1>

        <div className="space-y-8">
          {/* Description */}
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-white/40 mb-2">Description</p>
            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
                placeholder="Describe your playstyle, availability, what you're looking for..."
                rows={4}
                className="w-full rounded-md bg-white/[0.03] border border-white/[0.08] text-white text-[13px] px-3 py-2.5 placeholder-white/25 focus:outline-none focus:border-white/20 resize-none"
              />
              <p className={`text-right text-[11px] mt-1 ${charsLeft <= 20 ? 'text-amber-400' : 'text-white/35'}`}>
                {description.length} / {DESC_MAX}
              </p>
            </div>
          </div>

          {/* Duration */}
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-white/40 mb-2">Extend expiry</p>
            <div className="flex gap-2">
              {([1, 3, 7] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setExpiresInDays(days)}
                  className={[
                    'px-4 py-2 rounded-md border text-[13px] transition-colors min-h-[44px]',
                    expiresInDays === days
                      ? 'border-white/30 bg-white text-[#08080a]'
                      : 'border-white/[0.08] text-white/55 hover:border-white/20',
                  ].join(' ')}
                >
                  {days === 1 ? '1 day' : `${days} days`}
                </button>
              ))}
            </div>
          </div>

          {phase === 'error' && (
            <p className="text-[13px] text-red-400">Something went wrong. Try again.</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <Link to={`/competitive/lfg/${id}`}
              className="text-[13px] text-white/40 hover:text-white transition-colors">
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={phase === 'saving' || phase === 'done'}
              className="flex items-center gap-2 rounded-md bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white text-[13px] px-6 h-10 transition-colors"
            >
              {phase === 'saving'
                ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Saving…</span></>
                : phase === 'done' ? 'Saved!' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </CompetitivePageShell>
  );
}
