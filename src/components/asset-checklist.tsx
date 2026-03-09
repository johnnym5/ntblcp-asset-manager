'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, FileText, User, ShieldQuestion, ListTree, Hash, MapPin, Building, Tag, Settings2 } from 'lucide-react';
import type { AssetFormValues } from './asset-form';
import type { DisplayField } from '@/lib/types';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

interface AssetChecklistProps {
  values: Partial<AssetFormValues>;
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
  <div className="flex items-center justify-between text-sm py-1">
    <div className="flex items-center gap-2 min-w-0">
      <div className="shrink-0">{icon}</div>
      <span className="truncate" title={label}>{label}</span>
    </div>
    <div className="shrink-0 ml-2">
        {isCompleted ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
        <XCircle className="h-4 w-4 text-destructive" />
        )}
    </div>
  </div>
);

export function AssetChecklist({ values, displayFields = [], isAdmin, onEdit }: AssetChecklistProps) {
  // Use display fields if provided, otherwise fallback to empty list
  const checklistFields = displayFields.filter(f => f.inChecklist);
  
  const requiredItems = checklistFields
    .filter(f => f.checklistSection === 'required')
    .map(f => ({ label: f.label, completed: !!values[f.key as keyof AssetFormValues], icon: getFieldIcon(f.key) }));

  const importantItems = checklistFields
    .filter(f => f.checklistSection === 'important' || !f.checklistSection)
    .map(f => ({ label: f.label, completed: !!values[f.key as keyof AssetFormValues], icon: getFieldIcon(f.key) }));

  // Fallback for empty definitions (legacy or brand new sheets)
  const hasFields = requiredItems.length > 0 || importantItems.length > 0;

  return (
    <Card className="shadow-none border-none bg-transparent">
      <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg font-bold">Asset Data Checklist</CardTitle>
        {isAdmin && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onEdit} title="Configure Checklist">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
            </Button>
        )}
      </CardHeader>
      <CardContent className="p-0 space-y-6">
        {!hasFields ? (
            <div className="p-4 border border-dashed rounded-lg text-center bg-muted/30">
                <p className="text-xs text-muted-foreground italic">No fields configured for this checklist. {isAdmin ? 'Click the gear icon to manage fields.' : ''}</p>
            </div>
        ) : (
            <>
                {requiredItems.length > 0 && (
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Required Fields</h4>
                        <div className="space-y-1">
                            {requiredItems.map((item) => (
                            <ChecklistItem key={item.label} label={item.label} isCompleted={item.completed} icon={item.icon} />
                            ))}
                        </div>
                    </div>
                )}
                {importantItems.length > 0 && (
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Important Fields</h4>
                        <div className="space-y-1">
                            {importantItems.map((item) => (
                            <ChecklistItem key={item.label} label={item.label} isCompleted={item.completed} icon={item.icon} />
                            ))}
                        </div>
                    </div>
                )}
            </>
        )}
      </CardContent>
    </Card>
  );
}
