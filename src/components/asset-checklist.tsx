'use client';

/**
 * @fileOverview AssetChecklist - High-Fidelity Data Quality Monitor.
 * Hardened for absolute data resolution resilience.
 * Phase 407: Implemented Safe Property Lookup with metadata fallbacks.
 */

import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Info
} from 'lucide-react';
import type { Asset } from '@/types/domain';
import { cn } from '@/lib/utils';
import { useAppState } from '@/contexts/app-state-context';

interface AssetChecklistProps {
  values: Partial<Asset>;
}

const ChecklistItem = ({ label, isCompleted, icon: Icon }: { label: string; isCompleted: boolean; icon: any }) => (
  <div className="flex items-center justify-between group transition-all py-1">
    <div className="flex items-center gap-3">
      <div className={cn(
        "p-1.5 rounded-md transition-colors",
        isCompleted ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
      )}>
        <Icon className="h-3 w-3" />
      </div>
      <span className={cn(
        "text-[10px] font-black uppercase tracking-tight transition-colors",
        isCompleted ? "text-foreground" : "text-foreground/40"
      )}>{label}</span>
    </div>
    <div className="shrink-0">
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500/40" />
        )}
    </div>
  </div>
);

export function AssetChecklist({ values }: AssetChecklistProps) {
  const { headers } = useAppState();

  const checklistHeaders = React.useMemo(() => {
    return headers.filter(h => h.inChecklist);
  }, [headers]);

  const items = checklistHeaders.map(header => {
    let val: any = "";
    
    // 1. Attempt to resolve from core domain properties first
    switch(header.normalizedName) {
      case "sn": val = values.sn; break;
      case "location": val = values.location; break;
      case "assignee_location": val = values.custodian; break;
      case "asset_description": val = values.description || values.name; break;
      case "asset_id_code": val = values.assetIdCode; break;
      case "serial_number": val = values.serialNumber; break;
      case "asset_class": val = values.category; break;
      case "manufacturer": val = values.manufacturer; break;
      case "model_number": val = values.modelNumber; break;
      case "condition": val = values.condition; break;
      case "remarks": val = values.remarks; break;
      default:
        // Fall through to metadata search
        val = undefined;
    }

    // 2. Metadata Search Pulse (If domain prop was empty or unmapped)
    const isEmptyProperty = val === undefined || val === null || String(val).trim() === "" || String(val).trim() === "---";
    if (isEmptyProperty) {
      const meta = values.metadata || {};
      val = meta[header.rawName] || meta[header.normalizedName];
      
      // 3. Case-insensitive metadata crawl
      if (val === undefined || val === null) {
        const searchKey = header.rawName.toLowerCase();
        const normKey = header.normalizedName.toLowerCase();
        for (const k of Object.keys(meta)) {
          const lk = k.toLowerCase();
          if (lk === searchKey || lk === normKey) {
            val = meta[k];
            break;
          }
        }
      }
    }

    // 4. Robust "Completed" validation check
    const sVal = String(val || '').trim().toLowerCase();
    const isMissing = !val || 
                      sVal === "" || 
                      sVal === "---" || 
                      sVal === "n/a" || 
                      sVal === "none" || 
                      sVal === "undefined" || 
                      sVal === "null" || 
                      sVal === "unset";

    return {
      label: header.displayName,
      completed: !isMissing,
      icon: Info
    };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="space-y-1">
        <h3 className="text-base font-black uppercase tracking-tight text-foreground leading-none">Fidelity Audit</h3>
        <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-60">Global validation pulse</p>
      </div>

      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <ChecklistItem key={item.label} {...item} />
          ))
        ) : (
          <div className="p-4 rounded-xl border-2 border-dashed border-border/40 text-center">
            <p className="text-[8px] font-black uppercase text-muted-foreground opacity-40 italic">No checklist markers configured</p>
          </div>
        )}
      </div>
    </div>
  );
}
