import { resolveLfgAvatar } from '@/lib/lfgAvatar';
import type { MemberPreview } from '@/services/scrimUtils';

interface RosterFacesProps {
  members: MemberPreview[];
  /** Real roster size; may exceed the previewed members. */
  total: number | null | undefined;
  max?: number;
  /** Smaller faces for tight layouts. */
  size?: 'sm' | 'md';
}

/** Overlapping player faces, so a roster reads as people instead of a list of names. */
export function RosterFaces({ members, total, max = 5, size = 'md' }: RosterFacesProps) {
  const face = size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-8 w-8 text-[10px]';
  if (members.length === 0) return null;
  const shown = members.slice(0, max);
  const extra = Math.max(0, (total ?? members.length) - shown.length);

  return (
    <div
      className="flex items-center"
      role="img"
      aria-label={`Roster: ${members.map((m) => m.username).join(', ')}${extra > 0 ? ` and ${extra} more` : ''}`}
    >
      <div className="flex -space-x-2" aria-hidden="true">
        {shown.map((m) => {
          const src = resolveLfgAvatar(null, m.avatarSeed, null);
          return (
            <span
              key={m.username}
              title={m.username}
              className={`flex ${face} items-center justify-center overflow-hidden rounded-full border-2 border-card bg-zinc-800 font-mono font-semibold text-white/60`}
            >
              {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : m.username.slice(0, 2).toUpperCase()}
            </span>
          );
        })}
        {extra > 0 && (
          <span className={`flex ${face} items-center justify-center rounded-full border-2 border-card bg-zinc-900 font-mono font-semibold text-white/50`}>
            +{extra}
          </span>
        )}
      </div>
    </div>
  );
}
