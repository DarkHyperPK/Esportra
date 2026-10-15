import type { Dispatch, SetStateAction } from "react";
import type { AirReleaseInput } from "@/types/air";
export default function AirReleaseFields({
  release,
  setRelease,
}: {
  release: AirReleaseInput;
  setRelease: Dispatch<SetStateAction<AirReleaseInput>>;
}) {
  return (
    <>
      <label>
        Version
        <input
          required
          placeholder="0.2.0"
          value={release.version}
          onChange={(event) =>
            setRelease({ ...release, version: event.target.value })
          }
        />
      </label>
      <label>
        Channel
        <select
          value={release.channel}
          onChange={(event) =>
            setRelease({
              ...release,
              channel: event.target.value === "preview" ? "preview" : "stable",
            })
          }
        >
          <option value="stable">Stable</option>
          <option value="preview">Preview</option>
        </select>
      </label>
      <label className="air-full">
        Official HTTPS download URL
        <input
          required
          type="url"
          value={release.downloadUrl}
          onChange={(event) =>
            setRelease({ ...release, downloadUrl: event.target.value })
          }
        />
      </label>
      <label className="air-full">
        Release notes
        <textarea
          maxLength={10000}
          value={release.notes}
          onChange={(event) =>
            setRelease({ ...release, notes: event.target.value })
          }
        />
      </label>
      <label>
        Publish release information
        <input
          type="checkbox"
          checked={release.published}
          onChange={(event) =>
            setRelease({ ...release, published: event.target.checked })
          }
        />
      </label>
      <p>
        This updates release information. It does not deploy code or start a
        desktop update.
      </p>
    </>
  );
}
