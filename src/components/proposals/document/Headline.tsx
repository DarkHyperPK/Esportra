import type { Proposal } from '@/schemas/proposal';
import { fillTokens } from '@/services/proposals/format';

interface HeadlineProps {
  text: string;
  doc: Proposal;
  as?: 'h1' | 'h2';
  className?: string;
}

/**
 * Display headline in heavy caps. Words written in [square brackets] turn into
 * the accent: light italic in the cue colour, the page's one lit phrase.
 */
export function Headline({ text, doc, as = 'h2', className = '' }: HeadlineProps) {
  const parts = fillTokens(text, doc).split(/(\[[^\]]*\])/g).filter(Boolean);
  const classes = `text-balance font-heading font-extrabold uppercase leading-[0.95] tracking-[-0.035em] text-[color:var(--pd-ink)] ${className}`;
  const content = parts.map((part, i) =>
    part.startsWith('[') && part.endsWith(']') ? (
      <em key={i} className="block font-normal italic tracking-[-0.02em] text-[color:var(--pd-cue)]">
        {part.slice(1, -1)}
      </em>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
  return as === 'h1' ? <h1 className={classes}>{content}</h1> : <h2 className={classes}>{content}</h2>;
}
