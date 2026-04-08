'use client';

/**
 * @fileOverview AssetChecklist - High-Fidelity Data Quality Monitor.
 * Phase 400: Dynamic pulse logic driven by folder-specific templates.
 */

import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  User, 
  ShieldCheck, 
  ListTree, 
  Hash, 
  MapPin, 
  Building, 
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
  const { appSettings } = useAppState();

  // Determine active checklist items based on the folder's template
  const sheetDef = appSettings?.grants
    .find(g => g.id === values.grantId)
    ?.sheetDefinitions[values.category || ''];

  const checklistFields = React.useMemo(() => {
    if (!sheetDef) return [];
    return sheetDef.displayFields.filter(f => f.inChecklist);
  }, [sheetDef]);

  const defaultItems = [
    { label: 'Category', completed: !!values.category, icon: ListTree },
    { label: 'Description', completed: !!values.description, icon: FileText },
    { label: 'Location', completed: !!values.location, icon: MapPin },
  ];

  const templateItems = checklistFields.map(field => ({
    label: field.label,
    completed: !!(values as any)[field.key] && (values as any)[field.key] !== 'N/A',
    icon: Info
  }));

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="space-y-2">
        <h3 className="text-2xl font-black uppercase tracking-tight text-foreground leading-none">Fidelity Checklist</h3>
        <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground opacity-60">Validation pulse per folder template</p>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Required Anchors</h4>
          <div className="space-y-3.5">
            {defaultItems.map((item) => (
              <ChecklistItem key={item.label} {...item} />
            ))}
          </div>
        </div>

        {templateItems.length > 0 && (
          <>
            <div className="w-full h-px bg-border/40" />
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Folder Parameters</h4>
              <div className="space-y-3.5">
                {templateItems.map((item) => (
                  <ChecklistItem key={item.label} {...item} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}