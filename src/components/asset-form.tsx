"use client";

/**
 * @fileOverview AssetForm - Record Detail Workstation.
 * Restricts full editing based on Admin status or user permission.
 */

import React, { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, 
  ShieldCheck,
  Activity,
  Tag,
  Info
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useAppState } from "@/contexts/app-state-context";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ASSET_CONDITIONS } from "@/lib/constants";
import { AssetSchema } from "@/core/registry/validation";
import { AssetChecklist } from "./asset-checklist";
import { Badge } from "./ui/badge";
import { getCanonicalGroup } from "@/lib/condition-logic";
import type { Asset, ConditionAuditEntry } from "@/types/domain";
import { ClassificationEngine } from "@/lib/classification-engine";
import { VALIDATION_GROUPS } from "@/lib/validation-rules";

interface AssetFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: Asset;
  onSave: (assetToSave: Asset) => Promise<void>;
  isReadOnly: boolean;
}

export default function AssetForm({ 
    isOpen, 
    onOpenChange, 
    asset,
    onSave, 
    isReadOnly: externalReadOnly,
}: AssetFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { userProfile } = useAuth();
  const { activeGrantId, appSettings } = useAppState();
  
  const form = useForm<Asset>({
    resolver: zodResolver(AssetSchema),
    mode: 'onChange',
  });

  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const canUserEditFull = !!userProfile?.canEditAssets;
  const isVerificationMode = appSettings?.appMode === 'verification';

  useEffect(() => {
    if (isOpen) {
      if (asset) {
        form.reset(asset);
      } else {
        form.reset({
          id: crypto.randomUUID(),
          grantId: activeGrantId || '',
          status: 'UNVERIFIED',
          condition: 'New',
          conditionGroup: 'Good',
          location: '',
          description: '',
          category: '',
          custodian: 'Unassigned',
          serialNumber: 'N/A',
          lastModified: new Date().toISOString(),
          lastModifiedBy: userProfile?.displayName || 'System User',
          hierarchy: { document: 'Manual', section: 'General', subsection: 'Base Register', assetFamily: 'Uncategorized' },
          importMetadata: { sourceFile: 'MANUAL', sheetName: 'MANUAL', rowNumber: 0, importedAt: new Date().toISOString() },
          metadata: {},
          conditionHistory: [],
          discrepancies: [],
          updateCount: 0
        } as Asset);
      }
    }
  }, [isOpen, asset, form, userProfile, activeGrantId]);

  const onSubmit = async (data: Asset) => {
    setIsSaving(true);
    try {
        const nextGroup = getCanonicalGroup(data.condition);
        const nextAsset = {
            ...data,
            conditionGroup: nextGroup,
            lastModified: new Date().toISOString(),
            lastModifiedBy: userProfile?.displayName || 'System User',
            updateCount: (asset?.updateCount || 0) + 1
        };

        if (asset && asset.condition !== data.condition) {
          const audit: ConditionAuditEntry = {
            oldCondition: asset.condition,
            newCondition: data.condition,
            changedBy: userProfile?.displayName || 'System User',
            timestamp: new Date().toISOString(),
            reason: data.remarks || 'Status Update',
            isBulkAction: false
          };
          nextAsset.conditionHistory = [audit, ...(asset.conditionHistory || [])];
        }

        await onSave(nextAsset);
    } finally {
        setIsSaving(false);
    }
  };

  const formValues = form.watch();
  const activeClassification = useMemo(() => {
    return formValues.classification || (asset ? ClassificationEngine.classify(asset) : null);
  }, [formValues.classification, asset]);

  const isFieldDisabled = (fieldName: string) => {
    if (externalReadOnly) return true;
    if (isAdmin) return false;
    
    // Normal User logic
    const verificationFields = ['status', 'condition', 'remarks'];
    
    // If verification mode is active, allow those fields even if canEditAssets is false
    if (isVerificationMode && verificationFields.includes(fieldName)) return false;
    
    // Otherwise, require specific edit permission
    if (!canUserEditFull) return true;

    // Check specific validation group rules
    if (activeClassification) {
      const rules = VALIDATION_GROUPS[activeClassification.validationGroup] || VALIDATION_GROUPS.unknown;
      if ((rules as any)[fieldName] === 'forbidden') return true;
    }

    return false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px] w-full h-[100dvh] sm:h-[85vh] sm:w-[95vw] p-0 overflow-hidden bg-black text-white border-none sm:border-white/10 sm:rounded-[2.5rem] shadow-3xl">
        <div className="flex flex-col h-full">
          <div className="p-6 sm:p-8 border-b border-white/5 bg-white/[0.02] shrink-0">
            <div className="space-y-1">
              <DialogTitle className="text-xl sm:text-3xl font-black uppercase text-white leading-none">
                {asset ? 'Asset Record' : 'New Record'}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1.5">
                <DialogDescription className="text-[9px] sm:text-xs font-bold text-white/40 uppercase tracking-widest truncate">
                  {asset ? `ID: ${asset.id.split('-')[0]}` : 'Manual Entry'}
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
            <ScrollArea className="flex-1 border-r border-white/5">
              <div className="p-6 sm:p-8 space-y-10 sm:space-y-12 pb-32">
                <Form {...form}>
                  <form id="asset-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 sm:space-y-12">
                    <div className="space-y-6">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                        <Tag className="h-3 w-3" /> Basic Information
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                        <FormField control={form.control} name="description" render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel className="text-[9px] font-black uppercase text-white/40">Description</FormLabel>
                            <FormControl><Input {...field} readOnly={isFieldDisabled('description')} className="h-12 sm:h-14 bg-white/[0.03] border-white/5 rounded-xl font-black text-sm uppercase" /></FormControl>
                          </FormItem>
                        )}/>
                        <FormField control={form.control} name="serialNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black uppercase text-white/40">Serial Number</FormLabel>
                            <FormControl><Input {...field} readOnly={isFieldDisabled('serialNumber')} className="h-12 bg-white/[0.03] border-white/5 rounded-xl text-sm" /></FormControl>
                          </FormItem>
                        )}/>
                        <FormField control={form.control} name="assetIdCode" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black uppercase text-white/40">Asset ID / Tag</FormLabel>
                            <FormControl><Input {...field} readOnly={isFieldDisabled('assetIdCode')} className="h-12 bg-white/[0.03] border-white/5 rounded-xl text-sm" /></FormControl>
                          </FormItem>
                        )}/>
                      </div>
                    </div>

                    <div className="p-6 sm:p-8 rounded-[1.5rem] border-2 border-dashed border-primary/20 bg-primary/[0.02] space-y-8">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                        <Activity className="h-3 w-3" /> Status & Condition
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                        <FormField control={form.control} name="condition" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black uppercase text-white/40">Physical Condition</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isFieldDisabled('condition')}>
                              <FormControl><SelectTrigger className="h-12 sm:h-14 bg-black border-2 border-white/10 rounded-xl font-black text-sm uppercase"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent className="bg-black border-white/10">
                                {ASSET_CONDITIONS.map(c => <SelectItem key={c} value={c} className="text-xs uppercase">{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}/>
                        <FormField control={form.control} name="status" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black uppercase text-white/40">Verification Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isFieldDisabled('status')}>
                              <FormControl><SelectTrigger className="h-12 sm:h-14 bg-black border-2 border-white/10 rounded-xl font-black text-sm uppercase"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent className="bg-black border-white/10">
                                <SelectItem value="VERIFIED" className="text-green-500 font-black">VERIFIED</SelectItem>
                                <SelectItem value="UNVERIFIED" className="font-black">UNVERIFIED</SelectItem>
                                <SelectItem value="DISCREPANCY" className="text-destructive font-black">DISCREPANCY</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}/>
                        <FormField control={form.control} name="remarks" render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel className="text-[9px] font-black uppercase text-white/40">Comments</FormLabel>
                            <FormControl><Textarea {...field} readOnly={isFieldDisabled('remarks')} className="min-h-[100px] bg-black border-2 border-white/10 rounded-2xl p-4 text-xs italic" placeholder="Add any findings or notes..." /></FormControl>
                          </FormItem>
                        )}/>
                      </div>
                    </div>
                  </form>
                </Form>
              </div>
            </ScrollArea>

            <ScrollArea className="w-full md:w-[320px] bg-[#050505] p-6 sm:p-8 shrink-0 border-t md:border-t-0 border-white/5 hidden sm:block">
              <div className="space-y-10">
                <AssetChecklist values={formValues as any} />
                <div className="p-6 rounded-2xl bg-white/[0.02] border-2 border-dashed border-white/10 space-y-4">
                  <div className="flex items-center gap-2 opacity-40 text-[9px] font-black uppercase tracking-widest"><Info className="h-3 w-3" /> Analytics</div>
                  <div className="space-y-2 text-[8px] uppercase">
                    <div className="flex justify-between"><span className="text-white/20">Class</span><span className="text-white/60 font-bold">{activeClassification?.group || 'Other'}</span></div>
                    <div className="flex justify-between"><span className="text-white/20">Quality</span><span className="text-primary font-black">{formValues.overallFidelityScore}%</span></div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          <div className="p-6 sm:p-8 border-t border-white/5 bg-black/80 backdrop-blur-3xl flex items-center justify-between shrink-0 pb-safe">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-12 sm:h-14 font-black uppercase text-[9px] text-white/40 hover:text-white px-10">Discard</Button>
            <Button type="submit" form="asset-form" disabled={isSaving} className="h-12 sm:h-14 px-8 sm:px-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl bg-primary text-black transition-transform active:scale-95">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-3" /> : <ShieldCheck className="h-4 w-4 mr-3" />}
              Save Record
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
