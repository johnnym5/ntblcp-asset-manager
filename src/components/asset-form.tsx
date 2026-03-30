"use client";

/**
 * @fileOverview AssetForm - The Primary Audit Gateway.
 * Supports visual evidence capture and data-fidelity checklists.
 */

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
import { 
  Loader2, 
  ArrowLeft, 
  Share2, 
  Check, 
  Camera, 
  ShieldCheck, 
  X, 
  FileText, 
  MapPin, 
  Hash, 
  User, 
  Tag,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useAppState } from "@/contexts/app-state-context";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ASSET_CONDITIONS } from "@/lib/constants";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { AssetSchema } from "@/core/registry/validation";
import type { Asset } from "@/types/domain";

const formSchema = AssetSchema;

interface AssetFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  asset?: Asset;
  onSave: (assetToSave: Asset) => Promise<void>;
  onQuickSave: (assetId: string, data: any) => Promise<void>;
  isReadOnly: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
}

export function AssetForm({ 
    isOpen, 
    onOpenChange, 
    asset, 
    onSave, 
    isReadOnly: initialIsReadOnly,
    onNext,
    onPrevious
}: AssetFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { userProfile } = useAuth();
  const { appSettings, activeGrantId } = useAppState();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const form = useForm<Asset>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (isOpen) {
      if (asset) {
        form.reset(asset);
        setCapturedPhoto(asset.photoDataUri || null);
      } else {
        // Default initial state for new registration
        form.reset({
          id: crypto.randomUUID(),
          grantId: activeGrantId || '',
          status: 'UNVERIFIED',
          condition: 'New',
          location: userProfile?.state || '',
          lastModified: new Date().toISOString(),
          lastModifiedBy: userProfile?.displayName || 'Unknown',
          hierarchy: {
            document: 'Manual Entry',
            section: 'General',
            subsection: 'Base Register',
            assetFamily: 'Uncategorized'
          },
          importMetadata: {
            sourceFile: 'MANUAL',
            sheetName: 'MANUAL',
            rowNumber: 0,
            importedAt: new Date().toISOString()
          },
          metadata: {}
        } as Asset);
        setCapturedPhoto(null);
      }
    }
  }, [isOpen, asset, form, userProfile, activeGrantId]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
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

  const onSubmit = async (data: Asset) => {
    setIsSaving(true);
    try {
        await onSave({
            ...data,
            photoDataUri: capturedPhoto || undefined,
            lastModified: new Date().toISOString(),
            lastModifiedBy: userProfile?.displayName || 'Unknown'
        });
    } finally {
        setIsSaving(false);
    }
  };

  const formValues = form.watch();

  const ChecklistItem = ({ label, isCompleted, icon }: { label: string; isCompleted: boolean; icon: React.ReactNode }) => (
    <div className="flex items-center justify-between text-xs py-1.5 opacity-80">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-bold uppercase tracking-tighter">{label}</span>
      </div>
      {isCompleted ? <Check className="h-3.5 w-3.5 text-green-500" /> : <X className="h-3.5 w-3.5 text-destructive" />}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) stopCamera(); onOpenChange(open); }}>
      <DialogContent className="max-w-xl w-full flex flex-col h-[100vh] sm:h-[90vh] p-0 overflow-hidden rounded-none sm:rounded-3xl border-none shadow-2xl bg-background">
        <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => { stopCamera(); onOpenChange(false); }} className="rounded-full">
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div className="flex flex-col">
                  <DialogTitle className="text-xl font-black tracking-tight">{asset?.assetIdCode || 'VERIFICATION ENTRY'}</DialogTitle>
                  <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest opacity-60">Record Analysis Context</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex items-center bg-muted/50 rounded-xl p-1 mr-2">
                  <Button variant="ghost" size="icon" onClick={onPrevious} disabled={!onPrevious} className="h-8 w-8 rounded-lg"><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={onNext} disabled={!onNext} className="h-8 w-8 rounded-lg"><ChevronRight className="h-4 w-4" /></Button>
                </div>
                {!initialIsReadOnly && (
                    <Button variant="ghost" size="icon" onClick={startCamera} className="text-primary"><Camera className="h-5 w-5" /></Button>
                )}
                <Button variant="ghost" size="icon" className="rounded-full opacity-40"><Share2 className="h-5 w-5" /></Button>
            </div>
        </div>

        <ScrollArea className="flex-1 bg-background">
            <Form {...form}>
              <form id="asset-form" onSubmit={form.handleSubmit(onSubmit)}>
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
                            <Badge className="bg-primary/80 backdrop-blur-md font-black uppercase text-[9px] tracking-widest">Visual Pulse Proof Attached</Badge>
                        </div>
                    </div>
                  ) : !initialIsReadOnly ? (
                    <div className="p-8 border-b bg-muted/5 text-center space-y-3">
                        <div className="p-4 bg-primary/10 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center">
                            <Camera className="h-8 w-8 text-primary" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Visual Evidence Required</p>
                        <Button variant="outline" size="sm" onClick={startCamera} className="font-bold text-[10px] uppercase tracking-wider rounded-xl">Initialize Document Scanner</Button>
                    </div>
                  ) : null}

                  <div className="flex flex-col">
                      <div className="px-6 py-4 border-b border-border/40 group">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Description</span>
                          <FormControl><Input {...form.register('description')} readOnly={initialIsReadOnly} className="border-none bg-transparent p-0 h-auto font-black text-base focus-visible:ring-0 shadow-none" /></FormControl>
                      </div>
                      
                      <div className="px-6 py-4 border-b border-border/40 group">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Asset ID / Tag Code</span>
                          <FormControl><Input {...form.register('assetIdCode')} readOnly={initialIsReadOnly} className="border-none bg-transparent p-0 h-auto font-black text-base focus-visible:ring-0 shadow-none" /></FormControl>
                      </div>

                      <div className="px-6 py-4 border-b border-border/40 group">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Manufacturer Serial</span>
                          <FormControl><Input {...form.register('serialNumber')} readOnly={initialIsReadOnly} className="border-none bg-transparent p-0 h-auto font-black text-base focus-visible:ring-0 shadow-none" /></FormControl>
                      </div>

                      <div className="grid grid-cols-2">
                          <div className="px-6 py-4 border-b border-r border-border/40 group">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Condition Assessment</span>
                              <Select onValueChange={(v) => form.setValue('condition', v)} value={form.watch('condition')} disabled={initialIsReadOnly}>
                                  <FormControl><SelectTrigger className="border-none bg-transparent p-0 h-auto font-black text-base focus:ring-0 shadow-none"><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>{ASSET_CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                              </Select>
                          </div>
                          <div className="px-6 py-4 border-b border-border/40 group">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Verification Status</span>
                              <Select onValueChange={(v) => form.setValue('status', v as any)} value={form.watch('status')} disabled={initialIsReadOnly}>
                                  <FormControl><SelectTrigger className="border-none bg-transparent p-0 h-auto font-black text-base focus:ring-0 shadow-none"><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                      <SelectItem value="VERIFIED">Verified</SelectItem>
                                      <SelectItem value="UNVERIFIED">Unverified</SelectItem>
                                      <SelectItem value="DISCREPANCY">Discrepancy</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                      </div>

                      <div className="px-6 py-4 border-b border-border/40 group">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Custodian / Assignee</span>
                          <FormControl><Input {...form.register('custodian')} readOnly={initialIsReadOnly} className="border-none bg-transparent p-0 h-auto font-black text-base focus-visible:ring-0 shadow-none" /></FormControl>
                      </div>

                      <div className="px-6 py-4 border-b border-border/40 group">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Auditor Remarks</span>
                          <FormControl><Textarea {...form.register('metadata.remarks' as any)} readOnly={initialIsReadOnly} className="border-none bg-transparent p-0 h-auto min-h-[60px] font-medium text-sm focus-visible:ring-0 shadow-none resize-none" /></FormControl>
                      </div>
                  </div>

                  <div className="px-6 py-8 bg-muted/5 space-y-6">
                      <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="fidelity" className="border-none">
                              <AccordionTrigger className="hover:no-underline p-5 bg-background border-2 rounded-2xl shadow-sm transition-all hover:border-primary/20 group">
                                  <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                                      <ShieldCheck className="h-4 w-4 text-primary" /> Data Fidelity Checklist
                                  </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-4 space-y-2 px-2">
                                  <ChecklistItem label="Manufacturer Serial" isCompleted={!!formValues.serialNumber} icon={<Hash className="h-3 w-3" />} />
                                  <ChecklistItem label="Asset Tag / ID" isCompleted={!!formValues.assetIdCode} icon={<Tag className="h-3 w-3" />} />
                                  <ChecklistItem label="Physical Location" isCompleted={!!formValues.location} icon={<MapPin className="h-3 w-3" />} />
                                  <ChecklistItem label="Hierarchical Section" isCompleted={!!formValues.hierarchy?.section} icon={<FileText className="h-3 w-3" />} />
                                  <ChecklistItem label="Visual Evidence" isCompleted={!!capturedPhoto} icon={<Camera className="h-3 w-3" />} />
                              </AccordionContent>
                          </AccordionItem>
                      </Accordion>
                  </div>
              </form>
            </Form>
        </ScrollArea>

        {!initialIsReadOnly && (
            <div className="p-6 bg-muted/10 border-t flex justify-end gap-3">
                <Button variant="ghost" onClick={() => { stopCamera(); onOpenChange(false); }} className="font-bold px-6">Discard Draft</Button>
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
