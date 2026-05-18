import React from 'react';
import { cn } from '@/lib/utils';

type CommandButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
type CommandButtonSize = 'sm' | 'md' | 'lg';

const variantClasses: Record<CommandButtonVariant, { base: string; fill: string; text: string }> = {
  primary: {
    base: 'border-white bg-white text-black shadow-[0_20px_50px_rgba(255,255,255,0.12)]',
    fill: 'bg-rose-500',
    text: 'group-hover:text-white',
  },
  secondary: {
    base: 'border-white/15 bg-black text-white',
    fill: 'bg-white',
    text: 'group-hover:text-black',
  },
  ghost: {
    base: 'border-white/10 bg-white/[0.03] text-white',
    fill: 'bg-white/10',
    text: 'group-hover:text-white',
  },
  danger: {
    base: 'border-red-500/40 bg-red-950/20 text-red-200',
    fill: 'bg-red-600',
    text: 'group-hover:text-white',
  },
  success: {
    base: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200',
    fill: 'bg-emerald-600',
    text: 'group-hover:text-white',
  },
  warning: {
    base: 'border-amber-500/40 bg-amber-950/20 text-amber-200',
    fill: 'bg-amber-500',
    text: 'group-hover:text-black',
  },
};

const sizeClasses: Record<CommandButtonSize, string> = {
  sm: 'h-9 px-3 text-[11px]',
  md: 'h-11 px-5 text-xs',
  lg: 'h-14 px-7 text-sm',
};

export function CommandButton({
  className,
  variant = 'primary',
  size = 'md',
  children,
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: CommandButtonVariant; size?: CommandButtonSize }) {
  const styles = variantClasses[variant];

  return (
    <button
      type={type}
      className={cn(
        'group relative inline-flex items-center justify-center overflow-hidden rounded-none border font-mono font-bold uppercase tracking-wider transition-colors duration-300 disabled:pointer-events-none disabled:opacity-50',
        sizeClasses[size],
        styles.base,
        styles.text,
        className,
      )}
      {...props}
    >
      <span className={cn('absolute inset-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0', styles.fill)} />
      <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
    </button>
  );
}

export function CommandShell({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('min-h-screen bg-[#050505] text-white relative overflow-hidden', className)}>
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_72%)]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function CommandHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('border border-white/10 bg-black/70 p-5 md:p-7', className)}>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          {eyebrow && <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.45em] text-rose-400">{eyebrow}</div>}
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-white md:text-5xl">{title}</h1>
          {description && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}

export function CommandSection({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section className={cn('border border-white/10 bg-[#09090b] p-5 md:p-7', className)}>
      {children}
    </section>
  );
}

export function CommandTabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { value: string; label: string }[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-2 border border-white/10 bg-black/70 p-2', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'rounded-none border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors',
            active === tab.value
              ? 'border-rose-500 bg-rose-500 text-white'
              : 'border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/30 hover:text-white',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function CommandMetric({
  label,
  value,
  icon,
  tone = 'neutral',
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const tones = {
    neutral: 'text-white',
    success: 'text-emerald-300',
    warning: 'text-amber-300',
    danger: 'text-red-300',
  };

  return (
    <div className="border border-white/10 bg-white/[0.02] p-4">
      <div className={cn('mb-3 flex h-8 w-8 items-center justify-center border border-white/10', tones[tone])}>{icon}</div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</div>
    </div>
  );
}
