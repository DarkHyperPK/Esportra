/**
 * CreateListingSheet — PROJ-075 T12.
 * Slide-over (desktop right) / bottom sheet (mobile) for creating an LFG listing.
 * Phases: idle → saving → draft_saved → publishing → published | error
 */
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { InlineNotice } from '@/components/ui/kit';
import { IntentPicker } from './IntentPicker';
import { RankSelector } from './RankSelector';
import { useCreateLfgListing, usePublishLfgListing } from '@/hooks/competitive/useLfg';
import { useCompetitiveProfile } from '@/hooks/competitive/useCompetitiveProfile';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/apiClient';
import type { CatalogRankTier, CatalogGameRole, CatalogRegion, LfgIntent } from '@/types/competitive';

// ─── Types ────────────────────────────────────────────────────────────────────

type SheetPhase = 'idle' | 'saving' | 'draft_saved' | 'publishing' | 'published' | 'error';

interface ErrorState {
  message: string;
  code?: string;
}

interface FormState {
  intent: LfgIntent | null;
  modeKey: string | null;
  minRankSortOrder: number | null;
  maxRankSortOrder: number | null;
  regionKey: string | null;
  preferredRoles: string[];
  languages: string[];
  description: string;
  expiresInDays: 1 | 3 | 7;
}

