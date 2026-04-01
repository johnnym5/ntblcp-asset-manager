'use client';

/**
 * @fileOverview AssetChecklist - High-Fidelity Data Quality Monitor.
 * Phase 130: Respects Schema Orchestrator toggles for checklist visibility.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, FileText, User, ShieldQuestion, ListTree, Hash, MapPin, Building, Tag, Settings2 } from 'lucide-react';
import type { Asset } from '@/types/domain';
import type { DisplayField } from '@/types/domain';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

interface AssetChecklistProps {
  values: Partial<Asset>;
  displayFields?: DisplayField[];
  isAdmin?: boolean;
  onEdit?: () => void;
}

const getFieldIcon = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes('category') || k.includes('class')) return <ListTree className="h-4 w-4 text-muted-foreground" />;
    if (k.includes('sn') || k.includes('serial') || k.includes('model') || k.includes('engine') || k.includes('chasis')) return <Hash className="h-4 w-4 text-muted-foreground" />;
    if (k.includes('location') || k.includes('state') || k.includes('lga') || k.includes('site')) return <MapPin className="h-4 w-4 text-muted-foreground" />;
    if (k.includes('assignee') || k.includes('user')) return <User className="h-4 w-4 text-muted-foreground" />;
    if (k.includes('condition')) return <ShieldQuestion className="h-4 w-4 text-muted-foreground" />;
    if (k.includes('id') || k.includes('tag')) return <Tag className="h-4 w-4 text-muted-foreground" />;
    if (k.includes('manufacturer') || k.includes('supplier') || k.includes('building')) return <Building className="h-4 w-4 text-muted-foreground" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
};

const ChecklistItem = ({ label, isCompleted, icon }: { label: string; isCompleted: boolean; icon: React.ReactNode }) => (
  <div className="flex items-center justify-between text-sm py-2 px-3 rounded-xl border border-transparent hover:bg-muted/30 transition-colors">
    <div className="flex items-center gap-3 min-w-0">
      <div className="shrink-0 opacity-40">{icon}</div>
      <span className="truncate font-bold uppercase text-[10px] tracking-tight opacity-70" title={label}>{label}</span>
    </div>
    <div className="shrink-0 ml-2">
        {isCompleted ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
        <XCircle className="h-4 w-4 text-destructive/40" />
        )}
    </div>
  </div>
);

export function AssetChecklist({ values, displayFields = [], isAdmin, onEdit }: AssetChecklistProps) {
  // Use display fields marked for checklist in the editor
  const checklistFields = displayFields.filter(f => f.inChecklist || f.table); // Default to table fields if checklist is empty
  
  const items = checklistFields.map(f => ({ 
    label: f.label, 
    completed: !!(values as any)[f.key], 
    icon: getFieldIcon(f.key) 
  }));

  const hasFields = items.length > 0;

  return (
    <Card className="shadow-none border-none bg-transparent">
      <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between space-y-0">
        <div className="space-y-0.5">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-primary">Data Fidelity Checklist</CardTitle>
          <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">Deterministic required fields pulse.</p>
        </div>
        {isAdmin && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-muted/20" onClick={onEdit} title="Configure Checklist">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
            </Button>
        )}
      </CardHeader>
      <CardContent className="p-0 space-y-1">
        {!hasFields ? (
            <div className="p-6 border-2 border-dashed rounded-[1.5rem] text-center bg-muted/10 opacity-40">
                <p className="text-[10px] font-bold uppercase tracking-tighter">No fields configured.</p>
            </div>
        ) : (
            <div className="space-y-1 bg-muted/10 rounded-[1.5rem] p-2 border border-border/40">
                {items.map((item) => (
                  <ChecklistItem key={item.label} label={item.label} isCompleted={item.completed} icon={item.icon} />
                ))}
            </div>
        )}
      </CardContent>
    </Card>
  );
}
