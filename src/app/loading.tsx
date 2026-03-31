'use client';

/**
 * @fileOverview Root Loading Pulse - Deterministic Bootstrapping UI.
 * Phase 65: Hardened visuals aligned with the Black & Gold workstation theme.
 */

import { Loader2, Zap } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-8">
      <div className="relative">
        <div className="p-8 bg-primary/10 rounded-[3rem] shadow-inner">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
        <div className="absolute -bottom-2 -right-2 p-3 bg-primary rounded-2xl shadow-2xl animate-pulse">
          <Zap className="h-6 w-6 text-black fill-current" />
        </div>
      </div>
      
      <div className="space-y-2 text-center animate-in fade-in slide-in-from-bottom-2 duration-1000">
        <p className="text-[12px] font-black uppercase tracking-[0.5em] text-primary">Assetain Intelligence</p>
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-40">Replaying Registry Pulse...</p>
      </div>

      <div className="fixed bottom-10 left-0 right-0 flex justify-center opacity-20">
        <div className="flex gap-1">
          <div className="h-1 w-8 rounded-full bg-primary animate-pulse" />
          <div className="h-1 w-1 rounded-full bg-primary" />
          <div className="h-1 w-1 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
