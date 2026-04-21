'use client';

/**
 * @fileOverview AssetDataChecklist - Template-Driven Fidelity Pulse.
 * Automatically tracks completion based on the folder's configured schema.
 * Phase 1211: Fixed duplicate key prop warning by destructuring identifier.
 */

import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Tag,
  Car,
  Laptop,
  Database
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
        "text-[10px] font-black uppercase tracking-tight transition-colors truncate max-w-[180px]",
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
  const { appSettings } = useAppState();

  const activeTemplate = React.useMemo(() => {
    if (!values.category || !appSettings) return null;
    const grant = appSettings.grants.find(g => 
      Object.keys(g.sheetDefinitions).some(k => getFuzzySignature(k) === getFuzzySignature(values.category))
    );
    if (!grant) return null;
    const defKey = Object.keys(grant.sheetDefinitions).find(k => getFuzzySignature(k) === getFuzzySignature(values.category));
    return defKey ? grant.sheetDefinitions[defKey] : null;
  }, [values.category, appSettings]);

  const checklistItems = React.useMemo(() => {
    if (!activeTemplate) return [];

    const isVehicle = (values.category || '').toLowerCase().includes('motor') || (values.category || '').toLowerCase().includes('vehicle');

    return activeTemplate.displayFields
      .filter(f => f.inChecklist)
      .map((field, idx) => {
        const fieldName = field.key as keyof Asset;
        let val: any = undefined;

        if (fieldName in values) {
          val = (values as any)[fieldName];
        } else {
          val = (values.metadata as any)?.[field.label];
        }

        const isEmpty = !val || String(val).trim() === '' || String(val).trim().toLowerCase() === 'n/a' || String(val).trim().toLowerCase() === '---';
        
        let isCompleted = !isEmpty;
        if (isVehicle && field.key === 'serialNumber') {
          const hasChassis = !!values.chassisNo || !!(values.metadata as any)?.['Chasis no'] || !!(values.metadata as any)?.['Chassis no'];
          const hasEngine = !!values.engineNo || !!(values.metadata as any)?.['Engine no'];
          if (hasChassis || hasEngine) isCompleted = true;
        }

        return {
          id: `check-${field.key}-${idx}`,
          label: field.label,
          isCompleted,
          icon: isVehicle ? Car : Laptop
        };
      });
  }, [activeTemplate, values]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="space-y-1">
        <h3 className="text-base font-black uppercase tracking-tight text-foreground leading-none">Record Fidelity</h3>
        <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-60">FOLDER-SPECIFIC PULSE</p>
      </div>

      <div className="space-y-3">
        {checklistItems.length > 0 ? (
          checklistItems.map(({ id, ...itemProps }) => (
            <ChecklistItem key={id} {...itemProps} />
          ))
        ) : (
          <div className="py-10 rounded-2xl border-2 border-dashed border-border/40 text-center flex flex-col items-center gap-3">
            <Database className="h-6 w-6 opacity-20" />
            <p className="text-[8px] font-black uppercase text-muted-foreground opacity-40 italic">Zero checklist markers<br/>configured for this folder</p>
          </div>
        )}
      </div>
    </div>
  );
}
