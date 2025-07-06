"use client";

import React, { useState, useRef, useEffect } from "react";
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
import { motion } from "framer-motion";
import {
  FileDown,
  FileUp,
  MoreHorizontal,
  PlusCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { AssetForm, type AssetFormValues } from "./asset-form";
import { sampleAssets } from "@/lib/data";
import type { Asset } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { parseExcelFile, exportToExcel } from "@/lib/excel-parser";

const LOCAL_STORAGE_KEY = 'ntblcp-assets';
const MotionTableRow = motion(TableRow);

export default function AssetList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load assets from local storage on initial render
  useEffect(() => {
    try {
      const savedAssets = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedAssets) {
        setAssets(JSON.parse(savedAssets));
      } else {
        // If no data in local storage, initialize with sample data
        setAssets(sampleAssets);
      }
    } catch (error) {
      console.error("Failed to load assets from local storage:", error);
      toast({
        title: "Could not load local data",
        description: "Falling back to default sample data.",
        variant: "destructive",
      });
      setAssets(sampleAssets);
    }
  }, [toast]);

  // Save assets to local storage whenever they change
  useEffect(() => {
    // Don't save the initial empty array before hydration from the first effect
    if (assets.length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(assets));
      } catch (error) {
        console.error("Failed to save assets to local storage:", error);
        toast({
          title: "Could not save data locally",
          description: "Your latest changes might not be saved.",
          variant: "destructive",
        });
      }
    }
  }, [assets, toast]);


  const handleAddAsset = () => {
    setSelectedAsset(undefined);
    setIsFormOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsFormOpen(true);
  };

  const handleSaveAsset = async (data: AssetFormValues, imageFile: File | null) => {
    let photoUrl = selectedAsset?.photoUrl || "https://placehold.co/400x400.png";

    if (imageFile) {
      photoUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(imageFile);
      });
    }

    const newAssetData = {
      ...data,
      photoUrl,
    };

    if (selectedAsset) {
      // Update existing asset
      setAssets(
        assets.map((asset) =>
          asset.id === selectedAsset.id
            ? { ...asset, ...newAssetData }
            : asset
        )
      );
      toast({
        title: "Asset Updated",
        description: `Asset "${data.assetName}" has been successfully updated.`,
      });
    } else {
      // Create new asset
      const newAsset: Asset = {
        id: `asset-${Date.now()}`,
        ...newAssetData,
      };
      setAssets([newAsset, ...assets]);
      toast({
        title: "Asset Added",
        description: `New asset "${data.assetName}" has been successfully added.`,
      });
    }
  };
  
  const handleDeleteClick = (asset: Asset) => {
    setAssetToDelete(asset);
  }

  const confirmDelete = () => {
    if (assetToDelete) {
      setAssets(assets.filter((asset) => asset.id !== assetToDelete.id));
      toast({
        title: "Asset Deleted",
        description: `Asset "${assetToDelete.assetName}" has been deleted.`,
        variant: 'destructive',
      });
      setAssetToDelete(null);
    }
  }


  const getStatusVariant = (status: Asset["status"]) => {
    switch (status) {
      case "In Use":
        return "default";
      case "In Storage":
        return "secondary";
      case "For Repair":
        return "destructive";
      case "Disposed":
        return "outline";
      default:
        return "default";
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const { newAssets, skippedCount, error } = await parseExcelFile(file);

      if (error) {
        throw new Error(error);
      }
      
      if (newAssets.length > 0) {
        setAssets((prevAssets) => [...prevAssets, ...newAssets]);
        toast({
          title: "Import Successful",
          description: `${newAssets.length} assets imported. ${skippedCount > 0 ? `${skippedCount} rows skipped.` : ""}`.trim(),
        });
      } else if (skippedCount > 0) {
        toast({
          title: "Import Finished",
          description: `No new assets were imported. ${skippedCount} rows were skipped due to missing data.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Import Finished",
          description: "The file was empty or contained no valid asset data.",
        });
      }
    } catch (error) {
      console.error("Failed to import Excel file:", error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred during import.",
        variant: "destructive",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsImporting(false);
    }
  };

  const handleExportClick = () => {
    try {
      exportToExcel(assets, `ntblcp-asset-export-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({
        title: "Export Successful",
        description: "Your asset list has been exported.",
      });
    } catch(error) {
      console.error("Failed to export assets:", error);
      toast({
        title: "Export Failed",
        description: "Could not export your asset list.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="flex flex-col h-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-2xl font-bold tracking-tight flex-1">
          Asset Register
        </h2>
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
      <div className="rounded-lg border shadow-sm flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Asset Name</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset, index) => (
              <MotionTableRow
                key={asset.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <TableCell>
                  <Image
                    src={asset.photoUrl}
                    alt={asset.assetName}
                    width={50}
                    height={50}
                    className="rounded-md object-cover"
                    data-ai-hint="product photo"
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {asset.assetName}
                </TableCell>
                <TableCell>{asset.serialNumber}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {asset.category}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(asset.status)}>
                    {asset.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditAsset(asset)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteClick(asset)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4"/>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </MotionTableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AssetForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        asset={selectedAsset}
        onSave={handleSaveAsset}
      />
      
      <AlertDialog open={!!assetToDelete} onOpenChange={(open) => !open && setAssetToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the asset
                      <span className="font-bold"> "{assetToDelete?.assetName}"</span>.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setAssetToDelete(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                      Delete
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
