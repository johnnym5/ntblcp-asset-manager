"use client";

/**
 * @fileOverview Import Orchestrator - Two-Stage Ingestion Pulse.
 * Phase 175: Added manual template mapping for unmatched sheets.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { addNotification } from '@/hooks/use-notifications';
import { Loader2, FileCheck2, ScanSearch, Check, X, FileSpreadsheet, ChevronDown, Activity, Info, AlertTriangle } from 'lucide-react';
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
          // Scan for sheets and attempt auto-matching
          const { scannedSheets } = await scanExcelFile(file, activeGrant.sheetDefinitions);
          
          if (scannedSheets.length > 0) {
            setScanResults(scannedSheets);
            // Default to selecting all found sheets
            setSelectedSheets(scannedSheets.map(s => s.sheetName));
            
            const initialMap: Record<string, string> = {};
            scannedSheets.forEach(s => { 
              // Only auto-map if definition name exists, otherwise user must pick
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
  }, [file, activeGrant, toast]);

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
      
      // Filter results to only those selected and apply user's manual template overrides
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
        addNotification({ title: 'Sandbox Ready', description: `${taggedAssets.length} assets ready for review.` });
        setDataSource('SANDBOX');
        await refreshRegistry();
      } else {
        toast({ title: "No Data Extracted", description: "Check that the selected templates match the sheet content." });
      }
      onOpenChange(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl bg-black border-white/10 p-0 overflow-hidden rounded-[1.5rem] text-white">
        <div className="p-8 pb-6 space-y-2">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-black uppercase text-white">Import Asset Pulse</DialogTitle>
              <DialogDescription className="text-[11px] text-white/40">Select sheets to ingest. Match them to learned templates manually if needed.</DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full h-8 w-8"><X className="h-4 w-4" /></Button>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[70vh] bg-black">
          <div className="p-8 pt-0 space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-white/40">Select Workbook</Label>
              <div onClick={() => fileInputRef.current?.click()} className={cn("h-14 rounded-xl bg-[#0A0A0A] border-2 border-white/5 flex items-center px-5 gap-4 cursor-pointer hover:border-primary/40 transition-all", file && "border-primary/20")}>
                <FileSpreadsheet className={cn("h-5 w-5 text-white/40", file && "text-primary")} />
                <span className={cn("text-sm font-bold truncate", file ? "text-white" : "text-white/20")}>{fileName || "Click to upload pulse..."}</span>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" className="hidden" />
            </div>

            {(isScanning || scanResults.length > 0) && (
              <Card className="bg-[#0A0A0A] border-2 border-white/5 rounded-[1.5rem] overflow-hidden shadow-none">
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl font-black uppercase text-white">Discovered Sheets</CardTitle>
                    {isScanning && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-6">
                  {!isScanning && scanResults.length > 0 ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest px-1">
                        <span className="text-white/60">{scanResults.length} Sheets Detected</span>
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleSelectAll(selectedSheets.length < scanResults.length)}>
                          <span className="text-white/40">SELECT ALL</span>
                          <div className={cn("h-5 w-5 rounded-full border-2", selectedSheets.length === scanResults.length ? "bg-primary border-primary text-black" : "border-white/10")}>{selectedSheets.length === scanResults.length && <Check className="h-3 w-3" />}</div>
                        </div>
                      </div>
                      <Separator className="bg-white/5" />
                      <div className="space-y-3">
                        {scanResults.map(result => {
                          const isSelected = selectedSheets.includes(result.sheetName);
                          const hasMatch = !!sheetToTemplateMap[result.sheetName];
                          
                          return (
                            <div key={result.sheetName} className={cn("p-6 rounded-[1.25rem] bg-[#111] border-2 transition-all", isSelected ? "border-primary/20" : "border-white/5")}>
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                  <div onClick={() => setSelectedSheets(prev => isSelected ? prev.filter(s => s !== result.sheetName) : [...prev, result.sheetName])} className={cn("h-6 w-6 rounded-full border-2 flex items-center justify-center cursor-pointer", isSelected ? "bg-primary border-primary text-black" : "border-white/10")}>
                                    {isSelected && <Check className="h-3.5 w-3.5 font-black" />}
                                  </div>
                                  <div className="space-y-0.5">
                                    <h5 className="text-sm font-black uppercase text-white">{result.sheetName}</h5>
                                    <p className="text-[10px] font-bold text-white/40 uppercase">Rows: {result.rowCount}</p>
                                  </div>
                                </div>
                                {!hasMatch && isSelected && (
                                  <Badge variant="outline" className="border-destructive/20 text-destructive bg-destructive/5 text-[8px] font-black uppercase">Template Required</Badge>
                                )}
                              </div>
                              <div className="mt-6 space-y-2">
                                <Label className="text-[9px] font-black uppercase text-white/40">Apply Learned Template</Label>
                                <Select 
                                  value={sheetToTemplateMap[result.sheetName] || ""} 
                                  onValueChange={(v) => setSheetToTemplateMap(prev => ({ ...prev, [result.sheetName]: v }))}
                                >
                                  <SelectTrigger className="h-12 bg-black border-2 border-white/5 text-white font-black text-[11px] uppercase">
                                    <SelectValue placeholder="Select a template..." />
                                  </SelectTrigger>
                                  <SelectContent className="bg-black border-white/10">
                                    {availableTemplates.map(t => (
                                      <SelectItem key={t} value={t} className="text-white font-black uppercase text-[10px]">{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : !isScanning && (
                    <div className="py-10 text-center opacity-40 flex flex-col items-center gap-4">
                      <AlertTriangle className="h-10 w-10 text-destructive" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No Sheets Found in Workbook</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <div className="p-8 bg-[#050505] border-t border-white/5 flex items-center justify-end gap-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-14 px-10 rounded-2xl text-white font-black uppercase text-[10px]">Cancel</Button>
          <Button 
            onClick={handleImport} 
            disabled={isImporting || isScanning || selectedSheets.length === 0} 
            className="h-14 px-12 rounded-2xl bg-primary text-black font-black uppercase text-[10px] shadow-2xl shadow-primary/20 gap-3 transition-transform hover:scale-105"
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
            Execute Ingestion Pulse
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}