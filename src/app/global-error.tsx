'use client';

/**
 * @fileOverview Global Error Boundary - The Absolute Safety Net.
 * Hardened for static export resilience.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-background font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center gap-8">
          <div className="p-8 bg-destructive/10 rounded-[3rem] shadow-inner">
            <ShieldAlert className="h-20 w-20 text-destructive" />
          </div>
          <div className="max-w-md space-y-3">
            <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">System Pulse Critical Failure</h1>
            <p className="text-sm font-medium text-muted-foreground italic leading-relaxed">
              A root-level technical glitch occurred. The application is attempting to safe-start the operational pulse.
            </p>
          </div>
          <Button 
            onClick={() => reset()}
            className="h-14 px-12 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 bg-primary text-primary-foreground gap-3 transition-transform hover:scale-105"
          >
            <RotateCcw className="h-4 w-4" /> Re-Initialize Pulse
          </Button>
        </div>
      </body>
    </html>
  );
}
