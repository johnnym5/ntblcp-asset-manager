
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
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
import { Loader2, FileText, Check } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useAppState } from "@/contexts/app-state-context";
import { cn, getStatusClasses } from "@/lib/utils";

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
}

export function AssetForm({ isOpen, onOpenChange, asset, onSave, isReadOnly: initialIsReadOnly }: AssetFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { userProfile } = useAuth();
  const { appSettings, dataSource } = useAppState();
  const isAdmin = userProfile?.isAdmin || false;
  
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    mode: 'onChange',
  });
  
  const currentCategory = form.watch('category');
  const watchedStatus = form.watch('verifiedStatus') as 'Verified' | 'Unverified';
  
  const sheetDefinition = useMemo(() => {
    if (!currentCategory) return null;
    return appSettings.sheetDefinitions[currentCategory];
  }, [currentCategory, appSettings.sheetDefinitions]);

  useEffect(() => {
    if (isOpen) {
        const defaultValues: AssetFormValues = {};
        if (asset) {
            Object.keys(asset).forEach(key => {
                const k = key as keyof Asset;
                defaultValues[k] = String(asset[k] ?? '');
            });
            if (!defaultValues.verifiedStatus) defaultValues.verifiedStatus = 'Unverified';
            if (!defaultValues.location && userProfile?.state) defaultValues.location = userProfile.state;
        } else {
             if (userProfile?.state) defaultValues.location = userProfile.state;
             defaultValues.verifiedStatus = 'Unverified';
        }
        form.reset(defaultValues);
    }
  }, [isOpen, asset, form, userProfile]);
  
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
        const assetToSave: Asset = {
            id: asset?.id ?? crypto.randomUUID(),
            ...(asset || {}),
            ...data,
        } as Asset;
        await onSave(assetToSave);
        onOpenChange(false);
    } catch (e) {
        // Error toast is handled by the caller
    } finally {
        setIsSaving(false);
    }
  };
  
    const renderField = (field: DisplayField) => {
        const fieldName = field.key as keyof AssetFormValues;
        
        let disabled = initialIsReadOnly;
        const isVerificationField = ['verifiedStatus', 'remarks', 'condition'].includes(fieldName);

        if (!disabled) { // Only apply locks if the form is in edit mode
            if (isAdmin) {
                // Admin is locked on cloud source based on settings
                if (appSettings.lockAssetList && dataSource === 'cloud') {
                    if (appSettings.appMode === 'verification') {
                        // In verification mode, only allow editing verification fields.
                        if (!isVerificationField) {
                            disabled = true;
                        }
                    } else {
                        // In management mode, lock everything.
                        disabled = true;
                    }
                }
            } else { // Non-admin logic is simpler
                if (appSettings.appMode === 'management') {
                    disabled = true; // Non-admins are always locked in management mode.
                } else if (appSettings.appMode === 'verification') {
                    // Non-admins can only edit verification fields in verification mode.
                    if (!isVerificationField) {
                        disabled = true;
                    }
                }
            }
        }

        // --- Final hardcoded locks ---
        // These override any logic above.
        if (fieldName === 'verifiedDate') {
            disabled = true; // Always auto-set based on status.
        }
        // Non-admins can never change location directly in the form.
        if (fieldName === 'location' && !isAdmin) {
            disabled = true; 
        }
        // Category of an existing asset cannot be changed.
        if (fieldName === 'category' && !!asset) {
            disabled = true;
        }
        
        let component;
        switch(fieldName) {
            case 'category':
                component = (
                     <Select onValueChange={form.setValue.bind(form, fieldName)} value={form.getValues(fieldName)} disabled={disabled}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {Object.keys(appSettings.sheetDefinitions).map(sheet => (
                            <SelectItem key={sheet} value={sheet}>{sheet}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
                break;
            case 'condition':
                 component = (
                    <Select onValueChange={form.setValue.bind(form, fieldName)} value={form.getValues(fieldName)} disabled={disabled}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="New">New</SelectItem>
                            <SelectItem value="Used- good condition">Used- good condition</SelectItem>
                            <SelectItem value="Used but in good working condition">Used but in good working condition</SelectItem>
                            <SelectItem value="Used but requires occasional repair">Used but requires occasional repair</SelectItem>
                            <SelectItem value="Used but in poor condition">Used but in poor condition</SelectItem>
                            <SelectItem value="Bad condition">Bad condition</SelectItem>
                            <SelectItem value="F2: Major repairs required-poor condition">F2: Major repairs required-poor condition</SelectItem>
                            <SelectItem value="Unsalvageable">Unsalvageable</SelectItem>
                            <SelectItem value="Burnt">Burnt</SelectItem>
                            <SelectItem value="Stolen">Stolen</SelectItem>
                            <SelectItem value="Obsolete">Obsolete</SelectItem>
                            <SelectItem value="Insurance settlement">Insurance settlement</SelectItem>
                            <SelectItem value="Writeoff">Writeoff</SelectItem>
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
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-4xl w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>{asset ? (initialIsReadOnly ? 'View Asset Details' : 'Edit Asset') : 'Add New Asset'}</SheetTitle>
          <SheetDescription>
            {initialIsReadOnly ? 'Viewing asset details.' : (asset ? 'Edit the details of the asset.' : 'Fill in the details for the new asset.')}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto pr-4 py-4">
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
        </div>
        <SheetFooter className="mt-auto pt-4 border-t">
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
          {!initialIsReadOnly && (
            <Button type="submit" form="asset-form" disabled={isSaving || !form.formState.isValid}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
