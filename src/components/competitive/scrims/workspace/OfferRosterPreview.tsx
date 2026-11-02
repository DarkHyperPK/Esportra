import { EYEBROW_CLASS } from '@/components/ui/kit';
import { resolveLfgAvatar } from '@/lib/lfgAvatar';
import type { MemberPreview } from '@/services/scrimUtils';

interface OfferRosterPreviewProps {
  members: MemberPreview[];
  playerCount: number | null;
  scrimsCompleted: number | null;
}

/** Who is on the offering team: faces, names and rank keys. */
export function OfferRosterPreview({ members, playerCount, scrimsCompleted }: OfferRosterPreviewProps) {
  const players = playerCount ?? members.length;
  if (members.length === 0 && players === 0) return null;

  return (
    <div className="space-y-2 border border-white/[0.06] bg-black/20 px-3 py-2.5">
      <div className="flex items-center justify-between">
        <p className={EYEBROW_CLASS}>Roster</p>
        <span className="text-[11px] tabular-nums text-white/40">
          {players} players{(scrimsCompleted ?? 0) > 0 && <> · {scrimsCompleted} scrims</>}
        </span>
      </div>
      {members.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {members.map((m) => {
            const src = resolveLfgAvatar(null, m.avatarSeed, null);
            return (
              <li key={m.username} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.07] text-[9px] font-semibold text-white/60"
                >
                  {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : m.username.slice(0, 2).toUpperCase()}
                </span>
                <span className="text-[12px] text-white/75">{m.username}</span>
                {m.rankTierKey && (
                  <span className="bg-white/[0.05] px-1 py-px font-mono text-[9px] uppercase tracking-[0.1em] text-white/40">
                    {m.rankTierKey}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
