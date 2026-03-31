'use client';

/**
 * @fileOverview Registry Workspace - Decentralized Hierarchical Register.
 * Phase 61: Integrated Structure-Preserving Excel Export Pulse.
 */

import React, { useMemo, useState, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Plus, 
  Boxes, 
  Loader2, 
  FileDown, 
  Database,
  DatabaseZap,
  X,
  Columns,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FilterX,
  LayoutGrid,
  List,
  Zap,
  Edit3,
  Trash2,
  Settings2,
  ShieldCheck,
  Palette,
  Bookmark,
  Info,
  CheckSquare,
  Square,
  Activity,
  Globe,
  CloudOff,
  FolderKanban,
  ArrowRightLeft,
  Printer,
  FileJson,
  FileSpreadsheet
} from 'lucide-react';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { RegistryTable } from '@/components/registry/RegistryTable';
import { HeaderManagerDrawer } from '@/components/registry/HeaderManagerDrawer';
import { FilterDrawer } from '@/components/registry/FilterDrawer';
import { SortDrawer } from '@/components/registry/SortDrawer';
import { SourceBrandingDrawer } from '@/components/registry/SourceBrandingDrawer';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import { AssetForm } from '@/components/asset-form';
import { AssetBatchEditForm } from '@/components/asset-batch-edit-form';
import { VerificationPulse } from '@/components/registry/VerificationPulse';
import { TagPrintDialog } from '@/components/registry/TagPrintDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Asset } from '@/types/domain';
import type { RegistryHeader, AssetRecord, HeaderFilter, RegistryPreset } from '@/types/registry';
import { DEFAULT_REGISTRY_HEADERS, transformAssetToRecord, REGISTRY_PRESETS } from '@/lib/registry-utils';
import { Badge } from '@/components/ui/badge';
import { ExcelService } from '@/services/excel-service';
import { storage } from '@/offline/storage';
import { enqueueMutation } from '@/offline/queue';
import { saveAs } from 'file-saver';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';

const ITEMS_PER_PAGE = 24;

