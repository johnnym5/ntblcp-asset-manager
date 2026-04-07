'use client';

/**
 * @fileOverview RegistryWorkstation - Technical Inventory Browser.
 * Phase 318: Fixed Delete Folder pulse and implemented persistent Select All for categories.
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
  ChevronDown,
  FolderOpen,
  Boxes,
  PlusCircle,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ListFilter,
  Download,
  Upload,
  Zap,
  Plus,
  Check,
  MoreVertical,
  Type,
  Globe,
  CloudOff,
  LayoutGrid,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { RegistryTable } from '@/components/registry/RegistryTable';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import AssetForm from '@/components/asset-form';
import { AssetBatchEditForm } from '@/components/asset-batch-edit-form';
import { HeaderManagerDrawer } from '@/components/registry/HeaderManagerDrawer';
import { FilterDrawer } from '@/components/registry/FilterDrawer';
import { SortDrawer } from '@/components/registry/SortDrawer';
import { PaginationControls } from '@/components/pagination-controls';
import { transformAssetToRecord } from '@/lib/registry-utils';
import { cn, sanitizeSearch } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { enqueueMutation } from '@/offline/queue';
import { storage } from '@/offline/storage';
import { processSelectedSyncQueue } from '@/offline/sync';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { addNotification } from '@/hooks/use-notifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import type { SheetDefinition, Asset } from '@/types/domain';
import { Card, CardContent } from '../ui/card';

export function RegistryWorkstation({ viewAll = false }: { viewAll?: boolean }) {
  const { 
    assets, 
    sandboxAssets,
    dataSource,
    searchTerm,
    setSearchTerm,
    headers,
    setHeaders,
    refreshRegistry,
    appSettings,
    setAppSettings,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    selectedCategories,
    setSelectedCategories,
    isOnline,
    activeGrantId,
    filters,
    setFilters,
    isFilterOpen,
    setIsFilterOpen,
    isSortOpen,
    setIsSortOpen,
    manualDownload,
    manualUpload,
    isSyncing,
    itemsPerPage,
    setItemsPerPage
  } = useAppState();
  
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
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
  const canAdd = userProfile?.canAddAssets || isAdmin;
  const canEdit = userProfile?.canEditAssets || isAdmin;

  const activeGrant = useMemo(() => appSettings?.grants.find(g => g.id === activeGrantId), [appSettings, activeGrantId]);
  const activeAssets = useMemo(() => dataSource === 'PRODUCTION' ? assets : sandboxAssets, [dataSource, assets, sandboxAssets]);

  const groupStats = useMemo(() => {
    const stats: Record<string, { total: number, verified: number }> = {};
    activeAssets.forEach(a => {
      const cat = a.category || 'Uncategorized';
      if (!stats[cat]) stats[cat] = { total: 0, verified: 0 };
      stats[cat].total++;
      if (a.status === 'VERIFIED') stats[cat].verified++;
    });
    return stats;
  }, [activeAssets]);

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
    let results = [...activeAssets];
    if (selectedCategories.length > 0) results = results.filter(a => selectedCategories.includes(a.category));
    
    filters.forEach(f => {
      results = results.filter(a => {
        const header = headers.find(h => h.id === f.headerId);
        if (!header) return true;
        let val: any = "";
        switch(header.normalizedName) {
          case "sn": val = a.sn; break;
          case "location": val = a.location; break;
          case "assignee_location": val = a.custodian; break;
          case "asset_description": val = a.description; break;
          case "asset_id_code": val = a.assetIdCode; break;
          case "asset_class": val = a.category; break;
          case "condition": val = a.condition; break;
          case "serial_number": val = a.serialNumber; break;
          default: val = a.metadata?.[header.rawName] || a.metadata?.[header.normalizedName];
        }
        if (f.operator === 'in' && Array.isArray(f.value)) {
          if (f.value.length === 0) return true;
          return f.value.includes(String(val || ""));
        }
        return true;
      });
    });

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(a => 
        (a.description || '').toLowerCase().includes(term) || 
        (a.assetIdCode || '').toLowerCase().includes(term) ||
        (a.serialNumber || '').toLowerCase().includes(term)
      );
    }

    if (sortKey) {
      const sortHeader = headers.find(h => h.id === sortKey);
      results.sort((a, b) => {
        const getVal = (item: Asset) => {
          if (!sortHeader) return "";
          switch(sortHeader.normalizedName) {
            case "sn": return item.sn || "";
            case "location": return item.location || "";
            case "assignee_location": return item.custodian || "";
            case "asset_description": return item.description || "";
            case "asset_id_code": return item.assetIdCode || "";
            case "asset_class": return item.category || "";
            case "condition": return item.condition || "";
            case "serial_number": return item.serialNumber || "";
            default: return String(item.metadata?.[sortHeader.rawName] || "");
          }
        };
        const valA = String(getVal(a));
        const valB = String(getVal(b));
        return sortDir === 'asc' ? valA.localeCompare(valB, undefined, { numeric: true }) : valB.localeCompare(valA, undefined, { numeric: true });
      });
    }
    return results;
  }, [activeAssets, searchTerm, sortKey, sortDir, selectedCategories, filters, headers]);

  const totalPages = useMemo(() => {
    if (itemsPerPage === 'all') return 1;
    return Math.ceil(processedAssets.length / itemsPerPage);
  }, [processedAssets.length, itemsPerPage]);

  const paginatedAssets = useMemo(() => {
    if (itemsPerPage === 'all') return processedAssets;
    const start = (currentPage - 1) * itemsPerPage;
    return processedAssets.slice(start, start + itemsPerPage);
  }, [processedAssets, currentPage, itemsPerPage]);

  const optionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    headers.forEach(header => {
      const values = new Set<string>();
      activeAssets.forEach(a => {
        let val: any = "";
        switch(header.normalizedName) {
          case "sn": val = a.sn; break;
          case "location": val = a.location; break;
          case "assignee_location": val = a.custodian; break;
          case "asset_description": val = a.description; break;
          case "asset_id_code": val = a.assetIdCode; break;
          case "asset_class": val = a.category; break;
          case "condition": val = a.condition; break;
          case "serial_number": val = a.serialNumber; break;
          default: val = a.metadata?.[header.rawName] || a.metadata?.[header.normalizedName];
        }
        if (val !== undefined && val !== null && val !== "") values.add(String(val));
      });
      map[header.id] = Array.from(values).sort();
    });
    return map;
  }, [activeAssets, headers]);

  const handleInspect = (id: string) => { setSelectedAssetId(id); setIsDetailOpen(true); };
  const handleToggleSelect = (id: string) => { const next = new Set(selectedAssetIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedAssetIds(next); };
  const handleSearchChange = (val: string) => { setSearchTerm(sanitizeSearch(val)); setCurrentPage(1); };
  
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedAssetIds(new Set(processedAssets.map(a => a.id)));
    } else {
      setSelectedAssetIds(new Set());
    }
  }, [processedAssets]);

  const toggleCategorySelection = (cat: string) => {
    const next = new Set(selectedCategories);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    setSelectedCategories(Array.from(next));
  };

  const handleSelectAllCategories = (checked: boolean) => {
    if (checked) setSelectedCategories(categories);
    else setSelectedCategories([]);
  };

  const handleExecutePurge = async () => {
    if (categoriesToPurge.length === 0) return;
    setIsProcessing(true);
    try {
      const idsToDelete = activeAssets
        .filter(a => categoriesToPurge.includes(a.category))
        .map(a => a.id);
      
      for (const id of idsToDelete) {
        await enqueueMutation('DELETE', 'assets', { id });
      }
      const currentLocal = await storage.getAssets();
      await storage.saveAssets(currentLocal.filter(a => !idsToDelete.includes(a.id)));
      await refreshRegistry();
      setSelectedCategories([]);
      setCategoriesToPurge([]);
      setIsPurgeDialogOpen(false);
      addNotification({ title: "Registry Purge Complete", description: `Removed ${idsToDelete.length} records.`, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncSelectedCategories = async () => {
    if (!isOnline) {
      addNotification({ title: "Offline", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const idsToSync = activeAssets
        .filter(a => selectedCategories.includes(a.category))
        .map(a => a.id);
      
      const queue = await storage.getQueue();
      const opsToSync = queue.filter(q => idsToSync.includes(String(q.payload.id))).map(q => q.id);
      if (opsToSync.length > 0) {
        await processSelectedSyncQueue(opsToSync);
        await refreshRegistry();
        setSelectedCategories([]);
        addNotification({ title: "Sync Complete", variant: "success" });
      } else {
        addNotification({ title: "Folders already synced." });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRenameCommit = async () => {
    if (!categoryToRename || !newCategoryName.trim() || !appSettings || !activeGrant) return;
    setIsProcessing(true);
    try {
      const assetsToUpdate = activeAssets.filter(a => a.category === categoryToRename);
      for (const asset of assetsToUpdate) {
        const updated = { ...asset, category: newCategoryName.trim() };
        await enqueueMutation('UPDATE', 'assets', updated);
      }
      const currentLocal = await storage.getAssets();
      await storage.saveAssets(currentLocal.map(a => a.category === categoryToRename ? { ...a, category: newCategoryName.trim() } : a));

      const nextSheetDefs = { ...activeGrant.sheetDefinitions };
      if (nextSheetDefs[categoryToRename]) {
        nextSheetDefs[newCategoryName.trim()] = { ...nextSheetDefs[categoryToRename], name: newCategoryName.trim() };
        delete nextSheetDefs[categoryToRename];
      }

      const updatedGrants = appSettings.grants.map(g => 
        g.id === activeGrantId ? { ...g, sheetDefinitions: nextSheetDefs } : g
      );

      const nextSettings = { ...appSettings, grants: updatedGrants };
      await storage.saveSettings(nextSettings);
      if (isOnline) await FirestoreService.updateSettings(nextSettings);
      setAppSettings(nextSettings);

      await refreshRegistry();
      setIsRenameDialogOpen(false);
      setCategoryToRename(null);
      setNewCategoryName('');
      addNotification({ title: "Category Renamed", variant: "success" });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedRecord = useMemo(() => {
    if (!selectedAssetId) return undefined;
    const asset = activeAssets.find(a => a.id === selectedAssetId);
    return asset ? transformAssetToRecord(asset, headers, appSettings?.sourceBranding) : undefined;
  }, [selectedAssetId, activeAssets, headers, appSettings?.sourceBranding]);

  return (
    <div className="space-y-4 h-full flex flex-col animate-in fade-in duration-700 relative">
      <div className="sticky top-[-1rem] sm:top-[-2rem] lg:top-[-2.5rem] z-40 bg-[#050505]/95 backdrop-blur-2xl pt-2 pb-4 px-1 border-b border-white/5 mb-4 -mx-1 shrink-0">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-3 self-start">
            <div className="p-2 bg-primary/10 rounded-xl shadow-inner"><Database className="h-5 w-5 text-primary" /></div>
            <div className="space-y-0.5">
              <h2 className="text-lg font-black uppercase text-white tracking-tight leading-none">
                {selectedCategories.length === 0 ? 'Inventory Hub' : 'Registry Pulse'}
              </h2>
              <p className="text-[8px] font-bold text-white/40 uppercase tracking-[0.2em]">
                {selectedCategories.length === 0 ? 'PROJECT FOLDERS' : 'DETAILED INSPECTION'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {/* Persistent Select All for Folders */}
            {(selectedCategories.length === 0 || !viewAll) && (
              <div className="flex items-center gap-3 pr-4 border-r border-white/10 shrink-0">
                <Checkbox 
                  id="sel-all-cat" 
                  checked={selectedCategories.length === categories.length && categories.length > 0} 
                  onCheckedChange={(c) => handleSelectAllCategories(!!c)}
                  className="h-5 w-5 rounded-lg border-2 border-white/20 data-[state=checked]:bg-primary"
                />
                <label htmlFor="sel-all-cat" className="text-[9px] font-black uppercase tracking-widest text-white/40 cursor-pointer">Select All</label>
              </div>
            )}

            {selectedCategories.length > 0 && (
              <div className="flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/5 mr-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="h-9 w-9 rounded-lg text-white/40 hover:text-primary"><Grid className="h-4 w-4" /></Button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <Button variant="ghost" size="icon" onClick={manualDownload} disabled={isSyncing || !isOnline} className="h-9 w-9 rounded-lg hover:bg-primary/10 text-white/40 hover:text-primary"><Download className="h-4 w-4" /></Button>
                <div className="w-px h-4 bg-white/10 mx-1" /><Button variant="ghost" size="icon" onClick={manualUpload} disabled={isSyncing || !isOnline} className="h-9 w-9 rounded-lg hover:bg-primary/10 text-white/40 hover:text-primary"><Upload className="h-4 w-4" /></Button>
              </div>
            )}

            <div className="flex items-center justify-end flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {!isSearchExpanded ? (
                  <Button variant="outline" size="icon" onClick={() => setIsSearchExpanded(true)} className="h-10 w-10 rounded-lg border-white/10 bg-white/5 hover:bg-primary/10 text-primary shrink-0"><Search className="h-4 w-4" /></Button>
                ) : (
                  <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: isMobile ? "100%" : "280px", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="relative group min-w-[120px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
                    <Input ref={searchInputRef} placeholder="Search..." value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} onBlur={() => !searchTerm && setIsSearchExpanded(false)} className="h-10 pl-9 pr-8 rounded-lg bg-white/[0.05] border-2 border-primary/20 text-white text-xs focus:border-primary" />
                    <button onClick={() => { setSearchTerm(''); setIsSearchExpanded(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"><X className="h-3.5 w-3.5" /></button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              {canAdd && (
                <Button variant="outline" size="icon" onClick={() => setIsFormOpen(true)} className="h-10 w-10 rounded-lg border-primary/20 bg-primary/5 text-primary"><Plus className="h-4 w-4" /></Button>
              )}
              <Button variant="outline" size="icon" onClick={() => setIsFilterOpen(true)} className={cn("h-10 w-10 rounded-lg border-white/10 bg-white/5 text-primary relative", filters.length > 0 && "border-primary/40")}>
                <ListFilter className="h-4 w-4" />
                {filters.length > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-black text-[8px] font-black rounded-full flex items-center justify-center border-2 border-black">{filters.length}</span>}
              </Button>
              <Button variant="outline" size="icon" onClick={() => setIsSortOpen(true)} className="h-10 w-10 rounded-lg border-white/10 bg-white/5 text-primary"><ArrowUpDown className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-1 pt-4">
        {selectedCategories.length === 0 || viewAll ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 pb-40">
            {categories.map(cat => (
              <Card key={cat} className={cn("bg-[#080808] border-2 rounded-3xl overflow-hidden group hover:border-primary/40 transition-all shadow-3xl flex flex-col p-6 relative", selectedCategories.includes(cat) ? "border-primary/40 bg-primary/[0.02]" : "border-white/5")}>
                <div className="absolute top-4 left-4 z-20">
                  <Checkbox 
                    checked={selectedCategories.includes(cat)} 
                    onCheckedChange={() => toggleCategorySelection(cat)}
                    className="h-5 w-5 rounded-lg border-2 border-white/10 data-[state=checked]:bg-primary"
                  />
                </div>
                <div className="flex justify-between items-start mb-8 pl-8">
                  <h3 className="text-sm font-black uppercase text-white tracking-tight leading-none truncate pr-4">{cat}</h3>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><button className="h-6 w-6 flex items-center justify-center text-white/20 hover:text-white"><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-black border-white/10 text-white p-1">
                        <DropdownMenuItem onClick={() => { setCategoryToRename(cat); setNewCategoryName(cat); setIsRenameDialogOpen(true); }} className="gap-2 p-2 rounded-lg focus:bg-primary/10">
                          <Type className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase">Rename Folder</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSelectedCategories([cat])} className="gap-2 p-2 rounded-lg focus:bg-primary/10">
                          <ChevronRight className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase">Drill Down</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/5" />
                        <DropdownMenuItem onClick={() => { setCategoriesToPurge([cat]); setIsPurgeDialogOpen(true); }} className="gap-2 p-2 rounded-lg focus:bg-destructive/10 text-destructive/60">
                          <Trash2 className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase">Delete Folder</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="space-y-1 mb-8 pl-8">
                  <p className="text-4xl font-black tracking-tighter text-white">{groupStats[cat]?.total || 0}</p>
                  <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em]">Asset Records</p>
                </div>
                <Button onClick={() => setSelectedCategories([cat])} variant="outline" className="w-full h-12 mt-auto rounded-xl border-white/10 text-white font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-white/5 transition-all">View Records <ChevronRight className="h-3 w-3" /></Button>
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
            
            <div className="mt-auto pt-8 border-t border-white/5">
              <PaginationControls 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                totalItems={processedAssets.length}
              />
            </div>
          </div>
        )}
      </div>

      {/* Batch Action Bar */}
      <AnimatePresence>
        {selectedCategories.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#0A0A0A]/95 border-2 border-primary/20 rounded-2xl p-2.5 flex items-center gap-6 shadow-3xl backdrop-blur-3xl">
            <div className="flex items-center gap-3 pl-3">
              <div className="h-7 w-7 bg-primary rounded-full flex items-center justify-center text-black font-black text-[9px]">{selectedCategories.length}</div>
              <span className="text-[9px] font-black uppercase text-white tracking-widest">Folders Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={handleSyncSelectedCategories} disabled={isProcessing || !isOnline} className="h-9 px-4 rounded-lg font-black uppercase text-[9px] gap-2 text-primary hover:bg-primary/10">
                <Upload className="h-3.5 w-3.5" /> Sync Folder
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => { setCategoriesToPurge(selectedCategories); setIsPurgeDialogOpen(true); }} disabled={isProcessing} className="h-9 px-4 rounded-lg font-black uppercase text-[9px] gap-2 text-destructive/60 hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5" /> Purge Folder
                </Button>
              )}
            </div>
            <button onClick={() => setSelectedCategories([])} className="p-1.5 text-white/20 hover:text-white transition-all"><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <AssetDetailSheet isOpen={isDetailOpen} onOpenChange={setIsDetailOpen} record={selectedRecord} onEdit={(id) => { setSelectedAssetId(id); setIsFormOpen(true); setIsDetailOpen(false); }} />
      <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={activeAssets.find(a => a.id === selectedAssetId)} isReadOnly={false} onSave={async (a) => { await enqueueMutation('UPDATE', 'assets', a); await refreshRegistry(); setIsFormOpen(false); }} />
      
      {/* Category Rename Pulse */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-black border-white/10 text-white p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Rename Asset Group</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase text-white/40">Broadcasting structural rename pulse to {groupStats[categoryToRename || '']?.total || 0} records.</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary">New Category Label</Label>
              <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="h-12 bg-white/5 border-white/10 rounded-xl font-black uppercase text-sm" />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setIsRenameDialogOpen(false)} className="h-12 px-6 rounded-xl font-black uppercase text-[10px] text-white/40">Cancel</Button>
            <Button onClick={handleRenameCommit} disabled={isProcessing || !newCategoryName.trim()} className="h-12 px-10 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Commit Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Purge Confirmation */}
      <AlertDialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-destructive/20 bg-black text-white p-10">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-destructive">Execute Category Purge?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed italic text-white/40">
              This will permanently delete {categoriesToPurge.length} folders and every record contained within them. This action is immutable across local and cloud storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2 border-white/10 m-0 text-white hover:bg-white/5">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecutePurge} disabled={isProcessing} className="h-12 px-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-destructive/30 bg-destructive text-white m-0">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} 
              Commit Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FilterDrawer isOpen={isFilterOpen} onOpenChange={setIsFilterOpen} headers={headers} activeFilters={filters} onUpdateFilters={setFilters} optionsMap={optionsMap} />
      <SortDrawer isOpen={isSortOpen} onOpenChange={setIsSortOpen} headers={headers} sortBy={sortKey} sortDirection={sortDir} onUpdateSort={(k, dir) => { setSortKey(k); setSortDir(dir); }} />
    </div>
  );
}
