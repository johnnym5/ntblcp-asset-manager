"use client";

/**
 * @fileOverview Import Orchestrator - Two-Stage Ingestion Pulse.
 * Phase 180: Enhanced with sheet counts and discovered header visualization.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { addNotification } from '@/hooks/use-notifications';
import { Loader2, FileCheck2, ScanSearch, Check, X, FileSpreadsheet, ChevronDown, Activity, Info, AlertTriangle, ListFilter } from 'lucide-react';
import { scanExcelFile, parseExcelFile, type ScannedSheetInfo } from '@/lib/excel-parser';
import { storage } from '@/offline/storage';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

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
  const [scanResults, setScanResults] = useState<ScannedSheetInfo[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [sheetToTemplateMap, setSheetToTemplateMap] = useState<Record<string, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeGrant = React.useMemo(() => 
    appSettings?.grants.find(g => g.id === activeGrantId), 
    [appSettings, activeGrantId]
  );

  const availableTemplates = React.useMemo(() => 
    activeGrant ? Object.keys(activeGrant.sheetDefinitions) : [],
    [activeGrant]
  );

  useEffect(() => {
    if (file && activeGrant) {
      const performScan = async () => {
        setIsScanning(true);
        setScanResults([]);
        setSelectedSheets([]);
        setSheetToTemplateMap({});
        
        try {
          const { scannedSheets } = await scanExcelFile(file, appSettings!);
          
          if (scannedSheets.length > 0) {
            setScanResults(scannedSheets);
            setSelectedSheets(scannedSheets.map(s => s.sheetName));
            
            const initialMap: Record<string, string> = {};
            scannedSheets.forEach(s => { 
              if (s.definitionName) {
                initialMap[s.sheetName] = s.definitionName; 
              }
            });
            setSheetToTemplateMap(initialMap);
          }
        } catch (e) {
          toast({ variant: "destructive", title: "Scan Failed" });
        } finally {
          setIsScanning(false);
        }
      };
      performScan();
    }
  }, [file, activeGrant, appSettings, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      setFile(event.target.files[0]);
      setFileName(event.target.files[0].name);
    }
  };

  const handleImport = async () => {
    if (!file || selectedSheets.length === 0 || !activeGrant) return;

    setIsImporting(true);
    try {
      const existingAssets = await storage.getAssets();
      const sheetsToImport = scanResults
        .filter(r => selectedSheets.includes(r.sheetName))
        .map(r => ({
          ...r,
          definitionName: sheetToTemplateMap[r.sheetName] || r.definitionName
        }));

      const { assets: newAssets } = await parseExcelFile(file, activeGrant.sheetDefinitions, existingAssets, sheetsToImport);

      const taggedAssets = newAssets.map(asset => ({
        ...asset,
        grantId: activeGrant.id,
        lastModified: new Date().toISOString(),
        lastModifiedBy: userProfile?.displayName || 'System Import',
      }));

      if (taggedAssets.length > 0) {
        await storage.saveToSandbox(taggedAssets);
        addNotification({ title: 'Sandbox Ready', description: `Staged ${taggedAssets.length} assets for reconciliation.` });
        setDataSource('SANDBOX');
        await refreshRegistry();
      } else {
        toast({ title: "No Data Extracted", description: "Check that templates match sheet headers." });
      }
      onOpenChange(false);
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setFileName('');
    setScanResults([]);
    setSelectedSheets([]);
    setSheetToTemplateMap({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl bg-black border-white/10 p-0 overflow-hidden rounded-[2.5rem] text-white shadow-3xl">
        <div className="p-8 pb-6 border-b border-white/5 bg-white/[0.02]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black uppercase text-white tracking-tight">Workbook Scanner</DialogTitle>
              <DialogDescription className="text-[11px] text-white/40 uppercase tracking-widest font-bold">Structural Discovery & Header Discovery</DialogDescription>
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
                    <ScanSearch className="h-4 w-4" /> Discovered Sheets
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
                    const isSelected = selectedSheets.includes(result.sheetName);
                    const hasMatch = !!sheetToTemplateMap[result.sheetName];
                    
                    return (
                      <div key={result.sheetName} className={cn("p-6 rounded-[2rem] bg-[#0A0A0A] border-2 transition-all group", isSelected ? "border-primary/20 shadow-lg" : "border-white/5 opacity-60")}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-5">
                            <button onClick={() => setSelectedSheets(prev => isSelected ? prev.filter(s => s !== result.sheetName) : [...prev, result.sheetName])} className={cn("h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all", isSelected ? "bg-primary border-primary" : "border-white/10")}>
                              {isSelected && <Check className="h-4 w-4 text-black font-black" />}
                            </button>
                            <div className="space-y-1">
                              <h5 className="text-sm font-black uppercase text-white tracking-tight leading-none">{result.sheetName}</h5>
                              <p className="text-[10px] font-bold text-white/20 uppercase">Rows: {result.rowCount}</p>
                            </div>
                          </div>
                          
                          <Collapsible>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest gap-2 bg-white/5 hover:bg-white/10">
                                <ListFilter className="h-3 w-3" /> View Headers
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-4 pt-4 border-t border-white/5">
                              <div className="flex flex-wrap gap-1.5">
                                {result.headers.map((h, i) => (
                                  <Badge key={i} variant="secondary" className="bg-black border border-white/10 text-[8px] font-mono font-bold text-white/40">{h}</Badge>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>

                        {isSelected && (
                          <div className="mt-6 space-y-3 animate-in slide-in-from-top-2 duration-300">
                            <Label className="text-[9px] font-black uppercase text-white/40 tracking-widest pl-1">Apply Technical Template</Label>
                            <Select 
                              value={sheetToTemplateMap[result.sheetName] || ""} 
                              onValueChange={(v) => setSheetToTemplateMap(prev => ({ ...prev, [result.sheetName]: v }))}
                            >
                              <SelectTrigger className="h-12 bg-black border-2 border-white/10 rounded-xl font-black uppercase text-[10px] tracking-widest focus:ring-primary/20">
                                <SelectValue placeholder="Select registry template..." />
                              </SelectTrigger>
                              <SelectContent className="bg-[#0A0A0A] border-white/10">
                                {availableTemplates.map(t => (
                                  <SelectItem key={t} value={t} className="text-white font-black uppercase text-[10px]">{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
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
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
            Import {selectedSheets.length} Pulses
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
