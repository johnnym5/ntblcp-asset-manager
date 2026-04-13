'use client';

/**
 * @fileOverview ImportWorkstation - Controlled Asset Ingestion & Review.
 * Phase 1007: Implemented Choice-Based Conflict Resolution (Skip vs Overwrite).
 * Phase 1008: Fixed activeGrantId resolution logic to prevent 'nothing happening' on apply.
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
  Layers,
  ArrowRightLeft,
  XCircle,
  CopyCheck
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
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
import { cn } from '@/lib/utils';

type ImportStep = 'INGEST' | 'SCANNING' | 'STRUCTURE' | 'RECONCILE' | 'SUMMARY';
type MergeStrategy = 'SKIP_EXISTING' | 'OVERWRITE_EXISTING';

export function ImportWorkstation() {
  const { 
    assets: existingAssets, 
    refreshRegistry, 
    activeGrantIds, // Use the array from context
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
  
  // Conflict Strategy State
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('SKIP_EXISTING');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<ParserEngine | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCurrentStep('SCANNING');
    setIsProcessing(true);
    setProgress(10);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
      
      engineRef.current = new ParserEngine(file.name, existingAssets);
      const groups = engineRef.current!.discoverGroups(sheetName, data);

      setActiveSheetData({ name: sheetName, data });
      setDiscoveredGroups(groups);
      setSelectedIds(new Set(groups.map(g => g.id)));
      setProgress(100);

      setTimeout(() => {
        setIsProcessing(false);
        setCurrentStep('STRUCTURE');
      }, 800);
    } catch (error) {
      addNotification({ title: "Scanning Error", variant: "destructive" });
      setCurrentStep('INGEST');
    }
  };

  const handleExecuteImport = async () => {
    if (!engineRef.current || selectedGroupIds.size === 0 || !activeSheetData) return;
    
    setIsProcessing(true);
    setProgress(50);

    try {
      const selectedGroups = discoveredGroups.filter(g => selectedGroupIds.has(g.id));
      const results = engineRef.current!.ingestGroups(activeSheetData.name, activeSheetData.data, selectedGroups);
      const allStaged = results.flatMap(c => c.assets);

      setSummary({
        workbookName: engineRef.current['workbookName'],
        sheetName: activeSheetData.name,
        profileId: 'PRO_V10',
        totalRows: activeSheetData.data.length,
        groupCount: results.length,
        dataRowsImported: allStaged.filter(a => !a.validation.isRejected).length,
        rowsRejected: allStaged.filter(a => a.validation.isRejected).length,
        duplicatesDetected: allStaged.filter(a => a.validation.isUpdate).length,
        templatesDiscovered: selectedGroupIds.size,
        sectionBreakdown: {},
        groups: results
      });

      setStagedAssets(allStaged);
      await storage.saveToSandbox(allStaged as any[]);
      setIsProcessing(false);
      setCurrentStep('RECONCILE');
    } catch (e) {
      addNotification({ title: "Import Failed", variant: "destructive" });
      setIsProcessing(false);
    }
  };

  const handleCommitToRegistry = async () => {
    const targetGrantId = activeGrantIds[0]; // Determine target project
    
    if (!targetGrantId || !appSettings) {
      addNotification({ 
        title: "No Project Selected", 
        description: "Please enable at least one project in Settings first.",
        variant: "destructive" 
      });
      return;
    }

    setIsProcessing(true);
    try {
      const validAssets = stagedAssets.filter(a => !a.validation.isRejected);
      
      // Filter based on strategy
      const assetsToProcess = validAssets.filter(a => {
        if (!a.validation.isUpdate) return true; // Always include new items
        return mergeStrategy === 'OVERWRITE_EXISTING'; // Only include updates if strategy is OVERWRITE
      });

      if (assetsToProcess.length === 0) {
        addNotification({ title: "No changes to apply", description: "All records were skipped based on your strategy." });
        setCurrentStep('SUMMARY');
        return;
      }

      for (const asset of assetsToProcess) {
        const finalAsset = { 
          ...asset, 
          grantId: targetGrantId,
          // If it's an update, use the existing ID to overwrite the record
          ...(asset.validation.isUpdate && { id: asset.validation.existingAssetId })
        };
        const op = asset.validation.isUpdate ? 'UPDATE' : 'CREATE';
        await enqueueMutation(op, 'assets', finalAsset);
      }

      await storage.clearSandbox();
      addNotification({ 
        title: "Registry Synchronized", 
        description: `Successfully processed ${assetsToProcess.length} records.`,
        variant: "success" 
      });
      
      await refreshRegistry();
      setCurrentStep('SUMMARY');
    } finally {
      setIsProcessing(false);
    }
  };

  const updatesCount = stagedAssets.filter(a => a.validation.isUpdate && !a.validation.isRejected).length;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase flex items-center gap-4 leading-none">
            <div className="p-3 bg-primary/10 rounded-2xl"><FileUp className="h-8 w-8 text-primary" /></div>
            Import Assets
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">Registry Ingestion System</p>
        </div>
        {currentStep !== 'INGEST' && currentStep !== 'SUMMARY' && (
          <Button variant="outline" onClick={() => setCurrentStep('INGEST')} className="h-12 px-6 rounded-xl font-black uppercase text-[9px] text-destructive border-2"><Trash2 className="mr-2 h-3.5 w-3.5" /> Discard Batch</Button>
        )}
      </div>

      <div className="px-2">
        <AnimatePresence mode="wait">
          {currentStep === 'INGEST' && (
            <motion.div key="ingest" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-4 border-dashed border-white/5 bg-white/[0.02] hover:border-primary/40 rounded-[3rem] p-16 flex flex-col items-center justify-center text-center h-[450px] cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx,.xls" />
                <div className="p-10 bg-primary/10 rounded-full mb-8 group-hover:scale-110 transition-all shadow-inner"><FileSpreadsheet className="h-16 w-16 text-primary" /></div>
                <h3 className="text-3xl font-black uppercase text-white tracking-tight">Select Workbook</h3>
                <p className="text-sm font-medium text-white/40 max-w-sm mx-auto italic leading-relaxed mt-4">The system will automatically scan for duplicates against your current records.</p>
                <Button className="h-16 px-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl mt-10">Choose File</Button>
              </Card>
            </motion.div>
          )}

          {currentStep === 'SCANNING' && (
            <div className="flex flex-col items-center justify-center py-32 space-y-10">
              <div className="p-16 bg-primary/10 rounded-[3rem] animate-pulse"><ScanSearch className="h-20 w-20 text-primary" /></div>
              <div className="space-y-4 max-w-sm text-center">
                <h3 className="text-2xl font-black uppercase tracking-widest text-white">Traversing Registry</h3>
                <Progress value={progress} className="h-2 rounded-full" />
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
              <div className="p-10 rounded-[3rem] bg-white/[0.02] border-2 border-dashed border-white/10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-3xl">
                <div className="flex items-start gap-6 max-w-xl">
                  <div className="p-4 bg-primary/10 rounded-2xl"><Layers className="h-8 w-8 text-primary" /></div>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-black uppercase tracking-tight text-white">Identify Data Blocks?</h4>
                    <p className="text-sm font-medium text-white/40 italic">Reviewing {selectedGroupIds.size} structural folders for ingestion.</p>
                  </div>
                </div>
                <Button onClick={handleExecuteImport} disabled={selectedGroupIds.size === 0} className="h-20 px-12 rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-primary/30 gap-4 transition-all">Continue Discovery <ChevronRight className="h-6 w-6" /></Button>
              </div>
            </motion.div>
          )}

          {currentStep === 'RECONCILE' && (
            <motion.div key="reconcile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
              <ReconciliationView assets={stagedAssets as any} summary={runSummary!} />
              
              {/* Conflict Strategy Controller */}
              <div className="p-10 rounded-[3rem] bg-[#0A0A0A] border-2 border-primary/20 space-y-10 shadow-3xl">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-2xl font-black uppercase tracking-tight text-white">Conflict Resolution</h4>
                    <p className="text-sm font-medium text-white/40 italic">How should the system handle {updatesCount} existing records?</p>
                  </div>
                  <Badge className="bg-primary text-black font-black uppercase text-[10px] h-8 px-4 rounded-full">ACTION REQUIRED</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button 
                    onClick={() => setMergeStrategy('SKIP_EXISTING')}
                    className={cn(
                      "p-8 rounded-[2rem] border-2 transition-all flex items-start gap-6 text-left group",
                      mergeStrategy === 'SKIP_EXISTING' ? "bg-primary/5 border-primary shadow-xl" : "bg-black border-white/5 opacity-40 hover:opacity-100"
                    )}
                  >
                    <div className={cn("p-4 rounded-2xl", mergeStrategy === 'SKIP_EXISTING' ? "bg-primary text-black" : "bg-muted")}>
                      <XCircle className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <h5 className={cn("text-lg font-black uppercase", mergeStrategy === 'SKIP_EXISTING' ? "text-primary" : "text-white")}>Skip Existing</h5>
                      <p className="text-xs font-medium text-white/60 leading-relaxed italic">Only add truly new assets. Current database records will remain unchanged.</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setMergeStrategy('OVERWRITE_EXISTING')}
                    className={cn(
                      "p-8 rounded-[2rem] border-2 transition-all flex items-start gap-6 text-left group",
                      mergeStrategy === 'OVERWRITE_EXISTING' ? "bg-primary/5 border-primary shadow-xl" : "bg-black border-white/5 opacity-40 hover:opacity-100"
                    )}
                  >
                    <div className={cn("p-4 rounded-2xl", mergeStrategy === 'OVERWRITE_EXISTING' ? "bg-primary text-black" : "bg-muted")}>
                      <CopyCheck className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <h5 className={cn("text-lg font-black uppercase", mergeStrategy === 'OVERWRITE_EXISTING' ? "text-primary" : "text-white")}>Overwrite Existing</h5>
                      <p className="text-xs font-medium text-white/60 leading-relaxed italic">Update your current records with fresh data from the Excel file.</p>
                    </div>
                  </button>
                </div>

                <Button onClick={handleCommitToRegistry} disabled={isProcessing} className="h-20 w-full rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl bg-primary text-black gap-4 group">
                  {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="h-6 w-6" />} 
                  Apply {mergeStrategy === 'SKIP_EXISTING' ? 'New Records Only' : 'Full Synchronization'}
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 'SUMMARY' && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-10">
              <div className="p-16 bg-green-500/10 rounded-[4rem] text-green-600 border border-green-500/20"><CheckCircle2 className="h-24 w-20" /></div>
              <div className="space-y-2">
                <h3 className="text-4xl font-black uppercase text-white">Import Complete</h3>
                <p className="text-sm font-medium text-white/40 italic">Registry state updated deterministically.</p>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setCurrentStep('INGEST')} className="h-16 px-10 rounded-2xl font-black uppercase text-xs border-2">Process More</Button>
                <Button onClick={() => setActiveView('REGISTRY')} className="h-16 px-12 rounded-2xl font-black uppercase text-xs bg-primary text-black">Open Registry</Button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
