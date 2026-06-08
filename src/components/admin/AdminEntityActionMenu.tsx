import { LucideIcon, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdmin } from '@/hooks/useAdmin';

export type AdminEntityAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
  variant?: 'default' | 'destructive' | 'success';
  onClick: () => void;
  disabled?: boolean;
  separatorBefore?: boolean;
};

type AdminEntityActionMenuProps = {
  actions: AdminEntityAction[];
  align?: 'start' | 'end';
};

const variantClasses: Record<NonNullable<AdminEntityAction['variant']>, string> = {
  default: 'text-zinc-300 focus:text-white focus:bg-zinc-800',
  destructive: 'text-red-400 focus:text-red-300 focus:bg-red-500/10',
  success: 'text-emerald-400 focus:text-emerald-300 focus:bg-emerald-500/10',
};

export function AdminEntityActionMenu({ actions, align = 'end' }: AdminEntityActionMenuProps) {
  const { can } = useAdmin();

  const visibleActions = actions.filter((action) => (
    !action.permission || can(action.permission)
  ));

  if (visibleActions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="bg-[#0a0a0c] border-zinc-800">
        {visibleActions.map((action) => (
          <div key={action.id}>
            {action.separatorBefore && <DropdownMenuSeparator className="bg-zinc-800" />}
            <DropdownMenuItem
              disabled={action.disabled}
              className={variantClasses[action.variant ?? 'default']}
              onClick={action.onClick}
            >
              <action.icon className="w-4 h-4 mr-2" />
              {action.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
