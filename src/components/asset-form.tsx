"use client";

/**
 * @fileOverview AssetForm - Condition & Audit Workstation.
 * Optimized for mobile fields stacking and touch fidelity.
 * Phase 150: Integrated Discrepancy Highlighting & Review Triggers.
 * Phase 151: Integrated Smart Suggestion Application Pulse.
 * Phase 152: Integrated Category-Aware Field Visibility & Validation.
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
    
    // Check category specific forbidden state
    if ((fieldRules as any)[fieldName] === 'forbidden') return true;

    if (isManagementMode && ['status', 'condition', 'remarks'].includes(fieldName)) return true;
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
      <DialogContent className="max-w-[1100px] w-[100vw] h-[100vh] sm:w-[95vw] sm:h-[85vh] p-0 overflow-hidden bg-black text-white border-none sm:border-white/10 rounded-none sm:rounded-[2.5rem] shadow-3xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 md:p-8 flex items-center justify-between border-b border-white/5 bg-white/[0.02] shrink-0">
            <div className="space-y-1">
              <DialogTitle className="text-xl md:text-3xl font-black uppercase text-white leading-none">
                {asset ? 'Registry Profile' : 'New Identity Pulse'}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1.5">
                <DialogDescription className="text-[10px] md:text-xs font-bold text-white/40 uppercase tracking-widest">
                  {asset ? `ID: ${asset.id.split('-')[0]}` : 'System Ingestion'}
                </DialogDescription>
                {activeClassification && (
                  <Badge variant="outline" className="h-5 px-2 border-primary/20 text-primary text-[8px] font-black uppercase">
                    {activeClassification.validationGroup}
                  </Badge>
                )}
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center bg-white/5 rounded-2xl text-white/40"><X className="h-5 w-5 sm:h-6 sm:w-6" /></button>
          </div>

          <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
            <ScrollArea className="flex-1 border-r border-white/5">
              <div className="p-6 md:p-8 space-y-10 md:space-y-12 pb-32">
                
                {/* 1. Anomaly Banner */}
                {formValues.discrepancies?.some(d => d.status === 'PENDING' || d.status === 'SUSPICIOUS') && (
                  <div className="p-6 rounded-[2rem] bg-red-600/10 border-2 border-dashed border-red-600/20 flex flex-col sm:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-5">
                      <div className="p-3 bg-red-600/20 rounded-2xl shadow-inner"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-black uppercase tracking-tight text-white">Heuristic Pattern Alert</h4>
                        <p className="text-[10px] font-medium text-white/40 italic">This record contains data that deviates from the registry norm or category rules.</p>
                      </div>
                    </div>
                    <Badge className="bg-red-600 h-8 px-4 font-black uppercase text-[9px] tracking-widest">Awaiting Review</Badge>
                  </div>
                )}

                <Form {...form}>
                  <form id="asset-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 md:space-y-12">
                    
                    {/* Identification */}
                    <div className="space-y-6">
                      <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                        <Tag className="h-3 w-3" /> Identity Markers
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <FormField control={form.control} name="description" render={({ field }) => {
                          const discrepancy = getDiscrepancyForField('description');
                          return (
                            <FormItem className="md:col-span-2">
                              <div className="flex items-center justify-between">
                                <FormLabel className="text-[9px] font-black uppercase text-white/40">Asset Description</FormLabel>
                                {discrepancy && <Badge variant="outline" className="h-5 text-[7px] font-black uppercase text-red-500 border-red-500/20">Anomalous</Badge>}
                              </div>
                              <FormControl>
                                <div className="relative group">
                                  <Input {...field} readOnly={isFieldDisabled('description')} className={cn("h-12 md:h-14 bg-white/[0.03] border-2 rounded-xl font-black text-sm uppercase transition-all", discrepancy ? "border-red-600 animate-field-pulse" : "border-white/5")} />
                                </div>
                              </FormControl>
                            </FormItem>
                          );
                        }}/>
                        
                        {isFieldVisible('serialNumber') && (
                          <FormField control={form.control} name="serialNumber" render={({ field }) => {
                            const discrepancy = getDiscrepancyForField('serialNumber');
                            const rule = fieldRules.serialNumber;
                            return (
                              <FormItem>
                                <div className="flex items-center justify-between">
                                  <FormLabel className="text-[9px] font-black uppercase text-white/40">
                                    Serial Number {rule === 'required' && <span className="text-red-500">*</span>}
                                  </FormLabel>
                                  {discrepancy?.suggestedValue && <Badge className="bg-blue-600 h-4 text-[6px] font-black uppercase">Suggestion Found</Badge>}
                                </div>
                                <FormControl>
                                  <div className="relative group">
                                    <Input {...field} readOnly={isFieldDisabled('serialNumber')} className={cn("h-12 bg-white/[0.03] border-2 rounded-xl text-sm transition-all", discrepancy ? "border-red-600 animate-field-pulse" : "border-white/5")} />
                                    {discrepancy && (
                                      <div className="absolute top-1/2 -right-12 -translate-y-1/2 flex gap-2">
                                        {discrepancy.suggestedValue && (
                                          <Button type="button" onClick={() => handleResolveDiscrepancy(discrepancy.id, 'RESOLVED', discrepancy.suggestedValue)} size="icon" className="h-8 w-8 rounded-lg bg-blue-600 shadow-xl"><Zap className="h-4 w-4" /></Button>
                                        )}
                                        <Button type="button" onClick={() => handleResolveDiscrepancy(discrepancy.id, 'IGNORED')} size="icon" className="h-8 w-8 rounded-lg bg-white/10 text-white/40"><Ban className="h-4 w-4" /></Button>
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                              </FormItem>
                            );
                          }}/>
                        )}

                        {isFieldVisible('assetIdCode') && (
                          <FormField control={form.control} name="assetIdCode" render={({ field }) => {
                            const discrepancy = getDiscrepancyForField('assetIdCode');
                            return (
                              <FormItem>
                                <div className="flex items-center justify-between">
                                  <FormLabel className="text-[9px] font-black uppercase text-white/40">Internal Tag ID</FormLabel>
                                </div>
                                <FormControl>
                                  <div className="relative group">
                                    <Input {...field} readOnly={isFieldDisabled('assetIdCode')} className={cn("h-12 bg-white/[0.03] border-2 rounded-xl text-sm transition-all", discrepancy ? "border-red-600 animate-field-pulse" : "border-white/5")} />
                                  </div>
                                </FormControl>
                              </FormItem>
                            );
                          }}/>
                        )}

                        {isFieldVisible('manufacturer') && (
                          <FormField control={form.control} name="manufacturer" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[9px] font-black uppercase text-white/40">Manufacturer</FormLabel>
                              <FormControl><Input {...field} readOnly={isFieldDisabled('manufacturer')} className="h-12 bg-white/[0.03] border-white/5 rounded-xl text-sm" /></FormControl>
                            </FormItem>
                          )}/>
                        )}

                        {isFieldVisible('modelNumber') && (
                          <FormField control={form.control} name="modelNumber" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[9px] font-black uppercase text-white/40">Model Number</FormLabel>
                              <FormControl><Input {...field} readOnly={isFieldDisabled('modelNumber')} className="h-12 bg-white/[0.03] border-white/5 rounded-xl text-sm" /></FormControl>
                            </FormItem>
                          )}/>
                        )}

                        {isFieldVisible('chassisNo') && (
                          <FormField control={form.control} name="chassisNo" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[9px] font-black uppercase text-white/40">Chassis Number <span className="text-red-500">*</span></FormLabel>
                              <FormControl><Input {...field} readOnly={isFieldDisabled('chassisNo')} className="h-12 bg-white/[0.03] border-white/5 rounded-xl text-sm" /></FormControl>
                            </FormItem>
                          )}/>
                        )}

                        {isFieldVisible('engineNo') && (
                          <FormField control={form.control} name="engineNo" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[9px] font-black uppercase text-white/40">Engine Number <span className="text-red-500">*</span></FormLabel>
                              <FormControl><Input {...field} readOnly={isFieldDisabled('engineNo')} className="h-12 bg-white/[0.03] border-white/5 rounded-xl text-sm" /></FormControl>
                            </FormItem>
                          )}/>
                        )}
                      </div>
                    </div>

                    {/* Condition Audit */}
                    <div className="p-6 md:p-8 rounded-[2rem] border-2 border-dashed border-primary/20 bg-primary/[0.02] space-y-8">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                          <Activity className="h-3 w-3" /> Audit Pulse
                        </h4>
                        <Badge variant="outline" className={cn("font-black uppercase text-[8px] px-3 h-6 border-2", GROUP_COLORS[getCanonicalGroup(formValues.condition)])}>
                          {getCanonicalGroup(formValues.condition)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <FormField control={form.control} name="condition" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black uppercase text-white/40">Physical State</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isFieldDisabled('condition')}>
                              <FormControl><SelectTrigger className="h-12 md:h-14 bg-black border-2 border-white/10 rounded-xl font-black text-sm uppercase"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent className="bg-black border-white/10">
                                {ASSET_CONDITIONS.map(c => <SelectItem key={c} value={c} className="text-xs uppercase">{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}/>

                        <FormField control={form.control} name="status" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black uppercase text-white/40">Verification Pulse</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isFieldDisabled('status')}>
                              <FormControl><SelectTrigger className="h-12 md:h-14 bg-black border-2 border-white/10 rounded-xl font-black text-sm uppercase"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent className="bg-black border-white/10">
                                <SelectItem value="VERIFIED" className="text-green-500 font-black">VERIFIED</SelectItem>
                                <SelectItem value="UNVERIFIED" className="font-black">UNVERIFIED</SelectItem>
                                <SelectItem value="DISCREPANCY" className="text-destructive font-black">DISCREPANCY</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}/>

                        <FormField control={form.control} name="remarks" render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-[9px] font-black uppercase text-white/40">Auditor Remarks</FormLabel>
                            <FormControl><Textarea {...field} readOnly={isFieldDisabled('remarks')} className="min-h-[100px] bg-black border-2 border-white/10 rounded-2xl p-4 text-sm italic" placeholder="Document findings..." /></FormControl>
                          </FormItem>
                        )}/>
                      </div>
                    </div>
                  </form>
                </Form>
              </div>
            </ScrollArea>

            {/* Fidelity Sidebar */}
            <ScrollArea className="w-full md:w-[320px] bg-[#050505] p-6 md:p-8 shrink-0 border-t md:border-t-0 border-white/5">
              <div className="space-y-10">
                <AssetChecklist values={formValues as any} />
                
                {/* Heuristic History */}
                {formValues.discrepancies?.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600">Discrepancy Pulse</h4>
                    <div className="space-y-3">
                      {formValues.discrepancies.map(d => (
                        <div key={d.id} className={cn("p-4 rounded-2xl border transition-all", d.status === 'RESOLVED' || d.status === 'CORRECTED' ? "bg-green-600/5 border-green-600/20 opacity-60" : "bg-red-600/5 border-red-600/20")}>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="h-4 px-1.5 text-[7px] font-black uppercase border-white/10">{d.severity}</Badge>
                            <span className="text-[8px] font-black uppercase text-white/20">{d.field}</span>
                          </div>
                          <p className="text-[9px] font-medium text-white/60 leading-relaxed italic">{d.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

          <div className="p-6 md:p-8 border-t border-white/5 bg-black/80 backdrop-blur-3xl flex items-center justify-between shrink-0 pb-safe">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-12 md:h-14 px-8 md:px-10 rounded-2xl font-black uppercase text-[10px] md:text-xs">Discard</Button>
            {!externalReadOnly && (
              <Button type="submit" form="asset-form" disabled={isSaving} className="h-12 md:h-14 px-10 md:px-12 rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-[0.2em] shadow-xl bg-primary text-black">
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
