
"use client";

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Check, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export interface BatchUpdateData {
  location?: string;
  assignee?: string;
  condition?: string;
  verifiedStatus?: 'Verified' | 'Unverified' | 'Discrepancy';
}

interface AssetBatchEditFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedAssetCount: number;
  onSave: (data: BatchUpdateData) => Promise<void>;
}

export function AssetBatchEditForm({
  isOpen,
  onOpenChange,
  selectedAssetCount,
  onSave,
}: AssetBatchEditFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.displayName?.toLowerCase().trim() === 'admin';

  const [applyLocation, setApplyLocation] = useState(false);
  const [location, setLocation] = useState('');

  const [applyAssignee, setApplyAssignee] = useState(false);
  const [assignee, setAssignee] = useState('');

  const [applyCondition, setApplyCondition] = useState(false);
  const [condition, setCondition] = useState('');

  const [applyStatus, setApplyStatus] = useState(false);
  const [status, setStatus] = useState<'Verified' | 'Unverified' | 'Discrepancy'>('Unverified');

  const handleSubmit = async () => {
    setIsSaving(true);
    const updates: BatchUpdateData = {};
    if (applyLocation && isAdmin) updates.location = location;
    if (applyAssignee) updates.assignee = assignee;
    if (applyCondition) updates.condition = condition;
    if (applyStatus) updates.verifiedStatus = status;

    await onSave(updates);
    setIsSaving(false);
    onOpenChange(false);
  };

  const resetForm = () => {
    setApplyLocation(false);
    setLocation('');
    setApplyAssignee(false);
    setAssignee('');
    setApplyCondition(false);
    setCondition('');
    setApplyStatus(false);
    setStatus('Unverified');
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
      resetForm();
    }
    onOpenChange(open);
  }
  
  const canSave = (applyLocation && isAdmin) || applyAssignee || applyCondition || applyStatus;

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Batch Edit Assets</SheetTitle>
          <SheetDescription>
            Apply changes to {selectedAssetCount} selected assets. Check the box next to a field to update it.
          </SheetDescription>
        </SheetHeader>
        <div className="py-6 space-y-6">
          <div className="flex items-center space-x-4">
            <Checkbox id="applyLocation" checked={applyLocation} onCheckedChange={(checked) => setApplyLocation(!!checked)} disabled={!isAdmin} />
            <div className="w-full space-y-2">
              <Label htmlFor="location" className={!applyLocation || !isAdmin ? 'text-muted-foreground' : ''}>Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} disabled={!applyLocation || !isAdmin} />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Checkbox id="applyAssignee" checked={applyAssignee} onCheckedChange={(checked) => setApplyAssignee(!!checked)} />
            <div className="w-full space-y-2">
              <Label htmlFor="assignee" className={!applyAssignee ? 'text-muted-foreground' : ''}>Assignee</Label>
              <Input id="assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} disabled={!applyAssignee} />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Checkbox id="applyCondition" checked={applyCondition} onCheckedChange={(checked) => setApplyCondition(!!checked)} />
            <div className="w-full space-y-2">
              <Label htmlFor="condition" className={!applyCondition ? 'text-muted-foreground' : ''}>Condition</Label>
              <Input id="condition" value={condition} onChange={(e) => setCondition(e.target.value)} disabled={!applyCondition} />
            </div>
          </div>
           <div className="flex items-center space-x-4">
            <Checkbox id="applyStatus" checked={applyStatus} onCheckedChange={(checked) => setApplyStatus(!!checked)} />
            <div className="w-full space-y-2">
              <Label htmlFor="status" className={!applyStatus ? 'text-muted-foreground' : ''}>Verified Status</Label>
               <Select onValueChange={(value) => setStatus(value as any)} value={status} disabled={!applyStatus}>
                <SelectTrigger id="quick-view-status">
                    <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Unverified"><div className="flex items-center"><FileText className="mr-2 h-4 w-4"/>Unverified</div></SelectItem>
                    <SelectItem value="Verified"><div className="flex items-center"><Check className="mr-2 h-4 w-4"/>Verified</div></SelectItem>
                    <SelectItem value="Discrepancy"><div className="flex items-center"><AlertCircle className="mr-2 h-4 w-4"/>Discrepancy</div></SelectItem>
                </SelectContent>
            </Select>
            </div>
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <Button onClick={handleSubmit} disabled={isSaving || !canSave}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
