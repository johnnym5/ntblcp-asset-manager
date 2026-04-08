"use client";

/**
 * @fileOverview AssetForm - Condition & Audit Workstation.
 * Hardened for responsive multi-column layouts and high-speed touch input.
 * Phase 401: Strict gating for verification fields based on appMode.
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
  X,
  ShieldCheck,
  History,
  Activity,
  Tag,
  ChevronRight,
  RotateCcw,
  Info,
  AlertTriangle,
  CheckCircle2,
  ThumbsUp,
  Ban,
  Zap,
  LayoutGrid
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useAppState } from "@/contexts/app-state-context";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ASSET_CONDITIONS } from "@/lib/constants";
import { AssetSchema } from "@/core/registry/validation";
import { AssetChecklist } from "./asset-checklist";
import { Badge } from "./ui/badge";
import { getCanonicalGroup, GROUP_COLORS } from "@/lib/condition-logic";
import type { Asset, ConditionAuditEntry, AssetDiscrepancy, DiscrepancyStatus, ValidationGroup } from "@/types/domain";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ClassificationEngine } from "@/lib/classification-engine";
import { VALIDATION_GROUPS, type CategoryValidationRules } from "@/lib/validation-rules";

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
  const { activeGrantId, appSettings, refreshRegistry } = useAppState();
  const { toast } = useToast();
  
  const form = useForm<Asset>({
    resolver: zodResolver(AssetSchema),
    mode: 'onChange',
  });

  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const isVerificationMode = appSettings?.appMode === 'verification';
  const isManagementMode = appSettings?.appMode === 'management';

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
          lastModifiedBy: userProfile?.displayName || 'Unknown',
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
            lastModifiedBy: userProfile?.displayName || 'Unknown',
            updateCount: (asset?.updateCount || 0) + 1
        };

        if (asset && asset.condition !== data.condition) {
          const audit: ConditionAuditEntry = {
            oldCondition: asset.condition,
            newCondition: data.condition,
            changedBy: userProfile?.displayName || 'Unknown',
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

  const handleResolveDiscrepancy = async (discrepancyId: string, status: DiscrepancyStatus, newValue?: any) => {
    if (!asset) return;
    const discrepancies = form.getValues('discrepancies') || [];
    const target = discrepancies.find(d => d.id === discrepancyId);
    if (!target) return;

    if (newValue !== undefined) {
      form.setValue(target.field as any, newValue);
    }

    const nextDiscrepancies = discrepancies.map(d => 
      d.id === discrepancyId ? { ...d, status } : d
    );
    
    form.setValue('discrepancies', nextDiscrepancies);
    toast({ title: `Suggestion ${status === 'RESOLVED' ? 'Applied' : 'Ignored'}` });
  };

  const formValues = form.watch();

  const activeClassification = useMemo(() => {
    return formValues.classification || (asset ? ClassificationEngine.classify(asset) : null);
  }, [formValues.classification, asset]);

  const fieldRules = useMemo(() => {
    if (!activeClassification) return VALIDATION_GROUPS.unknown;
    return VALIDATION_GROUPS[activeClassification.validationGroup] || VALIDATION_GROUPS.unknown;
  }, [activeClassification]);

  const isFieldDisabled = (fieldName: string) => {
    if (externalReadOnly) return true;
    if (isAdmin) return false;
    
    // Gating Pulse: If not in verification mode, lock assessment fields for non-admins
    const verificationFields = ['status', 'condition', 'remarks'];
    if (!isVerificationMode && verificationFields.includes(fieldName)) return true;
    
    // Management Lock: If in management mode, standard users can't edit identity markers
    if (isManagementMode && !verificationFields.includes(fieldName)) return true;

    if ((fieldRules as any)[fieldName] === 'forbidden') return true;
    return false;
  };

  const isFieldVisible = (fieldName: string) => {
    const rule = (fieldRules as any)[fieldName];
    return rule !== 'not_applicable';
  };

  const getDiscrepancyForField = (fieldName: string) => {
    return (formValues.discrepancies || []).find(d => d.field === fieldName && (d.status === 'PENDING' || d.status === 'SUSPICIOUS'));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px] w-full h-[100dvh] sm:h-[85vh] sm:w-[95vw] p-0 overflow-hidden bg-black text-white border-none sm:border-white/10 sm:rounded-[2.5rem] shadow-3xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-white/5 bg-white/[0.02] shrink-0">
            <div className="space-y-1">
              <DialogTitle className="text-xl sm:text-3xl font-black uppercase text-white leading-none">
                {asset ? 'Registry Profile' : 'New Identity Pulse'}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1.5">
                <DialogDescription className="text-[9px] sm:text-xs font-bold text-white/40 uppercase tracking-widest">
                  {asset ? `ID: ${asset.id.split('-')[0]}` : 'System Ingestion'}
                </DialogDescription>
                {activeClassification && (
                  <Badge variant="outline" className="h-5 px-2 border-primary/20 text-primary text-[7px] sm:text-[8px] font-black uppercase">
                    {activeClassification.validationGroup}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
            <ScrollArea className="flex-1 border-r border-white/5">
              <div className="p-6 sm:p-8 space-y-10 sm:space-y-12 pb-32">
                
                {/* Anomaly Banner */}
                {formValues.discrepancies?.some(d => d.status === 'PENDING' || d.status === 'SUSPICIOUS') && (
                  <div className="p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] bg-red-600/10 border-2 border-dashed border-red-600/20 flex flex-col sm:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-4 sm:gap-5">
                      <div className="p-2.5 sm:p-3 bg-red-600/20 rounded-xl sm:rounded-2xl shadow-inner shrink-0"><AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" /></div>
                      <div className="space-y-1">
                        <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white">Heuristic Alert</h4>
                        <p className="text-[9px] sm:text-[10px] font-medium text-white/40 italic">Data deviates from category rules or registry patterns.</p>
                      </div>
                    </div>
                    <Badge className="bg-red-600 h-7 sm:h-8 px-4 font-black uppercase text-[8px] sm:text-[9px] tracking-widest whitespace-nowrap">Review Required</Badge>
                  </div>
                )}

                <Form {...form}>
                  <form id="asset-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 sm:space-y-12">
                    
                    {/* Identity Group */}
                    <div className="space-y-6">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                        <Tag className="h-3 w-3" /> Identity Markers
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                        <FormField control={form.control} name="description" render={({ field }) => {
                          const discrepancy = getDiscrepancyForField('description');
                          return (
                            <FormItem className="sm:col-span-2">
                              <div className="flex items-center justify-between">
                                <FormLabel className="text-[9px] font-black uppercase text-white/40">Asset Description</FormLabel>
                                {discrepancy && <Badge variant="outline" className="h-4 px-1.5 text-[6px] font-black uppercase text-red-500 border-red-500/20">Anomalous</Badge>}
                              </div>
                              <FormControl>
                                <Input {...field} readOnly={isFieldDisabled('description')} className={cn("h-12 sm:h-14 bg-white/[0.03] border-2 rounded-xl font-black text-sm uppercase transition-all", discrepancy ? "border-red-600 animate-field-pulse" : "border-white/5")} />
                              </FormControl>
                            </FormItem>
                          );
                        }}/>
                        
                        {isFieldVisible('serialNumber') && (
                          <FormField control={form.control} name="serialNumber" render={({ field }) => {
                            const discrepancy = getDiscrepancyForField('serialNumber');
                            return (
                              <FormItem>
                                <FormLabel className="text-[9px] font-black uppercase text-white/40">Serial Number</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input {...field} readOnly={isFieldDisabled('serialNumber')} className={cn("h-12 bg-white/[0.03] border-2 rounded-xl text-sm transition-all", discrepancy ? "border-red-600 animate-field-pulse" : "border-white/5")} />
                                    {discrepancy && (
                                      <div className="absolute top-1/2 -right-10 -translate-y-1/2 flex gap-1">
                                        {discrepancy.suggestedValue && <Button type="button" onClick={() => handleResolveDiscrepancy(discrepancy.id, 'RESOLVED', discrepancy.suggestedValue)} size="icon" className="h-7 w-7 rounded-lg bg-blue-600"><Zap className="h-3.5 w-3.5" /></Button>}
                                        <Button type="button" onClick={() => handleResolveDiscrepancy(discrepancy.id, 'IGNORED')} size="icon" className="h-7 w-7 rounded-lg bg-white/10 text-white/40"><X className="h-3.5 w-3.5" /></Button>
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                              </FormItem>
                            );
                          }}/>
                        )}

                        <FormField control={form.control} name="assetIdCode" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black uppercase text-white/40">Internal Tag ID</FormLabel>
                            <FormControl><Input {...field} readOnly={isFieldDisabled('assetIdCode')} className="h-12 bg-white/[0.03] border-white/5 rounded-xl text-sm" /></FormControl>
                          </FormItem>
                        )}/>
                      </div>
                    </div>

                    {/* Audit Group */}
                    <div className="p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-dashed border-primary/20 bg-primary/[0.02] space-y-8">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                          <Activity className="h-3 w-3" /> Audit Pulse
                        </h4>
                        <Badge variant="outline" className={cn("font-black uppercase text-[8px] px-3 h-6 border-2", GROUP_COLORS[getCanonicalGroup(formValues.condition)])}>
                          {getCanonicalGroup(formValues.condition)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                        <FormField control={form.control} name="condition" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black uppercase text-white/40">Physical State</FormLabel>
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
                            <FormLabel className="text-[9px] font-black uppercase text-white/40">Auditor Remarks</FormLabel>
                            <FormControl><Textarea {...field} readOnly={isFieldDisabled('remarks')} className="min-h-[100px] bg-black border-2 border-white/10 rounded-2xl p-4 text-xs sm:text-sm italic" placeholder="Document findings..." /></FormControl>
                          </FormItem>
                        )}/>
                      </div>
                    </div>
                  </form>
                </Form>
              </div>
            </ScrollArea>

            {/* Sidebar Stacking */}
            <ScrollArea className="w-full md:w-[320px] bg-[#050505] p-6 sm:p-8 shrink-0 border-t md:border-t-0 border-white/5">
              <div className="space-y-10">
                <AssetChecklist values={formValues as any} />
                <div className="p-6 rounded-2xl bg-white/[0.02] border-2 border-dashed border-white/10 space-y-4">
                  <div className="flex items-center gap-2 opacity-40 text-[9px] font-black uppercase tracking-widest"><Info className="h-3 w-3" /> Source Pulse</div>
                  <div className="space-y-2 text-[8px] uppercase">
                    <div className="flex justify-between"><span className="text-white/20">Category</span><span className="text-white/60 font-bold">{activeClassification?.group || 'Unclassified'}</span></div>
                    <div className="flex justify-between"><span className="text-white/20">Validation</span><span className="text-primary font-black">{activeClassification?.validationGroup || 'unknown'}</span></div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          <div className="p-6 sm:p-8 border-t border-white/5 bg-black/80 backdrop-blur-3xl flex items-center justify-between shrink-0 pb-safe">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-12 sm:h-14 px-6 sm:px-10 rounded-2xl font-black uppercase text-[9px] text-white/40 hover:text-white">Discard</Button>
            {!externalReadOnly && (
              <Button type="submit" form="asset-form" disabled={isSaving} className="h-12 sm:h-14 px-8 sm:px-12 rounded-2xl font-black uppercase text-[9px] sm:text-xs tracking-[0.2em] shadow-xl bg-primary text-black transition-transform active:scale-95">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-3" /> : <ShieldCheck className="h-4 w-4 mr-3" />}
                Save Changes
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
