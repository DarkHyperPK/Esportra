import { CommandHeader } from '@/components/management/CommandSurface';

interface AdminPageProps {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Standard chrome for every admin tool page: CommandHeader + content stack.
 * Phases 5-9 migrate each tool to compose this instead of rolling its own header.
 */
export function AdminPage({ eyebrow, title, description, actions, children }: AdminPageProps) {
  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-5 p-4 md:p-6">
      <CommandHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
      />
      {children}
    </div>
  );
}
