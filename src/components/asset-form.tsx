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
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import type { Asset, SheetDefinition, DisplayField } from "@/lib/types";
import { Loader2, FileText, Check, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useAppState } from "@/contexts/app-state-context";
import { cn, getStatusClasses, sanitizeForFirestore } from "@/lib/utils";
import { AssetChecklist } from "./asset-checklist";
import { ScrollArea } from "./ui/scroll-area";
import { ASSET_CONDITIONS } from "@/lib/constants";

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
}

export function AssetForm({ isOpen, onOpenChange, asset, onSave, isReadOnly: initialIsReadOnly, defaultCategory }: AssetFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { userProfile } = useAuth();
  const { appSettings, dataSource, activeGrantId, assets: cloudAssets, offlineAssets, globalStateFilter } = useAppState();
  const isAdmin = userProfile?.isAdmin || false;
  
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
              if (globalStateFilter && globalStateFilter !== 'All') {
                  defaultValues.location = globalStateFilter;
              } else if (userProfile?.states && userProfile.states.length === 1 && userProfile.states[0] !== 'All') {
                  defaultValues.location = userProfile.states[0];
              }
            }
        } else {
            defaultValues.verifiedStatus = 'Unverified';

            if (globalStateFilter && globalStateFilter !== 'All') {
              defaultValues.location = globalStateFilter;
            } else if (userProfile?.states && userProfile.states.length === 1 && userProfile.states[0] !== 'All') {
                defaultValues.location = userProfile.states[0];
            }
            
            if (defaultCategory) {
              defaultValues.category = defaultCategory;
              
              const allCurrentAssets = dataSource === 'cloud' ? cloudAssets : offlineAssets;
              const categoryAssets = allCurrentAssets.filter(a => a.category === defaultCategory);

              if (categoryAssets.length > 0) {
                  const currentSheetDef = grant?.sheetDefinitions?.[defaultCategory];
                  if (currentSheetDef) {
                      const excludedKeys = new Set<string>([
                          'id', 'category', 'sn', 'serialNumber', 'assetIdCode', 'assignee', 'location', 'lga', 'site',
                          'verifiedStatus', 'verifiedDate', 'syncStatus', 'lastModified', 'lastModifiedBy', 'lastModifiedByState',
                          'previousState', 'approvalStatus', 'pendingChanges', 'changeSubmittedBy'
                      ]);

                      const fieldsToConsider = currentSheetDef.displayFields
                          .map(f => f.key)
                          .filter(key => !excludedKeys.has(key));
                      
                      fieldsToConsider.forEach(fieldKey => {
                          const values = categoryAssets.map(a => a[fieldKey as keyof Asset]).filter(val => val !== null && val !== undefined && String(val).trim() !== '');
                          if (values.length > 0) {
                              const valueCounts = values.reduce((acc, value) => {
                                  const v = String(value).trim();
                                  acc[v] = (acc[v] || 0) + 1;
                                  return acc;
                              }, {} as Record<string, number>);

                              const mostCommon = Object.entries(valueCounts).sort((a, b) => b[1] - a[1])[0];
                              
                              if (mostCommon && (mostCommon[1] / categoryAssets.length > 0.5)) {
                                  defaultValues[fieldKey as string] = mostCommon[0];
                              }
                          }
                      });
                  }
              }
            }
        }
        form.reset(defaultValues);
    }
  }, [isOpen, asset, form, userProfile, defaultCategory, globalStateFilter, dataSource, cloudAssets, offlineAssets, grant]);

  const watchedStatusInForm = form.watch('verifiedStatus');
  useEffect(() => {
    if (watchedStatusInForm === 'Verified' && !form.getValues('verifiedDate')) {
        form.setValue('verifiedDate', new Date().toLocaleDateString('en-CA'));
    } else if (watchedStatusInForm !== 'Verified' && !initialIsReadOnly) {
        form.setValue('verifiedDate', '');
    }
  }, [watchedStatusInForm, form, initialIsReadOnly]);


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

  const handleRollback = async () => {
    if (!asset || !asset.previousState) return;

    setIsSaving(true);
    try {
      const rolledBackAsset: Asset = sanitizeForFirestore({
        ...asset,
        ...asset.previousState,
        previousState: undefined,
      });
      await onSave(rolledBackAsset);
      onOpenChange(false);
    } catch (e) {
    } finally {
      setIsSaving(false);
    }
  };
  
    const renderField = (field: DisplayField) => {
        const fieldName = field.key as keyof AssetFormValues;
        
        let disabled = initialIsReadOnly;
        const isVerificationField = ['verifiedStatus', 'remarks', 'condition'].includes(fieldName);

        if (!disabled && appSettings) {
            if (isAdmin) {
                // Admin Lock Logic
                if (appSettings.lockAssetList && dataSource === 'cloud') {
                    if (appSettings.appMode === 'verification') {
                        if (!isVerificationField) {
                            disabled = true;
                        }
                    } else {
                        disabled = true;
                    }
                }
            } else {
                // Non-Admin Permission Logic
                if (!userProfile?.canEditAssets) {
                    disabled = true;
                } else {
                    // Respect the Global List Lock even if user has edit permission
                    if (appSettings.lockAssetList) {
                        // Structural fields are locked if the list is locked.
                        // If in verification mode, only allow verification fields.
                        if (appSettings.appMode === 'verification') {
                            if (!isVerificationField) {
                                disabled = true;
                            }
                        } else {
                            disabled = true; // In management mode, locked means completely read-only
                        }
                    }
                    // If list is NOT locked, user with canEditAssets can edit all structural fields
                    // (Their edits will be routed through the Request/Approval system in the save logic)
                }
            }
        }

        // Hardcoded UI constraints
        if (fieldName === 'verifiedDate') {
            disabled = true;
        }
        if (fieldName === 'location' && !isAdmin) {
            disabled = true; 
        }
        if (fieldName === 'category' && (!!asset?.id || (!!defaultCategory && !asset?.id))) {
            disabled = true;
        }
        
        let component;
        switch(fieldName) {
            case 'category':
                const categoryOptions = grant?.sheetDefinitions ? Object.keys(grant.sheetDefinitions) : [];
                component = (
                     <Select onValueChange={form.setValue.bind(form, fieldName)} value={form.getValues(fieldName)} disabled={disabled}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {categoryOptions.map(sheet => (
                            <SelectItem key={sheet} value={sheet}>{sheet}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
                break;
            case 'location':
                component = <FormControl><Input {...form.register(fieldName)} readOnly={disabled} list="location-datalist" /></FormControl>;
                break;
            case 'condition':
                 component = (
                    <Select onValueChange={form.setValue.bind(form, fieldName)} value={form.getValues(fieldName)} disabled={disabled}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {ASSET_CONDITIONS.map(cond => <SelectItem key={cond} value={cond}>{cond}</SelectItem>)}
                        </SelectContent>
                    </Select>
                );
                break;
            case 'verifiedStatus':
                component = (
                    <Select onValueChange={form.setValue.bind(form, fieldName)} value={form.getValues(fieldName)} disabled={disabled}>
                        <FormControl><SelectTrigger className={cn(getStatusClasses(watchedStatus))}><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="Unverified"><div className="flex items-center"><FileText className="mr-2 h-4 w-4"/>Unverified</div></SelectItem>
                            <SelectItem value="Verified"><div className="flex items-center"><Check className="mr-2 h-4 w-4"/>Verified</div></SelectItem>
                        </SelectContent>
                    </Select>
                );
                break;
            case 'remarks':
                 component = <FormControl><Textarea {...form.register(fieldName)} readOnly={disabled} /></FormControl>;
                 break;
            default:
                 component = <FormControl><Input {...form.register(fieldName)} readOnly={disabled} /></FormControl>;
        }
        
        return (
            <FormField
                key={fieldName}
                control={form.control}
                name={fieldName}
                render={() => (
                <FormItem>
                    <FormLabel>{field.label}</FormLabel>
                    {component}
                    <FormMessage />
                </FormItem>
                )}
            />
        );
    };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-full flex flex-col max-h-[95vh]">
        <DialogHeader>
          <DialogTitle>{asset?.id ? (initialIsReadOnly ? 'View Asset Details' : 'Edit Asset') : 'Add New Asset'}</DialogTitle>
          <DialogDescription>
            {initialIsReadOnly ? 'Viewing asset details.' : (asset?.id ? 'Edit the details of the asset.' : 'Fill in the details for the new asset.')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-x-8 flex-1 overflow-hidden">
            <ScrollArea className="md:col-span-2 pr-4 py-4">
                <datalist id="location-datalist">
                    {(appSettings?.locations || []).map(loc => <option key={loc} value={loc} />)}
                </datalist>
                <Form {...form}>
                  <form
                    id="asset-form"
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4 p-1"
                  >
                   {!sheetDefinition ? (
                        renderField({ key: 'category', label: 'Category', table: false, quickView: false })
                   ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sheetDefinition.displayFields.map(field => renderField(field))}
                        </div>
                   )}
                  </form>
                </Form>
            </ScrollArea>
            <ScrollArea className="hidden md:block md:col-span-1 border-l pl-6 py-4">
                <AssetChecklist values={form.watch()} />
            </ScrollArea>
        </div>
        
        <DialogFooter className="mt-auto pt-4 border-t sm:justify-between">
          {asset?.previousState && !initialIsReadOnly && (
            <Button
              variant="ghost"
              type="button"
              className="text-destructive hover:text-destructive justify-start"
              onClick={handleRollback}
              disabled={isSaving}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Undo Last Change
            </Button>
          )}
          <div className="flex sm:justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            {!initialIsReadOnly && (
              <Button type="submit" form="asset-form" disabled={isSaving || !form.formState.isValid}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
