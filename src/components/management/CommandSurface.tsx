import React, { createContext, useContext } from 'react';
import { Slot, Slottable } from '@radix-ui/react-slot';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// When true, CommandHeader / CommandSection / CommandActionBar render compact + flat.
// Used by tournament dashboard panels — wrap panel content in DashboardPanelProvider.
const DashboardPanelCtx = createContext(false);
export function DashboardPanelProvider({ children }: { children: React.ReactNode }) {
  return <DashboardPanelCtx.Provider value={true}>{children}</DashboardPanelCtx.Provider>;
}

type CommandButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
type CommandButtonSize = 'icon' | 'sm' | 'md' | 'lg';

const variantClasses: Record<CommandButtonVariant, { base: string; fill: string; text: string }> = {
  primary: {
    base: 'border-white bg-white text-matte-black',
    fill: 'bg-rose-500',
    text: 'group-hover:text-white',
  },
  secondary: {
    base: 'border-white/15 bg-matte-black text-white',
    fill: 'bg-rose-500',
    text: 'group-hover:text-white',
  },
  ghost: {
    base: 'border-white/10 bg-white/[0.03] text-white',
    fill: 'bg-rose-500',
    text: 'group-hover:text-white',
  },
  danger: {
    base: 'border-red-500/35 bg-red-950/20 text-red-100',
    fill: 'bg-rose-600',
    text: 'group-hover:text-white',
  },
  success: {
    base: 'border-emerald-500/35 bg-emerald-950/20 text-emerald-100',
    fill: 'bg-rose-500',
    text: 'group-hover:text-white',
  },
  warning: {
    base: 'border-amber-500/35 bg-amber-950/20 text-amber-100',
    fill: 'bg-rose-500',
    text: 'group-hover:text-white',
  },
};

const sizeClasses: Record<CommandButtonSize, string> = {
  icon: 'h-9 w-9 p-0 text-[11px]',
  sm: 'h-9 px-3 text-[11px]',
  md: 'h-11 px-5 text-xs',
  lg: 'h-14 px-7 text-sm',
};

type CommandButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement | HTMLAnchorElement> & {
  variant?: CommandButtonVariant;
  size?: CommandButtonSize;
  asChild?: boolean;
  slide?: boolean;
};

export const CommandButton = React.forwardRef<HTMLButtonElement, CommandButtonProps>(({
  className,
  variant = 'primary',
  size = 'md',
  children,
  type = 'button',
  asChild = false,
  slide = false,
  ...props
}, ref) => {
  const styles = variantClasses[variant];
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      {...(!asChild ? { type } : {})}
      ref={ref}
      className={cn(
        'group relative inline-flex items-center justify-center overflow-hidden rounded-none border font-mono font-bold uppercase tracking-wider transition-colors duration-300 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
        sizeClasses[size],
        styles.base,
        styles.text,
        className,
      )}
      {...props}
    >
      {slide ? <span className={cn('absolute inset-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0', styles.fill)} /> : null}
      {asChild ? (
        <Slottable>{children}</Slottable>
      ) : (
        <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
      )}
    </Component>
  );
});

CommandButton.displayName = 'CommandButton';

type CommandIconButtonProps = Omit<CommandButtonProps, 'size'> & {
  label: string;
};

export const CommandIconButton = React.forwardRef<HTMLButtonElement, CommandIconButtonProps>(({
  label,
  children,
  className,
  ...props
}, ref) => (
  <CommandButton
    ref={ref}
    size="icon"
    className={cn('[&_svg]:h-4 [&_svg]:w-4', className)}
    aria-label={label}
    title={label}
    {...props}
  >
    {children}
    <span className="sr-only">{label}</span>
  </CommandButton>
));

CommandIconButton.displayName = 'CommandIconButton';

export function CommandTabButton({
  active,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        'group relative overflow-hidden rounded-none border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:pointer-events-none disabled:opacity-50',
        active
          ? 'border-transparent bg-rose-500 text-white'
          : 'border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/25 hover:text-white',
        className,
      )}
      {...props}
    >
      <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
    </button>
  );
}

