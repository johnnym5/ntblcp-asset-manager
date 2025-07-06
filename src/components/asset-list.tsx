
"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileDown,
  FileUp,
  MoreHorizontal,
  PlusCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AssetForm } from "./asset-form";
import type { Asset } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { parseExcelFile, exportToExcel } from "@/lib/excel-parser";
import { saveAssetsToFirestore, getAssetsListener, deleteAsset } from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { TARGET_SHEETS } from "@/lib/constants";

export default function AssetList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const [categoryFilter, setCategoryFilter] = useState('All Sheets');

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = getAssetsListener(
        (loadedAssets) => {
            setAssets(loadedAssets);
            setIsLoading(false);
        },
        userProfile
    );

    return () => unsubscribe();
  }, [userProfile]);

  const handleAddAsset = () => {
    setSelectedAsset(undefined);
    setIsFormOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsFormOpen(true);
  };
  
  const handleDeleteAsset = async (asset: Asset) => {
      if(confirm(`Are you sure you want to delete "${asset.description}"?`)) {
          try {
              await deleteAsset(asset);
              toast({ title: "Asset Deleted", description: `Asset "${asset.description}" deleted successfully.`});
          } catch(e) {
              toast({ title: "Error", description: "Failed to delete asset.", variant: "destructive"});
          }
      }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    toast({ title: "Importing file...", description: "Please wait while we process your Excel file." });
    
    const { assetsBySheet, errors, skippedRows } = await parseExcelFile(file);
    
    if (errors.length > 0) {
      errors.forEach(error => toast({ title: "Import Error", description: error, variant: "destructive" }));
    }
    
    if (skippedRows > 0) {
        toast({ title: "Import Notice", description: `${skippedRows} rows were skipped due to missing required fields.` });
    }

    const sheetNames = Object.keys(assetsBySheet);
    if (sheetNames.length > 0) {
      try {
        const count = await saveAssetsToFirestore(assetsBySheet);
        toast({
          title: "Import Successful",
          description: `Successfully imported ${count} assets from ${sheetNames.length} sheets: ${sheetNames.join(", ")}.`,
        });
      } catch (error) {
        toast({ title: "Firestore Error", description: "Could not save assets to the database.", variant: "destructive" });
      }
    } else if (errors.length === 0) {
        toast({ title: "No Data Found", description: "No valid sheets for import were found in the file."});
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsImporting(false);
  };

  const filteredAssets = useMemo(() => {
    if (categoryFilter === 'All Sheets') {
      return assets;
    }
    return assets.filter(asset => asset.category === categoryFilter);
  }, [assets, categoryFilter]);
  
  const handleExportClick = () => {
    if (filteredAssets.length === 0) {
      toast({ title: "No Data to Export", description: "There are no assets in the current view to export." });
      return;
    }
    try {
      const exportCategory = categoryFilter !== 'All Sheets' ? categoryFilter : 'all-categories';
      exportToExcel(filteredAssets, `asset-export-${exportCategory}-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Export Successful" });
    } catch(error) {
      toast({ title: "Export Failed", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".xlsx, .xls"
        className="hidden"
      />
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-2xl font-bold tracking-tight flex-1">
          Asset Register
        </h2>
        <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="hidden sm:flex" onClick={handleImportClick} disabled={isImporting}>
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              Import
            </Button>
            <Button variant="outline" className="hidden sm:flex" onClick={handleExportClick}>
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={handleAddAsset} disabled={true}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Asset (Manual)
            </Button>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 p-4 border rounded-lg bg-card">
        <div className="w-full sm:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Filter by sheet..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Sheets">All Sheets</SelectItem>
              {TARGET_SHEETS.map(sheet => (
                <SelectItem key={sheet} value={sheet}>{sheet}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border shadow-sm flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S/N</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead className="w-[50px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="mx-auto my-4 h-8 w-8 animate-spin" /></TableCell></TableRow>
            ) : filteredAssets.length > 0 ? (
              filteredAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>{asset.sn}</TableCell>
                  <TableCell className="font-medium">{asset.description}</TableCell>
                  <TableCell>{asset.serialNumber || asset.chasisNo || 'N/A'}</TableCell>
                  <TableCell className="hidden md:table-cell">{asset.location}</TableCell>
                  <TableCell><Badge variant="secondary">{asset.condition}</Badge></TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditAsset(asset)}>View/Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteAsset(asset)} className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow><TableCell colSpan={6} className="text-center h-24">No assets found matching your criteria.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AssetForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        asset={selectedAsset}
      />
    </div>
  );
}
