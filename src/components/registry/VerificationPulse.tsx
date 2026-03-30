
'use client';

/**
 * @fileOverview VerificationPulse - Unified Progress Visualizer.
 * Provides high-density feedback on Audit Coverage and Data Integrity.
 */

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  Activity, 
  AlertCircle, 
  TrendingUp,
  Fingerprint
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerificationPulseProps {
  total: number;
  verified: number;
  exceptions: number;
  dataGaps: number;
  className?: string;
}

export function VerificationPulse({ 
  total, 
  verified, 
  exceptions, 
  dataGaps, 
  className 
}: VerificationPulseProps) {
  const coverage = total > 0 ? Math.round((verified / total) * 100) : 0;

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
      {/* Coverage Pulse */}
      <div className="p-6 rounded-[2rem] bg-primary/5 border-2 border-primary/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Audit Coverage</span>
          <TrendingUp className="h-4 w-4 text-primary opacity-40" />
        </div>
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black tracking-tighter text-foreground">{coverage}%</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 pb-1">
              {verified} / {total}
            </span>
          </div>
          <Progress value={coverage} className="h-1.5 bg-primary/10" />
        </div>
      </div>

      {/* Activity Pulse */}
      <div className="p-6 rounded-[2rem] bg-card border-2 border-border/40 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Pending Assessment</span>
          <Activity className="h-4 w-4 text-orange-500 opacity-40" />
        </div>
        <div className="space-y-1">
          <span className="text-4xl font-black tracking-tighter text-foreground">{total - verified}</span>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter opacity-60">Records awaiting pulse</p>
        </div>
      </div>

      {/* Exception Pulse */}
      <div className={cn(
        "p-6 rounded-[2rem] border-2 shadow-lg space-y-4 transition-all",
        exceptions > 0 ? "bg-destructive/5 border-destructive/20" : "bg-card border-border/40"
      )}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Critical Alerts</span>
          <AlertCircle className={cn("h-4 w-4 opacity-40", exceptions > 0 ? "text-destructive" : "text-muted-foreground")} />
        </div>
        <div className="space-y-1">
          <span className={cn("text-4xl font-black tracking-tighter", exceptions > 0 ? "text-destructive" : "text-foreground")}>
            {exceptions}
          </span>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter opacity-60">High-risk discrepancies</p>
        </div>
      </div>

      {/* Data Fidelity Pulse */}
      <div className="p-6 rounded-[2rem] bg-card border-2 border-border/40 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Data Quality</span>
          <Fingerprint className="h-4 w-4 text-blue-500 opacity-40" />
        </div>
        <div className="space-y-1">
          <span className="text-4xl font-black tracking-tighter text-foreground">{dataGaps}</span>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter opacity-60">Missing technical markers</p>
        </div>
      </div>
    </div>
  );
}
