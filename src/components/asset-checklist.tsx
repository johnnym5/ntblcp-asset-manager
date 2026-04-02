
'use client';

/**
 * @fileOverview AssetChecklist - High-Fidelity Data Quality Monitor.
 * Phase 300: Matches the professional vertical checklist architecture.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, FileText, User, ShieldCheck, ListTree, Hash, MapPin, Building, Tag } from 'lucide-react';
import type { Asset } from '@/types/domain';
import { cn } from '@/lib/utils';

interface AssetChecklistProps {
  values: Partial<Asset>;
}

const ChecklistItem = ({ label, isCompleted, icon: Icon }: { label: string; isCompleted: boolean; icon: any }) => (
  <div className="flex items-center justify-between group transition-all">
    <div className="flex items-center gap-4">
      <div className={cn(
        "p-2 rounded-lg transition-colors",
        isCompleted ? "bg-primary/5 text-primary" : "bg-white/5 text-white/20"
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <span className={cn(
        "text-xs font-black uppercase tracking-tight transition-colors",
        isCompleted ? "text-white" : "text-white/20"
      )}>{label}</span>
    </div>
    <div className="shrink-0">
        {isCompleted ? (
          <div className="h-5 w-5 rounded-full border-2 border-primary flex items-center justify-center bg-primary/10">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          </div>
        ) : (
          <div className="h-5 w-5 rounded-full border-2 border-white/10 flex items-center justify-center">
            <XCircle className="h-3.5 w-3.5 text-red-600/40" />
          </div>
        )}
    </div>
  </div>
);

export function AssetChecklist({ values }: AssetChecklistProps) {
  const requiredItems = [
    { label: 'Category', completed: !!values.category, icon: ListTree },
    { label: 'Asset Description', completed: !!values.description, icon: FileText },
    { label: 'Serial Number', completed: !!values.serialNumber && values.serialNumber !== 'N/A', icon: Hash },
    { label: 'Location', completed: !!values.location, icon: MapPin },
    { label: 'Condition', completed: !!values.condition, icon: ShieldCheck },
  ];

  const importantItems = [
    { label: 'Asset ID Code', completed: !!values.assetIdCode, icon: Tag },
    { label: 'LGA', completed: !!values.lga, icon: MapPin },
    { label: 'Assignee', completed: !!values.custodian, icon: User },
    { label: 'Manufacturer', completed: !!values.manufacturer, icon: Building },
    { label: 'Model Number', completed: !!values.modelNumber, icon: Hash },
    { label: 'Asset Class', completed: !!values.category, icon: ListTree },
    { label: 'Remarks/Notes', completed: !!values.remarks, icon: FileText },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="space-y-2">
        <h3 className="text-3xl font-black uppercase tracking-tight text-white leading-none">Asset Data Checklist</h3>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Fidelity Assurance Pulse</p>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Required Fields</h4>
          <div className="space-y-3">
            {requiredItems.map((item) => (
              <ChecklistItem key={item.label} {...item} />
            ))}
          </div>
        </div>

        <div className="w-full h-px bg-white/5" />

        <div className="space-y-4">
          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Important Fields</h4>
          <div className="space-y-3">
            {importantItems.map((item) => (
              <ChecklistItem key={item.label} {...item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
