import { useState } from "react";
import type { AirSession } from "@/types/air";
export default function AirAccountOverview({
  session,
  workspaceId,
  busy,
  onWorkspace,
  onCreate,
}: {
  session: AirSession;
  workspaceId: string;
  busy: boolean;
  onWorkspace: (id: string) => void;
  onCreate: (name: string) => Promise<unknown>;
}) {
  const [workspaceName, setWorkspaceName] = useState("");
  return (
    <>
      <section>
        <div className="air-actions">
          <strong>Access: {session.account.status}</strong>
          <span>
            {session.account.validUntil
              ? `Valid until ${new Date(session.account.validUntil).toLocaleString()}`
              : "No expiry set"}
          </span>
        </div>
        <p>
          One 14-day trial per account. Creating another workspace does not
          restart it. The desktop app checks access online at launch and can
          retain verified access for up to seven days, capped by its expiry.
        </p>
        <div className="air-form">
          <label>
            Workspace
            <select
              value={workspaceId}
              onChange={(event) => {
                onWorkspace(event.target.value);
              }}
            >
              {session.workspaces.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <form
            className="air-actions"
            onSubmit={(event) => {
              event.preventDefault();
              void onCreate(workspaceName).then(() => setWorkspaceName(""));
            }}
          >
            <label>
              New workspace name
              <input
                required
                maxLength={120}
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
              />
            </label>
            <button type="submit" disabled={busy}>
              Add workspace
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
