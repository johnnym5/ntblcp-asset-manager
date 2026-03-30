"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import type { Asset, SheetDefinition, DisplayField, AppSettings } from "@/lib/types";
import { Loader2, ArrowLeft, Share2, MoreVertical, Check, RotateCcw, Info, Hash, Clock, FileJson } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useAppState } from "@/contexts/app-state-context";
import { cn, getStatusClasses, sanitizeForFirestore } from "@/lib/utils";
import { AssetChecklist } from "./asset-checklist";
import { ScrollArea } from "./ui/scroll-area";
import { ASSET_CONDITIONS } from "@/lib/constants";
import { ColumnCustomizationSheet } from "./column-customization-sheet";
import { saveLocalSettings } from "@/lib/idb";
import { updateSettings as updateSettingsFS } from "@/lib/firestore";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

const assetFormSchema = z.record(z.string().optional()).refine(data => !!data.category, {
  path: ['category'],
  message: 'Category is required.',
}).refine(data => !!data.description, {
    path: ['description'],
    message: 'Description is required.',
});

export type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AssetFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  asset?: Asset;
  onSave: (assetToSave: Asset) => Promise<void>;
  onQuickSave: (assetId: string, data: { remarks?: string; condition?: string; verifiedStatus?: 'Verified' | 'Unverified'; verifiedDate?: string; }) => Promise<void>;
  isReadOnly: boolean;
  defaultCategory?: string;
  onNext?: () => void;
  onPrevious?: () => void;
}

const FxIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
        <path d="M9 17c2 0 2.8-1 2.8-2.8V10c0-2 1-3.3 3.2-3" />
        <path d="M9 11.2h5.7" />
        <path d="M15 17c-2 0-2.8-1-2.8-2.8V10c0-2-1-3.3-3.2-3" />
    </svg>
);

const OneTwoIcon = () => (
    <div className="border border-current rounded px-0.5 py-0.25 text-[10px] font-black scale-90 opacity-40">12</div>
);

