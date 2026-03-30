"use client";

/**
 * @fileOverview AssetForm - Operational Detail Workstation.
 * Phase 28: Integrated Fluid Responsive Auto-Fit.
 */

import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Camera, 
  ShieldCheck, 
  X, 
  ChevronLeft,
  ChevronRight,
  Database,
  MapPin,
  Tag,
  Hash,
  Activity,
  User,
  History,
  Info,
  DollarSign,
  CalendarDays,
  GitPullRequest,
  Clock,
  ArrowRight,
  Sparkles,
  Zap
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useAppState } from "@/contexts/app-state-context";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ASSET_CONDITIONS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { AssetSchema } from "@/core/registry/validation";
import { FirestoreService } from "@/services/firebase/firestore";
import type { Asset, ActivityLogEntry } from "@/types/domain";
import type { RegistryHeader } from "@/types/registry";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { extractAssetData } from "@/ai/flows/ocr-asset-flow";
import { useToast } from "@/hooks/use-toast";

interface AssetFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  asset?: Asset;
  headers?: RegistryHeader[];
  onSave: (assetToSave: Asset) => Promise<void>;
  onQuickSave: (assetId: string, data: any) => Promise<void>;
  isReadOnly: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
}

const FieldBlock = ({ 
  label, 
  value, 
  icon: Icon, 
  className 
}: { 
  label: string; 
  value?: string | number; 
  icon?: any; 
  className?: string 
}) => (
  <div className={cn("space-y-1 p-3 rounded-2xl bg-muted/30 border border-transparent hover:border-primary/10 transition-colors", className)}>
    <div className="flex items-center gap-2 opacity-40">
      {Icon && <Icon className="h-2.5 w-2.5" />}
      <span className="text-[8px] font-black uppercase tracking-[0.2em]">{label}</span>
    </div>
    <div className="text-[11px] font-black uppercase tracking-tight text-foreground truncate leading-tight">
      {value || '---'}
    </div>
  </div>
);

