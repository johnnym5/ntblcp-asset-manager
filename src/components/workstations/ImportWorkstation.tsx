'use client';

/**
 * @fileOverview ImportWorkstation - Controlled Registry Ingestion.
 * Phase 300: Overhauled to use the High-Fidelity Structural Parser Engine.
 */

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Zap
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ParserEngine } from '@/parser/engine';
import { storage } from '@/offline/storage';
import { enqueueMutation } from '@/offline/queue';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import * as XLSX from 'xlsx';
import type { ParsedAsset, ImportRunSummary, DiscoveredGroup, GroupImportContainer } from '@/parser/types';
import { motion, AnimatePresence } from 'framer-motion';
import { StructurePreview } from '@/modules/import/components/StructurePreview';
import { ReconciliationView } from '@/modules/import/components/ReconciliationView';

type ImportStep = 'INGEST' | 'SCANNING' | 'STRUCTURE' | 'RECONCILE' | 'SUMMARY';

export function ImportWorkstation() {
  const { toast } = useToast();
  const { assets: existingAssets, refreshRegistry, activeGrantId, setDataSource, setActiveView } = useAppState();
  const { userProfile } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<ImportStep>('INGEST');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stagedAssets, setStagedAssets] = useState<ParsedAsset[]>([]);
  const [discoveredGroups, setDiscoveredGroups] = useState<DiscoveredGroup[]>([]);
  const [selectedGroupIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [runSummary, setSummary] = useState<ImportRunSummary | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeSheetData, setActiveSheetData] = useState<{name: string, data: any[][]}[]>([]);
  
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
      setProgress(40);

      engineRef.current = new ParserEngine(file.name, existingAssets);
      let allDiscoveredGroups: DiscoveredGroup[] = [];
      const sheets: {name: string, data: any[][]}[] = [];

      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
        sheets.push({ name: sheetName, data });
        const groups = engineRef.current!.discoverGroups(sheetName, data);
        allDiscoveredGroups = [...allDiscoveredGroups, ...groups];
      });

      setActiveSheetData(sheets);
      setDiscoveredGroups(allDiscoveredGroups);
      // Auto-select all discovered groups by default
      setSelectedIds(new Set(allDiscoveredGroups.map(g => g.id)));
      setProgress(100);

      setTimeout(() => {
        setIsProcessing(false);
        setCurrentStep('STRUCTURE');
      }, 800);

    } catch (error) {
      toast({ variant: "destructive", title: "Import Failure", description: "Workbook pulse was non-deterministic." });
      setCurrentStep('INGEST');
    }
  };

  const handleExecuteImport = async () => {
    if (!engineRef.current || selectedGroupIds.size === 0) return;
    
    setIsProcessing(true);
    setProgress(0);

    try {
      let allStaged: ParsedAsset[] = [];
      const containers: GroupImportContainer[] = [];

      const selectedGroups = discoveredGroups.filter(g => selectedGroupIds.has(g.id));

      activeSheetData.forEach((sheet, idx) => {
        const sheetGroups = selectedGroups.filter(g => g.sheetName === sheet.name);
        if (sheetGroups.length > 0) {
          const results = engineRef.current!.ingestGroups(sheet.name, sheet.data, sheetGroups);
          containers.push(...results);
          allStaged = [...allStaged, ...results.flatMap(c => c.assets)];
        }
        setProgress(Math.round(((idx + 1) / activeSheetData.length) * 100));
      });

      setSummary({
        workbookName: engineRef.current['workbookName'],
        sheetName: 'BATCH_IMPORT',
        profileId: 'CONTROLLED_V5',
        totalRows: activeSheetData.reduce((s, d) => s + d.data.length, 0),
        groupCount: containers.length,
        dataRowsImported: allStaged.length,
        rowsRejected: 0,
        duplicatesDetected: 0,
        templatesDiscovered: selectedGroupIds.size,
        sectionBreakdown: {},
        groups: containers
      });

      setStagedAssets(allStaged);
      await storage.saveToSandbox(allStaged as any[]);
      
      setTimeout(() => {
        setIsProcessing(false);
        setCurrentStep('RECONCILE');
      }, 500);
    } catch (e) {
      toast({ variant: "destructive", title: "Ingestion Interrupted" });
      setIsProcessing(false);
    }
  };

  const handleCommitToRegistry = async () => {
    if (!activeGrantId) {
      toast({ variant: "destructive", title: "Project Required", description: "Select an active project in settings." });
      return;
    }

    setIsProcessing(true);
    try {
      for (const asset of stagedAssets) {
        const assetWithGrant = { ...asset, grantId: activeGrantId };
        await enqueueMutation('CREATE', 'assets', assetWithGrant);
      }

      const current = await storage.getAssets();
      const validAssets = stagedAssets.map(a => ({ ...a, grantId: activeGrantId }));
      await storage.saveAssets([...validAssets, ...current]);
      await storage.clearSandbox();
      
      toast({ title: "Merge Complete", description: `${validAssets.length} records pushed to registry.` });
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
            Registry Ingestion
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
            Structural Discovery & Controlled Data Merge
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
                  <h3 className="text-3xl font-black uppercase text-white tracking-tight">Ingest Registry Workbook</h3>
                  <p className="text-sm font-medium text-white/40 max-w-sm mx-auto italic leading-relaxed">
                    The structural engine scans Column A to discover section headers and build repeating templates per group.
                  </p>
                </div>
                <Button className="h-16 px-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 mt-10 transition-all hover:-translate-y-1">
                  Initialize Discovery Pulse
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
                <h3 className="text-2xl font-black uppercase tracking-widest text-white">Structural Discovery</h3>
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
                  <div className="p-4 bg-primary/10 rounded-2xl"><ShieldCheck className="h-8 w-8 text-primary" /></div>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-black uppercase tracking-tight text-white leading-none">Execute Ingestion?</h4>
                    <p className="text-sm font-medium text-white/40 italic leading-relaxed">Importing {selectedGroupIds.size} selected groups using strict positional mapping.</p>
                  </div>
                </div>
                <Button 
                  onClick={handleExecuteImport}
                  disabled={selectedGroupIds.size === 0}
                  className="h-20 px-12 rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-primary/30 gap-4 transition-transform hover:scale-105 active:scale-95"
                >
                  <Zap className="h-6 w-6" /> Start Ingestion <ChevronRight className="h-6 w-6" />
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
                  <p className="text-sm font-medium text-white/40 italic leading-relaxed">Successfully mapped {stagedAssets.length} valid records. Review the group summaries above before merging.</p>
                </div>
                <Button 
                  onClick={handleCommitToRegistry}
                  disabled={isProcessing}
                  className="h-20 px-12 rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-primary/30 gap-4 transition-transform hover:scale-105 active:scale-95 bg-primary text-black"
                >
                  {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <DatabaseZap className="h-6 w-6" />}
                  Merge Staged Records
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
                <h3 className="text-4xl font-black uppercase text-white tracking-tighter leading-none">Merge Complete</h3>
                <p className="text-sm font-medium text-white/40 italic leading-relaxed">
                  Successfully integrated {stagedAssets.length} records into the active register.
                </p>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setCurrentStep('INGEST')} className="h-16 px-10 rounded-2xl font-black uppercase text-xs border-2">Import Another</Button>
                <Button onClick={() => setActiveView('REGISTRY')} className="h-16 px-12 rounded-2xl font-black uppercase text-xs tracking-widest bg-primary text-black shadow-2xl shadow-primary/20">
                  View Registry
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
