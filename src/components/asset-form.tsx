
"use client";

import React, { useEffect, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { TARGET_SHEETS } from "@/lib/constants";
import { AssetChecklist } from "./asset-checklist";
import { useAuth } from "@/contexts/auth-context";

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
  const { userProfile } = useAuth();
  
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
    }
  }, [asset, form, isOpen]);

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
          <div className="md:col-span-1">
             <AssetChecklist values={watchedValues} />
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
