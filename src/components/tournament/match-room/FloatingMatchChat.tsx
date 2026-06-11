import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingMatchChatProps {
  children: React.ReactNode;
}

export const FloatingMatchChat: React.FC<FloatingMatchChatProps> = ({ children }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open ? (
        <div className="w-[min(420px,calc(100vw-2.5rem))] overflow-hidden border border-white/10 bg-[#050505]/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-400">Comms</p>
              <p className="text-sm font-semibold text-white">Match chat</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-white/10 p-2 text-zinc-400 transition-colors hover:text-white"
              aria-label="Close match chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {children}
        </div>
      ) : null}

      <Button
        onClick={() => setOpen((value) => !value)}
        className="h-12 rounded-full bg-cyan-600 px-5 text-white shadow-2xl shadow-cyan-950/40 hover:bg-cyan-500"
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        Chat
      </Button>
    </div>
  );
};