export function AssetForm({ 
    isOpen, 
    onOpenChange, 
    asset,
    headers = [],
    onSave, 
    isReadOnly,
    onNext,
    onPrevious
}: AssetFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [history, setHistory] = useState<ActivityLogEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { userProfile } = useAuth();
  const { activeGrantId, isOnline } = useAppState();
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const form = useForm<Asset>({
    resolver: zodResolver(AssetSchema),
    mode: 'onChange',
  });

  const getLabel = (normalizedName: string, fallback: string) => {
    const header = headers.find(h => h.normalizedName === normalizedName);
    return header?.displayName || fallback;
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab("details");
      if (asset) {
        form.reset(asset);
        setCapturedPhoto(asset.photoDataUri || null);
        if (isOnline) {
          loadHistory(asset.id);
        }
      } else {
        form.reset({
          id: crypto.randomUUID(),
          grantId: activeGrantId || '',
          status: 'UNVERIFIED',
          condition: 'New',
          location: userProfile?.state || '',
          lastModified: new Date().toISOString(),
          lastModifiedBy: userProfile?.displayName || 'Unknown',
          hierarchy: { document: 'Manual Entry', section: 'General', subsection: 'Base Register', assetFamily: 'Uncategorized' },
          importMetadata: { sourceFile: 'MANUAL', sheetName: 'MANUAL', rowNumber: 0, importedAt: new Date().toISOString() },
          metadata: {}
        } as Asset);
        setCapturedPhoto(null);
        setHistory([]);
      }
    }
  }, [isOpen, asset, form, userProfile, activeGrantId, isOnline]);

  const loadHistory = async (id: string) => {
    setLoadingHistory(true);
    try {
      const log = await FirestoreService.getAssetHistory(id);
      setHistory(log);
    } finally {
      setLoadingHistory(false);
    }
  };

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

  const handleAIScan = async () => {
    if (!capturedPhoto) return;
    setIsAnalyzing(true);
    toast({ title: "AI Pulse Initialized", description: "Analyzing asset label..." });

    try {
      const result = await extractAssetData({ photoDataUri: capturedPhoto });
      if (result.confidence > 0.4) {
        if (result.serialNumber) form.setValue('serialNumber', result.serialNumber);
        if (result.modelNumber) form.setValue('metadata.modelNumber', result.modelNumber);
        if (result.manufacturer) form.setValue('metadata.manufacturer', result.manufacturer);
        if (result.description && !form.getValues('description')) {
          form.setValue('description', result.description);
        }
        toast({ title: "Extraction Complete", description: `Accuracy: ${Math.round(result.confidence * 100)}%` });
      } else {
        toast({ variant: "destructive", title: "Low Confidence Pulse", description: "Please verify markers manually." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Intelligence Failure" });
    } finally {
      setIsAnalyzing(false);
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

  const SectionHeader = ({ label, icon: Icon }: { label: string; icon: any }) => (
    <div className="flex items-center gap-3 px-4 md:px-6 py-4 bg-muted/20 border-y border-border/40">
      <Icon className="h-4 w-4 text-primary opacity-60" />
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</h4>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) stopCamera(); onOpenChange(open); }}>
      <DialogContent className="max-w-2xl w-full flex flex-col h-full sm:h-[95vh] p-0 overflow-hidden sm:rounded-[2.5rem] border-none shadow-2xl bg-background">
        {/* Header Bar */}
        <div className="flex flex-col shrink-0">
          <div className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-md z-30">
              <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => { stopCamera(); onOpenChange(false); }} className="rounded-xl h-10 w-10 tactile-pulse">
                      <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex flex-col">
                    <DialogTitle className="text-xs md:text-sm font-black tracking-tight uppercase leading-none truncate max-w-[120px] md:max-w-xs">
                      {asset?.assetIdCode || 'NEW REGISTRATION'}
                    </DialogTitle>
                    <span className="text-[8px] font-black uppercase text-muted-foreground tracking-[0.2em] mt-1 opacity-60">REGISTRY PULSE</span>
                  </div>
              </div>
              
              <div className="flex items-center gap-1">
                  <div className="flex items-center bg-muted/50 rounded-xl p-1 mr-1">
                    <Button variant="ghost" size="icon" onClick={onPrevious} disabled={!onPrevious} className="h-8 w-8 rounded-lg tactile-pulse"><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={onNext} disabled={!onNext} className="h-8 w-8 rounded-lg tactile-pulse"><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                  {!isReadOnly && (
                      <Button variant="ghost" size="icon" onClick={startCamera} className="text-primary h-10 w-10 rounded-xl hover:bg-primary/10 tactile-pulse"><Camera className="h-5 w-5" /></Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl opacity-40 hover:opacity-100 tactile-pulse"><Share2 className="h-5 w-5" /></Button>
              </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-4 py-2 border-b bg-muted/10">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 bg-background p-1 rounded-xl h-11">
                <TabsTrigger value="details" className="rounded-lg font-black uppercase text-[9px] tracking-widest gap-2">
                  <Info className="h-3 w-3" /> Profile
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg font-black uppercase text-[9px] tracking-widest gap-2">
                  <History className="h-3 w-3" /> History
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <ScrollArea className="flex-1 bg-background custom-scrollbar">
          <Tabs value={activeTab} className="w-full h-full">
            <TabsContent value="details" className="m-0 h-full">
              <Form {...form}>
                <form id="asset-form" onSubmit={form.handleSubmit(onSubmit)} className="pb-32">
                    {/* Evidence Viewport - Adaptive Aspect */}
                    {isCameraActive ? (
                      <div className="relative aspect-[4/3] bg-black overflow-hidden m-2 sm:m-4 rounded-[1.5rem] sm:rounded-[2rem] border-4 border-primary/20">
                          <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6">
                              <Button variant="destructive" size="icon" className="h-14 w-14 rounded-2xl shadow-xl tactile-pulse" onClick={stopCamera}><X className="h-6 w-6" /></Button>
                              <Button className="h-16 w-16 rounded-full bg-white text-black shadow-2xl border-[6px] border-black/10 tactile-pulse" onClick={capturePhoto}>
                                <div className="h-10 w-10 border-4 border-black rounded-full" />
                              </Button>
                          </div>
                      </div>
                    ) : capturedPhoto ? (
                      <div className="relative group aspect-video bg-muted m-2 sm:m-4 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden border-2 border-primary/10 shadow-lg">
                          <img src={capturedPhoto} className="w-full h-full object-cover" alt="Asset Evidence" />
                          <div className="absolute top-4 right-4 flex gap-2">
                            {!isReadOnly && (
                                <Button 
                                  variant="secondary" 
                                  size="sm" 
                                  onClick={handleAIScan} 
                                  disabled={isAnalyzing}
                                  className="rounded-xl h-10 px-4 font-black uppercase text-[9px] tracking-widest gap-2 shadow-2xl"
                                >
                                  {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
                                  AI Scan
                                </Button>
                            )}
                            {!isReadOnly && (
                                <Button variant="destructive" size="icon" className="h-10 w-10 rounded-xl shadow-2xl" onClick={() => setCapturedPhoto(null)}>
                                  <X className="h-5 w-5" />
                                </Button>
                            )}
                          </div>
                      </div>
                    ) : (
                      <div className="m-2 sm:m-4 h-40 md:h-48 border-2 border-dashed border-primary/10 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center justify-center gap-4 bg-primary/5 hover:bg-primary/[0.08] transition-colors cursor-pointer group" onClick={startCamera}>
                        <div className="p-4 bg-primary/10 rounded-2xl group-hover:scale-110 transition-transform"><Camera className="h-8 w-8 text-primary" /></div>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Attach Proof Pulse</span>
                      </div>
                    )}

                    {/* Form Grids - Adaptive Columns */}
                    <SectionHeader label="Identification Pulse" icon={Tag} />
                    <div className="px-4 md:px-6 py-6 space-y-6">
                      <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">{getLabel('asset_description', 'Description')}</FormLabel>
                          <FormControl><Input {...field} readOnly={isReadOnly} className="h-12 rounded-xl bg-muted/10 border-2 border-transparent focus:border-primary/20 font-black uppercase text-sm shadow-inner" /></FormItem>
                        </FormItem>
                      )}/>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="assetIdCode" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">{getLabel('asset_id_code', 'Registry Tag')}</FormLabel>
                            <FormControl><Input {...field} readOnly={isReadOnly} className="h-12 rounded-xl bg-muted/10 border-2 border-transparent focus:border-primary/20 font-black uppercase text-sm shadow-inner" /></FormControl>
                          </FormItem>
                        )}/>

                        <FormField control={form.control} name="serialNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">{getLabel('serial_number', 'Serial')}</FormLabel>
                            <FormControl><Input {...field} readOnly={isReadOnly} className="h-12 rounded-xl bg-muted/10 border-2 border-transparent focus:border-primary/20 font-black uppercase text-sm shadow-inner" /></FormControl>
                          </FormItem>
                        )}/>
                      </div>
                    </div>

                    <SectionHeader label="Location & Assessment" icon={MapPin} />
                    <div className="px-4 md:px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="location" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">{getLabel('location', 'Location')}</FormLabel>
                          <FormControl><Input {...field} readOnly={isReadOnly} className="h-12 rounded-xl bg-muted/10 border-2 border-transparent focus:border-primary/20 font-black uppercase text-sm shadow-inner" /></FormControl>
                        </FormItem>
                      )}/>

                      <FormField control={form.control} name="condition" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">{getLabel('condition', 'Condition')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                            <FormControl><SelectTrigger className="h-12 rounded-xl bg-muted/10 border-2 border-transparent focus:ring-primary/20 font-bold text-xs shadow-inner"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent className="rounded-xl">{ASSET_CONDITIONS.map(c => <SelectItem key={c} value={c} className="text-xs font-bold">{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </FormItem>
                      )}/>
                    </div>

                    <div className="p-4 md:px-6">
                      <FormField control={form.control} name="metadata.remarks" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Field Remarks</FormLabel>
                          <FormControl><Textarea {...(field as any)} readOnly={isReadOnly} className="min-h-[100px] rounded-2xl bg-muted/10 border-2 border-transparent focus:border-primary/20 font-medium text-sm shadow-inner p-4 resize-none" /></FormControl>
                        </FormItem>
                      )}/>
                    </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="history" className="m-0 h-full">
              <div className="p-4 md:p-6 space-y-6">
                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Replaying Pulse...</p>
                  </div>
                ) : history.length > 0 ? (
                  <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-primary/10">
                    {history.map((entry, idx) => (
                      <div key={entry.id} className="relative pl-12">
                        <div className={cn(
                          "absolute left-0 top-0 h-10 w-10 rounded-xl flex items-center justify-center shadow-lg border-2 z-10",
                          idx === 0 ? "bg-primary border-primary text-white" : "bg-card border-primary/20 text-primary"
                        )}>
                          <Clock className="h-5 w-5" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-black text-[10px] uppercase tracking-tight">{entry.operation}</h4>
                            <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">
                              {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 text-[10px] font-bold text-muted-foreground uppercase">
                            <User className="h-3 w-3 inline mr-2" /> {entry.performedBy}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 opacity-20 text-center">
                    <History className="h-12 w-12 mb-4" />
                    <h3 className="text-xl font-black uppercase tracking-widest">History Silent</h3>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* Footer - Fluid Stack */}
        {!isReadOnly && activeTab === 'details' && (
            <div className="p-4 md:p-6 bg-background/80 backdrop-blur-xl border-t flex flex-col sm:flex-row items-center gap-3 absolute bottom-0 left-0 right-0 z-40">
                <Button variant="ghost" onClick={() => { stopCamera(); onOpenChange(false); }} className="w-full sm:flex-1 h-14 font-black uppercase text-[10px] tracking-widest rounded-2xl">DISCARD</Button>
                <Button type="submit" form="asset-form" disabled={isSaving} className="w-full sm:flex-1 h-14 font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-primary/30 rounded-2xl bg-primary text-primary-foreground">
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />}
                    COMMIT PULSE
                </Button>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}