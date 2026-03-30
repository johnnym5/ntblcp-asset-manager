'use client';

/**
 * @fileOverview VerificationPulse - Interactive Progress Visualizer.
 * Phase 38: Transformed static metrics into interactive logic triggers.
 */

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  Activity, 
  AlertCircle, 
  TrendingUp,
  Fingerprint,
  MousePointer2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerificationPulseProps {
  total: number;
  verified: number;
  exceptions: number;
  dataGaps: number;
  className?: string;
  onAction?: (type: 'verified' | 'exceptions' | 'gaps' | 'pending') => void;
}

export function VerificationPulse({ 
  total, 
  verified, 
  exceptions, 
  dataGaps, 
  className,
  onAction
}: VerificationPulseProps) {
  const coverage = total > 0 ? Math.round((verified / total) * 100) : 0;

  const StatBox = ({ 
    label, 
    value, 
    subLabel, 
    icon: Icon, 
    type,
    variant = "default",
    progress
  }: { 
    label: string, 
    value: string | number, 
    subLabel: string, 
    icon: any, 
    type: any,
    variant?: "default" | "destructive" | "warning",
    progress?: number
  }) => (
    <button 
      onClick={() => onAction?.(type)}
      className={cn(
        "p-6 rounded-[2rem] border-2 shadow-lg space-y-4 text-left transition-all group relative active:scale-95",
        variant === "destructive" ? "bg-destructive/5 border-destructive/10 hover:border-destructive/30" :
        variant === "warning" ? "bg-amber-500/5 border-amber-500/10 hover:border-amber-500/30" :
        "bg-card border-border/40 hover:border-primary/30"
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-[10px] font-black uppercase tracking-[0.2em] opacity-60",
          variant === "destructive" && "text-destructive",
          variant === "warning" && "text-amber-600"
        )}>{label}</span>
        <Icon className={cn(
          "h-4 w-4 opacity-20 transition-opacity group-hover:opacity-100",
          variant === "destructive" ? "text-destructive" : variant === "warning" ? "text-amber-600" : "text-primary"
        )} />
      </div>
      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn(
            "text-4xl font-black tracking-tighter",
            variant === "destructive" ? "text-destructive" : "text-foreground"
          )}>{value}</span>
          {progress !== undefined && <span className="text-[10px] font-black text-primary">{progress}%</span>}
        </div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter opacity-60">{subLabel}</p>
      </div>
      {progress !== undefined && (
        <Progress value={progress} className="h-1 bg-primary/10 mt-2" />
      )}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity">
        <MousePointer2 className="h-3 w-3" />
      </div>
    </button>
  );

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
      <StatBox 
        label="Audit Coverage" 
        value={`${coverage}%`} 
        subLabel={`${verified} of ${total} verified`} 
        icon={TrendingUp} 
        type="verified"
        progress={coverage}
      />
      <StatBox 
        label="Pending Pulse" 
        value={total - verified} 
        subLabel="Awaiting field assessment" 
        icon={Activity} 
        type="pending"
      />
      <StatBox 
        label="Critical Alerts" 
        value={exceptions} 
        subLabel="High-risk discrepancies" 
        icon={AlertCircle} 
        type="exceptions"
        variant={exceptions > 0 ? "destructive" : "default"}
      />
      <StatBox 
        label="Data Quality" 
        value={dataGaps} 
        subLabel="Missing technical markers" 
        icon={Fingerprint} 
        type="gaps"
        variant={dataGaps > 0 ? "warning" : "default"}
      />
    </div>
  );
}
