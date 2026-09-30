import type { Proposal } from '@/schemas/proposal';
import { fillTokens } from '@/services/proposals/format';

interface TitleProps {
  doc: Proposal;
  text: string;
  /** "01." set in pink before the first line. */
  number?: string;
  size?: 'cover' | 'page';
  as?: 'h1' | 'h2';
}

/**
 * Genesis title: first part in white, the part in [brackets] in pink on its
 * own line. Cover titles are heavy; page titles are light, like the original.
 */
export function Title({ doc, text, number, size = 'page', as = 'h2' }: TitleProps) {
  const filled = fillTokens(text, doc);
  const match = /^(.*?)\s*\[([^\]]*)\]\s*(.*)$/.exec(filled);
  const lead = match ? match[1] : filled;
  const tail = match?.[3] ?? '';
  const accent = match ? `${match[2]}${tail && !/^[.,!?;:]/.test(tail) ? ' ' : ''}${tail}` : '';
  const cover = size === 'cover';
  const classes = cover
    ? 'text-balance font-bold uppercase leading-[0.86] tracking-[0.005em] text-[5rem] sm:text-[6.5rem] md:text-[8.5rem] print:text-[7.2rem]'
    : 'text-balance font-normal uppercase leading-[0.92] tracking-[0.02em] text-[3rem] md:text-[4.5rem] print:text-[3.9rem]';
  const content = (
    <>
      {number && <span className="mr-4 text-[color:var(--pd-cue)]">{number}</span>}
      {lead && <span className="text-[color:var(--pd-ink)]">{lead}</span>}
      {accent && <span className="block text-[color:var(--pd-cue)]">{accent}</span>}
    </>
  );
  return as === 'h1' ? <h1 className={classes}>{content}</h1> : <h2 className={classes}>{content}</h2>;
}
