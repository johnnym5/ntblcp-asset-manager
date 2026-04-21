"use client";

/**
 * @fileOverview AssetForm - Dynamic Record Workstation.
 * Phase 1915: Removed redundant TooltipProvider.
 * Phase 2005: Enforced strict governance - only Admins bypass approval.
 * Phase 2010: Synchronized validation resolver with Asset domain interface.
 */

import React, { useEffect, useState, useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
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
  Info,
  Database,
  Lock,
  Terminal
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useAppState } from "@/contexts/app-state-context";
import { cn, getFuzzySignature } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ASSET_CONDITIONS } from "@/lib/constants";
import { AssetSchema } from "@/core/registry/validation";
import { AssetChecklist } from "./asset-checklist";
import { Badge } from "./ui/badge";
import { getCanonicalGroup } from "@/lib/condition-logic";
import type { Asset } from "@/types/domain";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { addNotification } from "@/hooks/use-notifications";

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
  const { activeGrantIds, appSettings, headers: globalHeaders } = useAppState();
  
  const form = useForm<Asset>({
    resolver: zodResolver(AssetSchema),
    mode: 'onChange',
  });

  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const isVerificationMode = appSettings?.appMode === 'verification';

  const currentTemplate = useMemo(() => {
    const category = asset?.category || form.getValues('category');
    if (!category || !appSettings) return null;
    const grant = appSettings.grants.find(g => 
      Object.keys(g.sheetDefinitions).some(k => getFuzzySignature(k) === getFuzzySignature(category))
    );
    if (!grant) return null;
    const defKey = Object.keys(grant.sheetDefinitions).find(k => getFuzzySignature(k) === getFuzzySignature(category));
    return defKey ? grant.sheetDefinitions[defKey] : null;
  }, [asset?.category, form, appSettings]);

  useEffect(() => {
    if (isOpen) {
      if (asset) {
        form.reset(asset);
      } else {
        const defaultGrantId = activeGrantIds[0] || (appSettings?.grants[0]?.id) || '';
        form.reset({
          id: crypto.randomUUID(),
          sn: "",
          assetIdCode: "",
          grantId: defaultGrantId,
          status: 'UNVERIFIED',
          condition: 'New',
          conditionGroup: 'Good',
          location: userProfile?.state || '',
          description: '',
          category: '',
          custodian: 'Unassigned',
          serialNumber: 'N/A',
          lastModified: new Date().toISOString(),
          lastModifiedBy: userProfile?.displayName || 'User',
          hierarchy: { document: 'Manual', section: 'General', subsection: 'Base Register', assetFamily: 'Uncategorized' },
          importMetadata: { sourceFile: 'MANUAL', sheetName: 'MANUAL', rowNumber: 0, importedAt: new Date().toISOString() },
          metadata: {},
          conditionHistory: [],
          discrepancies: [],
          updateCount: 0,
          section: 'General',
          subsection: 'Base Register',
          assetFamily: 'Uncategorized',
          overallFidelityScore: 100,
          unseenUpdateFields: []
        } as unknown as Asset);
      }
    }
  }, [isOpen, asset, form, userProfile, activeGrantIds, appSettings]);

  const onSubmit: SubmitHandler<Asset> = async (data) => {
    setIsSaving(true);
    try {
        const nextGroup = getCanonicalGroup(data.condition);
        let nextAsset: Asset = {
            ...data,
            conditionGroup: nextGroup,
            lastModified: new Date().toISOString(),
            lastModifiedBy: userProfile?.displayName || 'User',
            updateCount: (asset?.updateCount || 0) + 1
        };

        if (!isAdmin && asset) {
          const changes: Partial<Asset> = {};
          const keysToCheck = ['description', 'assetIdCode', 'serialNumber', 'location', 'custodian', 'condition', 'remarks', 'metadata', 'chassisNo', 'engineNo'];
          
          keysToCheck.forEach(key => {
            const currentVal = (data as any)[key];
            const originalVal = (asset as any)[key];
            if (JSON.stringify(currentVal) !== JSON.stringify(originalVal)) {
              (changes as any)[key] = currentVal;
            }
          });

          if (Object.keys(changes).length > 0) {
            nextAsset = {
              ...asset,
              approvalStatus: 'PENDING',
              pendingChanges: changes,
              changeSubmittedBy: {
                displayName: userProfile?.displayName || 'Unknown',
                loginName: userProfile?.loginName || 'unknown',
                state: userProfile?.state || 'Unknown'
              },
              lastModified: new Date().toISOString()
            };
            addNotification({ 
              title: "Update Staged", 
              description: "Changes enqueued for administrative adjudication.", 
              variant: "default", 
              assetId: asset.id 
            });
          }
        }

        await onSave(nextAsset);
    } finally {
        setIsSaving(false);
    }
  };

  const isFieldDisabled = (fieldName: string) => {
    if (externalReadOnly) return true;
    if (isAdmin) return false;
    const assessmentFields = ['status', 'condition', 'remarks'];
    if (isVerificationMode && assessmentFields.includes(fieldName)) return false;
    return true;
  };

  const LabelWithInfo = ({ label, name }: { label: string, name: string }) => {
    const header = globalHeaders.find(h => h.normalizedName === name || getFuzzySignature(h.displayName) === getFuzzySignature(name));
    return (
      <div className="flex items-center gap-2 mb-1.5">
        <FormLabel className="text-[9px] font-black uppercase text-white/40 mb-0">{label}</FormLabel>
        {header?.guidance && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help"><Info className="h-3 w-3 text-primary opacity-40" /></div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px] p-4 rounded-xl border-primary/20 bg-black shadow-2xl">
              <p className="text-[10px] font-black uppercase text-primary mb-1">Guidance</p>
              <p className="text-[11px] font-medium text-white italic leading-relaxed">{header.guidance}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px] w-full h-[100dvh] sm:h-[85vh] sm:w-[95vw] p-0 overflow-hidden bg-black text-white border-none sm:border-white/10 sm:rounded-[2.5rem] shadow-3xl">
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-white/5 bg-white/[0.02] shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl sm:text-2xl font-black uppercase text-white leading-none">
                  {asset ? 'Record Update' : 'New Asset Pulse'}
                </DialogTitle>
                {!isAdmin && asset && (
                  <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[8px] font-black uppercase tracking-widest">Approval Required</Badge>
                )}
              </div>
              <DialogDescription className="text-[10px] font-bold text-white/40 uppercase tracking-widest truncate">
                {asset ? `System ID: ${asset.id.split('-')[0]}` : 'Manual Register Entry'}
              </DialogDescription>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden bg-black">
            <ScrollArea className="flex-1 border-r border-white/5 h-full">
              <div className="p-6 sm:p-8 space-y-10 sm:space-y-12 pb-32">
                <Form {...form}>
                  <form id="asset-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 sm:space-y-12">
                    <div className="space-y-6">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                        <Terminal className="h-3 w-3" /> Technical Attributes
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                        {currentTemplate ? (
                          currentTemplate.displayFields.map((field) => {
                            const fieldName = field.key as any;
                            const isCoreProp = ['description', 'assetIdCode', 'serialNumber', 'chassisNo', 'engineNo', 'location', 'custodian'].includes(fieldName);
                            
                            return (
                              <FormField 
                                key={field.key} 
                                control={form.control} 
                                name={isCoreProp ? fieldName : `metadata.${field.label}`}
                                render={({ field: formField }) => (
                                  <FormItem className={field.key === 'description' ? "sm:col-span-2" : ""}>
                                    <LabelWithInfo label={field.label} name={field.label} />
                                    <FormControl>
                                      <Input 
                                        {...formField} 
                                        value={String(formField.value || '')}
                                        readOnly={isFieldDisabled(fieldName)} 
                                        className="h-12 bg-white/[0.03] border-white/5 rounded-xl font-black text-sm uppercase shadow-inner" 
                                        placeholder={`Enter ${field.label}...`}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            );
                          })
                        ) : (
                          <div className="col-span-2 py-10 text-center opacity-20 border-2 border-dashed rounded-2xl">
                            <Database className="h-10 w-10 mx-auto mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Select category to load attributes</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-6 sm:p-8 rounded-[1.5rem] border-2 border-dashed border-primary/20 bg-primary/[0.02] space-y-8 shadow-inner">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                        <Activity className="h-3 w-3" /> Audit Assessment
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                        <FormField control={form.control} name="condition" render={({ field }) => (
                          <FormItem>
                            <LabelWithInfo label="Physical State" name="condition" />
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
                            <LabelWithInfo label="Verification Status" name="status" />
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
                            <LabelWithInfo label="Auditor Remarks" name="remarks" />
                            <FormControl>
                              <Textarea 
                                {...field} 
                                readOnly={isFieldDisabled('remarks')}
                                className="min-h-[100px] bg-white/[0.03] border-white/5 rounded-xl text-sm italic shadow-inner" 
                                placeholder="Record site observations..."
                              />
                            </FormControl>
                          </FormItem>
                        )}/>
                      </div>
                    </div>
                  </form>
                </Form>
              </div>
            </ScrollArea>

            <ScrollArea className="w-full md:w-[320px] bg-[#050505] p-6 sm:p-8 shrink-0 border-t md:border-t-0 border-white/5 h-full">
              <div className="space-y-10">
                <AssetChecklist values={form.watch() as any} />
              </div>
            </ScrollArea>
          </div>

          <div className="p-6 sm:p-8 border-t border-white/5 bg-black/80 backdrop-blur-3xl flex items-center justify-between shrink-0 pb-safe shadow-3xl">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-12 sm:h-14 font-black uppercase text-[9px] text-white/40 hover:text-white px-10">Discard</Button>
            <Button type="submit" form="asset-form" disabled={isSaving} className="h-12 sm:h-14 px-8 sm:px-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl bg-primary text-black transition-transform active:scale-95">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-3" /> : <ShieldCheck className="h-4 w-4 mr-3" />}
              {isAdmin ? 'Save Profile' : asset ? 'Submit for Review' : 'Create Record'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
