"use client";

/**
 * @fileOverview AssetForm - Condition & Audit Workstation.
 * Phase 2: Enhanced with Condition Grouping, History, and Mandatory Audit Remarks.
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
  Lock,
  Eye,
  Info,
  History,
  Activity,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useAppState } from "@/contexts/app-state-context";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ASSET_CONDITIONS } from "@/lib/constants";
import { AssetSchema } from "@/core/registry/validation";
import { AssetChecklist } from "./asset-checklist";
import { Badge } from "./ui/badge";
import { getCanonicalGroup, CONDITION_GROUPS, GROUP_COLORS } from "@/lib/condition-logic";
import type { Asset, ConditionAuditEntry } from "@/types/domain";

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

  const isAdmin = userProfile?.isAdmin || false;
  const isManagementMode = appSettings?.appMode === 'management';

  const isFieldDisabled = (fieldName: string) => {
    if (externalReadOnly) return true;
    if (isAdmin) return false;
    if (isManagementMode && ['status', 'condition', 'remarks', 'conditionGroup'].includes(fieldName)) return true;
    if (appSettings?.appMode === 'verification' && !['status', 'condition', 'remarks', 'conditionGroup'].includes(fieldName)) return true;
    return false;
  };

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
          conditionHistory: []
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
            lastModifiedBy: userProfile?.displayName || 'Unknown'
        };

        // If condition changed, log history
        if (asset && asset.condition !== data.condition) {
          const audit: ConditionAuditEntry = {
            oldCondition: asset.condition,
            newCondition: data.condition,
            changedBy: userProfile?.displayName || 'Unknown',
            timestamp: new Date().toISOString(),
            reason: data.remarks || 'No reason provided',
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px] w-[95vw] p-0 overflow-hidden bg-black text-white border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col h-[85vh]">
          {/* Header */}
          <div className="p-8 pb-4 flex items-center justify-between border-b border-white/5 bg-white/[0.02] shrink-0">
            <div className="space-y-1">
              <DialogTitle className="text-3xl font-black uppercase tracking-tight text-white leading-none">
                {asset ? 'Registry Profile' : 'New Identity Pulse'}
              </DialogTitle>
              <div className="flex items-center gap-3">
                <DialogDescription className="text-xs font-bold text-white/40 uppercase tracking-widest">
                  {asset ? `ID: ${asset.id.split('-')[0]}` : 'Initializing deterministic record.'}
                </DialogDescription>
                {isAdmin && <Badge className="bg-primary text-black font-black uppercase text-[8px] tracking-widest px-2 h-5">ADMIN_OVERRIDE</Badge>}
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="h-12 w-12 flex items-center justify-center bg-white/5 rounded-2xl text-white/40 hover:text-white hover:bg-white/10 transition-all shadow-xl">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
            <ScrollArea className="flex-1 border-r border-white/5">
              <div className="p-8 space-y-12 pb-32">
                <Form {...form}>
                  <form id="asset-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
                    
                    {/* Identification */}
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                        <Tag className="h-3 w-3" /> Identity Markers
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <FormField control={form.control} name="description" render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Asset Description</FormLabel>
                            <FormControl><Input {...field} readOnly={isFieldDisabled('description')} className="h-14 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-black text-sm uppercase tracking-tight" /></FormControl>
                          </FormItem>
                        )}/>
                        <FormField control={form.control} name="serialNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Manufacturer Serial</FormLabel>
                            <FormControl><Input {...field} readOnly={isFieldDisabled('serialNumber')} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm" /></FormControl>
                          </FormItem>
                        )}/>
                        <FormField control={form.control} name="assetIdCode" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Internal Tag ID</FormLabel>
                            <FormControl><Input {...field} readOnly={isFieldDisabled('assetIdCode')} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm" /></FormControl>
                          </FormItem>
                        )}/>
                      </div>
                    </div>

                    {/* Condition Audit - Deterministic Grouping */}
                    <div className="p-8 rounded-[2rem] border-2 border-dashed border-primary/20 bg-primary/[0.02] space-y-8">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                          <Activity className="h-3 w-3" /> Condition Audit Pulse
                        </h4>
                        <Badge variant="outline" className={cn("font-black uppercase text-[8px] px-3 h-6 border-2", GROUP_COLORS[getCanonicalGroup(formValues.condition)])}>
                          Group: {getCanonicalGroup(formValues.condition)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <FormField control={form.control} name="condition" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Physical State Assessment</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isFieldDisabled('condition')}>
                              <FormControl>
                                <SelectTrigger className="h-14 bg-black border-2 border-white/10 rounded-xl font-black text-sm uppercase tracking-tight">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-black border-white/10">
                                {ASSET_CONDITIONS.map(c => (
                                  <SelectItem key={c} value={c} className="text-xs font-black uppercase py-3">{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}/>

                        <FormField control={form.control} name="status" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Verification Pulse</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isFieldDisabled('status')}>
                              <FormControl>
                                <SelectTrigger className="h-14 bg-black border-2 border-white/10 rounded-xl font-black text-sm uppercase tracking-tight">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-black border-white/10">
                                <SelectItem value="VERIFIED" className="text-[10px] font-black uppercase py-3 text-green-500">VERIFIED</SelectItem>
                                <SelectItem value="UNVERIFIED" className="text-[10px] font-black uppercase py-3">UNVERIFIED</SelectItem>
                                <SelectItem value="DISCREPANCY" className="text-[10px] font-black uppercase py-3 text-destructive">DISCREPANCY</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}/>

                        <FormField control={form.control} name="remarks" render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Auditor Remarks / Audit Trail Reason</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                readOnly={isFieldDisabled('remarks')}
                                className="min-h-[120px] bg-black border-2 border-white/10 rounded-2xl p-4 text-sm font-medium italic resize-none shadow-inner"
                                placeholder="Explain any condition changes or discrepancies identified during the field pulse..."
                              />
                            </FormControl>
                          </FormItem>
                        )}/>
                      </div>
                    </div>

                    {/* Hierarchy & History */}
                    {asset?.conditionHistory && asset.conditionHistory.length > 0 && (
                      <div className="space-y-6 pt-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 flex items-center gap-3">
                          <History className="h-3 w-3" /> Forensic State History
                        </h4>
                        <div className="space-y-3">
                          {asset.conditionHistory.map((h, idx) => (
                            <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start justify-between group hover:bg-white/[0.04] transition-all">
                              <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-black uppercase text-muted-foreground">{h.oldCondition}</span>
                                  <ChevronRight className="h-3 w-3 text-white/20" />
                                  <span className="text-[10px] font-black uppercase text-primary">{h.newCondition}</span>
                                </div>
                                <p className="text-[11px] font-medium text-white/60 italic leading-relaxed">"{h.reason}"</p>
                              </div>
                              <div className="text-right flex flex-col items-end">
                                <span className="text-[8px] font-black uppercase tracking-widest text-white/20">{new Date(h.timestamp).toLocaleDateString()}</span>
                                <span className="text-[9px] font-bold text-primary/40 uppercase">{h.changedBy}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </form>
                </Form>
              </div>
            </ScrollArea>

            {/* Sidebar Fidelity Audit */}
            <ScrollArea className="w-full md:w-[320px] bg-[#050505] p-8 shrink-0">
              <div className="space-y-10">
                <AssetChecklist values={formValues as any} />
                
                <div className="p-6 rounded-2xl bg-white/[0.02] border-2 border-dashed border-white/10 space-y-4">
                  <div className="flex items-center gap-2 opacity-40">
                    <Info className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Provenance Pulse</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-[8px] font-black uppercase text-white/20">Source</span>
                      <span className="text-[9px] font-bold text-white/60 truncate max-w-[120px]">{formValues.importMetadata?.sheetName || 'MANUAL'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[8px] font-black uppercase text-white/20">Original Row</span>
                      <span className="text-[9px] font-bold text-white/60"># {formValues.importMetadata?.rowNumber || 'MAN'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Footer */}
          <div className="p-8 border-t border-white/5 bg-black/80 backdrop-blur-3xl flex items-center justify-between shrink-0">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-widest text-white/40 hover:text-white bg-white/5">
              Discard Changes
            </Button>
            {!externalReadOnly && (
              <Button type="submit" form="asset-form" disabled={isSaving} className="h-14 px-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 bg-primary text-black transition-transform hover:scale-105 active:scale-95">
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <ShieldCheck className="h-5 w-5 mr-3" />}
                Commit Record Update
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
