'use client';

/**
 * @fileOverview Professional Safe Fallback UI.
 * Shown when a component or page module fails to render.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  RotateCcw, 
  LayoutDashboard, 
  ShieldAlert,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  title?: string;
  isGlobal?: boolean;
}

export function ErrorFallback({ error, resetErrorBoundary, title = "Operational Interruption", isGlobal = false }: ErrorFallbackProps) {
  return (
    <div className={isGlobal ? "min-h-screen w-full flex items-center justify-center p-6 bg-background" : "w-full p-4"}>
      <Card className="max-w-2xl w-full border-2 border-destructive/20 bg-destructive/[0.02] rounded-[2.5rem] overflow-hidden shadow-2xl">
        <CardContent className="p-10 flex flex-col items-center text-center space-y-8">
          <div className="p-6 bg-destructive/10 rounded-[2rem] shadow-inner animate-pulse">
            <AlertTriangle className="h-16 w-16 text-destructive" />
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-black uppercase tracking-tight text-foreground">{title}</h2>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed italic max-w-sm mx-auto">
              A part of the system failed to render, but the rest of your workspace is still operational.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border-2 border-dashed border-destructive/20 w-full text-left space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-destructive">Layman Explanation:</p>
            <p className="text-xs font-bold text-foreground">
              {error.message.includes('permission') 
                ? "You don't have the required administrative permission to view this section."
                : "The module encountered a technical glitch while preparing the view."}
            </p>
            <p className="text-[9px] font-medium text-muted-foreground mt-2">SAFE NEXT STEP: Attempt to re-initialize the pulse or return to the main dashboard.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
            <Button 
              onClick={resetErrorBoundary}
              className="w-full sm:flex-1 h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 bg-primary text-primary-foreground gap-3 transition-transform hover:scale-105"
            >
              <RotateCcw className="h-4 w-4" /> Re-Initialize Pulse
            </Button>
            <Button 
              variant="outline"
              asChild
              className="w-full sm:flex-1 h-14 rounded-2xl font-black uppercase text-xs tracking-widest border-2 gap-3"
            >
              <Link href="/">
                <LayoutDashboard className="h-4 w-4" /> Return to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
