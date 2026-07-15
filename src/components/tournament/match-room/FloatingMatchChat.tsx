import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

interface FloatingMatchChatProps {
  children: React.ReactNode;
}

export const FloatingMatchChat: React.FC<FloatingMatchChatProps> = ({ children }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {/* Chat panel with slide/fade transition */}
      <div
        className={`w-[min(420px,calc(100vw-2.5rem))] overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0c]/95 shadow-2xl shadow-black/60 backdrop-blur-xl transition-all duration-200 ease-out ${
          open
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-2 scale-95 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-400">Comms</p>
            <p className="text-sm font-semibold text-white">Match chat</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-white/10 p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close match chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>

      {/* Circular FAB button */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`grid h-14 w-14 place-items-center rounded-full shadow-lg transition-all duration-200 ${
          open
            ? 'bg-zinc-800 text-zinc-300 shadow-black/40 hover:bg-zinc-700 hover:text-white'
            : 'bg-cyan-600 text-white shadow-cyan-950/50 hover:bg-cyan-500 hover:shadow-xl'
        }`}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        <span className={`transition-transform duration-200 ${open ? 'rotate-0' : 'rotate-0'}`}>
          {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        </span>
      </button>
    </div>
  );
};
