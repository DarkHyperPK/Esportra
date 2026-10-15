import type { Dispatch, SetStateAction } from "react";
import type { AirGrantInput, AirAdminRow } from "@/types/air";
export default function AirGrantFields({
  row,
  grant,
  setGrant,
  plans,
}: {
  row: AirAdminRow | null;
  grant: AirGrantInput;
  setGrant: Dispatch<SetStateAction<AirGrantInput>>;
  plans: AirAdminRow[];
}) {
  return (
    <>
      <label>
        Account<code>{row?.userId}</code>
      </label>
      <label>
        Plan
        <select
          required
          value={grant.planId}
          onChange={(event) =>
            setGrant({ ...grant, planId: event.target.value })
          }
        >
          <option value="">Choose an enabled plan</option>
          {plans
            .filter((item) => item.enabled)
            .map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.name}
              </option>
            ))}
        </select>
      </label>
      <label>
        Access status
        <select
          value={grant.status}
          onChange={(event) => {
            const status = event.target.value;
            if (
              status === "active" ||
              status === "suspended" ||
              status === "revoked"
            )
              setGrant({ ...grant, status });
          }}
        >
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="revoked">Revoked</option>
        </select>
      </label>
      <label>
        Access expires at, optional
        <input
          type="datetime-local"
          value={
            grant.validUntil
              ? new Date(
                  Date.parse(grant.validUntil) -
                    new Date().getTimezoneOffset() * 60000,
                )
                  .toISOString()
                  .slice(0, 16)
              : ""
          }
          onChange={(event) =>
            setGrant({
              ...grant,
              validUntil: event.target.value
                ? new Date(event.target.value).toISOString()
                : null,
            })
          }
        />
        <small>Empty grants access without an expiry.</small>
      </label>
    </>
  );
}
