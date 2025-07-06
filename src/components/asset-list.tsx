"use client";

import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
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
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { AssetForm, type AssetFormValues } from "./asset-form";
import { sampleAssets } from "@/lib/data";
import type { Asset } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const LOCAL_STORAGE_KEY = 'ntblcp-assets';

export default function AssetList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
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

  const handleSaveAsset = (data: AssetFormValues) => {
    const newAssetData = {
      ...data,
      photoUrl: selectedAsset?.photoUrl || "https://placehold.co/400x400.png",
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

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const requiredFields = ['assetName', 'serialNumber', 'category', 'location', 'status', 'condition'];

        const validRows = json.filter((row, index) => {
           const missingFields = requiredFields.filter(field => !row[field]);
           if (missingFields.length > 0) {
             console.warn(`Skipping row ${index + 2} due to missing required fields: ${missingFields.join(', ')}.`);
             return false;
           }
           return true;
        });

        const skippedCount = json.length - validRows.length;

        const newAssets: Asset[] = validRows.map((row, index) => ({
          id: `imported-${Date.now()}-${index}`,
          assetName: String(row.assetName),
          serialNumber: String(row.serialNumber),
          category: String(row.category),
          location: String(row.location),
          status: row.status as Asset["status"],
          condition: row.condition as Asset["condition"],
          assignedTo: row.assignedTo ? String(row.assignedTo) : undefined,
          purchaseDate: row.purchaseDate ? String(row.purchaseDate) : undefined,
          notes: row.notes ? String(row.notes) : undefined,
          photoUrl: String(row.photoUrl || "https://placehold.co/400x400.png"),
        }));

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
          description: error instanceof Error ? error.message : "An unexpected error occurred.",
          variant: "destructive",
        });
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
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
        <Button variant="outline" className="hidden sm:flex" onClick={handleImportClick}>
          <FileUp className="mr-2 h-4 w-4" />
          Import
        </Button>
        <Button variant="outline" className="hidden sm:flex">
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
            {assets.map((asset) => (
              <TableRow key={asset.id}>
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
              </TableRow>
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
