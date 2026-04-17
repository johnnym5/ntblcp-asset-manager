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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Check, FileText, Loader2, ShieldQuestion, Type } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { cn, getStatusClasses } from '@/lib/utils';
import { ASSET_CONDITIONS } from '@/lib/constants';

export interface CategoryBatchUpdateData {
  status?: 'Verified' | 'Unverified';
  condition?: string;
  description?: string;
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

  const [applyCondition, setApplyCondition] = useState(false);
  const [condition, setCondition] = useState('');

  const [applyDescription, setApplyDescription] = useState(false);
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    setIsSaving(true);
    const updates: CategoryBatchUpdateData = {};
    if (applyStatus) updates.status = status;
    if (applyCondition) updates.condition = condition;
    if (applyDescription) updates.description = description;

    await onSave(updates);
    setIsSaving(false);
    onOpenChange(false);
  };

  const resetForm = () => {
    setApplyStatus(false);
    setStatus('Unverified');
    setApplyCondition(false);
    setCondition('');
    setApplyDescription(false);
    setDescription('');
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
      resetForm();
    }
    onOpenChange(open);
  }
  
  const canSave = applyStatus || applyCondition || applyDescription;

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-xl border-primary/10 bg-background rounded-l-[2.5rem] shadow-2xl">
        <SheetHeader className="pb-6 border-b border-white/5">
          <SheetTitle className="text-2xl font-black uppercase tracking-tight">Folder Batch Edit</SheetTitle>
          <SheetDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
            Applying modifications to all assets in {selectedCategoryCount} selected folders.
          </SheetDescription>
        </SheetHeader>
        <div className="py-8 space-y-8">
          <div className="flex items-start space-x-4 p-4 rounded-2xl bg-muted/20 border-2 border-transparent hover:border-primary/20 transition-all">
            <Checkbox id="applyDesc" checked={applyDescription} onCheckedChange={(checked) => setApplyDescription(!!checked)} className="mt-1" />
            <div className="w-full space-y-2">
              <Label htmlFor="description" className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-2", !applyDescription && 'opacity-40')}>
                <Type className="h-3 w-3" /> Asset Description (Global)
              </Label>
              <Input 
                id="description" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                disabled={!applyDescription} 
                placeholder="Overwrite all descriptions in selection..."
                className="h-12 bg-background border-2 font-bold text-xs"
              />
            </div>
          </div>

          <div className="flex items-start space-x-4 p-4 rounded-2xl bg-muted/20 border-2 border-transparent hover:border-primary/20 transition-all">
            <Checkbox id="applyStatus" checked={applyStatus} onCheckedChange={(checked) => setApplyStatus(!!checked)} className="mt-1" />
            <div className="w-full space-y-2">
              <Label htmlFor="status" className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-2", !applyStatus && 'opacity-40')}>
                <FileText className="h-3 w-3" /> Verified Status
              </Label>
              <Select onValueChange={(value) => setStatus(value as any)} value={status} disabled={!applyStatus}>
                <SelectTrigger id="category-status-select" className={cn("h-12 bg-background border-2 font-black text-[10px] uppercase", getStatusClasses(status))}>
                    <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                    <SelectItem value="Unverified" className="text-[10px] font-black uppercase">Unverified</SelectItem>
                    <SelectItem value="Verified" className="text-[10px] font-black uppercase">Verified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-start space-x-4 p-4 rounded-2xl bg-muted/20 border-2 border-transparent hover:border-primary/20 transition-all">
            <Checkbox id="applyCondition" checked={applyCondition} onCheckedChange={(checked) => setApplyCondition(!!checked)} className="mt-1" />
            <div className="w-full space-y-2">
              <Label htmlFor="condition" className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-2", !applyCondition && 'opacity-40')}>
                <ShieldQuestion className="h-3 w-3" /> Physical Condition
              </Label>
              <Select onValueChange={setCondition} value={condition} disabled={!applyCondition}>
                <SelectTrigger id="category-condition-select" className="h-12 bg-background border-2 font-black text-[10px] uppercase">
                    <SelectValue placeholder="Select condition..." />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                    {ASSET_CONDITIONS.map(cond => (
                        <SelectItem key={cond} value={cond} className="text-[9px] font-bold uppercase">{cond}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <SheetFooter className="pt-6 border-t border-white/5">
          <SheetClose asChild>
            <Button variant="ghost" className="font-bold uppercase text-[10px] tracking-widest">Abort</Button>
          </SheetClose>
          <Button onClick={handleSubmit} disabled={isSaving || !canSave} className="h-14 px-10 rounded-2xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Apply Global Pulse
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
