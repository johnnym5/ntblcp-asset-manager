'use client';

/**
 * @fileOverview RegistryWorkstation - Technical Inventory Browser.
 * Phase 309: Implemented Project-scoped category isolation and auto-hiding of empty sheets.
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
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
  LayoutGrid
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { FirestoreService } from '@/services/firebase/firestore';
import type { SheetDefinition, Asset } from '@/types/domain';
import { Card, CardContent } from '../ui/card';

const ITEMS_PER_PAGE = 60;

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
    isSyncing
  } = useAppState();
  
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isHeaderManagerOpen, setIsHeaderManagerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [categoryToRename, setCategoryToRename] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const canAdd = userProfile?.canAddAssets || isAdmin;
  const canEdit = userProfile?.canEditAssets || isAdmin;
  const isVerificationMode = appSettings?.appMode === 'verification';

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

  // Project-Scoped Categories with Auto-Hide Empty Logic
  const categories = useMemo(() => {
    if (!activeGrant) return [];
    
    // 1. Identify all definitions belonging to the active grant pulse
    const allInProject = Object.keys(activeGrant.sheetDefinitions || {}).sort();
    
    // 2. Filter by data presence or manual override
    return allInProject.filter(cat => {
      const stats = groupStats[cat];
      const hasData = stats && stats.total > 0;
      const isManuallyEnabled = appSettings?.enabledSheets?.includes(cat);
      
      // Rule: Hide empty sheets unless an admin has specifically authorized them via the settings pulse
      return hasData || isManuallyEnabled;
    });
  }, [activeGrant, groupStats, appSettings?.enabledSheets]);

  // Facet Discovery Pulse: Dynamically populate filter options
  const optionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    headers.forEach(header => {
      if (header.filterable) {
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
          if (val !== undefined && val !== null && val !== "") {
            values.add(String(val));
          }
        });
        map[header.id] = Array.from(values).sort();
      }
    });
    return map;
  }, [headers, activeAssets]);

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

  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedAssets.slice(start, start + ITEMS_PER_PAGE);
  }, [processedAssets, currentPage]);

  const handleInspect = (id: string) => { setSelectedAssetId(id); setIsDetailOpen(true); };
  const handleToggleSelect = (id: string) => { const next = new Set(selectedAssetIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedAssetIds(next); };
  const handleSearchChange = (val: string) => { setSearchTerm(sanitizeSearch(val)); setCurrentPage(1); };
  const handleExpandSearch = () => { setIsSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 100); };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssetIds(new Set(processedAssets.map(a => a.id)));
    } else {
      setSelectedAssetIds(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedAssetIds.size === 0) return;
    const count = selectedAssetIds.size;
    setIsProcessing(true);
    try {
      for (const id of Array.from(selectedAssetIds)) { await enqueueMutation('DELETE', 'assets', { id }); }
      const currentLocal = await storage.getAssets();
      await storage.saveAssets(currentLocal.filter(a => !selectedAssetIds.has(a.id)));
      await refreshRegistry();
      setSelectedAssetIds(new Set());
      addNotification({ title: "Deletion Pulse", description: `${count} records removed from local register.`, variant: "destructive" });
    } finally { setIsProcessing(false); }
  };

  const handleSyncSelected = async () => {
    if (!isOnline) {
      addNotification({ title: "Sync Interrupted", description: "No internet link discovered.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    addNotification({ title: "Broadcasting Sync", description: `Preparing ${selectedAssetIds.size} records for cloud update.` });
    try {
      const queue = await storage.getQueue();
      const opsToSync = queue.filter(q => selectedAssetIds.has(String(q.payload.id || ''))).map(q => q.id);
      if (opsToSync.length > 0) {
        await processSelectedSyncQueue(opsToSync);
        await refreshRegistry();
        setSelectedAssetIds(new Set());
        addNotification({ title: "Sync Successful", description: `Broadast complete for ${opsToSync.length} records.`, variant: "success" });
      } else {
        addNotification({ title: "Already Synced", description: "Selected items match Cloud Authority." });
      }
    } catch (e) {
      addNotification({ title: "Sync Failure", description: "Operational pulse interrupted.", variant: "destructive" });
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
                {selectedCategories.length === 0 ? 'GROUP OVERVIEW' : 'DETAILED INSPECTION'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
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
                  <Button variant="outline" size="icon" onClick={handleExpandSearch} className="h-10 w-10 rounded-lg border-white/10 bg-white/5 hover:bg-primary/10 text-primary shrink-0"><Search className="h-4 w-4" /></Button>
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
        {selectedCategories.length === 0 ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 pb-40">
            {categories.map(cat => (
              <Card key={cat} className="bg-[#080808] border-2 border-white/5 rounded-3xl overflow-hidden group hover:border-primary/40 transition-all shadow-3xl flex flex-col p-6">
                <div className="flex justify-between items-start mb-8">
                  <h3 className="text-sm font-black uppercase text-white tracking-tight leading-none truncate pr-4">{cat}</h3>
                </div>
                <div className="space-y-1 mb-8">
                  <p className="text-4xl font-black tracking-tighter text-white">{groupStats[cat]?.total || 0}</p>
                  <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em]">Asset Records</p>
                </div>
                <Button onClick={() => setSelectedCategories([cat])} variant="outline" className="w-full h-12 mt-auto rounded-xl border-white/10 text-white font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-white/5 transition-all">View Records <ChevronRight className="h-3 w-3" /></Button>
              </Card>
            ))}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 pb-40" : ""}>
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
        )}
      </div>

      <AnimatePresence>
        {selectedAssetIds.size > 0 && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#0A0A0A]/95 border-2 border-primary/20 rounded-2xl p-2.5 flex items-center gap-6 shadow-3xl backdrop-blur-3xl">
            <div className="flex items-center gap-3 pl-3">
              <div className="h-7 w-7 bg-primary rounded-full flex items-center justify-center text-black font-black text-[9px]">{selectedAssetIds.size}</div>
              <span className="text-[9px] font-black uppercase text-white tracking-widest">Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={handleSyncSelected} disabled={isProcessing || !isOnline} className="h-9 px-4 rounded-lg font-black uppercase text-[9px] gap-2 text-primary hover:bg-primary/10">
                <Upload className="h-3.5 w-3.5" /> Sync
              </Button>
              {canEdit && <Button variant="ghost" size="sm" onClick={() => setIsBatchEditOpen(true)} className="h-9 px-4 rounded-lg font-black uppercase text-[9px] gap-2 text-white/60"><Edit3 className="h-3.5 w-3.5" /> Edit</Button>}
              {isAdmin && <Button variant="ghost" size="sm" onClick={handleDeleteSelected} className="h-9 px-4 rounded-lg font-black uppercase text-[9px] gap-2 text-destructive/60"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>}
            </div>
            <button onClick={() => setSelectedAssetIds(new Set())} className="p-1.5 text-white/20 hover:text-white transition-all"><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <AssetDetailSheet isOpen={isDetailOpen} onOpenChange={setIsDetailOpen} record={selectedRecord} onEdit={(id) => { setSelectedAssetId(id); setIsFormOpen(true); setIsDetailOpen(false); }} />
      <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={activeAssets.find(a => a.id === selectedAssetId)} isReadOnly={false} onSave={async (a) => { await enqueueMutation('UPDATE', 'assets', a); await refreshRegistry(); setIsFormOpen(false); addNotification({ title: "Asset Updated", description: "Modification pulse broadcasted to local register.", variant: "success" }); }} />
      <AssetBatchEditForm isOpen={isBatchEditOpen} onOpenChange={setIsBatchEditOpen} selectedAssetCount={selectedAssetIds.size} onSave={async (data) => { for (const id of Array.from(selectedAssetIds)) { const asset = activeAssets.find(a => a.id === id); if (asset) await enqueueMutation('UPDATE', 'assets', { ...asset, ...data }); } await refreshRegistry(); addNotification({ title: "Batch Update", description: `Applied logic pulse to ${selectedAssetIds.size} records.`, variant: "success" }); setSelectedAssetIds(new Set()); }} />
      <FilterDrawer isOpen={isFilterOpen} onOpenChange={setIsFilterOpen} headers={headers} activeFilters={filters} onUpdateFilters={setFilters} optionsMap={optionsMap} />
      <SortDrawer isOpen={isSortOpen} onOpenChange={setIsSortOpen} headers={headers} sortBy={sortKey} sortDirection={sortDir} onUpdateSort={(k, dir) => { setSortKey(k); setSortDir(dir); }} />
    </div>
  );
}
