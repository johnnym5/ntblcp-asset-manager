
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Check, FileText, Loader2, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export interface CategoryBatchUpdateData {
  status?: 'Verified' | 'Unverified';
  hide?: boolean;
}

interface CategoryBatchEditFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedCategoryCount: number;
  onSave: (data: CategoryBatchUpdateData) => Promise<void>;
}

export function CategoryBatchEditForm({
  isOpen,
  onOpenChange,
  selectedCategoryCount,
  onSave,
}: CategoryBatchEditFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.isAdmin || false;

  const [applyStatus, setApplyStatus] = useState(false);
  const [status, setStatus] = useState<'Verified' | 'Unverified'>('Unverified');

  const [applyHide, setApplyHide] = useState(false);

  const handleSubmit = async () => {
    setIsSaving(true);
    const updates: CategoryBatchUpdateData = {};
    if (applyStatus) updates.status = status;
    if (applyHide && isAdmin) updates.hide = true;

    await onSave(updates);
    setIsSaving(false);
    onOpenChange(false);
  };

  const resetForm = () => {
    setApplyStatus(false);
    setStatus('Unverified');
    setApplyHide(false);
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
      resetForm();
    }
    onOpenChange(open);
  }
  
  const canSave = applyStatus || (applyHide && isAdmin);

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Batch Edit Categories</SheetTitle>
          <SheetDescription>
            Apply changes to all assets within the {selectedCategoryCount} selected categories.
          </SheetDescription>
        </SheetHeader>
        <div className="py-6 space-y-6">
          <div className="flex items-center space-x-4">
            <Checkbox id="applyStatus" checked={applyStatus} onCheckedChange={(checked) => setApplyStatus(!!checked)} />
            <div className="w-full space-y-2">
              <Label htmlFor="status" className={!applyStatus ? 'text-muted-foreground' : ''}>Verified Status</Label>
              <Select onValueChange={(value) => setStatus(value as any)} value={status} disabled={!applyStatus}>
                <SelectTrigger id="category-status-select">
                    <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Unverified"><div className="flex items-center"><FileText className="mr-2 h-4 w-4"/>Unverified</div></SelectItem>
                    <SelectItem value="Verified"><div className="flex items-center"><Check className="mr-2 h-4 w-4"/>Verified</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center space-x-4">
                <Checkbox id="applyHide" checked={applyHide} onCheckedChange={(checked) => setApplyHide(!!checked)} />
                <div className="w-full space-y-1">
                    <Label htmlFor="applyHide" className={!applyHide ? 'text-muted-foreground' : ''}>
                        <div className="flex items-center gap-2">
                            <EyeOff className="h-4 w-4" />
                            Hide Selected Sheets
                        </div>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                        This will disable the sheets from being imported or displayed.
                    </p>
                </div>
            </div>
          )}
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
