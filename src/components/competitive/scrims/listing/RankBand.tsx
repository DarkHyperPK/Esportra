import { ArrowRight } from 'lucide-react';

interface RankBandProps {
  minName: string | null | undefined;
  maxName: string | null | undefined;
  minIcon?: string | null;
  maxIcon?: string | null;
}

function Rank({ name, icon }: { name: string; icon?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon && <img src={icon} alt="" className="h-5 w-5 object-contain" />}
      <span className="text-[13px] font-semibold text-white/90">{name}</span>
    </span>
  );
}

/** The rank range a team wants to play against, with rank icons. */
export function RankBand({ minName, maxName, minIcon, maxIcon }: RankBandProps) {
  if (!minName && !maxName) {
    return <span className="text-[13px] text-zinc-500">Any rank</span>;
  }
  if (!minName || !maxName || minName === maxName) {
    const name = (minName ?? maxName) as string;
    return <Rank name={name} icon={minName ? minIcon : maxIcon} />;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1" aria-label={`${minName} to ${maxName}`}>
      <Rank name={minName} icon={minIcon} />
      <ArrowRight className="h-3 w-3 text-zinc-600" aria-hidden="true" />
      <Rank name={maxName} icon={maxIcon} />
    </span>
  );
}
