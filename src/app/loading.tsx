'use client';

/**
 * @fileOverview Root Loading Pulse - Deterministic Bootstrapping.
 */

import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-1000">
        <div className="p-6 bg-primary/10 rounded-[2.5rem] shadow-inner">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-primary animate-pulse">Assetain Core</p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-40">Syncing Registry Pulse...</p>
        </div>
      </div>
    </div>
  );
}
