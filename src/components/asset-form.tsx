
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Asset } from "@/lib/types";
import { AlertCircle, Loader2, Sparkles, Upload } from "lucide-react";
import { TARGET_SHEETS } from "@/lib/constants";
import { AssetChecklist } from "./asset-checklist";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { validateAssetLabel } from "@/ai/flows/ocr-asset-validation";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

const assetFormSchema = z.object({
  category: z.string({ required_error: "Please select a category." }),
  description: z.string().min(1, "Description is required."),
  serialNumber: z.string().optional(),
  location: z.string().optional(),
  condition: z.string().optional(),
  remarks: z.string().optional(),
  assignee: z.string().optional(),
});

export type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AssetFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  asset?: Asset;
  onSave: (assetToSave: Asset) => Promise<void>;
}

export function AssetForm({ isOpen, onOpenChange, asset, onSave }: AssetFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<Record<string, any> | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const defaultValues = {
    category: '',
    description: '',
    serialNumber: '',
    location: userProfile?.state || '',
    condition: '',
    remarks: '',
    assignee: ''
  };

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: asset || defaultValues,
    mode: 'onChange',
  });
  
  const watchedValues = form.watch();

  useEffect(() => {
    if (isOpen) {
      if (asset) {
        form.reset({
          category: asset.category,
          description: asset.description,
          serialNumber: asset.serialNumber,
          location: asset.location,
          condition: asset.condition,
          remarks: asset.remarks,
          assignee: asset.assignee,
        });
      } else {
        form.reset(defaultValues);
      }
      setScanResult(null);
      setScanError(null);
    }
  }, [asset, form, isOpen]);

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
    toast({ title: 'AI Scan Started', description: 'Analyzing the asset label...' });

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
            toast({ title: 'Scan Complete', description: 'AI has extracted data from the image.' });
        } else {
            setScanError('The AI could not extract any relevant data from the image. Please try another image or enter the data manually.');
            toast({ title: 'Scan Inconclusive', description: 'No data could be extracted.', variant: 'destructive' });
        }
      };
      reader.onerror = (error) => {
        throw new Error('Failed to read file for scanning.');
      };
    } catch (e: any) {
      setScanError(`An error occurred during the AI scan: ${e.message}`);
      toast({ title: 'AI Scan Failed', description: e.message, variant: 'destructive' });
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
      
      toast({ title: 'Suggestions Applied', description: `Applied ${appliedCount} fields from the AI scan.` });
      setScanResult(null);
  }

  const onSubmit = async (data: AssetFormValues) => {
    setIsSaving(true);
    try {
        const assetToSave: Asset = {
            id: asset?.id || uuidv4(),
            ...asset, // Carry over existing fields
            ...data, // Overwrite with form data
            syncStatus: 'local',
            originalData: asset?.originalData || { source: 'manual-entry' },
        };
        await onSave(assetToSave);
        onOpenChange(false);
    } catch (e) {
        // Error toast is handled by the caller
    } finally {
        setIsSaving(false);
    }
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-4xl w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>{asset ? `Edit Asset (${asset.description})` : 'Add New Asset'}</SheetTitle>
          <SheetDescription>
            {asset ? 'View and edit the details of the asset.' : 'Fill in the details for the new asset.'}
            {' '}Changes are saved locally first.
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
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!asset}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category for the asset" />
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
                
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Description</FormLabel>
                    <FormControl><Textarea {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="serialNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial/Chasis Number</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
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
                  <FormField control={form.control} name="assignee" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="remarks" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks/Comments</FormLabel>
                    <FormControl><Textarea {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {asset?.originalData && (
                    <>
                        <h3 className="text-lg font-medium border-t pt-4">Original Imported Data</h3>
                        <pre className="mt-2 w-full overflow-auto rounded-md bg-muted p-4 text-xs">
                            {JSON.stringify(asset.originalData, null, 2)}
                        </pre>
                    </>
                )}
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
            <Button variant="outline">Cancel</Button>
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
