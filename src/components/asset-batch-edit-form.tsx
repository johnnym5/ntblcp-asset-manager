"use client";

/**
 * @fileOverview Enterprise Batch Edit Workstation.
 * Optimized for high-density bulk operations across the project register.
 */

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
import { 
  Check, 
  FileText, 
  Loader2, 
  MapPin, 
  ShieldCheck, 
  User, 
  Activity,
  ArrowRightLeft,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import { cn } from '@/lib/utils';
import { ASSET_CONDITIONS } from '@/lib/constants';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';

export interface BatchUpdateData {
  location?: string;
  custodian?: string;
  condition?: string;
  status?: 'VERIFIED' | 'UNVERIFIED' | 'DISCREPANCY';
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
  const { appSettings } = useAppState();
  
  const isAdmin = userProfile?.isAdmin || false;

  // Field Selection States
  const [applyLocation, setApplyLocation] = useState(false);
  const [location, setLocation] = useState('');

  const [applyCustodian, setApplyCustodian] = useState(false);
  const [custodian, setCustodian] = useState('');

  const [applyCondition, setApplyCondition] = useState(false);
  const [condition, setCondition] = useState('');

  const [applyStatus, setApplyStatus] = useState(false);
  const [status, setStatus] = useState<'VERIFIED' | 'UNVERIFIED' | 'DISCREPANCY'>('UNVERIFIED');

  const handleSubmit = async () => {
    setIsSaving(true);
    const updates: BatchUpdateData = {};
    if (applyLocation && isAdmin) updates.location = location;
    if (applyCustodian) updates.custodian = custodian;
    if (applyCondition) updates.condition = condition;
    if (applyStatus) updates.status = status;

    try {
      await onSave(updates);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setApplyLocation(false);
    setLocation('');
    setApplyCustodian(false);
    setCustodian('');
    setApplyCondition(false);
    setCondition('');
    setApplyStatus(false);
    setStatus('UNVERIFIED');
  };

  const handleOpenChange = (open: boolean) => {
    if (open) resetForm();
    onOpenChange(open);
  };
  
  const canSave = (applyLocation && isAdmin) || applyCustodian || applyCondition || applyStatus;

  const FieldPulse = ({ 
    id, 
    label, 
    isActive, 
    onToggle, 
    disabled, 
    icon: Icon,
    children 
  }: { 
    id: string; 
    label: string; 
    isActive: boolean; 
    onToggle: (v: boolean) => void;
    disabled?: boolean;
    icon: any;
    children: React.ReactNode;
  }) => (
    <div className={cn(
      "p-5 rounded-3xl border-2 transition-all duration-300",
      isActive ? "border-primary bg-primary/5 shadow-xl shadow-primary/5" : "border-border/40 bg-card/50",
      disabled && "opacity-40 grayscale"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-xl", isActive ? "bg-primary text-white" : "bg-muted")}>
            <Icon className="h-4 w-4" />
          </div>
          <Label htmlFor={id} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</Label>
        </div>
        <Checkbox 
          id={id} 
          checked={isActive} 
          onCheckedChange={(v) => !disabled && onToggle(!!v)} 
          disabled={disabled}
          className="h-5 w-5 rounded-lg border-2"
        />
      </div>
      <div className={cn("transition-all duration-300", isActive ? "opacity-100 translate-y-0" : "opacity-40 pointer-events-none")}>
        {children}
      </div>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 border-primary/10 bg-background rounded-l-[2.5rem] shadow-2xl overflow-hidden">
        <div className="p-8 pb-4 bg-muted/20 border-b">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3 text-3xl font-black tracking-tight uppercase">
              <div className="p-2 bg-primary/10 rounded-xl">
                <ArrowRightLeft className="text-primary h-6 w-6" />
              </div>
              Bulk Edit Pulse
            </SheetTitle>
            <SheetDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
              Broadcasting modifications to {selectedAssetCount} selected records.
            </SheetDescription>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 bg-background">
          <div className="p-8 space-y-6">
            <FieldPulse id="loc" label="Regional Scope" isActive={applyLocation} onToggle={setApplyLocation} disabled={!isAdmin} icon={MapPin}>
              <Input 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                placeholder="Enter target location..."
                className="h-12 rounded-xl bg-background border-2 focus-visible:ring-primary/20 font-bold text-xs" 
              />
            </FieldPulse>

            <FieldPulse id="cust" label="Custodian / Assignee" isActive={applyCustodian} onToggle={setApplyCustodian} icon={User}>
              <Input 
                value={custodian} 
                onChange={(e) => setCustodian(e.target.value)} 
                placeholder="Enter new assignee..."
                className="h-12 rounded-xl bg-background border-2 focus-visible:ring-primary/20 font-bold text-xs" 
              />
            </FieldPulse>

            <FieldPulse id="cond" label="Condition Assessment" isActive={applyCondition} onToggle={setApplyCondition} icon={Activity}>
              <Select onValueChange={setCondition} value={condition}>
                <SelectTrigger className="h-12 rounded-xl bg-background border-2 focus:ring-primary/20 font-bold text-xs">
                  <SelectValue placeholder="Select condition..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {ASSET_CONDITIONS.map(cond => <SelectItem key={cond} value={cond} className="text-xs font-bold">{cond}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldPulse>

            <FieldPulse id="stat" label="Verification Pulse" isActive={applyStatus} onToggle={setApplyStatus} icon={ShieldCheck}>
              <Select onValueChange={(v) => setStatus(v as any)} value={status}>
                <SelectTrigger className="h-12 rounded-xl bg-background border-2 focus:ring-primary/20 font-black text-[10px] uppercase tracking-widest">
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="UNVERIFIED" className="text-[10px] font-black uppercase tracking-widest">UNVERIFIED</SelectItem>
                  <SelectItem value="VERIFIED" className="text-[10px] font-black uppercase tracking-widest">VERIFIED</SelectItem>
                  <SelectItem value="DISCREPANCY" className="text-[10px] font-black uppercase tracking-widest">DISCREPANCY</SelectItem>
                </SelectContent>
              </Select>
            </FieldPulse>
          </div>
        </ScrollArea>

        <SheetFooter className="p-8 bg-muted/20 border-t flex flex-row items-center gap-3">
          <SheetClose asChild>
            <Button variant="ghost" className="flex-1 h-12 font-bold rounded-2xl">Discard Action</Button>
          </SheetClose>
          <Button 
            onClick={handleSubmit} 
            disabled={isSaving || !canSave} 
            className="flex-1 h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-primary text-primary-foreground"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Apply Logic Pulse
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
