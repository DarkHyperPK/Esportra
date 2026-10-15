import { SavedSponsorPicker } from "./SavedSponsorPicker";
import { SponsorRotationSettings } from './SponsorRotationSettings';
import { useState } from "react";
import { CommandButton } from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import { useSponsors } from "@/hooks/useSponsors";
import {
  useBroadcastSponsors,
  useAddSponsor,
  useDeleteSponsor,
  uploadSponsorLogo,
} from "@/hooks/useBroadcastSponsors";
import { getApiErrorMessage } from "@/lib/apiClient";
export function SetupSponsors({
  showId,
  locked,
}: {
  showId: string;
  locked: boolean;
}) {
  const sponsors = useBroadcastSponsors(showId),
    library = useSponsors(),
    add = useAddSponsor(showId),
    remove = useDeleteSponsor(showId);
  const [source, setSource] = useState("saved"),
    [savedId, setSavedId] = useState(""),
    [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [removing, setRemoving] = useState("");
  const [uploadVersion, setUploadVersion] = useState(0);
  const saved = library.data?.find((sponsor) => sponsor.id === savedId);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const logoUrl =
        source === "saved"
          ? saved?.logo_url
          : file
            ? await uploadSponsorLogo(file, showId, crypto.randomUUID())
            : null;
      const sponsorName = source === "saved" ? saved?.name : name.trim();
      if (!logoUrl || !sponsorName)
        throw new Error(
          "Choose a saved sponsor with a logo, or enter a name and upload a logo.",
        );
      await add.mutateAsync({
        name: sponsorName,
        logoUrl,
        displaySlot: "lower_third",
        isActive: true,
      });
      setName("");
      setFile(null);
      setUploadVersion((version) => version + 1);
      setSavedId("");
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Could not add sponsor."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Optional sponsors">
      <SponsorRotationSettings key={showId} showId={showId} locked={locked} />
      <p className="setup-hint">
        Optional. Use an existing Esportra partner’s logo or add a sponsor for
        this broadcast.
      </p>
      {sponsors.isLoading && <p role="status">Loading show sponsors…</p>}
      {sponsors.data?.map((sponsor) => (
        <div className="setup-library-row" key={sponsor.id}>
          {sponsor.logoUrl ? (
            <img
              className="setup-sponsor-logo"
              src={sponsor.logoUrl}
              alt={`${sponsor.name} logo`}
              onError={(event) => {
                event.currentTarget.alt = `${sponsor.name} · Logo could not load`;
              }}
            />
          ) : (
            <span className="setup-asset-warning">Logo missing</span>
          )}
          <div>
            <strong>{sponsor.name}</strong>
            <small>
              {sponsor.isActive
                ? "Included in broadcast"
                : "Inactive · excluded"}
            </small>
          </div>
          <CommandButton
            size="sm"
            variant="ghost"
            disabled={locked || busy || remove.isPending}
            onClick={() => setRemoving(sponsor.id)}
          >
            Remove
          </CommandButton>
          {removing === sponsor.id && (
            <>
              <CommandButton
                size="sm"
                variant="danger"
                disabled={remove.isPending}
                onClick={() =>
                  void remove
                    .mutateAsync(sponsor.id)
                    .then(() => setRemoving(""))
                    .catch(() => undefined)
                }
              >
                Confirm removal
              </CommandButton>
              <CommandButton
                size="sm"
                variant="ghost"
                onClick={() => setRemoving("")}
              >
                Cancel
              </CommandButton>
            </>
          )}
        </div>
      ))}
      <form
        onSubmit={(event) => void submit(event)}
        className="setup-sponsor-form"
      >
        <div className="setup-preview-tabs">
          <CommandButton
            variant="ghost"
            aria-pressed={source === "saved"}
            onClick={() => setSource("saved")}
          >
            Esportra sponsor list
          </CommandButton>
          <CommandButton
            variant="ghost"
            aria-pressed={source === "new"}
            onClick={() => setSource("new")}
          >
            Add a new sponsor
          </CommandButton>
        </div>
        {source === "saved" ? (
          <SavedSponsorPicker
            sponsors={library.data || []}
            loading={library.isLoading}
            failed={library.isError}
            value={savedId}
            onChange={setSavedId}
            disabled={locked || busy}
            onRetry={() => void library.refetch()}
          />
        ) : (
          <>
            <label className="setup-field">
              Sponsor name
              <input
                value={name}
                maxLength={80}
                disabled={locked || busy}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="setup-field">
              Sponsor logo · PNG, JPG or WebP, up to 5 MB
              <input
                key={uploadVersion}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={locked || busy}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </>
        )}
        <CommandButton
          type="submit"
          disabled={
            locked ||
            busy ||
            (source === "saved" ? !saved?.logo_url : !name.trim() || !file)
          }
        >
          {busy ? "Adding sponsor…" : "Add to broadcast"}
        </CommandButton>
      </form>
      {(error || sponsors.isError || remove.isError) && (
        <InlineNotice tone="critical">
          {error ||
            getApiErrorMessage(
              sponsors.error || remove.error,
              "Could not update sponsors.",
            )}{" "}
          {sponsors.isError && (
            <CommandButton
              variant="ghost"
              onClick={() => void sponsors.refetch()}
            >
              Retry sponsors
            </CommandButton>
          )}
        </InlineNotice>
      )}
    </section>
  );
}
