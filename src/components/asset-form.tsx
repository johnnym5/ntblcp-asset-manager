"use client";

/**
 * @fileOverview AssetForm - Operational Detail Workstation.
 * Phase 17: Multi-tab layout with Lifecycle History pulse.
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
  ArrowRight
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";

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
    onSave, 
    isReadOnly,
    onNext,
    onPrevious
}: AssetFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [history, setHistory] = useState<ActivityLogEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { userProfile } = useAuth();
  const { activeGrantId, isOnline } = useAppState();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const form = useForm<Asset>({
    resolver: zodResolver(AssetSchema),
    mode: 'onChange',
  });

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
    <div className="flex items-center gap-3 px-6 py-4 bg-muted/20 border-y border-border/40">
      <Icon className="h-4 w-4 text-primary opacity-60" />
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</h4>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) stopCamera(); onOpenChange(open); }}>
      <DialogContent className="max-w-xl w-full flex flex-col h-[100vh] sm:h-[95vh] p-0 overflow-hidden rounded-none sm:rounded-[2.5rem] border-none shadow-2xl bg-background">
        {/* Header Bar */}
        <div className="flex flex-col shrink-0">
          <div className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-md z-30">
              <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => { stopCamera(); onOpenChange(false); }} className="rounded-xl h-10 w-10 tactile-pulse">
                      <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex flex-col">
                    <DialogTitle className="text-sm font-black tracking-tight uppercase leading-none truncate max-w-[140px]">
                      {asset?.assetIdCode || 'NEW REGISTRATION'}
                    </DialogTitle>
                    <span className="text-[8px] font-black uppercase text-muted-foreground tracking-[0.2em] mt-1 opacity-60">REGISTRY PULSE PROFILE</span>
                  </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                  <div className="flex items-center bg-muted/50 rounded-xl p-1 mr-1">
                    <Button variant="ghost" size="icon" onClick={onPrevious} disabled={!onPrevious} className="h-8 w-8 rounded-lg tactile-pulse"><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={onNext} disabled={!onNext} className="h-8 w-8 rounded-lg tactile-pulse"><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                  {!isReadOnly && (
                      <Button variant="ghost" size="icon" onClick={startCamera} className="text-primary h-10 w-10 rounded-xl hover:bg-primary/10 transition-colors tactile-pulse"><Camera className="h-5 w-5" /></Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl opacity-40 hover:opacity-100 transition-opacity tactile-pulse"><Share2 className="h-5 w-5" /></Button>
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
                  <History className="h-3 w-3" /> Lifecycle history
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
                    {/* Evidence Viewport */}
                    {isCameraActive ? (
                      <div className="relative aspect-[4/3] bg-black overflow-hidden m-4 rounded-[2rem] border-4 border-primary/20">
                          <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6">
                              <Button variant="destructive" size="icon" className="h-14 w-14 rounded-2xl shadow-xl tactile-pulse" onClick={stopCamera}><X className="h-6 w-6" /></Button>
                              <Button className="h-16 w-16 rounded-full bg-white text-black shadow-2xl border-[6px] border-black/10 tactile-pulse" onClick={capturePhoto}>
                                <div className="h-10 w-10 border-4 border-black rounded-full" />
                              </Button>
                          </div>
                      </div>
                    ) : capturedPhoto ? (
                      <div className="relative group aspect-video bg-muted m-4 rounded-[2rem] overflow-hidden border-2 border-primary/10 shadow-lg">
                          <img src={capturedPhoto} className="w-full h-full object-cover" alt="Asset Evidence" />
                          {!isReadOnly && (
                              <Button variant="destructive" size="icon" className="absolute top-4 right-4 h-10 w-10 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity tactile-pulse" onClick={() => setCapturedPhoto(null)}>
                                <X className="h-5 w-5" />
                              </Button>
                          )}
                          <Badge className="absolute bottom-4 left-4 bg-primary/90 backdrop-blur-md font-black uppercase text-[8px] tracking-[0.2em] px-3 h-6 rounded-lg">
                            VISUAL PULSE PROOF ATTACHED
                          </Badge>
                      </div>
                    ) : null}

                    {/* Identification Stack */}
                    <SectionHeader label="Identification Pulse" icon={Tag} />
                    <div className="px-6 py-6 space-y-6">
                      <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Asset Description</FormLabel>
                          <FormControl><Input {...field} readOnly={isReadOnly} className="h-12 rounded-xl bg-muted/10 border-2 border-transparent focus:border-primary/20 font-black uppercase text-sm shadow-inner" /></FormControl>
                        </FormItem>
                      )}/>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="assetIdCode" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Registry Tag ID</FormLabel>
                            <FormControl><Input {...field} readOnly={isReadOnly} className="h-12 rounded-xl bg-muted/10 border-2 border-transparent focus:border-primary/20 font-black uppercase text-sm shadow-inner" /></FormControl>
                          </FormItem>
                        )}/>

                        <FormField control={form.control} name="serialNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Manufacturer Serial</FormLabel>
                            <FormControl><Input {...field} readOnly={isReadOnly} className="h-12 rounded-xl bg-muted/10 border-2 border-transparent focus:border-primary/20 font-black uppercase text-sm shadow-inner" /></FormControl>
                          </FormItem>
                        )}/>
                      </div>
                    </div>

                    {/* Location & Context Stack */}
                    <SectionHeader label="Regional Scope & Context" icon={MapPin} />
                    <div className="px-6 py-6 grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="location" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Physical Location</FormLabel>
                          <FormControl><Input {...field} readOnly={isReadOnly} className="h-12 rounded-xl bg-muted/10 border-2 border-transparent focus:border-primary/20 font-black uppercase text-sm shadow-inner" /></FormControl>
                        </FormItem>
                      )}/>

                      <FormField control={form.control} name="custodian" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Custodian / User</FormLabel>
                          <FormControl><Input {...field} readOnly={isReadOnly} className="h-12 rounded-xl bg-muted/10 border-2 border-transparent focus:border-primary/20 font-black uppercase text-sm shadow-inner" /></FormControl>
                        </FormItem>
                      )}/>
                    </div>

                    {/* Procurement Stack */}
                    <SectionHeader label="Financial & Procurement" icon={DollarSign} />
                    <div className="px-6 py-6 grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="purchaseDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Date Procured</FormLabel>
                          <FormControl><Input type="date" {...field} readOnly={isReadOnly} className="h-12 rounded-xl bg-muted/10 border-2 border-transparent focus:border-primary/20 font-bold text-xs shadow-inner" /></FormControl>
                        </FormItem>
                      )}/>

                      <FormField control={form.control} name="value" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Original Value (NGN)</FormLabel>
                          <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} readOnly={isReadOnly} className="h-12 rounded-xl bg-muted/10 border-2 border-transparent focus:border-primary/20 font-bold text-xs shadow-inner" /></FormControl>
                        </FormItem>
                      )}/>
                    </div>

                    {/* Assessment Stack */}
                    <SectionHeader label="Condition & Assessment" icon={Activity} />
                    <div className="px-6 py-6 grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="condition" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Field Assessment</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                            <FormControl><SelectTrigger className="h-12 rounded-xl bg-muted/10 border-2 border-transparent focus:ring-primary/20 font-bold text-xs shadow-inner"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent className="rounded-xl">{ASSET_CONDITIONS.map(c => <SelectItem key={c} value={c} className="text-xs font-bold rounded-lg">{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </FormItem>
                      )}/>

                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Verification Pulse</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                            <FormControl><SelectTrigger className="h-12 rounded-xl bg-muted/10 border-2 border-transparent focus:ring-primary/20 font-black uppercase text-[10px] tracking-widest shadow-inner"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="VERIFIED" className="text-[10px] font-black uppercase tracking-widest rounded-lg">VERIFIED</SelectItem>
                              <SelectItem value="UNVERIFIED" className="text-[10px] font-black uppercase tracking-widest rounded-lg">UNVERIFIED</SelectItem>
                              <SelectItem value="DISCREPANCY" className="text-[10px] font-black uppercase tracking-widest rounded-lg">DISCREPANCY</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}/>
                    </div>

                    {/* Hierarchy & Provenance */}
                    <SectionHeader label="Fidelity & Provenance Pulse" icon={History} />
                    <div className="p-6 grid grid-cols-2 gap-3 bg-muted/5">
                      <FieldBlock label="Major Section" value={asset?.hierarchy?.section} icon={Database} />
                      <FieldBlock label="Temporal Subsection" value={asset?.hierarchy?.subsection} icon={History} />
                      <FieldBlock label="Asset Family" value={asset?.hierarchy?.assetFamily} icon={Tag} />
                      <FieldBlock label="Source Row" value={asset?.importMetadata?.rowNumber} icon={Hash} />
                      <FieldBlock label="Imported At" value={asset?.importMetadata?.importedAt ? new Date(asset.importMetadata.importedAt).toLocaleDateString() : 'MANUAL'} icon={CalendarDays} />
                      <FieldBlock label="Last Auditor" value={asset?.lastModifiedBy} icon={User} />
                    </div>

                    {/* Remarks Pulse */}
                    <div className="p-6">
                      <FormField control={form.control} name="metadata.remarks" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Auditor Field Notes</FormLabel>
                          <FormControl><Textarea {...(field as any)} readOnly={isReadOnly} className="min-h-[120px] rounded-2xl bg-muted/10 border-2 border-transparent focus:border-primary/20 font-medium text-sm shadow-inner p-4 resize-none" /></FormControl>
                        </FormItem>
                      )}/>
                    </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="history" className="m-0">
              <div className="p-6 space-y-8">
                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Replaying Lifecycle Pulse...</p>
                  </div>
                ) : history.length > 0 ? (
                  <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-primary/10">
                    {history.map((entry, idx) => (
                      <div key={entry.id} className="relative pl-12">
                        <div className={cn(
                          "absolute left-0 top-0 h-10 w-10 rounded-xl flex items-center justify-center shadow-lg border-2 z-10 transition-colors",
                          idx === 0 ? "bg-primary border-primary text-white" : "bg-card border-primary/20 text-primary"
                        )}>
                          <Clock className="h-5 w-5" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-black text-[11px] uppercase tracking-tight">
                              {entry.operation === 'CREATE' ? 'Initial Registration' : entry.operation === 'RESTORE' ? 'State Restoration' : 'Registry Update'}
                            </h4>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">
                              {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-3">
                            <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase">
                              <User className="h-3 w-3" /> {entry.performedBy}
                              <MapPin className="h-3 w-3 ml-2" /> {entry.userState}
                            </div>
                            {entry.changes && Object.keys(entry.changes).length > 0 && (
                              <div className="space-y-1.5 pt-2 border-t border-dashed border-border/40">
                                {Object.entries(entry.changes).map(([key, val]: [string, any]) => (
                                  <div key={key} className="flex items-center gap-2 text-[9px] font-bold overflow-hidden">
                                    <span className="text-muted-foreground uppercase shrink-0">{key}:</span>
                                    <span className="line-through opacity-40 truncate max-w-[60px]">{String(val.old || '---')}</span>
                                    <ArrowRight className="h-2.5 w-2.5 text-primary shrink-0" />
                                    <span className="text-primary truncate">{String(val.new)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 opacity-20 text-center space-y-4">
                    <History className="h-16 w-16" />
                    <div className="space-y-1">
                      <h3 className="text-xl font-black uppercase tracking-widest">History Silent</h3>
                      <p className="text-[10px] font-bold uppercase tracking-widest">No mutation pulses recorded for this asset.</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* Action Footer */}
        {!isReadOnly && activeTab === 'details' && (
            <div className="p-6 bg-background/80 backdrop-blur-xl border-t flex flex-row items-center gap-3 absolute bottom-0 left-0 right-0 z-40">
                <Button variant="ghost" onClick={() => { stopCamera(); onOpenChange(false); }} className="flex-1 h-14 font-black uppercase text-[10px] tracking-widest rounded-2xl tactile-pulse">DISCARD DRAFT</Button>
                <Button type="submit" form="asset-form" disabled={isSaving} className="flex-1 h-14 font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-primary/30 rounded-2xl bg-primary text-primary-foreground tactile-pulse">
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />}
                    COMMIT PULSE
                </Button>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
