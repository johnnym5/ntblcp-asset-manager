'use client';

/**
 * @fileOverview Verification Queue - Field Auditor Assessment Workspace.
 * Optimized for high-speed field verification flows.
 */

import React, { useState } from 'react';
import AppLayout from '@/components/app-layout';
import { CheckCircle2, Search, Filter, ClipboardCheck, Clock, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AssetForm } from '@/components/asset-form';
import type { Asset } from '@/types/domain';
import { enqueueMutation } from '@/offline/queue';
import { storage } from '@/offline/storage';
import { useToast } from '@/hooks/use-toast';

export default function VerificationQueuePage() {
  const { assets, refreshRegistry } = useAppState();
  const { toast } = useToast();
  
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const unverified = assets.filter(a => a.status === 'UNVERIFIED');

  const handleOpenAssessment = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsFormOpen(true);
  };

  const handleSaveVerification = async (assetToSave: Asset) => {
    try {
      await enqueueMutation('UPDATE', 'assets', assetToSave);
      const current = await storage.getAssets();
      await storage.saveAssets(current.map(a => a.id === assetToSave.id ? assetToSave : a));
      await refreshRegistry();
      toast({ title: "Assessment Committed", description: "Verification pulse injected into sync queue." });
      setIsFormOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Assessment Failure" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">Verification Queue</h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              Mandatory Field Assessments & Operability Checks
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="h-10 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest border-primary/20 bg-primary/5 text-primary">
              {unverified.length} Items Pending Assessment
            </Badge>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input 
              placeholder="Scan Asset ID or Search Queue..." 
              className="pl-12 h-14 rounded-2xl bg-card border-none shadow-sm font-medium text-sm focus-visible:ring-primary/20"
            />
          </div>
          <Button variant="outline" className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card border-none shadow-sm transition-all hover:bg-primary/5">
            <Filter className="h-4 w-4" /> Filter Scope
          </Button>
        </div>

        {unverified.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {unverified.map(asset => (
              <Card key={asset.id} className="border-2 border-border/40 hover:border-primary/20 transition-all rounded-[2rem] overflow-hidden group cursor-pointer bg-card/50" onClick={() => handleOpenAssessment(asset)}>
                <CardContent className="p-0">
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="p-3 bg-muted rounded-2xl group-hover:bg-primary/10 transition-colors">
                        <ClipboardCheck className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-tighter rounded-lg bg-background border">
                        {asset.category}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-black text-lg tracking-tight truncate uppercase">{asset.description || asset.name}</h3>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{asset.location}</span>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-dashed flex items-center justify-between">
                      <div className="flex items-center gap-2 text-orange-600">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Awaiting field assessment</span>
                      </div>
                      <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest hover:text-primary p-0 h-auto">
                        Assessment Pulse <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex-1 bg-card/50 rounded-3xl border-2 border-dashed border-border/40 flex flex-col items-center justify-center text-center p-20 py-32">
            <div className="flex flex-col items-center gap-6 opacity-20">
              <div className="p-10 bg-muted rounded-[2.5rem]">
                <CheckCircle2 className="h-20 w-20" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-widest">Queue Status: Reconciled</h3>
                <p className="text-sm font-medium max-w-xs mx-auto">All assets in your regional scope have been verified. Field audit pulses are complete.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <AssetForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        asset={selectedAsset}
        isReadOnly={false}
        onSave={handleSaveVerification}
        onQuickSave={async () => {}}
      />
    </AppLayout>
  );
}
