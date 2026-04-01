"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { addNotification } from '@/hooks/use-notifications';
import { Loader2, FileUp, FileCheck2, AlertTriangle, ScanSearch, ChevronsUpDown, Check, X, Layers } from 'lucide-react';
import { scanExcelFile, parseExcelFile, type ScannedSheetInfo } from '@/lib/excel-parser';
import { getLockedOfflineAssets, saveLockedOfflineAssets } from '@/lib/idb';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

interface ImportScannerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportScannerDialog({ isOpen, onOpenChange }: ImportScannerDialogProps) {
  const { appSettings, setOfflineAssets, setDataSource } = useAppState();
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

  useEffect(() => {
    if (file) {
      const performScan = async () => {
        setIsScanning(true);
        setScanResults([]);
        setScanErrors([]);
        setSelectedSheets([]);
        
        try {
          const { scannedSheets, errors } = await scanExcelFile(file, appSettings);
          
          if (errors.length > 0) {
            setScanErrors(errors);
          }
          if (scannedSheets.length > 0) {
            setScanResults(scannedSheets);
            setSelectedSheets(scannedSheets.map(s => s.sheetName));
          }
        } catch (e: any) {
          toast({ variant: "destructive", title: "Scan Failed", description: e.message });
        } finally {
          setIsScanning(false);
        }
      };
      performScan();
    }
  }, [file, appSettings, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleImport = async () => {
    if (!file || selectedSheets.length === 0) return;

    setIsImporting(true);
    addNotification({ title: 'Importing Pulse...', description: `Processing ${selectedSheets.length} sheet(s).` });

    const baseAssets = await getLockedOfflineAssets();
    const sheetsToImport = scanResults.filter(r => selectedSheets.includes(r.sheetName));

    const { assets: newAssets, updatedAssets, skipped, errors } = await parseExcelFile(file, appSettings, baseAssets, sheetsToImport);

    errors.forEach(error => addNotification({ title: "Import Error", description: error, variant: "destructive" }));

    const allChanges = [...newAssets, ...updatedAssets].map(asset => ({
      ...asset,
      lastModified: new Date().toISOString(),
      lastModifiedBy: userProfile?.displayName,
      lastModifiedByState: userProfile?.state,
      syncStatus: undefined
    }));

    if (allChanges.length > 0) {
      const assetMap = new Map(baseAssets.map(a => [a.id, a]));
      allChanges.forEach(a => assetMap.set(a.id, a));
      const combinedAssets = Array.from(assetMap.values());
      
      await saveLockedOfflineAssets(combinedAssets);
      setOfflineAssets(combinedAssets);
      addNotification({ title: 'Imported to Locked Offline Store', description: `${allChanges.length} records staged for review.` });
      setDataSource('local_locked');
    }

    setIsImporting(false);
    onOpenChange(false);
  };

  const resetState = () => {
    setFile(null);
    setFileName('');
    setIsScanning(false);
    setIsImporting(false);
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
              Select an Excel file to scan for hierarchical groups and asset categories.
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[60vh] bg-black">
          <div className="p-10 space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 pl-1">Target Workbook</Label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "h-16 rounded-2xl bg-[#0F0F0F] border-2 border-white/5 flex items-center px-6 gap-4 cursor-pointer transition-all hover:border-primary/40 group shadow-inner",
                  file && "border-primary/20 bg-primary/[0.02]"
                )}
              >
                <div className="p-2 bg-white/5 rounded-xl group-hover:bg-primary/10 transition-colors">
                  <FileUp className={cn("h-5 w-5 text-white/40 group-hover:text-primary", file && "text-primary")} />
                </div>
                <span className={cn("text-sm font-black uppercase tracking-tight", file ? "text-white" : "text-white/20")}>
                  {fileName || "Choose file pulse..."}
                </span>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" className="hidden" />
            </div>

            {(isScanning || scanResults.length > 0) && (
              <Card className="bg-[#0A0A0A] border-2 border-white/5 rounded-[2rem] overflow-hidden shadow-none">
                <CardHeader className="p-8 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                      <ScanSearch className="h-5 w-5 text-primary" /> Discovery Results
                    </CardTitle>
                    {isScanning && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                  </div>
                </CardHeader>
                
                <CardContent className="p-8 space-y-6">
                  {!isScanning && scanResults.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-1">
                        <span className="text-white/60">Identified {scanResults.length} data sheets</span>
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleSelectAll(!allSelected)}>
                          <span className="text-white/40">Select All</span>
                          <div className={cn(
                            "h-5 w-5 rounded-full border-2 transition-all flex items-center justify-center",
                            allSelected ? "bg-primary border-primary" : "border-white/10"
                          )}>
                            {allSelected && <Check className="h-3 w-3 text-black" />}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {scanResults.map(result => (
                          <div key={result.sheetName} className="p-6 rounded-[1.5rem] bg-[#111] border-2 border-white/5 flex flex-col gap-4 group hover:border-primary/20 transition-all">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "h-6 w-6 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer",
                                  selectedSheets.includes(result.sheetName) ? "bg-primary border-primary text-black" : "border-white/10"
                                )} onClick={() => setSelectedSheets(prev => prev.includes(result.sheetName) ? prev.filter(s => s !== result.sheetName) : [...prev, result.sheetName])}>
                                  {selectedSheets.includes(result.sheetName) && <Check className="h-3.5 w-3.5" />}
                                </div>
                                <div className="space-y-0.5">
                                  <h5 className="text-sm font-black uppercase tracking-tight text-white">{result.sheetName}</h5>
                                  <p className="text-[10px] font-bold text-white/40 uppercase">Assets: {result.rowCount}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="h-6 px-3 border-primary/20 bg-primary/5 text-primary text-[8px] font-black uppercase">{result.definitionName}</Badge>
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
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-14 px-10 rounded-2xl text-white font-black uppercase text-[10px] tracking-[0.2em] hover:bg-white/5">Cancel</Button>
          <Button 
            onClick={handleImport} 
            disabled={isImporting || isScanning || selectedSheets.length === 0}
            className="h-14 px-12 rounded-2xl bg-primary text-black font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-primary/20 flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
            Execute Import
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
