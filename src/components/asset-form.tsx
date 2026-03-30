"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
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
import { Loader2, ArrowLeft, Share2, MoreVertical, Check, RotateCcw, Info, Camera, Zap, ShieldCheck, X, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useAppState } from "@/contexts/app-state-context";
import { cn, getStatusClasses, sanitizeForFirestore } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";
import { ASSET_CONDITIONS } from "@/lib/constants";
import { saveLocalSettings } from "@/lib/idb";
import { updateSettings as updateSettingsFS } from "@/lib/firestore";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Badge } from "./ui/badge";
import { analyzeAssetHealth } from "@/ai/flows/analyze-asset-flow";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { userProfile } = useAuth();
  const { appSettings, activeGrantId, globalStateFilters } = useAppState();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    mode: 'onChange',
  });
  
  const watchedStatus = form.watch('verifiedStatus') as 'Verified' | 'Unverified';
  const watchedDescription = form.watch('description');

  const grant = useMemo(() => {
    return appSettings?.grants?.find(g => g.id === activeGrantId);
  }, [appSettings, activeGrantId]);
  
  const sheetDefinition = useMemo(() => {
    const cat = form.getValues('category');
    if (!cat || !grant?.sheetDefinitions) return null;
    return grant.sheetDefinitions[cat];
  }, [grant, form]);

  useEffect(() => {
    if (isOpen) {
        const defaultValues: AssetFormValues = {};
        if (asset) {
            Object.keys(asset).forEach(key => {
                const k = key as keyof Asset;
                if (k !== 'photoDataUri') {
                    defaultValues[k] = String(asset[k] ?? '');
                }
            });
            setCapturedPhoto(asset.photoDataUri || null);
            if (!defaultValues.verifiedStatus) defaultValues.verifiedStatus = 'Unverified';
        } else {
            defaultValues.verifiedStatus = 'Unverified';
            if (globalStateFilters.length > 0 && globalStateFilters[0] !== 'All') {
              defaultValues.location = globalStateFilters[0];
            }
            if (defaultCategory) defaultValues.category = defaultCategory;
            setCapturedPhoto(null);
        }
        form.reset(defaultValues);
    }
  }, [isOpen, asset, form, defaultCategory, globalStateFilters]);

  // Camera Logic
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setHasCameraPermission(true);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUri = canvas.toDataURL('image/jpeg', 0.7);
        setCapturedPhoto(dataUri);
        stopCamera();
      }
    }
  };

  const handleAiAnalyze = async () => {
    if (!capturedPhoto || !watchedDescription) return;
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeAssetHealth({
        photoDataUri: capturedPhoto,
        description: watchedDescription
      });
      if (analysis.suggestedCondition) {
        form.setValue('condition', analysis.suggestedCondition);
        form.setValue('remarks', `[AI Rationale]: ${analysis.reasoning}`);
      }
    } catch (e) {
      console.error("AI Analysis Failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onSubmit = async (data: AssetFormValues) => {
    setIsSaving(true);
    try {
        const assetToSave: Asset = sanitizeForFirestore({
            id: asset?.id ?? crypto.randomUUID(),
            grantId: activeGrantId || undefined,
            ...(asset || {}),
            ...data,
            photoDataUri: capturedPhoto || undefined,
        } as Asset);
        await onSave(assetToSave);
        onOpenChange(false);
    } catch (e) {
    } finally {
        setIsSaving(false);
    }
  };

  const renderField = (field: DisplayField) => {
    const fieldName = field.key as keyof AssetFormValues;
    let disabled = initialIsReadOnly;
    
    if (fieldName === 'verifiedDate') disabled = true;
    if (fieldName === 'location' && !userProfile?.isAdmin) disabled = true; 

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
                <div className="flex items-center gap-2 w-full">
                    <Select onValueChange={form.setValue.bind(form, fieldName)} value={form.getValues(fieldName)} disabled={disabled}>
                        <FormControl><SelectTrigger className="border-none bg-transparent p-0 h-auto font-bold text-base focus:ring-0 shadow-none flex-1"><SelectValue placeholder="Select condition" /></SelectTrigger></FormControl>
                        <SelectContent>{ASSET_CONDITIONS.map(cond => <SelectItem key={cond} value={cond}>{cond}</SelectItem>)}</SelectContent>
                    </Select>
                    {capturedPhoto && !disabled && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={handleAiAnalyze} disabled={isAnalyzing}>
                            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-primary" />}
                        </Button>
                    )}
                </div>
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
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">{field.label}</span>
            <div className="flex items-center">{component}</div>
        </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) stopCamera(); onOpenChange(open); }}>
      <DialogContent className="max-w-xl w-full flex flex-col h-[100vh] sm:h-[90vh] p-0 overflow-hidden rounded-none sm:rounded-3xl border-none shadow-2xl bg-background">
        <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => { stopCamera(); onOpenChange(false); }} className="rounded-full">
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <DialogTitle className="text-xl font-black tracking-tight">{asset?.sn || 'VERIFICATION ENTRY'}</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
                {!initialIsReadOnly && (
                    <Button variant="ghost" size="icon" onClick={startCamera} className="text-primary"><Camera className="h-5 w-5" /></Button>
                )}
                <Button variant="ghost" size="icon" className="rounded-full opacity-40"><Share2 className="h-5 w-5" /></Button>
            </div>
        </div>

        <ScrollArea className="flex-1 bg-background">
            <Form {...form}>
              <form id="asset-form" onSubmit={form.handleSubmit(onSubmit)}>
                  {/* Camera / Photo Evidence Section */}
                  {isCameraActive ? (
                    <div className="relative aspect-video bg-black overflow-hidden">
                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                            <Button variant="destructive" size="icon" onClick={stopCamera}><X className="h-6 w-6" /></Button>
                            <Button className="h-12 w-12 rounded-full bg-white text-black" onClick={capturePhoto}><div className="h-10 w-10 border-2 border-black rounded-full" /></Button>
                        </div>
                    </div>
                  ) : capturedPhoto ? (
                    <div className="relative group aspect-video bg-muted border-b">
                        <img src={capturedPhoto} className="w-full h-full object-cover" alt="Asset Evidence" />
                        {!initialIsReadOnly && (
                            <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setCapturedPhoto(null)}><X className="h-4 w-4" /></Button>
                        )}
                        <div className="absolute bottom-2 left-2">
                            <Badge className="bg-primary/80 backdrop-blur-md font-black uppercase text-[9px] tracking-widest">Physical Proof Attached</Badge>
                        </div>
                    </div>
                  ) : !initialIsReadOnly ? (
                    <div className="p-8 border-b bg-muted/5 text-center space-y-3">
                        <div className="p-4 bg-primary/10 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center">
                            <Camera className="h-8 w-8 text-primary" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Visual Evidence Pulse Required</p>
                        <Button variant="outline" size="sm" onClick={startCamera} className="font-bold text-[10px] uppercase tracking-wider rounded-xl">Initialize Camera</Button>
                    </div>
                  ) : null}

                  {!sheetDefinition ? (
                      <div className="p-8 text-center text-muted-foreground italic">Definition loading...</div>
                  ) : (
                      <div className="flex flex-col">
                          {sheetDefinition.displayFields.map(field => renderField(field))}
                      </div>
                  )}

                  {asset && (
                      <div className="px-6 py-8 bg-muted/5 space-y-6">
                          <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="traceability" className="border-none">
                                  <AccordionTrigger className="hover:no-underline p-5 bg-background border-2 rounded-2xl shadow-sm transition-all hover:border-primary/20 group">
                                      <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                                          <ShieldCheck className="h-4 w-4 text-primary" /> Compliance Pulse
                                      </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="pt-4 space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                          <div className="p-4 bg-background border-2 rounded-2xl">
                                              <p className="text-[9px] font-black text-muted-foreground uppercase mb-1.5 opacity-60">Fidelity Score</p>
                                              <p className="text-xs font-black">{capturedPhoto ? '100% (Visual Proof)' : '50% (Text Only)'}</p>
                                          </div>
                                          <div className="p-4 bg-background border-2 rounded-2xl">
                                              <p className="text-[9px] font-black text-muted-foreground uppercase mb-1.5 opacity-60">Auditor Session</p>
                                              <p className="text-xs font-black truncate">{userProfile?.displayName}</p>
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
            <Button variant="ghost" className="h-16 font-black uppercase text-[11px] tracking-[0.2em] text-primary rounded-none border-r" onClick={onPrevious} disabled={!onPrevious}>Previous</Button>
            <Button variant="ghost" className="h-16 font-black uppercase text-[11px] tracking-[0.2em] text-primary rounded-none" onClick={onNext} disabled={!onNext}>Next</Button>
        </div>

        {!initialIsReadOnly && (
            <div className="p-6 bg-muted/10 border-t flex justify-end gap-3">
                <Button variant="ghost" onClick={() => { stopCamera(); onOpenChange(false); }} className="font-bold px-6">Discard</Button>
                <Button type="submit" form="asset-form" disabled={isSaving} className="h-12 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 px-8 rounded-xl">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                    Commit Verification
                </Button>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
