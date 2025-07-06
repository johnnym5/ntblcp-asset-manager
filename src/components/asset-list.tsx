
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
} from "lucide-react";
import { MultiSelectFilter, type OptionType } from "./multi-select-filter";
import { AssetForm } from "./asset-form";
import type { Asset } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { parseExcelFile, exportToExcel } from "@/lib/excel-parser";
import { saveAssetsToFirestore, getAssetsListener, deleteAsset, updateAsset } from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { TARGET_SHEETS } from "@/lib/constants";

const VERIFIED_STATUS_OPTIONS: OptionType[] = [
    { value: 'Verified', label: 'Verified' },
    { value: 'Unverified', label: 'Unverified' },
    { value: 'Discrepancy', label: 'Discrepancy' },
    { value: 'Unverified - New', label: 'Unverified - New' },
];

const CATEGORY_OPTIONS: OptionType[] = TARGET_SHEETS.map(sheet => ({ value: sheet, label: sheet }));
const LOCAL_STORAGE_KEY = 'ntblcp-assets';

export default function AssetList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [locationFilters, setLocationFilters] = useState<string[]>([]);
  const [assigneeFilters, setAssigneeFilters] = useState<string[]>([]);
  
  useEffect(() => {
    // This effect runs once on the client to load initial data from localStorage
    try {
      const localData = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (localData) {
        setAssets(JSON.parse(localData));
      }
    } catch (error) {
      console.error("Error reading from localStorage", error);
    }
    setIsLoading(false);
  }, []);

  // Effect to save any changes to local storage
  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(assets));
    } catch (error) {
      console.error("Error writing to localStorage", error);
    }
  }, [assets]);

  const handleAddAsset = () => {
    setSelectedAsset(undefined);
    setIsFormOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsFormOpen(true);
  };
  
  const handleDeleteAsset = async (assetToDelete: Asset) => {
    setAssets(prev => prev.filter(a => a.id !== assetToDelete.id));
    toast({ title: "Asset Deleted Locally", description: `Asset "${assetToDelete.description}" was deleted locally. Syncing is disabled.`});
  }

  const handleSaveAsset = async (assetToSave: Asset) => {
    const isNew = !assets.some(a => a.id === assetToSave.id);
    setAssets(prev => {
        if (isNew) return [...prev, assetToSave];
        return prev.map(a => a.id === assetToSave.id ? assetToSave : a);
    });
    toast({ title: "Local Save", description: "Asset changes saved locally. Syncing is disabled." });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    toast({ title: "Parsing file...", description: "Please wait while we process your Excel file." });
    
    const { assetsBySheet, errors, skippedRows } = await parseExcelFile(file);
    
    if (errors.length > 0) {
      errors.forEach(error => toast({ title: "Import Error", description: error, variant: "destructive" }));
    }
    
    if (skippedRows > 0) {
        toast({ title: "Import Notice", description: `${skippedRows} rows were skipped due to missing required fields.` });
    }

    const sheetNames = Object.keys(assetsBySheet);
    if (sheetNames.length > 0) {
      const allNewAssets = Object.values(assetsBySheet).flat().map(a => ({ ...a, syncStatus: 'local' as const }));
      setAssets(prev => {
          const newAssetIds = new Set(allNewAssets.map(a => a.id));
          const oldAssets = prev.filter(a => !newAssetIds.has(a.id));
          return [...oldAssets, ...allNewAssets];
      });
      
      toast({
          title: "Local Import Successful",
          description: `Imported ${allNewAssets.length} assets locally. Syncing to the cloud is disabled.`,
      });
    } else if (errors.length === 0) {
        toast({ title: "No Data Found", description: "No valid sheets for import were found in the file."});
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsImporting(false);
  };

  const locationOptions = useMemo((): OptionType[] => {
    const allLocations = assets.map(asset => asset.location).filter(Boolean) as string[];
    return [...new Set(allLocations)].sort().map(loc => ({ value: loc, label: loc }));
  }, [assets]);

  const assigneeOptions = useMemo((): OptionType[] => {
    const allAssignees = assets.map(asset => asset.assignee).filter(Boolean) as string[];
    return [...new Set(allAssignees)].sort().map(assignee => ({ value: assignee, label: assignee }));
  }, [assets]);

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
        const categoryMatch = categoryFilters.length === 0 || categoryFilters.includes(asset.category);
        const statusMatch = statusFilters.length === 0 || statusFilters.includes(asset.verifiedStatus || '');
        const locationMatch = locationFilters.length === 0 || locationFilters.includes(asset.location || '');
        const assigneeMatch = assigneeFilters.length === 0 || assigneeFilters.includes(asset.assignee || '');
        return categoryMatch && statusMatch && locationMatch && assigneeMatch;
    });
  }, [assets, categoryFilters, statusFilters, locationFilters, assigneeFilters]);
  
  const handleExportClick = () => {
    if (filteredAssets.length === 0) {
      toast({ title: "No Data to Export", description: "There are no assets in the current view to export." });
      return;
    }
    try {
      const exportCategory = categoryFilters.join('-') || 'filtered-assets';
      exportToExcel(filteredAssets, `asset-export-${exportCategory}-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Export Successful" });
    } catch(error) {
      toast({ title: "Export Failed", variant: "destructive" });
    }
  };
  
  const activeFilters = [
    ...categoryFilters,
    ...statusFilters,
    ...locationFilters,
    ...assigneeFilters
  ];

  const clearFilter = (filterToRemove: string) => {
    setCategoryFilters(prev => prev.filter(f => f !== filterToRemove));
    setStatusFilters(prev => prev.filter(f => f !== filterToRemove));
    setLocationFilters(prev => prev.filter(f => f !== filterToRemove));
    setAssigneeFilters(prev => prev.filter(f => f !== filterToRemove));
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
            <Button onClick={handleAddAsset}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 p-4 border rounded-lg bg-card">
        <div className="flex flex-wrap items-center gap-2">
          <MultiSelectFilter title="Category" options={CATEGORY_OPTIONS} selected={categoryFilters} onChange={setCategoryFilters} />
          <MultiSelectFilter title="Status" options={VERIFIED_STATUS_OPTIONS} selected={statusFilters} onChange={setStatusFilters} />
          <MultiSelectFilter title="Location" options={locationOptions} selected={locationFilters} onChange={setLocationFilters} />
          <MultiSelectFilter title="Assignee" options={assigneeOptions} selected={assigneeFilters} onChange={setAssigneeFilters} />
        </div>
        {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
                <p className="text-sm font-medium">Active Filters:</p>
                {activeFilters.map(filter => (
                    <Badge key={filter} variant="secondary" className="pl-2 pr-1">
                        {filter}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-4 h-4 ml-1"
                            onClick={() => clearFilter(filter)}
                        >
                            <X className="w-3 h-3"/>
                        </Button>
                    </Badge>
                ))}
            </div>
        )}
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
              <TableHead>Sync Status</TableHead>
              <TableHead className="w-[50px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && assets.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center"><Loader2 className="mx-auto my-4 h-8 w-8 animate-spin" /></TableCell></TableRow>
            ) : filteredAssets.length > 0 ? (
              filteredAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>{asset.sn || 'N/A'}</TableCell>
                  <TableCell className="font-medium">{asset.description}</TableCell>
                  <TableCell>{asset.serialNumber || asset.chasisNo || 'N/A'}</TableCell>
                  <TableCell className="hidden md:table-cell">{asset.location}</TableCell>
                  <TableCell><Badge variant="secondary">{asset.condition}</Badge></TableCell>
                   <TableCell>
                      {asset.syncStatus === 'synced' ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <Cloud className="mr-2 h-3 w-3"/>Synced
                          </Badge>
                      ) : (
                          <Badge variant="secondary">
                            <HardDrive className="mr-2 h-3 w-3"/>Local
                          </Badge>
                      )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditAsset(asset)}>View/Edit</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/20">Delete</DropdownMenuItem>
                            </AlertDialogTrigger>
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
                                <AlertDialogAction onClick={() => handleDeleteAsset(asset)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow><TableCell colSpan={7} className="text-center h-24">No assets found matching your criteria.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AssetForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        asset={selectedAsset}
        onSave={handleSaveAsset}
      />
    </div>
  );
}
