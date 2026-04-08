'use client';

/**
 * @fileOverview AssetChecklist - High-Fidelity Data Quality Monitor.
 * Phase 405: Driven by Global Header Settings for real-time validation pulses.
 */

import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  MapPin, 
  Tag,
  Info
} from 'lucide-react';
import type { Asset } from '@/types/domain';
import { cn } from '@/lib/utils';
import { useAppState } from '@/contexts/app-state-context';

interface AssetChecklistProps {
  values: Partial<Asset>;
}

const ChecklistItem = ({ label, isCompleted, icon: Icon }: { label: string; isCompleted: boolean; icon: any }) => (
  <div className="flex items-center justify-between group transition-all">
    <div className="flex items-center gap-4">
      <div className={cn(
        "p-2 rounded-lg transition-colors",
        isCompleted ? "bg-primary/5 text-primary" : "bg-foreground/5 text-foreground/20"
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <span className={cn(
        "text-[10px] font-black uppercase tracking-tight transition-colors",
        isCompleted ? "text-foreground" : "text-foreground/20"
      )}>{label}</span>
    </div>
    <div className="shrink-0">
        {isCompleted ? (
          <div className="h-5 w-5 rounded-full border-2 border-primary flex items-center justify-center bg-primary/10">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          </div>
        ) : (
          <div className="h-5 w-5 rounded-full border-2 border-foreground/10 flex items-center justify-center">
            <XCircle className="h-3.5 w-3.5 text-destructive/40" />
          </div>
        )}
    </div>
  </div>
);

export function AssetChecklist({ values }: AssetChecklistProps) {
  const { headers } = useAppState();

  // Filter headers that are enabled for the checklist view
  const checklistHeaders = React.useMemo(() => {
    return headers.filter(h => h.inChecklist);
  }, [headers]);

  // Map headers to checklist items
  const items = checklistHeaders.map(header => {
    let val: any = "";
    switch(header.normalizedName) {
      case "sn": val = values.sn; break;
      case "location": val = values.location; break;
      case "asset_description": val = values.description; break;
      case "asset_id_code": val = values.assetIdCode; break;
      case "asset_class": val = values.category; break;
      case "condition": val = values.condition; break;
      default:
        val = (values.metadata as any)?.[header.rawName] || (values.metadata as any)?.[header.normalizedName];
    }

    return {
      label: header.displayName,
      completed: val !== undefined && val !== null && String(val).trim() !== "" && String(val).trim() !== "---",
      icon: Info
    };
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="space-y-2">
        <h3 className="text-2xl font-black uppercase tracking-tight text-foreground leading-none">Fidelity Audit</h3>
        <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground opacity-60">Global registry validation pulse</p>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Required Anchors</h4>
          <div className="space-y-3.5">
            {items.length > 0 ? (
              items.map((item) => (
                <ChecklistItem key={item.label} {...item} />
              ))
            ) : (
              <div className="p-4 rounded-xl border-2 border-dashed border-border/40 text-center">
                <p className="text-[8px] font-black uppercase text-muted-foreground opacity-40 italic">No fidelity markers configured</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
