
"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileDown,
  FileUp,
  MoreHorizontal,
  PlusCircle,
  Loader2,
  Trash2,
  X,
  Cloud,
  HardDrive,
  ArrowLeft,
  Folder,
  Edit,
} from "lucide-react";
import { AlertDialogTrigger } from "@radix-ui/react-alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

import { AssetForm } from "./asset-form";
import type { Asset } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { parseExcelFile, exportToExcel } from "@/lib/excel-parser";
import { useAuth } from "@/contexts/auth-context";
import { TARGET_SHEETS } from "@/lib/constants";
import { getAssetsListener, updateAsset, deleteAsset, saveAssetsToFirestore, batchDeleteAssets } from "@/lib/firestore";

export default function AssetList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const [view, setView] = useState<'dashboard' | 'table'>('dashboard');
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

  useEffect(() => {
    if (!userProfile) {
        setIsLoading(true);
        return;
    }
    
    setIsLoading(true);
    const unsubscribe = getAssetsListener((loadedAssets) => {
        setAssets(loadedAssets);
        setIsLoading(false);
    }, userProfile);

    return () => unsubscribe();
  }, [userProfile]);

  const assetsByCategory = useMemo(() => {
    return assets.reduce((acc, asset) => {
        const category = asset.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(asset);
        return acc;
    }, {} as { [key: string]: Asset[] });
  }, [assets]);
  
  const currentAssets = useMemo(() => {
    if (view === 'table' && currentCategory) {
        return assetsByCategory[currentCategory] || [];
    }
    return [];
  }, [view, currentCategory, assetsByCategory]);

  const handleAddAsset = () => {
    setSelectedAsset(undefined);
    setIsFormOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsFormOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (assetToDelete) {
        toast({ title: "Deleting Asset...", description: `Removing "${assetToDelete.description}"` });
        try {
            await deleteAsset(assetToDelete);
            toast({ title: "Asset Deleted", description: `Asset was successfully removed.`});
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Delete Failed", description: error.message });
        }
    }
    setAssetToDelete(null);
    setIsDeleteDialogOpen(false);
  }

  const handleBatchDelete = async () => {
    setIsBatchDeleting(true);
    const assetsToDelete = assets.filter(asset => selectedAssetIds.includes(asset.id));
    toast({ title: "Deleting Assets...", description: `Removing ${assetsToDelete.length} selected assets.` });
    try {
        await batchDeleteAssets(assetsToDelete);
        toast({ title: "Assets Deleted", description: `Successfully removed ${assetsToDelete.length} assets.`});
        setSelectedAssetIds([]);
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Batch Delete Failed", description: error.message });
    } finally {
        setIsBatchDeleting(false);
    }
  }

  const handleSaveAsset = async (assetToSave: Asset) => {
    toast({ title: "Saving Asset...", description: "Your changes are being saved." });
    try {
        const assetWithSync = { ...assetToSave, syncStatus: 'synced' as const };
        await updateAsset(assetWithSync);
        toast({ title: "Saved Successfully", description: "Asset changes have been saved." });
        setIsFormOpen(false);
    } catch(e: any) {
        toast({ variant: 'destructive', title: "Save Failed", description: e.message });
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    toast({ title: "Parsing file...", description: "Please wait while we process your Excel file." });
    
    const { assetsBySheet, errors, skippedRows } = await parseExcelFile(file);
    
    errors.forEach(error => toast({ title: "Import Error", description: error, variant: "destructive" }));
    if (skippedRows > 0) {
        toast({ title: "Import Notice", description: `${skippedRows} rows were skipped due to missing required fields.` });
    }

    if (Object.keys(assetsBySheet).length > 0) {
        try {
            toast({ title: "Syncing to Server...", description: "This may take a moment." });
            const totalSaved = await saveAssetsToFirestore(assetsBySheet);
            toast({ title: "Import Successful", description: `Successfully saved ${totalSaved} new assets.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Sync Failed", description: error.message });
        }
    } else if (errors.length === 0) {
        toast({ title: "No Data Found", description: "No valid asset sheets were found in the file."});
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsImporting(false);
  };
  
  const handleExportClick = () => {
    const assetsToExport = view === 'table' ? currentAssets : assets;
    if (assetsToExport.length === 0) {
      toast({ title: "No Data to Export", description: "There are no assets in the current view to export." });
      return;
    }
    try {
      const exportCategory = currentCategory || 'all-assets';
      exportToExcel(assetsToExport, `asset-export-${exportCategory}-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Export Successful" });
    } catch(error) {
      toast({ title: "Export Failed", variant: "destructive" });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedAssetIds(checked ? currentAssets.map(a => a.id) : []);
  };

  const handleSelectSingle = (assetId: string, checked: boolean) => {
    setSelectedAssetIds(prev => checked ? [...prev, assetId] : prev.filter(id => id !== assetId));
  };
  
  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (view === 'dashboard') {
    return (
      <div className="flex flex-col h-full gap-4">
        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx, .xls" className="hidden" />
        <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight flex-1">
                Asset Dashboard
            </h2>
            <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={handleImportClick} disabled={isImporting}>
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                    Import
                </Button>
                <Button variant="outline" onClick={handleExportClick}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export All
                </Button>
                <Button onClick={handleAddAsset}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Asset
                </Button>
            </div>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Total Assets: {assets.length}</CardTitle>
            </CardHeader>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {TARGET_SHEETS.map(category => (
                <Card key={category} className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{category}</CardTitle>
                        <Folder className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{assetsByCategory[category]?.length || 0}</div>
                        <Button variant="link" className="p-0 h-auto mt-2" onClick={() => { setView('table'); setCurrentCategory(category); }}>View Assets</Button>
                    </CardContent>
                </Card>
            ))}
        </div>
        <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={selectedAsset} onSave={handleSaveAsset} />
      </div>
    )
  }

  // TABLE VIEW
  return (
    <div className="flex flex-col h-full gap-4">
        <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => { setView('dashboard'); setCurrentCategory(null); setSelectedAssetIds([]); }}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold tracking-tight flex-1">
                {currentCategory}
            </h2>
            {selectedAssetIds.length > 0 ? (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{selectedAssetIds.length} selected</span>
                    <Button variant="destructive" size="sm" onClick={handleBatchDelete} disabled={isBatchDeleting}>
                        {isBatchDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete
                    </Button>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={handleExportClick}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                    <Button onClick={handleAddAsset}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Asset
                    </Button>
                </div>
            )}
        </div>
        
        <div className="rounded-lg border shadow-sm flex-1 overflow-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[50px]">
                        <Checkbox
                            checked={currentAssets.length > 0 && selectedAssetIds.length === currentAssets.length}
                            onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        />
                    </TableHead>
                    <TableHead>S/N</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Sync Status</TableHead>
                    <TableHead className="w-[50px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {currentAssets.length > 0 ? (
                    currentAssets.map((asset) => (
                        <TableRow key={asset.id} data-state={selectedAssetIds.includes(asset.id) && "selected"}>
                        <TableCell>
                            <Checkbox 
                                checked={selectedAssetIds.includes(asset.id)}
                                onCheckedChange={(checked) => handleSelectSingle(asset.id, checked as boolean)}
                            />
                        </TableCell>
                        <TableCell>{asset.sn || 'N/A'}</TableCell>
                        <TableCell className="font-medium">{asset.description}</TableCell>
                        <TableCell>{asset.serialNumber || asset.chasisNo || 'N/A'}</TableCell>
                        <TableCell className="hidden md:table-cell">{asset.location}</TableCell>
                        <TableCell><Badge variant="secondary">{asset.condition}</Badge></TableCell>
                        <TableCell>
                            {asset.syncStatus === 'synced' ? (
                                <Badge variant="outline" className="text-green-600 border-green-600"><Cloud className="mr-2 h-3 w-3"/>Synced</Badge>
                            ) : (
                                <Badge variant="secondary"><HardDrive className="mr-2 h-3 w-3"/>Local</Badge>
                            )}
                        </TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditAsset(asset)}>View/Edit</DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => { setAssetToDelete(asset); setIsDeleteDialogOpen(true); }} className="text-destructive focus:bg-destructive/20">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                        <TableRow><TableCell colSpan={8} className="text-center h-24">No assets found in this category.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
        <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={selectedAsset} onSave={handleSaveAsset} />
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the asset
                        and remove its data from our servers.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
