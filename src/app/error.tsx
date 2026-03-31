'use client';

/**
 * @fileOverview Root Error Boundary Fallback.
 * Phase 64: Hardened UI alignment for critical failures.
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ServerCrash, RotateCcw, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to the administrative audit pulse
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background gap-8 text-center p-6 animate-in fade-in duration-700">
        <div className="p-8 bg-destructive/10 rounded-[3rem] shadow-inner animate-pulse">
          <ServerCrash className="h-20 w-20 text-destructive" />
        </div>
        <div className="max-w-md space-y-3">
            <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">Operational Interrupt</h1>
            <p className="text-sm font-medium text-muted-foreground italic leading-relaxed">
                An unexpected technical glitch occurred. You can attempt to re-initialize the registry pulse or return to the dashboard.
            </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-sm">
          <Button 
            onClick={() => reset()}
            className="w-full sm:flex-1 h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 bg-primary text-primary-foreground gap-3 transition-transform hover:scale-105"
          >
            <RotateCcw className="h-4 w-4" /> Retry Pulse
          </Button>
          <Button 
            variant="outline"
            asChild
            className="w-full sm:flex-1 h-14 rounded-2xl font-black uppercase text-xs tracking-widest border-2 gap-3"
          >
            <Link href="/">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
          </Button>
        </div>
    </div>
  );
}
