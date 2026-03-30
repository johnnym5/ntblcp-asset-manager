'use client';

import React, { useMemo, useState, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Filter, 
  Plus, 
  Boxes, 
  Loader2, 
  FileDown, 
  FileUp, 
  Settings2, 
  LayoutGrid, 
  List, 
  Trash2, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  ArrowLeft
} from 'lucide-react';
import { RegistryTable } from '@/modules/registry/components/RegistryTable';
import { AssetForm } from '@/components/asset-form';
import { AssetFilterDialog, type FilterOption } from '@/components/asset-filter-sheet';
import { enqueueMutation } from '@/offline/queue';
import { storage } from '@/offline/storage';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Asset } from '@/types/domain';
import { Badge } from '@/components/ui/badge';

export default function AssetRegistryPage() {
  const { assets, searchTerm, setSearchTerm, refreshRegistry, settingsLoaded, activeGrantId, appSettings } = useAppState();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // View States
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  
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
      if (a.section) sections.set(a.section, (sections.get(a.section) || 0) + 1);
      if (a.subsection) subsections.set(a.subsection, (subsections.get(a.subsection) || 0) + 1);
      if (a.location) locations.set(a.location, (locations.get(a.location) || 0) + 1);
      if (a.status) statuses.set(a.status, (statuses.get(a.status) || 0) + 1);
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

  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const match = (a.description || '').toLowerCase().includes(term) ||
                      (a.serialNumber || '').toLowerCase().includes(term) ||
                      (a.assetIdCode || '').toLowerCase().includes(term);
        if (!match) return false;
      }
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

  const handleToggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAssetIds(next);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedAssetIds(new Set(filteredAssets.map(a => a.id)));
    else setSelectedAssetIds(new Set());
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
      
      toast({ title: "Registry Updated", description: "Operation committed to background sync pulse." });
      setIsFormOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Operation Failed", description: "Registry integrity check failed." });
    }
  };

  const activeProjectName = appSettings?.grants.find(g => g.id === activeGrantId)?.name || 'Global Registry';

  if (authLoading || !settingsLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full gap-6 relative pb-24">
        {/* Top Operational Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black tracking-tight uppercase">{activeProjectName}</h2>
              <Badge variant="outline" className="font-black text-[10px] h-6 border-primary/20 bg-primary/5 text-primary">
                {filteredAssets.length} Records
              </Badge>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
              Primary Audit Workstation › Registry Context
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-muted/50 p-1 rounded-xl border border-border/40 mr-2">
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-card border-border/40 shadow-sm">
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl opacity-40">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Global Registry Search */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 group-focus-within:text-primary group-focus-within:opacity-100 transition-all" />
          <Input 
            placeholder="Search registry by ID, serial, or name..." 
            className="pl-12 h-14 rounded-2xl bg-card border-2 border-transparent shadow-xl focus-visible:ring-primary/20 focus-visible:border-primary/20 text-base font-medium transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Action Header (Selection Context) */}
        {selectedIds.size > 0 && (
          <div className="bg-primary text-primary-foreground p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-4 duration-300 shadow-2xl shadow-primary/20">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setSelectedAssetIds(new Set())}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="font-black uppercase text-xs tracking-widest">{selectedIds.size} Records Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase text-white hover:bg-white/10">Mark Verified</Button>
              <Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase text-white hover:bg-white/10">Move Section</Button>
              <Separator orientation="vertical" className="h-6 bg-white/20" />
              <Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase text-white hover:bg-red-500/20">Delete</Button>
            </div>
          </div>
        )}

        {/* Registry Surface */}
        <div className="flex-1 bg-card/50 rounded-[2.5rem] border-2 border-dashed border-border/40 overflow-hidden">
          {filteredAssets.length > 0 ? (
            <RegistryTable 
              assets={filteredAssets} 
              onInspect={handleInspect}
              selectedIds={selectedIds}
              onToggleSelection={handleToggleSelection}
              onSelectAll={handleSelectAll}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-20 opacity-20">
              <Boxes className="h-20 w-20 mb-6" />
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase tracking-widest">Registry Silent</h3>
                <p className="text-sm font-medium max-w-xs">No records match the current operational filter.</p>
              </div>
            </div>
          )}
        </div>

        {/* High-Impact Action Pulse (Bottom Bar) */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-background/80 backdrop-blur-xl p-3 rounded-[2rem] border-2 border-primary/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border-t-primary/20">
          <Button 
            className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] gap-3 shadow-2xl shadow-primary/20"
            onClick={handleCreateNew}
          >
            <Plus className="h-4 w-4" /> New Registration
          </Button>
          <Separator orientation="vertical" className="h-10 opacity-50" />
          <Button 
            variant="outline" 
            className="h-14 w-14 p-0 rounded-2xl bg-card border-border/40 hover:bg-primary/5 transition-all group"
            onClick={() => setIsFilterOpen(true)}
          >
            <Filter className={cn("h-5 w-5", Object.values(filters).flat().length > 0 ? "text-primary" : "text-muted-foreground")} />
            {Object.values(filters).flat().length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-white rounded-full text-[8px] flex items-center justify-center font-black">
                {Object.values(filters).flat().length}
              </span>
            )}
          </Button>
          <Button variant="outline" className="h-14 w-14 p-0 rounded-2xl bg-card border-border/40 hover:bg-primary/5 transition-all">
            <FileUp className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="outline" className="h-14 w-14 p-0 rounded-2xl bg-card border-border/40 hover:bg-primary/5 transition-all">
            <FileDown className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Overlays */}
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

function Separator({ orientation = 'horizontal', className }: { orientation?: 'horizontal' | 'vertical', className?: string }) {
  return (
    <div className={cn(
      "bg-border shrink-0",
      orientation === 'horizontal' ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    )} />
  );
}
