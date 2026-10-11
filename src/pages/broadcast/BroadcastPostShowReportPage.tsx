import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CommandShell, CommandPageGrid, CommandHeader, CommandSection,
  CommandShowHeader,
} from '@/components/management/CommandSurface';
import { InlineNotice } from '@/components/ui/kit/InlineNotice';
import { StatusPill } from '@/components/ui/kit/StatusPill';
import { EYEBROW_CLASS } from '@/components/ui/kit/tone';
import EntityAvatar from '@/components/ui/EntityAvatar';
import { useBroadcastShow } from '@/hooks/useBroadcastShow';
import { usePostShowReport } from '@/hooks/usePostShowReport';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatOffset, formatDuration, formatShowDate } from '@/services/broadcastFormat';
import type { SegmentType, PostShowReport, ReportMatch } from '@/types/broadcast';
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

const MATCH_STATUS_TONE: Record<string, Tone> = {
  pending: 'neutral',
  active: 'accent',
  done: 'success',
};

const SOURCE_TONE: Record<string, Tone> = {
  gep: 'success',
  manual: 'warning',
  captain: 'neutral',
};

function sectionTransition(index: number, reduceMotion: boolean) {
  if (reduceMotion) return { duration: 0.1 };
  return { ...ARRIVE, delay: Math.min(index, 6) * 0.04 };
}

// ── Section: Show info ────────────────────────────────────────────────────────

function ShowSection({ show, reduceMotion }: { show: PostShowReport['show']; reduceMotion: boolean }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={sectionTransition(0, reduceMotion)}
    >
      <CommandSection className="p-5">
        <p className={`${EYEBROW_CLASS} mb-4`}>SHOW</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
          <div>
            <p className={EYEBROW_CLASS}>Title</p>
            <p className="mt-1 text-sm text-white">{show.title}</p>
          </div>
          <div>
            <p className={EYEBROW_CLASS}>Scheduled</p>
            <p className="mt-1 text-sm text-white">
              <time dateTime={show.scheduledAt ?? ''}>{formatShowDate(show.scheduledAt)}</time>
            </p>
          </div>
          <div>
            <p className={EYEBROW_CLASS}>Started</p>
            <p className="mt-1 text-sm text-white">
              <time dateTime={show.startedAt ?? ''}>{formatShowDate(show.startedAt)}</time>
            </p>
          </div>
          <div>
            <p className={EYEBROW_CLASS}>Ended</p>
            <p className="mt-1 text-sm text-white">
              <time dateTime={show.endedAt ?? ''}>{formatShowDate(show.endedAt)}</time>
            </p>
          </div>
          <div>
            <p className={EYEBROW_CLASS}>Duration</p>
            <p className="mt-1 text-sm text-white">{formatDuration(show.durationSeconds)}</p>
          </div>
        </div>
      </CommandSection>
    </motion.section>
  );
}

// ── Section: Match record ─────────────────────────────────────────────────────

