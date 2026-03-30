'use client';

/**
 * @fileOverview Registry Workspace - Header-Aware High-Performance Browser.
 * Updated for stacked layout and configurable schema orchestration.
 */

import React, { useMemo, useState, useEffect } from 'react';
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
  LayoutGrid, 
  List, 
  Database,
  DatabaseZap,
  X,
  Columns,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { HeaderManagerDrawer } from '@/components/registry/HeaderManagerDrawer';
import { AssetForm } from '@/components/asset-form';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Asset } from '@/types/domain';
import type { RegistryHeader, RegistryFilterState, AssetRecord } from '@/types/registry';
import { DEFAULT_REGISTRY_HEADERS, transformAssetToRecord } from '@/lib/registry-utils';
import { Badge } from '@/components/ui/badge';
import { ExcelService } from '@/services/excel-service';

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
    appSettings 
  } = useAppState();
  
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Local Preferences & Layout State
  const [headers, setHeaders] = useState<RegistryHeader[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isHeaderManagerOpen, setIsHeaderManagerOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>();

  // Initialize Headers from Template
  useEffect(() => {
    const saved = localStorage.getItem('registry-header-prefs');
    if (saved) {
      setHeaders(JSON.parse(saved));
    } else {
      const initial = DEFAULT_REGISTRY_HEADERS.map((h, i) => ({ ...h, id: `h-${i}`, orderIndex: i }));
      setHeaders(initial as RegistryHeader[]);
    }
  }, []);

  const saveHeaderPrefs = (updated: RegistryHeader[]) => {
    setHeaders(updated);
    localStorage.setItem('registry-header-prefs', JSON.stringify(updated));
  };

  const currentRegistry = dataSource === 'PRODUCTION' ? assets : sandboxAssets;

  const records = useMemo(() => {
    const filtered = currentRegistry.filter(a => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return a.description?.toLowerCase().includes(term) || 
             a.serialNumber?.toLowerCase().includes(term) ||
             a.assetIdCode?.toLowerCase().includes(term);
    });

    return filtered.map(a => transformAssetToRecord(a, headers));
  }, [currentRegistry, searchTerm, headers]);

  const paginatedRecords = useMemo(() => {
    return records.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [records, currentPage]);

  const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE);

  const handleInspect = (id: string) => {
    const asset = currentRegistry.find(a => a.id === id);
    setSelectedAsset(asset);
    setIsFormOpen(true);
  };

  if (authLoading || !settingsLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const activeProjectName = appSettings?.grants.find(g => g.id === activeGrantId)?.name || 'Registry Hub';

  return (
    <AppLayout>
      <div className="flex flex-col h-full gap-6 relative pb-32">
        {/* Header Pulse */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter text-foreground uppercase leading-none">{activeProjectName}</h2>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={cn(
                "h-6 px-3 text-[9px] font-black tracking-widest rounded-full border-2",
                dataSource === 'SANDBOX' ? "border-orange-500/20 bg-orange-50 text-orange-600" : "border-primary/20 bg-primary/5 text-primary shadow-sm"
              )}>
                {records.length} RECORDS IN PULSE
              </Badge>
              {dataSource === 'SANDBOX' && (
                <Badge className="h-6 px-3 text-[9px] font-black tracking-widest bg-orange-500 text-white rounded-full shadow-lg shadow-orange-500/20">
                  SANDBOX ACTIVE
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-muted/50 p-1.5 rounded-2xl border-2 border-border/40 shadow-inner">
              <Button 
                variant={dataSource === 'PRODUCTION' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setDataSource('PRODUCTION')}
                className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2"
              >
                <Database className="h-3.5 w-3.5" /> Production
              </Button>
              <Button 
                variant={dataSource === 'SANDBOX' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setDataSource('SANDBOX')}
                className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2"
              >
                <DatabaseZap className="h-3.5 w-3.5" /> Sandbox
              </Button>
            </div>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsHeaderManagerOpen(true)}
              className="h-12 w-12 rounded-2xl border-2 border-primary/10 shadow-sm tactile-pulse"
            >
              <Columns className="h-5 w-5 text-primary" />
            </Button>
          </div>
        </div>

        {/* Toolbar Pulse */}
        <div className="flex flex-col md:flex-row gap-4 px-2">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-primary transition-all" />
            <Input 
              placeholder="Search by ID, Serial, or Description..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-12 h-14 rounded-2xl bg-card border-none shadow-xl focus-visible:ring-primary/20 text-sm font-medium transition-all"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card border-none shadow-lg hover:bg-primary/5 transition-all">
              <Filter className="h-4 w-4" /> Advanced Filter
            </Button>
            <Button variant="outline" className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card border-none shadow-lg hover:bg-primary/5 transition-all">
              <ArrowUpDown className="h-4 w-4" /> Sort Registry
            </Button>
          </div>
        </div>

        {/* Registry Surface */}
        <div className="flex-1 px-2">
          {paginatedRecords.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {paginatedRecords.map((record) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                  >
                    <RegistryCard 
                      record={record}
                      onInspect={handleInspect}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-center p-10 opacity-20 border-4 border-dashed rounded-[3rem]">
              <Boxes className="h-24 w-24 mb-6" />
              <h3 className="text-2xl font-black uppercase tracking-[0.2em]">Registry Pulse Silent</h3>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Zero records detected matching current logic pulse.</p>
            </div>
          )}
        </div>

        {/* Bottom Pagination Pulse */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-background/80 backdrop-blur-2xl px-6 py-3 rounded-[2.5rem] border-2 border-primary/10 shadow-2xl flex items-center gap-6 ring-1 ring-white/10">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="h-10 w-10 rounded-xl tactile-pulse"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-[10px] font-black uppercase tracking-widest px-4 tabular-nums">
              Page {currentPage} <span className="opacity-30">of</span> {totalPages || 1}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="h-10 w-10 rounded-xl tactile-pulse"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <div className="h-6 w-px bg-border/40" />
          <div className="flex items-center gap-2">
            <Button 
              className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-primary shadow-xl shadow-primary/20 tactile-pulse"
              onClick={() => { setSelectedAsset(undefined); setIsFormOpen(true); }}
            >
              <Plus className="mr-2 h-4 w-4" /> New Pulse
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => ExcelService.exportRegistry(currentRegistry)}
              className="h-12 w-12 rounded-2xl tactile-pulse opacity-60 hover:opacity-100"
            >
              <FileDown className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <HeaderManagerDrawer 
        isOpen={isHeaderManagerOpen}
        onOpenChange={setIsHeaderManagerOpen}
        headers={headers}
        onUpdateHeaders={saveHeaderPrefs}
        onReset={() => {
          const initial = DEFAULT_REGISTRY_HEADERS.map((h, i) => ({ ...h, id: `h-${i}`, orderIndex: i }));
          saveHeaderPrefs(initial as RegistryHeader[]);
        }}
      />

      <AssetForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        asset={selectedAsset}
        isReadOnly={dataSource === 'PRODUCTION' && appSettings?.appMode === 'management'}
        onSave={async (a) => {
          // Backward compatibility: use existing refresh logic
          await refreshRegistry();
          setIsFormOpen(false);
        }}
        onQuickSave={async () => {}}
      />
    </AppLayout>
  );
}
