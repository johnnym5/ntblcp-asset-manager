
'use client';

/**
 * @fileOverview ImportWorkstation - Controlled Registry Ingestion.
 * Phase 651: Added specific pulse notifications for discovery and commit.
 */

import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileUp, 
  ScanSearch, 
  ShieldCheck, 
  Loader2, 
  DatabaseZap, 
  CheckCircle2,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Activity,
  FileSpreadsheet,
  Zap,
  Layers
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ParserEngine } from '@/parser/engine';
import { storage } from '@/offline/storage';
import { enqueueMutation } from '@/offline/queue';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { FirestoreService } from '@/services/firebase/firestore';
import { addNotification } from '@/hooks/use-notifications';
import * as XLSX from 'xlsx';
import type { ParsedAsset, ImportRunSummary, DiscoveredGroup, GroupImportContainer } from '@/parser/types';
import { motion, AnimatePresence } from 'framer-motion';
import { StructurePreview } from '@/modules/import/components/StructurePreview';
import { ReconciliationView } from '@/modules/import/components/ReconciliationView';

type ImportStep = 'INGEST' | 'SCANNING' | 'STRUCTURE' | 'RECONCILE' | 'SUMMARY';

export function ImportWorkstation() {
  const { toast } = useToast();
  const { 
    assets: existingAssets, 
    refreshRegistry, 
    activeGrantId, 
    setDataSource, 
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
  const [activeSheetData, setActiveSheetData] = useState<{name: string, data: any[][]} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<ParserEngine | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    addNotification({ title: "Inbound Workbook", description: `Initializing pulse for ${file.name}...` });
    setCurrentStep('SCANNING');
    setIsProcessing(true);
    setProgress(10);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      setProgress(40);

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
      
      engineRef.current = new ParserEngine(file.name, existingAssets);
      const groups = engineRef.current!.discoverGroups(sheetName, data);

      setActiveSheetData({ name: sheetName, data });
      setDiscoveredGroups(groups);
      setSelectedIds(new Set(groups.map(g => g.id)));
      setProgress(100);

      addNotification({ title: "Discovery Complete", description: `Identified ${groups.length} structural groups in sheet.` });

      setTimeout(() => {
        setIsProcessing(false);
        setCurrentStep('STRUCTURE');
      }, 800);

    } catch (error) {
      addNotification({ title: "Ingestion Error", description: "Workbook pulse was non-deterministic.", variant: "destructive" });
      setCurrentStep('INGEST');
    }
  };

  const handleExecuteImport = async () => {
    if (!engineRef.current || selectedGroupIds.size === 0 || !activeSheetData) return;
    
    setIsProcessing(true);
    addNotification({ title: "Mapping Pulse", description: `Processing ${selectedGroupIds.size} selected blocks...` });
    setProgress(50);

    try {
      const selectedGroups = discoveredGroups.filter(g => selectedGroupIds.has(g.id));
      const results = engineRef.current!.ingestGroups(activeSheetData.name, activeSheetData.data, selectedGroups);
      
      const allStaged = results.flatMap(c => c.assets);

      setSummary({
        workbookName: engineRef.current['workbookName'],
        sheetName: activeSheetData.name,
        profileId: 'CONTROLLED_V6',
        totalRows: activeSheetData.data.length,
        groupCount: results.length,
        dataRowsImported: allStaged.length,
        rowsRejected: 0,
        duplicatesDetected: 0,
        templatesDiscovered: selectedGroupIds.size,
        sectionBreakdown: {},
        groups: results
      });

      setStagedAssets(allStaged);
      await storage.saveToSandbox(allStaged as any[]);
      
      setProgress(100);
      addNotification({ title: "Sandbox Ready", description: `Staged ${allStaged.length} records for reconciliation.`, variant: "success" });
      setTimeout(() => {
        setIsProcessing(false);
        setCurrentStep('RECONCILE');
      }, 500);
    } catch (e) {
      addNotification({ title: "Mapping Interrupted", description: "Structural alignment failed.", variant: "destructive" });
      setIsProcessing(false);
    }
  };

  const handleCommitToRegistry = async () => {
    if (!activeGrantId || !appSettings) {
      addNotification({ title: "Governance Lock", description: "Select an active project first.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    addNotification({ title: "Merging Registry", description: "Committing staged records to central register..." });
    try {
      for (const asset of stagedAssets) {
        const assetWithGrant = { ...asset, grantId: activeGrantId };
        await enqueueMutation('CREATE', 'assets', assetWithGrant);
      }

      const current = await storage.getAssets();
      const validAssets = stagedAssets.map(a => ({ ...a, grantId: activeGrantId }));
      await storage.saveAssets([...validAssets, ...current]);
      
      const newCategories = Array.from(new Set(validAssets.map(a => a.category)));
      const nextEnabledSheets = Array.from(new Set([...appSettings.enabledSheets, ...newCategories]));
      
      const nextSettings = { ...appSettings, enabledSheets: nextEnabledSheets };
      await storage.saveSettings(nextSettings);
      if (isOnline) await FirestoreService.updateSettings({ enabledSheets: nextEnabledSheets });
      setAppSettings(nextSettings);

      await storage.clearSandbox();
      
      addNotification({ title: "Merge Complete", description: `${validAssets.length} records pushed to registry.`, variant: "success" });
      setDataSource('PRODUCTION');
      await refreshRegistry();
      setCurrentStep('SUMMARY');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase flex items-center gap-4 leading-none">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <DatabaseZap className="h-8 w-8 text-primary" />
            </div>
            Single-Sheet Registry Import
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
            Group Discovery & Internal Block Ingestion
          </p>
        </div>
        {currentStep !== 'INGEST' && currentStep !== 'SUMMARY' && (
          <Button variant="outline" onClick={() => { engineRef.current = null; setCurrentStep('INGEST'); }} className="h-12 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest text-destructive hover:bg-destructive/10 border-2">
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Discard Pulse
          </Button>
        )}
      </div>

      <div className="px-2">
        <AnimatePresence mode="wait">
          {currentStep === 'INGEST' && (
            <motion.div key="ingest" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card 
                className="border-4 border-dashed border-white/5 bg-white/[0.02] hover:border-primary/40 rounded-[3rem] p-16 flex flex-col items-center justify-center text-center h-[450px] cursor-pointer group" 
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx,.xls" />
                <div className="p-10 bg-primary/10 rounded-full mb-8 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                  <FileSpreadsheet className="h-16 w-16 text-primary" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-black uppercase text-white tracking-tight">Ingest Primary Sheet</h3>
                  <p className="text-sm font-medium text-white/40 max-w-sm mx-auto italic leading-relaxed">
                    The structural engine traverses the first sheet to identify all internal group boundaries in Column A.
                  </p>
                </div>
                <Button className="h-16 px-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 mt-10 transition-all hover:-translate-y-1">
                  Initialize Group Discovery
                </Button>
              </Card>
            </motion.div>
          )}

          {currentStep === 'SCANNING' && (
            <div className="flex flex-col items-center justify-center py-32 text-center space-y-10">
              <div className="p-16 bg-primary/10 rounded-[3rem] animate-pulse border border-primary/5">
                <ScanSearch className="h-20 w-20 text-primary" />
              </div>
              <div className="space-y-4 max-w-sm">
                <h3 className="text-2xl font-black uppercase tracking-widest text-white">Discovering Internal Groups</h3>
                <div className="space-y-2">
                  <Progress value={progress} className="h-2 rounded-full" />
                  <span className="text-[9px] font-mono font-bold text-primary">{progress}% COMPLETE</span>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'STRUCTURE' && (
            <motion.div key="structure" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
              <StructurePreview groups={discoveredGroups} selectedIds={selectedGroupIds} onToggleId={(id) => {
                const next = new Set(selectedGroupIds);
                if (next.has(id)) next.delete(id); else next.add(id);
                setSelectedIds(next);
              }} onSelectAll={(c) => setSelectedIds(c ? new Set(discoveredGroups.map(g => g.id)) : new Set())} />
              
              <div className="p-10 rounded-[3rem] bg-white/[0.02] border-2 border-dashed border-white/10 flex flex-col md:flex-row items-center justify-between gap-8 group hover:border-primary/20 transition-all shadow-3xl">
                <div className="flex items-start gap-6 max-w-xl">
                  <div className="p-4 bg-primary/10 rounded-2xl"><Layers className="h-8 w-8 text-primary" /></div>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-black uppercase tracking-tight text-white leading-none">Map Internal Groups?</h4>
                    <p className="text-sm font-medium text-white/40 italic leading-relaxed">Preparing to import {selectedGroupIds.size} structural sections found in the primary sheet.</p>
                  </div>
                </div>
                <Button 
                  onClick={handleExecuteImport}
                  disabled={selectedGroupIds.size === 0}
                  className="h-20 px-12 rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-primary/30 gap-4 transition-transform hover:scale-105 active:scale-95"
                >
                  <Zap className="h-6 w-6" /> Start Group Mapping <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 'RECONCILE' && (
            <motion.div key="reconcile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
              <ReconciliationView assets={stagedAssets as any} summary={runSummary!} />
              
              <div className="p-10 rounded-[3rem] bg-primary/5 border-2 border-dashed border-primary/20 flex flex-col md:flex-row items-center justify-between gap-8 group hover:border-primary/40 transition-all shadow-3xl">
                <div className="space-y-2 max-w-xl">
                  <h4 className="text-2xl font-black uppercase tracking-tight text-white leading-none">Commit to Registry?</h4>
                  <p className="text-sm font-medium text-white/40 italic leading-relaxed">Review the mapping metrics for each group above before merging with the central database.</p>
                </div>
                <Button 
                  onClick={handleCommitToRegistry}
                  disabled={isProcessing}
                  className="h-20 px-12 rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-primary/30 gap-4 transition-transform hover:scale-105 active:scale-95 bg-primary text-black"
                >
                  {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <DatabaseZap className="h-6 w-6" />}
                  Merge Internal Records
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 'SUMMARY' && (
            <motion.div 
              key="summary" 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="flex flex-col items-center justify-center py-20 text-center space-y-10"
            >
              <div className="p-16 bg-green-500/10 rounded-[4rem] text-green-600 shadow-inner border border-green-500/20">
                <CheckCircle2 className="h-24 w-20" />
              </div>
              <div className="space-y-4 max-w-lg">
                <h3 className="text-4xl font-black uppercase text-white tracking-tighter leading-none">Internal Merge Complete</h3>
                <p className="text-sm font-medium text-white/40 italic leading-relaxed">
                  The {stagedAssets.length} records from the discovered groups have been successfully integrated.
                </p>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setCurrentStep('INGEST')} className="h-16 px-10 rounded-2xl font-black uppercase text-xs border-2">Process New File</Button>
                <Button onClick={() => setActiveView('REGISTRY')} className="h-16 px-12 rounded-2xl font-black uppercase text-xs tracking-widest bg-primary text-black shadow-2xl shadow-primary/20">
                  View Group Inventory
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
