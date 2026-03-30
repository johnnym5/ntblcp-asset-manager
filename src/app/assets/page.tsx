'use client';

/**
 * @fileOverview Registry Workspace - High-Performance Asset Browser.
 * Final Polish: Framer Motion transitions and improved drill-down scanability.
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import AppLayout from '@/components/app-layout';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
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
  ArrowLeft,
  MoreVertical,
  MapPin,
  Tag,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Trash2,
  ChevronRight,
  Database
} from 'lucide-react';
import { RegistryTable } from '@/modules/registry/components/RegistryTable';
import { AssetForm } from '@/components/asset-form';
import { AssetFilterDialog, type FilterOption } from '@/components/asset-filter-sheet';
import { AssetBatchEditForm, type BatchUpdateData } from '@/components/asset-batch-edit-form';
import { ImportPreviewDialog } from '@/components/import-preview-dialog';
import { enqueueMutation } from '@/offline/queue';
import { storage } from '@/offline/storage';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Asset } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { ExcelService } from '@/services/excel-service';

export type SortConfig = {
  key: keyof Asset | 'sn';
  direction: 'asc' | 'desc';
};

export default function AssetRegistryPage() {
  const { assets, searchTerm, setSearchTerm, refreshRegistry, settingsLoaded, activeGrantId, appSettings, isOnline } = useAppState();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View States
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  
  // Sort State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'description', direction: 'asc' });

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stagedAssets, setStagedAssets] = useState<Asset[]>([]);
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
  }, [assets]);

  const filteredAndSortedAssets = useMemo(() => {
    let results = assets.filter(a => {
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

      if (sortConfig.key === 'serialNumber' || sortConfig.key === 'assetIdCode') {
        return sortConfig.direction === 'asc' 
          ? String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
          : String(bVal).localeCompare(String(aVal), undefined, { numeric: true });
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return results;
  }, [assets, searchTerm, filters, sortConfig]);

  const handleSort = (key: keyof Asset) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

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

  const currentIndex = useMemo(() => {
    if (!selectedAsset) return -1;
    return filteredAndSortedAssets.findIndex(a => a.id === selectedAsset.id);
  }, [selectedAsset, filteredAndSortedAssets]);

  const handleNext = useCallback(() => {
    if (currentIndex < filteredAndSortedAssets.length - 1) {
      setSelectedAsset(filteredAndSortedAssets[currentIndex + 1]);
    }
  }, [currentIndex, filteredAndSortedAssets]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setSelectedAsset(filteredAndSortedAssets[currentIndex - 1]);
    }
  }, [currentIndex, filteredAndSortedAssets]);

  const handleToggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAssetIds(next);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedAssetIds(new Set(filteredAndSortedAssets.map(a => a.id)));
    else setSelectedAssetIds(new Set());
  };

  const handleSaveAsset = async (assetToSave: Asset) => {
    try {
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
      await refreshRegistry();
      
      toast({ title: "Registry Updated", description: "Operation committed to background sync pulse." });
      setIsFormOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Operation Failed", description: "Registry integrity check failed." });
    }
  };

  const handleBulkVerify = async () => {
    if (selectedIds.size === 0) return;
    const targets = assets.filter(a => selectedIds.has(a.id));
    
    try {
      const updates = targets.map(asset => ({
        ...asset,
        status: 'VERIFIED' as const,
        lastModified: new Date().toISOString(),
        lastModifiedBy: userProfile?.displayName || 'Bulk Action',
        previousState: { ...asset, previousState: undefined }
      }));

      for (const updatedAsset of updates) {
        await enqueueMutation('UPDATE', 'assets', updatedAsset);
      }

      const allAssets = await storage.getAssets();
      const updatedMap = new Map(updates.map(a => [a.id, a]));
      const nextAssets = allAssets.map(a => updatedMap.get(a.id) || a);
      
      await storage.saveAssets(nextAssets);
      await refreshRegistry();
      
      toast({ title: "Bulk Verification Complete", description: `${selectedIds.size} records marked as verified.` });
      setSelectedAssetIds(new Set());
    } catch (e) {
      toast({ variant: "destructive", title: "Bulk Action Failed" });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      for (const id of selectedIds) {
        await enqueueMutation('DELETE', 'assets', { id });
      }

      const allAssets = await storage.getAssets();
      const nextAssets = allAssets.filter(a => !selectedIds.has(a.id));
      
      await storage.saveAssets(nextAssets);
      await refreshRegistry();
      
      toast({ title: "Registry Purged", description: `${selectedIds.size} records removed from pulse.` });
      setSelectedAssetIds(new Set());
    } catch (e) {
      toast({ variant: "destructive", title: "Deletion Failed" });
    }
  };

  const handleSaveBatchEdit = async (data: BatchUpdateData) => {
    const targets = assets.filter(a => selectedIds.has(a.id));
    try {
      const updates = targets.map(asset => ({
        ...asset,
        ...data,
        lastModified: new Date().toISOString(),
        lastModifiedBy: userProfile?.displayName || 'Bulk Edit',
        previousState: { ...asset, previousState: undefined }
      }));

      for (const updatedAsset of updates) {
        await enqueueMutation('UPDATE', 'assets', updatedAsset);
      }

      const allAssets = await storage.getAssets();
      const updatedMap = new Map(updates.map(a => [a.id, a]));
      const nextAssets = allAssets.map(a => updatedMap.get(a.id) || a);
      
      await storage.saveAssets(nextAssets);
      await refreshRegistry();
      
      toast({ title: "Bulk Update Broadcasted", description: `Applied changes to ${selectedIds.size} records.` });
      setSelectedAssetIds(new Set());
      setIsBatchEditOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Batch Edit Failed" });
    }
  };

  // --- Import/Export Pulses ---
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeGrantId) return;

    setIsProcessing(true);
    try {
      const parsed = await ExcelService.parseWorkbook(file);
      const tagged = parsed.map(a => ({
        ...a,
        grantId: activeGrantId,
        lastModifiedBy: userProfile?.displayName || 'System Import'
      }));
      setStagedAssets(tagged);
      setIsImportPreviewOpen(true);
    } catch (err) {
      toast({ variant: "destructive", title: "Parsing Failed", description: "The workbook hierarchy is corrupted or non-deterministic." });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    setIsProcessing(true);
    try {
      for (const asset of stagedAssets) {
        await enqueueMutation('CREATE', 'assets', asset);
      }
      const current = await storage.getAssets();
      await storage.saveAssets([...stagedAssets, ...current]);
      await refreshRegistry();
      toast({ title: "Registry Merged", description: `${stagedAssets.length} hierarchical records enqueued for cloud pulse.` });
      setIsImportPreviewOpen(false);
      setStagedAssets([]);
    } catch (err) {
      toast({ variant: "destructive", title: "Merge Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportRegistry = async () => {
    if (filteredAndSortedAssets.length === 0) return;
    try {
      await ExcelService.exportRegistry(filteredAndSortedAssets, `Registry-Pulse-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Export Complete", description: "Structure-preserving report generated." });
    } catch (err) {
      toast({ variant: "destructive", title: "Export Failed" });
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
        {/* Hidden File Trigger */}
        <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".xlsx,.xls" />

        {/* Top Operational Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black tracking-tighter uppercase">{activeProjectName}</h2>
              <Badge className="font-black text-[10px] h-6 border-2 border-primary/20 bg-primary/5 text-primary rounded-full px-3">
                {filteredAndSortedAssets.length} Records
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] opacity-60">
                Primary Audit Workstation › Registry Context
              </p>
              <Badge variant="outline" className={cn(
                "h-5 px-2 text-[8px] font-black uppercase tracking-tighter border-2 rounded-full shadow-sm",
                isOnline ? "text-green-600 border-green-200 bg-green-50" : "text-orange-600 border-orange-200 bg-orange-50"
              )}>
                {isOnline ? "Online Registry" : "Locally Saved Assets"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-muted/50 p-1.5 rounded-2xl border border-border/40 mr-2 shadow-inner">
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('list')}
                className="h-9 w-9 p-0 rounded-xl transition-all"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('grid')}
                className="h-9 w-9 p-0 rounded-xl transition-all"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl bg-card border-2 border-border/40 shadow-xl hover:bg-primary/5 transition-all">
              <Settings2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl opacity-40 hover:opacity-100">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Global Registry Search & Filters */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 group-focus-within:text-primary group-focus-within:opacity-100 transition-all" />
            <Input 
              placeholder="Search registry by ID, serial, or name..." 
              className="pl-14 h-16 rounded-[1.5rem] bg-card border-2 border-transparent shadow-2xl focus-visible:ring-primary/20 focus-visible:border-primary/20 text-base font-medium transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => setIsFilterOpen(true)}
            className={cn(
              "h-16 px-10 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] gap-3 bg-card border-2 border-transparent shadow-2xl transition-all",
              Object.values(filters).flat().length > 0 ? "text-primary border-primary/20 bg-primary/5" : "hover:bg-primary/5 hover:border-primary/10"
            )}
          >
            <Filter className="h-4 w-4" />
            Logic Filters
            {Object.values(filters).flat().length > 0 && (
              <Badge className="ml-2 bg-primary text-white h-6 min-w-6 p-0 flex items-center justify-center rounded-full text-[9px] font-black shadow-lg shadow-primary/20">
                {Object.values(filters).flat().length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Action Header (Selection Context) */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-primary text-primary-foreground p-5 rounded-[1.5rem] flex items-center justify-between shadow-2xl shadow-primary/30 z-20"
            >
              <div className="flex items-center gap-5">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-xl" onClick={() => setSelectedAssetIds(new Set())}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <span className="font-black uppercase text-xs tracking-[0.2em]">{selectedIds.size} Records Selected</span>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleBulkVerify} className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-white hover:bg-white/10">Mark Verified</Button>
                <Button variant="ghost" size="sm" onClick={() => setIsBatchEditOpen(true)} className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-white hover:bg-white/10">Move / Edit</Button>
                <Separator orientation="vertical" className="h-6 bg-white/20" />
                <Button variant="ghost" size="sm" onClick={handleBulkDelete} className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-white hover:bg-red-500/20">Delete Pulse</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Registry Surface */}
        <motion.div 
          layout
          className="flex-1 bg-card/50 rounded-[3rem] border-2 border-dashed border-border/40 overflow-hidden shadow-inner"
        >
          <AnimatePresence mode="wait">
            {filteredAndSortedAssets.length > 0 ? (
              viewMode === 'list' ? (
                <motion.div 
                  key="list-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <RegistryTable 
                    assets={filteredAndSortedAssets} 
                    onInspect={handleInspect}
                    selectedIds={selectedIds}
                    onToggleSelection={handleToggleSelection}
                    onSelectAll={handleSelectAll}
                    onSort={handleSort}
                    sortConfig={sortConfig}
                  />
                </motion.div>
              ) : (
                <motion.div 
                  key="grid-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 h-full overflow-y-auto custom-scrollbar"
                >
                  {filteredAndSortedAssets.map((asset) => (
                    <motion.div key={asset.id} layout>
                      <Card 
                        className={cn(
                          "border-2 border-border/40 hover:border-primary/20 transition-all rounded-[2.5rem] overflow-hidden group cursor-pointer shadow-lg",
                          selectedIds.has(asset.id) ? "bg-primary/5 border-primary/20 shadow-primary/5" : "bg-card hover:shadow-2xl"
                        )}
                        onClick={() => handleInspect(asset)}
                      >
                        <CardContent className="p-8 space-y-6">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-2">
                              <h3 className="font-black text-base uppercase tracking-tight line-clamp-2 leading-none">{asset.description || asset.name}</h3>
                              <span className="text-[10px] font-mono text-muted-foreground uppercase opacity-60 tracking-widest">TAG: {asset.assetIdCode || 'UNSET'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cn(
                                "text-[9px] font-black uppercase tracking-widest h-7 px-3 border-2 rounded-full shadow-sm",
                                asset.status === 'VERIFIED' ? "text-green-600 border-green-500/20 bg-green-50" : "text-orange-600 border-orange-500/20 bg-orange-50"
                              )}>
                                {asset.status === 'VERIFIED' ? <ShieldCheck className="h-3 w-3 mr-2" /> : <Clock className="h-3 w-3 mr-2" />}
                                {asset.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="pt-6 border-t-2 border-dashed space-y-3">
                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                              <MapPin className="h-4 w-4 text-primary opacity-40" /> {asset.location}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                              <Tag className="h-4 w-4 text-primary opacity-40" /> {asset.category}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )
            ) : (
              <motion.div 
                key="empty-view"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center p-20 opacity-20"
              >
                <div className="p-10 bg-muted rounded-[3rem] mb-8 shadow-inner">
                  <Boxes className="h-24 w-24" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black uppercase tracking-[0.3em]">Registry Silent</h3>
                  <p className="text-sm font-medium max-w-xs mx-auto uppercase tracking-widest opacity-60">No records match the current operational pulse.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* High-Impact Action Pulse (Bottom Bar) */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-background/80 backdrop-blur-2xl p-4 rounded-[2.5rem] border-2 border-primary/10 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] border-t-primary/20 ring-1 ring-white/10">
          <Button 
            className="h-16 px-10 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.25em] gap-4 shadow-2xl shadow-primary/30 transition-all hover:-translate-y-1 active:scale-95"
            onClick={handleCreateNew}
          >
            <Plus className="h-5 w-5" /> New Registration
          </Button>
          <Separator orientation="vertical" className="h-10 opacity-30" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  className="h-16 w-16 p-0 rounded-[1.5rem] bg-card border-2 border-border/40 hover:bg-primary/10 hover:border-primary/20 transition-all shadow-xl"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp className="h-6 w-6 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="font-black uppercase text-[10px] tracking-widest">Ingest Pulse</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  className="h-16 w-16 p-0 rounded-[1.5rem] bg-card border-2 border-border/40 hover:bg-primary/10 hover:border-primary/20 transition-all shadow-xl"
                  onClick={handleExportRegistry}
                >
                  <FileDown className="h-6 w-6 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="font-black uppercase text-[10px] tracking-widest">Export Ledger</TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
        onNext={currentIndex < filteredAndSortedAssets.length - 1 ? handleNext : undefined}
        onPrevious={currentIndex > 0 ? handlePrevious : undefined}
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

      <AssetBatchEditForm 
        isOpen={isBatchEditOpen} 
        onOpenChange={setIsBatchEditOpen} 
        selectedAssetCount={selectedIds.size} 
        onSave={handleSaveBatchEdit} 
      />

      <ImportPreviewDialog 
        isOpen={isImportPreviewOpen}
        onOpenChange={setIsImportPreviewOpen}
        assets={stagedAssets}
        onConfirm={handleConfirmImport}
        isProcessing={isProcessing}
      />
    </AppLayout>
  );
}
