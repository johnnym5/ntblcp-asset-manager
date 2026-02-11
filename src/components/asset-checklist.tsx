'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, FileText, User, ShieldQuestion, ListTree, Hash, MapPin, Building, Tag } from 'lucide-react';
import type { AssetFormValues } from './asset-form';

interface AssetChecklistProps {
  values: Partial<AssetFormValues>;
}

const ChecklistItem = ({ label, isCompleted, icon }: { label: string; isCompleted: boolean; icon: React.ReactNode }) => (
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center gap-2">
      {icon}
      <span>{label}</span>
    </div>
    {isCompleted ? (
      <CheckCircle2 className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-destructive" />
    )}
  </div>
);

export function AssetChecklist({ values }: AssetChecklistProps) {
  const requiredItems = [
    { label: 'Category', completed: !!values.category, icon: <ListTree className="h-4 w-4 text-muted-foreground" /> },
    { label: 'Asset Description', completed: !!values.description, icon: <FileText className="h-4 w-4 text-muted-foreground" /> },
    { label: 'Serial Number', completed: !!values.serialNumber, icon: <Hash className="h-4 w-4 text-muted-foreground" /> },
    { label: 'Location', completed: !!values.location, icon: <MapPin className="h-4 w-4 text-muted-foreground" /> },
    { label: 'Condition', completed: !!values.condition, icon: <ShieldQuestion className="h-4 w-4 text-muted-foreground" /> },
  ];

  const importantItems = [
    { label: 'Asset ID Code', completed: !!values.assetIdCode, icon: <Tag className="h-4 w-4 text-muted-foreground" /> },
    { label: 'LGA', completed: !!values.lga, icon: <MapPin className="h-4 w-4 text-muted-foreground" /> },
    { label: 'Assignee', completed: !!values.assignee, icon: <User className="h-4 w-4 text-muted-foreground" /> },
    { label: 'Manufacturer', completed: !!values.manufacturer, icon: <Building className="h-4 w-4 text-muted-foreground" /> },
    { label: 'Model Number', completed: !!values.modelNumber, icon: <Hash className="h-4 w-4 text-muted-foreground" /> },
    { label: 'Engine Number', completed: !!values.engineNo, icon: <Hash className="h-4 w-4 text-muted-foreground" /> },
    { label: 'Chasis Number', completed: !!values.chasisNo, icon: <Hash className="h-4 w-4 text-muted-foreground" /> },
    { label: 'Asset Class', completed: !!values.assetClass, icon: <ListTree className="h-4 w-4 text-muted-foreground" /> },
    { label: 'Remarks/Notes', completed: !!values.remarks, icon: <FileText className="h-4 w-4 text-muted-foreground" /> },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Data Checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Required Fields</h4>
          <div className="space-y-2">
            {requiredItems.map((item) => (
              <ChecklistItem key={item.label} label={item.label} isCompleted={item.completed} icon={item.icon} />
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-medium mb-2">Important Fields</h4>
          <div className="space-y-2">
            {importantItems.map((item) => (
              <ChecklistItem key={item.label} label={item.label} isCompleted={item.completed} icon={item.icon} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
