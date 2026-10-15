import { useState } from "react";
import type { AirDocument, AirTeam, AirMatch } from "@/types/air";
import AirTeamForm from "./AirTeamForm";
import AirMatchForm from "./AirMatchForm";
export default function AirProjectRoster({
  document,
  busy,
  onSave,
}: {
  document: AirDocument;
  busy: boolean;
  onSave: (document: AirDocument) => Promise<boolean>;
}) {
  const [team, setTeam] = useState<AirTeam | null | undefined>(),
    [match, setMatch] = useState<AirMatch | null | undefined>();
  async function save(next: AirDocument) {
    if (await onSave(next)) {
      setTeam(undefined);
      setMatch(undefined);
    }
  }
  return (
    <>
      <section>
        <header>
          <h3>Teams & players</h3>
          <button
            onClick={() => {
              setTeam(null);
              setMatch(undefined);
            }}
          >
            Add team
          </button>
        </header>
        {document.teams.map((row) => (
          <div
            className="air-actions border-b border-white/10 py-4"
            key={row.id}
          >
            <strong>{row.name}</strong>
            <small>{row.players.length} players</small>
            <button onClick={() => setTeam(row)}>Edit team</button>
          </div>
        ))}
        {team !== undefined && (
          <AirTeamForm
            key={team?.id ?? "new"}
            initial={team ?? undefined}
            busy={busy}
            onCancel={() => setTeam(undefined)}
            onSave={(row) =>
              void save({
                ...document,
                teams: document.teams.some((item) => item.id === row.id)
                  ? document.teams.map((item) =>
                      item.id === row.id ? row : item,
                    )
                  : [...document.teams, row],
              })
            }
          />
        )}
      </section>
      <section>
        <header>
          <h3>Matches</h3>
          <button
            disabled={document.teams.length < 2}
            title={
              document.teams.length < 2 ? "Add two teams first" : undefined
            }
            onClick={() => {
              setMatch(null);
              setTeam(undefined);
            }}
          >
            Create match
          </button>
        </header>
        {!document.matches.length && (
          <p>Add two teams, then create your first match.</p>
        )}
        {document.matches.map((row) => (
          <div
            className="air-actions border-b border-white/10 py-4"
            key={row.id}
          >
            <strong>{row.title}</strong>
            <span>
              {row.status} · Best of {row.bestOf}
            </span>
            <button onClick={() => setMatch(row)}>Edit match</button>
          </div>
        ))}
        {match !== undefined && (
          <AirMatchForm
            key={match?.id ?? "new"}
            initial={match ?? undefined}
            teams={document.teams}
            busy={busy}
            onCancel={() => setMatch(undefined)}
            onSave={(row) =>
              void save({
                ...document,
                matches: document.matches.some((item) => item.id === row.id)
                  ? document.matches.map((item) =>
                      item.id === row.id ? row : item,
                    )
                  : [...document.matches, row],
              })
            }
          />
        )}
      </section>
    </>
  );
}
