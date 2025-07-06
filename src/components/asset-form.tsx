"use client";

import React, { useEffect, useState, useRef } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UploadCloud, X } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import type { Asset } from "@/lib/types";
import { validateAssetLabel } from "@/ai/flows/ocr-asset-validation";

const assetFormSchema = z.object({
  assetName: z.string().min(1, "Asset name is required"),
  serialNumber: z.string().min(1, "Serial number is required"),
  category: z.string().min(1, "Category is required"),
  location: z.string().min(1, "Location is required"),
  status: z.enum(["In Use", "In Storage", "For Repair", "Disposed"]),
  condition: z.enum(["New", "Good", "Fair", "Poor"]),
  assignedTo: z.string().optional(),
  purchaseDate: z.string().optional(),
  notes: z.string().optional(),
});

export type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AssetFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  asset?: Asset;
  onSave: (data: AssetFormValues, imageFile: File | null) => void;
}

export function AssetForm({ isOpen, onOpenChange, asset, onSave }: AssetFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      assetName: "",
      serialNumber: "",
      category: "",
      location: "",
      status: "In Use",
      condition: "Good",
      assignedTo: "",
      purchaseDate: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (asset) {
      form.reset(asset);
      setImagePreview(asset.photoUrl);
      setImageFile(null);
    } else {
      form.reset({
        assetName: "",
        serialNumber: "",
        category: "",
        location: "",
        status: "In Use",
        condition: "Good",
        assignedTo: "",
        purchaseDate: "",
        notes: "",
      });
      setImagePreview(null);
      setImageFile(null);
    }
  }, [asset, form, isOpen]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setIsProcessing(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const photoDataUri = reader.result as string;
      setImagePreview(photoDataUri);

      try {
        const currentValues = form.getValues();
        const result = await validateAssetLabel({ photoDataUri, currentValues });
        if (result.extractedData && Object.keys(result.extractedData).length > 0) {
          if (result.shouldOverride) {
            setAiSuggestion(result.extractedData);
          } else {
             toast({
              title: "AI Suggestion Available",
              description: "AI extracted data, but it might not be better than current values. Click to review.",
              action: <Button onClick={() => setAiSuggestion(result.extractedData)}>Review</Button>
            });
          }
        } else {
          toast({
            title: "OCR Failed",
            description: "Could not extract any data from the image.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("OCR Error:", error);
        toast({
          title: "An Error Occurred",
          description: "Failed to process the asset label.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };
  };
  
  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    // Map potential model/name variations to assetName
    const suggestedAssetName = aiSuggestion.assetName || aiSuggestion.model || aiSuggestion.name;
    if (suggestedAssetName) {
        form.setValue("assetName", suggestedAssetName);
    }
    // Apply other fields if they exist in the form
    for (const key in aiSuggestion) {
      if (key !== 'assetName' && key !== 'model' && key !== 'name' && key in form.getValues()) {
        form.setValue(key as keyof AssetFormValues, aiSuggestion[key]);
      }
    }
    setAiSuggestion(null);
     toast({
      title: "Success",
      description: "AI suggestions have been applied to the form.",
    });
  };

  const onSubmit = (data: AssetFormValues) => {
    onSave(data, imageFile);
    onOpenChange(false);
  };
  
  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl w-full flex flex-col">
          <SheetHeader>
            <SheetTitle>{asset ? "Edit Asset" : "Add New Asset"}</SheetTitle>
            <SheetDescription>
              {asset
                ? "Update the details of the existing asset."
                : "Fill in the details for the new asset. You can use the OCR scanner to autofill."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto pr-4">
            <Form {...form}>
              <form
                id="asset-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6 p-1"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>AI Document Scanner</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      <div className="relative border-2 border-dashed border-muted-foreground/50 rounded-lg p-6 flex flex-col items-center justify-center text-center h-48">
                        {isProcessing ? (
                           <div className="flex flex-col items-center gap-2">
                             <Loader2 className="h-8 w-8 animate-spin text-primary" />
                             <p className="text-muted-foreground">Analyzing image...</p>
                           </div>
                        ) : imagePreview ? (
                          <>
                            <Image
                              src={imagePreview}
                              alt="Asset label preview"
                              fill
                              className="rounded-md object-contain"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-7 w-7"
                              onClick={() => {
                                setImagePreview(null);
                                setImageFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-10 w-10 text-muted-foreground" />
                            <p className="mt-2 text-sm text-muted-foreground">
                              Upload an image of the asset label
                            </p>
                            <Input
                              id="picture"
                              type="file"
                              ref={fileInputRef}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              accept="image/*"
                              onChange={handleImageUpload}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="assetName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Name</FormLabel>
                        <FormControl><Input placeholder="e.g., Dell Latitude 5420" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="serialNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serial Number</FormLabel>
                        <FormControl><Input placeholder="e.g., SN123456789" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                 <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl><Input placeholder="e.g., Laptop, Vehicle, Medical Equipment" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl><Input placeholder="e.g., Abuja Office, Room 101" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select asset status" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="In Use">In Use</SelectItem>
                              <SelectItem value="In Storage">In Storage</SelectItem>
                              <SelectItem value="For Repair">For Repair</SelectItem>
                              <SelectItem value="Disposed">Disposed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="condition" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condition</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select asset condition" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="New">New</SelectItem>
                              <SelectItem value="Good">Good</SelectItem>
                              <SelectItem value="Fair">Fair</SelectItem>
                              <SelectItem value="Poor">Poor</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="assignedTo" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned To</FormLabel>
                          <FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="purchaseDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Date</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl><Textarea placeholder="e.g., Minor scratches on the casing." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
          <SheetFooter className="mt-auto pt-4 border-t">
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
            <Button type="submit" form="asset-form">
              Save Asset
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!aiSuggestion}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>AI Suggestions Ready</AlertDialogTitle>
            <AlertDialogDescription>
              Our AI has extracted the following details from the image. Would you like to apply them to the form?
              <pre className="mt-2 w-full overflow-auto rounded-md bg-muted p-4 text-xs">
                {JSON.stringify(aiSuggestion, null, 2)}
              </pre>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAiSuggestion(null)}>Discard</AlertDialogCancel>
            <AlertDialogAction onClick={applyAiSuggestion}>Apply</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
