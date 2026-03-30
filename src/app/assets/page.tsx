'use client';

/**
 * @fileOverview Registry Workspace - High-Performance Asset Browser.
 * Phase 18: Activated Batch Operations & Selection Bar Hardening.
 */

import React, { useMemo, useState, useCallback } from 'react';
import AppLayout from '@/components/app-layout';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Plus, 
  Boxes, 
  Loader2, 
  FileDown, 
  FileUp, 
  LayoutGrid, 
  List, 
  MapPin,
  Tag,
  ChevronRight,
  ChevronLeft,
  X,
  Database,
  DatabaseZap,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ClipboardEdit
} from 'lucide-react';
import { RegistryTable } from '@/modules/registry/components/RegistryTable';
import { AssetForm } from '@/components/asset-form';
import { AssetFilterDialog, type FilterOption } from '@/components/asset-filter-sheet';
import { AssetBatchEditForm, type BatchUpdateData } from '@/components/asset-batch-edit-form';
import { enqueueMutation } from '@/offline/queue';
import { storage } from '@/offline/storage';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Asset } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ExcelService } from '@/services/excel-service';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type SortConfig = {
  key: keyof Asset | 'sn';
  direction: 'asc' | 'desc';
};

const ITEMS_PER_PAGE = 25;

export default function AssetRegistryPage() {
  const { 
    assets, 
    sandboxAssets, 
    dataSource, 
    setDataSource, 
    searchTerm, 
    setSearchTerm, 
    refreshRegistry, 
    settingsLoaded, 
    activeGrantId, 
    appSettings 
  } = useAppState();
  
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // View States
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [selectedIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showSearch, setShowSearch] = useState(false);
  
  // Sort State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'description', direction: 'asc' });

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>();
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Active Context Data
  const currentRegistry = dataSource === 'PRODUCTION' ? assets : sandboxAssets;

  // Filter State
  const [filters, setFilters] = useState({
    sections: [] as string[],
    subsections: [] as string[],
    locations: [] as string[],
    statuses: [] as string[]
  });

  const filterOptions = useMemo(() => {
    const sections = new Map<string, number>();
    const subsections = new Map<string, number>();
    const locations = new Map<string, number>();
    const statuses = new Map<string, number>();

    currentRegistry.forEach(a => {
      const s = a.section || 'General';
      const ss = a.subsection || 'Base Register';
      const l = a.location || 'Global';
      const st = a.status || 'UNVERIFIED';

      sections.set(s, (sections.get(s) || 0) + 1);
      subsections.set(ss, (subsections.get(ss) || 0) + 1);
      locations.set(l, (locations.get(l) || 0) + 1);
      statuses.set(st, (statuses.get(st) || 0) + 1);
    });

    const toOption = (map: Map<string, number>): FilterOption[] => 
      Array.from(map.entries()).map(([label, count]) => ({ label, value: label, count }));

    return {
      sections: toOption(sections),
      subsections: toOption(subsections),
      locations: toOption(locations),
      statuses: toOption(statuses)
    };
  }, [currentRegistry]);

  const filteredAndSortedAssets = useMemo(() => {
    let results = currentRegistry.filter(a => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const match = (a.description || '').toLowerCase().includes(term) ||
                      (a.serialNumber || '').toLowerCase().includes(term) ||
                      (a.assetIdCode || '').toLowerCase().includes(term);
        if (!match) return false;
      }
      if (filters.sections.length > 0 && !filters.sections.includes(a.section || 'General')) return false;
      if (filters.subsections.length > 0 && !filters.subsections.includes(a.subsection || 'Base Register')) return false;
      if (filters.locations.length > 0 && !filters.locations.includes(a.location || 'Global')) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(a.status || 'UNVERIFIED')) return false;
      return true;
    });

    results.sort((a, b) => {
      let aVal: any = a[sortConfig.key as keyof Asset] || '';
      let bVal: any = b[sortConfig.key as keyof Asset] || '';

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return results;
  }, [currentRegistry, searchTerm, filters, sortConfig]);

  const paginatedAssets = useMemo(() => {
    return filteredAndSortedAssets.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredAndSortedAssets, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedAssets.length / ITEMS_PER_PAGE);

  const handleInspect = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsReadOnly(dataSource === 'PRODUCTION' && appSettings?.appMode === 'management');
    setIsFormOpen(true);
  };

  const handleSaveAsset = async (assetToSave: Asset) => {
    try {
      if (dataSource === 'PRODUCTION') {
        const original = assets.find(a => a.id === assetToSave.id);
        const readyAsset = {
          ...assetToSave,
          previousState: original ? { ...original, previousState: undefined } : undefined
        };
        await enqueueMutation('UPDATE', 'assets', readyAsset);
        const currentAssets = await storage.getAssets();
        const updated = currentAssets.find(a => a.id === assetToSave.id)
          ? currentAssets.map(a => a.id === assetToSave.id ? readyAsset : a)
          : [readyAsset, ...currentAssets];
        await storage.saveAssets(updated);
      } else {
        const currentSandbox = await storage.getSandbox();
        const updated = currentSandbox.map(a => a.id === assetToSave.id ? assetToSave : a);
        await storage.saveToSandbox(updated);
      }
      
      await refreshRegistry();
      toast({ title: "Registry Updated", description: "Operation committed to local pulse." });
      setIsFormOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Operation Failed" });
    }
  };

  const handleBatchSave = async (data: BatchUpdateData) => {
    setIsProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const updates = currentRegistry.filter(a => ids.includes(a.id)).map(asset => ({
        ...asset,
        ...data,
        previousState: dataSource === 'PRODUCTION' ? { ...asset, previousState: undefined } : undefined,
        lastModified: new Date().toISOString(),
        lastModifiedBy: userProfile?.displayName || 'System Batch'
      }));

      if (dataSource === 'PRODUCTION') {
        for (const asset of updates) {
          await enqueueMutation('UPDATE', 'assets', asset);
        }
        const currentAssets = await storage.getAssets();
        const assetMap = new Map(currentAssets.map(a => [a.id, a]));
        updates.forEach(a => assetMap.set(a.id, a as Asset));
        await storage.saveAssets(Array.from(assetMap.values()));
      } else {
        const currentSandbox = await storage.getSandbox();
        const sandboxMap = new Map(currentSandbox.map(a => [a.id, a]));
        updates.forEach(a => sandboxMap.set(a.id, a as Asset));
        await storage.saveToSandbox(Array.from(sandboxMap.values()));
      }

      await refreshRegistry();
      setSelectedAssetIds(new Set());
      toast({ title: "Batch Pulse Complete", description: `Updated ${updates.length} records.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Batch Pulse Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchDelete = async () => {
    setIsProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      if (dataSource === 'PRODUCTION') {
        for (const id of ids) {
          await enqueueMutation('DELETE', 'assets', { id });
        }
        const currentAssets = await storage.getAssets();
        await storage.saveAssets(currentAssets.filter(a => !ids.includes(a.id)));
      } else {
        const currentSandbox = await storage.getSandbox();
        await storage.saveToSandbox(currentSandbox.filter(a => !ids.includes(a.id)));
      }

      await refreshRegistry();
      setSelectedAssetIds(new Set());
      setIsBatchDeleteOpen(false);
      toast({ title: "Batch Purge Complete", description: `Removed ${ids.length} records.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Purge Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMergeSandbox = async () => {
    if (sandboxAssets.length === 0) return;
    setIsProcessing(true);
    try {
      for (const asset of sandboxAssets) {
        await enqueueMutation('CREATE', 'assets', asset);
      }
      const current = await storage.getAssets();
      await storage.saveAssets([...sandboxAssets, ...current]);
      await storage.clearSandbox();
      await refreshRegistry();
      setDataSource('PRODUCTION');
      toast({ title: "Registry Reconciled", description: `Successfully merged ${sandboxAssets.length} sandbox records.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Merge Failure" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurgeSandbox = async () => {
    await storage.clearSandbox();
    await refreshRegistry();
    toast({ title: "Sandbox Purged", description: "Staging area cleared." });
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
      <div className="flex flex-col h-full gap-4 relative pb-32">
        {/* Top Operational Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h2 className="text-xl font-black tracking-tight uppercase truncate max-w-[200px] md:max-w-md">{activeProjectName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={cn(
                  "h-5 px-2 text-[8px] font-black tracking-tighter rounded-full border-2",
                  dataSource === 'SANDBOX' ? "border-orange-500/20 bg-orange-50 text-orange-600" : "border-primary/20 bg-primary/5 text-primary"
                )}>
                  {filteredAndSortedAssets.length} RECORDS
                </Badge>
                {dataSource === 'SANDBOX' && (
                  <Badge className="h-5 px-2 text-[8px] font-black tracking-tighter bg-orange-500 text-white rounded-full">
                    SANDBOX MODE
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted/50 p-1.5 rounded-2xl border-2 border-border/40">
              <Button 
                variant={dataSource === 'PRODUCTION' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setDataSource('PRODUCTION')}
                className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 shadow-sm transition-all"
              >
                <Database className="h-3.5 w-3.5" /> Production
              </Button>
              <Button 
                variant={dataSource === 'SANDBOX' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setDataSource('SANDBOX')}
                className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 shadow-sm transition-all"
              >
                <DatabaseZap className="h-3.5 w-3.5" /> Sandbox
              </Button>
            </div>

            <div className="flex items-center gap-1.5 bg-muted/50 p-1.5 rounded-2xl border-2 border-border/40">
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('list')}
                className="h-9 w-9 p-0 rounded-xl tactile-pulse"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('grid')}
                className="h-9 w-9 p-0 rounded-xl tactile-pulse"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Search & Selection Bars */}
        <div className="relative z-20 shrink-0 h-14">
          <AnimatePresence mode="wait">
            {selectedIds.size > 0 ? (
              <motion.div 
                key="selection-bar"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-primary text-primary-foreground p-3 rounded-2xl flex items-center justify-between shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8 rounded-lg" onClick={() => setSelectedAssetIds(new Set())}>
                    <X className="h-4 w-4" />
                  </Button>
                  <span className="font-black uppercase text-[10px] tracking-widest">{selectedIds.size} SELECTED</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsBatchEditOpen(true)} className="h-8 px-3 rounded-lg font-black text-[9px] uppercase tracking-widest text-white hover:bg-white/10 tactile-pulse">
                    <ClipboardEdit className="h-3.5 w-3.5 mr-2" /> BATCH EDIT
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsBatchDeleteOpen(true)} className="h-8 px-3 rounded-lg font-black text-[9px] uppercase tracking-widest text-white hover:bg-red-500/20 tactile-pulse">
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> DELETE
                  </Button>
                </div>
              </motion.div>
            ) : showSearch ? (
              <motion.div 
                key="search-bar"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="relative group"
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-primary transition-all" />
                <Input 
                  autoFocus
                  placeholder="Scan S/N, ID, or Description..." 
                  className="pl-11 h-12 rounded-2xl bg-card border-2 border-transparent shadow-lg focus-visible:ring-primary/20 focus-visible:border-primary/20 text-sm font-medium"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
                <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg" onClick={() => { setSearchTerm(''); setShowSearch(false); }}>
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Registry Surface */}
        <motion.div 
          layout
          className={cn(
            "flex-1 bg-card/50 rounded-[2rem] border-2 border-dashed overflow-hidden shadow-inner min-h-[300px]",
            dataSource === 'SANDBOX' ? "border-orange-500/20" : "border-border/40"
          )}
        >
          {paginatedAssets.length > 0 ? (
            viewMode === 'list' ? (
              <RegistryTable 
                assets={paginatedAssets} 
                onInspect={handleInspect}
                selectedIds={selectedIds}
                onToggleSelection={(id) => {
                  const next = new Set(selectedIds);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  setSelectedAssetIds(next);
                }}
                onSelectAll={(checked) => {
                  if (checked) setSelectedAssetIds(new Set(filteredAndSortedAssets.map(a => a.id)));
                  else setSelectedAssetIds(new Set());
                }}
                onSort={(key) => setSortConfig(c => ({ key, direction: c.key === key && c.direction === 'asc' ? 'desc' : 'asc' }))}
                sortConfig={sortConfig}
              />
            ) : (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 h-full overflow-y-auto custom-scrollbar">
                {paginatedAssets.map((asset) => (
                  <Card 
                    key={asset.id}
                    className={cn(
                      "border-2 transition-all rounded-[1.5rem] overflow-hidden group cursor-pointer shadow-md tactile-pulse",
                      dataSource === 'SANDBOX' ? "hover:border-orange-500/20" : "hover:border-primary/20",
                      selectedIds.has(asset.id) ? "bg-primary/5 border-primary/20 shadow-primary/5" : "bg-card"
                    )}
                    onClick={() => handleInspect(asset)}
                  >
                    <CardContent className="p-5 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Checkbox 
                              checked={selectedIds.has(asset.id)} 
                              onCheckedChange={() => {
                                const next = new Set(selectedIds);
                                if (next.has(asset.id)) next.delete(asset.id);
                                else next.add(asset.id);
                                setSelectedAssetIds(next);
                              }}
                              className="h-4 w-4 rounded-md border-2"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <h3 className="font-black text-sm uppercase tracking-tight truncate text-foreground">{asset.description || asset.name}</h3>
                          </div>
                          <Badge variant="secondary" className="h-5 px-1.5 text-[8px] font-black uppercase tracking-tighter bg-muted border border-border/40 w-fit">
                            S/N: {asset.serialNumber || 'UNSET'}
                          </Badge>
                        </div>
                        <Badge variant="outline" className={cn(
                          "text-[8px] font-black uppercase tracking-widest h-6 px-2 shrink-0 border-2 rounded-lg shadow-sm",
                          asset.status === 'VERIFIED' ? "text-green-600 border-green-500/20 bg-green-50" : "text-orange-600 border-orange-500/20 bg-orange-50"
                        )}>
                          {asset.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1">
                          <span className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-40">
                            <MapPin className="h-2.5 w-2.5" /> Scope
                          </span>
                          <p className="text-[10px] font-black uppercase truncate text-foreground">{asset.location || 'GLOBAL'}</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <span className="flex items-center justify-end gap-1.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-40">
                            <Tag className="h-2.5 w-2.5" /> Registry ID
                          </span>
                          <p className="text-[10px] font-mono font-bold uppercase truncate text-primary">{asset.assetIdCode || 'UNSET'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-20">
              <Boxes className="h-16 w-16 mb-4" />
              <h3 className="text-xl font-black uppercase tracking-widest">Registry Silent</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest">Zero records found in current context.</p>
            </div>
          )}
        </motion.div>

        {/* Bottom Action Pulse Bar */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-background/80 backdrop-blur-2xl p-2.5 rounded-[2rem] border-2 border-primary/10 shadow-2xl ring-1 ring-white/10 w-[95%] max-w-lg">
          <div className="flex items-center gap-1 pr-2 border-r border-border/40">
            <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-10 w-10 rounded-xl tactile-pulse">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-[9px] font-black uppercase tracking-tighter px-2">
              {currentPage}/{totalPages || 1}
            </span>
            <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-10 w-10 rounded-xl tactile-pulse">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-1 items-center justify-around gap-1">
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl tactile-pulse" onClick={() => setShowSearch(true)}>
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl relative tactile-pulse" onClick={() => setIsFilterOpen(true)}>
              <Filter className="h-5 w-5" />
              {Object.values(filters).flat().length > 0 && <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-primary rounded-full" />}
            </Button>
            
            {dataSource === 'SANDBOX' ? (
              <>
                <Button variant="ghost" size="icon" onClick={handlePurgeSandbox} className="h-12 w-12 rounded-xl text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-5 w-5" />
                </Button>
                <Button onClick={handleMergeSandbox} disabled={isProcessing || sandboxAssets.length === 0} className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-orange-500 shadow-xl shadow-orange-500/20">
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Merge
                </Button>
              </>
            ) : (
              <>
                <Button className="h-12 w-12 rounded-2xl font-black shadow-xl bg-primary" onClick={() => { setSelectedAsset(undefined); setIsReadOnly(false); setIsFormOpen(true); }}>
                  <Plus className="h-6 w-6" />
                </Button>
                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl tactile-pulse" onClick={() => window.location.href = '/import'}>
                  <FileUp className="h-5 w-5" />
                </Button>
              </>
            )}
            
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl tactile-pulse" onClick={() => ExcelService.exportRegistry(currentRegistry)}>
              <FileDown className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <AssetForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        asset={selectedAsset}
        isReadOnly={isReadOnly}
        onSave={handleSaveAsset}
        onQuickSave={async () => {}}
      />

      <AssetBatchEditForm
        isOpen={isBatchEditOpen}
        onOpenChange={setIsBatchEditOpen}
        selectedAssetCount={selectedIds.size}
        onSave={handleBatchSave}
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

      <AlertDialog open={isBatchDeleteOpen} onOpenChange={setIsBatchDeleteOpen}>
        <AlertDialogContent className="rounded-[2rem] border-primary/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Purge Selection?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium">
              This will permanently delete <strong>{selectedIds.size} selected records</strong> from the {dataSource.toLowerCase()} registry. This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="font-bold rounded-xl">Discard Action</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchDelete} className="bg-destructive hover:bg-destructive/90 font-black uppercase text-[10px] tracking-widest h-11 px-6 rounded-xl">
              Execute Purge Pulse
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
