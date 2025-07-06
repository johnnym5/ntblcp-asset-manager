'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, FileText, User, Camera, ShieldQuestion } from 'lucide-react';
import type { AssetFormValues } from './asset-form';

interface AssetChecklistProps {
  values: Partial<AssetFormValues>;
  photoUrl?: string | null;
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

export function AssetChecklist({ values, photoUrl }: AssetChecklistProps) {
  const isPhotoProvided = photoUrl && !photoUrl.includes('placehold.co');

  const requiredItems = [
    { label: 'Asset Name', completed: !!values.assetName, icon: <FileText className="h-4 w-4 text-muted-foreground" /> },
    { label: 'Serial Number', completed: !!values.serialNumber, icon: <FileText className="h-4 w-4 text-muted-foreground" /> },
    { label: 'Location', completed: !!values.location, icon: <FileText className="h-4 w-4 text-muted-foreground" /> },
    { label: 'Status', completed: !!values.status, icon: <FileText className="h-4 w-4 text-muted-foreground" /> },
  ];

  const optionalItems = [
    { label: 'Photo', completed: isPhotoProvided, icon: <Camera className="h-4 w-4 text-muted-foreground" /> },
    { label: 'Assigned To', completed: !!values.assignedTo, icon: <User className="h-4 w-4 text-muted-foreground" /> },
    { label: 'Condition', completed: !!values.condition, icon: <ShieldQuestion className="h-4 w-4 text-muted-foreground" /> },
    { label: 'Documents/Notes', completed: !!values.notes, icon: <FileText className="h-4 w-4 text-muted-foreground" /> },
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
          <h4 className="font-medium mb-2">Optional Fields</h4>
          <div className="space-y-2">
            {optionalItems.map((item) => (
              <ChecklistItem key={item.label} label={item.label} isCompleted={item.completed} icon={item.icon} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
