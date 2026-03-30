'use client';

import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/app-layout';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Plus, Boxes, Loader2 } from 'lucide-react';
import { RegistryTable } from '@/modules/registry/components/RegistryTable';
import { AssetForm } from '@/components/asset-form';
import { enqueueMutation } from '@/offline/queue';
import { storage } from '@/offline/storage';
import { useToast } from '@/hooks/use-toast';
import type { Asset } from '@/types/domain';

export default function AssetRegistryPage() {
  const { assets, searchTerm, setSearchTerm, refreshRegistry, settingsLoaded } = useAppState();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>();
  const [isReadOnly, setIsReadOnly] = useState(false);

  const filteredAssets = useMemo(() => {
    if (!searchTerm) return assets;
    const term = searchTerm.toLowerCase();
    return assets.filter(a => 
      (a.name || '').toLowerCase().includes(term) ||
      (a.description || '').toLowerCase().includes(term) ||
      (a.serialNumber || '').toLowerCase().includes(term) ||
      (a.assetIdCode || '').toLowerCase().includes(term) ||
      (a.location || '').toLowerCase().includes(term)
    );
  }, [assets, searchTerm]);

  const handleInspect = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsReadOnly(true);
    setIsFormOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedAsset(undefined);
    setIsReadOnly(false);
    setIsFormOpen(true);
  };

  const handleSaveAsset = async (assetToSave: Asset) => {
    try {
      // 1. Enqueue for Cloud Sync
      await enqueueMutation('UPDATE', 'assets', assetToSave);
      
      // 2. Persist to Local Store immediately
      const currentAssets = await storage.getAssets();
      const exists = currentAssets.find(a => a.id === assetToSave.id);
      let updated;
      if (exists) {
        updated = currentAssets.map(a => a.id === assetToSave.id ? assetToSave : a);
      } else {
        updated = [assetToSave, ...currentAssets];
      }
      
      await storage.saveAssets(updated);
      
      // 3. Refresh State Pulse
      await refreshRegistry();
      
      toast({
        title: "Registry Modification Saved",
        description: "The asset state has been committed locally and queued for cloud broadcast."
      });
      
      setIsFormOpen(false);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Registry Commitment Failure",
        description: "An error occurred while saving the asset pulse."
      });
    }
  };

  if (authLoading || !settingsLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 flex flex-col h-full pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search registry by ID, serial, or name..." 
              className="pl-10 h-12 rounded-2xl bg-card border-none shadow-sm font-medium text-sm focus-visible:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card border-none shadow-sm hover:bg-primary/5 transition-all">
              <Filter className="h-4 w-4 text-primary" /> Filter Engine
            </Button>
            <Button onClick={handleCreateNew} className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-primary/20">
              <Plus className="h-4 w-4" /> New Registration
            </Button>
          </div>
        </div>

        {filteredAssets.length > 0 ? (
          <RegistryTable 
            assets={filteredAssets} 
            onInspect={handleInspect} 
          />
        ) : (
          <div className="flex-1 bg-card/50 rounded-3xl border-2 border-dashed border-border/40 flex flex-col items-center justify-center text-center p-20">
            <div className="flex flex-col items-center gap-4 opacity-20">
              <div className="p-6 bg-muted rounded-full">
                <Boxes className="h-16 w-16" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase tracking-widest">Registry Silent</h3>
                <p className="text-sm font-medium max-w-xs">No asset pulses match the current query or the store is empty.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <AssetForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        asset={selectedAsset}
        isReadOnly={isReadOnly}
        onSave={handleSaveAsset}
        onQuickSave={async () => {}}
      />
    </AppLayout>
  );
}
