import { useState } from "react";
import { ApiError, getApiErrorMessage } from "@/lib/apiClient";
import { useAirProjectActions } from "@/hooks/useAirProjects";
import { airDocumentSchema } from "@/schemas/airSchema";
import type { AirDocument, AirProject } from "@/types/air";
import AirProjectRoster from "./AirProjectRoster";
interface Props {
  project: AirProject;
  onClose: () => void;
}
export default function AirProjectEditor({ project, onClose }: Props) {
  const actions = useAirProjectActions(project.workspaceId);
  const [draft, setDraft] = useState(project),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [conflict, setConflict] = useState<AirProject | null>(null);
  async function save(document: AirDocument, revision = draft.revision) {
    setError("");
    setNotice("");
    try {
      const result = await actions.save.mutateAsync({
        ...draft,
        document,
        revision,
      });
      setDraft(result);
      setConflict(null);
      setNotice(
        "Saved. Sync this project in the desktop app to prepare the broadcast.",
      );
      return true;
    } catch (failure) {
      setDraft({ ...draft, document });
      setError(getApiErrorMessage(failure));
      if (failure instanceof ApiError && failure.status === 409) {
        const parsed = airConflict(failure.body);
        if (parsed) setConflict(parsed);
      }
      return false;
    }
  }
  return (
    <section>
      <header>
        <div>
          <small>PROJECT · REVISION {draft.revision}</small>
          <h2>{draft.title}</h2>
        </div>
        <button onClick={onClose}>All projects</button>
      </header>
      {error && (
        <p className="air-notice" role="alert">
          {error} Your draft remains open.
        </p>
      )}
      {notice && (
        <p className="air-notice" role="status">
          {notice}
        </p>
      )}
      {conflict && (
        <div className="air-notice">
          <h3>Review a newer cloud revision</h3>
          <p>
            The cloud is at revision {conflict.revision}. Choose a version
            explicitly before saving again.
          </p>
          <div className="air-actions">
            <button
              onClick={() => {
                setDraft(conflict);
                setConflict(null);
                setError("");
              }}
            >
              Load cloud version
            </button>
            <button
              onClick={() => void save(draft.document, conflict.revision)}
            >
              Replace cloud with this draft
            </button>
            <button onClick={() => download(draft)}>Download my draft</button>
          </div>
        </div>
      )}
      <AirProjectRoster
        document={draft.document}
        busy={actions.save.isPending}
        onSave={save}
      />
      <p>
        Logos, sponsor assets, bracket arrangement, HUD customization and OBS
        production are available in Esportra Air. Sign in with this account and
        choose this project.
      </p>
      <div className="air-actions">
        <button onClick={() => download(draft)}>Export project JSON</button>
        <button
          onClick={() => {
            if (
              window.confirm(
                "Archive this project? Local desktop drafts are retained for review.",
              )
            )
              void actions.archive
                .mutateAsync(draft)
                .then(onClose)
                .catch((failure) => setError(getApiErrorMessage(failure)));
          }}
        >
          Archive project
        </button>
      </div>
    </section>
  );
}
function airConflict(body: unknown): AirProject | null {
  if (!body || typeof body !== "object" || !("current" in body)) return null;
  const value = body.current;
  if (
    !value ||
    typeof value !== "object" ||
    !("document" in value) ||
    !("id" in value) ||
    !("workspaceId" in value) ||
    !("title" in value) ||
    !("revision" in value)
  )
    return null;
  const parsed = airDocumentSchema.safeParse(value.document);
  return parsed.success &&
    typeof value.id === "string" &&
    typeof value.workspaceId === "string" &&
    typeof value.title === "string" &&
    typeof value.revision === "number"
    ? {
        id: value.id,
        workspaceId: value.workspaceId,
        title: value.title,
        revision: value.revision,
        document: parsed.data,
        updatedAt: "",
      }
    : null;
}
function download(project: AirProject) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "air-project.json";
  link.click();
  URL.revokeObjectURL(url);
}
