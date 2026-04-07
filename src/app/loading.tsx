'use client';

/**
 * @fileOverview Root Loading Pulse - Deterministic Bootstrapping UI.
 * Phase 1005: Simplified to "Loading..." pulse with high-fidelity iconography.
 */

import { Loader2, Zap } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-black gap-10">
      {/* Central Diagnostic Identity */}
      <div className="relative">
        <div className="p-10 bg-white/[0.03] rounded-[3.5rem] shadow-inner border border-white/5 backdrop-blur-xl">
          <Loader2 className="h-16 w-16 animate-spin text-primary/80" strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-3 -right-3 p-4 bg-primary rounded-[1.25rem] shadow-3xl animate-pulse">
          <Zap className="h-7 w-7 text-black fill-current" />
        </div>
      </div>
      
      {/* Simplified Status Pulse */}
      <div className="space-y-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-1000">
        <div className="flex flex-col items-center gap-3">
          <p className="text-[12px] font-black uppercase tracking-[0.6em] text-primary ml-[0.6em]">
            Loading
          </p>
          <div className="flex justify-center gap-1.5 opacity-30">
            <div className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <div className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <div className="h-1 w-1 rounded-full bg-primary animate-bounce" />
          </div>
        </div>
      </div>

      {/* Metadata Watermark */}
      <div className="fixed bottom-12 left-0 right-0 flex justify-center opacity-10">
        <p className="text-[8px] font-black uppercase tracking-[0.5em] text-white">
          Registry Intelligence Pulse v5.0.4
        </p>
      </div>
    </div>
  );
}
