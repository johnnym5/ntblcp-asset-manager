"use client";

/**
 * @fileOverview AssetForm - High-Fidelity Audit Workstation Pop-up.
 * Phase 400: Implemented conditional locking for Management vs Verification modes.
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
import type { Asset } from "@/types/domain";

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

  // Helper to determine if a specific field should be locked
  const isFieldDisabled = (fieldName: string) => {
    if (externalReadOnly) return true;
    if (isAdmin) return false; // Admins override everything

    // In Management Mode, audit-specific fields are strictly locked for normal users
    if (isManagementMode && ['status', 'condition', 'remarks'].includes(fieldName)) {
      return true;
    }

    // Secondary Check: In Verification mode, non-admins can ONLY edit audit fields
    if (appSettings?.appMode === 'verification' && !['status', 'condition', 'remarks'].includes(fieldName)) {
      return true;
    }

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
          location: '',
          description: '',
          category: '',
          custodian: 'Unassigned',
          serialNumber: 'N/A',
          lastModified: new Date().toISOString(),
          lastModifiedBy: userProfile?.displayName || 'Unknown',
          hierarchy: { document: 'Manual', section: 'General', subsection: 'Base Register', assetFamily: 'Uncategorized' },
          importMetadata: { sourceFile: 'MANUAL', sheetName: 'MANUAL', rowNumber: 0, importedAt: new Date().toISOString() },
          metadata: {}
        } as Asset);
      }
    }
  }, [isOpen, asset, form, userProfile, activeGrantId]);

  const onSubmit = async (data: Asset) => {
    setIsSaving(true);
    try {
        await onSave({
            ...data,
            lastModified: new Date().toISOString(),
            lastModifiedBy: userProfile?.displayName || 'Unknown'
        });
    } finally {
        setIsSaving(false);
    }
  };

  const formValues = form.watch();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1000px] w-[95vw] p-0 overflow-hidden bg-black text-white border-white/10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col h-[85vh]">
          {/* Header */}
          <div className="p-8 pb-4 flex items-center justify-between border-b border-white/5">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white leading-none">
                {asset ? 'Inventory Profile' : 'New Asset Record'}
              </DialogTitle>
              <div className="flex items-center gap-3">
                <DialogDescription className="text-sm font-medium text-white/40 italic">
                  {asset ? 'Viewing current registry record.' : 'Initializing new asset record.'}
                </DialogDescription>
                {isManagementMode && !isAdmin && (
                  <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[8px] font-black uppercase">
                    <Lock className="h-2.5 w-2.5 mr-1" /> Management Lock Active
                  </Badge>
                )}
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="h-10 w-10 flex items-center justify-center bg-white/5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
              <X className="h-5 w-5" />
            </button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-8 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Left Pane: Form Fields */}
              <div className="lg:col-span-8 space-y-10">
                <Form {...form}>
                  <form id="asset-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    
                    {/* Identification Section */}
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Identity Markers</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <FormField control={form.control} name="sn" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">S/N</FormLabel>
                            <FormControl>
                              <Input {...field} readOnly={isFieldDisabled('sn')} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm text-white" />
                            </FormControl>
                          </FormItem>
                        )}/>

                        <FormField control={form.control} name="assetIdCode" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Tag ID Code</FormLabel>
                            <FormControl>
                              <Input {...field} readOnly={isFieldDisabled('assetIdCode')} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm text-white" />
                            </FormControl>
                          </FormItem>
                        )}/>

                        <FormField control={form.control} name="description" render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Asset Description</FormLabel>
                            <FormControl>
                              <Input {...field} readOnly={isFieldDisabled('description')} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm text-white" />
                            </FormControl>
                          </FormItem>
                        )}/>
                      </div>
                    </div>

                    {/* Regional Scope */}
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Regional Context</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <FormField control={form.control} name="location" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">State / Location</FormLabel>
                            <FormControl>
                              <Input {...field} readOnly={isFieldDisabled('location')} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm text-white" />
                            </FormControl>
                          </FormItem>
                        )}/>
                        <FormField control={form.control} name="custodian" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Current Assignee</FormLabel>
                            <FormControl>
                              <Input {...field} readOnly={isFieldDisabled('custodian')} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm text-white" />
                            </FormControl>
                          </FormItem>
                        )}/>
                      </div>
                    </div>

                    {/* Audit Assessment - Mode Sensitive */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Field Audit Assessment</h4>
                        {(isManagementMode && !isAdmin) && <Lock className="h-3 w-3 text-white/20" />}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <FormField control={form.control} name="status" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Audit Status</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value} 
                              disabled={isFieldDisabled('status')}
                            >
                              <FormControl>
                                <SelectTrigger className="h-12 bg-white/[0.03] border-2 border-white/5 rounded-xl font-black uppercase text-[10px] tracking-widest">
                                  <SelectValue placeholder="Select status..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-black border-white/10">
                                <SelectItem value="VERIFIED" className="font-black uppercase text-[10px] py-3">VERIFIED</SelectItem>
                                <SelectItem value="UNVERIFIED" className="font-black uppercase text-[10px] py-3">UNVERIFIED</SelectItem>
                                <SelectItem value="DISCREPANCY" className="font-black uppercase text-[10px] py-3 text-red-500">DISCREPANCY</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}/>

                        <FormField control={form.control} name="condition" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Physical Condition</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value} 
                              disabled={isFieldDisabled('condition')}
                            >
                              <FormControl>
                                <SelectTrigger className="h-12 bg-white/[0.03] border-2 border-white/5 rounded-xl font-bold text-xs text-white">
                                  <SelectValue placeholder="Assess condition..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-black border-white/10 max-h-[300px]">
                                {ASSET_CONDITIONS.map(c => (
                                  <SelectItem key={c} value={c} className="font-bold text-xs py-3 text-white">{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}/>

                        <FormField control={form.control} name="remarks" render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Field Audit Remarks</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                readOnly={isFieldDisabled('remarks')}
                                className="min-h-[100px] bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-medium text-sm text-white resize-none p-4 shadow-inner" 
                                placeholder="Enter specific audit observations..."
                              />
                            </FormControl>
                          </FormItem>
                        )}/>
                      </div>
                    </div>
                  </form>
                </Form>
              </div>

              {/* Right Pane: Status & Metadata */}
              <div className="lg:col-span-4 border-l border-white/10 pl-10 space-y-10">
                <AssetChecklist values={formValues} />
                
                <div className="p-6 rounded-[2rem] bg-white/[0.02] border-2 border-dashed border-white/10 space-y-4">
                  <div className="flex items-center gap-2 opacity-40">
                    <Info className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Metadata Pulse</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-[8px] font-black uppercase text-white/20">Source Group</span>
                      <span className="text-[9px] font-bold text-white/60">{formValues.category || 'Manual Entry'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[8px] font-black uppercase text-white/20">Registry Row</span>
                      <span className="text-[9px] font-bold text-white/60"># {formValues.importMetadata?.rowNumber || 'MAN'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[8px] font-black uppercase text-white/20">Last Update</span>
                      <span className="text-[9px] font-bold text-white/60">{new Date(formValues.lastModified).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer Controls */}
          <div className="p-8 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-widest bg-white/5 hover:bg-white/10 text-white/60">
              Discard Changes
            </Button>
            {!externalReadOnly && (
              <Button type="submit" form="asset-form" disabled={isSaving} className="h-14 px-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 bg-primary text-black">
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
