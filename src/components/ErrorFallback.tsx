'use client';

/**
 * @fileOverview High-Fidelity Safety Fallback - Resilience Terminal UI.
 * Phase 127: Removed hardcoded colors for perfect contrast in both themes.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  RotateCcw, 
  Home,
  ShieldAlert,
  Terminal,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  title?: string;
  isGlobal?: boolean;
}

export function ErrorFallback({ error, resetErrorBoundary, title = "Safety Fallback Initialized", isGlobal = false }: ErrorFallbackProps) {
  return (
    <div className={cn(
      "flex items-center justify-center p-4 sm:p-6 bg-background selection:bg-primary/20",
      isGlobal ? "min-h-screen w-full" : "w-full"
    )}>
      <Card className="max-w-2xl w-full border-2 border-border/40 bg-card/50 shadow-3xl overflow-hidden rounded-[2.5rem]">
        {/* Top Design Stripe - High Visibility Gold */}
        <div className="h-2 w-full bg-primary" />
        
        {/* Terminal Header */}
        <div className="p-6 sm:p-10 pb-6 sm:pb-8 bg-muted/20 border-b">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShieldAlert className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground">{title}</h2>
          </div>
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground opacity-60">
            AN ANOMALY WAS DETECTED IN THE TERMINAL STREAM.
          </p>
        </div>

        <CardContent className="p-6 sm:p-10 space-y-8 sm:space-y-10">
          {/* Internal Fault Box - Semantic Dark/Light Surface */}
          <div className="p-6 sm:p-8 rounded-[2rem] bg-muted/30 border-2 border-dashed border-primary/20 space-y-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Activity className="h-20 w-20 text-primary" />
            </div>
            
            <div className="flex items-center gap-2">
              <Terminal className="h-3 w-3 text-primary" />
              <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-primary">INTERNAL FAULT DETAILS</h4>
            </div>
            
            <p className="text-xs sm:text-sm font-medium text-foreground italic leading-relaxed break-words font-mono opacity-80">
              {error.message || "Unknown deterministic pulse failure."}
            </p>
          </div>

          {/* Action Pulses - Gold & Semantic Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button 
              onClick={resetErrorBoundary}
              className="w-full sm:flex-1 h-14 sm:h-16 rounded-2xl font-black uppercase text-[10px] sm:text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground gap-3 transition-all active:scale-95"
            >
              <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" /> ATTEMPT RECOVERY
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="w-full sm:flex-1 h-14 sm:h-16 rounded-2xl font-black uppercase text-[10px] sm:text-xs tracking-[0.2em] bg-transparent border-2 hover:border-primary/40 hover:bg-primary/5 text-foreground gap-3 transition-all active:scale-95"
            >
              <Home className="h-4 w-4 sm:h-5 sm:w-5" /> RETURN TO HUB
            </Button>
          </div>

          {/* Terminal Footer */}
          <div className="pt-6 border-t border-border/40 text-center">
            <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40 leading-relaxed">
              ASSETAIN INTELLIGENCE TERMINAL V1.0
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}