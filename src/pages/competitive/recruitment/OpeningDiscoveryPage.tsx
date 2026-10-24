import { ClipboardList } from 'lucide-react';
import { PageIntro } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { motion, useReducedMotion } from 'framer-motion';
import { useDiscoverOpenings } from '@/hooks/competitive/useRecruitment';
import { RecruitmentOpeningCard } from '@/components/competitive/RecruitmentOpeningCard';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';

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

export default function OpeningDiscoveryPage() {
  const openingsQuery = useDiscoverOpenings(GAME_SLUG);
  const openings = openingsQuery.data ?? [];
  const reduced = useReducedMotion() ?? false;

  return (
    <CompetitivePageShell>
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
          <div className="py-16 flex flex-col items-center gap-4 text-center">
            <ClipboardList className="h-8 w-8 text-white/25" />
            <p className="text-[15px] font-medium text-white/55">No team openings posted yet</p>
            <p className="text-[13px] text-white/35 max-w-xs">
              Teams post here when they need players.
            </p>
          </div>
        ) : (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="space-y-2"
            role="list"
            aria-label="Team recruitment openings"
          >
            {openings.map((opening) => (
              <div key={opening.id} role="listitem">
                <RecruitmentOpeningCard opening={opening} />
              </div>
            ))}
          </motion.div>
        )}
      </main>
    </CompetitivePageShell>
  );
}
