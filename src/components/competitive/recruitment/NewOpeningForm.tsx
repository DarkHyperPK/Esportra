import { useState } from 'react';
import { Field, InlineNotice } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateOpening } from '@/hooks/competitive/useRecruitment';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { RecruitmentMode } from '@/types/competitive';

const GAME_SLUG = 'valorant';
const TEXT_MAX = 500;

interface Props {
  teamId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewOpeningForm({ teamId, onSuccess, onCancel }: Props) {
  const createMutation = useCreateOpening();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [positionsAvailable, setPositionsAvailable] = useState('');
  const [mode, setMode] = useState<RecruitmentMode>('quick');
  const [titleError, setTitleError] = useState('');
  const [apiError, setApiError] = useState('');

  async function handleSubmit() {
    setApiError('');
    setTitleError('');
    if (!title.trim()) {
      setTitleError('Title is required.');
      return;
    }
    const positions = positionsAvailable ? parseInt(positionsAvailable, 10) : undefined;
    try {
      await createMutation.mutateAsync({
        teamId,
        gameSlug: GAME_SLUG,
        title: title.trim(),
        description: description.trim() || undefined,
        requirements: requirements.trim() || undefined,
        positionsAvailable: positions,
        mode,
      });
      onSuccess();
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not create opening. Try again.'));
    }
  }

  return (
    <div className="border border-white/10 bg-white/[0.03] p-4 space-y-4">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
        NEW OPENING
      </p>

      <Field label="Title" htmlFor="opening-title">
        <input
          id="opening-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Looking for Duelist — Valorant"
          className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
        />
        {titleError && <p role="alert" className="text-xs text-red-300 mt-1">{titleError}</p>}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Mode" htmlFor="opening-mode">
          <Select value={mode} onValueChange={(v) => setMode(v as RecruitmentMode)}>
            <SelectTrigger id="opening-mode" className="rounded-none border-white/10 bg-black/30 text-white h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none bg-[#1a1a1a] border-white/10">
              <SelectItem value="quick">Quick</SelectItem>
              <SelectItem value="structured">Structured</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Positions" htmlFor="opening-positions" optional>
          <input
            id="opening-positions"
            type="number"
            min={1}
            max={20}
            value={positionsAvailable}
            onChange={(e) => setPositionsAvailable(e.target.value)}
            placeholder="e.g. 2"
            className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
        </Field>
      </div>

      <Field label="Description" htmlFor="opening-desc" optional>
        <Textarea
          id="opening-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, TEXT_MAX))}
          placeholder="What roles or skills are you looking for?"
          rows={3}
          className="rounded-none border-white/10 bg-black/30 text-white placeholder:text-zinc-600 resize-none"
        />
      </Field>

      <Field label="Requirements" htmlFor="opening-req" optional>
        <Textarea
          id="opening-req"
          value={requirements}
          onChange={(e) => setRequirements(e.target.value.slice(0, TEXT_MAX))}
          placeholder="Rank requirements, availability, etc."
          rows={3}
          className="rounded-none border-white/10 bg-black/30 text-white placeholder:text-zinc-600 resize-none"
        />
      </Field>

      {apiError && <InlineNotice tone="critical">{apiError}</InlineNotice>}

      <div className="flex justify-end gap-2 pt-1">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="text-[13px] text-white/55 hover:text-white rounded-none border border-white/[0.08]"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none px-5 text-[13px]"
        >
          {createMutation.isPending ? 'Creating…' : 'Create opening'}
        </Button>
      </div>
    </div>
  );
}
