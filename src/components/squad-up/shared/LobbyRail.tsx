export interface RailSlot { name: string; avatarUrl?: string | null; role?: string | null; you?: boolean }

interface LobbyRailProps {
  slots: (RailSlot | null)[];
  /** Roles shown in the empty slots, in order. */
  wanted?: string[];
  label: string;
}

/** A 5-stack as five square slots. Filled slots show who is in; empty ones show what the team still needs. */
export function LobbyRail({ slots, wanted = [], label }: LobbyRailProps) {
  let emptyIndex = 0;
  const filled = slots.filter(Boolean).length;
  return (
    <div className="su-rail" role="group" aria-label={`${label}: ${filled} of ${slots.length} players`}>
      {slots.map((slot, index) => {
        if (slot) {
          return (
            <div key={index} className={`su-rail-slot su-rail-filled${slot.you ? ' su-rail-you' : ''}`}>
              {slot.avatarUrl ? <img src={slot.avatarUrl} alt="" /> : <span className="su-rail-initial">{slot.name.slice(0, 1)}</span>}
              <span className="su-rail-name">{slot.you ? 'You' : slot.name}</span>
              {slot.role && <span className="su-rail-role">{slot.role}</span>}
            </div>
          );
        }
        const role = wanted[emptyIndex++];
        return (
          <div key={index} className="su-rail-slot su-rail-open">
            <span className="su-rail-plus" aria-hidden>+</span>
            <span className="su-rail-role">{role ?? 'Open'}</span>
          </div>
        );
      })}
    </div>
  );
}
