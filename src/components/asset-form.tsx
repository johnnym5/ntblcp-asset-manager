
"use client";

import React, { useEffect, useState } from "react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Asset } from "@/lib/types";
import { AlertCircle, Loader2, FileText, Check } from "lucide-react";
import { TARGET_SHEETS } from "@/lib/constants";
import { AssetChecklist } from "./asset-checklist";
import { useAuth } from "@/contexts/auth-context";
import { addNotification } from "@/hooks/use-notifications";
import { Label } from "./ui/label";

const assetFormSchema = z.object({
  category: z.string({ required_error: "Please select a category." }),
  description: z.string().min(1, "Description is required."),
  serialNumber: z.string().optional(),
  location: z.string().optional(),
  condition: z.string().optional(),
  remarks: z.string().optional(),
  assignee: z.string().optional(),
  verifiedStatus: z.string().optional(),
  verifiedDate: z.string().optional(),
  lga: z.string().optional(),
  assetIdCode: z.string().optional(),
  manufacturer: z.string().optional(),
  // Advanced Fields
  assetClass: z.string().optional(),
  modelNumber: z.string().optional(),
  supplier: z.string().optional(),
  dateReceived: z.string().optional(),
  grant: z.string().optional(),
  chasisNo: z.string().optional(),
  engineNo: z.string().optional(),
});

export type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AssetFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  asset?: Asset;
  onSave: (assetToSave: Asset) => Promise<void>;
  onQuickSave: (assetId: string, data: { remarks?: string; verifiedStatus?: 'Verified' | 'Unverified' | 'Discrepancy'; verifiedDate?: string; }) => Promise<void>;
  isReadOnly: boolean;
}

const ReadOnlyField = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{value ?? <span className="text-muted-foreground/70">N/A</span>}</p>
    </div>
);


