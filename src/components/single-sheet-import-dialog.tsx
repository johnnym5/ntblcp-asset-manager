"use client";

/**
 * @fileOverview Import Orchestrator - High-Fidelity Design pulse.
 * Matches the requested mockup with Scan Results, Template Matching, and Black/Gold theme.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { addNotification } from '@/hooks/use-notifications';
import { Loader2, FileUp, FileCheck2, ScanSearch, Check, X, Layers, FileSpreadsheet, ChevronDown, CheckCircle2 } from 'lucide-react';
import { scanExcelFile, parseExcelFile, type ScannedSheetInfo } from '@/lib/excel-parser';
import { storage } from '@/offline/storage';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from './ui/separator';

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
          const { scannedSheets } = await scanExcelFile(file, activeGrant.sheetDefinitions);
          
          if (scannedSheets.length > 0) {
            setScanResults(scannedSheets);
            setSelectedSheets(scannedSheets.map(s => s.sheetName));
            
            const initialMap: Record<string, string> = {};
            scannedSheets.forEach(s => {
              initialMap[s.sheetName] = s.definitionName;
            });
            setSheetToTemplateMap(initialMap);
          }
        } catch (e: any) {
          toast({ variant: "destructive", title: "Scan Failed" });
        } finally {
          setIsScanning(false);
        }
      };
      performScan();
    }
  }, [file, activeGrant, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleImport = async () => {
    if (!file || selectedSheets.length === 0 || !activeGrant) return;

    setIsImporting(true);
    addNotification({ title: 'Importing Pulse...', description: `Processing ${selectedSheets.length} sheet(s).` });

    try {
      const existingAssets = await storage.getAssets();
      
      // Update scan results with user-selected templates before passing to parser
      const sheetsToImport = scanResults
        .filter(r => selectedSheets.includes(r.sheetName))
        .map(r => ({
          ...r,
          definitionName: sheetToTemplateMap[r.sheetName] || r.definitionName
        }));

      const { assets: newAssets, errors } = await parseExcelFile(
        file, 
        activeGrant.sheetDefinitions, 
        existingAssets, 
        sheetsToImport
      );

      errors.forEach(error => addNotification({ title: "Import Error", description: error, variant: "destructive" }));

      const allChanges = newAssets.map(asset => ({
        ...asset,
        grantId: activeGrant.id,
        lastModified: new Date().toISOString(),
        lastModifiedBy: userProfile?.displayName || 'System Import',
      }));

      if (allChanges.length > 0) {
        await storage.saveToSandbox(allChanges);
        addNotification({ title: 'Sandbox Populated', description: `${allChanges.length} records staged for review.` });
        setDataSource('SANDBOX');
        await refreshRegistry();
      }

      handleOpenChange(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Import Failure" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedSheets(checked ? scanResults.map(s => s.sheetName) : []);
  };

  const resetState = () => {
    setFile(null);
    setFileName('');
    setScanResults([]);
    setSelectedSheets([]);
    setSheetToTemplateMap({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const allSelected = scanResults.length > 0 && selectedSheets.length === scanResults.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl bg-black border-white/10 p-0 overflow-hidden rounded-[1.5rem] shadow-3xl text-white">
        <div className="p-8 pb-6 space-y-2">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-white">Scan and Import Workbook</DialogTitle>
              <DialogDescription className="text-[11px] font-medium text-white/40 leading-relaxed pr-10">
                Select an Excel file to scan. The system will automatically match sheets to your templates, which you can then review and change before importing.
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleOpenChange(false)} className="rounded-full text-white/40 hover:text-white hover:bg-white/5 h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[70vh] bg-black">
          <div className="p-8 pt-0 space-y-8">
            {/* 1. File Selection Display */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 pl-1">Excel File</Label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "h-14 rounded-xl bg-[#0A0A0A] border-2 border-white/5 flex items-center px-5 gap-4 cursor-pointer transition-all hover:border-primary/40 group",
                  file && "border-primary/20 bg-primary/[0.02]"
                )}
              >
                <FileSpreadsheet className={cn("h-5 w-5 text-white/40 transition-colors", file && "text-primary")} />
                <span className={cn("text-sm font-bold truncate", file ? "text-white" : "text-white/20")}>
                  {fileName || "Click to upload pulse..."}
                </span>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" className="hidden" />
            </div>

            {/* 2. Scan Results Card */}
            {(isScanning || scanResults.length > 0) && (
              <Card className="bg-[#0A0A0A] border-2 border-white/5 rounded-[1.5rem] overflow-hidden shadow-none transition-all duration-500">
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-3xl font-black uppercase tracking-tight text-white">Scan Results</CardTitle>
                      <CardDescription className="text-[11px] font-medium text-white/40">Review the automatic matches for the sheets found in your workbook.</CardDescription>
                    </div>
                    {isScanning && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
                  </div>
                </CardHeader>
                
                <CardContent className="p-8 pt-4 space-y-6">
                  {!isScanning && scanResults.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest px-1">
                        <span className="text-white/60">Found {scanResults.length} compatible sheets</span>
                        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handleSelectAll(!allSelected)}>
                          <span className="text-white/40 group-hover:text-white transition-colors">Select All</span>
                          <div className={cn(
                            "h-5 w-5 rounded-full border-2 transition-all flex items-center justify-center",
                            allSelected ? "bg-primary border-primary text-black" : "border-white/10"
                          )}>
                            {allSelected && <Check className="h-3 w-3 font-black" />}
                          </div>
                        </div>
                      </div>

                      <Separator className="bg-white/5" />

                      <div className="space-y-3">
                        {scanResults.map(result => {
                          const isSelected = selectedSheets.includes(result.sheetName);
                          return (
                            <div 
                              key={result.sheetName} 
                              className={cn(
                                "p-6 rounded-[1.25rem] bg-[#111] border-2 transition-all group",
                                isSelected ? "border-primary/20" : "border-white/5"
                              )}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                  <div 
                                    className={cn(
                                      "h-6 w-6 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer",
                                      isSelected ? "bg-primary border-primary text-black" : "border-white/10"
                                    )} 
                                    onClick={() => setSelectedSheets(prev => isSelected ? prev.filter(s => s !== result.sheetName) : [...prev, result.sheetName])}
                                  >
                                    {isSelected && <Check className="h-3.5 w-3.5 font-black" />}
                                  </div>
                                  <div className="space-y-0.5">
                                    <h5 className="text-sm font-black uppercase tracking-tight text-white">{result.sheetName}</h5>
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-tight">Found {result.rowCount} potential asset rows.</p>
                                  </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-white"><ChevronDown className="h-4 w-4" /></Button>
                              </div>

                              <div className="mt-6 space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 pl-1">Matched Template</Label>
                                <Select 
                                  value={sheetToTemplateMap[result.sheetName]} 
                                  onValueChange={(v) => setSheetToTemplateMap(prev => ({ ...prev, [result.sheetName]: v }))}
                                >
                                  <SelectTrigger className="h-12 rounded-xl bg-black border-2 border-white/5 text-white font-black uppercase text-[11px] tracking-widest focus:ring-primary/20 shadow-lg">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-black border-white/10 rounded-xl">
                                    {availableTemplates.map(t => (
                                      <SelectItem key={t} value={t} className="text-white font-black uppercase text-[10px] tracking-widest focus:bg-white/10 focus:text-primary">{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <div className="p-8 bg-[#050505] border-t border-white/5 flex flex-row items-center justify-end gap-4">
          <Button variant="ghost" onClick={() => handleOpenChange(false)} className="h-14 px-10 rounded-2xl text-white font-black uppercase text-[10px] tracking-[0.2em] hover:bg-white/5">Cancel</Button>
          <Button 
            onClick={handleImport} 
            disabled={isImporting || isScanning || selectedSheets.length === 0}
            className="h-14 px-12 rounded-2xl bg-primary text-black font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-primary/20 flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
            Import {selectedSheets.length > 0 ? selectedSheets.length : ''} Sheet(s)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
