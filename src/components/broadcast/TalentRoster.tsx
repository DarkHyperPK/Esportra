import { useState } from "react";
import { CommandButton } from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import {
  useBroadcastTalent,
  useEditBroadcastTalent,
} from "@/hooks/useBroadcastTalent";
import { getApiErrorMessage } from "@/lib/apiClient";
export function TalentRoster({
  showId,
  embedded = false,
}: {
  showId: string;
  embedded?: boolean;
}) {
  const query = useBroadcastTalent(showId),
    { add, remove } = useEditBroadcastTalent(showId);
  const [name, setName] = useState(""),
    [role, setRole] = useState<"caster" | "analyst" | "host">("caster");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await add.mutateAsync({ name, role });
      setName("");
    } catch {
      /* The mutation error is shown below. */
    }
  }
  return (
    <section
      className={
        embedded
          ? "space-y-4"
          : "space-y-4 border border-white/10 bg-white/[.02] p-5"
      }
    >
      <h3 className="font-display text-lg font-bold">
        {embedded ? "Roster" : "On-air talent"}
      </h3>
      <p className="text-sm text-zinc-400">
        Talent names appear in the local caster graphics. Crew membership is
        separate.
      </p>
      {(query.isError || add.isError || remove.isError) && (
        <InlineNotice tone="critical">
          {getApiErrorMessage(
            query.error || add.error || remove.error,
            "Could not update the roster.",
          )}
        </InlineNotice>
      )}
      <div>
        {query.data?.map((person) => (
          <div
            key={person.id}
            className="flex items-center justify-between border-b border-white/10 py-3"
          >
            <div>
              <p>{person.name}</p>
              <span className="text-xs text-zinc-400">{person.role}</span>
            </div>
            <CommandButton
              variant="ghost"
              size="sm"
              disabled={remove.isPending}
              onClick={() => remove.mutate(person.id)}
            >
              Remove
            </CommandButton>
          </div>
        ))}
      </div>
      <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
        <label className="flex-1 text-sm">
          Display name
          <input
            className="mt-2 h-11 w-full border border-white/20 bg-zinc-950 px-3"
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="text-sm">
          Role
          <select
            className="mt-2 h-11 border border-white/20 bg-zinc-950 px-3"
            value={role}
            onChange={(event) => {
              if (
                event.target.value === "caster" ||
                event.target.value === "analyst" ||
                event.target.value === "host"
              )
                setRole(event.target.value);
            }}
          >
            <option value="caster">Caster</option>
            <option value="analyst">Analyst</option>
            <option value="host">Host</option>
          </select>
        </label>
        <CommandButton type="submit" disabled={add.isPending || !name.trim()}>
          Add talent
        </CommandButton>
      </form>
    </section>
  );
}