export function AssetForm({ 
    isOpen, 
    onOpenChange, 
    asset, 
    onSave, 
    isReadOnly: initialIsReadOnly, 
    defaultCategory,
    onNext,
    onPrevious
}: AssetFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { userProfile } = useAuth();
  const { appSettings, setAppSettings, dataSource, activeGrantId, assets: cloudAssets, offlineAssets, globalStateFilters } = useAppState();
  const isAdmin = userProfile?.isAdmin || false;
  
  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    mode: 'onChange',
  });
  
  const currentCategory = form.watch('category');
  const watchedStatus = form.watch('verifiedStatus') as 'Verified' | 'Unverified';

  const grant = useMemo(() => {
    return appSettings?.grants?.find(g => g.id === activeGrantId);
  }, [appSettings, activeGrantId]);
  
  const sheetDefinition = useMemo(() => {
    if (!currentCategory || !grant?.sheetDefinitions) return null;
    return grant.sheetDefinitions[currentCategory];
  }, [currentCategory, grant]);

  useEffect(() => {
    if (isOpen) {
        const defaultValues: AssetFormValues = {};
        if (asset) {
            Object.keys(asset).forEach(key => {
                const k = key as keyof Asset;
                defaultValues[k] = String(asset[k] ?? '');
            });
            if (!defaultValues.verifiedStatus) defaultValues.verifiedStatus = 'Unverified';
            
            if (!defaultValues.location) {
              if (globalStateFilters.length > 0 && globalStateFilters[0] !== 'All') {
                  defaultValues.location = globalStateFilters[0];
              }
            }
        } else {
            defaultValues.verifiedStatus = 'Unverified';
            if (globalStateFilters.length > 0 && globalStateFilters[0] !== 'All') {
              defaultValues.location = globalStateFilters[0];
            }
            if (defaultCategory) defaultValues.category = defaultCategory;
        }
        form.reset(defaultValues);
    }
  }, [isOpen, asset, form, defaultCategory, globalStateFilters]);

  const onSubmit = async (data: AssetFormValues) => {
    setIsSaving(true);
    try {
        const assetToSave: Asset = sanitizeForFirestore({
            id: asset?.id ?? crypto.randomUUID(),
            grantId: activeGrantId || undefined,
            ...(asset || {}),
            ...data,
        } as Asset);
        await onSave(assetToSave);
        onOpenChange(false);
    } catch (e) {
    } finally {
        setIsSaving(false);
    }
  };

  const handleSaveColumnLayout = async (originalName: string | null, newDefinition: SheetDefinition, applyToAll: boolean) => {
    if (!isAdmin || !appSettings || !userProfile || !grant) return;
    const newSheetDefinitions = { ...grant.sheetDefinitions };
    if (applyToAll) {
        Object.keys(newSheetDefinitions).forEach(sn => {
            newSheetDefinitions[sn] = { ...newSheetDefinitions[sn], displayFields: newDefinition.displayFields.map(f => ({ ...f })), headers: newDefinition.headers };
        });
    } else if (originalName) newSheetDefinitions[originalName] = newDefinition;

    const settings: AppSettings = { 
        ...appSettings, 
        grants: appSettings.grants.map(g => g.id === activeGrantId ? { ...g, sheetDefinitions: newSheetDefinitions } : g), 
        lastModified: new Date().toISOString(), 
        lastModifiedBy: { displayName: userProfile.displayName, loginName: userProfile.loginName } 
    };
    
    await saveLocalSettings(settings);
    setAppSettings(settings);
    try { await updateSettingsFS(settings); } catch (e) {}
  };
  
    const renderField = (field: DisplayField) => {
        const fieldName = field.key as keyof AssetFormValues;
        let disabled = initialIsReadOnly;
        
        if (fieldName === 'verifiedDate') disabled = true;
        if (fieldName === 'location' && !isAdmin) disabled = true; 
        if (fieldName === 'category' && (!!asset?.id || (!!defaultCategory && !asset?.id))) disabled = true;

        const isNumeric = ['sn', 'assetIdCode', 'serialNumber', 'modelNumber', 'usefulLifeYears', 'qty', 'imei', 'remarks'].includes(fieldName);
        const isFinancial = ['costNgn', 'costUsd', 'cost'].includes(fieldName);
        
        let component;
        switch(fieldName) {
            case 'category':
                const categoryOptions = grant?.sheetDefinitions ? Object.keys(grant.sheetDefinitions) : [];
                component = (
                     <Select onValueChange={form.setValue.bind(form, fieldName)} value={form.getValues(fieldName)} disabled={disabled}>
                        <FormControl><SelectTrigger className="border-none bg-transparent p-0 h-auto font-bold text-base focus:ring-0 shadow-none"><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                        <SelectContent>{categoryOptions.map(sheet => <SelectItem key={sheet} value={sheet}>{sheet}</SelectItem>)}</SelectContent>
                    </Select>
                );
                break;
            case 'condition':
                 component = (
                    <Select onValueChange={form.setValue.bind(form, fieldName)} value={form.getValues(fieldName)} disabled={disabled}>
                        <FormControl><SelectTrigger className="border-none bg-transparent p-0 h-auto font-bold text-base focus:ring-0 shadow-none"><SelectValue placeholder="Select condition" /></SelectTrigger></FormControl>
                        <SelectContent>{ASSET_CONDITIONS.map(cond => <SelectItem key={cond} value={cond}>{cond}</SelectItem>)}</SelectContent>
                    </Select>
                );
                break;
            case 'verifiedStatus':
                component = (
                    <Select onValueChange={form.setValue.bind(form, fieldName)} value={form.getValues(fieldName)} disabled={disabled}>
                        <FormControl><SelectTrigger className={cn("border-none bg-transparent p-0 h-auto font-bold text-base focus:ring-0 shadow-none", getStatusClasses(watchedStatus))}><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="Unverified">Unverified</SelectItem>
                            <SelectItem value="Verified">Verified</SelectItem>
                        </SelectContent>
                    </Select>
                );
                break;
            case 'remarks':
                 component = <FormControl><Textarea {...form.register(fieldName)} readOnly={disabled} className="border-none bg-transparent p-0 min-h-[40px] h-auto font-bold text-base focus-visible:ring-0 shadow-none resize-none" /></FormControl>;
                 break;
            default:
                 component = <FormControl><Input {...form.register(fieldName)} readOnly={disabled} className="border-none bg-transparent p-0 h-auto font-bold text-base focus-visible:ring-0 shadow-none" /></FormControl>;
        }
        
        return (
            <div key={fieldName} className="px-6 py-4 border-b border-border/40 group last:border-0">
                <div className="flex justify-between items-center">
                    <div className="flex-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                            {field.label}
                        </span>
                        <div className="flex items-center">
                            {component}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isNumeric && <OneTwoIcon />}
                        {isFinancial && <FxIcon />}
                    </div>
                </div>
            </div>
        );
    };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl w-full flex flex-col h-[100vh] sm:h-[90vh] p-0 overflow-hidden rounded-none sm:rounded-3xl border-none shadow-2xl bg-background">
          {/* Custom Header matching mobile design */}
          <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-20">
              <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full">
                      <ArrowLeft className="h-6 w-6" />
                  </Button>
                  <DialogTitle className="text-xl font-black tracking-tight">{asset?.sn || 'NEW ENTRY'}</DialogTitle>
              </div>
              <div className="flex items-center gap-4">
                  {asset?.sourceRow && (
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-muted text-muted-foreground">Row {asset.sourceRow}</Badge>
                  )}
                  <Button variant="ghost" size="icon" className="rounded-full opacity-40 hover:opacity-100 hover:bg-primary/10 hover:text-primary transition-all"><Share2 className="h-5 w-5" /></Button>
                  <Button variant="ghost" size="icon" className="rounded-full opacity-40 hover:opacity-100 hover:bg-primary/10 hover:text-primary transition-all"><MoreVertical className="h-5 w-5" /></Button>
              </div>
          </div>

          <ScrollArea className="flex-1 bg-background">
              <Form {...form}>
                <form id="asset-form" onSubmit={form.handleSubmit(onSubmit)}>
                    {!sheetDefinition ? (
                        <div className="p-8 text-center space-y-4">
                            <div className="p-6 bg-muted/20 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                                <FileJson className="h-10 w-10 text-muted-foreground/40" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight">Definition Required</h3>
                                <p className="text-xs text-muted-foreground font-medium mt-1">Please configure a category schema before editing.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {sheetDefinition.displayFields.map(field => renderField(field))}
                        </div>
                    )}

                    {asset && (
                        <div className="px-6 py-8 bg-muted/5 space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Registry Context & Traceability</h4>
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="traceability" className="border-none">
                                    <AccordionTrigger className="hover:no-underline p-5 bg-background border-2 rounded-2xl shadow-sm transition-all hover:border-primary/20 group">
                                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                                            <Info className="h-4 w-4 text-primary" /> Audit Metadata
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-4 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-background border-2 rounded-2xl">
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 opacity-60">Major Section</p>
                                                <p className="text-xs font-black">{asset.majorSection || 'MAIN REGISTER'}</p>
                                            </div>
                                            <div className="p-4 bg-background border-2 rounded-2xl">
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 opacity-60">Addition Year</p>
                                                <p className="text-xs font-black">{asset.yearBucket || 'BASE'}</p>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-muted/10 border-2 border-dashed rounded-2xl flex items-center gap-3">
                                            <Clock className="h-4 w-4 text-muted-foreground/40" />
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Last Modification Pulse</span>
                                                <span className="text-[10px] font-bold">{asset.lastModified ? formatDistanceToNow(new Date(asset.lastModified), { addSuffix: true }) : 'INITIAL REGISTRATION'} by {asset.lastModifiedBy || 'SYSTEM'}</span>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>
                    )}
                </form>
              </Form>
          </ScrollArea>
          
          <div className="grid grid-cols-2 border-t bg-background shadow-2xl">
              <Button 
                variant="ghost" 
                className="h-16 font-black uppercase text-[11px] tracking-[0.2em] text-primary rounded-none border-r hover:bg-primary/5 transition-all"
                onClick={onPrevious}
                disabled={!onPrevious}
              >
                  Previous
              </Button>
              <Button 
                variant="ghost" 
                className="h-16 font-black uppercase text-[11px] tracking-[0.2em] text-primary rounded-none hover:bg-primary/5 transition-all"
                onClick={onNext}
                disabled={!onNext}
              >
                  Next
              </Button>
          </div>

          {!initialIsReadOnly && (
              <div className="p-6 bg-muted/10 border-t flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-bold px-6">Discard</Button>
                  <Button type="submit" form="asset-form" disabled={isSaving} className="h-12 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 px-8 rounded-xl">
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                      Commit Record
                  </Button>
              </div>
          )}
        </DialogContent>
      </Dialog>

      {sheetDefinition && (
        <ColumnCustomizationSheet 
            isOpen={isColumnSheetOpen} 
            onOpenChange={setIsColumnSheetOpen} 
            sheetDefinition={sheetDefinition} 
            originalSheetName={currentCategory || null} 
            onSave={handleSaveColumnLayout} 
        />
      )}
    </>
  );
}
