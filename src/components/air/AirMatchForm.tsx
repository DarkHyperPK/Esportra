import { useState } from "react";
import type { AirMatch, AirTeam } from "@/types/air";
interface Props {
  initial?: AirMatch;
  teams: AirTeam[];
  busy: boolean;
  onSave: (match: AirMatch) => void;
  onCancel: () => void;
}
export default function AirMatchForm({
  initial,
  teams,
  busy,
  onSave,
  onCancel,
}: Props) {
  const [match, setMatch] = useState<AirMatch>(
    initial ?? {
      id: crypto.randomUUID(),
      title: "",
      teamIds: [teams[0]?.id ?? "", teams[1]?.id ?? ""],
      bestOf: 1,
      mapPool: [],
      status: "scheduled",
      scores: [0, 0],
    },
  );
  const [maps, setMaps] = useState(match.mapPool.join(", "));
  return (
    <form
      className="air-editor"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          ...match,
          title:
            match.title ||
            match.teamIds
              .map((id) => teams.find((team) => team.id === id)?.name)
              .join(" vs "),
          mapPool: maps
            .split(",")
            .map((row) => row.trim())
            .filter(Boolean),
        });
      }}
    >
      <h3>{initial ? "Edit match" : "Create match"}</h3>
      <div className="air-form">
        {[0, 1].map((index) => (
          <label key={index}>
            Team {index + 1}
            <select
              required
              value={match.teamIds[index]}
              onChange={(event) =>
                setMatch({
                  ...match,
                  teamIds: match.teamIds.map((id, i) =>
                    i === index ? event.target.value : id,
                  ),
                })
              }
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label>
          Title, optional
          <input
            maxLength={120}
            value={match.title}
            onChange={(event) =>
              setMatch({ ...match, title: event.target.value })
            }
          />
        </label>
        <label>
          Best of
          <select
            value={match.bestOf}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (
                value === 1 ||
                value === 3 ||
                value === 5 ||
                value === 7 ||
                value === 9
              )
                setMatch({ ...match, bestOf: value, scores: [0, 0] });
            }}
          >
            {[1, 3, 5, 7, 9].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Maps, separated by commas
          <input
            value={maps}
            onChange={(event) => setMaps(event.target.value)}
          />
        </label>
        <label>
          Status
          <select
            value={match.status}
            onChange={(event) => {
              const value = event.target.value;
              if (
                value === "scheduled" ||
                value === "in_progress" ||
                value === "completed" ||
                value === "cancelled"
              )
                setMatch({ ...match, status: value });
            }}
          >
            <option value="scheduled">Upcoming</option>
            <option value="in_progress">Live</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>
      <p>
        Independent matches never update official tournament results. Prepare
        this match in Air to customize and send its screens to OBS.
      </p>
      <div className="air-actions">
        <button type="submit" disabled={busy}>
          Save match
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