function MatchRecordSection({ matches, reduceMotion }: { matches: ReportMatch[]; reduceMotion: boolean }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={sectionTransition(1, reduceMotion)}
    >
      <CommandSection className="p-0">
        <div className="border-b border-white/10 px-5 py-4">
          <p className={EYEBROW_CLASS}>MATCH RECORD</p>
        </div>
        {matches.map((match) => (
          <div key={match.matchId}>
            <div className="flex items-center gap-3 border-b border-white/[0.07] bg-black/10 px-5 py-3">
              <span className="font-mono text-[11px] font-bold uppercase text-white">
                {match.matchCode}
              </span>
              <StatusPill
                tone={MATCH_STATUS_TONE[match.status] ?? 'neutral'}
                label={match.status}
              />
            </div>
            {match.maps.map((map) => (
              <div
                key={map.mapNumber}
                className="flex items-center gap-4 border-b border-white/[0.04] px-5 py-2.5 pl-10"
              >
                <span className="w-14 font-mono text-[11px] text-zinc-500">Map {map.mapNumber}</span>
                <span className="w-20 font-mono text-[13px] font-semibold text-white">
                  {map.teamAScore ?? '—'} – {map.teamBScore ?? '—'}
                </span>
                <StatusPill
                  tone={SOURCE_TONE[map.source] ?? 'neutral'}
                  label={map.source === 'gep' ? 'GEP' : map.source === 'manual' ? 'Manual' : 'Captain'}
                />
              </div>
            ))}
          </div>
        ))}
      </CommandSection>
    </motion.section>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BroadcastPostShowReportPage() {
  const { showId = '' } = useParams<{ showId: string }>();
  const reduceMotion = useReducedMotion();

  const { data: show } = useBroadcastShow(showId);
  const { data, isLoading } = usePostShowReport(showId);

  const showTitle = show?.title ?? '…';
  const showStatus = show?.status === 'live' ? 'live' : show?.status === 'ended' ? 'ended' : 'draft';

  return (
    <CommandShell>
      <CommandShowHeader
        showTitle={showTitle}
        showStatus={showStatus}
        backHref={`/broadcast/shows/${showId}`}
        backLabel="Back to show"
      />

      <CommandPageGrid>
        <CommandHeader
          eyebrow={`BROADCAST · ${showTitle}`}
          title="Post-show report"
          description="Complete production record. All times UTC."
        />

        {isLoading && (
          <>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div
                key={n}
                className="h-32 animate-pulse border border-white/10 bg-white/[0.03]"
              />
            ))}
          </>
        )}

        {!isLoading && data?.showNotEnded && (
          <CommandSection>
            <InlineNotice tone="neutral">
              The post-show report is available after the show has ended.
            </InlineNotice>
          </CommandSection>
        )}

        {!isLoading && data?.forbidden && (
          <CommandSection>
            <InlineNotice tone="critical">
              You do not have access to this report.
            </InlineNotice>
          </CommandSection>
        )}

        {!isLoading && data?.report && (() => {
          const report = data.report;
          return (
            <>
              <ShowSection show={report.show} reduceMotion={reduceMotion} />

              <MatchRecordSection matches={report.matches} reduceMotion={reduceMotion} />

              {/* Section 3: Corrections */}
              <motion.section
                initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={sectionTransition(2, reduceMotion)}
              >
                <CommandSection className="p-5">
                  <p className={`${EYEBROW_CLASS} mb-3`}>CORRECTIONS</p>
                  <p className="text-sm text-zinc-400">
                    {report.corrections.count === 0
                      ? 'No corrections logged.'
                      : `${report.corrections.count} correction${report.corrections.count === 1 ? '' : 's'} logged.`}
                  </p>
                </CommandSection>
              </motion.section>

              {/* Section 4: Crew */}
              <motion.section
                initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={sectionTransition(3, reduceMotion)}
              >
                <CommandSection className="p-0">
                  <div className="border-b border-white/10 px-5 py-4">
                    <p className={EYEBROW_CLASS}>CREW</p>
                  </div>
                  {report.crew.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-zinc-500">No crew recorded.</p>
                  ) : (
                    <div className="divide-y divide-white/[0.05]">
                      {report.crew.map((member) => (
                        <div key={member.userId} className="flex items-center gap-4 px-5 py-3">
                          <EntityAvatar
                            name={member.displayName ?? undefined}
                            entityId={member.userId}
                            type="user"
                            size="w-7 h-7"
                          />
                          <span className="text-sm font-medium text-white">
                            {member.displayName ?? '—'}
                          </span>
                          <StatusPill tone="neutral" label={member.role} />
                        </div>
                      ))}
                    </div>
                  )}
                </CommandSection>
              </motion.section>

              {/* Section 5: Sponsors */}
              <motion.section
                initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={sectionTransition(4, reduceMotion)}
              >
                <CommandSection className="p-0">
                  <div className="border-b border-white/10 px-5 py-4">
                    <p className={EYEBROW_CLASS}>SPONSORS</p>
                  </div>
                  {report.sponsors.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-zinc-500">No sponsor data captured for this show.</p>
                  ) : (
                    <table className="w-full">
                      <thead className="border-b border-white/10 bg-black/20">
                        <tr>
                          <th scope="col" className={`${EYEBROW_CLASS} px-5 py-2 text-left`}>Sponsor</th>
                          <th scope="col" className={`${EYEBROW_CLASS} w-24 px-5 py-2 text-right`}>On-air</th>
                          <th scope="col" className={`${EYEBROW_CLASS} w-24 px-5 py-2 text-right`}>Placements</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05]">
                        {report.sponsors.map((sp) => (
                          <tr key={sp.sponsorId} className="hover:bg-white/[0.02]">
                            <td className="px-5 py-3 text-sm font-medium text-white">
                              <Link
                                to={`/broadcast/shows/${showId}/sponsor-proof`}
                                className="underline underline-offset-2"
                              >
                                {sp.name}
                              </Link>
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-[13px] text-zinc-400">
                              {formatDuration(sp.totalOnAirSeconds)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-[13px] text-zinc-400">
                              {sp.placementCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CommandSection>
              </motion.section>

              {/* Section 6: Highlight timestamps */}
              <motion.section
                initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={sectionTransition(5, reduceMotion)}
              >
                <CommandSection className="p-0">
                  <div className="flex items-center border-b border-white/10 px-5 py-4">
                    <p className={EYEBROW_CLASS}>HIGHLIGHT TIMESTAMPS</p>
                    <span className="ml-auto font-mono text-[11px] text-zinc-500">
                      {report.chapters.length} chapter{report.chapters.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {report.chapters.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-zinc-500">No chapter markers recorded.</p>
                  ) : (
                    <table className="w-full">
                      <thead className="border-b border-white/10 bg-black/20">
                        <tr>
                          <th scope="col" className={`${EYEBROW_CLASS} w-28 px-5 py-2 text-left`}>Offset</th>
                          <th scope="col" className={`${EYEBROW_CLASS} w-28 px-3 py-2 text-left`}>Duration</th>
                          <th scope="col" className={`${EYEBROW_CLASS} px-3 py-2 text-left`}>Segment</th>
                          <th scope="col" className={`${EYEBROW_CLASS} w-28 px-3 py-2 text-left`}>Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05]">
                        {report.chapters.map((ch) => (
                          <tr key={ch.segmentId} className="hover:bg-white/[0.02]">
                            <td className="px-5 py-3 font-mono text-[13px] font-semibold text-white">
                              {formatOffset(ch.offsetSeconds)}
                            </td>
                            <td className="px-3 py-3">
                              <span className="font-mono text-[11px] text-zinc-400">
                                {ch.durationSeconds !== null ? formatOffset(ch.durationSeconds) : '—'}
                              </span>
                              {ch.incomplete && (
                                <StatusPill tone="warning" label="Incomplete" className="ml-2" />
                              )}
                            </td>
                            <td className="px-3 py-3 text-sm text-white">{ch.segmentName}</td>
                            <td className="px-3 py-3">
                              <StatusPill
                                tone={CHAPTER_TYPE_TONE[ch.segmentType]}
                                label={SEGMENT_LABELS[ch.segmentType]}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CommandSection>
              </motion.section>

              {/* Section 7: Player stats */}
              <motion.section
                initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={sectionTransition(6, reduceMotion)}
              >
                <CommandSection className="p-0">
                  <div className="border-b border-white/10 px-5 py-4">
                    <p className={EYEBROW_CLASS}>PLAYER STATS</p>
                  </div>
                  {report.players.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-zinc-500">No player stats recorded for this show.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <caption className="sr-only">Player statistics for this show</caption>
                        <thead className="border-b border-white/10 bg-black/20">
                          <tr>
                            <th scope="col" className={`${EYEBROW_CLASS} w-32 px-5 py-2 text-left`}>Match</th>
                            <th scope="col" className={`${EYEBROW_CLASS} px-5 py-2 text-left`}>Player</th>
                            <th scope="col" className={`${EYEBROW_CLASS} w-12 px-3 py-2 text-right`}>K</th>
                            <th scope="col" className={`${EYEBROW_CLASS} w-12 px-3 py-2 text-right`}>D</th>
                            <th scope="col" className={`${EYEBROW_CLASS} w-12 px-3 py-2 text-right`}>A</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05]">
                          {report.players.map((p) => (
                            <tr key={`${p.matchId}-${p.userId}`} className="hover:bg-white/[0.02]">
                              <td className="px-5 py-3 font-mono text-[11px] text-zinc-400">
                                {p.matchCode ?? '—'}
                              </td>
                              <td className="px-5 py-3 text-sm font-medium text-white">
                                {p.displayName ?? '—'}
                              </td>
                              <td
                                className="px-3 py-3 text-right font-mono text-[13px] tabular-nums text-white"
                                aria-label={`${p.kills} kills`}
                              >
                                {p.kills}
                              </td>
                              <td
                                className="px-3 py-3 text-right font-mono text-[13px] tabular-nums text-zinc-400"
                                aria-label={`${p.deaths} deaths`}
                              >
                                {p.deaths}
                              </td>
                              <td
                                className="px-3 py-3 text-right font-mono text-[13px] tabular-nums text-zinc-400"
                                aria-label={`${p.assists} assists`}
                              >
                                {p.assists}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CommandSection>
              </motion.section>
            </>
          );
        })()}
      </CommandPageGrid>
    </CommandShell>
  );
}

BroadcastPostShowReportPage.displayName = 'BroadcastPostShowReportPage';
