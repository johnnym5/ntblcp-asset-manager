'use client';

/**
 * @fileOverview ImportWorkstation - Data Import Center.
 * Phase 180: Upgraded with high-fidelity discovery metrics and group telemetry.
 * Phase 181: Hardened sandbox-first persistence.
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
import type { ParsedAsset, ImportRunSummary } from '@/parser/types';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ReconciliationView } from '@/modules/import/components/ReconciliationView';

type ImportStep = 'INGEST' | 'PROCESSING' | 'PREVIEW' | 'SUMMARY';

export function ImportWorkstation() {
  const { toast } = useToast();
  const { assets: existingAssets, refreshRegistry, activeGrantId, setDataSource, setActiveView } = useAppState();
  const { userProfile } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<ImportStep>('INGEST');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stagedAssets, setStagedAssets] = useState<ParsedAsset[]>([]);
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
    setSheetCount(0);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      setSheetCount(workbook.SheetNames.length);
      setProgress(40);

      const engine = new ParserEngine(file.name, existingAssets);
      let allParsedAssets: ParsedAsset[] = [];
      let finalSummary: ImportRunSummary | null = null;

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
        
        const result = engine.parseWorkbook(sheetName, data);
        allParsedAssets = [...allParsedAssets, ...result.assets];
        
        if (!finalSummary) {
          finalSummary = result.summary;
        } else {
          finalSummary.dataRowsImported += result.summary.dataRowsImported;
          finalSummary.templatesDiscovered += result.summary.templatesDiscovered;
          finalSummary.groupCount += result.summary.groupCount;
          finalSummary.duplicatesDetected += result.summary.duplicatesDetected;
        }
      }
      
      // Authoritative Offline Pulse: Save to Sandbox immediately
      await storage.saveToSandbox(allParsedAssets as any[]);
      setStagedAssets(allParsedAssets);
      setSummary(finalSummary);
      setProgress(100);

      setTimeout(() => {
        setIsProcessing(false);
        setCurrentStep('PREVIEW');
        setDataSource('SANDBOX');
      }, 800);

    } catch (error) {
      console.error("Import error:", error);
      toast({ variant: "destructive", title: "Import Failure", description: "The workbook structure could not be mapped correctly." });
      setCurrentStep('INGEST');
    }
  };

  const handleCommit = async () => {
    if (!activeGrantId) {
      toast({ variant: "destructive", title: "Project Required", description: "Select an active project in Settings." });
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
      
      toast({ title: "Registration Successful", description: `${stagedAssets.length} assets integrated into the register.` });
      setDataSource('PRODUCTION');
      await refreshRegistry();
      setCurrentStep('SUMMARY');
    } catch (e) {
      toast({ variant: "destructive", title: "Merge Failure" });
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
            <motion.div key="ingest" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className="border-4 border-dashed border-white/5 bg-white/[0.02] hover:border-primary/40 transition-all rounded-[3rem] p-16 flex flex-col items-center justify-center text-center h-[450px] cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx,.xls" />
                <div className="p-10 bg-primary/10 rounded-full mb-8 shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <FileSpreadsheet className="h-16 w-16 text-primary" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-black uppercase text-white tracking-tight">Ingest Registry Workbook</h3>
                  <p className="text-sm font-medium text-white/40 max-w-sm mx-auto italic leading-relaxed">
                    Traverse hierarchical Excel registers. The engine will detect sections, subsections, and asset groups automatically from Column A.
                  </p>
                </div>
                <Button className="h-16 px-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 mt-10 bg-primary text-black">
                  Select Excel Workbook
                </Button>
              </Card>
            </motion.div>
          )}

          {currentStep === 'PROCESSING' && (
            <div className="flex flex-col items-center justify-center py-32 text-center space-y-10">
              <div className="p-16 bg-primary/10 rounded-[3rem] animate-pulse">
                <ScanSearch className="h-20 w-20 text-primary" />
              </div>
              <div className="space-y-4 max-w-sm w-full">
                <h3 className="text-2xl font-black uppercase tracking-widest text-white">Discovering Hierarchy</h3>
                <Progress value={progress} className="h-2 rounded-full" />
                <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Traversing structural nodes from Column A...</p>
              </div>
            </div>
          )}

          {currentStep === 'PREVIEW' && (
            <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
              {/* Discovery Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-8 rounded-[2rem] bg-white/[0.03] border-2 border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Sheets Scanned</span>
                    <Database className="h-4 w-4 text-primary opacity-40" />
                  </div>
                  <p className="text-4xl font-black text-white">{sheetCount}</p>
                </div>
                <div className="p-8 rounded-[2rem] bg-white/[0.03] border-2 border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Sections Found</span>
                    <Layers className="h-4 w-4 text-primary opacity-40" />
                  </div>
                  <p className="text-4xl font-black text-white">{runSummary?.groupCount}</p>
                </div>
                <div className="p-8 rounded-[2rem] bg-white/[0.03] border-2 border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Learned Templates</span>
                    <ScanSearch className="h-4 w-4 text-primary opacity-40" />
                  </div>
                  <p className="text-4xl font-black text-white">{runSummary?.templatesDiscovered}</p>
                </div>
                <div className={cn("p-8 rounded-[2rem] bg-white/[0.03] border-2 space-y-2", (runSummary?.duplicatesDetected || 0) > 0 ? "border-destructive/40" : "border-white/5")}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Total Pulses</span>
                    <CheckCircle2 className="h-4 w-4 text-primary opacity-40" />
                  </div>
                  <p className="text-4xl font-black text-white">{runSummary?.dataRowsImported}</p>
                </div>
              </div>

              <ReconciliationView assets={stagedAssets as any} />

              <div className="p-10 rounded-[3rem] bg-primary/5 border-2 border-dashed border-primary/20 flex flex-col md:flex-row items-center justify-between gap-8 group hover:border-primary/40 transition-all">
                <div className="flex items-start gap-6 max-w-xl">
                  <div className="p-4 bg-primary rounded-2xl shadow-xl shadow-primary/20"><ShieldCheck className="h-8 w-8 text-black" /></div>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-black uppercase tracking-tight text-white leading-none">Confirm Registry Merge?</h4>
                    <p className="text-sm font-medium text-white/40 italic leading-relaxed">
                      Executing this pulse will integrate {stagedAssets.length} structural records into the production registry. Headers and group contexts have been mapped.
                    </p>
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
              <div className="p-16 bg-green-500/10 rounded-[4rem] shadow-inner text-green-600 animate-in zoom-in duration-700">
                <CheckCircle2 className="h-24 w-20" />
              </div>
              <div className="space-y-4 max-w-lg">
                <h3 className="text-4xl font-black uppercase text-white tracking-tighter">Registration Complete</h3>
                <p className="text-sm font-medium text-white/40 italic leading-relaxed">
                  The Asset Register pulse is now authoritative. {runSummary?.dataRowsImported} records integrated from {sheetCount} sheets.
                </p>
              </div>
              <Button onClick={() => setActiveView('REGISTRY')} className="h-16 px-12 rounded-2xl font-black uppercase text-xs tracking-widest bg-primary text-black">
                View Updated Register
              </Button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
