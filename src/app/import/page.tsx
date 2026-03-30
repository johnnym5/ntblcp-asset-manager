'use client';

/**
 * @fileOverview Import Engine Page.
 * Orchestrates the deterministic parsing wizard and sandbox reconciliation.
 */

import React, { useState, useRef, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileUp, 
  ScanSearch, 
  ShieldCheck, 
  Loader2, 
  DatabaseZap, 
  CheckCircle2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { parseSheetToAssets } from '@/parser/buildHierarchy';
import { ReconciliationView } from '@/modules/import/components/ReconciliationView';
import { storage } from '@/offline/storage';
import { enqueueMutation } from '@/offline/queue';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { monitoring } from '@/lib/monitoring';
import * as XLSX from 'xlsx';
import type { Asset } from '@/types/domain';

export default function ImportPage() {
  const { toast } = useToast();
  const { refreshRegistry, activeGrantId } = useAppState();
  const { userProfile } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [stagedAssets, setStagedAssets] = useState<Asset[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadExistingSandbox();
  }, []);

  const loadExistingSandbox = async () => {
    const existing = await storage.getSandbox();
    if (existing.length > 0) {
      setStagedAssets(existing);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeGrantId) {
      if (!activeGrantId) {
        toast({ variant: "destructive", title: "Project Required", description: "Please select an active project in Settings before importing." });
      }
      return;
    }

    setIsProcessing(true);
    setAnalysisProgress(10);
    monitoring.trackEvent('IMPORT_STARTED', { fileName: file.name });

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      setAnalysisProgress(40);

      let allParsedAssets: Asset[] = [];
      
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const assets = parseSheetToAssets(data as any[][], file.name, sheetName);
        
        // Tag assets with the current project ID and user audit info
        const taggedAssets = assets.map(a => ({
          ...a,
          grantId: activeGrantId,
          lastModifiedBy: userProfile?.displayName || 'System Import',
          name: a.name || a.description // Ensure name is present for validation
        }));
        
        allParsedAssets = [...allParsedAssets, ...taggedAssets];
      }

      setAnalysisProgress(80);
      
      // Persist to Sandbox Store immediately to prevent loss
      await storage.saveToSandbox(allParsedAssets);
      
      setTimeout(() => {
        setStagedAssets(allParsedAssets);
        setAnalysisProgress(100);
        setIsProcessing(false);
        monitoring.trackEvent('IMPORT_PARSED', { count: allParsedAssets.length });
        toast({ title: "Analysis Pulse Complete", description: `Reconciled ${allParsedAssets.length} hierarchical records.` });
      }, 800);

    } catch (error) {
      setIsProcessing(false);
      monitoring.trackError(error, { action: 'IMPORT_FAILURE' });
      toast({ variant: "destructive", title: "Structural Failure", description: "The workbook pulse is non-deterministic or corrupted." });
    }
  };

  const handleCommitToRegistry = async () => {
    if (stagedAssets.length === 0) return;
    
    setIsProcessing(true);
    try {
      // 1. Commit every record to the sync queue for background cloud broadcast
      for (const asset of stagedAssets) {
        await enqueueMutation('CREATE', 'assets', asset);
      }
      
      // 2. Persist to the local main store for immediate availability
      const currentAssets = await storage.getAssets();
      await storage.saveAssets([...stagedAssets, ...currentAssets]);

      // 3. Clear Sandbox
      await storage.clearSandbox();
      
      monitoring.trackEvent('IMPORT_COMMITTED', { count: stagedAssets.length });
      toast({ 
        title: "Registry Merged", 
        description: `${stagedAssets.length} records pushed to the production sync pulse.` 
      });
      
      setStagedAssets([]);
      await refreshRegistry();
      
    } catch (e) {
      toast({ variant: "destructive", title: "Merge Failure", description: "Failed to broadcast records to the central registry." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscardSandbox = async () => {
    await storage.clearSandbox();
    setStagedAssets([]);
    toast({ title: "Sandbox Purged", description: "All staged records have been removed." });
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">Import Pulse Engine</h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
            Hierarchical Workbook Detection & Reconciliation
          </p>
        </div>

        {stagedAssets.length > 0 ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Staging Sandbox Active
              </h3>
              <Button variant="ghost" onClick={handleDiscardSandbox} className="text-xs font-bold uppercase tracking-tighter text-destructive hover:bg-destructive/10">
                <Trash2 className="mr-2 h-3 w-3" /> Discard Analysis
              </Button>
            </div>

            <ReconciliationView assets={stagedAssets} />
            
            <Card className="p-8 border-2 border-primary/20 bg-primary/5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-primary/5">
              <div className="space-y-1">
                <h3 className="text-lg font-black uppercase tracking-tight">Merge Sandbox to Registry?</h3>
                <p className="text-xs font-medium text-muted-foreground">This will enqueue {stagedAssets.length} records for cloud synchronization.</p>
              </div>
              <Button onClick={handleCommitToRegistry} disabled={isProcessing} className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 flex items-center gap-3 transition-transform hover:scale-105">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />}
                Execute Merge Pulse
              </Button>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <Card className={cn(
                "border-2 border-dashed transition-all duration-700 flex flex-col items-center justify-center p-12 text-center h-[450px] rounded-[3rem]",
                isProcessing ? "border-primary bg-primary/5 ring-8 ring-primary/5 shadow-2xl shadow-primary/10" : "border-border/40 bg-card/50 hover:border-primary/40 hover:bg-primary/[0.02] shadow-xl"
              )}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".xlsx,.xls" 
                />
                
                {isProcessing ? (
                  <div className="space-y-8 w-full max-w-sm animate-in zoom-in-95 duration-500">
                    <div className="p-6 bg-primary/10 rounded-[2rem] w-24 h-24 mx-auto flex items-center justify-center animate-pulse">
                      <ScanSearch className="h-12 w-12 text-primary" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-xl font-black uppercase tracking-widest">Traversing Workbook Hierarchy</h3>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60">Detecting context markers & temporal subsections...</p>
                    </div>
                    <div className="space-y-2">
                      <Progress value={analysisProgress} className="h-1.5 rounded-full" />
                      <p className="text-[9px] font-mono text-primary font-bold">{analysisProgress}% COMPLETE</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="p-8 bg-primary/10 rounded-full w-28 h-28 mx-auto flex items-center justify-center shadow-inner group">
                      <FileUp className="h-14 w-14 text-primary group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-black tracking-tight uppercase">Ingest Workbook</h3>
                      <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed italic">
                        Rule-based analysis. Records inherit hierarchical metadata from discovered document markers.
                      </p>
                    </div>
                    <Button 
                      className="h-16 px-12 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all hover:-translate-y-1 active:scale-95"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Initialize Workbook Pulse
                    </Button>
                  </div>
                )}
              </Card>
            </div>

            <aside className="space-y-6">
              <Card className="border-border/40 shadow-2xl rounded-[2.5rem] overflow-hidden bg-card/50">
                <div className="p-6 bg-muted/20 border-b border-border/40 flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Protocol v2.0</h4>
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary opacity-40" />
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex gap-4">
                    <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-black text-primary">01</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase tracking-tight">Ancestry Locking</p>
                      <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic">Assets inherit metadata from the nearest section marker discovered above them.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-black text-primary">02</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase tracking-tight">Fidelity Pulse</p>
                      <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic">Unmapped columns are sequestered into metadata objects to preserve 100% record data.</p>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="p-8 rounded-[2.5rem] bg-orange-500/5 border-2 border-dashed border-orange-500/20 space-y-4 shadow-inner">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-600">Deterministic Rule</h4>
                </div>
                <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase opacity-60">
                  Imports are isolated in the Sandbox for administrator reconciliation before registry commitment.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