export function AssetForm({ isOpen, onOpenChange, asset, onSave, onQuickSave, isReadOnly }: AssetFormProps) {
  const [quickViewRemarks, setQuickViewRemarks] = useState('');
  const [quickViewStatus, setQuickViewStatus] = useState<'Verified' | 'Unverified' | 'Discrepancy'>('Unverified');
  const [isQuickSaving, setIsQuickSaving] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.isAdmin || false;
  
  const defaultValues = {
    category: '',
    description: '',
    serialNumber: '',
    location: userProfile?.state || '',
    condition: '',
    remarks: '',
    assignee: '',
    verifiedStatus: 'Unverified',
    verifiedDate: '',
    lga: '',
    assetIdCode: '',
    manufacturer: '',
    assetClass: '',
    modelNumber: '',
    supplier: '',
    dateReceived: '',
    grant: '',
    chasisNo: '',
    engineNo: '',
  };

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: asset ? { ...asset, verifiedStatus: asset.verifiedStatus || 'Unverified' } : defaultValues,
    mode: 'onChange',
  });
  
  const watchedValues = form.watch();

  useEffect(() => {
    if (isOpen) {
      if (asset) {
        setQuickViewRemarks(asset.remarks || '');
        setQuickViewStatus(asset.verifiedStatus || 'Unverified');
        
        form.reset({
          ...defaultValues,
          ...asset,
          location: asset.location || userProfile?.state || '',
          verifiedStatus: asset.verifiedStatus || 'Unverified',
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [isOpen, asset, form, userProfile]);
  
  const watchedStatusInForm = form.watch('verifiedStatus');
  useEffect(() => {
    if (watchedStatusInForm === 'Verified' && !form.getValues('verifiedDate')) {
        form.setValue('verifiedDate', new Date().toLocaleDateString('en-CA'));
    } else if (watchedStatusInForm !== 'Verified' && !isReadOnly) {
        form.setValue('verifiedDate', '');
    }
  }, [watchedStatusInForm, form, isReadOnly]);


  const handleQuickSaveClick = async () => {
    if (!asset) return;
    setIsQuickSaving(true);
    try {
      const verifiedDate = quickViewStatus === 'Verified' ? new Date().toLocaleDateString('en-CA') : '';
      await onQuickSave(asset.id, {
        remarks: quickViewRemarks,
        verifiedStatus: quickViewStatus,
        verifiedDate,
      });
      addNotification({ title: "Saved", description: "Your changes have been saved locally." });
    } catch(e) {
      addNotification({ title: "Error", description: "Could not save changes.", variant: "destructive" });
    } finally {
      setIsQuickSaving(false);
    }
  }

  const onSubmit = async (data: AssetFormValues) => {
    setIsSaving(true);
    try {
        const assetToSave: Asset = {
            id: asset?.id || crypto.randomUUID(),
            ...asset,
            ...data,
        };
        await onSave(assetToSave);
        onOpenChange(false);
    } catch (e) {
        // Error toast is handled by the caller
    } finally {
        setIsSaving(false);
    }
  };
  
  // RENDER LOGIC
  if (isReadOnly && asset) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl w-full flex flex-col">
          <SheetHeader>
            <SheetTitle>Asset Quick View</SheetTitle>
            <SheetDescription>
              Viewing asset details. Comments and status can be updated here.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-6 overflow-y-auto pr-6 py-4">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ReadOnlyField label="S/N" value={asset.sn} />
                    <ReadOnlyField label="LGA" value={asset.lga} />
                </div>
                <ReadOnlyField label="Asset ID Code" value={asset.assetIdCode} />
                <ReadOnlyField label="Assignee" value={asset.assignee} />
                <ReadOnlyField label="Asset Description" value={asset.description} />
                
                <div className="pt-4">
                     <div className="space-y-2">
                        <Label htmlFor="quick-view-status">Verified Status</Label>
                        <Select onValueChange={(value) => setQuickViewStatus(value as any)} value={quickViewStatus}>
                            <SelectTrigger id="quick-view-status" className="w-full">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Unverified"><div className="flex items-center"><FileText className="mr-2 h-4 w-4"/>Unverified</div></SelectItem>
                                <SelectItem value="Verified"><div className="flex items-center"><Check className="mr-2 h-4 w-4"/>Verified</div></SelectItem>
                                <SelectItem value="Discrepancy"><div className="flex items-center"><AlertCircle className="mr-2 h-4 w-4"/>Discrepancy</div></SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="quick-view-remarks">Remarks/Comments</Label>
                    <Textarea
                      id="quick-view-remarks"
                      value={quickViewRemarks}
                      onChange={(e) => setQuickViewRemarks(e.target.value)}
                      className="min-h-24"
                    />
                </div>
                
                <Button onClick={handleQuickSaveClick} disabled={isQuickSaving}>
                    {isQuickSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Comments & Status
                </Button>
            </div>
            
            <Accordion type="single" collapsible className="w-full pt-4">
                <AccordionItem value="advanced">
                    <AccordionTrigger>Full Asset Details</AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <ReadOnlyField label="Location" value={asset.location} />
                           <ReadOnlyField label="Asset Class" value={asset.assetClass} />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ReadOnlyField label="Manufacturer" value={asset.manufacturer} />
                            <ReadOnlyField label="Model Number" value={asset.modelNumber} />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ReadOnlyField label="Serial Number" value={asset.serialNumber} />
                            <ReadOnlyField label="Condition" value={asset.condition} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ReadOnlyField label="Engine Number" value={asset.engineNo} />
                            <ReadOnlyField label="Chasis Number" value={asset.chasisNo} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ReadOnlyField label="Supplier" value={asset.supplier} />
                            <ReadOnlyField label="Grant" value={asset.grant} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ReadOnlyField label="Date Received" value={asset.dateReceived ? String(asset.dateReceived) : null} />
                            <ReadOnlyField label="Verified Date" value={asset.verifiedDate} />
                        </div>
                         <ReadOnlyField label="Last Modified" value={asset.lastModified ? new Date(asset.lastModified).toLocaleString() : null} />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
          </div>
          <SheetFooter className="mt-auto pt-4 border-t">
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-4xl w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>{asset ? `Edit Asset` : 'Add New Asset'}</SheetTitle>
          <SheetDescription>
            {asset ? 'Edit the details of the asset.' : 'Fill in the details for the new asset.'}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto pr-4 py-4">
          <div className="md:col-span-2">
            <Form {...form}>
              <form
                id="asset-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 p-1"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!!asset}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TARGET_SHEETS.map(sheet => (
                              <SelectItem key={sheet} value={sheet}>{sheet}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Description</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                  )} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <FormField control={form.control} name="serialNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="assetIdCode" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Asset ID Code</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                  )} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl><Input {...field} disabled={!isAdmin} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                   <FormField control={form.control} name="lga" render={({ field }) => (
                        <FormItem>
                            <FormLabel>LGA</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <FormField control={form.control} name="assignee" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="condition" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condition</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                    )} />
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="manufacturer" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Manufacturer</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="modelNumber" render={({ field }) => (
                        <FormItem><FormLabel>Model Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="assetClass" render={({ field }) => (
                        <FormItem><FormLabel>Asset Class</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField
                      control={form.control}
                      name="verifiedStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verified Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Unverified"><div className="flex items-center"><FileText className="mr-2 h-4 w-4"/>Unverified</div></SelectItem>
                              <SelectItem value="Verified"><div className="flex items-center"><Check className="mr-2 h-4 w-4"/>Verified</div></SelectItem>
                              <SelectItem value="Discrepancy"><div className="flex items-center"><AlertCircle className="mr-2 h-4 w-4"/>Discrepancy</div></SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>

                <FormField control={form.control} name="remarks" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks/Comments</FormLabel>
                    <FormControl><Textarea {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Accordion type="single" collapsible className="w-full pt-4">
                  <AccordionItem value="advanced">
                    <AccordionTrigger>Advanced Information</AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <FormField control={form.control} name="engineNo" render={({ field }) => (
                                <FormItem><FormLabel>Engine Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                           <FormField control={form.control} name="chasisNo" render={({ field }) => (
                                <FormItem><FormLabel>Chasis Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <FormField control={form.control} name="supplier" render={({ field }) => (
                                <FormItem><FormLabel>Supplier</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="grant" render={({ field }) => (
                                <FormItem><FormLabel>Grant</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <FormField control={form.control} name="dateReceived" render={({ field }) => (
                                <FormItem><FormLabel>Date Received</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                           <ReadOnlyField label="Last Modified" value={asset?.lastModified ? new Date(asset.lastModified).toLocaleString() : null} />
                        </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
              </form>
            </Form>
          </div>
          <div className="md:col-span-1 space-y-6">
            <AssetChecklist values={watchedValues} />
          </div>
        </div>
        <SheetFooter className="mt-auto pt-4 border-t">
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
          <Button type="submit" form="asset-form" disabled={isSaving || !form.formState.isValid}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
