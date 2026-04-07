'use client';

/**
 * @fileOverview ConditionSummary - Live Metric Pulse.
 * Phase 1: High-fidelity summary bar for condition-based grouping.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { GROUP_COLORS } from '@/lib/condition-logic';
import type { ConditionGroup, Asset } from '@/types/domain';
import { ShieldCheck, Activity, AlertCircle, Trash2, Box, HelpCircle } from 'lucide-react';

interface ConditionSummaryProps {
  counts: Record<ConditionGroup, number>;
  total: number;
  className?: string;
}

const IconMap: Record<ConditionGroup, any> = {
  'Good': ShieldCheck,
  'Bad': Activity,
  'Stolen': AlertCircle,
  'Obsolete': Box,
  'Unsalvageable': Trash2,
  'Discrepancy': HelpCircle
};

export function ConditionSummary({ counts, total, className }: ConditionSummaryProps) {
  const GroupStat = ({ group }: { group: ConditionGroup }) => {
    const Icon = IconMap[group];
    return (
      <div className="flex flex-col items-center gap-1.5 px-6 py-2 border-r border-white/5 last:border-0">
        <div className={cn("flex items-center gap-2", GROUP_COLORS[group])}>
          <Icon className="h-3.5 w-3.5" />
          <span className="text-[10px] font-black uppercase tracking-widest">{group}</span>
        </div>
        <span className="text-2xl font-black tabular-nums">{counts[group]}</span>
      </div>
    );
  };

  return (
    <div className={cn(
      "bg-black/40 backdrop-blur-3xl border-2 border-white/5 rounded-[2rem] shadow-3xl overflow-x-auto no-scrollbar",
      className
    )}>
      <div className="flex items-center min-w-max p-2">
        <GroupStat group="Good" />
        <GroupStat group="Bad" />
        <GroupStat group="Stolen" />
        <GroupStat group="Obsolete" />
        <GroupStat group="Unsalvageable" />
        <GroupStat group="Discrepancy" />
        
        <div className="flex flex-col items-center gap-1.5 px-8 py-2 bg-primary/5 rounded-2xl ml-4 mr-2 border border-primary/10">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Total Assets</span>
          <span className="text-3xl font-black tabular-nums text-primary leading-none">{total}</span>
        </div>
      </div>
    </div>
  );
}
