'use client';

/**
 * @fileOverview AssetChecklist - High-Fidelity Data Quality Monitor.
 * Phase 406: Compacted for Dossier integration.
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
    <div className="flex items-center gap-3">
      <div className={cn(
        "p-1.5 rounded-md transition-colors",
        isCompleted ? "bg-primary/5 text-primary" : "bg-foreground/5 text-foreground/20"
      )}>
        <Icon className="h-3 w-3" />
      </div>
      <span className={cn(
        "text-[9px] font-black uppercase tracking-tight transition-colors",
        isCompleted ? "text-foreground" : "text-foreground/20"
      )}>{label}</span>
    </div>
    <div className="shrink-0">
        {isCompleted ? (
          <div className="h-4 w-4 rounded-full border border-primary flex items-center justify-center bg-primary/10">
            <CheckCircle2 className="h-2.5 w-2.5 text-primary" />
          </div>
        ) : (
          <div className="h-4 w-4 rounded-full border border-foreground/10 flex items-center justify-center">
            <XCircle className="h-2.5 w-2.5 text-destructive/40" />
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
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="space-y-1">
        <h3 className="text-base font-black uppercase tracking-tight text-foreground leading-none">Fidelity Audit</h3>
        <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-60">Global validation pulse</p>
      </div>

      <div className="space-y-4">
        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Required Anchors</h4>
        <div className="space-y-2.5">
          {items.length > 0 ? (
            items.map((item) => (
              <ChecklistItem key={item.label} {...item} />
            ))
          ) : (
            <div className="p-3 rounded-xl border-2 border-dashed border-border/40 text-center">
              <p className="text-[7px] font-black uppercase text-muted-foreground opacity-40 italic">No markers</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
