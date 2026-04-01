'use client';

/**
 * @fileOverview ImportWorkstation - Data Import Center.
 * Phase 165: Renamed to Data Import Center. Hardened with Structural Parser Engine.
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
  Info
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
  const { assets: existingAssets, refreshRegistry, activeGrantId } = useAppState();
  const { userProfile } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<ImportStep>('INGEST');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stagedAssets, setStagedAssets] = useState<ParsedAsset[]>([]);
  const [runSummary, setSummary] = useState<ImportRunSummary | null>(null);
  const [progress, setProgress] = useState(0);
  
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
      setProgress(40);

      const engine = new ParserEngine(file.name, existingAssets);
      let allParsedAssets: ParsedAsset[] = [];
      let finalSummary: ImportRunSummary | null = null;

      // Process every sheet in the workbook
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
        
        const result = engine.parseWorkbook(sheetName, data);
        allParsedAssets = [...allParsedAssets, ...result.assets];
        
        // Accumulate summary pulse
        if (!finalSummary) {
          finalSummary = result.summary;
        } else {
          finalSummary.dataRowsImported += result.summary.dataRowsImported;
          finalSummary.templatesDiscovered += result.summary.templatesDiscovered;
          finalSummary.groupCount += result.summary.groupCount;
        }
      }
      
      setStagedAssets(allParsedAssets);
      setSummary(finalSummary);
      setProgress(100);

      setTimeout(() => {
        setIsProcessing(false);
        setCurrentStep('PREVIEW');
      }, 800);

    } catch (error) {
      console.error("Import error:", error);
      toast({ variant: "destructive", title: "Import Failure", description: "The workbook structure could not be mapped correctly." });
      setCurrentStep('INGEST');
    }
  };

  const handleCommit = async () => {
    if (!activeGrantId) {
      toast({ variant: "destructive", title: "Project Context Missing", description: "Select an active project scope in Settings." });
      return;
    }

    setIsProcessing(true);
    try {
      const validAssets = stagedAssets.filter(a => !a.validation.isRejected);
      
      for (const asset of validAssets) {
        const assetWithGrant = { ...asset, grantId: activeGrantId };
        await enqueueMutation('CREATE', 'assets', assetWithGrant);
      }
      
      const current = await storage.getAssets();
      await storage.saveAssets([...validAssets.map(a => ({ ...a, grantId: activeGrantId })), ...current]);
      
      toast({ title: "Import Successful", description: `${validAssets.length} assets added to the register.` });
      await refreshRegistry();
      setCurrentStep('SUMMARY');
    } catch (e) {
      toast({ variant: "destructive", title: "Registration Failure" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase flex items-center gap-4 leading-none">
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
          <Button variant="outline" onClick={() => setCurrentStep('INGEST')} className="h-12 px-6 rounded-xl font-black uppercase text-[9px] border-2">
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Discard Import
          </Button>
        )}
      </div>

      <div className="px-2">
        <AnimatePresence mode="wait">
          {currentStep === 'INGEST' && (
            <motion.div key="ingest" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className="border-4 border-dashed border-border/40 bg-card/50 hover:border-primary/40 transition-all rounded-[3rem] p-16 flex flex-col items-center justify-center text-center h-[450px] cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx,.xls" />
                <div className="p-10 bg-primary/10 rounded-full mb-8 shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <FileSpreadsheet className="h-16 w-16 text-primary" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-black uppercase">Ingest Registry Workbook</h3>
                  <p className="text-sm font-medium text-muted-foreground max-w-sm mx-auto italic opacity-70">
                    Structural discovery engine detects groups and header sets automatically for TB and C19 registers.
                  </p>
                </div>
                <Button className="h-16 px-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 mt-10">
                  Select Excel File
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
                <h3 className="text-2xl font-black uppercase tracking-widest">Structural Discovery</h3>
                <Progress value={progress} className="h-2 rounded-full" />
                <p className="text-[10px] font-black uppercase text-muted-foreground opacity-60">Traversing Workbook Hierarchy...</p>
              </div>
            </div>
          )}

          {currentStep === 'PREVIEW' && (
            <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
              {/* Discovery Summary Pulse */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 rounded-3xl bg-card border-2 border-border/40 shadow-sm">
                  <span className="text-[9px] font-black uppercase opacity-40">Sections Found</span>
                  <p className="text-sm font-black text-primary uppercase">{runSummary?.groupCount}</p>
                </div>
                <div className="p-6 rounded-3xl bg-card border-2 border-border/40 shadow-sm">
                  <span className="text-[9px] font-black uppercase opacity-40">Learned Templates</span>
                  <p className="text-sm font-black text-primary uppercase">{runSummary?.templatesDiscovered}</p>
                </div>
                <div className="p-6 rounded-3xl bg-card border-2 border-border/40 shadow-sm">
                  <span className="text-[9px] font-black uppercase opacity-40">Total Records</span>
                  <p className="text-sm font-black">{runSummary?.dataRowsImported}</p>
                </div>
                <div className={cn("p-6 rounded-3xl bg-card border-2 shadow-sm", (runSummary?.duplicatesDetected || 0) > 0 ? "border-destructive/20 bg-destructive/5" : "border-border/40")}>
                  <span className="text-[9px] font-black uppercase opacity-40">Registry Conflicts</span>
                  <p className={cn("text-sm font-black", (runSummary?.duplicatesDetected || 0) > 0 ? "text-destructive" : "text-foreground")}>{runSummary?.duplicatesDetected}</p>
                </div>
              </div>

              {/* Hierarchy Visualization */}
              <ReconciliationView assets={stagedAssets as any} />

              <div className="p-10 rounded-[3rem] bg-primary/5 border-2 border-dashed border-primary/20 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-start gap-4 max-w-lg">
                  <div className="p-3 bg-blue-500/10 rounded-2xl shrink-0"><Info className="h-6 w-6 text-blue-600" /></div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-black uppercase tracking-tight">Final Commitment Pulse</h5>
                    <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">
                      Confirming will merge these {stagedAssets.length} structural records into the production Asset Register. Source row and group context will be preserved for traceability.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleCommit}
                  disabled={isProcessing}
                  className="h-16 px-12 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 gap-4 transition-transform hover:scale-105 active:scale-95 min-w-[240px]"
                >
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                  Finalize Registration
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 'SUMMARY' && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-10">
              <div className="p-16 bg-green-500/10 rounded-[4rem] shadow-inner text-green-600">
                <CheckCircle2 className="h-24 w-20" />
              </div>
              <div className="space-y-4 max-w-lg">
                <h3 className="text-3xl font-black uppercase">Import Complete</h3>
                <p className="text-sm font-medium text-muted-foreground italic leading-relaxed">
                  The Asset Register has been updated. {runSummary?.dataRowsImported} records were successfully synchronized from {runSummary?.groupCount} workbook sections.
                </p>
              </div>
              <Button onClick={() => setCurrentStep('INGEST')} variant="outline" className="h-14 px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2">
                Begin New Import Run
              </Button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
