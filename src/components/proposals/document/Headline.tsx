import type { Proposal } from '@/schemas/proposal';
import { fillTokens } from '@/services/proposals/format';

interface HeadlineProps {
  text: string;
  doc: Proposal;
  as?: 'h1' | 'h2';
  className?: string;
}

/** Rose bar under the lit words, like a cue light under a scorebug value. */
const CUE_BAR = 'bg-[linear-gradient(transparent_78%,var(--pd-cue)_78%,var(--pd-cue)_90%,transparent_90%)] [box-decoration-break:clone]';

/**
 * Sentence-case display headline. Words in [square brackets] get the page's
 * one cue: a rose bar underneath, never a colour change on the letters.
 */
export function Headline({ text, doc, as = 'h2', className = '' }: HeadlineProps) {
  const parts = fillTokens(text, doc).split(/(\[[^\]]*\])/g).filter(Boolean);
  const classes = `text-balance font-heading font-extrabold leading-[0.98] tracking-[-0.035em] text-[color:var(--pd-ink)] ${className}`;
  const content = parts.map((part, i) =>
    part.startsWith('[') && part.endsWith(']') ? (
      <span key={i} className={CUE_BAR}>{part.slice(1, -1)}</span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
  return as === 'h1' ? <h1 className={classes}>{content}</h1> : <h2 className={classes}>{content}</h2>;
}
