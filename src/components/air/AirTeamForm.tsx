import { useState } from "react";
import type { AirTeam } from "@/types/air";
interface Props {
  initial?: AirTeam;
  busy: boolean;
  onSave: (team: AirTeam) => void;
  onCancel: () => void;
}
export default function AirTeamForm({
  initial,
  busy,
  onSave,
  onCancel,
}: Props) {
  const [team, setTeam] = useState<AirTeam>(
    initial ?? {
      id: crypto.randomUUID(),
      name: "",
      tag: "",
      players: [],
      logoAssetId: null,
    },
  );
  return (
    <form
      className="air-editor"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(team);
      }}
    >
      <h3>{initial ? "Edit team" : "Add team"}</h3>
      <div className="air-form">
        <label>
          Team name
          <input
            required
            maxLength={80}
            value={team.name}
            onChange={(event) => setTeam({ ...team, name: event.target.value })}
          />
        </label>
        <label>
          Short team tag
          <input
            required
            maxLength={12}
            value={team.tag}
            onChange={(event) => setTeam({ ...team, tag: event.target.value })}
          />
        </label>
      </div>
      <p>
        Use exact in-game names including #tag. Upload logos and connect the
        game feed in the desktop app.
      </p>
      {team.players.map((player, index) => (
        <div className="air-form" key={player.id}>
          {(["originalName", "inGameName", "hudNickname"] as const).map(
            (field) => (
              <label key={field}>
                {field === "originalName"
                  ? "Original name"
                  : field === "inGameName"
                    ? "In-game identity"
                    : "HUD nickname (optional)"}
                <input
                  required={field !== "hudNickname"}
                  maxLength={field === "inGameName" ? 100 : 80}
                  value={player[field] ?? ""}
                  onChange={(event) =>
                    setTeam({
                      ...team,
                      players: team.players.map((row, i) =>
                        i === index
                          ? { ...row, [field]: event.target.value }
                          : row,
                      ),
                    })
                  }
                />
              </label>
            ),
          )}
          <label>
            Role
            <select
              value={player.role}
              onChange={(event) =>
                setTeam({
                  ...team,
                  players: team.players.map((row, i) =>
                    i === index
                      ? {
                          ...row,
                          role:
                            event.target.value === "starter"
                              ? "starter"
                              : "substitute",
                        }
                      : row,
                  ),
                })
              }
            >
              <option value="starter">Starter</option>
              <option value="substitute">Substitute</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() =>
              setTeam({
                ...team,
                players: team.players.filter((_, i) => i !== index),
              })
            }
          >
            Remove player
          </button>
        </div>
      ))}
      <div className="air-actions">
        <button
          type="button"
          disabled={busy || team.players.length >= 15}
          onClick={() =>
            setTeam({
              ...team,
              players: [
                ...team.players,
                {
                  id: crypto.randomUUID(),
                  originalName: "",
                  inGameName: "",
                  hudNickname: "",
                  role: team.players.length < 5 ? "starter" : "substitute",
                },
              ],
            })
          }
        >
          Add player
        </button>
        <button type="submit" disabled={busy}>
          Save team
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
