"use client";

/**
 * @fileOverview AssetForm - Operational Detail Workstation.
 * Phase 57: Integrated Forensic Signature Capture Pad.
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
  Navigation,
  Maximize,
  ScanLine,
  RotateCcw,
  PenTool,
  RotateCw,
  Trash2
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useAppState } from "@/contexts/app-state-context";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ASSET_CONDITIONS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { AssetSchema } from "@/core/registry/validation";
import { FirestoreService } from "@/services/firebase/firestore";
import type { Asset, ActivityLogEntry, Geotag } from "@/types/domain";
import type { RegistryHeader } from "@/types/registry";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
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

const SectionHeader = ({ label, icon: Icon }: { label: string; icon: any }) => (
  <div className="flex items-center gap-3 px-4 md:px-6 py-4 bg-muted/20 border-y border-border/40">
    <Icon className="h-4 w-4 text-primary opacity-60" />
    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</h4>
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
  const [activeTab, setActiveTab] = useState("details");
  const [history, setHistory] = useState<ActivityLogEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const { userProfile } = useAuth();
  const { activeGrantId, isOnline, refreshRegistry } = useAppState();
  const { toast } = useToast();
  
  // Media State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Signature State
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedSignature, setCapturedSignature] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const form = useForm<Asset>({
    resolver: zodResolver(AssetSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (isOpen) {
      setActiveTab("details");
      if (asset) {
        form.reset(asset);
        setCapturedPhoto(asset.photoUrl || asset.photoDataUri || null);
        setCapturedSignature(asset.signatureUrl || asset.signatureDataUri || null);
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
          description: '',
          category: '',
          custodian: 'Unassigned',
          serialNumber: 'N/A',
          lastModified: new Date().toISOString(),
          lastModifiedBy: userProfile?.displayName || 'Unknown',
          hierarchy: { document: 'Manual Entry', section: 'General', subsection: 'Base Register', assetFamily: 'Uncategorized' },
          importMetadata: { sourceFile: 'MANUAL', sheetName: 'MANUAL', rowNumber: 0, importedAt: new Date().toISOString() },
          metadata: {}
        } as Asset);
        setCapturedPhoto(null);
        setCapturedSignature(null);
        setHistory([]);
      }
    }
  }, [isOpen, asset, form, userProfile, activeGrantId, isOnline]);

  // --- Signature Pad Logic ---
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (isReadOnly) return;
    setIsDrawing(true);
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#2E3192'; // Brand Navy
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      setCapturedSignature(canvas.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      setCapturedSignature(null);
    }
  };

  const loadHistory = async (id: string) => {
    setLoadingHistory(true);
    try {
      const log = await FirestoreService.getAssetHistory(id);
      setHistory(log);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRevert = async () => {
    if (!asset || !userProfile?.isAdmin) return;
    setIsReverting(true);
    try {
      await FirestoreService.restoreAsset(asset.id, userProfile.displayName);
      toast({ title: "Reversion Pulse Complete", description: "Record successfully rolled back." });
      await refreshRegistry();
      onOpenChange(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Reversion Failed" });
    } finally {
      setIsReverting(false);
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
        const dataUri = canvas.toDataURL('image/jpeg', 0.8);
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
            photoDataUri: capturedPhoto?.startsWith('data:') ? capturedPhoto : undefined,
            signatureDataUri: capturedSignature?.startsWith('data:') ? capturedSignature : undefined,
            lastModified: new Date().toISOString(),
            lastModifiedBy: userProfile?.displayName || 'Unknown'
        });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) stopCamera(); onOpenChange(open); }}>
      <DialogContent className="max-w-2xl w-full flex flex-col h-full sm:h-[95vh] p-0 overflow-hidden sm:rounded-[2.5rem] border-none shadow-2xl bg-background">
        {/* Header Bar */}
        <div className="flex flex-col shrink-0">
          <div className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-md z-30">
              <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => { stopCamera(); onOpenChange(false); }} className="rounded-xl h-10 w-10">
                      <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex flex-col">
                    <DialogTitle className="text-xs md:text-sm font-black tracking-tight uppercase leading-none truncate max-w-[120px] md:max-w-xs">
                      {asset?.assetIdCode || 'NEW ASSET RECORD'}
                    </DialogTitle>
                    <span className="text-[8px] font-black uppercase text-muted-foreground tracking-[0.2em] mt-1 opacity-60">
                      {isOnline ? 'Online Assets View' : 'Locally Saved Store'}
                    </span>
                  </div>
              </div>
              
              <div className="flex items-center gap-1">
                  {!isReadOnly && (
                      <Button variant="ghost" size="icon" onClick={startCamera} className="text-primary h-10 w-10 rounded-xl hover:bg-primary/10"><Camera className="h-5 w-5" /></Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl opacity-40 hover:opacity-100"><Share2 className="h-5 w-5" /></Button>
              </div>
          </div>

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
                    {isCameraActive ? (
                      <div className="relative aspect-[4/3] bg-black overflow-hidden m-2 sm:m-4 rounded-[1.5rem] sm:rounded-[2rem] border-4 border-primary/20">
                          <video ref={videoRef} className="w-full h-full object-cover opacity-80" autoPlay muted playsInline />
                          
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-[80%] h-[70%] border-2 border-white/40 border-dashed rounded-xl relative">
                              <ScanLine className="absolute top-0 left-0 w-full h-0.5 bg-primary/60 animate-[scan_2s_linear_infinite]" />
                              <div className="absolute -top-2 -left-2 h-6 w-6 border-t-4 border-l-4 border-primary" />
                              <div className="absolute -top-2 -right-2 h-6 w-6 border-t-4 border-r-4 border-primary" />
                              <div className="absolute -bottom-2 -left-2 h-6 w-6 border-b-4 border-l-4 border-primary" />
                              <div className="absolute -bottom-2 -right-2 h-6 w-6 border-b-4 border-r-4 border-primary" />
                            </div>
                          </div>

                          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[8px] font-black uppercase text-white tracking-widest">Document Scanner Active</span>
                          </div>

                          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6">
                              <Button variant="destructive" size="icon" className="h-14 w-14 rounded-2xl shadow-xl" onClick={stopCamera}><X className="h-6 w-6" /></Button>
                              <Button className="h-16 w-16 rounded-full bg-white text-black shadow-2xl border-[6px] border-black/10" onClick={capturePhoto}>
                                <div className="h-10 w-10 border-4 border-black rounded-full" />
                              </Button>
                          </div>
                      </div>
                    ) : capturedPhoto ? (
                      <div className="relative group aspect-video bg-muted m-2 sm:m-4 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden border-2 border-primary/10 shadow-lg">
                          <img src={capturedPhoto} className="w-full h-full object-cover" alt="Asset Evidence" />
                          <div className="absolute top-4 right-4 flex gap-2">
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
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Open Document Scanner</span>
                      </div>
                    )}

                    <SectionHeader label="Record Identification" icon={Tag} />
                    <div className="px-4 md:px-6 py-6 space-y-6">
                      <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Asset Description</FormLabel>
                          <FormControl><Input {...field} readOnly={isReadOnly} className="h-12 rounded-xl bg-muted/10 border-2 border-transparent focus:border-primary/20 font-black uppercase text-sm shadow-inner" /></FormControl>
                        </FormItem>
                      )}/>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="assetIdCode" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Tag ID Code</FormLabel>
                            <FormControl><Input {...field} readOnly={isReadOnly} className="h-12 rounded-xl bg-muted/10 border-2 border-transparent focus:border-primary/20 font-black uppercase text-sm shadow-inner" /></FormControl>
                          </FormItem>
                        )}/>

                        <FormField control={form.control} name="serialNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Serial Number</FormLabel>
                            <FormControl><Input {...field} readOnly={isReadOnly} className="h-12 rounded-xl bg-muted/10 border-2 border-transparent focus:border-primary/20 font-black uppercase text-sm shadow-inner" /></FormControl>
                          </FormItem>
                        )}/>
                      </div>
                    </div>

                    <SectionHeader label="Field Assessment" icon={MapPin} />
                    <div className="px-4 md:px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-dashed">
                      <FormField control={form.control} name="location" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Location Scope</FormLabel>
                          <FormControl><Input {...field} readOnly={isReadOnly} className="h-12 rounded-xl bg-muted/10 border-2 border-transparent focus:border-primary/20 font-black uppercase text-sm shadow-inner" /></FormControl>
                        </FormItem>
                      )}/>

                      <FormField control={form.control} name="condition" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Asset Condition</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                            <FormControl><SelectTrigger className="h-12 rounded-xl bg-muted/10 border-2 border-transparent focus:ring-primary/20 font-bold text-xs shadow-inner"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent className="rounded-xl">{ASSET_CONDITIONS.map(c => <SelectItem key={c} value={c} className="text-xs font-bold">{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </FormItem>
                      )}/>
                    </div>

                    {/* Forensic Signature Section */}
                    <SectionHeader label="Forensic Field Integrity" icon={PenTool} />
                    <div className="px-4 md:px-6 py-8">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">Custodian Signature Pulse</label>
                          {!isReadOnly && capturedSignature && (
                            <Button variant="ghost" size="sm" onClick={clearSignature} className="h-8 px-3 rounded-lg text-[8px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10">
                              <RotateCw className="h-3 w-3 mr-1.5" /> Reset Signature
                            </Button>
                          )}
                        </div>

                        {!isReadOnly ? (
                          <div className="relative aspect-[3/1] bg-card border-2 border-dashed border-primary/20 rounded-3xl overflow-hidden shadow-inner cursor-crosshair">
                            <canvas
                              ref={signatureCanvasRef}
                              width={600}
                              height={200}
                              className="w-full h-full touch-none"
                              onMouseDown={startDrawing}
                              onMouseMove={draw}
                              onMouseUp={stopDrawing}
                              onMouseLeave={stopDrawing}
                              onTouchStart={startDrawing}
                              onTouchMove={draw}
                              onTouchEnd={stopDrawing}
                            />
                            {!capturedSignature && !isDrawing && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20">
                                <PenTool className="h-8 w-8 mb-2" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sign here to anchor assessment</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="aspect-[3/1] bg-muted/10 border-2 border-dashed border-border/40 rounded-3xl flex items-center justify-center overflow-hidden">
                            {capturedSignature ? (
                              <img src={capturedSignature} className="max-h-full mix-blend-multiply opacity-80" alt="Custodian Signature" />
                            ) : (
                              <div className="text-[10px] font-medium italic opacity-30">Zero signature pulse captured.</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="history" className="m-0 h-full">
              <div className="p-4 md:p-6 space-y-6">
                {userProfile?.isAdmin && asset?.previousState && (
                  <div className="p-6 rounded-[2rem] bg-primary/5 border-2 border-dashed border-primary/20 flex items-center justify-between group hover:border-primary/40 transition-all">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-tight">Restoration Pulse Available</h4>
                      <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">
                        Roll back this record to its previous verified state.
                      </p>
                    </div>
                    <Button 
                      onClick={handleRevert} 
                      disabled={isReverting}
                      className="h-11 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 shadow-xl shadow-primary/10"
                    >
                      {isReverting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                      Execute Revert
                    </Button>
                  </div>
                )}

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
                            <User className="h-3.5 w-3.5 inline mr-2 text-primary" /> {entry.performedBy}
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

        {/* Footer Control */}
        {!isReadOnly && activeTab === 'details' && (
            <div className="p-4 md:p-6 bg-background/80 backdrop-blur-xl border-t flex flex-col sm:flex-row items-center gap-3 absolute bottom-0 left-0 right-0 z-40">
                <Button variant="ghost" onClick={() => { stopCamera(); onOpenChange(false); }} className="w-full sm:flex-1 h-14 font-black uppercase text-[10px] tracking-widest rounded-2xl">DISCARD</Button>
                <Button type="submit" form="asset-form" disabled={isSaving} className="w-full sm:flex-1 h-14 font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-primary/30 rounded-2xl bg-primary text-primary-foreground">
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />}
                    COMMIT RECORD
                </Button>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
