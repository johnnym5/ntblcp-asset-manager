
"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { addNotification } from '@/hooks/use-notifications';
import { Loader2, FileUp, FileCheck2, AlertTriangle, ScanSearch, ChevronsUpDown } from 'lucide-react';
import { scanExcelFile, parseExcelFile, type ScannedSheetInfo } from '@/lib/excel-parser';
import { getLockedOfflineAssets, saveLockedOfflineAssets } from '@/lib/idb';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ImportScannerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function ImportScannerDialog({ isOpen, onOpenChange }: ImportScannerDialogProps) {
  const { appSettings, setOfflineAssets, setDataSource, activeGrantId } = useAppState();
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
        
        const { scannedSheets, errors } = await scanExcelFile(file, activeGrant.sheetDefinitions);
        
        if (errors.length > 0) {
          setScanErrors(errors);
        }
        if (scannedSheets.length > 0) {
          setScanResults(scannedSheets);
          // Auto-select all found sheets by default
          setSelectedSheets(scannedSheets.map(s => s.sheetName));
        }
        setIsScanning(false);
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
    if (!file || selectedSheets.length === 0 || !appSettings || !activeGrant) {
      toast({ title: 'Nothing to Import', description: 'Please select a file and at least one sheet to import.', variant: 'destructive' });
      return;
    }

    setIsImporting(true);
    addNotification({ title: 'Importing Selected Sheets...', description: `Processing ${selectedSheets.length} sheet(s).` });

    const baseAssets = await getLockedOfflineAssets();
    const sheetsToImport = scanResults.filter(r => selectedSheets.includes(r.sheetName));

    const { assets: newAssets, updatedAssets, skipped, errors } = await parseExcelFile(file, activeGrant.sheetDefinitions, appSettings.lockAssetList, baseAssets, sheetsToImport);

    errors.forEach(error => addNotification({ title: "Import Error", description: error, variant: "destructive" }));
    if (skipped > 0) {
      addNotification({ title: "Import Notice", description: `${skipped} assets were skipped (either duplicates or because the list is locked).` });
    }

    const allChanges = [...newAssets, ...updatedAssets].map(asset => ({
      ...asset,
      grantId: activeGrantId,
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
      addNotification({ title: 'Imported to Locked Offline Store', description: `${allChanges.length} changes saved for review.` });
      setDataSource('local_locked');
      
    } else if (errors.length === 0) {
      addNotification({ title: "No New Data Imported", description: "No new or updated assets were found in the selected sheets." });
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
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSheets(scanResults.map(s => s.sheetName));
    } else {
      setSelectedSheets([]);
    }
  };

  const handleSelectSheet = (sheetName: string, checked: boolean) => {
    setSelectedSheets(prev => checked ? [...prev, sheetName] : prev.filter(s => s !== sheetName));
  };
  
  const allSelected = scanResults.length > 0 && selectedSheets.length === scanResults.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Scan and Import Workbook</DialogTitle>
          <DialogDescription>
            Select an Excel file to scan. The system will automatically match sheets to your templates, which you can then review and change before importing.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Excel File</Label>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning || isImporting}
            >
              <FileUp className="mr-2 h-4 w-4" />
              {fileName || "Select a file..."}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls"
              className="hidden"
            />
          </div>
          
          {(isScanning || scanResults.length > 0 || scanErrors.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Scan Results</CardTitle>
                <CardDescription>
                  {isScanning 
                    ? "Scanning your workbook for asset data..." 
                    : "Review the automatic matches for the sheets found in your workbook."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isScanning && <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}
                
                {scanErrors.length > 0 && !isScanning && (
                   <div className="text-destructive bg-destructive/10 p-3 rounded-md text-sm flex items-center gap-2">
                     <AlertTriangle className="h-5 w-5" />
                     <div>{scanErrors.map((e, i) => <p key={i}>{e}</p>)}</div>
                   </div>
                )}
                
                {scanResults.length > 0 && !isScanning && activeGrant && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2">
                       <Label className="font-semibold">Found {scanResults.length} compatible sheets</Label>
                       <div className="flex items-center gap-2">
                           <Label htmlFor="select-all" className="text-sm">Select All</Label>
                           <Checkbox id="select-all" checked={allSelected} onCheckedChange={(checked) => handleSelectAll(checked as boolean)} />
                       </div>
                    </div>
                    <Separator />
                    <ScrollArea className="h-[250px] pr-3">
                      <div className="space-y-2 p-1">
                        {scanResults.map(result => (
                          <Collapsible key={result.sheetName} asChild>
                            <div className="p-3 rounded-md border bg-muted/50">
                                <div className="flex items-center">
                                    <Checkbox
                                        id={`sheet-${result.sheetName}`}
                                        className="mr-3 mt-1 self-start"
                                        checked={selectedSheets.includes(result.sheetName)}
                                        onCheckedChange={(checked) => handleSelectSheet(result.sheetName, checked as boolean)}
                                    />
                                    <Label htmlFor={`sheet-${result.sheetName}`} className="flex-1 cursor-pointer">
                                        <p className="font-medium">{result.sheetName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Found {result.rowCount} potential asset rows.
                                        </p>
                                    </Label>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <ChevronsUpDown className="h-4 w-4" />
                                            <span className="sr-only">View headers</span>
                                        </Button>
                                    </CollapsibleTrigger>
                                </div>
                                <div className="pl-7 pt-3 space-y-1">
                                    <Label className="text-xs font-semibold">Matched Template</Label>
                                    <Select
                                        value={result.definitionName}
                                        onValueChange={(newDefName) => {
                                            const newScanResults = scanResults.map(r => 
                                                r.sheetName === result.sheetName 
                                                    ? { ...r, definitionName: newDefName } 
                                                    : r
                                            );
                                            setScanResults(newScanResults);
                                        }}
                                    >
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(activeGrant.sheetDefinitions).map(defName => (
                                                <SelectItem key={defName} value={defName} className="text-sm">{defName}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <CollapsibleContent className="pt-3 mt-3 border-t">
                                    <div className="pl-7">
                                        <p className="text-xs font-semibold text-muted-foreground mb-2">Headers Found in File:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {result.headers.map((header, i) => (
                                                <Badge key={i} variant="secondary" className="font-normal">{header}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </div>
                          </Collapsible>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleImport} disabled={isImporting || isScanning || selectedSheets.length === 0}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck2 className="mr-2 h-4 w-4" />}
            Import {selectedSheets.length > 0 ? selectedSheets.length : ''} Sheet(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
