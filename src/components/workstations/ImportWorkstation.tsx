'use client';

/**
 * @fileOverview ImportWorkstation - Strict Template-Driven Ingestion.
 * Implements "Define Template First" logic for new folders.
 * Phase 1200: Integrated Template Generation into the asset import pulse.
 * Phase 1201: Fixed project scope resolution for extraction.
 */

import React, { useState, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileUp, 
  ScanSearch, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  Layers,
  XCircle,
  CopyCheck,
  FileWarning
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ParserEngine } from '@/parser/engine';
import { storage } from '@/offline/storage';
import { enqueueMutation } from '@/offline/queue';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { addNotification } from '@/hooks/use-notifications';
import * as XLSX from 'xlsx';
import type { ParsedAsset, ImportRunSummary, DiscoveredGroup, GroupImportContainer } from '@/parser/types';
import { motion, AnimatePresence } from 'framer-motion';
import { StructurePreview } from '@/modules/import/components/StructurePreview';
import { ReconciliationView } from '@/modules/import/components/ReconciliationView';
import { cn, getFuzzySignature } from '@/lib/utils';
import { FirestoreService } from '@/services/firebase/firestore';
import { normalizeHeaderName } from '@/lib/registry-utils';
import type { SheetDefinition } from '@/types/domain';

type ImportStep = 'INGEST' | 'SCANNING' | 'STRUCTURE' | 'RECONCILE' | 'SUMMARY';
type MergeStrategy = 'SKIP_EXISTING' | 'OVERWRITE_EXISTING';

