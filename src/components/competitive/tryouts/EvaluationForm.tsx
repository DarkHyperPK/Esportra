import { useState } from 'react';
import { Field, InlineNotice } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSubmitEvaluation } from '@/hooks/competitive/useTryouts';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { TryoutRecommendation } from '@/types/competitive';

const SCORE_FIELDS = [
  { key: 'overallScore', label: 'Overall' },
  { key: 'communication', label: 'Communication' },
  { key: 'mechanics', label: 'Mechanics' },
  { key: 'gameSense', label: 'Game Sense' },
  { key: 'attitude', label: 'Attitude' },
  { key: 'teamwork', label: 'Teamwork' },
  { key: 'peakPlay', label: 'Peak Play' },
  { key: 'consistency', label: 'Consistency' },
] as const;

type ScoreKey = (typeof SCORE_FIELDS)[number]['key'];
type Scores = Record<ScoreKey, string>;

const DEFAULT_SCORES: Scores = {
  overallScore: '',
  communication: '',
  mechanics: '',
  gameSense: '',
  attitude: '',
  teamwork: '',
  peakPlay: '',
  consistency: '',
};

interface Props {
  sessionId: string;
  evaluateeUserId: string;
  evaluateeUsername?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EvaluationForm({ sessionId, evaluateeUserId, evaluateeUsername, onSuccess, onCancel }: Props) {
  const submitMutation = useSubmitEvaluation(sessionId);
  const [scores, setScores] = useState<Scores>(DEFAULT_SCORES);
  const [notes, setNotes] = useState('');
  const [recommendation, setRecommendation] = useState<TryoutRecommendation>('undecided');
  const [apiError, setApiError] = useState('');
  const [validationError, setValidationError] = useState('');

  function setScore(key: ScoreKey, value: string) {
    setScores((prev) => ({ ...prev, [key]: value }));
  }

  function parseScore(value: string): number {
    const n = parseInt(value, 10);
    return Math.min(10, Math.max(1, n));
  }

  async function handleSubmit() {
    setApiError('');
    setValidationError('');

    const missing = SCORE_FIELDS.filter((f) => !scores[f.key].trim());
    if (missing.length > 0) {
      setValidationError('All scores are required (1–10).');
      return;
    }

    try {
      await submitMutation.mutateAsync({
        evaluateeUserId,
        overallScore: parseScore(scores.overallScore),
        communication: parseScore(scores.communication),
        mechanics: parseScore(scores.mechanics),
        gameSense: parseScore(scores.gameSense),
        attitude: parseScore(scores.attitude),
        teamwork: parseScore(scores.teamwork),
        peakPlay: parseScore(scores.peakPlay),
        consistency: parseScore(scores.consistency),
        notes: notes.trim() || undefined,
        recommendation,
      });
      onSuccess();
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not submit evaluation. Try again.'));
    }
  }

  return (
    <div className="border border-white/10 bg-white/[0.03] p-4 space-y-4">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
        EVALUATE — {evaluateeUsername ?? evaluateeUserId}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SCORE_FIELDS.map(({ key, label }) => (
          <Field key={key} label={label} htmlFor={`score-${key}`}>
            <input
              id={`score-${key}`}
              type="number"
              min={1}
              max={10}
              value={scores[key]}
              onChange={(e) => setScore(key, e.target.value)}
              placeholder="1–10"
              className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
            />
          </Field>
        ))}
      </div>

      {validationError && (
        <p role="alert" className="text-xs text-red-300">
          {validationError}
        </p>
      )}

      <Field label="Recommendation" htmlFor="eval-recommendation">
        <Select
          value={recommendation}
          onValueChange={(v) => setRecommendation(v as TryoutRecommendation)}
        >
          <SelectTrigger
            id="eval-recommendation"
            className="rounded-none border-white/10 bg-black/30 text-white h-10"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-none bg-[#1a1a1a] border-white/10">
            <SelectItem value="offer">Offer</SelectItem>
            <SelectItem value="pass">Pass</SelectItem>
            <SelectItem value="undecided">Undecided</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Notes" htmlFor="eval-notes" optional>
        <Textarea
          id="eval-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
          placeholder="Observations, standout moments, concerns…"
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
          disabled={submitMutation.isPending}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none px-5 text-[13px]"
        >
          {submitMutation.isPending ? 'Submitting…' : 'Submit evaluation'}
        </Button>
      </div>
    </div>
  );
}