const INITIAL_FORM: FormState = {
  intent: null,
  modeKey: null,
  minRankSortOrder: null,
  maxRankSortOrder: null,
  regionKey: null,
  preferredRoles: [],
  languages: [],
  description: '',
  expiresInDays: 3,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateListingSheetProps {
  open: boolean;
  onClose: () => void;
  onPublished?: () => void;
  ranks: CatalogRankTier[];
  gameRoles: CatalogGameRole[];
  regions: CatalogRegion[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-mono uppercase tracking-wider text-white/40 mb-2">
      {children}
    </p>
  );
}

interface ChipToggleProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

function ChipToggle({ active, onClick, children, className = '' }: ChipToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 px-3 py-1.5 border text-[12px] transition-colors min-h-[44px]',
        active
          ? 'border-white/30 bg-white text-[#08080a]'
          : 'border-white/[0.08] bg-transparent text-white/55 hover:border-white/20',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getErrorCode(err: unknown): string | undefined {
  if (err instanceof ApiError) {
    const body = err.body as { code?: string } | null;
    return body?.code;
  }
  return undefined;
}


// ─── Component ────────────────────────────────────────────────────────────────

export function CreateListingSheet({ open, onClose, onPublished, ranks, gameRoles, regions }: CreateListingSheetProps) {
  const { user } = useAuth();
  const reduced = useReducedMotion() ?? false;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [phase, setPhase] = useState<SheetPhase>('idle');
  const [error, setError] = useState<ErrorState | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Profile completeness check (non-blocking prompt)
  const profileQuery = useCompetitiveProfile(user?.id ?? '', 'valorant');
  const showProfilePrompt = open && !!user?.id && !profileQuery.isLoading && !profileQuery.data;

  // Mutations — publish hook requires an ID; draftId populated after create succeeds
  const createMutation = useCreateLfgListing();
  const publishMutation = usePublishLfgListing(draftId ?? '');

  // Reset on open
  useEffect(() => {
    if (open) {
      setForm(INITIAL_FORM);
      setPhase('idle');
      setError(null);
      setDraftId(null);
    }
    return () => {
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
  }, [open]);

  // Auto-close after published
  useEffect(() => {
    if (phase === 'published') {
      autoCloseRef.current = setTimeout(() => {
        onClose();
        onPublished?.();
      }, 1500);
    }
  }, [phase, onClose, onPublished]);

  const DESC_MAX = 280;
  const charsLeft = DESC_MAX - form.description.length;
  const showExpiryForIntent = form.intent !== 'looking_for_team';
  const showModeForIntent = form.intent !== 'looking_for_team';

  async function handleSaveDraft() {
    if (!form.intent) return;
    setPhase('saving');
    setError(null);
    try {
      const expiresAt = new Date(Date.now() + form.expiresInDays * 86_400_000).toISOString();
      const result = await createMutation.mutateAsync({
        gameSlug: 'valorant',
        intent: form.intent,
        modeKey: form.modeKey ?? undefined,
        minRankSortOrder: form.minRankSortOrder ?? undefined,
        maxRankSortOrder: form.maxRankSortOrder ?? undefined,
        regionKey: form.regionKey ?? undefined,
        preferredRoles: form.preferredRoles,
        languages: form.languages,
        description: form.description || undefined,
        expiresAt,
      });
      setDraftId(result.id);
      setPhase('draft_saved');
    } catch (err) {
      setPhase('error');
      setError({ message: 'Could not save. Check your connection and try again.', code: getErrorCode(err) });
    }
  }

  async function handlePublish() {
    if (!draftId) return;
    setPhase('publishing');
    setError(null);
    try {
      await publishMutation.mutateAsync();
      setPhase('published');
    } catch (err) {
      const code = getErrorCode(err);
      if (code === 'LISTING_LIMIT_REACHED' || code === 'LISTING_ALREADY_ACTIVE') {
        setPhase('draft_saved');
        setError({ message: '', code });
      } else {
        setPhase('draft_saved');
        setError({ message: 'Could not publish. Check your connection and try again.' });
      }
    }
  }

  function toggleRole(roleKey: string) {
    setForm(f => ({
      ...f,
      preferredRoles: f.preferredRoles.includes(roleKey)
        ? f.preferredRoles.filter(r => r !== roleKey)
        : [...f.preferredRoles, roleKey],
    }));
  }

  function toggleRegion(regionKey: string) {
    setForm(f => ({
      ...f,
      regionKey: f.regionKey === regionKey ? null : regionKey,
    }));
  }

  const desktopVariants = {
    initial: { x: 480, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 480, opacity: 0 },
  };

  const mobileVariants = {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
  };

  const sheetVariants = isMobile ? mobileVariants : desktopVariants;
  const sheetTransition = isMobile
    ? { type: 'spring' as const, stiffness: 400, damping: 40 }
    : { duration: 0.24, ease: [0.2, 0, 0, 1] as [number, number, number, number] };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Create Listing"
            className={[
              'fixed z-50 bg-[#111111] border-white/[0.08] flex flex-col',
              // Desktop: right slide-over
              'lg:inset-y-0 lg:right-0 lg:w-[480px] lg:border-l',
              // Mobile: bottom sheet
              'inset-x-0 bottom-0 max-h-[92vh] border-t lg:max-h-none',
            ].join(' ')}
            variants={reduced ? {} : sheetVariants}
            initial={reduced ? false : 'initial'}
            animate="animate"
            exit={reduced ? {} : 'exit'}
            transition={sheetTransition}
          >
            {/* Mobile drag handle */}
            <div className="lg:hidden w-8 h-1 bg-white/20 mx-auto mt-3 mb-1 rounded-full shrink-0" aria-hidden />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] shrink-0">
              <h2 className="text-[16px] font-semibold text-white">Create Listing</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1 text-white/40 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

              {/* Profile prompt (non-blocking) */}
              {showProfilePrompt && (
                <InlineNotice tone="warning">
                  Your competitive profile is incomplete.{' '}
                  <Link to="/competitive/profile/edit" className="underline underline-offset-2 hover:text-white transition-colors">
                    Set it up
                  </Link>{' '}
                  to appear in player search.
                </InlineNotice>
              )}

              {/* Intent picker */}
              <div>
                <Caption>What are you looking for?</Caption>
                <IntentPicker
                  value={form.intent}
                  onChange={(intent) => setForm(f => ({ ...f, intent }))}
                />
              </div>

              {/* Rank range */}
              {form.intent && (
                <div>
                  <Caption>Rank range (optional)</Caption>
                  <RankSelector
                    ranks={ranks}
                    minValue={form.minRankSortOrder ?? undefined}
                    maxValue={form.maxRankSortOrder ?? undefined}
                    onMinChange={(v) => setForm(f => ({ ...f, minRankSortOrder: v ?? null }))}
                    onMaxChange={(v) => setForm(f => ({ ...f, maxRankSortOrder: v ?? null }))}
                    stacked
                  />
                </div>
              )}

              {/* Preferred roles */}
              {form.intent && gameRoles.length > 0 && (
                <div>
                  <Caption>Preferred roles (optional)</Caption>
                  <div className="flex flex-wrap gap-2">
                    {gameRoles.map(r => (
                      <ChipToggle
                        key={r.roleKey}
                        active={form.preferredRoles.includes(r.roleKey)}
                        onClick={() => toggleRole(r.roleKey)}
                      >
                        {r.iconUrl && <img src={r.iconUrl} alt={r.displayName} width={16} height={16} />}
                        {r.displayName}
                      </ChipToggle>
                    ))}
                  </div>
                </div>
              )}

              {/* Region */}
              {form.intent && regions.length > 0 && (
                <div>
                  <Caption>Region (optional)</Caption>
                  <div className="flex flex-wrap gap-2">
                    {regions.map(rg => (
                      <ChipToggle
                        key={rg.regionKey}
                        active={form.regionKey === rg.regionKey}
                        onClick={() => toggleRegion(rg.regionKey)}
                      >
                        {rg.displayName}
                      </ChipToggle>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode (hidden for looking_for_team) */}
              {form.intent && showModeForIntent && (
                <div>
                  <Caption>Mode (optional)</Caption>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'standard', label: 'Standard' },
                      { key: 'premier', label: 'Premier' },
                      { key: 'unrated', label: 'Unrated' },
                    ].map(m => (
                      <ChipToggle
                        key={m.key}
                        active={form.modeKey === m.key}
                        onClick={() => setForm(f => ({ ...f, modeKey: f.modeKey === m.key ? null : m.key }))}
                      >
                        {m.label}
                      </ChipToggle>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {form.intent && (
                <div>
                  <Caption>About your listing (optional)</Caption>
                  <div className="relative">
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm(f => ({ ...f, description: e.target.value.slice(0, DESC_MAX) }))}
                      placeholder="Describe what you're looking for, your playstyle, availability..."
                      rows={4}
                      className="w-full bg-white/[0.03] border border-white/[0.08] text-white text-[13px] px-3 py-2.5 placeholder-white/25 focus:outline-none focus:border-white/20 resize-none"
                      aria-describedby="desc-counter"
                    />
                    <p
                      id="desc-counter"
                      className={`text-right text-[11px] mt-1 ${charsLeft <= 20 ? 'text-amber-400' : 'text-white/35'}`}
                    >
                      {form.description.length} / {DESC_MAX}
                    </p>
                  </div>
                </div>
              )}

              {/* Expires */}
              {form.intent && showExpiryForIntent && (
                <div>
                  <Caption>Listing duration</Caption>
                  <div className="flex gap-2">
                    {([1, 3, 7] as const).map(days => (
                      <ChipToggle
                        key={days}
                        active={form.expiresInDays === days}
                        onClick={() => setForm(f => ({ ...f, expiresInDays: days }))}
                      >
                        {days === 1 ? '1 day' : `${days} days`}
                      </ChipToggle>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer — phase-driven */}
            <div className="shrink-0 px-5 py-4 border-t border-white/[0.08] space-y-3">

              {/* Error notices */}
              {error?.code === 'LISTING_LIMIT_REACHED' && (
                <InlineNotice tone="warning">
                  You have 3 published listings. Close one to publish a new one.{' '}
                  <Link to="/competitive/lfg/mine" className="underline underline-offset-2 hover:text-white transition-colors">
                    Manage my listings →
                  </Link>
                </InlineNotice>
              )}
              {error?.code === 'LISTING_ALREADY_ACTIVE' && (
                <InlineNotice tone="warning">
                  You already have an active listing with this intent. Edit or close it first.
                </InlineNotice>
              )}
              {phase === 'error' && error && !error.code && (
                <InlineNotice tone="critical">
                  {error.message}
                </InlineNotice>
              )}
              {phase === 'draft_saved' && !error && (
                <InlineNotice tone="success">
                  Saved as draft.
                </InlineNotice>
              )}
              {phase === 'published' && (
                <InlineNotice tone="success">
                  Your listing is live. Players can find you now.
                </InlineNotice>
              )}

              {/* Action row */}
              {phase === 'idle' || phase === 'saving' || phase === 'error' ? (
                <div className="flex items-center gap-3 justify-end">
                  {!form.intent ? (
                    <p className="text-[13px] text-white/35">Select an intent to continue</p>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={onClose}
                        className="text-[13px] text-white/55 hover:text-white px-4 py-2 transition-colors min-h-[44px]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveDraft()}
                        disabled={phase === 'saving'}
                        className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white text-[13px] px-5 h-9 transition-colors"
                      >
                        {phase === 'saving' ? (
                          <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /><span>Saving...</span></>
                        ) : (
                          'Save Draft'
                        )}
                      </button>
                    </>
                  )}
                </div>
              ) : phase === 'draft_saved' ? (
                <div className="flex items-center gap-3 justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-[13px] text-white/55 hover:text-white px-4 py-2 transition-colors min-h-[44px]"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePublish()}
                    className="bg-rose-500 hover:bg-rose-600 text-white text-[13px] px-5 h-9 transition-colors"
                  >
                    Publish Listing
                  </button>
                </div>
              ) : phase === 'publishing' ? (
                <div className="flex items-center gap-3 justify-end">
                  <button
                    type="button"
                    disabled
                    className="flex items-center gap-2 bg-rose-500 opacity-60 text-white text-[13px] px-5 h-9"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Publishing...
                  </button>
                </div>
              ) : null /* published: auto-close, no buttons */}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
