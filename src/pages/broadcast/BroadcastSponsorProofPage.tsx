import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CommandShell, CommandPageGrid, CommandHeader, CommandSection,
  CommandButton, CommandEmptyState, CommandShowHeader,
} from '@/components/management/CommandSurface';
import { InlineNotice } from '@/components/ui/kit/InlineNotice';
import { EYEBROW_CLASS } from '@/components/ui/kit/tone';
import { useBroadcastShow } from '@/hooks/useBroadcastShow';
import { useSponsorProof } from '@/hooks/useSponsorProof';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatDuration, formatPrintDate, slotTypeLabel } from '@/services/broadcastFormat';
import type { SponsorProofSponsor } from '@/types/broadcast';

// ── Sponsor print document ────────────────────────────────────────────────────

interface SponsorPrintDocumentProps {
  sponsor: SponsorProofSponsor;
  showTitle: string;
  showId: string;
  scheduledAt: string | null;
}

function SponsorPrintDocument({
  sponsor,
  showTitle,
  showId,
  scheduledAt,
}: SponsorPrintDocumentProps) {
  const dateStr = formatPrintDate(scheduledAt);
  const slots = Object.entries(sponsor.bySlotType);

  return (
    <div className="sponsor-print-doc">
      <style>{`
        @media print {
          #root, body > *:not(#sponsor-print-portal) { display: none !important; }
          #sponsor-print-portal { display: block !important; }
          body {
            background: #ffffff;
            color: #0F0F10;
            font-family: Inter, system-ui, sans-serif;
            margin: 0;
          }
          .sponsor-print-doc {
            padding: 24mm 20mm;
            font-family: Inter, system-ui, sans-serif;
            color: #0F0F10;
          }
        }
      `}</style>
      <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '20px', color: '#0F0F10', marginBottom: 0 }}>
        Sponsor Report — {showTitle}{dateStr ? ` · ${dateStr}` : ''}
      </h1>
      <hr style={{ borderTop: '1px solid #D1D5DB', margin: '8px 0 24px' }} />

      <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6B7280', marginBottom: '12px' }}>
        Sponsor Placements
      </p>

      <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '16px', color: '#0F0F10', marginBottom: '16px' }}>
        {sponsor.name}
      </h2>

      <hr style={{ borderTop: '1px solid #E5E7EB', marginBottom: '16px' }} />

      <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #F3F4F6' }}>
        <span style={{ fontSize: '12px', color: '#374151' }}>Total on-air</span>
        <span style={{ float: 'right', fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#0F0F10' }}
          title={`${Math.floor(sponsor.totalOnAirSeconds / 60)} minutes ${Math.floor(sponsor.totalOnAirSeconds % 60)} seconds`}
        >
          {formatDuration(sponsor.totalOnAirSeconds)}
        </span>
      </div>
      <div style={{ marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #F3F4F6' }}>
        <span style={{ fontSize: '12px', color: '#374151' }}>Placements</span>
        <span style={{ float: 'right', fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#0F0F10' }}>
          {sponsor.placementCount}
        </span>
      </div>

      {slots.length > 0 && (
        <>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6B7280', marginTop: '16px', marginBottom: '8px' }}>
            Slot Breakdown
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ textAlign: 'left', fontSize: '11px', color: '#6B7280', paddingBottom: '4px' }}>Slot type</th>
                <th style={{ textAlign: 'left', fontSize: '11px', color: '#6B7280', paddingBottom: '4px' }}>Placements</th>
                <th style={{ textAlign: 'left', fontSize: '11px', color: '#6B7280', paddingBottom: '4px' }}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {slots.map(([type, breakdown]) => (
                <tr key={type} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ fontSize: '12px', color: '#0F0F10', padding: '4px 0' }}>{slotTypeLabel(type)}</td>
                  <td style={{ fontSize: '12px', color: '#0F0F10', padding: '4px 0' }}>{breakdown.count}</td>
                  <td style={{ fontSize: '12px', color: '#0F0F10', padding: '4px 0' }}>{formatDuration(breakdown.totalSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {sponsor.hasIncomplete && (
        <p style={{ fontSize: '11px', color: '#6B7280', fontStyle: 'italic', marginTop: '12px' }}>
          Note: {sponsor.incompleteCount} incomplete impression{sponsor.incompleteCount === 1 ? '' : 's'} excluded from totals.
        </p>
      )}

      <hr style={{ borderTop: '2px solid #0F0F10', marginTop: '24px' }} />
      <p style={{ fontSize: '9px', color: '#9CA3AF', textAlign: 'center', marginTop: '8px' }}>
        Produced on Esportra Air · Ref: {showId}
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const ARRIVE = { type: 'spring' as const, stiffness: 420, damping: 34 };

export default function BroadcastSponsorProofPage() {
  const { showId = '' } = useParams<{ showId: string }>();
  const reduceMotion = useReducedMotion();

  const { data: show } = useBroadcastShow(showId);
  const { data, isLoading } = useSponsorProof(showId);

  const [printingSponsorId, setPrintingSponsorId] = useState<string | null>(null);

  useEffect(() => {
    if (printingSponsorId) {
      window.print();
      setPrintingSponsorId(null);
    }
  }, [printingSponsorId]);

  const showTitle = show?.title ?? '…';
  const showStatus = show?.status === 'live' ? 'live' : show?.status === 'ended' ? 'ended' : 'draft';
  const sponsors = data?.sponsors ?? [];

  return (
    <>
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
            title="Sponsor proof"
            description="On-air time captured per sponsor. Export to generate a sponsor report."
          />

          {isLoading && (
            <CommandSection>
              {[1, 2, 3].map((n) => (
                <div key={n} className="mb-3 h-24 animate-pulse bg-white/[0.03]" />
              ))}
            </CommandSection>
          )}

          {!isLoading && sponsors.length === 0 && (
            <CommandEmptyState
              title="No sponsors configured"
              description="Add sponsors on the Sponsors page, then run a show to capture on-air data."
              action={
                <CommandButton variant="ghost" size="sm" asChild>
                  <Link to={`/broadcast/shows/${showId}/sponsors`}>Go to sponsors</Link>
                </CommandButton>
              }
            />
          )}

          {!isLoading && sponsors.map((sponsor, index) => {
            const slots = Object.entries(sponsor.bySlotType);
            const delay = Math.min(index, 3) * 0.04;
            return (
              <motion.div
                key={sponsor.sponsorId}
                initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0.1 } : { ...ARRIVE, delay }}
              >
                <CommandSection className="p-5">
                  {/* Sponsor header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={EYEBROW_CLASS}>SPONSOR PLACEMENTS</p>
                      <p className="mt-1 text-base font-bold text-white">{sponsor.name}</p>
                    </div>
                    <CommandButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setPrintingSponsorId(sponsor.sponsorId)}
                      aria-label={`Export sponsor report for ${sponsor.name}`}
                    >
                      Export sponsor report
                    </CommandButton>
                  </div>

                  {/* Metrics row */}
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="border border-white/10 bg-white/[0.025] p-3">
                      <div
                        className="text-xl font-black text-white"
                        title={`${Math.floor(sponsor.totalOnAirSeconds / 60)} minutes ${Math.floor(sponsor.totalOnAirSeconds % 60)} seconds`}
                      >
                        {formatDuration(sponsor.totalOnAirSeconds)}
                      </div>
                      <div className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Total on-air
                      </div>
                    </div>
                    <div className="border border-white/10 bg-white/[0.025] p-3">
                      <div className="text-xl font-black text-white">{sponsor.placementCount}</div>
                      <div className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Placements
                      </div>
                    </div>
                    <div className="border border-white/10 bg-white/[0.025] p-3">
                      <div className="text-xl font-black text-white">{slots.length}</div>
                      <div className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Slots
                      </div>
                    </div>
                  </div>

                  {/* Slot breakdown */}
                  {slots.length > 0 && (
                    <div className="mt-4">
                      <p className={`${EYEBROW_CLASS} mb-2`}>SLOT BREAKDOWN</p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="pb-1 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                              Slot type
                            </th>
                            <th className="pb-1 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                              Placements
                            </th>
                            <th className="pb-1 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                              Duration
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {slots.map(([type, breakdown]) => (
                            <tr key={type} className="border-t border-white/[0.05]">
                              <td className="py-1.5 text-sm text-zinc-300">{slotTypeLabel(type)}</td>
                              <td className="py-1.5 font-mono text-[13px] text-white">{breakdown.count}</td>
                              <td className="py-1.5 font-mono text-[13px] text-zinc-400">
                                {formatDuration(breakdown.totalSeconds)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Incomplete notice */}
                  {sponsor.hasIncomplete && (
                    <InlineNotice tone="warning" className="mt-4">
                      {sponsor.incompleteCount} incomplete impression
                      {sponsor.incompleteCount === 1 ? '' : 's'} excluded.
                    </InlineNotice>
                  )}
                </CommandSection>
              </motion.div>
            );
          })}
        </CommandPageGrid>
      </CommandShell>

      {/* Print portal — aria-hidden so screen readers skip it on screen */}
      <div id="sponsor-print-portal" aria-hidden style={{ display: 'none' }}>
        {printingSponsorId && (() => {
          const s = sponsors.find((sp) => sp.sponsorId === printingSponsorId);
          if (!s) return null;
          return (
            <SponsorPrintDocument
              sponsor={s}
              showTitle={showTitle}
              showId={showId}
              scheduledAt={show?.scheduledAt ?? null}
            />
          );
        })()}
      </div>
    </>
  );
}
