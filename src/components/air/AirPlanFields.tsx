import type { Dispatch, SetStateAction } from "react";
import type { AirPlanInput } from "@/types/air";
export default function AirPlanFields({
  plan,
  setPlan,
}: {
  plan: AirPlanInput;
  setPlan: Dispatch<SetStateAction<AirPlanInput>>;
}) {
  return (
    <>
      <label>
        Plan name
        <input
          required
          maxLength={80}
          value={plan.name}
          onChange={(event) => setPlan({ ...plan, name: event.target.value })}
        />
      </label>
      {(["productionLimit", "captureLimit"] as const).map((field) => (
        <label key={field}>
          {field === "productionLimit" ? "Production PCs" : "Capture PCs"}
          <input
            type="number"
            min={0}
            max={1000}
            placeholder="Unrestricted"
            value={plan[field] ?? ""}
            onChange={(event) =>
              setPlan({
                ...plan,
                [field]:
                  event.target.value === "" ? null : Number(event.target.value),
              })
            }
          />
          <small>
            Empty = unrestricted. Zero blocks new devices in this role.
          </small>
        </label>
      ))}
      <label>
        <span>Plan enabled</span>
        <input
          type="checkbox"
          checked={plan.enabled}
          onChange={(event) =>
            setPlan({ ...plan, enabled: event.target.checked })
          }
        />
      </label>
    </>
  );
}
