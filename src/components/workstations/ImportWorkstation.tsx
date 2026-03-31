'use client';

/**
 * @fileOverview ImportWorkstation - SPA Ingestion Module.
 * Phase 72: Verified imports and added missing Badge reference.
 */

import React, { useState, useRef, useEffect } from 'react';
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
  Layers,
  Columns
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { parseSheetToAssets } from '@/parser/buildHierarchy';
import { ReconciliationView } from '@/modules/import/components/ReconciliationView';
import { SchemaMapper } from '@/modules/import/components/SchemaMapper';
import { storage } from '@/offline/storage';
import { enqueueMutation } from '@/offline/queue';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import * as XLSX from 'xlsx';
import type { Asset } from '@/types/domain';
import { motion, AnimatePresence } from 'framer-motion';

type ImportStep = 'INGEST' | 'TRAVERSAL' | 'MAPPER' | 'RECONCILIATION' | 'COMMIT';

const STEPS: { id: ImportStep; label: string; description: string; icon: any }[] = [
  { id: 'INGEST', label: 'Ingest', description: 'Upload Workbook', icon: FileUp },
  { id: 'TRAVERSAL', label: 'Traversal', description: 'Scan Headers', icon: ScanSearch },
  { id: 'MAPPER', label: 'Mapper', description: 'Align Schema', icon: Columns },
  { id: 'RECONCILIATION', label: 'Review', description: 'Review Sandbox', icon: Layers },
  { id: 'COMMIT', label: 'Commit', description: 'Registry Merge', icon: DatabaseZap },
];

