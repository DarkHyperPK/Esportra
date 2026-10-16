import { useState, type ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { CommandShell } from '@/components/management/CommandSurface';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { BroadcastNavigation } from './BroadcastNavigation';
import './broadcast-workspace.css';

export function BroadcastShell({ children, sidebar, focused = false }: { children: ReactNode; sidebar?: ReactNode; focused?: boolean }) {
  const [open, setOpen] = useState(false);
  const navigation = <BroadcastNavigation focused={focused}>{sidebar}</BroadcastNavigation>;
  return <CommandShell className="broadcast-web">
    <div className="broadcast-web-layout">
      <aside className="broadcast-sidebar" aria-label="Broadcast workspace navigation">{navigation}</aside>
      <div className="broadcast-web-content">{children}</div>
    </div>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><button className="broadcast-sidebar-toggle" aria-label="Open broadcast navigation"><Menu size={18} /></button></SheetTrigger>
      <SheetContent side="left" className="broadcast-web broadcast-sidebar-mobile">
      <SheetTitle className="sr-only">Broadcast navigation</SheetTitle><SheetDescription className="sr-only">Choose a broadcast page or preparation step.</SheetDescription>
      <div onClick={event => { if (event.target instanceof Element && event.target.closest('a, button')) setOpen(false); }}>{navigation}</div>
    </SheetContent></Sheet>
  </CommandShell>;
}
