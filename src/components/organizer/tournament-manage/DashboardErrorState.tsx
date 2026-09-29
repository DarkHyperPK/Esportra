import { AlertTriangle } from 'lucide-react';
import { CommandButton, CommandShell } from '@/components/management/CommandSurface';
import { cn } from '@/lib/utils';
import { PANEL_CLASS } from '@/components/ui/kit/tone';

interface DashboardErrorStateProps {
  title: string;
  message: string;
  onBack: () => void;
  onRetry?: () => void;
}

/** Plain-language failure state. Never shows raw error objects to organizers. */
export function DashboardErrorState({ title, message, onBack, onRetry }: DashboardErrorStateProps) {
  return (
    <CommandShell>
      <div className="px-4 py-20">
        <div className={cn(PANEL_CLASS, 'mx-auto max-w-md p-8 text-center')}>
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-red-400" aria-hidden />
          <h1 className="font-heading text-2xl font-bold text-white">{title}</h1>
          <p className="mt-2 text-sm text-zinc-400">{message}</p>
          <div className="mt-6 flex justify-center gap-2">
            {onRetry && (
              <CommandButton variant="secondary" size="sm" onClick={onRetry}>Try again</CommandButton>
            )}
            <CommandButton variant="primary" size="sm" onClick={onBack}>All tournaments</CommandButton>
          </div>
        </div>
      </div>
    </CommandShell>
  );
}
