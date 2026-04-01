'use client';

/**
 * @fileOverview ImportWorkstation - Data Import Center.
 * Phase 185: Integrated Template Visualization Layer for structural verification.
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
  Layers,
  FileSpreadsheet,
  AlertTriangle,
  Info,
  Database
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ParserEngine } from '@/parser/engine';
import { storage } from '@/offline/storage';
import { enqueueMutation } from '@/offline/queue';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import * as XLSX from 'xlsx';
import type { ParsedAsset, ImportRunSummary, DiscoveredGroup } from '@/parser/types';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ReconciliationView } from '@/modules/import/components/ReconciliationView';
import { StructurePreview } from '@/modules/import/components/StructurePreview';

type ImportStep = 'INGEST' | 'PROCESSING' | 'STRUCTURE' | 'PREVIEW' | 'SUMMARY';

export function ImportWorkstation() {
  const { toast } = useToast();
  const { assets: existingAssets, refreshRegistry, activeGrantId, setDataSource, setActiveView } = useAppState();
  const { userProfile } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<ImportStep>('INGEST');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stagedAssets, setStagedAssets] = useState<ParsedAsset[]>([]);
  const [discoveredGroups, setDiscoveredGroups] = useState<DiscoveredGroup[]>([]);
  const [runSummary, setSummary] = useState<ImportRunSummary | null>(null);
  const [progress, setProgress] = useState(0);
  const [sheetCount, setSheetCount] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCurrentStep('PROCESSING');
    setIsProcessing(true);
    setProgress(10);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      setSheetCount(workbook.SheetNames.length);
      setProgress(40);

      const engine = new ParserEngine(file.name, existingAssets);
      let allParsedAssets: ParsedAsset[] = [];
      let allDiscoveredGroups: DiscoveredGroup[] = [];
      let finalSummary: ImportRunSummary | null = null;

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
        
        const result = engine.parseWorkbook(sheetName, data);
        allParsedAssets = [...allParsedAssets, ...result.assets];
        allDiscoveredGroups = [...allDiscoveredGroups, ...result.groups];
        
        if (!finalSummary) {
          finalSummary = result.summary;
        } else {
          finalSummary.dataRowsImported += result.summary.dataRowsImported;
          finalSummary.templatesDiscovered += result.summary.templatesDiscovered;
          finalSummary.groupCount += result.summary.groupCount;
          finalSummary.duplicatesDetected += result.summary.duplicatesDetected;
        }
      }
      
      await storage.saveToSandbox(allParsedAssets as any[]);
      setStagedAssets(allParsedAssets);
      setDiscoveredGroups(allDiscoveredGroups);
      setSummary(finalSummary);
      setProgress(100);

      setTimeout(() => {
        setIsProcessing(false);
        setCurrentStep('STRUCTURE');
      }, 800);

    } catch (error) {
      console.error("Import error:", error);
      toast({ variant: "destructive", title: "Import Failure" });
      setCurrentStep('INGEST');
    }
  };

  const handleCommit = async () => {
    if (!activeGrantId) {
      toast({ variant: "destructive", title: "Project Required" });
      return;
    }

    setIsProcessing(true);
    try {
      for (const asset of stagedAssets) {
        const assetWithGrant = { ...asset, grantId: activeGrantId };
        await enqueueMutation('CREATE', 'assets', assetWithGrant);
      }
      const current = await storage.getAssets();
      await storage.saveAssets([...stagedAssets.map(a => ({ ...a, grantId: activeGrantId })), ...current]);
      await storage.clearSandbox();
      
      toast({ title: "Registration Successful" });
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
            Data Import Center
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
            Structural Ingestion & Asset Register Engineering
          </p>
        </div>
        {currentStep !== 'INGEST' && (
          <Button variant="outline" onClick={() => { setCurrentStep('INGEST'); storage.clearSandbox(); }} className="h-12 px-6 rounded-xl font-black uppercase text-[9px] border-2 border-white/5 hover:bg-white/5 text-white">
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Discard Pulse
          </Button>
        )}
      </div>

      <div className="px-2">
        <AnimatePresence mode="wait">
          {currentStep === 'INGEST' && (
            <motion.div key="ingest" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-4 border-dashed border-white/5 bg-white/[0.02] hover:border-primary/40 rounded-[3rem] p-16 flex flex-col items-center justify-center text-center h-[450px] cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx,.xls" />
                <div className="p-10 bg-primary/10 rounded-full mb-8 group-hover:scale-110 transition-transform duration-500">
                  <FileSpreadsheet className="h-16 w-16 text-primary" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-black uppercase text-white tracking-tight">Ingest Registry Workbook</h3>
                  <p className="text-sm font-medium text-white/40 max-w-sm mx-auto italic">Traverse hierarchical Excel registers. Engine detects sections and header sets from Column A.</p>
                </div>
                <Button className="h-16 px-12 rounded-2xl font-black uppercase text-xs mt-10 bg-primary text-black">Select Workbook</Button>
              </Card>
            </motion.div>
          )}

          {currentStep === 'PROCESSING' && (
            <div className="flex flex-col items-center justify-center py-32 text-center space-y-10">
              <div className="p-16 bg-primary/10 rounded-[3rem] animate-pulse"><ScanSearch className="h-20 w-20 text-primary" /></div>
              <div className="space-y-4 max-w-sm w-full">
                <h3 className="text-2xl font-black uppercase tracking-widest text-white">Discovering Hierarchy</h3>
                <Progress value={progress} className="h-2 rounded-full" />
              </div>
            </div>
          )}

          {currentStep === 'STRUCTURE' && (
            <motion.div key="structure" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
              <StructurePreview groups={discoveredGroups} />
              <div className="p-10 rounded-[3rem] bg-white/[0.02] border-2 border-dashed border-white/10 flex flex-col md:flex-row items-center justify-between gap-8">
                <p className="text-sm font-medium text-white/40 italic leading-relaxed max-w-xl">
                  Structure Pulse: Verify that all sections and their respective column headers have been correctly identified. If accurate, proceed to record preview.
                </p>
                <Button 
                  onClick={() => setCurrentStep('PREVIEW')}
                  className="h-20 px-12 rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl bg-primary text-black gap-4 transition-transform hover:scale-105 active:scale-95 min-w-[280px]"
                >
                  Proceed to Records <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 'PREVIEW' && (
            <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
              <ReconciliationView assets={stagedAssets as any} />
              <div className="p-10 rounded-[3rem] bg-primary/5 border-2 border-dashed border-primary/20 flex flex-col md:flex-row items-center justify-between gap-8 group hover:border-primary/40 transition-all">
                <div className="flex items-start gap-6 max-w-xl">
                  <div className="p-4 bg-primary rounded-2xl shadow-xl shadow-primary/20"><ShieldCheck className="h-8 w-8 text-black" /></div>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-black uppercase tracking-tight text-white leading-none">Confirm Registry Merge?</h4>
                    <p className="text-sm font-medium text-white/40 italic leading-relaxed">Structural mapping complete. {stagedAssets.length} records ready for integration.</p>
                  </div>
                </div>
                <Button 
                  onClick={handleCommit}
                  disabled={isProcessing}
                  className="h-20 px-12 rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-primary/30 gap-4 transition-transform hover:scale-105 active:scale-95 bg-primary text-black min-w-[280px]"
                >
                  {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <DatabaseZap className="h-6 w-6" />}
                  Execute Merge Pulse
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 'SUMMARY' && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-10">
              <div className="p-16 bg-green-500/10 rounded-[4rem] text-green-600 animate-in zoom-in duration-700"><CheckCircle2 className="h-24 w-20" /></div>
              <div className="space-y-4 max-w-lg">
                <h3 className="text-4xl font-black uppercase text-white tracking-tighter">Registration Complete</h3>
                <p className="text-sm font-medium text-white/40 italic">{runSummary?.dataRowsImported} records integrated from {sheetCount} sheets.</p>
              </div>
              <Button onClick={() => setActiveView('REGISTRY')} className="h-16 px-12 rounded-2xl font-black uppercase text-xs tracking-widest bg-primary text-black">View Register</Button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
