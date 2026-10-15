import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Film, Clipboard, Check } from 'lucide-react';
import {
  CommandShell, CommandPageGrid, CommandHeader, CommandSection,
  CommandIconButton, CommandEmptyState, CommandShowHeader,
} from '@/components/management/CommandSurface';
import { InlineNotice } from '@/components/ui/kit/InlineNotice';
import { StatusPill } from '@/components/ui/kit/StatusPill';
import { EYEBROW_CLASS } from '@/components/ui/kit/tone';
import { useBroadcastShow } from '@/hooks/useBroadcastShow';
import { useVodChapters } from '@/hooks/useVodChapters';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatOffset } from '@/services/broadcastFormat';
import type { SegmentType, VodChapter } from '@/types/broadcast';
import type { Tone } from '@/components/ui/kit/tone';

const ARRIVE = { type: 'spring' as const, stiffness: 420, damping: 34 };

const SEGMENT_LABELS: Record<SegmentType, string> = {
  match: 'Match',
  break: 'Break',
  pre_show: 'Pre-show',
  post_show: 'Post-show',
  sponsor_slot: 'Sponsor slot',
  custom: 'Custom',
};

const CHAPTER_TYPE_TONE: Record<SegmentType, Tone> = {
  match: 'accent',
  break: 'neutral',
  pre_show: 'neutral',
  post_show: 'neutral',
  sponsor_slot: 'neutral',
  custom: 'neutral',
};

function ChapterRow({
  chapter,
  index,
  copiedId,
  reduceMotion,
  onCopy,
}: {
  chapter: VodChapter;
  index: number;
  copiedId: string | null;
  reduceMotion: boolean;
  onCopy: (chapter: VodChapter) => void;
}) {
  const offset = formatOffset(chapter.offsetSeconds);
  const duration = chapter.durationSeconds !== null
    ? formatOffset(chapter.durationSeconds)
    : null;

  return (
    <motion.tr
      key={chapter.segmentId}
      initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0.1 }
          : { ...ARRIVE, delay: Math.min(index, 8) * 0.025 }
      }
      className="hover:bg-white/[0.02]"
    >
      <td className="px-5 py-3">
        <span
          className="font-mono text-[13px] font-semibold text-white"
          aria-label={`${offset} elapsed`}
        >
          {offset}
        </span>
      </td>
      <td className="px-3 py-3">
        <span className="font-mono text-[11px] text-zinc-400">
          {duration ?? '—'}
        </span>
        {chapter.incomplete && (
          <StatusPill tone="warning" label="Incomplete" className="ml-2" />
        )}
      </td>
      <td className="px-3 py-3">
        <span className="text-sm font-medium text-white">{chapter.segmentName}</span>
      </td>
      <td className="px-3 py-3">
        <StatusPill
          tone={CHAPTER_TYPE_TONE[chapter.segmentType]}
          label={SEGMENT_LABELS[chapter.segmentType]}
        />
      </td>
      <td className="px-3 py-3 text-right">
        <CommandIconButton
          variant="ghost"
          label={`Copy chapter timestamp: ${offset} ${chapter.segmentName}`}
          onClick={() => onCopy(chapter)}
        >
          {copiedId === chapter.segmentId ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Clipboard className="h-3.5 w-3.5" />
          )}
        </CommandIconButton>
      </td>
    </motion.tr>
  );
}

export default function BroadcastVodChaptersPage() {
  const { showId = '' } = useParams<{ showId: string }>();
  const reduceMotion = useReducedMotion();

  const { data: show } = useBroadcastShow(showId);
  const { data, isLoading } = useVodChapters(showId);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopy(chapter: VodChapter) {
    const offset = formatOffset(chapter.offsetSeconds);
    const text = `${offset} ${chapter.segmentName}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(chapter.segmentId);
    setTimeout(() => setCopiedId((prev) => (prev === chapter.segmentId ? null : prev)), 1500);
  }

  const showTitle = show?.title ?? '…';
  const showStatus = show?.status === 'live' ? 'live' : show?.status === 'ended' ? 'ended' : 'draft';
  const chapters = data?.chapters ?? [];
  const showNotEnded = data?.showNotEnded ?? false;

  return (
    <CommandShell>
      <CommandShowHeader
        showTitle={showTitle}
        showStatus={showStatus}
        backHref={`/broadcast/shows/${showId}`}
        backLabel="Back to show"
      />

      {/* aria-live region for copy feedback */}
      <div aria-live="polite" aria-atomic className="sr-only">
        {copiedId
          ? (() => {
              const ch = chapters.find((c) => c.segmentId === copiedId);
              return ch ? `Copied: ${formatOffset(ch.offsetSeconds)} ${ch.segmentName}` : '';
            })()
          : ''}
      </div>

      <CommandPageGrid>
        <CommandHeader
          eyebrow={`BROADCAST · ${showTitle}`}
          title="VOD chapters"
          description="Copy timestamps for video editing. Offsets are relative to show start."
        />

        {isLoading && (
          <CommandSection className="p-0">
            <div className="divide-y divide-white/[0.05]">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-14 animate-pulse bg-white/[0.03]" />
              ))}
            </div>
          </CommandSection>
        )}

        {!isLoading && showNotEnded && (
          <CommandSection>
            <InlineNotice tone="neutral">
              Chapter markers are available after the show has ended.
            </InlineNotice>
          </CommandSection>
        )}

        {!isLoading && !showNotEnded && chapters.length === 0 && (
          <CommandEmptyState
            icon={<Film className="h-6 w-6" />}
            title="No chapters recorded"
            description="Chapter markers are written when segment takes are logged during a live show. Start a show and press Take in the broadcast screens."
          />
        )}

        {!isLoading && !showNotEnded && chapters.length > 0 && (
          <CommandSection className="p-0">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <p className={EYEBROW_CLASS}>CHAPTERS</p>
              <span className="font-mono text-[11px] text-zinc-500">
                {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead className="border-b border-white/10 bg-black/20">
                  <tr>
                    <th scope="col" className={`${EYEBROW_CLASS} w-28 px-5 py-2 text-left`}>Offset</th>
                    <th scope="col" className={`${EYEBROW_CLASS} w-28 px-3 py-2 text-left`}>Duration</th>
                    <th scope="col" className={`${EYEBROW_CLASS} px-3 py-2 text-left`}>Segment</th>
                    <th scope="col" className={`${EYEBROW_CLASS} w-28 px-3 py-2 text-left`}>Type</th>
                    <th scope="col" className="w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {chapters.map((chapter, i) => (
                    <ChapterRow
                      key={chapter.segmentId}
                      chapter={chapter}
                      index={i}
                      copiedId={copiedId}
                      reduceMotion={reduceMotion}
                      onCopy={handleCopy}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CommandSection>
        )}
      </CommandPageGrid>
    </CommandShell>
  );
}
