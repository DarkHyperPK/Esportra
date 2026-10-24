import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageIntro, Field, InlineNotice } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useRecruitmentOpening, useApplyToOpening } from '@/hooks/competitive/useRecruitment';
import { getApiErrorMessage, ApiError } from '@/lib/apiClient';

const COVER_MAX = 1000;
const COVER_WARN = 900;

export default function ApplicationFormPage() {
  const { openingId } = useParams<{ openingId: string }>();
  const navigate = useNavigate();
  const openingQuery = useRecruitmentOpening(openingId!);
  const applyMutation = useApplyToOpening(openingId!);

  const [coverLetter, setCoverLetter] = useState('');
  const [apiError, setApiError] = useState('');

  async function handleSubmit() {
    setApiError('');
    try {
      await applyMutation.mutateAsync(coverLetter.trim() || undefined);
      navigate('/competitive/recruitment/my-applications');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setApiError('You have already applied to this opening.');
      } else {
        setApiError(getApiErrorMessage(err, 'Could not submit your application. Try again.'));
      }
    }
  }

  const charColor =
    coverLetter.length >= COVER_MAX
      ? 'text-red-300'
      : coverLetter.length >= COVER_WARN
      ? 'text-rose-400'
      : 'text-white/35';

  if (openingQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] px-4 py-8 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-white/[0.06]" />
        <div className="h-4 w-64 bg-white/[0.04]" />
        <div className="h-4 w-40 bg-white/[0.04]" />
      </div>
    );
  }

  if (openingQuery.isError || !openingQuery.data) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] px-4 py-8 text-white space-y-4">
        <p className="text-[14px] text-white/55">
          Could not load this opening. Check your connection and try again.
        </p>
        <Button
          variant="outline"
          onClick={() => openingQuery.refetch()}
          className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]"
        >
          Retry
        </Button>
      </div>
    );
  }

  const opening = openingQuery.data;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="px-4 py-8 max-w-2xl mx-auto lg:mx-0 lg:px-8">
        <Link
          to="/competitive/recruitment"
          className="text-[13px] text-white/55 hover:text-white mb-6 inline-block"
        >
          ‹ Openings
        </Link>

        <PageIntro
          eyebrow={`APPLY · ${opening.teamName?.toUpperCase() ?? 'TEAM'}`}
          title={opening.title}
          className="mb-6"
        />

        {/* Opening detail */}
        <div className="border border-white/[0.06] bg-white/[0.03] p-4 space-y-3 mb-6">
          {opening.description && (
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-white/35 mb-1">
                Description
              </p>
              <p className="text-[13px] text-white/70">{opening.description}</p>
            </div>
          )}
          {opening.requirements && (
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-white/35 mb-1">
                Requirements
              </p>
              <p className="text-[13px] text-white/70">{opening.requirements}</p>
            </div>
          )}
          {opening.positionsAvailable !== null && (
            <p className="text-[12px] text-white/40">
              {opening.positionsFilled}/{opening.positionsAvailable} positions filled
            </p>
          )}
        </div>

        {/* Application form */}
        <div className="space-y-5">
          <Field label="Cover letter" optional htmlFor="cover-letter">
            <Textarea
              id="cover-letter"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value.slice(0, COVER_MAX))}
              placeholder="Introduce yourself and explain why you'd be a good fit."
              rows={5}
              aria-describedby="cover-letter-counter"
              className="rounded-none border-white/10 bg-black/30 text-white placeholder:text-zinc-600 resize-none"
            />
            <p
              id="cover-letter-counter"
              aria-live="polite"
              className={`text-right text-[11px] ${charColor}`}
            >
              {coverLetter.length} / {COVER_MAX}
            </p>
          </Field>

          {apiError && <InlineNotice tone="critical">{apiError}</InlineNotice>}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              asChild
              className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07] text-[13px]"
            >
              <Link to="/competitive/recruitment">Cancel</Link>
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={applyMutation.isPending}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-none px-6 text-[13px]"
            >
              {applyMutation.isPending ? 'Submitting…' : 'Submit application'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
