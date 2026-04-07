"use client";

/**
 * @fileOverview Import Orchestrator - Two-Stage Ingestion Pulse.
 * Phase 185: Synchronized with ParserEngine group discovery logic for structural ingestion.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { addNotification } from '@/hooks/use-notifications';
import { Loader2, FileCheck2, ScanSearch, Check, X, FileSpreadsheet, Activity, Layers, ListFilter, DatabaseZap, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ParserEngine } from '@/parser/engine';
import { storage } from '@/offline/storage';
import { enqueueMutation } from '@/offline/queue';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import type { DiscoveredGroup, GroupImportContainer } from '@/parser/types';

interface ImportScannerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportScannerDialog({ isOpen, onOpenChange }: ImportScannerDialogProps) {
  const { appSettings, activeGrantId, setDataSource, refreshRegistry } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [scanResults, setScanResults] = useState<DiscoveredGroup[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [activeSheetData, setActiveSheetData] = useState<{name: string, data: any[][]} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<ParserEngine | null>(null);

  useEffect(() => {
    if (file) {
      const performScan = async () => {
        setIsScanning(true);
        setScanResults([]);
        setSelectedSheets([]);
        
        try {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
          
          engineRef.current = new ParserEngine(file.name);
          const groups = engineRef.current.discoverGroups(sheetName, data);

          setActiveSheetData({ name: sheetName, data });
          setScanResults(groups);
          setSelectedSheets(groups.map(g => g.id));
        } catch (e) {
          toast({ variant: "destructive", title: "Scan Failed" });
        } finally {
          setIsScanning(false);
        }
      };
      performScan();
    }
  }, [file, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      setFile(event.target.files[0]);
      setFileName(event.target.files[0].name);
    }
  };

  const handleImport = async () => {
    if (!file || selectedSheets.length === 0 || !activeGrantId || !engineRef.current || !activeSheetData) return;

    setIsImporting(true);
    try {
      const selectedGroups = scanResults.filter(g => selectedSheets.includes(g.id));
      const results = engineRef.current.ingestGroups(activeSheetData.name, activeSheetData.data, selectedGroups);
      const taggedAssets = results.flatMap(c => c.assets).map(a => ({
        ...a,
        grantId: activeGrantId,
        lastModified: new Date().toISOString(),
        lastModifiedBy: userProfile?.displayName || 'System Import',
      }));

      if (taggedAssets.length > 0) {
        await storage.saveToSandbox(taggedAssets as any[]);
        addNotification({ title: 'Sandbox Ready', description: `Staged ${taggedAssets.length} assets for reconciliation.` });
        setDataSource('SANDBOX');
        await refreshRegistry();
        onOpenChange(false);
      } else {
        toast({ title: "No Data Extracted" });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Ingestion Failed" });
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setFileName('');
    setScanResults([]);
    setSelectedSheets([]);
    setActiveSheetData(null);
    engineRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl bg-black border-white/10 p-0 overflow-hidden rounded-[2.5rem] text-white shadow-3xl">
        <div className="p-8 pb-6 border-b border-white/5 bg-white/[0.02]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black uppercase text-white tracking-tight">Workbook Scanner</DialogTitle>
              <DialogDescription className="text-[11px] text-white/40 uppercase tracking-widest font-bold">Discovery Pulse: identifying internal registry blocks</DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl h-10 w-10 bg-white/5"><X className="h-5 w-5" /></Button>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[70vh] bg-black">
          <div className="p-8 pt-6 space-y-10">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 pl-1">Target Workbook</Label>
              <div onClick={() => fileInputRef.current?.click()} className={cn("h-16 rounded-2xl bg-[#0A0A0A] border-2 border-white/5 flex items-center px-6 gap-4 cursor-pointer hover:border-primary/40 transition-all", file && "border-primary/20 shadow-xl shadow-primary/5")}>
                <div className={cn("p-2 rounded-lg bg-white/5", file && "bg-primary/10")}>
                  <FileSpreadsheet className={cn("h-5 w-5 text-white/20", file && "text-primary")} />
                </div>
                <span className={cn("text-sm font-black uppercase tracking-tight truncate", file ? "text-white" : "text-white/20")}>{fileName || "Select pulse file..."}</span>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" className="hidden" />
            </div>

            {(isScanning || scanResults.length > 0) && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                    <ScanSearch className="h-4 w-4" /> Discovered Groups
                  </h4>
                  <Badge variant="outline" className="h-6 px-3 border-primary/20 text-primary bg-primary/5 font-black text-[9px]">
                    {scanResults.length} NODES IDENTIFIED
                  </Badge>
                </div>

                <div className="space-y-3">
                  {isScanning ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-20">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Traversing Workbook Pulse...</span>
                    </div>
                  ) : scanResults.map(result => {
                    const isSelected = selectedSheets.includes(result.id);
                    return (
                      <div key={result.id} className={cn("p-6 rounded-[2rem] bg-[#0A0A0A] border-2 transition-all group", isSelected ? "border-primary/20 shadow-lg" : "border-white/5 opacity-60")}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-5">
                            <button onClick={() => setSelectedSheets(prev => isSelected ? prev.filter(id => id !== result.id) : [...prev, result.id])} className={cn("h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all", isSelected ? "bg-primary border-primary" : "border-white/10")}>
                              {isSelected && <Check className="h-4 w-4 text-black font-black" />}
                            </button>
                            <div className="space-y-1">
                              <h5 className="text-sm font-black uppercase text-white tracking-tight leading-none">{result.groupName}</h5>
                              <p className="text-[10px] font-bold text-white/20 uppercase">Rows: {result.rowCount}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[8px] font-mono border-white/10 text-white/40">{result.headerSetType}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-8 bg-[#050505] border-t border-white/5 flex items-center justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-14 px-10 rounded-2xl text-white/40 font-black uppercase text-[10px] tracking-widest hover:text-white hover:bg-white/5 transition-all">Cancel</Button>
          <Button 
            onClick={handleImport} 
            disabled={isImporting || isScanning || selectedSheets.length === 0} 
            className="h-14 px-12 rounded-2xl bg-primary text-black font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-primary/20 gap-3 transition-transform hover:scale-105 active:scale-95"
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />}
            Stage {selectedSheets.length} Groups
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
