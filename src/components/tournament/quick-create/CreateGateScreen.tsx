import type { ReactNode } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { CommandButton } from '@/components/management/CommandSurface';
import { EYEBROW_CLASS } from '@/components/ui/kit';

interface CreateGateScreenProps {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  points?: string[];
  actionLabel?: string;
  onAction?: () => void;
  footnote?: string;
}

/**
 * Shown instead of the create flow when something has to happen first
 * (sign in, switch role, set up an organization). Says what, why, and the
 * one thing to do next.
 */
export function CreateGateScreen({ icon, eyebrow, title, description, points, actionLabel, onAction, footnote }: CreateGateScreenProps) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16 sm:py-24">
      <div className="mb-8 flex h-14 w-14 items-center justify-center bg-white/[0.04] text-rose-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
        {icon}
      </div>
      <p className={EYEBROW_CLASS}>{eyebrow}</p>
      <h1 className="mt-3 font-heading text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">{title}</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-zinc-400">{description}</p>
      {points && points.length > 0 && (
        <ul className="mt-6 space-y-2">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm text-zinc-300">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
      )}
      {actionLabel && onAction && (
        <CommandButton variant="primary" size="md" slide onClick={onAction} className="mt-8">
          {actionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </CommandButton>
      )}
      {footnote && <p className="mt-4 text-xs text-zinc-500">{footnote}</p>}
    </div>
  );
}
