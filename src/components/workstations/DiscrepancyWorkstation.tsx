'use client';

/**
 * @fileOverview Anomaly Dashboard - Intelligent Discrepancy Review Center.
 * Phase 1100: Added isEmbedded prop to blend into Dashboard Overview.
 */

import React, { useMemo, useState, useRef } from 'react';
import { useAppState } from '@/contexts/app-state-context';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  ShieldAlert, 
  Loader2, 
  CheckCircle2,
  XCircle,
  Activity,
  History,
  Tag,
  ArrowRight,
  Database,
  SearchCode,
  FileWarning,
  Zap,
  Info,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import { transformAssetToRecord } from '@/lib/registry-utils';
import { cn, sanitizeSearch } from '@/lib/utils';
import type { Asset, AssetDiscrepancy } from '@/types/domain';
import { ScrollArea } from '@/components/ui/scroll-area';

const ITEMS_PER_PAGE = 24;

export function DiscrepancyWorkstation({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { assets, settingsLoaded, headers, appSettings } = useAppState();
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const flaggedAssets = useMemo(() => {
    return assets.filter(a => a.discrepancies && a.discrepancies.length > 0 && a.discrepancies.some(d => d.status === 'PENDING' || d.status === 'SUSPICIOUS'));
  }, [assets]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return flaggedAssets;
    const term = searchTerm.toLowerCase();
    return flaggedAssets.filter(a => 
      (a.description || '').toLowerCase().includes(term) || 
      (a.assetIdCode || '').toLowerCase().includes(term) ||
      a.discrepancies.some(d => d.reason.toLowerCase().includes(term))
    );
  }, [flaggedAssets, searchTerm]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const stats = useMemo(() => {
    const totalFlagged = flaggedAssets.length;
    const critical = flaggedAssets.filter(a => a.discrepancies.some(d => d.severity === 'CRITICAL' || d.severity === 'HIGH')).length;
    const resolved = assets.filter(a => a.discrepancies && a.discrepancies.some(d => d.status === 'RESOLVED' || d.status === 'CORRECTED')).length;
    return { totalFlagged, critical, resolved };
  }, [flaggedAssets, assets]);

  const handleInspect = (id: string) => {
    setSelectedAssetId(id);
    setIsDetailOpen(true);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(sanitizeSearch(val));
    setCurrentPage(1);
  };

  const handleExpandSearch = () => {
    setIsSearchExpanded(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const selectedRecord = useMemo(() => {
    if (!selectedAssetId) return undefined;
    const asset = assets.find(a => a.id === selectedAssetId);
    return asset ? transformAssetToRecord(asset, headers, appSettings?.sourceBranding) : undefined;
  }, [selectedAssetId, assets, headers, appSettings?.sourceBranding]);

  if (!settingsLoaded) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-10 animate-in fade-in duration-700 pb-32 max-w-7xl mx-auto relative", isEmbedded ? "pb-10" : "")}>
      {/* Header (Hidden if Embedded) */}
      {!isEmbedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tighter text-white uppercase flex items-center gap-4 leading-none">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <SearchCode className="h-8 w-8 text-primary" />
              </div>
              Anomaly Dashboard
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              Intelligent Pattern Review & Fidelity Auditing
            </p>
          </div>
          <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/5 shadow-xl">
            <div className="px-6 py-2 flex flex-col items-center">
              <span className="text-[8px] font-black uppercase text-white/40">Critical Pulse</span>
              <span className="text-sm font-black text-red-600">{stats.critical}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="px-6 py-2 flex flex-col items-center">
              <span className="text-[8px] font-black uppercase text-white/40">Resolved</span>
              <span className="text-sm font-black text-green-600">{stats.resolved}</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Matrix (Hidden if Embedded) */}
      {!isEmbedded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2">
          <Card className="rounded-[2.5rem] border-2 border-primary/20 bg-primary/[0.02] p-8 shadow-3xl">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-primary/10 rounded-2xl"><Zap className="h-6 w-6 text-primary" /></div>
              <Badge className="bg-primary text-black font-black">ACTIVE SCAN</Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-4xl font-black tracking-tighter text-white">{stats.totalFlagged}</h3>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-tight">Records awaiting heuristic review</p>
            </div>
          </Card>

          <Card className="rounded-[2.5rem] border-2 border-white/5 bg-[#080808] p-8 shadow-3xl">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/5 rounded-2xl"><Activity className="h-6 w-6 text-white/40" /></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Pattern Health</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-4xl font-black tracking-tighter text-white">
                {assets.length > 0 ? Math.round(((assets.length - stats.totalFlagged) / assets.length) * 100) : 100}%
              </h3>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-tight">Global register fidelity score</p>
            </div>
          </Card>

          <Card className="rounded-[2.5rem] border-2 border-white/5 bg-[#080808] p-8 shadow-3xl">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/5 rounded-2xl"><History className="h-6 w-6 text-white/40" /></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Review Load</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-4xl font-black tracking-tighter text-white">{stats.totalFlagged}</h3>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-tight">Unresolved anomaly pulses</p>
            </div>
          </Card>
        </div>
      )}

      {/* Review Queue */}
      <div className="space-y-6 px-2">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center justify-start flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {!isSearchExpanded ? (
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleExpandSearch}
                  className="h-14 w-14 rounded-2xl border-white/10 bg-white/5 hover:bg-primary/10 text-primary"
                >
                  <Search className="h-5 w-5" />
                </Button>
              ) : (
                <motion.div 
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "100%", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="relative group"
                >
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input 
                    ref={searchInputRef}
                    placeholder="Search anomalies..." 
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onBlur={() => !searchTerm && setIsSearchExpanded(false)}
                    className="pl-12 h-14 rounded-2xl bg-white/[0.03] border-2 border-primary/20 text-white placeholder:text-white/20 focus:border-primary font-medium"
                  />
                  <button onClick={() => { setSearchTerm(''); setIsSearchExpanded(false); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"><X className="h-4 w-4" /></button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button variant="outline" className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 gap-2 text-white/60 hover:bg-white/5">
            <Filter className="h-4 w-4" /> Filter Severity
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {paginatedItems.map(asset => (
              <motion.div
                key={asset.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative"
              >
                <div className="absolute -top-3 -right-3 z-20">
                  <div className={cn(
                    "h-10 w-10 rounded-2xl flex items-center justify-center text-white shadow-2xl border-2 border-black",
                    asset.discrepancies.some(d => d.severity === 'CRITICAL' || d.severity === 'HIGH') ? "bg-red-600" : "bg-primary text-black"
                  )}>
                    <FileWarning className="h-5 w-5" />
                  </div>
                </div>

                <div className={cn(
                  "p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer bg-black/40",
                  "border-white/5 hover:border-primary/20"
                )} onClick={() => handleInspect(asset.id)}>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Potential Issue</span>
                      <h4 className="text-base font-black uppercase text-white truncate">{asset.description}</h4>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                      {asset.discrepancies.slice(0, 2).map((d, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className={cn("h-1.5 w-1.5 rounded-full mt-1.5", d.severity === 'HIGH' || d.severity === 'CRITICAL' ? "bg-red-500" : "bg-primary")} />
                          <p className="text-[10px] font-medium text-white/60 leading-relaxed italic">{d.reason}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Badge variant="outline" className="text-[8px] font-black uppercase border-white/10 text-white/40">{asset.importMetadata?.sheetName || 'MANUAL'}</Badge>
                      <Button variant="ghost" className="h-8 px-4 text-[9px] font-black uppercase text-primary hover:bg-primary/10 rounded-lg">Review Asset <ArrowRight className="ml-2 h-3 w-3" /></Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center mt-12 gap-6 items-center">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 text-white/40 hover:text-primary disabled:opacity-5 transition-all"><ChevronLeft className="h-6 w-6" /></button>
            <span className="text-[11px] font-black uppercase tracking-widest text-white/60">Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p + 1)} className="p-2 text-white/40 hover:text-primary disabled:opacity-5 transition-all"><ChevronRight className="h-6 w-6" /></button>
          </div>
        )}

        {filteredItems.length === 0 && (
          <div className="py-40 text-center opacity-20 flex flex-col items-center gap-8 border-4 border-dashed rounded-[4rem]">
            <div className="p-10 bg-white/5 rounded-full"><CheckCircle2 className="h-20 w-20 text-green-600" /></div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black uppercase tracking-widest text-white">All Clear</h3>
              <p className="text-sm font-medium italic text-white/40">Zero unresolved anomalies discovered in current pulse.</p>
            </div>
          </div>
        )}
      </div>

      <AssetDetailSheet 
        isOpen={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        record={selectedRecord}
        onEdit={(id) => {}}
      />
    </div>
  );
}
