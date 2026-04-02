
"use client";

/**
 * @fileOverview AssetForm - High-Fidelity Audit Workstation Pop-up.
 * Phase 300: Achieved 100% visual parity with the dual-pane detail reference.
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
import { 
  Loader2, 
  X,
  ShieldCheck
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useAppState } from "@/contexts/app-state-context";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ASSET_CONDITIONS } from "@/lib/constants";
import { AssetSchema } from "@/core/registry/validation";
import { AssetChecklist } from "./asset-checklist";
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
    isReadOnly,
}: AssetFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { userProfile } = useAuth();
  const { activeGrantId } = useAppState();
  
  const form = useForm<Asset>({
    resolver: zodResolver(AssetSchema),
    mode: 'onChange',
  });

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
          <div className="p-8 pb-4 flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white leading-none">
                {asset ? 'View Asset Details' : 'New Registry Record'}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-white/40 italic">
                {asset ? 'Viewing current registry state.' : 'Initializing new asset pulse.'}
              </DialogDescription>
            </div>
            <button onClick={() => onOpenChange(false)} className="h-10 w-10 flex items-center justify-center bg-white/5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
              <X className="h-5 w-5" />
            </button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-8 pt-4 grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Left Pane: Form Fields */}
              <div className="lg:col-span-8">
                <Form {...form}>
                  <form id="asset-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <FormField control={form.control} name="sn" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">S/N</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly={isReadOnly} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm text-white shadow-inner" />
                          </FormControl>
                        </FormItem>
                      )}/>

                      <FormField control={form.control} name="location" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Location</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly={isReadOnly} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm text-white" />
                          </FormControl>
                        </FormItem>
                      )}/>

                      <FormField control={form.control} name="lga" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">LGA</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly={isReadOnly} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm text-white" />
                          </FormControl>
                        </FormItem>
                      )}/>

                      <FormField control={form.control} name="custodian" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Assignee</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly={isReadOnly} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm text-white" />
                          </FormControl>
                        </FormItem>
                      )}/>

                      <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Asset Description</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly={isReadOnly} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm text-white" />
                          </FormControl>
                        </FormItem>
                      )}/>

                      <FormField control={form.control} name="assetIdCode" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Asset ID Code</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly={isReadOnly} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm text-white" />
                          </FormControl>
                        </FormItem>
                      )}/>

                      <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Asset Class</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly={isReadOnly} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm text-white" />
                          </FormControl>
                        </FormItem>
                      )}/>

                      <FormField control={form.control} name="manufacturer" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Manufacturer</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly={isReadOnly} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm text-white" />
                          </FormControl>
                        </FormItem>
                      )}/>

                      <FormField control={form.control} name="modelNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Model Number</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly={isReadOnly} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm text-white" />
                          </FormControl>
                        </FormItem>
                      )}/>

                      <FormField control={form.control} name="serialNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Serial Number</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly={isReadOnly} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm text-white" />
                          </FormControl>
                        </FormItem>
                      )}/>

                      <FormField control={form.control} name="supplier" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Supplier</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly={isReadOnly} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm text-white" />
                          </FormControl>
                        </FormItem>
                      )}/>

                      <FormField control={form.control} name="purchaseDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Date Purchased or Received</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly={isReadOnly} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm text-white" />
                          </FormControl>
                        </FormItem>
                      )}/>

                      <FormField control={form.control} name="remarks" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Remarks / Notes</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly={isReadOnly} className="h-12 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 rounded-xl font-bold text-sm text-white" />
                          </FormControl>
                        </FormItem>
                      )}/>
                    </div>
                  </form>
                </Form>
              </div>

              {/* Right Pane: Checklist */}
              <div className="lg:col-span-4 border-l border-white/10 pl-10">
                <AssetChecklist values={formValues} />
              </div>
            </div>
          </ScrollArea>

          {/* Footer Controls */}
          <div className="p-8 border-t border-white/5 bg-white/[0.02] flex items-center gap-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-widest bg-white/5 hover:bg-white/10">
              Close
            </Button>
            {!isReadOnly && (
              <Button type="submit" form="asset-form" disabled={isSaving} className="h-14 px-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 bg-primary text-black">
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <ShieldCheck className="h-5 w-5 mr-3" />}
                Commit Changes
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
