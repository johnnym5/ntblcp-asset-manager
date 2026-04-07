'use client';

/**
 * @fileOverview ImportWorkstation - Controlled Asset Ingestion.
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
        duplicatesDetected: 0,
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
    if (!activeGrantId || !appSettings) {
      addNotification({ title: "No Active Project", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const validAssets = stagedAssets.filter(a => !a.validation.isRejected);
      const validAssetsWithGrant = validAssets.map(a => ({ ...a, grantId: activeGrantId }));
      
      for (const asset of validAssetsWithGrant) {
        await enqueueMutation('CREATE', 'assets', asset);
      }

      const currentLocal = await storage.getAssets();
      await storage.saveAssets([...validAssetsWithGrant, ...currentLocal]);
      
      const newCategories = Array.from(new Set(validAssetsWithGrant.map(a => a.category)));
      const activeGrant = appSettings.grants.find(g => g.id === activeGrantId);
      
      if (activeGrant) {
        const nextEnabledSheets = Array.from(new Set([...(appSettings.enabledSheets || []), ...newCategories]));
        const updatedSettings = { ...appSettings, enabledSheets: nextEnabledSheets };
        await storage.saveSettings(updatedSettings);
        if (isOnline) await FirestoreService.updateSettings(updatedSettings);
        setAppSettings(updatedSettings);
      }

      await storage.clearSandbox();
      addNotification({ title: "Assets Imported", variant: "success" });
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
            <div className="p-3 bg-primary/10 rounded-2xl"><FileUp className="h-8 w-8 text-primary" /></div>
            Import Assets
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">Excel Workbook Processing</p>
        </div>
        {currentStep !== 'INGEST' && currentStep !== 'SUMMARY' && (
          <Button variant="outline" onClick={() => setCurrentStep('INGEST')} className="h-12 px-6 rounded-xl font-black uppercase text-[9px] text-destructive border-2"><Trash2 className="mr-2 h-3.5 w-3.5" /> Discard</Button>
        )}
      </div>

      <div className="px-2">
        <AnimatePresence mode="wait">
          {currentStep === 'INGEST' && (
            <motion.div key="ingest" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-4 border-dashed border-white/5 bg-white/[0.02] hover:border-primary/40 rounded-[3rem] p-16 flex flex-col items-center justify-center text-center h-[450px] cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx,.xls" />
                <div className="p-10 bg-primary/10 rounded-full mb-8 group-hover:scale-110 transition-all shadow-inner"><FileSpreadsheet className="h-16 w-16 text-primary" /></div>
                <h3 className="text-3xl font-black uppercase text-white tracking-tight">Upload File</h3>
                <p className="text-sm font-medium text-white/40 max-w-sm mx-auto italic leading-relaxed mt-4">Select an Excel file to scan for new asset records.</p>
                <Button className="h-16 px-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl mt-10">Choose File</Button>
              </Card>
            </motion.div>
          )}

          {currentStep === 'SCANNING' && (
            <div className="flex flex-col items-center justify-center py-32 space-y-10">
              <div className="p-16 bg-primary/10 rounded-[3rem] animate-pulse"><ScanSearch className="h-20 w-20 text-primary" /></div>
              <div className="space-y-4 max-w-sm text-center">
                <h3 className="text-2xl font-black uppercase tracking-widest text-white">Scanning Rows</h3>
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
                    <h4 className="text-2xl font-black uppercase tracking-tight text-white">Import Selected?</h4>
                    <p className="text-sm font-medium text-white/40 italic">Reviewing {selectedGroupIds.size} folders for import.</p>
                  </div>
                </div>
                <Button onClick={handleExecuteImport} disabled={selectedGroupIds.size === 0} className="h-20 px-12 rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-primary/30 gap-4 transition-all">Continue Import <ChevronRight className="h-6 w-6" /></Button>
              </div>
            </motion.div>
          )}

          {currentStep === 'RECONCILE' && (
            <motion.div key="reconcile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
              <ReconciliationView assets={stagedAssets as any} summary={runSummary!} />
              <div className="p-10 rounded-[3rem] bg-primary/5 border-2 border-dashed border-primary/20 flex flex-col md:flex-row items-center justify-between gap-8 shadow-3xl">
                <Button onClick={handleCommitToRegistry} disabled={isProcessing} className="h-20 w-full rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl bg-primary text-black">
                  {isProcessing ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <ShieldCheck className="h-6 w-6 mr-2" />} 
                  Add to Asset List
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 'SUMMARY' && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-10">
              <div className="p-16 bg-green-500/10 rounded-[4rem] text-green-600 border border-green-500/20"><CheckCircle2 className="h-24 w-20" /></div>
              <h3 className="text-4xl font-black uppercase text-white">Import Successful</h3>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setCurrentStep('INGEST')} className="h-16 px-10 rounded-2xl font-black uppercase text-xs">Import More</Button>
                <Button onClick={() => setActiveView('REGISTRY')} className="h-16 px-12 rounded-2xl font-black uppercase text-xs bg-primary text-black">Browse Assets</Button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
