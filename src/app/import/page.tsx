'use client';

/**
 * @fileOverview Guided Import Wizard - Deterministic Hierarchical Ingestion.
 * Phase 40: Integrated Interactive Schema Mapper for Data Engineering.
 */

import React, { useState, useRef, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { monitoring } from '@/lib/monitoring';
import * as XLSX from 'xlsx';
import type { Asset } from '@/types/domain';
import { motion, AnimatePresence } from 'framer-motion';

type ImportStep = 'INGEST' | 'TRAVERSAL' | 'MAPPER' | 'RECONCILIATION' | 'COMMIT';

const STEPS: { id: ImportStep; label: string; description: string; icon: any }[] = [
  { id: 'INGEST', label: 'Ingest', description: 'Upload Workbook', icon: FileUp },
  { id: 'TRAVERSAL', label: 'Traversal', description: 'Scan Headers', icon: ScanSearch },
  { id: 'MAPPER', label: 'Mapper', description: 'Align Schema', icon: Columns },
  { id: 'RECONCILIATION', label: 'Reconciliation', description: 'Review Sandbox', icon: Layers },
  { id: 'COMMIT', label: 'Commit', description: 'Registry Merge', icon: DatabaseZap },
];

export default function ImportPage() {
  const { toast } = useToast();
  const { refreshRegistry, activeGrantId, appSettings } = useAppState();
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
    loadExistingSandbox();
  }, []);

  const loadExistingSandbox = async () => {
    const existing = await storage.getSandbox();
    if (existing.length > 0) {
      setStagedAssets(existing);
      setCurrentStep('RECONCILIATION');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeGrantId) {
      if (!activeGrantId) {
        toast({ variant: "destructive", title: "Project Required", description: "Select an active project in Settings." });
      }
      return;
    }

    setActiveFileName(file.name);
    setCurrentStep('TRAVERSAL');
    setIsProcessing(true);
    setAnalysisProgress(10);
    monitoring.trackEvent('IMPORT_STARTED', { fileName: file.name });

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      setAnalysisProgress(40);

      const sheets: { name: string; data: any[][] }[] = [];
      const headers = new Set<string>();
      
      workbook.SheetNames.forEach(name => {
        const sheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        sheets.push({ name, data });
        
        // Scan for headers in first 50 rows
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
      
      setTimeout(() => {
        setIsProcessing(false);
        setCurrentStep('MAPPER');
      }, 800);

    } catch (error) {
      setIsProcessing(false);
      setCurrentStep('INGEST');
      monitoring.trackError(error, { action: 'INGEST_FAILURE' });
      toast({ variant: "destructive", title: "Ingestion Failure", description: "The workbook pulse is non-deterministic." });
    }
  };

  const handleConfirmMapping = async (mapping: Record<string, string>) => {
    setIsProcessing(true);
    setCurrentStep('TRAVERSAL'); // Show analysis state while parsing with map
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
      
      setTimeout(() => {
        setIsProcessing(false);
        setCurrentStep('RECONCILIATION');
        toast({ title: "Schema Applied", description: `Reconciled ${allParsedAssets.length} hierarchical records.` });
      }, 800);

    } catch (e) {
      setIsProcessing(false);
      setCurrentStep('MAPPER');
      monitoring.trackError(e, { action: 'MAPPING_FAILURE' });
      toast({ variant: "destructive", title: "Mapping Failure" });
    }
  };

  const handleCommitToRegistry = async () => {
    if (stagedAssets.length === 0) return;
    
    setIsProcessing(true);
    try {
      for (const asset of stagedAssets) {
        await enqueueMutation('CREATE', 'assets', asset);
      }
      
      const currentAssets = await storage.getAssets();
      await storage.saveAssets([...stagedAssets, ...currentAssets]);
      await storage.clearSandbox();
      
      monitoring.trackEvent('IMPORT_COMMITTED', { count: stagedAssets.length });
      toast({ title: "Registry Merged", description: `${stagedAssets.length} records pushed to production pulse.` });
      
      setStagedAssets([]);
      setCurrentStep('INGEST');
      await refreshRegistry();
      
    } catch (e) {
      toast({ variant: "destructive", title: "Merge Failure", description: "Failed to broadcast records to central registry." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscardSandbox = async () => {
    await storage.clearSandbox();
    setStagedAssets([]);
    setRawSheetData([]);
    setCurrentStep('INGEST');
    toast({ title: "Sandbox Purged", description: "Staged records removed." });
  };

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Wizard Header */}
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
            <Button variant="outline" onClick={handleDiscardSandbox} className="h-12 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest text-destructive hover:bg-destructive/10 border-2">
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Discard Pulse
            </Button>
          )}
        </div>

        {/* Stepper Pulse */}
        <div className="px-2 overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex items-center justify-between relative min-w-[600px] px-4">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted/30 -translate-y-1/2 -z-10" />
            <div 
              className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 -z-10 transition-all duration-700 ease-out" 
              style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
            />
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === currentStepIndex;
              const isCompleted = idx < currentStepIndex;
              return (
                <div key={step.id} className="flex flex-col items-center gap-3">
                  <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                    isActive ? "bg-primary border-primary text-primary-foreground shadow-xl shadow-primary/20 scale-110" :
                    isCompleted ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground opacity-40"
                  )}>
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <div className="hidden md:flex flex-col items-center text-center">
                    <span className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", isActive ? "text-primary" : "text-muted-foreground")}>{step.label}</span>
                    <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-tighter">{step.description}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Content Surface */}
        <div className="px-2">
          <AnimatePresence mode="wait">
            {currentStep === 'INGEST' && (
              <motion.div 
                key="step-ingest"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                <Card 
                  className="lg:col-span-2 border-4 border-dashed border-border/40 bg-card/50 hover:border-primary/40 hover:bg-primary/[0.02] transition-all rounded-[3rem] p-12 flex flex-col items-center justify-center text-center h-[450px] cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx,.xls" />
                  <div className="p-10 bg-primary/10 rounded-full w-32 h-32 flex items-center justify-center mb-8 shadow-inner transition-transform group-hover:scale-110 duration-500">
                    <FileUp className="h-16 w-16 text-primary" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-3xl font-black tracking-tight uppercase">Upload Pulse</h3>
                    <p className="text-sm font-medium text-muted-foreground max-w-sm mx-auto leading-relaxed italic opacity-70">
                      Rule-based analyzer detects document context markers and prepares technical headers for mapping.
                    </p>
                  </div>
                  <Button className="h-16 px-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 mt-10 transition-all hover:-translate-y-1">
                    Select Registry Workbook
                  </Button>
                </Card>

                <div className="space-y-6">
                  <Card className="rounded-[2.5rem] border-2 border-border/40 shadow-xl bg-card/50 overflow-hidden">
                    <div className="p-6 bg-muted/20 border-b flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Protocol v5.0</h4>
                      <Activity className="h-4 w-4 text-primary opacity-40" />
                    </div>
                    <div className="p-8 space-y-6">
                      <div className="flex gap-4">
                        <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5"><span className="text-[10px] font-black text-primary">01</span></div>
                        <div className="space-y-1">
                          <p className="text-xs font-black uppercase">Schema Mapping</p>
                          <p className="text-[10px] text-muted-foreground font-medium italic leading-tight">Interactively align legacy columns to the production registry pulse.</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5"><span className="text-[10px] font-black text-primary">02</span></div>
                        <div className="space-y-1">
                          <p className="text-xs font-black uppercase">Metadata Sequestration</p>
                          <p className="text-[10px] text-muted-foreground font-medium italic leading-tight">Unmapped technical columns are safely isolated into record metadata.</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {(currentStep === 'TRAVERSAL') && (
              <motion.div 
                key="step-traversal"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-32 text-center space-y-10"
              >
                <div className="relative">
                  <div className="p-16 bg-primary/10 rounded-[3rem] animate-pulse">
                    <ScanSearch className="h-20 w-20 text-primary" />
                  </div>
                  <div className="absolute -bottom-4 -right-4 h-12 w-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-2xl animate-bounce">
                    <Activity className="h-6 w-6" />
                  </div>
                </div>
                <div className="space-y-4 max-w-sm">
                  <h3 className="text-2xl font-black uppercase tracking-widest">Processing Registry Pulse</h3>
                  <p className="text-[10px] font-black uppercase text-muted-foreground opacity-60 tracking-[0.2em]">Executing rule-based hierarchical traversal...</p>
                  <div className="space-y-2 pt-4">
                    <Progress value={analysisProgress} className="h-2 rounded-full" />
                    <span className="text-[9px] font-mono font-bold text-primary">{Math.round(analysisProgress)}% COMPLETE</span>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 'MAPPER' && (
              <motion.div 
                key="step-mapper"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/20"><Columns className="h-5 w-5 text-white" /></div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-foreground">Interactive Schema Mapper</h3>
                  </div>
                  <Badge variant="outline" className="h-8 px-4 rounded-xl border-primary/20 bg-primary/5 text-primary font-black uppercase text-[10px]">
                    {detectedHeaders.length} HEADERS DISCOVERED
                  </Badge>
                </div>

                <SchemaMapper 
                  headers={detectedHeaders} 
                  onConfirm={handleConfirmMapping}
                  isProcessing={isProcessing}
                />
              </motion.div>
            )}

            {currentStep === 'RECONCILIATION' && (
              <motion.div 
                key="step-recon"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/20"><ShieldCheck className="h-5 w-5 text-white" /></div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Sandbox Reconciliation</h3>
                  </div>
                  <Badge variant="outline" className="h-8 px-4 rounded-xl border-primary/20 bg-primary/5 text-primary font-black uppercase text-[10px]">
                    {stagedAssets.length} RECORDS ANALYZED
                  </Badge>
                </div>

                <ReconciliationView assets={stagedAssets} />

                <div className="p-10 rounded-[3rem] bg-card border-2 border-primary/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 group hover:border-primary/20 transition-all">
                  <div className="space-y-2">
                    <h4 className="text-2xl font-black uppercase tracking-tight text-foreground">Finalize Ingestion Pulse?</h4>
                    <p className="text-sm font-medium text-muted-foreground italic leading-relaxed opacity-70">
                      Once confirmed, these records will be merged into the production registry and enqueued for cloud synchronization.
                    </p>
                  </div>
                  <Button 
                    onClick={() => setCurrentStep('COMMIT')}
                    className="h-20 px-12 rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-primary/30 gap-4 transition-transform hover:scale-105 active:scale-95"
                  >
                    Proceed to Commit <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {currentStep === 'COMMIT' && (
              <motion.div 
                key="step-commit"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center space-y-10"
              >
                <div className="p-16 bg-muted rounded-[4rem] shadow-inner relative group">
                  <DatabaseZap className="h-32 w-28 text-muted-foreground opacity-20 group-hover:scale-110 transition-transform duration-700" />
                  {isProcessing && <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 animate-spin text-primary" />}
                </div>
                
                <div className="space-y-6 max-w-lg">
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black uppercase tracking-tighter">Commit Selection</h3>
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">
                      This action is deterministic. All {stagedAssets.length} hierarchical records will be merged into the production registry pulse.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                    <Button variant="ghost" onClick={() => setCurrentStep('RECONCILIATION')} disabled={isProcessing} className="h-14 px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest">
                      <ChevronLeft className="mr-2 h-4 w-4" /> Review Again
                    </Button>
                    <Button 
                      onClick={handleCommitToRegistry} 
                      disabled={isProcessing}
                      className="h-16 px-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 gap-4"
                    >
                      {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                      Execute Merge Pulse
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
}
