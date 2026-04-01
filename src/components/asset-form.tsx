"use client";

/**
 * @fileOverview AssetForm - Mobile-Adaptive Audit Workstation.
 * Phase 250: Full-screen modal on mobile and touch-friendly controls.
 */

import React, { useEffect, useState } from "react";
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
import { 
  Loader2, 
  ArrowLeft, 
  Share2, 
  ShieldCheck, 
  Tag, 
  MapPin, 
  History, 
  Info,
  Clock,
  User,
  RotateCcw
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
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface AssetFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: Asset;
  onSave: (assetToSave: Asset) => Promise<void>;
  isReadOnly: boolean;
}

const SectionHeader = ({ label, icon: Icon }: { label: string; icon: any }) => (
  <div className="flex items-center gap-3 px-4 md:px-6 py-4 bg-white/[0.03] border-y border-white/5">
    <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary opacity-60" />
    <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{label}</h4>
  </div>
);

export default function AssetForm({ 
    isOpen, 
    onOpenChange, 
    asset,
    onSave, 
    isReadOnly,
}: AssetFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [history, setHistory] = useState<ActivityLogEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  
  const { userProfile } = useAuth();
  const { activeGrantId, isOnline, refreshRegistry } = useAppState();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const form = useForm<Asset>({
    resolver: zodResolver(AssetSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (isOpen) {
      setActiveTab("details");
      if (asset) {
        form.reset(asset);
        if (isOnline) loadHistory(asset.id);
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
          hierarchy: { document: 'Manual', section: 'General', subsection: 'Base Register', assetFamily: 'Uncategorized' },
          importMetadata: { sourceFile: 'MANUAL', sheetName: 'MANUAL', rowNumber: 0, importedAt: new Date().toISOString() },
          metadata: {}
        } as Asset);
        setHistory([]);
      }
    }
  }, [isOpen, asset, form, userProfile, activeGrantId, isOnline]);

  const loadHistory = async (id: string) => {
    setLoadingHistory(true);
    try {
      const log = await FirestoreService.getAssetHistory(id);
      setHistory(log);
    } catch (e) {
      console.warn("History pulse latent.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRevert = async () => {
    if (!asset || !userProfile?.isAdmin) return;
    setIsReverting(true);
    try {
      await FirestoreService.restoreAsset(asset.id, userProfile.displayName);
      toast({ title: "Restoration Pulse Complete" });
      await refreshRegistry();
      onOpenChange(false);
    } finally {
      setIsReverting(false);
    }
  };

  const onSubmit = async (data: Asset) => {
    setIsSaving(true);
    try {
        await onSave({
            ...data,
            lastModified: new Date().toISOString(),
            lastModifiedBy: userProfile?.displayName || 'Unknown'
        });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-2xl w-full flex flex-col p-0 overflow-hidden bg-black text-white border-none shadow-3xl",
        isMobile ? "h-screen rounded-none" : "h-[95vh] rounded-[2.5rem]"
      )}>
        <div className="flex flex-col shrink-0">
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/5 bg-black/80 backdrop-blur-md z-30">
              <div className="flex items-center gap-3 md:gap-4">
                  <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl h-10 w-10 md:h-12 md:w-12 bg-white/5 hover:bg-white/10">
                      <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex flex-col">
                    <DialogTitle className="text-sm md:text-base font-black tracking-tight uppercase leading-none truncate max-w-[160px] md:max-w-xs">
                      {asset?.assetIdCode || 'NEW ASSET RECORD'}
                    </DialogTitle>
                    <span className="text-[8px] md:text-[9px] font-black uppercase text-white/40 tracking-[0.2em] mt-1.5 leading-none">
                      AUDIT WORKSTATION V5.5
                    </span>
                  </div>
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10 md:h-12 md:w-12 rounded-xl opacity-40 hover:opacity-100 transition-opacity"><Share2 className="h-5 w-5" /></Button>
          </div>

          <div className="px-4 md:px-6 py-2 border-b border-white/5 bg-white/[0.02]">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 bg-black/40 p-1 rounded-xl h-11 md:h-12 border border-white/5">
                <TabsTrigger value="details" className="rounded-lg font-black uppercase text-[9px] md:text-[10px] tracking-widest gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-white">
                  <Info className="h-3.5 w-3.5" /> Profile
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg font-black uppercase text-[9px] md:text-[10px] tracking-widest gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-white">
                  <History className="h-3.5 w-3.5" /> History
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <ScrollArea className="flex-1 bg-black custom-scrollbar">
          <Tabs value={activeTab} className="w-full h-full">
            <TabsContent value="details" className="m-0 h-full pb-32 md:pb-40">
              <Form {...form}>
                <form id="asset-form" onSubmit={form.handleSubmit(onSubmit)}>
                    <SectionHeader label="Identity Pulse" icon={Tag} />
                    <div className="px-4 md:px-8 py-6 space-y-6">
                      <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 pl-1">Description</FormLabel>
                          <FormControl><Input {...field} readOnly={isReadOnly} className="h-14 rounded-xl bg-white/[0.03] border-2 border-transparent focus:border-primary/40 font-black uppercase text-sm md:text-base shadow-inner text-white" /></FormControl>
                        </FormItem>
                      )}/>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="assetIdCode" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 pl-1">Tag ID Code</FormLabel>
                            <FormControl><Input {...field} readOnly={isReadOnly} className="h-14 rounded-xl bg-white/[0.03] border-2 border-transparent focus:border-primary/40 font-black uppercase text-sm shadow-inner text-white" /></FormControl>
                          </FormItem>
                        )}/>

                        <FormField control={form.control} name="serialNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 pl-1">Serial Number</FormLabel>
                            <FormControl><Input {...field} readOnly={isReadOnly} className="h-14 rounded-xl bg-white/[0.03] border-2 border-transparent focus:border-primary/40 font-black uppercase text-sm shadow-inner text-white" /></FormControl>
                          </FormItem>
                        )}/>
                      </div>
                    </div>

                    <SectionHeader label="Field Assessment" icon={MapPin} />
                    <div className="px-4 md:px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="location" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 pl-1">Location</FormLabel>
                          <FormControl><Input {...field} readOnly={isReadOnly} className="h-14 rounded-xl bg-white/[0.03] border-2 border-transparent focus:border-primary/40 font-black uppercase text-sm shadow-inner text-white" /></FormControl>
                        </FormItem>
                      )}/>

                      <FormField control={form.control} name="condition" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 pl-1">Condition</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                            <FormControl>
                              <SelectTrigger className="h-14 rounded-xl bg-white/[0.03] border-2 border-transparent focus:ring-primary/40 font-bold text-sm shadow-inner text-white">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-[#0A0A0A] border-white/10 rounded-xl">
                              {ASSET_CONDITIONS.map(c => <SelectItem key={c} value={c} className="text-xs font-bold text-white focus:bg-primary focus:text-black">{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}/>
                    </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="history" className="m-0 h-full p-4 md:p-8">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-white">Replaying Ledger...</p>
                </div>
              ) : history.length > 0 ? (
                <div className="space-y-6">
                  {history.map((entry, idx) => (
                    <Card key={entry.id} className="bg-white/[0.02] border-white/5 p-5 rounded-2xl md:rounded-[2rem]">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="h-6 px-3 text-[8px] font-black uppercase border-primary/20 text-primary">{entry.operation}</Badge>
                        <span className="text-[8px] font-bold text-white/20 uppercase">{formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}</span>
                      </div>
                      <p className="text-xs font-black uppercase text-white/80 leading-none"><User className="h-3 w-3 inline mr-2 text-primary" /> {entry.performedBy}</p>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 opacity-20 text-center"><History className="h-12 w-12 mb-4" /><h3 className="text-xl font-black uppercase tracking-widest">History Clear</h3></div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {!isReadOnly && activeTab === 'details' && (
            <div className="p-6 md:p-8 bg-black/90 backdrop-blur-2xl border-t border-white/5 flex flex-row items-center gap-4 absolute bottom-0 left-0 right-0 z-40 shadow-3xl">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-14 md:h-16 font-black uppercase text-[10px] md:text-xs tracking-widest rounded-2xl md:rounded-[1.5rem] bg-white/5 hover:bg-white/10 text-white/60">CANCEL</Button>
                <Button type="submit" form="asset-form" disabled={isSaving} className="flex-[2] h-14 md:h-16 font-black uppercase text-[10px] md:text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 rounded-2xl md:rounded-[1.5rem] bg-primary text-black hover:bg-primary/90 transition-all active:scale-95">
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <ShieldCheck className="h-5 w-5 mr-3" />} COMMIT AUDIT
                </Button>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}