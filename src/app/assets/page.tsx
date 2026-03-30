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
import { AssetFilterDialog, type FilterOption } from '@/components/asset-filter-sheet';
import { enqueueMutation } from '@/offline/queue';
import { storage } from '@/offline/storage';
import { useToast } from '@/hooks/use-toast';
import type { Asset } from '@/types/domain';

export default function AssetRegistryPage() {
  const { assets, searchTerm, setSearchTerm, refreshRegistry, settingsLoaded } = useAppState();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>();
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Filter State
  const [filters, setFilters] = useState({
    sections: [] as string[],
    subsections: [] as string[],
    locations: [] as string[],
    statuses: [] as string[]
  });

  // Derivative Options for Filters
  const filterOptions = useMemo(() => {
    const sections = new Map<string, number>();
    const subsections = new Map<string, number>();
    const locations = new Map<string, number>();
    const statuses = new Map<string, number>();

    assets.forEach(a => {
      sections.set(a.section, (sections.get(a.section) || 0) + 1);
      subsections.set(a.subsection, (subsections.get(a.subsection) || 0) + 1);
      locations.set(a.location, (locations.get(a.location) || 0) + 1);
      statuses.set(a.status, (statuses.get(a.status) || 0) + 1);
    });

    const toOption = (map: Map<string, number>): FilterOption[] => 
      Array.from(map.entries()).map(([label, count]) => ({ label, value: label, count }));

    return {
      sections: toOption(sections),
      subsections: toOption(subsections),
      locations: toOption(locations),
      statuses: toOption(statuses)
    };
  }, [assets]);

  // Combined Filtering Logic
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      // 1. Search Term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const match = (a.description || '').toLowerCase().includes(term) ||
                      (a.serialNumber || '').toLowerCase().includes(term) ||
                      (a.assetIdCode || '').toLowerCase().includes(term);
        if (!match) return false;
      }

      // 2. Multi-Select Filters
      if (filters.sections.length > 0 && !filters.sections.includes(a.section)) return false;
      if (filters.subsections.length > 0 && !filters.subsections.includes(a.subsection)) return false;
      if (filters.locations.length > 0 && !filters.locations.includes(a.location)) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(a.status)) return false;

      return true;
    });
  }, [assets, searchTerm, filters]);

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
      await enqueueMutation('UPDATE', 'assets', assetToSave);
      const currentAssets = await storage.getAssets();
      const updated = currentAssets.find(a => a.id === assetToSave.id)
        ? currentAssets.map(a => a.id === assetToSave.id ? assetToSave : a)
        : [assetToSave, ...currentAssets];
      
      await storage.saveAssets(updated);
      await refreshRegistry();
      
      toast({ title: "Registry Saved", description: "Asset state committed locally." });
      setIsFormOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Save Failure", description: "Registry commit failed." });
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
            <Button 
              variant="outline" 
              onClick={() => setIsFilterOpen(true)}
              className={cn(
                "h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card border-none shadow-sm transition-all",
                Object.values(filters).flat().length > 0 ? "text-primary ring-2 ring-primary/20" : "hover:bg-primary/5"
              )}
            >
              <Filter className="h-4 w-4" /> Filter Engine
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

      <AssetFilterDialog
        isOpen={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        sections={filterOptions.sections}
        subsections={filterOptions.subsections}
        locations={filterOptions.locations}
        statuses={filterOptions.statuses}
        filters={filters}
        setFilters={setFilters}
        onReset={() => setFilters({ sections: [], subsections: [], locations: [], statuses: [] })}
      />
    </AppLayout>
  );
}