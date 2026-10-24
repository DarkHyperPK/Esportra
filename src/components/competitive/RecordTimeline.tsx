import { Trophy, Users, Swords, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCompetitiveRecords } from '@/hooks/competitive/useCompetitiveIntegration';
import type { CompetitiveRecord } from '@/types/competitive';

interface Props {
  userId: string;
  game?: string;
}

type TimelineKind = 'membership' | 'placement' | 'scrim' | 'tryout';

interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  date: string;
  label: string;
  sublabel: string;
  meta?: string;
}

function sortByDate(a: TimelineEvent, b: TimelineEvent): number {
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;
  return new Date(b.date).getTime() - new Date(a.date).getTime();
}

function buildEvents(record: CompetitiveRecord): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  record.memberships.forEach((m) => {
    events.push({
      id: `membership-${m.teamId}-${m.joinedAt}`,
      kind: 'membership',
      date: m.joinedAt,
      label: m.teamName,
      sublabel: m.role,
      meta: m.leftAt
        ? `Left ${new Date(m.leftAt).getFullYear()}`
        : 'Active',
    });
  });

  record.placements.forEach((p) => {
    events.push({
      id: `placement-${p.tournamentId}`,
      kind: 'placement',
      date: '',
      label: p.tournamentName,
      sublabel: `#${p.placement}${p.teamName ? ` · ${p.teamName}` : ''}`,
    });
  });

  record.scrims.forEach((s) => {
    const myScore = s.userTeamSide === 1 ? s.team1Score : s.team2Score;
    const oppScore = s.userTeamSide === 1 ? s.team2Score : s.team1Score;
    const oppName = s.userTeamSide === 1 ? s.team2Name : s.team1Name;
    const score =
      myScore != null && oppScore != null
        ? `${myScore}–${oppScore}`
        : s.status;
    events.push({
      id: `scrim-${s.id}`,
      kind: 'scrim',
      date: s.scheduledAt,
      label: `vs ${oppName}`,
      sublabel: score,
    });
  });

  record.tryoutOutcomes
    .filter((t) => t.recommendation === 'offer')
    .forEach((t) => {
      events.push({
        id: `tryout-${t.sessionId}`,
        kind: 'tryout',
        date: t.createdAt,
        label: t.teamName,
        sublabel: t.sessionTitle,
      });
    });

  return events.sort(sortByDate);
}

const KIND_ICON: Record<TimelineKind, React.ElementType> = {
  membership: Users,
  placement: Trophy,
  scrim: Swords,
  tryout: Star,
};

const KIND_LABEL: Record<TimelineKind, string> = {
  membership: 'Team',
  placement: 'Tournament',
  scrim: 'Scrim',
  tryout: 'Offer',
};

function formatEventDate(date: string): string {
  return new Date(date).toLocaleDateString('en', {
    month: 'short',
    year: 'numeric',
  });
}

function EventRow({ event }: { event: TimelineEvent }) {
  const Icon = KIND_ICON[event.kind];
  return (
    <li className="relative pl-5 pb-5">
      <div
        className="absolute left-[3px] top-0 bottom-0 w-px bg-white/[0.06]"
        aria-hidden
      />
      <div
        className="absolute left-0 top-[7px] h-[7px] w-[7px] border border-rose-500/60 bg-[#0A0A0A]"
        aria-hidden
      />
      <div className="flex items-start gap-2 min-w-0">
        <Icon
          className="h-3.5 w-3.5 text-white/30 mt-0.5 shrink-0"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
            {KIND_LABEL[event.kind]}
          </p>
          <p className="text-[14px] text-white/90 truncate">{event.label}</p>
          <p className="text-[12px] text-white/50">{event.sublabel}</p>
          {event.meta && (
            <p className="text-[11px] text-white/30 mt-0.5">{event.meta}</p>
          )}
          {event.date && (
            <p className="text-[11px] text-white/25 mt-1">
              {formatEventDate(event.date)}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function LoadingSkeleton() {
  return (
    <ul aria-busy="true" aria-label="Loading career timeline">
      {[1, 2, 3].map((i) => (
        <li key={i} className="pl-5 pb-5">
          <div className="space-y-1.5">
            <div className="h-3 w-12 bg-white/[0.06]" />
            <div className="h-4 w-40 bg-white/[0.06]" />
            <div className="h-3 w-24 bg-white/[0.04]" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RecordTimeline({ userId, game }: Props) {
  const { data, isLoading, isError, refetch } = useCompetitiveRecords(
    userId,
    game,
  );

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return (
      <div className="py-6 space-y-3">
        <p className="text-[14px] text-white/55">
          Could not load career records.
        </p>
        <Button
          variant="outline"
          onClick={() => void refetch()}
          className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07] h-9 text-[13px]"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const events = buildEvents(data);

  if (events.length === 0) {
    return (
      <p className="py-6 text-[14px] text-white/40">
        No competitive history to show yet.
      </p>
    );
  }

  return (
    <ul aria-label="Career timeline">
      {events.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </ul>
  );
}
