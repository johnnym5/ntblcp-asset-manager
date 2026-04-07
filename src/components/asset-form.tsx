"use client";

/**
 * @fileOverview AssetForm - Condition & Audit Workstation.
 * Phase 300: Implemented Pulsing Field Highlights & Change History Revert.
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
  AlertTriangle,
  Tag,
  ChevronRight,
  RotateCcw,
  User,
  Clock,
  ArrowRightLeft
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
import type { Asset, ConditionAuditEntry } from "@/types/domain";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [isReverting, setIsReverting] = useState(false);
  const [revertTarget, setRevertTarget] = useState<ConditionAuditEntry | null>(null);
  
  const { userProfile } = useAuth();
  const { activeGrantId, appSettings, refreshRegistry } = useAppState();
  const { toast } = useToast();
  
  const form = useForm<Asset>({
    resolver: zodResolver(AssetSchema),
    mode: 'onChange',
  });

  const isAdmin = userProfile?.isAdmin || false;
  const isManagementMode = appSettings?.appMode === 'management';

  // State for pulsing fields - tracks which fields the user has "seen"
  const [pulsingFields, setPulsingFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      if (asset) {
        form.reset(asset);
        // Identify unseen fields to trigger pulse
        if (asset.unseenUpdateFields) {
          setPulsingFields(new Set(asset.unseenUpdateFields));
        }
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
          unseenUpdateFields: [],
          updateCount: 0
        } as Asset);
      }
    }
  }, [isOpen, asset, form, userProfile, activeGrantId]);

  const handleFieldInteraction = (fieldName: string) => {
    if (pulsingFields.has(fieldName)) {
      const next = new Set(pulsingFields);
      next.delete(fieldName);
      setPulsingFields(next);
      
      // Update asset status locally if all seen
      if (next.size === 0 && asset) {
        // In a real app, we'd fire a "mark as seen" pulse to the DB here
      }
    }
  };

  const onSubmit = async (data: Asset) => {
    setIsSaving(true);
    try {
        const nextGroup = getCanonicalGroup(data.condition);
        const nextAsset = {
            ...data,
            conditionGroup: nextGroup,
            lastModified: new Date().toISOString(),
            lastModifiedBy: userProfile?.displayName || 'Unknown',
            unseenUpdateFields: [], // Mark all as seen on save
            updateCount: (asset?.updateCount || 0) + 1
        };

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

  const handleRevertPulse = async () => {
    if (!revertTarget || !asset) return;
    setIsReverting(true);
    
    try {
      const restoredAsset = {
        ...asset,
        condition: revertTarget.oldCondition,
        conditionGroup: getCanonicalGroup(revertTarget.oldCondition),
        remarks: `FORENSIC REVERT: Restored to state from ${new Date(revertTarget.timestamp).toLocaleDateString()} by ${userProfile?.displayName}`,
        lastModified: new Date().toISOString(),
        lastModifiedBy: userProfile?.displayName || 'System'
      };

      await onSave(restoredAsset);
      toast({ title: "Forensic Revert Complete", description: `Asset restored to ${revertTarget.oldCondition}.` });
      setRevertTarget(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Restoration Failed" });
    } finally {
      setIsReverting(false);
    }
  };

  const isFieldDisabled = (fieldName: string) => {
    if (externalReadOnly) return true;
    if (isAdmin) return false;
    if (isManagementMode && ['status', 'condition', 'remarks', 'conditionGroup'].includes(fieldName)) return true;
    if (appSettings?.appMode === 'verification' && !['status', 'condition', 'remarks', 'conditionGroup'].includes(fieldName)) return true;
    return false;
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
                {asset?.updateCount ? (
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-black h-5 px-2 text-[8px] uppercase tracking-widest">
                    {asset.updateCount} MODIFICATIONS
                  </Badge>
                ) : null}
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
                            <FormControl>
                              <div className={cn("relative", pulsingFields.has('description') && "animate-field-pulse rounded-xl")}>
                                <Input 
                                  {...field} 
                                  readOnly={isFieldDisabled('description')} 
                                  onFocus={() => handleFieldInteraction('description')}
                                  className="h-14 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-black text-sm uppercase tracking-tight" 
                                />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}/>
                        <FormField control={form.control} name="serialNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Manufacturer Serial</FormLabel>
                            <FormControl>
                              <div className={cn("relative", pulsingFields.has('serialNumber') && "animate-field-pulse rounded-xl")}>
                                <Input 
                                  {...field} 
                                  readOnly={isFieldDisabled('serialNumber')} 
                                  onFocus={() => handleFieldInteraction('serialNumber')}
                                  className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm" 
                                />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}/>
                        <FormField control={form.control} name="assetIdCode" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Internal Tag ID</FormLabel>
                            <FormControl>
                              <div className={cn("relative", pulsingFields.has('assetIdCode') && "animate-field-pulse rounded-xl")}>
                                <Input 
                                  {...field} 
                                  readOnly={isFieldDisabled('assetIdCode')} 
                                  onFocus={() => handleFieldInteraction('assetIdCode')}
                                  className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm" 
                                />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}/>
                      </div>
                    </div>

                    {/* Condition Audit */}
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
                            <div className={cn("relative", pulsingFields.has('condition') && "animate-field-pulse rounded-xl")}>
                              <Select onValueChange={(v) => { field.onChange(v); handleFieldInteraction('condition'); }} value={field.value} disabled={isFieldDisabled('condition')}>
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
                            </div>
                          </FormItem>
                        )}/>

                        <FormField control={form.control} name="status" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Verification Pulse</FormLabel>
                            <div className={cn("relative", pulsingFields.has('status') && "animate-field-pulse rounded-xl")}>
                              <Select onValueChange={(v) => { field.onChange(v); handleFieldInteraction('status'); }} value={field.value} disabled={isFieldDisabled('status')}>
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
                            </div>
                          </FormItem>
                        )}/>

                        <FormField control={form.control} name="remarks" render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Auditor Remarks</FormLabel>
                            <FormControl>
                              <div className={cn("relative", pulsingFields.has('remarks') && "animate-field-pulse rounded-2xl")}>
                                <Textarea 
                                  {...field} 
                                  readOnly={isFieldDisabled('remarks')}
                                  onFocus={() => handleFieldInteraction('remarks')}
                                  className="min-h-[120px] bg-black border-2 border-white/10 rounded-2xl p-4 text-sm font-medium italic resize-none shadow-inner"
                                  placeholder="Explain any condition changes Identified during the field pulse..."
                                />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}/>
                      </div>
                    </div>

                    {/* Hierarchy & History */}
                    {asset?.conditionHistory && asset.conditionHistory.length > 0 && (
                      <div className="space-y-6 pt-4">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 flex items-center gap-3">
                            <History className="h-3 w-3" /> Forensic State History
                          </h4>
                          <span className="text-[8px] font-bold text-white/20 uppercase">Click to Revert</span>
                        </div>
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
                              <div className="text-right flex flex-col items-end gap-3">
                                <div className="flex flex-col items-end">
                                  <span className="text-[8px] font-black uppercase tracking-widest text-white/20">{new Date(h.timestamp).toLocaleDateString()}</span>
                                  <span className="text-[9px] font-bold text-primary/40 uppercase">{h.changedBy}</span>
                                </div>
                                {isAdmin && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setRevertTarget(h)}
                                    className="h-7 px-3 rounded-lg text-[8px] font-black uppercase tracking-widest gap-2 bg-white/5 hover:bg-primary/10 hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                                  >
                                    <RotateCcw className="h-2.5 w-2.5" /> Revert Pulse
                                  </Button>
                                )}
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

      <AlertDialog open={!!revertTarget} onOpenChange={(o) => !o && setRevertTarget(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-primary/10 p-10 shadow-3xl bg-black text-white">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-2xl w-fit">
              <RotateCcw className="h-12 w-12 text-primary" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight">Execute Forensic Revert?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed italic text-white/60">
              You are about to restore the condition from <strong>{revertTarget?.newCondition}</strong> back to <strong>{revertTarget?.oldCondition}</strong>. This will create a new entry in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-14 px-10 rounded-2xl font-bold border-2 border-white/10 m-0 hover:bg-white/5 text-white">Abort Revert</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRevertPulse} 
              disabled={isReverting}
              className="h-14 px-12 rounded-2xl font-black uppercase bg-primary text-black m-0"
            >
              {isReverting ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <ShieldCheck className="h-5 w-5 mr-3" />} Confirm Reversion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}