export default function AssetRegistryPage() {
  const { 
    assets, 
    sandboxAssets, 
    dataSource, 
    setDataSource, 
    refreshRegistry, 
    settingsLoaded, 
    activeGrantId, 
    appSettings,
    isOnline
  } = useAppState();
  
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // --- UI State ---
  const [headers, setHeaders] = useState<RegistryHeader[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activePresetId, setActivePresetId] = useState<string>("quick");
  
  // --- Selection State ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- Drawers & Dialogs ---
  const [isHeaderManagerOpen, setIsHeaderManagerOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isBrandingOpen, setIsBrandingOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  // --- Logic State ---
  const [filters, setFilters] = useState<HeaderFilter[]>([]);
  const [sortKey, setSortKey] = useState<string>('sn');
  const [sortDir, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRecord, setSelectedRecord] = useState<AssetRecord | undefined>();
  const [selectedAssetForForm, setSelectedAssetForForm] = useState<Asset | undefined>();
  const [isReassigning, setIsReassigning] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  useEffect(() => {
    const savedHeaders = localStorage.getItem('registry-header-prefs');
    if (savedHeaders) {
      setHeaders(JSON.parse(savedHeaders));
    } else {
      const initial = DEFAULT_REGISTRY_HEADERS.map((h, i) => ({ ...h, id: `h-${i}`, orderIndex: i }));
      setHeaders(initial as RegistryHeader[]);
    }
  }, []);

  const saveHeaderPrefs = (updated: RegistryHeader[]) => {
    setHeaders(updated);
    localStorage.setItem('registry-header-prefs', JSON.stringify(updated));
  };

  const handleQuickExport = () => {
    const activeProject = appSettings?.grants.find(g => g.id === activeGrantId)?.name || 'Registry';
    const snapshot = {
      project: activeProject,
      timestamp: new Date().toISOString(),
      source: dataSource,
      records: assets
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    saveAs(blob, `Registry-Pulse-${activeProject.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`);
    toast({ title: "Registry Pulse Exported", description: "Project snapshot saved to local storage." });
  };

  const handleExcelExport = async () => {
    setIsExportingExcel(true);
    try {
      await ExcelService.exportRegistry(assets, headers);
      toast({ title: "Excel Pulse Complete", description: "Registry data exported with template alignment." });
    } catch (e) {
      toast({ variant: "destructive", title: "Export Failed" });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleReassignGrant = async (targetGrantId: string) => {
    if (selectedIds.size === 0) return;
    setIsReassigning(true);
    
    try {
      const assetsToMove = assets.filter(a => selectedIds.has(a.id));
      for (const asset of assetsToMove) {
        const updated = {
          ...asset,
          grantId: targetGrantId,
          lastModified: new Date().toISOString(),
          lastModifiedBy: userProfile?.displayName || 'System Reassignment'
        };
        await enqueueMutation('UPDATE', 'assets', updated);
        const currentLocal = await storage.getAssets();
        await storage.saveAssets(currentLocal.map(a => a.id === asset.id ? updated : a));
      }
      
      await refreshRegistry();
      setSelectedIds(new Set());
      setIsReassignDialogOpen(false);
      toast({ title: "Migration Pulse Complete", description: `Reassigned ${assetsToMove.length} records to new project scope.` });
    } finally {
      setIsReassigning(false);
    }
  };

  const currentRegistry = dataSource === 'PRODUCTION' ? assets : sandboxAssets;

  const metrics = useMemo(() => {
    const total = currentRegistry.length;
    const verified = currentRegistry.filter(a => a.status === 'VERIFIED').length;
    const exceptions = currentRegistry.filter(a => a.status === 'DISCREPANCY' || ['Stolen', 'Burnt'].includes(a.condition)).length;
    const dataGaps = currentRegistry.filter(a => !a.serialNumber || !a.assetIdCode).length;
    return { total, verified, exceptions, dataGaps };
  }, [currentRegistry]);

  const applyMetricFilter = (type: 'verified' | 'exceptions' | 'gaps' | 'pending') => {
    let targetHeaderId = '';
    let targetValue = '';
    
    switch(type) {
      case 'verified': 
        targetHeaderId = headers.find(h => h.normalizedName === 'verification_status')?.id || '';
        targetValue = 'VERIFIED';
        break;
      case 'exceptions':
        targetHeaderId = headers.find(h => h.normalizedName === 'verification_status')?.id || '';
        targetValue = 'DISCREPANCY';
        break;
      case 'pending':
        targetHeaderId = headers.find(h => h.normalizedName === 'verification_status')?.id || '';
        targetValue = 'UNVERIFIED';
        break;
      case 'gaps':
        targetHeaderId = headers.find(h => h.normalizedName === 'serial_number')?.id || '';
        setFilters([{ headerId: targetHeaderId, operator: 'exists', value: '' }]);
        return;
    }

    if (targetHeaderId) {
      setFilters([{ headerId: targetHeaderId, operator: 'equals', value: targetValue }]);
    }
  };

  const processedRecords = useMemo(() => {
    let results = currentRegistry.map(a => transformAssetToRecord(a, headers, appSettings?.sourceBranding));

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(r => 
        String(r.rawRow.description || '').toLowerCase().includes(term) || 
        String(r.rawRow.serialNumber || '').toLowerCase().includes(term) ||
        String(r.rawRow.assetIdCode || '').toLowerCase().includes(term)
      );
    }

    filters.forEach(f => {
      results = results.filter(r => {
        const field = r.fields.find(field => field.headerId === f.headerId);
        const val = String(field?.rawValue || '').toLowerCase();
        const filterVal = String(f.value || '').toLowerCase();

        switch(f.operator) {
          case 'equals': return val === filterVal;
          case 'contains': return val.includes(filterVal);
          case 'startsWith': return val.startsWith(filterVal);
          case 'endsWith': return val.endsWith(filterVal);
          case 'exists': return val === '' || val === '---' || val === 'n/a';
          default: return true;
        }
      });
    });

    results.sort((a, b) => {
      const fieldA = a.fields.find(f => f.headerId === sortKey)?.rawValue || '';
      const fieldB = b.fields.find(f => f.headerId === sortKey)?.rawValue || '';
      const comparison = String(fieldA).localeCompare(String(fieldB), undefined, { numeric: true });
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return results;
  }, [currentRegistry, searchTerm, headers, filters, sortKey, sortDir, appSettings?.sourceBranding]);

  const paginatedRecords = useMemo(() => {
    return processedRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [processedRecords, currentPage]);

  const totalPages = Math.ceil(processedRecords.length / ITEMS_PER_PAGE);

  const selectedRecordsForPrint = useMemo(() => {
    return processedRecords.filter(r => selectedIds.has(r.id));
  }, [processedRecords, selectedIds]);

  const handleInspect = (id: string) => {
    const record = processedRecords.find(r => r.id === id);
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedRecords.map(r => r.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
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
      <LayoutGroup>
        <div className="flex flex-col h-full gap-4 md:gap-6 relative pb-24 md:pb-32">
          {/* Header Section */}
          <motion.div layout className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between px-1">
            <div className="space-y-1">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tighter text-foreground uppercase leading-tight flex items-center gap-3">
                {isOnline ? <Globe className="h-8 w-8 text-green-600 animate-pulse" /> : <CloudOff className="h-8 w-8 text-orange-600" />}
                {isOnline ? "Online Assets Registry" : "Locally Saved Store"}
              </h2>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="h-6 px-3 text-[9px] font-black tracking-widest rounded-full border-2 border-primary/20 bg-primary/5 text-primary">
                  {processedRecords.length} RECORDS IN SCOPE
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center bg-muted/50 p-1 rounded-2xl border-2 border-border/40 shadow-inner">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleExcelExport}
                  disabled={isExportingExcel}
                  className="h-8 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest gap-2"
                >
                  {isExportingExcel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />} Excel
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleQuickExport}
                  className="h-8 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest gap-2"
                >
                  <FileJson className="h-3.5 w-3.5" /> JSON
                </Button>
              </div>

              <div className="flex items-center bg-muted/50 p-1 rounded-2xl border-2 border-border/40 shadow-inner">
                <Button 
                  variant={dataSource === 'PRODUCTION' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setDataSource('PRODUCTION')}
                  className="h-8 px-3 md:px-4 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest gap-2"
                >
                  <Database className="h-3.5 w-3.5" /> Authoritative
                </Button>
                <Button 
                  variant={dataSource === 'SANDBOX' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setDataSource('SANDBOX')}
                  className="h-8 px-3 md:px-4 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest gap-2"
                >
                  <DatabaseZap className="h-3.5 w-3.5" /> Sandbox
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setIsBrandingOpen(true)} className="h-10 w-10 rounded-xl border-2 border-primary/10 bg-card shadow-sm"><Palette className="h-4 w-4 text-primary" /></Button>
                <Button variant="outline" size="icon" onClick={() => setIsHeaderManagerOpen(true)} className="h-10 w-10 rounded-xl border-2 border-primary/10 bg-card shadow-sm"><Settings2 className="h-4 w-4 text-primary" /></Button>
              </div>
            </div>
          </motion.div>

          {/* Metrics Pulse Row */}
          <motion.div layout className="px-1">
            <VerificationPulse 
              total={metrics.total}
              verified={metrics.verified}
              exceptions={metrics.exceptions}
              dataGaps={metrics.dataGaps}
              onAction={applyMetricFilter}
            />
          </motion.div>

          {/* Action Toolbar */}
          <motion.div layout className="flex flex-col gap-4 px-1">
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <div className="relative flex-1 group min-w-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-primary transition-all" />
                <Input 
                  placeholder="Scan active registry pulse..." 
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-12 h-12 md:h-14 rounded-2xl bg-card border-none shadow-xl focus-visible:ring-primary/20 text-sm font-medium transition-all"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" onClick={() => setIsFilterOpen(true)} className="flex-1 sm:flex-none h-12 md:h-14 px-4 md:px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card border-none shadow-lg relative">
                  <Filter className="h-4 w-4" /> 
                  <span className="hidden xs:inline">Logic Filters</span>
                  {filters.length > 0 && <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-white text-[10px] rounded-full flex items-center justify-center border-4 border-background">{filters.length}</span>}
                </Button>
                <Button variant="outline" onClick={() => setIsSortOpen(true)} className="flex-1 sm:flex-none h-12 md:h-14 px-4 md:px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card border-none shadow-lg">
                  <ArrowUpDown className="h-4 w-4" /> <span className="hidden xs:inline">Sort Sequence</span>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Registry Surface */}
          <motion.div layout className="flex-1 px-1">
            {paginatedRecords.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  <AnimatePresence mode="popLayout">
                    {paginatedRecords.map((record) => (
                      <motion.div key={record.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} layout>
                        <RegistryCard record={record} onInspect={handleInspect} densityMode={activePresetId === 'quick' ? 'compact' : 'expanded'} selected={selectedIds.has(record.id)} onToggleSelect={handleToggleSelect} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[2rem] border-2 border-border/40 bg-card/50 shadow-xl"><RegistryTable records={paginatedRecords} onInspect={handleInspect} selectedIds={selectedIds} onToggleSelect={handleToggleSelect} onSelectAll={handleSelectAll} /></div>
              )
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-center p-10 opacity-20 border-4 border-dashed rounded-[3rem] space-y-6">
                <Boxes className="h-24 w-24 mb-2" />
                <h3 className="text-2xl font-black uppercase tracking-[0.2em]">Registry Silent</h3>
              </div>
            )}
          </motion.div>

          {/* Operational Pulse Bar */}
          <motion.div layout className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-40 bg-background/80 backdrop-blur-2xl px-4 md:px-6 py-2 md:py-3 rounded-[2.5rem] border-2 border-primary/10 shadow-2xl flex items-center gap-4 md:gap-6 transition-all w-[95vw] md:w-auto overflow-hidden">
            {selectedIds.size > 0 ? (
              <div className="flex items-center gap-4 md:gap-6 animate-in slide-in-from-bottom-2 duration-300 w-full justify-between sm:justify-start">
                <div className="flex flex-col shrink-0">
                  <span className="text-[9px] md:text-[10px] font-black uppercase text-primary leading-none">{selectedIds.size} Selected</span>
                  <Button variant="ghost" className="h-4 p-0 text-[7px] font-bold uppercase text-muted-foreground hover:bg-transparent" onClick={() => setSelectedIds(new Set())}>Clear Selection</Button>
                </div>
                <div className="h-8 w-px bg-border/40 hidden xs:block" />
                <div className="flex items-center gap-1 md:gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsBatchEditOpen(true)} className="h-11 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 text-primary hover:bg-primary/5"><Edit3 className="h-3.5 w-3.5" /> Batch Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsPrintDialogOpen(true)} className="h-11 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 text-blue-600 hover:bg-blue-50"><Printer className="h-3.5 w-3.5" /> Print Tags</Button>
                  {userProfile?.isAdmin && (
                    <Button variant="ghost" size="sm" onClick={() => setIsReassignDialogOpen(true)} className="h-11 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 text-primary hover:bg-primary/5"><FolderKanban className="h-3.5 w-3.5" /> Reassign</Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setIsBatchDeleteDialogOpen(true)} className="h-11 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 text-destructive hover:bg-destructive/5"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1 md:gap-2 shrink-0">
                  <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-10 w-10 rounded-xl"><ChevronLeft className="h-5 w-5" /></Button>
                  <span className="text-[10px] font-black uppercase tracking-widest px-4 tabular-nums whitespace-nowrap">Page {currentPage} of {totalPages || 1}</span>
                  <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-10 w-10 rounded-xl"><ChevronRight className="h-5 w-5" /></Button>
                </div>
                <div className="h-6 w-px bg-border/40 hidden xs:block" />
                <div className="flex items-center gap-2">
                  <Button className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-primary shadow-xl shadow-primary/20 text-white" onClick={() => setIsFormOpen(true)}>
                    <Plus className="mr-2 h-4 w-4 hidden xs:inline" /> New Asset
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </LayoutGroup>

      {/* Drawers & Dialogs */}
      <HeaderManagerDrawer isOpen={isHeaderManagerOpen} onOpenChange={setIsHeaderManagerOpen} headers={headers} onUpdateHeaders={saveHeaderPrefs} onReset={() => {}} />
      <FilterDrawer isOpen={isFilterOpen} onOpenChange={setIsFilterOpen} headers={headers} activeFilters={filters} onUpdateFilters={setFilters} />
      <SortDrawer isOpen={isSortOpen} onOpenChange={setIsSortOpen} headers={headers} sortBy={sortKey} sortDirection={sortDir} onUpdateSort={(k, dir) => { setSortKey(k); setSortDirection(dir); }} />
      <SourceBrandingDrawer isOpen={isBrandingOpen} onOpenChange={setIsBrandingOpen} />
      <AssetDetailSheet isOpen={isDetailOpen} onOpenChange={setIsDetailOpen} record={selectedRecord} onEdit={(id) => {}} />
      <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={selectedAssetForForm} headers={headers} isReadOnly={false} onSave={async (a) => { await refreshRegistry(); setIsFormOpen(false); }} onQuickSave={async () => {}} />
      <AssetBatchEditForm isOpen={isBatchEditOpen} onOpenChange={setIsBatchEditOpen} selectedAssetCount={selectedIds.size} onSave={async (d) => { await refreshRegistry(); setSelectedIds(new Set()); }} />
      <TagPrintDialog isOpen={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen} records={selectedRecordsForPrint} />
      
      <AlertDialog open={isReassignDialogOpen} onOpenChange={setIsReassignDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-primary/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Migrate Record Pulse?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic leading-relaxed">Select the target project scope for the {selectedIds.size} selected assets.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-6 grid grid-cols-1 gap-2">
            {appSettings?.grants.map(grant => (
              <Button 
                key={grant.id} 
                variant="outline" 
                onClick={() => handleReassignGrant(grant.id)}
                disabled={isReassigning || grant.id === activeGrantId}
                className={cn(
                  "h-12 justify-start font-black uppercase text-[10px] tracking-widest rounded-xl border-2 transition-all",
                  grant.id === activeGrantId ? "opacity-40" : "hover:border-primary/40 hover:bg-primary/5"
                )}
              >
                <ArrowRightLeft className="mr-3 h-4 w-4 opacity-40" />
                {grant.name}
                {grant.id === activeGrantId && <span className="ml-auto opacity-40">(ACTIVE)</span>}
              </Button>
            ))}
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-bold">Discard</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBatchDeleteDialogOpen} onOpenChange={setIsBatchDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-primary/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Delete Selected Records?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium">This will permanently remove the selected assets. This action is deterministic.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-xl font-bold">Discard</AlertDialogCancel>
            <AlertDialogAction onClick={() => setSelectedIds(new Set())} className="bg-destructive hover:bg-destructive/90 rounded-xl font-black uppercase text-[10px] tracking-widest h-11 px-6">Confirm Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
