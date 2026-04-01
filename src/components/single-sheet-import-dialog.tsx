"use client";

/**
 * @fileOverview Redesigned Import Scanner Dialog - High-Fidelity Dark UI.
 * Phase 100: Overhauled to strictly match the requested dark-themed design image.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { addNotification } from '@/hooks/use-notifications';
import { 
  Loader2, 
  FileUp, 
  FileCheck2, 
  AlertTriangle, 
  ScanSearch, 
  ChevronsUpDown, 
  Check, 
  X,
  FileSpreadsheet,
  CheckCircle2,
  Database
} from 'lucide-react';
import { scanExcelFile, parseExcelFile, type ScannedSheetInfo } from '@/lib/excel-parser';
import { storage } from '@/offline/storage';
import { enqueueMutation } from '@/offline/queue';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ImportScannerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportScannerDialog({ isOpen, onOpenChange }: ImportScannerDialogProps) {
  const { appSettings, refreshRegistry, activeGrantId } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [scanResults, setScanResults] = useState<ScannedSheetInfo[]>([]);
  const [scanErrors, setScanErrors] = useState<string[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeGrant = useMemo(() => {
    return appSettings?.grants?.find(g => g.id === activeGrantId);
  }, [appSettings, activeGrantId]);

  useEffect(() => {
    if (file && activeGrant) {
      const performScan = async () => {
        setIsScanning(true);
        setScanResults([]);
        setScanErrors([]);
        setSelectedSheets([]);
        
        try {
          const { scannedSheets, errors } = await scanExcelFile(file, activeGrant.sheetDefinitions);
          
          if (errors.length > 0) setScanErrors(errors);
          if (scannedSheets.length > 0) {
            setScanResults(scannedSheets);
            setSelectedSheets(scannedSheets.map(s => s.sheetName));
          }
        } finally {
          setIsScanning(false);
        }
      };
      performScan();
    }
  }, [file, activeGrant]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleImport = async () => {
    if (!file || selectedSheets.length === 0 || !appSettings || !activeGrant) return;

    setIsImporting(true);
    try {
      const sheetsToImport = scanResults.filter(r => selectedSheets.includes(r.sheetName));
      const { assets: newAssets, errors } = await parseExcelFile(file, appSettings, [], sheetsToImport);

      if (errors.length > 0) {
        errors.forEach(e => addNotification({ title: "Import Pulse Error", description: e, variant: "destructive" }));
      }

      if (newAssets.length > 0) {
        // Enqueue all new assets for cloud sync
        for (const asset of newAssets) {
          await enqueueMutation('CREATE', 'assets', {
            ...asset,
            grantId: activeGrantId!,
            lastModified: new Date().toISOString(),
            lastModifiedBy: userProfile?.displayName || 'System Ingestion'
          });
        }

        // Update local store immediately for responsive UX
        const currentLocal = await storage.getAssets();
        await storage.saveAssets([...currentLocal, ...newAssets]);
        
        toast({ title: "Import Pulse Complete", description: `${newAssets.length} records merged to device storage.` });
        await refreshRegistry();
        onOpenChange(false);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setFileName('');
    setScanResults([]);
    setScanErrors([]);
    setSelectedSheets([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedSheets(checked ? scanResults.map(s => s.sheetName) : []);
  };

  const allSelected = scanResults.length > 0 && selectedSheets.length === scanResults.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl bg-black border-white/5 p-0 overflow-hidden rounded-[2.5rem] shadow-3xl text-white">
        <div className="p-10 pb-6 border-b border-white/5 space-y-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Scan and Import Workbook</DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl text-white/40 hover:text-white hover:bg-white/5 h-10 w-10">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <DialogDescription className="text-sm font-medium text-white/40 leading-relaxed italic pr-10">
              Select an Excel file to scan. The system will automatically match sheets to your templates, which you can then review and change before importing.
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[60vh] bg-black">
          <div className="p-10 space-y-8">
            {/* File Selection Area */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 pl-1">Excel File</Label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "h-16 rounded-2xl bg-[#0F0F0F] border-2 border-white/5 flex items-center px-6 gap-4 cursor-pointer transition-all hover:border-primary/40 group shadow-inner",
                  file && "border-primary/20 bg-primary/[0.02]"
                )}
              >
                <div className="p-2 bg-white/5 rounded-xl group-hover:bg-primary/10 transition-colors">
                  <FileSpreadsheet className={cn("h-5 w-5 text-white/40 group-hover:text-primary", file && "text-primary")} />
                </div>
                <span className={cn("text-sm font-black uppercase tracking-tight", file ? "text-white" : "text-white/20")}>
                  {fileName || "Select Registry Workbook..."}
                </span>
                {file && <CheckCircle2 className="ml-auto h-5 w-5 text-primary" />}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" className="hidden" />
            </div>

            {/* Scan Results Card */}
            {(isScanning || scanResults.length > 0 || scanErrors.length > 0) && (
              <Card className="bg-[#0A0A0A] border-2 border-white/5 rounded-[2rem] overflow-hidden shadow-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                <CardHeader className="p-8 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                      <ScanSearch className="h-5 w-5 text-primary" /> Scan Results
                    </CardTitle>
                    {isScanning && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                  </div>
                  <CardDescription className="text-[10px] font-bold uppercase text-white/40 pt-1">
                    Review the automatic matches for the sheets found in your workbook.
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="p-8 space-y-6">
                  {scanErrors.length > 0 && !isScanning && (
                    <div className="p-4 rounded-xl bg-destructive/10 border-2 border-destructive/20 text-destructive text-[10px] font-black uppercase flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4" />
                      {scanErrors[0]}
                    </div>
                  )}

                  {!isScanning && scanResults.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-1">
                        <span className="text-white/60">Found {scanResults.length} compatible sheets</span>
                        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handleSelectAll(!allSelected)}>
                          <span className="text-white/40 group-hover:text-white">Select All</span>
                          <div className={cn(
                            "h-5 w-5 rounded-full border-2 transition-all flex items-center justify-center",
                            allSelected ? "bg-primary border-primary" : "border-white/10 group-hover:border-white/20"
                          )}>
                            {allSelected && <Check className="h-3 w-3 text-black" />}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {scanResults.map(result => (
                          <div key={result.sheetName} className="p-6 rounded-[1.5rem] bg-[#111] border-2 border-white/5 flex flex-col gap-6 group hover:border-primary/20 transition-all">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "h-6 w-6 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer",
                                  selectedSheets.includes(result.sheetName) ? "bg-primary border-primary" : "border-white/10 group-hover:border-white/20"
                                )} onClick={() => setSelectedSheets(prev => prev.includes(result.sheetName) ? prev.filter(s => s !== result.sheetName) : [...prev, result.sheetName])}>
                                  {selectedSheets.includes(result.sheetName) && <Check className="h-3.5 w-3.5 text-black font-black" />}
                                </div>
                                <div className="space-y-0.5">
                                  <h5 className="text-sm font-black uppercase tracking-tight text-white">{result.sheetName}</h5>
                                  <p className="text-[10px] font-bold text-white/40 uppercase">Found {result.rowCount} potential asset rows.</p>
                                </div>
                              </div>
                              <ChevronsUpDown className="h-4 w-4 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase tracking-widest text-white/40 pl-1">Matched Template</Label>
                              <Select 
                                value={result.definitionName} 
                                onValueChange={(v) => setScanResults(prev => prev.map(r => r.sheetName === result.sheetName ? { ...r, definitionName: v } : r))}
                              >
                                <SelectTrigger className="h-12 rounded-xl bg-black border-white/5 text-white font-black text-[10px] uppercase tracking-tighter shadow-sm hover:border-primary/40 transition-all">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-black border-white/10 text-white rounded-xl">
                                  {Object.keys(activeGrant!.sheetDefinitions).map(def => (
                                    <SelectItem key={def} value={def} className="text-[10px] font-black uppercase tracking-widest">{def}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <div className="p-10 bg-[#050505] border-t border-white/5 flex flex-row items-center justify-between gap-4">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="h-14 px-10 rounded-2xl text-white font-black uppercase text-[10px] tracking-[0.2em] hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={isImporting || isScanning || selectedSheets.length === 0}
            className="h-14 px-12 rounded-2xl bg-primary text-black font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-primary/20 flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
            Import {selectedSheets.length} Sheet(s)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
