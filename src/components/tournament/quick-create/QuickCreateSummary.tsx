import { SummaryCard } from '@/components/ui/kit';

interface QuickCreateSummaryProps {
  name: string;
  gameName: string;
  logoUrl: string | null;
  modeLabel: string;
  teamSize: number;
  startLabel: string | null;
  teams: number;
  teamNoun: string;
  isOnline: boolean;
  venue: string;
}

/** Live preview of the draft Quick start will create. */
export function QuickCreateSummary(props: QuickCreateSummaryProps) {
  return (
    <SummaryCard
      eyebrow="What you're creating"
      title={props.name.trim() || 'Untitled tournament'}
      media={
        props.logoUrl ? (
          <img src={props.logoUrl} alt="" className="h-11 w-11 shrink-0 object-contain" />
        ) : undefined
      }
      rows={[
        { label: 'Game', value: `${props.gameName} · ${props.modeLabel}` },
        { label: 'Starts', value: props.startLabel ?? 'Pick a date and time', muted: !props.startLabel },
        { label: 'Registration closes', value: '24 hours before start' },
        {
          label: 'Size',
          value: props.teams >= 2 ? `${props.teams} ${props.teamNoun} · ${props.teamSize}v${props.teamSize}` : 'Choose a team count',
          muted: props.teams < 2,
        },
        { label: 'Where', value: props.isOnline ? 'Online' : props.venue.trim() || 'LAN · venue to be added' },
        { label: 'Visibility', value: 'Draft, only you can see it' },
      ]}
      footer={
        <p className="text-xs leading-relaxed text-zinc-500">
          Prize pool, entry fee, check-in and branding are set from the dashboard once it's created.
        </p>
      }
    />
  );
}
