'use client';

/**
 * @fileOverview Asset Hub - Main Registry Browser.
 * Phase 1209: Integrated theme-responsive backgrounds.
 */

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database,
  Grid,
  Edit3,
  Trash2,
  Loader2,
  X,
  ShieldCheck,
  Search,
  ArrowUpDown,
  ChevronRight,
  FolderOpen,
  Plus,
  MoreVertical,
  Type,
  Upload,
  RefreshCw,
  AlertTriangle,
  ListFilter,
  Filter,
  Eye
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { RegistryTable } from '@/components/registry/RegistryTable';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import AssetForm from '@/components/asset-form';
import { HeaderManagerDrawer } from '@/components/registry/HeaderManagerDrawer';
import { FilterDrawer } from '@/components/registry/FilterDrawer';
import { SortDrawer } from '@/components/registry/SortDrawer';
import { PaginationControls } from '@/components/pagination-controls';
import { transformAssetToRecord } from '@/lib/registry-utils';
import { cn, sanitizeSearch } from '@/lib/utils';
import { enqueueMutation } from '@/offline/queue';
import { storage } from '@/offline/storage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addNotification } from '@/hooks/use-notifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { FirestoreService } from '@/services/firebase/firestore';
import type { Asset } from '@/types/domain';

export function RegistryWorkstation({ viewAll = false }: { viewAll?: boolean }) {
  const { 
    filteredAssets,
    dataSource,
    searchTerm,
    setSearchTerm,
    headers,
    refreshRegistry,
    appSettings,
    setAppSettings,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    selectedCategories,
    setSelectedCategories,
    isExplored,
    setIsExplored,
    isOnline,
    activeGrantId,
    filters,
    setFilters,
    isFilterOpen,
    setIsFilterOpen,
    isLogicFilterOpen,
    setIsLogicFilterOpen,
    isSortOpen,
    setIsSortOpen,
    itemsPerPage,
    setItemsPerPage,
    activeFilterCount
  } = useAppState();
  
  const { userProfile } = useAuth();
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [categoryToRename, setCategoryToRename] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  const [categoriesToPurge, setCategoriesToPurge] = useState<string[]>([]);

  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const activeGrant = useMemo(() => appSettings?.grants.find(g => g.id === activeGrantId), [appSettings, activeGrantId]);

  const optionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    headers.forEach(header => {
      const uniqueValues = new Set<string>();
      filteredAssets.forEach(asset => {
        let val: any = "";
        switch(header.normalizedName) {
          case "sn": val = asset.sn; break;
          case "location": val = asset.location; break;
          case "asset_description": val = asset.description; break;
          case "asset_id_code": val = asset.assetIdCode; break;
          case "asset_class": val = asset.category; break;
          case "condition": val = asset.condition; break;
          default:
            val = (asset.metadata as any)?.[header.rawName] || (asset.metadata as any)?.[header.normalizedName];
        }
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          uniqueValues.add(String(val).trim());
        }
      });
      map[header.id] = Array.from(uniqueValues).sort();
    });
    return map;
  }, [filteredAssets, headers]);

  const groupStats = useMemo(() => {
    const stats: Record<string, { total: number, verified: number }> = {};
    filteredAssets.forEach(a => {
      const cat = a.category || 'Uncategorized';
      if (!stats[cat]) stats[cat] = { total: 0, verified: 0 };
      stats[cat].total++;
      if (a.status === 'VERIFIED') stats[cat].verified++;
    });
    return stats;
  }, [filteredAssets]);

  const categories = useMemo(() => {
    if (!activeGrant) return [];
    const allInProject = Object.keys(activeGrant.sheetDefinitions || {}).sort();
    return allInProject.filter(cat => {
      const stats = groupStats[cat];
      const hasData = stats && stats.total > 0;
      const isManuallyEnabled = appSettings?.enabledSheets?.includes(cat);
      return hasData || isManuallyEnabled;
    });
  }, [activeGrant, groupStats, appSettings?.enabledSheets]);

  const processedAssets = useMemo(() => {
    let results = [...filteredAssets];
    if (selectedCategories.length > 0) results = results.filter(a => selectedCategories.includes(a.category));
    
    if (sortKey) {
      const sortHeader = headers.find(h => h.id === sortKey);
      results.sort((a, b) => {
        const getVal = (item: Asset) => {
          if (!sortHeader) return "";
          switch(sortHeader.normalizedName) {
            case "sn": return item.sn || "";
            case "asset_description": return item.description || "";
            default: return String((item.metadata as any)?.[sortHeader.rawName] || (item.metadata as any)?.[sortHeader.normalizedName] || "");
          }
        };
        const valA = String(getVal(a));
        const valB = String(getVal(b));
        return sortDir === 'asc' ? valA.localeCompare(valB, undefined, { numeric: true }) : valB.localeCompare(valA, undefined, { numeric: true });
      });
    }
    return results;
  }, [filteredAssets, sortKey, sortDir, selectedCategories, headers]);

  const totalPages = useMemo(() => itemsPerPage === 'all' ? 1 : Math.ceil(processedAssets.length / itemsPerPage), [processedAssets.length, itemsPerPage]);
  const paginatedAssets = useMemo(() => itemsPerPage === 'all' ? processedAssets : processedAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [processedAssets, currentPage, itemsPerPage]);

  const handleInspect = (id: string) => { setSelectedAssetId(id); setIsDetailOpen(true); };
  const handleToggleSelect = (id: string) => { const next = new Set(selectedAssetIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedAssetIds(next); };
  
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) setSelectedAssetIds(new Set(processedAssets.map(a => a.id)));
    else setSelectedAssetIds(new Set());
  }, [processedAssets]);

  const handleExploreFolder = (cat: string) => {
    setSelectedCategories([cat]);
    setIsExplored(true);
    setCurrentPage(1);
  };

  const handleToggleCategorySelection = (cat: string) => {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter(c => c !== cat)
      : [...selectedCategories, cat];
    setSelectedCategories(next);
  };

  const handleExecutePurge = async () => {
    if (categoriesToPurge.length === 0) return;
    setIsProcessing(true);
    try {
      const idsToDelete = filteredAssets.filter(a => categoriesToPurge.includes(a.category)).map(a => a.id);
      for (const id of idsToDelete) await enqueueMutation('DELETE', 'assets', { id });
      const currentLocal = await storage.getAssets();
      await storage.saveAssets(currentLocal.filter(a => !idsToDelete.includes(a.id)));
      await refreshRegistry();
      setSelectedCategories([]);
      setIsPurgeDialogOpen(false);
      addNotification({ title: "Folder Removed", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedRecord = useMemo(() => {
    if (!selectedAssetId) return undefined;
    const asset = filteredAssets.find(a => a.id === selectedAssetId);
    return asset ? transformAssetToRecord(asset, headers, appSettings?.sourceBranding) : undefined;
  }, [selectedAssetId, filteredAssets, headers, appSettings?.sourceBranding]);

  const showList = isExplored || viewAll;

  return (
    <div className="space-y-4 h-full flex flex-col relative">
      <div className="sticky top-[-1rem] sm:top-[-2rem] lg:top-[-2.5rem] z-40 bg-background/95 backdrop-blur-2xl pt-2 pb-4 px-1 border-b border-border mb-4 -mx-1 shrink-0">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-3 self-start">
            <div className="p-2 bg-primary/10 rounded-xl shadow-inner"><Database className="h-5 w-5 text-primary" /></div>
            <div className="space-y-0.5">
              <h2 className="text-lg font-black uppercase text-foreground tracking-tight leading-none">{!showList ? 'Asset Hub' : 'Asset List'}</h2>
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{!showList ? 'CATEGORIES' : 'VIEWING FOLDER'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            {!showList && (
              <div className="flex items-center gap-3 pr-4 border-r border-border shrink-0">
                <Checkbox id="sel-all-hub" checked={selectedCategories.length === categories.length && categories.length > 0} onCheckedChange={(c) => setSelectedCategories(c ? categories : [])} className="h-5 w-5 rounded-lg border-2 border-border data-[state=checked]:bg-primary" />
                <label htmlFor="sel-all-hub" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer">Select All</label>
              </div>
            )}

            <div className="flex items-center justify-end flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {!isSearchExpanded ? (
                  <Button variant="outline" size="icon" onClick={() => setIsSearchExpanded(true)} className="h-10 w-10 rounded-lg border-border bg-muted/50 text-primary shrink-0"><Search className="h-4 w-4" /></Button>
                ) : (
                  <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: "280px", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
                    <Input ref={searchInputRef} placeholder="Find assets..." value={searchTerm} onChange={(e) => setSearchTerm(sanitizeSearch(e.target.value))} onBlur={() => !searchTerm && setIsSearchExpanded(false)} className="h-10 pl-9 pr-8 rounded-lg bg-muted/50 border-2 border-primary/20 text-foreground text-xs focus:border-primary" />
                    <button onClick={() => { setSearchTerm(''); setIsSearchExpanded(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/20 hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              {isAdmin && <Button variant="outline" size="icon" onClick={() => setIsFormOpen(true)} className="h-10 w-10 rounded-lg border-primary/20 bg-primary/5 text-primary"><Plus className="h-4 w-4" /></Button>}
              
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setIsFilterOpen(true)} 
                className={cn(
                  "h-10 w-10 rounded-lg border-border bg-muted/50 text-primary relative",
                  activeFilterCount > 0 && "border-primary/40 shadow-lg shadow-primary/5"
                )}
              >
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-black text-[8px] font-black rounded-full flex items-center justify-center border-2 border-background">
                    {activeFilterCount}
                  </span>
                )}
              </Button>

              <Button variant="outline" size="icon" onClick={() => setIsLogicFilterOpen(true)} className={cn("h-10 w-10 rounded-lg border-border bg-muted/50 text-primary relative", filters.length > 0 && "border-primary/40")}>
                <ListFilter className="h-4 w-4" />
                {filters.length > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-black text-[8px] font-black rounded-full flex items-center justify-center border-2 border-background">{filters.length}</span>}
              </Button>

              <Button variant="outline" size="icon" onClick={() => setIsSortOpen(true)} className="h-10 w-10 rounded-lg border-border bg-muted/50 text-primary"><ArrowUpDown className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-1 pt-4">
        {!showList ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 pb-40">
            {categories.map(cat => (
              <Card 
                key={cat} 
                onClick={() => handleToggleCategorySelection(cat)}
                className={cn(
                  "bg-card border-2 rounded-3xl overflow-hidden group hover:border-primary/40 transition-all shadow-3xl flex flex-col p-6 relative cursor-pointer", 
                  selectedCategories.includes(cat) ? "border-primary/40 bg-primary/[0.02]" : "border-border"
                )}
              >
                <div className="absolute top-4 left-4 z-20">
                  <Checkbox checked={selectedCategories.includes(cat)} onCheckedChange={(c) => handleToggleCategorySelection(cat)} className="h-5 w-5 rounded-lg border-2 border-border data-[state=checked]:bg-primary" />
                </div>
                <div className="flex justify-between items-start mb-8 pl-8">
                  <h3 className="text-sm font-black uppercase text-foreground tracking-tight leading-none truncate pr-4">{cat}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><button className="h-6 w-6 flex items-center justify-center text-foreground/20 hover:text-foreground" onClick={(e) => e.stopPropagation()}><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border text-foreground p-1">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setCategoryToRename(cat); setNewCategoryName(cat); setIsRenameDialogOpen(true); }} className="gap-2 p-2 rounded-lg focus:bg-primary/10"><Type className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase">Rename Folder</span></DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExploreFolder(cat); }} className="gap-2 p-2 rounded-lg focus:bg-primary/10"><ChevronRight className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase">Open Folder</span></DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setCategoriesToPurge([cat]); setIsPurgeDialogOpen(true); }} className="gap-2 p-2 rounded-lg focus:bg-destructive/10 text-destructive/60"><Trash2 className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase">Delete Folder</span></DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-1 mb-8 pl-8">
                  <p className="text-4xl font-black tracking-tighter text-foreground">{groupStats[cat]?.total || 0}</p>
                  <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em]">TOTAL ASSETS</p>
                </div>
                <Button 
                  onClick={(e) => { e.stopPropagation(); handleExploreFolder(cat); }} 
                  variant="outline" 
                  className="w-full h-12 mt-auto rounded-xl border-border text-foreground font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-muted transition-all"
                >
                  Explore Folder <ChevronRight className="h-3 w-3" />
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className={viewMode === 'grid' ? "grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 pb-10" : ""}>
              <AnimatePresence mode="popLayout">
                {viewMode === 'grid' ? paginatedAssets.map(asset => (
                  <motion.div key={asset.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <RegistryCard record={transformAssetToRecord(asset, headers, appSettings?.sourceBranding)} onInspect={handleInspect} selected={selectedAssetIds.has(asset.id)} onToggleSelect={handleToggleSelect} />
                  </motion.div>
                )) : (
                  <RegistryTable records={paginatedAssets.map(a => transformAssetToRecord(a, headers, appSettings?.sourceBranding))} onInspect={handleInspect} selectedIds={selectedAssetIds} onToggleSelect={handleToggleSelect} onSelectAll={handleSelectAll} />
                )}
              </AnimatePresence>
            </div>
            <div className="mt-auto pt-8 border-t border-border">
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} totalItems={processedAssets.length} />
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedCategories.length > 0 && !showList && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-background/95 border-2 border-primary/20 rounded-2xl p-2.5 flex items-center gap-6 shadow-3xl backdrop-blur-3xl">
            <div className="flex items-center gap-3 pl-3"><div className="h-7 w-7 bg-primary rounded-full flex items-center justify-center text-black font-black text-[9px]">{selectedCategories.length}</div><span className="text-[9px] font-black uppercase text-foreground tracking-widest">Folders Selected</span></div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => setIsExplored(true)} className="h-9 px-4 rounded-lg font-black uppercase text-[9px] gap-2 text-primary hover:bg-primary/10"><Eye className="h-3.5 w-3.5" /> View Assets</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCategories([])} className="h-9 px-4 rounded-lg font-black uppercase text-[9px] gap-2 text-foreground/60 hover:text-foreground"><X className="h-3.5 w-3.5" /> Deselect</Button>
              {isAdmin && <Button variant="ghost" size="sm" onClick={() => { setCategoriesToPurge(selectedCategories); setIsPurgeDialogOpen(true); }} className="h-9 px-4 rounded-lg font-black uppercase text-[9px] gap-2 text-destructive/60 hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Delete Folders</Button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AssetDetailSheet isOpen={isDetailOpen} onOpenChange={setIsDetailOpen} record={selectedRecord} onEdit={(id) => { setSelectedAssetId(id); setIsFormOpen(true); setIsDetailOpen(false); }} />
      <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={filteredAssets.find(a => a.id === selectedAssetId)} isReadOnly={false} onSave={async (a) => { await enqueueMutation('UPDATE', 'assets', a); await refreshRegistry(); setIsFormOpen(false); }} />
      
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="max-w-md bg-background border-border text-foreground p-8 rounded-[2.5rem]">
          <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tight">Rename Folder</DialogTitle></DialogHeader>
          <div className="py-6 space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary">New Folder Label</Label>
            <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="h-12 bg-muted/50 border-border rounded-xl font-black uppercase text-sm" />
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setIsRenameDialogOpen(false)} className="h-12 px-6 rounded-xl font-black uppercase text-[10px] text-foreground/40">Cancel</Button>
            <Button onClick={handleRenameCommit} disabled={isProcessing || !newCategoryName.trim()} className="h-12 px-10 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">{isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Save Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 bg-background p-10">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit"><AlertTriangle className="h-10 w-10 text-destructive" /></div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-destructive">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed italic text-muted-foreground">This will permanently delete {categoriesToPurge.length} folders and all records within them from both local and cloud storage. This action is irreversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2 border-border m-0 hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecutePurge} disabled={isProcessing} className="h-12 px-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-destructive/30 bg-destructive text-white m-0">{isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Confirm Deletion</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FilterDrawer isOpen={isLogicFilterOpen} onOpenChange={setIsLogicFilterOpen} headers={headers} activeFilters={filters} onUpdateFilters={setFilters} optionsMap={optionsMap} />
      <SortDrawer isOpen={isSortOpen} onOpenChange={setIsSortOpen} headers={headers} sortBy={sortKey} sortDirection={sortDir} onUpdateSort={(k, dir) => { setSortKey(k); setSortDir(dir); }} />
      <HeaderManagerDrawer isOpen={false} onOpenChange={() => {}} headers={headers} onUpdateHeaders={setAppSettings as any} onReset={() => {}} />
    </div>
  );

  async function handleRenameCommit() {
    if (!categoryToRename || !newCategoryName.trim() || !appSettings || !activeGrant) return;
    setIsProcessing(true);
    try {
      const assetsToUpdate = filteredAssets.filter(a => a.category === categoryToRename);
      for (const asset of assetsToUpdate) await enqueueMutation('UPDATE', 'assets', { ...asset, category: newCategoryName.trim() });
      const nextSettings = { ...appSettings, grants: appSettings.grants.map(g => g.id === activeGrantId ? { ...g, sheetDefinitions: { ...g.sheetDefinitions, [newCategoryName.trim()]: { ...g.sheetDefinitions[categoryToRename], name: newCategoryName.trim() } } } : g) };
      await storage.saveSettings(nextSettings);
      if (isOnline) await FirestoreService.updateSettings(nextSettings);
      setAppSettings(nextSettings);
      await refreshRegistry();
      setIsRenameDialogOpen(false);
      addNotification({ title: "Folder Renamed", variant: "success" });
    } finally {
      setIsProcessing(false);
    }
  }
}