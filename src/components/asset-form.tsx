
"use client";

import React, { useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Asset } from "@/lib/types";
import { updateAsset } from "@/lib/firestore";
import { Loader2 } from "lucide-react";

const assetFormSchema = z.object({
  description: z.string().optional(),
  serialNumber: z.string().optional(),
  location: z.string().optional(),
  condition: z.string().optional(),
  remarks: z.string().optional(),
  assignee: z.string().optional(),
  // Add other fields as they become editable
});

export type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AssetFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  asset?: Asset;
}

export function AssetForm({ isOpen, onOpenChange, asset }: AssetFormProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (asset) {
      form.reset({
        description: asset.description,
        serialNumber: asset.serialNumber || asset.chasisNo,
        location: asset.location,
        condition: asset.condition,
        remarks: asset.remarks,
        assignee: asset.assignee,
      });
    }
  }, [asset, form, isOpen]);

  const onSubmit = async (data: AssetFormValues) => {
    if (!asset) return;
    setIsSaving(true);
    try {
        const updatedAssetData: Asset = {
            ...asset,
            ...data,
        };
        await updateAsset(updatedAssetData);
        toast({ title: "Success", description: "Asset updated successfully." });
        onOpenChange(false);
    } catch (e) {
        toast({ title: "Error", description: "Failed to update asset.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>Asset Details ({asset?.category})</SheetTitle>
          <SheetDescription>
            View and edit the details of the asset.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto pr-4">
          <Form {...form}>
            <form
              id="asset-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 p-1"
            >
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

            <h3 className="text-lg font-medium border-t pt-4">Original Imported Data</h3>
            <pre className="mt-2 w-full overflow-auto rounded-md bg-muted p-4 text-xs">
                {JSON.stringify(asset?.originalData, null, 2)}
            </pre>
            </form>
          </Form>
        </div>
        <SheetFooter className="mt-auto pt-4 border-t">
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <Button type="submit" form="asset-form" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