export function ImportWorkstation() {
  const { toast } = useToast();
  const { refreshRegistry, activeGrantId } = useAppState();
  const { userProfile } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<ImportStep>('INGEST');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stagedAssets, setStagedAssets] = useState<Asset[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [rawSheetData, setRawSheetData] = useState<{ name: string; data: any[][] }[]>([]);
  const [activeFileName, setActiveFileName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    storage.getSandbox().then(existing => {
      if (existing.length > 0) {
        setStagedAssets(existing);
        setCurrentStep('RECONCILIATION');
      }
    });
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeGrantId) {
      if (!activeGrantId) toast({ variant: "destructive", title: "Project Required" });
      return;
    }

    setActiveFileName(file.name);
    setCurrentStep('TRAVERSAL');
    setIsProcessing(true);
    setAnalysisProgress(10);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheets: { name: string; data: any[][] }[] = [];
      const headers = new Set<string>();
      
      workbook.SheetNames.forEach(name => {
        const sheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        sheets.push({ name, data });
        data.slice(0, 50).forEach(row => {
          if (Array.isArray(row)) {
            row.forEach(cell => {
              if (typeof cell === 'string' && cell.length > 1) headers.add(cell.trim());
            });
          }
        });
      });

      setRawSheetData(sheets);
      setDetectedHeaders(Array.from(headers));
      setAnalysisProgress(100);
      setTimeout(() => { setIsProcessing(false); setCurrentStep('MAPPER'); }, 800);
    } catch (error) {
      setIsProcessing(false);
      setCurrentStep('INGEST');
      toast({ variant: "destructive", title: "Ingestion Failure" });
    }
  };

  const handleConfirmMapping = async (mapping: Record<string, string>) => {
    setIsProcessing(true);
    setCurrentStep('TRAVERSAL');
    setAnalysisProgress(20);

    try {
      let allParsedAssets: Asset[] = [];
      rawSheetData.forEach((sheet, idx) => {
        const assets = parseSheetToAssets(sheet.data, activeFileName, sheet.name, mapping);
        const taggedAssets = assets.map(a => ({
          ...a,
          grantId: activeGrantId!,
          lastModifiedBy: userProfile?.displayName || 'System Import',
        }));
        allParsedAssets = [...allParsedAssets, ...taggedAssets];
        setAnalysisProgress(20 + ((idx + 1) / rawSheetData.length) * 60);
      });

      await storage.saveToSandbox(allParsedAssets);
      setStagedAssets(allParsedAssets);
      setAnalysisProgress(100);
      setTimeout(() => { setIsProcessing(false); setCurrentStep('RECONCILIATION'); }, 800);
    } catch (e) {
      setIsProcessing(false);
      setCurrentStep('MAPPER');
      toast({ variant: "destructive", title: "Mapping Failure" });
    }
  };

  const handleCommitToRegistry = async () => {
    setIsProcessing(true);
    try {
      for (const asset of stagedAssets) await enqueueMutation('CREATE', 'assets', asset);
      const currentAssets = await storage.getAssets();
      await storage.saveAssets([...stagedAssets, ...currentAssets]);
      await storage.clearSandbox();
      toast({ title: "Registry Merged", description: `${stagedAssets.length} records pushed.` });
      setStagedAssets([]);
      setCurrentStep('INGEST');
      await refreshRegistry();
    } finally {
      setIsProcessing(false);
    }
  };

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase flex items-center gap-4 leading-none">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <DatabaseZap className="h-8 w-8 text-primary" />
            </div>
            Import Wizard
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
            Data Engineering & Hierarchical Ingestion Pulse
          </p>
        </div>
        {currentStep !== 'INGEST' && (
          <Button variant="outline" onClick={() => { storage.clearSandbox(); setStagedAssets([]); setCurrentStep('INGEST'); }} className="h-12 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest text-destructive hover:bg-destructive/10 border-2">
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Discard Pulse
          </Button>
        )}
      </div>

      {/* Stepper Pulse */}
      <div className="px-2 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex items-center justify-between relative min-w-[600px] px-4">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted/30 -translate-y-1/2 -z-10" />
          <div className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 -z-10 transition-all duration-700" style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }} />
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex flex-col items-center gap-3">
              <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2", 
                idx === currentStepIndex ? "bg-primary border-primary text-primary-foreground shadow-xl shadow-primary/20 scale-110" : 
                idx < currentStepIndex ? "bg-primary/10 border-primary text-primary" : 
                "bg-card border-border text-muted-foreground opacity-40"
              )}>
                {idx < currentStepIndex ? <CheckCircle2 className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
              </div>
              <span className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", idx === currentStepIndex ? "text-primary" : "text-muted-foreground")}>{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-2">
        <AnimatePresence mode="wait">
          {currentStep === 'INGEST' && (
            <motion.div key="step-ingest" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="border-4 border-dashed border-border/40 bg-card/50 hover:border-primary/40 transition-all rounded-[3rem] p-12 flex flex-col items-center justify-center text-center h-[400px] cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx,.xls" />
                <div className="p-10 bg-primary/10 rounded-full w-32 h-32 flex items-center justify-center mb-8 shadow-inner">
                  <FileUp className="h-16 w-16 text-primary" />
                </div>
                <h3 className="text-3xl font-black uppercase">Upload Pulse</h3>
                <Button className="h-16 px-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl mt-10">Select Registry Workbook</Button>
              </Card>
            </motion.div>
          )}

          {currentStep === 'TRAVERSAL' && (
            <div className="flex flex-col items-center justify-center py-32 text-center space-y-10">
              <ScanSearch className="h-20 w-20 text-primary animate-pulse" />
              <div className="space-y-4 max-w-sm w-full">
                <h3 className="text-2xl font-black uppercase tracking-widest">Processing Pulse</h3>
                <Progress value={analysisProgress} className="h-2 rounded-full" />
              </div>
            </div>
          )}

          {currentStep === 'MAPPER' && (
            <motion.div key="step-mapper" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary rounded-xl shadow-lg"><Columns className="h-5 w-5 text-white" /></div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-foreground">Interactive Schema Mapper</h3>
                </div>
                <Badge variant="outline" className="h-8 px-4 rounded-xl border-primary/20 bg-primary/5 text-primary font-black uppercase text-[10px]">
                  {detectedHeaders.length} HEADERS DISCOVERED
                </Badge>
              </div>
              <SchemaMapper headers={detectedHeaders} onConfirm={handleConfirmMapping} isProcessing={isProcessing} />
            </motion.div>
          )}

          {currentStep === 'RECONCILIATION' && (
            <motion.div key="step-recon" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
              <ReconciliationView assets={stagedAssets} />
              <Button onClick={() => setCurrentStep('COMMIT')} className="w-full h-20 rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl bg-primary text-white gap-4">Proceed to Commit <ChevronRight className="h-5 w-5" /></Button>
            </motion.div>
          )}

          {currentStep === 'COMMIT' && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-10">
              <DatabaseZap className="h-32 w-28 text-muted-foreground opacity-20" />
              <div className="space-y-6">
                <h3 className="text-3xl font-black uppercase">Commit Selection</h3>
                <Button onClick={handleCommitToRegistry} disabled={isProcessing} className="h-16 px-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 gap-4 bg-primary text-white">
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                  Execute Merge Pulse
                </Button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
