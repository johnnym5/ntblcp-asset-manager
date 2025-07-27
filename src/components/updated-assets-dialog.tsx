
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import type { Asset } from '@/lib/types';
import { User, MapPin, Clock, FileText, Tag, ShieldCheck, MessageSquare, Check, HelpCircle } from 'lucide-react';
import { getStatusClasses, cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from './ui/badge';
import { Label } from './ui/label';

interface ReadOnlyFieldProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

const ReadOnlyField: React.FC<ReadOnlyFieldProps> = ({ label, value, icon, className }) => (
    <div className={cn("flex items-start gap-2", className)}>
        {icon && <div className="mt-1 text-muted-foreground">{icon}</div>}
        <div className="space-y-1 w-full">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="text-sm bg-muted rounded-md px-3 py-2 min-h-[2.5rem] flex items-center">{value ?? <span className="text-muted-foreground/70">N/A</span>}</p>
        </div>
    </div>
);


interface UpdatedAssetsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  asset: Asset | undefined;
}


export function UpdatedAssetsDialog({ isOpen, onOpenChange, asset }: UpdatedAssetsDialogProps) {
  if (!asset) return null;

  const getStatusInfo = (status?: 'Verified' | 'Unverified' | 'Discrepancy') => {
    switch (status) {
        case 'Verified':
            return { icon: <Check className="h-4 w-4" />, text: 'Verified', className: getStatusClasses(status) };
        case 'Unverified':
            return { icon: <FileText className="h-4 w-4" />, text: 'Unverified', className: getStatusClasses(status) };
        case 'Discrepancy':
             return { icon: <HelpCircle className="h-4 w-4" />, text: 'Discrepancy', className: getStatusClasses(status) };
        default:
            return { icon: <HelpCircle className="h-4 w-4" />, text: 'N/A', className: '' };
    }
  }

  const statusInfo = getStatusInfo(asset.verifiedStatus);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Asset Update Details</DialogTitle>
           <DialogDescription>
            A read-only summary of the asset's state after its last update.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <ReadOnlyField label="Asset Description" value={asset.description} icon={<FileText className="h-4 w-4" />} />
            <ReadOnlyField label="Asset ID Code" value={asset.assetIdCode} icon={<Tag className="h-4 w-4" />} />
            <ReadOnlyField label="Category" value={asset.category} />
            <div className="grid grid-cols-2 gap-4">
                 <ReadOnlyField label="Last Modified By" value={asset.lastModifiedBy} icon={<User className="h-4 w-4" />} />
                 <ReadOnlyField label="User's Location" value={asset.lastModifiedByState} icon={<MapPin className="h-4 w-4" />} />
            </div>
            <ReadOnlyField 
                label="Time of Update" 
                value={asset.lastModified ? formatDistanceToNow(new Date(asset.lastModified), { addSuffix: true }) : 'N/A'} 
                icon={<Clock className="h-4 w-4" />} 
            />
            
            <div className="space-y-2 pt-2">
                <Label className="font-semibold text-sm">Final Status</Label>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                       <ReadOnlyField
                          icon={statusInfo.icon}
                          label="Verification"
                          value={
                            <Badge className={cn("text-xs", statusInfo.className)}>{statusInfo.text}</Badge>
                          }
                        />
                    </div>
                     <ReadOnlyField label="Condition" value={asset.condition} icon={<ShieldCheck className="h-4 w-4" />} />
                </div>
                 <ReadOnlyField label="Remarks / Comments" value={asset.remarks} icon={<MessageSquare className="h-4 w-4" />} />
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
