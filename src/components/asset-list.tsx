
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
  ArrowLeft,
  Folder,
  Edit,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

import { AssetForm } from "./asset-form";
import type { Asset } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { parseExcelFile, exportToExcel } from "@/lib/excel-parser";
import { TARGET_SHEETS } from "@/lib/constants";
import { MultiSelectFilter, type OptionType } from "./multi-select-filter";
import { useAppState } from "@/contexts/app-state-context";

export default function AssetList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormReadOnly, setIsFormReadOnly] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // No initial loading from firestore
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [view, setView] = useState<'dashboard' | 'table'>('dashboard');
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

  // --- Filter State ---
  const { searchTerm, isOnline } = useAppState();
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  // --- Mode Change Notifier ---
  useEffect(() => {
    toast({
        title: `Mode Changed to ${isOnline ? 'Online' : 'Offline'}`,
        description: isOnline 
            ? 'Application is now connected to the server.'
            : 'Application is running in offline mode. Changes are saved locally.',
    });
    // Here you would typically trigger data sync logic based on the mode.
    // e.g., if (isOnline) { syncLocalData(); }
  }, [isOnline, toast]);


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
  
  // --- Memoized Filter Options ---
  const locationOptions = useMemo<OptionType[]>(() => {
    if (view !== 'table' || !currentCategory) return [];
    const locations = new Set((assetsByCategory[currentCategory] || []).map(a => a.location).filter(Boolean));
    return Array.from(locations).map(l => ({ label: l!, value: l! })).sort((a,b) => a.label.localeCompare(b.label));
  }, [view, currentCategory, assetsByCategory]);

  const assigneeOptions = useMemo<OptionType[]>(() => {
      if (view !== 'table' || !currentCategory) return [];
      const assignees = new Set((assetsByCategory[currentCategory] || []).map(a => a.assignee).filter(Boolean));
      return Array.from(assignees).map(a => ({ label: a!, value: a! })).sort((a,b) => a.label.localeCompare(b.label));
  }, [view, currentCategory, assetsByCategory]);

  const statusOptions: OptionType[] = [
      { value: "Verified", label: "Verified" },
      { value: "Unverified", label: "Unverified" },
      { value: "Discrepancy", label: "Discrepancy" },
  ];
  
  // --- Memoized Filtered Assets ---
  const filteredAssets = useMemo(() => {
    if (view !== 'table' || !currentCategory) return [];
    const baseAssets = assetsByCategory[currentCategory] || [];

    return baseAssets.filter(asset => {
        const searchMatch = !searchTerm || Object.values(asset).some(value =>
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
        const locationMatch = selectedLocations.length === 0 || (asset.location && selectedLocations.includes(asset.location));
        const assigneeMatch = selectedAssignees.length === 0 || (asset.assignee && selectedAssignees.includes(asset.assignee));
        const statusMatch = selectedStatuses.length === 0 || (asset.verifiedStatus && selectedStatuses.includes(asset.verifiedStatus));

        return searchMatch && locationMatch && assigneeMatch && statusMatch;
    });
  }, [view, currentCategory, assetsByCategory, searchTerm, selectedLocations, selectedAssignees, selectedStatuses]);


  const handleAddAsset = () => {
    setSelectedAsset(undefined);
    setIsFormReadOnly(false);
    setIsFormOpen(true);
  };
  
  const handleViewAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsFormReadOnly(true);
    setIsFormOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsFormReadOnly(false);
    setIsFormOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (assetToDelete) {
        toast({ title: "Deleting Asset...", description: `Removing "${assetToDelete.description}"` });
        setAssets(prev => prev.filter(a => a.id !== assetToDelete.id));
        toast({ title: "Asset Deleted", description: `Asset was successfully removed.`});
    }
    setAssetToDelete(null);
    setIsDeleteDialogOpen(false);
  }

  const handleBatchDelete = async () => {
    setIsBatchDeleting(true);
    const assetsToDeleteCount = selectedAssetIds.length;
    toast({ title: "Deleting Assets...", description: `Removing ${assetsToDeleteCount} selected assets.` });
    
    setAssets(prev => prev.filter(asset => !selectedAssetIds.includes(asset.id)));
    
    toast({ title: "Assets Deleted", description: `Successfully removed ${assetsToDeleteCount} assets.`});
    setSelectedAssetIds([]);
    setIsBatchDeleting(false);
  }

  const handleSaveAsset = async (assetToSave: Asset) => {
    toast({ title: "Saving Asset Locally...", description: "Your changes are being saved." });
    setAssets(prev => {
        const existingAsset = prev.find(a => a.id === assetToSave.id);
        if (existingAsset) {
            return prev.map(a => a.id === assetToSave.id ? assetToSave : a);
        }
        return [...prev, assetToSave];
    });
    toast({ title: "Saved Successfully", description: "Asset changes have been saved locally." });
    setIsFormOpen(false);
  };

  const handleQuickSaveAsset = async (assetId: string, data: { remarks?: string; verifiedStatus?: 'Verified' | 'Unverified' | 'Discrepancy', verifiedDate?: string }) => {
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...data } : a));
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

    const allNewAssets = Object.values(assetsBySheet).flat();
    if (allNewAssets.length > 0) {
        // Data is saved locally to the state
        setAssets(prev => [...prev, ...allNewAssets]);
        toast({ title: "Import Successful", description: `Successfully imported ${allNewAssets.length} new assets. Data is saved locally.` });
    } else if (errors.length === 0) {
        toast({ title: "No Data Found", description: "No valid asset sheets were found in the file."});
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsImporting(false);
  };
  
  const handleExportClick = () => {
    const assetsToExport = view === 'table' ? filteredAssets : assets;
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
    setSelectedAssetIds(checked ? filteredAssets.map(a => a.id) : []);
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
        <AssetForm 
          isOpen={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          asset={selectedAsset} 
          onSave={handleSaveAsset}
          onQuickSave={handleQuickSaveAsset}
          isReadOnly={isFormReadOnly} 
        />
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
        
        <div className="flex flex-wrap items-center gap-2 border-b pb-4">
          <MultiSelectFilter
            title="Location"
            options={locationOptions}
            selected={selectedLocations}
            onChange={setSelectedLocations}
          />
          <MultiSelectFilter
            title="Assignee"
            options={assigneeOptions}
            selected={selectedAssignees}
            onChange={setSelectedAssignees}
          />
          <MultiSelectFilter
            title="Status"
            options={statusOptions}
            selected={selectedStatuses}
            onChange={setSelectedStatuses}
          />
        </div>
        
        <div className="rounded-lg border shadow-sm flex-1 overflow-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[50px]">
                        <Checkbox
                            checked={filteredAssets.length > 0 && selectedAssetIds.length === filteredAssets.length}
                            onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                            aria-label="Select all"
                        />
                    </TableHead>
                    <TableHead>S/N</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Verified Status</TableHead>
                    <TableHead>Verified Date</TableHead>
                    <TableHead className="w-[50px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredAssets.length > 0 ? (
                    filteredAssets.map((asset) => (
                        <TableRow key={asset.id} data-state={selectedAssetIds.includes(asset.id) && "selected"} onClick={() => handleViewAsset(asset)} className="cursor-pointer">
                        <TableCell onClick={e => e.stopPropagation()}>
                            <Checkbox 
                                checked={selectedAssetIds.includes(asset.id)}
                                onCheckedChange={(checked) => handleSelectSingle(asset.id, checked as boolean)}
                                aria-label={`Select asset ${asset.description}`}
                            />
                        </TableCell>
                        <TableCell>{asset.sn || 'N/A'}</TableCell>
                        <TableCell className="font-medium">{asset.description}</TableCell>
                        <TableCell>{asset.serialNumber || asset.chasisNo || 'N/A'}</TableCell>
                        <TableCell><Badge variant={asset.verifiedStatus === 'Verified' ? 'default' : (asset.verifiedStatus === 'Discrepancy' ? 'destructive' : 'secondary')}>{asset.verifiedStatus || 'Unverified'}</Badge></TableCell>
                        <TableCell>{asset.verifiedDate || 'N/A'}</TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditAsset(asset); }}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setAssetToDelete(asset); setIsDeleteDialogOpen(true); }} className="text-destructive focus:bg-destructive/20">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                        <TableRow><TableCell colSpan={8} className="text-center h-24">No assets found matching your criteria.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
        <AssetForm 
          isOpen={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          asset={selectedAsset} 
          onSave={handleSaveAsset} 
          onQuickSave={handleQuickSaveAsset}
          isReadOnly={isFormReadOnly}
        />
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the asset
                        from your local data.
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
