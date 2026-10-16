import { BroadcastShell } from '@/components/broadcast/BroadcastShell';
import AirAccountOverview from "@/components/air/AirAccountOverview";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useAirAccount,
  useAirProject,
  useAirProjectActions,
  useAirProjects,
} from "@/hooks/useAirProjects";
import { getApiErrorMessage } from "@/lib/apiClient";
import AirProjectEditor from "@/components/air/AirProjectEditor";
import "@/components/air/air-workspace.css";
export default function AirWorkspacePage() {
  const account = useAirAccount(),
    [chosen, setChosen] = useState(""),
    [projectId, setProjectId] = useState(""),
    [title, setTitle] = useState("");
  const workspaceId = chosen || account.data?.workspaces[0]?.id || "",
    projects = useAirProjects(workspaceId),
    project = useAirProject(projectId),
    actions = useAirProjectActions(workspaceId);
  const error =
    account.error ||
    projects.error ||
    project.error ||
    actions.create.error ||
    actions.workspace.error;
  return (
    <BroadcastShell><main className="air-web">
      <header>
        <div>
          <small>ESPORTRA AIR · INDEPENDENT BROADCASTS</small>
          <h1>Your matches. Ready for air.</h1>
          <p>
            Create projects without a tournament or organizer verification. Use
            the desktop app for capture, HUD previews and OBS.
          </p>
        </div>
        <Link className="air-link" to="/broadcast/home">
          Tournament broadcasts
        </Link>
      </header>
      {error && (
        <div role="alert" className="air-notice">
          {getApiErrorMessage(error)}{" "}
          <button
            onClick={() => {
              void account.refetch();
              void projects.refetch();
            }}
          >
            Retry
          </button>
        </div>
      )}
      {account.isPending && <p role="status">Opening your Air account…</p>}
      {account.data && (
        <>
          <AirAccountOverview
            session={account.data}
            workspaceId={workspaceId}
            busy={actions.workspace.isPending}
            onWorkspace={(id) => {
              setChosen(id);
              setProjectId("");
            }}
            onCreate={actions.workspace.mutateAsync}
          />
          {!projectId ? (
            <>
              <form
                className="air-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void actions.create
                    .mutateAsync(title)
                    .then((row) => setProjectId(row.id));
                }}
              >
                <label>
                  Project name
                  <input
                    required
                    maxLength={120}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Weekend invitational"
                  />
                </label>
                <div>
                  <button
                    type="submit"
                    disabled={actions.create.isPending || !workspaceId}
                  >
                    {actions.create.isPending ? "Creating…" : "Create project"}
                  </button>
                </div>
              </form>
              <section>
                <h2>Your broadcast projects</h2>
                {projects.isPending ? (
                  <p role="status">Loading projects…</p>
                ) : !projects.data?.length ? (
                  <p>
                    No projects yet. Create one, add teams, then choose a match
                    in Air.
                  </p>
                ) : (
                  <div className="air-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Project</th>
                          <th>Last saved</th>
                          <th>Revision</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {projects.data.map((row) => (
                          <tr key={row.id}>
                            <td>
                              <strong>{row.title}</strong>
                            </td>
                            <td>{new Date(row.updatedAt).toLocaleString()}</td>
                            <td>{row.revision}</td>
                            <td>
                              <button onClick={() => setProjectId(row.id)}>
                                Open project
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          ) : project.data ? (
            <AirProjectEditor
              key={project.data.id}
              project={project.data}
              onClose={() => setProjectId("")}
            />
          ) : (
            <p role="status">Loading project…</p>
          )}
          <section>
            <h2>Continue on your production PC</h2>
            <p>
              Open Esportra Air → Independent broadcasts → Sign in → Sync
              projects → Prepare match. Check players, connect OBS and the game
              feed, preview your screens, then Send to OBS. Air creates browser
              sources automatically.
            </p>
            <Link className="air-link" to="/broadcast/get-started">
              Desktop connection help
            </Link>
          </section>
        </>
      )}
    </main></BroadcastShell>
  );
}
