import { useState } from 'react';
import { CommandButton } from '@/components/management/CommandSurface';
import { useCatalogGameRoles } from '@/hooks/competitive/useCatalog';
import { createLobbySchema, type CreateLobbyInput } from '@/schemas/squadUpLobby';

/** Open a lobby: how many players you still need and which roles. Mode, countries and rank come from your filters. */
export function CreateLobbyForm({ pending, error, onCreate, onCancel }: {
  pending: boolean; error?: string; onCreate: (input: CreateLobbyInput) => void; onCancel: () => void;
}) {
  const roles = useCatalogGameRoles('valorant').data ?? [];
  const [title, setTitle] = useState('');
  const [openSlots, setOpenSlots] = useState(2);
  const [wanted, setWanted] = useState<string[]>([]);
  const [micRequired, setMicRequired] = useState(true);
  const [formError, setFormError] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = createLobbySchema.safeParse({ title, openSlots, wantedRoles: wanted, micRequired });
    if (!parsed.success) { setFormError(parsed.error.issues[0]?.message ?? 'Check the form.'); return; }
    setFormError('');
    onCreate(parsed.data);
  }

  return (
    <form className="su-create-lobby" onSubmit={submit}>
      <h3>Open a lobby</h3>
      <label className="su-field"><span>Title (optional)</span>
        <input className="su-input" maxLength={60} placeholder="Ranked tonight, need smokes" value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <fieldset><legend>Players you still need</legend>
        <div className="su-choice" role="radiogroup" aria-label="Players you still need">
          {[1, 2, 3, 4].map((count) => <button key={count} type="button" role="radio" aria-checked={openSlots === count} onClick={() => setOpenSlots(count)}>{count}</button>)}
        </div>
      </fieldset>
      {roles.length > 0 && (
        <fieldset><legend>Roles you're missing (optional)</legend>
          <div className="su-choice">
            {roles.map((role) => (
              <button key={role.roleKey} type="button" aria-pressed={wanted.includes(role.roleKey)}
                onClick={() => setWanted(wanted.includes(role.roleKey) ? wanted.filter((key) => key !== role.roleKey) : [...wanted, role.roleKey].slice(0, 5))}>
                {role.displayName}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <label className="su-check"><input type="checkbox" checked={micRequired} onChange={(event) => setMicRequired(event.target.checked)} /> Mic required</label>
      {(formError || error) && <p className="su-error" role="alert">{formError || error}</p>}
      <div className="su-row">
        <CommandButton variant="ghost" size="md" onClick={onCancel}>Cancel</CommandButton>
        <CommandButton type="submit" variant="primary" size="md" slide disabled={pending}>{pending ? 'Opening…' : 'Open lobby'}</CommandButton>
      </div>
    </form>
  );
}