export function CommandSegmentedButton(props: React.ComponentProps<typeof CommandTabButton>) {
  return <CommandTabButton {...props} className={cn('px-3 py-1.5 text-[10px]', props.className)} />;
}

export function CommandShell({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('esportra-ambient-page relative min-h-screen overflow-hidden text-white', className)}>
      <div className="esportra-ambient-content">{children}</div>
    </div>
  );
}

export function CommandPageGrid({
  rail,
  children,
  className,
}: {
  rail?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative z-10 grid gap-3 px-3 py-3 lg:grid-cols-[200px_minmax(0,1fr)] xl:px-4', className)}>
      {rail ? <aside className="relative z-30 self-start space-y-4 overflow-visible lg:sticky lg:top-3">{rail}</aside> : null}
      <div className="min-w-0 space-y-2">{children}</div>
    </div>
  );
}

export function CommandRail({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('relative z-30 isolate overflow-visible border border-white/[0.07] bg-[#0e0f13] px-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.25)]', className)}>
      {children}
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
  const isDashboard = useContext(DashboardPanelCtx);
  return isDashboard ? (
    <header className={cn('border-b border-white/[0.07] px-5 pb-5 pt-6 sm:px-6', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
              {eyebrow}
            </div>
          ) : null}
          <h2 className="font-heading text-xl font-bold tracking-tight text-white">{title}</h2>
          {description ? <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-zinc-400">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  ) : (
    <header className={cn('border border-white/10 bg-[#0a0a0c]/92 p-5', className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          {eyebrow ? (
            <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.45em] text-rose-400">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="font-heading text-xl font-black uppercase tracking-tight text-white md:text-2xl">{title}</h1>
          {description ? <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </header>
  );
}

export function CommandToolbar({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col gap-3 border border-white/10 bg-[#0a0a0c]/92 p-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      {children}
    </div>
  );
}

export function CommandSection({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  const isDashboard = useContext(DashboardPanelCtx);
  return (
    <section className={cn(
      isDashboard ? 'border-b border-white/[0.06] px-5 py-6 last:border-b-0 sm:px-6' : 'border border-white/10 bg-[#0a0a0c]/92 p-5',
      className
    )}>
      {children}
    </section>
  );
}

export function CommandPanel({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border border-white/10 bg-white/[0.025] p-4', className)}>
      {children}
    </div>
  );
}

export function CommandActionBar({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  const isDashboard = useContext(DashboardPanelCtx);
  return (
    <div className={cn(
      isDashboard
        ? 'sticky bottom-0 z-20 flex flex-col gap-2 border-t border-white/10 bg-background/90 px-5 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-6'
        : 'flex flex-col gap-3 border border-white/10 bg-[#0a0a0c]/96 p-4 sm:flex-row sm:items-center sm:justify-between',
      className
    )}>
      {children}
    </div>
  );
}

export function CommandEmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-h-[220px] flex-col items-center justify-center border border-dashed border-white/10 bg-white/[0.02] p-8 text-center', className)}>
      {icon ? <div className="mb-4 flex h-12 w-12 items-center justify-center border border-white/10 text-zinc-400">{icon}</div> : null}
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description ? <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
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
    <div className={cn('flex flex-wrap gap-2 border border-white/10 bg-[#0a0a0c]/92 p-2', className)}>
      {tabs.map((tab) => (
        <CommandTabButton
          key={tab.value}
          onClick={() => onChange(tab.value)}
          active={active === tab.value}
        >
          {tab.label}
        </CommandTabButton>
      ))}
    </div>
  );
}

/** Animated unsaved-changes dot for use in CommandActionBar. */
export function DirtyIndicator({ isDirty }: { isDirty: boolean }) {
  return (
    <AnimatePresence>
      {isDirty && (
        <motion.span
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 0.15, ease: [0, 0, 0.2, 1] } }}
          exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.1 } }}
          className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500"
          aria-label="Unsaved changes"
        />
      )}
    </AnimatePresence>
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
    <div className="border border-white/10 bg-white/[0.025] p-3">
      <div className={cn('mb-2 flex h-7 w-7 items-center justify-center border border-white/10', tones[tone])}>{icon}</div>
      <div className="text-xl font-black text-white">{value}</div>
      <div className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</div>
    </div>
  );
}