export function ImportWorkstation() {
  const { 
    assets: existingAssets, 
    refreshRegistry, 
    activeGrantIds, 
    setActiveView, 
    appSettings,
    setAppSettings,
    isOnline
  } = useAppState();
  const { userProfile } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<ImportStep>('INGEST');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stagedAssets, setStagedAssets] = useState<ParsedAsset[]>([]);
  const [discoveredGroups, setDiscoveredGroups] = useState<DiscoveredGroup[]>([]);
  const [selectedGroupIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [runSummary, setSummary] = useState<ImportRunSummary | null>(null);
  const [progress, setProgress] = useState(0);
  
  const [workbookData, setWorkbookData] = useState<Record<string, any[][]>>({});
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('SKIP_EXISTING');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<ParserEngine | null>(null);

  const mergedSheetDefinitions = useMemo(() => {
    const defs: Record<string, SheetDefinition> = {};
    appSettings?.grants.forEach(g => {
      Object.entries(g.sheetDefinitions || {}).forEach(([name, def]) => {
        defs[name] = def as any;
      });
    });
    return defs;
  }, [appSettings?.grants]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCurrentStep('SCANNING');
    setIsProcessing(true);
    setProgress(5);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      const allGroups: DiscoveredGroup[] = [];
      const wbData: Record<string, any[][]> = {};
      
      engineRef.current = new ParserEngine(file.name, existingAssets, mergedSheetDefinitions as any);

      for (let i = 0; i < workbook.SheetNames.length; i++) {
        const sheetName = workbook.SheetNames[i];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][] || [];
        
        wbData[sheetName] = data;
        const groups = engineRef.current!.discoverGroups(sheetName, data);
        allGroups.push(...groups);
        
        setProgress(Math.round(((i + 1) / workbook.SheetNames.length) * 100));
      }

      setWorkbookData(wbData);
      setDiscoveredGroups(allGroups);
      setSelectedIds(new Set(allGroups.filter(g => g.isTemplateMatched).map(g => g.id)));

      setTimeout(() => {
        setIsProcessing(false);
        setCurrentStep('STRUCTURE');
      }, 800);
    } catch (error) {
      addNotification({ title: "Scanning Error", variant: "destructive" });
      setCurrentStep('INGEST');
    }
  };

  const handleCreateTemplate = async (group: DiscoveredGroup) => {
    const targetGrantId = activeGrantIds[0];
    if (!targetGrantId || !appSettings) return;

    setIsProcessing(true);
    try {
      const displayFields = group.headerSet.map(h => {
        const key = normalizeHeaderName(h);
        const isCore = ['sn', 'description', 'location', 'asset_id_code', 'serial_number'].includes(key);
        return { key: key as any, label: h, table: isCore, quickView: true, inChecklist: isCore };
      });

      const newDef: SheetDefinition = {
        name: group.groupName,
        headers: group.headerSet,
        displayFields
      };

      const updatedGrants = appSettings.grants.map(g => {
        if (g.id === targetGrantId) {
          return {
            ...g,
            enabledSheets: [...g.enabledSheets, group.groupName],
            sheetDefinitions: { ...g.sheetDefinitions, [group.groupName]: newDef }
          };
        }
        return g;
      });

      const nextSettings = { ...appSettings, grants: updatedGrants };
      await storage.saveSettings(nextSettings);
      if (isOnline) await FirestoreService.updateSettings(nextSettings);
      setAppSettings(nextSettings);

      setDiscoveredGroups(prev => prev.map(g => g.id === group.id ? { ...g, isTemplateMatched: true } : g));
      setSelectedIds(prev => new Set([...Array.from(prev), group.id]));
      
      addNotification({ title: "Template Created", description: `"${group.groupName}" is now a registered folder.`, variant: "success" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!engineRef.current || selectedGroupIds.size === 0) return;
    
    setIsProcessing(true);
    setProgress(0);

    try {
      const selectedGroups = discoveredGroups.filter(g => selectedGroupIds.has(g.id));
      const groupsBySheet: Record<string, DiscoveredGroup[]> = {};
      selectedGroups.forEach(g => {
        if (!groupsBySheet[g.sheetName]) groupsBySheet[g.sheetName] = [];
        groupsBySheet[g.sheetName].push(g);
      });

      const allResults: GroupImportContainer[] = [];
      const sheetEntries = Object.entries(groupsBySheet);

      for (let i = 0; i < sheetEntries.length; i++) {
        const [sheetName, groups] = sheetEntries[i];
        const results = engineRef.current!.ingestGroups(sheetName, workbookData[sheetName], groups);
        allResults.push(...results);
        setProgress(Math.round(((i + 1) / sheetEntries.length) * 100));
      }

      const allStaged = allResults.flatMap(c => c.assets);
      setStagedAssets(allStaged);
      setSummary({
        workbookName: fileInputRef.current?.files?.[0]?.name || 'Workbook',
        sheetName: 'Combined Pulse',
        profileId: 'PRO_V12',
        totalRows: allStaged.length,
        groupCount: allResults.length,
        dataRowsImported: allStaged.length,
        rowsRejected: 0,
        duplicatesDetected: allStaged.filter(a => a.validation.isUpdate).length,
        templatesDiscovered: selectedGroupIds.size,
        sectionBreakdown: {},
        groups: allResults
      });

      await storage.saveToSandbox(allStaged as any[]);
      setCurrentStep('RECONCILE');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommit = async () => {
    const targetGrantId = activeGrantIds[0];
    if (!targetGrantId || !appSettings) return;

    setIsProcessing(true);
    try {
      const assetsToProcess = stagedAssets.filter(a => !a.validation.isUpdate || mergeStrategy === 'OVERWRITE_EXISTING');
      const localAssets = await storage.getAssets();
      const localMap = new Map(localAssets.map(a => [a.id, a]));

      for (const asset of assetsToProcess) {
        const finalAsset = { 
          ...asset, 
          grantId: targetGrantId,
          syncStatus: 'local' as const,
          ...(asset.validation.isUpdate && { id: asset.validation.existingAssetId })
        };
        localMap.set(finalAsset.id, finalAsset as any);
        await enqueueMutation(asset.validation.isUpdate ? 'UPDATE' : 'CREATE', 'assets', finalAsset);
      }

      await storage.saveAssets(Array.from(localMap.values()));
      await storage.clearSandbox();
      await refreshRegistry();
      setCurrentStep('SUMMARY');
    } finally {
      setIsProcessing(false);
    }
  };

  const unrecognizedCount = discoveredGroups.filter(g => !g.isTemplateMatched).length;
  const canProceed = selectedGroupIds.size > 0 && Array.from(selectedGroupIds).every(id => discoveredGroups.find(g => g.id === id)?.isTemplateMatched);

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase flex items-center gap-4 leading-none">
            <div className="p-3 bg-primary/10 rounded-2xl"><FileUp className="h-8 w-8 text-primary" /></div>
            Import Assets
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">Strict Template-Driven Ingestion</p>
        </div>
      </div>

      <div className="px-2">
        <AnimatePresence mode="wait">
          {currentStep === 'INGEST' && (
            <motion.div key="ingest" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-4 border-dashed border-white/5 bg-white/[0.02] hover:border-primary/40 rounded-[3rem] p-16 flex flex-col items-center justify-center text-center h-[450px] cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx,.xls" />
                <div className="p-10 bg-primary/10 rounded-full mb-8 shadow-inner"><FileSpreadsheet className="h-16 w-16 text-primary" /></div>
                <h3 className="text-3xl font-black uppercase text-white tracking-tight leading-none">Initialize Workbook Pulse</h3>
                <p className="text-sm font-medium text-white/40 max-w-sm mx-auto italic mt-4 leading-relaxed">Identifying asset groups using Row 1 (Title) and Row 2 (Headers).</p>
                <Button className="h-16 px-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl mt-10">Select Project Pulse</Button>
              </Card>
            </motion.div>
          )}

          {currentStep === 'SCANNING' && (
            <div className="flex flex-col items-center justify-center py-32 space-y-10">
              <div className="p-16 bg-primary/10 rounded-[3rem] animate-pulse"><ScanSearch className="h-20 w-20 text-primary" /></div>
              <div className="space-y-4 max-w-sm text-center">
                <h3 className="text-2xl font-black uppercase tracking-widest text-white">Traversing Cluster</h3>
                <Progress value={progress} className="h-2" />
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">{progress}% Complete</p>
              </div>
            </div>
          )}

          {currentStep === 'STRUCTURE' && (
            <motion.div key="structure" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
              {unrecognizedCount > 0 && (
                <div className="p-6 rounded-3xl bg-orange-500/5 border-2 border-dashed border-orange-500/20 flex items-start gap-6 mb-10">
                  <div className="p-3 bg-orange-500 rounded-xl"><FileWarning className="h-6 w-6 text-black" /></div>
                  <div className="space-y-1">
                    <h4 className="text-base font-black uppercase text-orange-600">Unrecognized Folders</h4>
                    <p className="text-[11px] font-medium text-white/60 leading-relaxed italic">System found {unrecognizedCount} blocks missing definitions. You must create templates for these before importing.</p>
                  </div>
                </div>
              )}

              <StructurePreview 
                groups={discoveredGroups} 
                selectedIds={selectedGroupIds} 
                onToggleId={(id) => {
                  const group = discoveredGroups.find(g => g.id === id);
                  if (group?.isTemplateMatched) {
                    const next = new Set(selectedGroupIds);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    setSelectedIds(next);
                  } else {
                    toast({ title: "Template Required", description: "Create a folder definition first." });
                  }
                }} 
                onSelectAll={(c) => setSelectedIds(c ? new Set(discoveredGroups.filter(g => g.isTemplateMatched).map(g => g.id)) : new Set())}
                onAction={handleCreateTemplate}
              />
              
              <div className="p-10 rounded-[3rem] bg-white/[0.02] border-2 border-dashed border-white/10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-start gap-6">
                  <div className="p-4 bg-primary/10 rounded-2xl shrink-0"><Layers className="h-8 w-8 text-primary" /></div>
                  <div className="space-y-1">
                    <h4 className="text-2xl font-black uppercase tracking-tight text-white leading-none">Extraction Ready</h4>
                    <p className="text-sm font-medium text-white/40 italic">{selectedGroupIds.size} folders enqueued for processing.</p>
                  </div>
                </div>
                <Button onClick={handleExecuteImport} disabled={!canProceed} className="h-20 px-12 rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl bg-primary text-black gap-4 transition-all">
                  Extract Assets <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 'RECONCILE' && (
            <motion.div key="reconcile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
              <ReconciliationView assets={stagedAssets as any} summary={runSummary!} />
              
              <div className="p-10 rounded-[3rem] bg-[#0A0A0A] border-2 border-primary/20 space-y-10 shadow-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button onClick={() => setMergeStrategy('SKIP_EXISTING')} className={cn("p-8 rounded-[2rem] border-2 text-left transition-all flex gap-6", mergeStrategy === 'SKIP_EXISTING' ? "bg-primary/5 border-primary shadow-xl" : "bg-black border-white/5 opacity-40 hover:opacity-100")}>
                    <div className={cn("p-4 rounded-2xl shrink-0", mergeStrategy === 'SKIP_EXISTING' ? "bg-primary text-black" : "bg-muted")}><XCircle className="h-8 w-8" /></div>
                    <div className="space-y-1"><h5 className={cn("text-lg font-black uppercase", mergeStrategy === 'SKIP_EXISTING' ? "text-primary" : "text-white")}>Skip Existing</h5><p className="text-xs font-medium text-white/60 italic leading-relaxed">Preserve your local records. Only import new physical assets found in the workbook.</p></div>
                  </button>
                  <button onClick={() => setMergeStrategy('OVERWRITE_EXISTING')} className={cn("p-8 rounded-[2rem] border-2 text-left transition-all flex gap-6", mergeStrategy === 'OVERWRITE_EXISTING' ? "bg-primary/5 border-primary shadow-xl" : "bg-black border-white/5 opacity-40 hover:opacity-100")}>
                    <div className={cn("p-4 rounded-2xl shrink-0", mergeStrategy === 'OVERWRITE_EXISTING' ? "bg-primary text-black" : "bg-muted")}><CopyCheck className="h-8 w-8" /></div>
                    <div className="space-y-1"><h5 className={cn("text-lg font-black uppercase", mergeStrategy === 'OVERWRITE_EXISTING' ? "text-primary" : "text-white")}>Update Existing</h5><p className="text-xs font-medium text-white/60 italic leading-relaxed">Overwrite current records with fresh data from this workbook. Useful for bulk corrections.</p></div>
                  </button>
                </div>
                <Button onClick={handleCommit} disabled={isProcessing} className="h-20 w-full rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl bg-primary text-black gap-4 group">
                  {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="h-6 w-6" />}
                  Commit Pulse to Registry
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 'SUMMARY' && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-10">
              <div className="p-16 bg-green-500/10 rounded-[4rem] text-green-600 border border-green-500/20 shadow-2xl"><CheckCircle2 className="h-24 w-20" /></div>
              <div className="space-y-2">
                <h3 className="text-4xl font-black uppercase text-white tracking-tight">Sync Reconciled</h3>
                <p className="text-sm font-medium text-white/40 italic">Integrated {stagedAssets.length} records into the active scope.</p>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setCurrentStep('INGEST')} className="h-16 px-10 rounded-2xl font-black uppercase text-xs border-2 transition-all hover:bg-white/5">Start New Session</Button>
                <Button onClick={() => setActiveView('REGISTRY')} className="h-16 px-12 rounded-2xl font-black uppercase text-xs bg-primary text-black transition-all hover:scale-105 active:scale-95">Open Registry</Button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
