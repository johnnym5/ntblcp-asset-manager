'use client';

/**
 * @fileOverview High-Fidelity Safety Fallback - Resilience Terminal UI.
 * Phase 108: Mobile-optimized scaling and high-contrast terminal pulses.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  RotateCcw, 
  Home,
  ShieldAlert,
  Terminal,
  AlertTriangle
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
      "flex items-center justify-center p-4 sm:p-6 bg-[#0F172A] selection:bg-primary/20",
      isGlobal ? "min-h-screen w-full" : "w-full"
    )}>
      <Card className="max-w-2xl w-full border-none bg-transparent shadow-none overflow-hidden rounded-[1.5rem] bg-[#1E293B]">
        {/* Design Stripe */}
        <div className="h-2 w-full bg-primary" />
        
        {/* Design Header */}
        <div className="p-6 sm:p-10 pb-6 sm:pb-8 bg-[#334155]/20">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mb-2">{title}</h2>
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-[#94A3B8] opacity-60">
            AN ANOMALY WAS DETECTED IN THE TERMINAL STREAM.
          </p>
        </div>

        <CardContent className="p-6 sm:p-10 space-y-8 sm:space-y-10 bg-[#0F172A]">
          {/* Fault Details Container */}
          <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white shadow-inner space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 hidden xs:block">
              <ShieldAlert className="h-16 w-16 text-black" />
            </div>
            <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B]">INTERNAL FAULT DETAILS</h4>
            <p className="text-xs sm:text-sm font-medium text-[#1E293B] italic leading-relaxed break-words">
              {error.message || "Unknown deterministic pulse failure."}
            </p>
          </div>

          {/* Action Pulses */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button 
              onClick={resetErrorBoundary}
              className="w-full sm:flex-1 h-14 sm:h-16 rounded-2xl font-black uppercase text-[10px] sm:text-xs tracking-[0.2em] shadow-2xl shadow-blue-500/20 bg-[#3B82F6] hover:bg-[#2563EB] text-white gap-3 transition-all active:scale-95"
            >
              <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" /> ATTEMPT RECOVERY
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="w-full sm:flex-1 h-14 sm:h-16 rounded-2xl font-black uppercase text-[10px] sm:text-xs tracking-[0.2em] bg-transparent border-2 border-[#1E293B] hover:bg-white/5 text-white gap-3 transition-all active:scale-95"
            >
              <Home className="h-4 w-4 sm:h-5 sm:w-5" /> RETURN TO HUB
            </Button>
          </div>

          {/* Terminal Footer */}
          <div className="pt-6 border-t border-white/5 text-center">
            <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.4em] text-[#475569] leading-relaxed">
              ASSETAIN INTELLIGENCE TERMINAL V1.0
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
