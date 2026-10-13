const roles = [
  ["producer", "Producer", "Coordinates the show and cues the rundown."],
  [
    "technical_director",
    "Technical director",
    "Operates OBS and checks production readiness.",
  ],
  ["observer", "Observer", "Runs game capture on the observer workstation."],
  [
    "replay_operator",
    "Replay operator",
    "Prepares and triggers local replay sources.",
  ],
  ["monitor", "Monitor", "Watches the show and reports issues to production."],
];
export function CrewRolePicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-4">
      <label className="text-sm text-zinc-300">
        Crew role
        <select
          className="mt-2 block h-11 w-full border border-white/20 bg-zinc-950 px-3 text-white focus-visible:outline-white"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          {roles.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-3 text-sm text-zinc-400">
        {roles.find(([id]) => id === value)?.[2]} The invite records this
        assignment. It does not grant remote OBS control.
      </p>
    </div>
  );
}
