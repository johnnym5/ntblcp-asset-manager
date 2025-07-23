
"use client";

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { addNotification } from '@/hooks/use-notifications';
import { Loader2, FileUp } from 'lucide-react';
import { parseExcelFile } from '@/lib/excel-parser';
import { getLockedOfflineAssets, saveLockedOfflineAssets } from '@/lib/idb';
import { Label } from './ui/label';

interface SingleSheetImportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function SingleSheetImportDialog({ isOpen, onOpenChange }: SingleSheetImportDialogProps) {
  const { appSettings, setOfflineAssets, setDataSource } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setFileName(file.name);
      try {
        const buffer = await file.arrayBuffer();
        setFileBuffer(buffer);
      } catch (error) {
        toast({
            title: 'File Read Error',
            description: 'Could not read the selected file. Please try again.',
            variant: 'destructive'
        });
        console.error("Error reading file to buffer:", error);
      }
    }
  };

  const handleImport = async () => {
    if (!fileBuffer || !selectedSheet) {
      toast({ title: 'Missing Information', description: 'Please select a sheet and a file to import.', variant: 'destructive' });
      return;
    }

    setIsImporting(true);
    addNotification({ title: `Importing ${selectedSheet}...`, description: "Please wait..." });

    const baseAssets = await getLockedOfflineAssets();
    const { assets: newAssets, updatedAssets, skipped, errors } = await parseExcelFile(fileBuffer, appSettings, baseAssets, selectedSheet);

    errors.forEach(error => addNotification({ title: "Import Error", description: error, variant: "destructive" }));
    if (skipped > 0) {
      addNotification({ title: "Import Notice", description: `${skipped} assets were skipped as they already exist.` });
    }

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
      addNotification({ title: 'Imported to Locked Offline Store', description: `${allChanges.length} changes for ${selectedSheet} saved.` });
      setDataSource('local_locked');
      
    } else if (errors.length === 0) {
      addNotification({ title: "No Changes Detected", description: `No new or updated assets were found for ${selectedSheet}.` });
    }

    setIsImporting(false);
    onOpenChange(false); // Close dialog on completion
  };

  const resetState = () => {
    setSelectedSheet('');
    setFileBuffer(null);
    setFileName('');
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

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Single Sheet</DialogTitle>
          <DialogDescription>
            Select a target sheet category, then upload an Excel file. Only the sheet matching the selected category will be imported.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sheet-select">Target Sheet Category</Label>
            <Select onValueChange={setSelectedSheet} value={selectedSheet}>
              <SelectTrigger id="sheet-select">
                <SelectValue placeholder="Select a sheet..." />
              </SelectTrigger>
              <SelectContent>
                {appSettings.enabledSheets.sort().map(sheetName => (
                  <SelectItem key={sheetName} value={sheetName}>{sheetName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="file-upload">Excel File</Label>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
              onClick={() => fileInputRef.current?.click()}
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
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleImport} disabled={isImporting || !fileBuffer || !selectedSheet}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
