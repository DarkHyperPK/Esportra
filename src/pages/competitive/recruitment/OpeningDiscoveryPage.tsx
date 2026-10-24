import { Link } from 'react-router-dom';
import { PageIntro } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { useDiscoverOpenings } from '@/hooks/competitive/useRecruitment';
import type { RecruitmentOpening } from '@/types/competitive';

const GAME_SLUG = 'valorant';

function SkeletonCard() {
  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-4 space-y-3 opacity-60 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 bg-white/[0.06]" />
          <div className="h-3 w-32 bg-white/[0.04]" />
        </div>
        <div className="h-8 w-16 bg-white/[0.04]" />
      </div>
      <div className="flex gap-3">
        <div className="h-3 w-20 bg-white/[0.04]" />
        <div className="h-3 w-16 bg-white/[0.04]" />
      </div>
    </div>
  );
}

function EmptyState({ eyebrow, body }: { eyebrow: string; body: string }) {
  return (
    <div className="py-12 space-y-3">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">{eyebrow}</p>
      <p className="text-[14px] text-white/55 max-w-md">{body}</p>
    </div>
  );
}

function formatExpiry(iso: string | null): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const days = Math.ceil(ms / 86_400_000);
  return days === 1 ? 'Expires today' : `Expires in ${days}d`;
}

function OpeningCard({ opening }: { opening: RecruitmentOpening }) {
  const positions = opening.positionsAvailable
    ? `${opening.positionsFilled}/${opening.positionsAvailable} filled`
    : null;

  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-white truncate">{opening.title}</p>
          <p className="text-[13px] text-white/55 mt-0.5">
            {opening.teamName ?? 'Unknown team'}
            {opening.teamTag ? ` · ${opening.teamTag}` : ''}
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none shrink-0 px-4 min-h-[36px] text-[13px]"
        >
          <Link to={`/competitive/recruitment/${opening.id}/apply`}>Apply</Link>
        </Button>
      </div>
      <div className="flex items-center gap-3 text-[12px] text-white/40 flex-wrap">
        {positions && <span>{positions}</span>}
        {opening.expiresAt && <span>{formatExpiry(opening.expiresAt)}</span>}
        <span className="capitalize">{opening.mode}</span>
      </div>
      {opening.description && (
        <p className="text-[13px] text-white/55 line-clamp-2">{opening.description}</p>
      )}
    </div>
  );
}

export default function OpeningDiscoveryPage() {
  const openingsQuery = useDiscoverOpenings(GAME_SLUG);
  const openings = openingsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white w-full">
      <div className="px-4 pt-8 pb-4 lg:px-8">
        <PageIntro eyebrow="TEAM RECRUITMENT" title="Find a Team" className="mb-6" />
      </div>

      <main className="px-4 lg:px-8 pb-8">
        {openingsQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : openingsQuery.isError ? (
          <div className="py-8 space-y-3">
            <p className="text-[14px] text-white/55">
              Could not load openings. Check your connection and try again.
            </p>
            <Button
              variant="outline"
              onClick={() => openingsQuery.refetch()}
              className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]"
            >
              Retry
            </Button>
          </div>
        ) : openings.length === 0 ? (
          <EmptyState
            eyebrow="VALORANT"
            body="No team openings posted yet. Check back soon or ask your team to post one."
          />
        ) : (
          <div className="space-y-2" role="list" aria-label="Team recruitment openings">
            {openings.map((opening) => (
              <div key={opening.id} role="listitem">
                <OpeningCard opening={opening} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
