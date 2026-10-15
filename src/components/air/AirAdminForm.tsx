import AirPlanFields from "./AirPlanFields";
import AirGrantFields from "./AirGrantFields";
import AirReleaseFields from "./AirReleaseFields";
import { useState } from "react";
import type {
  AirAdminRow,
  AirAdminSection,
  AirGrantInput,
  AirPlanInput,
  AirReleaseInput,
} from "@/types/air";
import { useAirAdminActions, useAirAdminList } from "@/hooks/useAirAdmin";
import { getApiErrorMessage } from "@/lib/apiClient";
interface Props {
  section: AirAdminSection;
  row: AirAdminRow | null;
  onClose: () => void;
}
export default function AirAdminForm({ section, row, onClose }: Props) {
  const mutation = useAirAdminActions(),
    plans = useAirAdminList("plans"),
    [reason, setReason] = useState("");
  const [plan, setPlan] = useState<AirPlanInput>({
    name: row?.name ?? "",
    productionLimit: row?.productionLimit ?? null,
    captureLimit: row?.captureLimit ?? null,
    enabled: row?.enabled ?? true,
  });
  const [grant, setGrant] = useState<AirGrantInput>({
    planId: row?.planId ?? "",
    validUntil: row?.validUntil ?? null,
    status: row?.status==="suspended"?"suspended":row?.status==="revoked"?"revoked":"active",
    reason: "",
    overrideDeviceLimits: row?.overrideDeviceLimits ?? false,
    productionLimit: row?.productionLimit ?? null,
    captureLimit: row?.captureLimit ?? null,
  });
  const [release, setRelease] = useState<AirReleaseInput>({
    version: row?.version ?? "",
    channel: row?.channel ?? "stable",
    downloadUrl: row?.downloadUrl ?? "",
    notes: row?.notes ?? "",
    published: row?.published ?? false,
  });
  const [error, setError] = useState("");
  async function submit() {
    setError("");
    try {
      if (section === "plans")
        await mutation.mutateAsync({
          kind: "plan",
          id: row?.id ? String(row.id) : undefined,
          input: plan,
        });
      else if (section === "customers" && row?.userId)
        await mutation.mutateAsync({
          kind: "grant",
          id: row.userId,
          input: { ...grant, reason },
        });
      else if (section === "devices" && row?.id)
        await mutation.mutateAsync({
          kind: "revoke",
          id: String(row.id),
          reason,
        });
      else if (section === "releases")
        await mutation.mutateAsync({
          kind: "release",
          id: row?.id ? String(row.id) : undefined,
          input: release,
        });
      onClose();
    } catch (failure) {
      setError(getApiErrorMessage(failure));
    }
  }
  return (
    <form
      className="air-editor"
      aria-label="Air administration editor"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h2>
        {section === "plans"
          ? "Configure device plan"
          : section === "customers"
            ? "Grant or update Air access"
            : section === "devices"
              ? "Revoke this device"
              : "Release information"}
      </h2>
      {error && (
        <p role="alert" className="air-notice">
          {error}
        </p>
      )}
      <div className="air-form">
        {section === "plans" && <AirPlanFields plan={plan} setPlan={setPlan} />}
        {section === "customers" && (
          <AirGrantFields
            row={row}
            grant={grant}
            setGrant={setGrant}
            plans={plans.data?.items || []}
          />
        )}
        {section === "customers" && (
          <>
            <label>
              Override plan device limits
              <input
                type="checkbox"
                checked={grant.overrideDeviceLimits ?? false}
                onChange={(event) =>
                  setGrant({
                    ...grant,
                    overrideDeviceLimits: event.target.checked,
                  })
                }
              />
            </label>
            {grant.overrideDeviceLimits &&
              (["productionLimit", "captureLimit"] as const).map((field) => (
                <label key={field}>
                  {field === "productionLimit"
                    ? "Production PC allowance"
                    : "Capture PC allowance"}
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    placeholder="Unrestricted"
                    value={grant[field] ?? ""}
                    onChange={(event) =>
                      setGrant({
                        ...grant,
                        [field]:
                          event.target.value === ""
                            ? null
                            : Number(event.target.value),
                      })
                    }
                  />
                </label>
              ))}
          </>
        )}
        {(section === "devices" || section === "customers") && (
          <label className="air-full">
            Reason for audit history
            <textarea
              required
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
        )}
        {section === "devices" && (
          <p className="air-full">
            {row?.name} will be denied at its next online check. Cached offline
            access lasts only until its signed expiry. An active broadcast is
            allowed to finish.
          </p>
        )}
        {section === "releases" && (
          <AirReleaseFields release={release} setRelease={setRelease} />
        )}
      </div>
      <div className="air-actions">
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? "Saving…"
            : section === "devices"
              ? "Confirm device revocation"
              : "Save changes"}
        </button>
        <button type="button" disabled={mutation.isPending} onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
