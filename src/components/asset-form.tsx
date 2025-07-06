"use client";

import { useState } from "react";
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
  serialNumber: z.string().min(1, "Serial number is required"),
  model: z.string().min(1, "Model is required"),
  location: z.string().min(1, "Location is required"),
  status: z.enum(["In Use", "In Storage", "For Repair", "Disposed"]),
  conditionNotes: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AssetFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  asset?: Asset;
}

export function AssetForm({ isOpen, onOpenChange, asset }: AssetFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const { toast } = useToast();

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: asset || {
      serialNumber: "",
      model: "",
      location: "",
      status: "In Use",
      conditionNotes: "",
    },
  });
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const photoDataUri = reader.result as string;
      setImagePreview(photoDataUri);

      try {
        const result = await validateAssetLabel({ photoDataUri });
        if (result.extractedData && Object.keys(result.extractedData).length > 0) {
          if (result.shouldOverride) {
            setAiSuggestion(result.extractedData);
          } else {
             toast({
              title: "AI Suggestion",
              description: "AI extracted data, but it might not be better than current values.",
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
    for (const key in aiSuggestion) {
      if (key in form.getValues()) {
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
    console.log(data);
    toast({
      title: "Asset Saved",
      description: "The asset has been successfully saved.",
    });
    onOpenChange(false);
    form.reset();
    setImagePreview(null);
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
          <div className="flex-1 overflow-y-auto">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8 p-1 pr-4"
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
                              layout="fill"
                              objectFit="contain"
                              className="rounded-md"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-7 w-7"
                              onClick={() => setImagePreview(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-10 w-10 text-muted-foreground" />
                            <p className="mt-2 text-sm text-muted-foreground">
                              Upload or drag an image of the asset label
                            </p>
                            <Input
                              id="picture"
                              type="file"
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
                  <FormField
                    control={form.control}
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serial Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., SN123456789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Latitude 5420" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Abuja Office, Room 101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select asset status" />
                          </SelectTrigger>
                        </FormControl>
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
                <FormField
                  control={form.control}
                  name="conditionNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Minor scratches on the casing."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
          <SheetFooter className="mt-auto pt-4">
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
            <Button onClick={form.handleSubmit(onSubmit)} type="submit">
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
