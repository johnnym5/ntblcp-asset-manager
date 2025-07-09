
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { v4 as uuidv4 } from 'uuid';
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
import { AlertCircle, Loader2, Sparkles, Upload, FileText, Check } from "lucide-react";
import { TARGET_SHEETS } from "@/lib/constants";
import { AssetChecklist } from "./asset-checklist";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { validateAssetLabel } from "@/ai/flows/ocr-asset-validation";
import { addNotification } from "@/hooks/use-notifications";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
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

export function AssetForm({ isOpen, onOpenChange, asset, onSave, onQuickSave, isReadOnly }: AssetFormProps) {
  // --- State for Quick View ---
  const [quickViewRemarks, setQuickViewRemarks] = useState('');
  const [quickViewStatus, setQuickViewStatus] = useState<'Verified' | 'Unverified' | 'Discrepancy'>('Unverified');
  const [isQuickSaving, setIsQuickSaving] = useState(false);

  // --- State for Full Form ---
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<Record<string, any> | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.displayName?.toLowerCase().trim() === 'admin';
  
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

  // --- Effects ---
  useEffect(() => {
    if (isOpen) {
      if (asset) {
        // Sync state for quick view when sheet opens
        setQuickViewRemarks(asset.remarks || '');
        setQuickViewStatus(asset.verifiedStatus || 'Unverified');
        
        // Reset full form as well
        form.reset({
          ...defaultValues,
          ...asset,
          location: asset.location || userProfile?.state || '',
          verifiedStatus: asset.verifiedStatus || 'Unverified',
        });
      } else {
        // Reset for new asset form
        form.reset(defaultValues);
      }
      // Reset scanner state
      setScanResult(null);
      setScanError(null);
    }
  }, [isOpen, asset, form, userProfile]);
  
  const watchedStatusInForm = form.watch('verifiedStatus');
  useEffect(() => {
    if (watchedStatusInForm === 'Verified' && !form.getValues('verifiedDate')) {
        form.setValue('verifiedDate', new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD
    } else if (watchedStatusInForm !== 'Verified' && !isReadOnly) {
        form.setValue('verifiedDate', '');
    }
  }, [watchedStatusInForm, form, isReadOnly]);


  // --- Handlers ---
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleScan(file);
    }
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleScan = async (file: File) => {
    setIsScanning(true);
    setScanResult(null);
    setScanError(null);
    addNotification({ title: 'AI Scan Started', description: 'Analyzing the asset label...' });

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const photoDataUri = reader.result as string;
        const result = await validateAssetLabel({
          photoDataUri,
          currentValues: form.getValues(),
        });

        if (result.extractedData && Object.keys(result.extractedData).length > 0) {
            setScanResult(result.extractedData);
            addNotification({ title: 'Scan Complete', description: 'AI has extracted data from the image.' });
        } else {
            setScanError('The AI could not extract any relevant data from the image. Please try another image or enter the data manually.');
            addNotification({ title: 'Scan Inconclusive', description: 'No data could be extracted.', variant: 'destructive' });
        }
      };
      reader.onerror = (error) => {
        throw new Error('Failed to read file for scanning.');
      };
    } catch (e: any) {
      setScanError(`An error occurred during the AI scan: ${e.message}`);
      addNotification({ title: 'AI Scan Failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsScanning(false);
    }
  };
  
  const applySuggestions = () => {
      if (!scanResult) return;
      
      const formFields = Object.keys(form.getValues()) as (keyof AssetFormValues)[];
      let appliedCount = 0;
      
      for(const key in scanResult) {
          const formKey = formFields.find(field => field.toLowerCase() === key.toLowerCase() || key.toLowerCase().includes(field.toLowerCase()));
          if (formKey) {
              form.setValue(formKey, scanResult[key], { shouldValidate: true, shouldDirty: true });
              appliedCount++;
          }
      }
      
      addNotification({ title: 'Suggestions Applied', description: `Applied ${appliedCount} fields from the AI scan.` });
      setScanResult(null);
  }

  const onSubmit = async (data: AssetFormValues) => {
    setIsSaving(true);
    try {
        const assetToSave: Asset = {
            id: asset?.id || uuidv4(),
            ...asset,
            ...data,
            syncStatus: 'local',
        };
        await onSave(assetToSave);
        onOpenChange(false);
    } catch (e) {
        // Error toast is handled by the caller
    } finally {
        setIsSaving(false);
    }
  };
  
  // --- RENDER LOGIC ---

  if (isReadOnly && asset) {
    // --- QUICK VIEW RENDER ---
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">S/N</p>
                    <p>{asset.sn || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">Asset ID</p>
                    <p>{asset.assetIdCode || 'N/A'}</p>
                </div>
                <div className="col-span-1 md:col-span-2 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">Asset Description</p>
                    <p>{asset.description || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">Serial Number</p>
                    <p>{asset.serialNumber || 'N/A'}</p>
                </div>
                 <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">Model Number</p>
                    <p>{asset.modelNumber || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">Manufacturer</p>
                    <p>{asset.manufacturer || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">Asset Class</p>
                    <p>{asset.assetClass || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">Location</p>
                    <p>{asset.location || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">LGA</p>
                    <p>{asset.lga || 'N/A'}</p>
                </div>
                 <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">Assignee</p>
                    <p>{asset.assignee || 'N/A'}</p>
                </div>
                {(asset.category === 'MOTORCYCLES-C19RM' || asset.category === 'Vehicles-TB (IHVN)') && (
                    <>
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground">Chasis Number</p>
                            <p>{asset.chasisNo || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground">Engine Number</p>
                            <p>{asset.engineNo || 'N/A'}</p>
                        </div>
                    </>
                )}
            </div>
            
            <div className="space-y-4 border-t pt-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="quick-view-status">Verified Status</Label>
                        <Select onValueChange={(value) => setQuickViewStatus(value as any)} value={quickViewStatus}>
                            <SelectTrigger id="quick-view-status">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Unverified"><div className="flex items-center"><FileText className="mr-2 h-4 w-4"/>Unverified</div></SelectItem>
                                <SelectItem value="Verified"><div className="flex items-center"><Check className="mr-2 h-4 w-4"/>Verified</div></SelectItem>
                                <SelectItem value="Discrepancy"><div className="flex items-center"><AlertCircle className="mr-2 h-4 w-4"/>Discrepancy</div></SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Last Modified</Label>
                        <p className="text-sm pt-2 text-muted-foreground">{asset.lastModified ? new Date(asset.lastModified).toLocaleString() : 'N/A'}</p>
                    </div>
                 </div>
                <div className="space-y-2">
                    <Label htmlFor="quick-view-remarks">Remarks/Comments</Label>
                    <Textarea id="quick-view-remarks" value={quickViewRemarks} onChange={(e) => setQuickViewRemarks(e.target.value)} rows={5} />
                </div>
                <Button onClick={handleQuickSaveClick} disabled={isQuickSaving}>
                    {isQuickSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Comments & Status
                </Button>
            </div>
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

  // --- FULL EDIT/ADD FORM RENDER ---
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
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl><Input {...field} disabled={!isAdmin} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <FormField control={form.control} name="condition" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
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
                            <FormField control={form.control} name="assignee" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Assignee</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
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
                            <FormField control={form.control} name="assetIdCode" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Asset ID Code</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="manufacturer" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Manufacturer</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="assetClass" render={({ field }) => (
                                <FormItem><FormLabel>Asset Class</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="modelNumber" render={({ field }) => (
                                <FormItem><FormLabel>Model Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
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
                           <div className="space-y-2">
                                <Label>Last Modified</Label>
                                <p className="text-sm text-muted-foreground h-10 flex items-center">{asset?.lastModified ? new Date(asset.lastModified).toLocaleString() : 'N/A'}</p>
                           </div>
                        </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
              </form>
            </Form>
          </div>
          <div className="md:col-span-1 space-y-6">
            <AssetChecklist values={watchedValues} />
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary" />
                        AI Document Scanner
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isScanning}
                    >
                        {isScanning ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Upload className="mr-2 h-4 w-4" />
                        )}
                        Scan Asset Label Image
                    </Button>
                    {scanError && (
                         <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Scan Error</AlertTitle>
                            <AlertDescription>{scanError}</AlertDescription>
                        </Alert>
                    )}
                    {scanResult && (
                        <div className="space-y-3 rounded-md border p-4">
                            <h4 className="font-medium">AI Suggestions:</h4>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                {Object.entries(scanResult).map(([key, value]) => (
                                    <li key={key}><strong>{key}:</strong> {String(value)}</li>
                                ))}
                            </ul>
                            <Button className="w-full" size="sm" onClick={applySuggestions}>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Apply Suggestions
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
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
