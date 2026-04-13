'use client';

/**
 * @fileOverview AssetDataChecklist - Category-Aware Guidance logic.
 * Correctly identifies that Vehicles do not need standard Serials if Chassis/Engine exists.
 * Phase 1002: Hardened metadata inspection for Chassis/Engine pulses.
 */

import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Info,
  Car,
  Laptop
} from 'lucide-react';
import type { Asset } from '@/types/domain';
import { cn, getFuzzySignature } from '@/lib/utils';
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

  // Category Logic: Identification of Vehicle vs Electronic Pulse
  const isVehicle = React.useMemo(() => {
    const cat = (values.category || '').toLowerCase();
    return cat.includes('motor') || cat.includes('vehicle');
  }, [values.category]);

  const items = checklistHeaders.map(header => {
    let val: any = "";
    
    // Core Domain Mapping
    switch(header.normalizedName) {
      case "sn": val = values.sn; break;
      case "location": val = values.location; break;
      case "asset_description": val = values.description || values.name; break;
      case "asset_id_code": val = values.assetIdCode; break;
      case "serial_number": val = values.serialNumber; break;
      case "chassis_no": val = values.chassisNo; break;
      case "engine_no": val = values.engineNo; break;
      case "asset_class": val = values.category; break;
      case "condition": val = values.condition; break;
      default:
        val = (values as any)[header.normalizedName] || (values.metadata as any)?.[header.rawName];
    }

    // Deep Meta Pulse Inspection
    if (!val || val === "---" || val === "N/A") {
      const meta = values.metadata || {};
      const fuzzyTarget = getFuzzySignature(header.displayName);
      const matchedKey = Object.keys(meta).find(k => getFuzzySignature(k) === fuzzyTarget);
      if (matchedKey) val = meta[matchedKey];
    }

    const sVal = String(val || '').trim().toLowerCase();
    const isEmpty = !val || sVal === "" || sVal === "---" || sVal === "n/a" || sVal === "nil";

    // Intelligence Override: Vehicles use Chassis/Engine, not standard Serials.
    let isCompleted = !isEmpty;
    
    if (isVehicle) {
      if (header.normalizedName === 'serial_number') {
        const hasChassis = !!values.chassisNo || !!(values.metadata as any)?.['Chassis no'] || !!(values.metadata as any)?.['Chasis no'];
        const hasEngine = !!values.engineNo || !!(values.metadata as any)?.['Engine no'];
        if (hasChassis || hasEngine) isCompleted = true; // Serial is not required if vehicle anchors exist.
      }
    }

    return {
      label: header.displayName,
      completed: isCompleted,
      icon: isVehicle ? Car : Laptop
    };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="space-y-1">
        <h3 className="text-base font-black uppercase tracking-tight text-foreground leading-none">Asset Data Checklist</h3>
        <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-60">Fidelity Guidance Pulse</p>
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
