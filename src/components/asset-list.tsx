"use client";

import React, { useState, useRef } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileDown,
  FileUp,
  MoreHorizontal,
  PlusCircle,
} from "lucide-react";
import Image from "next/image";
import { AssetForm } from "./asset-form";
import { sampleAssets } from "@/lib/data";
import type { Asset } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function AssetList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(
    undefined
  );
  const [assets, setAssets] = useState<Asset[]>(sampleAssets);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAddAsset = () => {
    setSelectedAsset(undefined);
    setIsFormOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsFormOpen(true);
  };

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

        const validStatuses: Asset["status"][] = [
          "In Use",
          "In Storage",
          "For Repair",
          "Disposed",
        ];

        const validRows = json.filter((row, index) => {
          const hasRequiredFields =
            row.serialNumber && row.model && row.location && row.status;
          if (!hasRequiredFields) {
            console.warn(
              `Skipping row ${
                index + 2
              } due to missing required fields.`
            );
            return false;
          }
          const hasValidStatus = validStatuses.includes(row.status);
          if (!hasValidStatus) {
            console.warn(
              `Skipping row ${index + 2} due to invalid status: ${
                row.status
              }.`
            );
            return false;
          }
          return true;
        });

        const skippedCount = json.length - validRows.length;

        const newAssets: Asset[] = validRows.map((row, index) => ({
          id: `imported-${Date.now()}-${index}`,
          serialNumber: String(row.serialNumber),
          model: String(row.model),
          location: String(row.location),
          status: row.status as Asset["status"],
          photoUrl: String(
            row.photoUrl || "https://placehold.co/400x400.png"
          ),
          conditionNotes: row.conditionNotes
            ? String(row.conditionNotes)
            : undefined,
        }));

        if (newAssets.length > 0) {
          setAssets((prevAssets) => [...prevAssets, ...newAssets]);
          toast({
            title: "Import Successful",
            description: `${newAssets.length} assets imported. ${
              skippedCount > 0 ? `${skippedCount} rows skipped.` : ""
            }`.trim(),
          });
        } else if (skippedCount > 0) {
          toast({
            title: "Import Finished",
            description: `No new assets were imported. ${skippedCount} rows were skipped.`,
          });
        } else {
          toast({
            title: "Import Finished",
            description:
              "The file was empty or contained no valid asset data.",
          });
        }
      } catch (error) {
        console.error("Failed to import Excel file:", error);
        toast({
          title: "Import Failed",
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred.",
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
        <Button
          variant="outline"
          className="hidden sm:flex"
          onClick={handleImportClick}
        >
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
      <div className="rounded-lg border shadow-sm flex-1 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Model</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
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
                    alt={asset.model}
                    width={50}
                    height={50}
                    className="rounded-md object-cover"
                    data-ai-hint="product photo"
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {asset.serialNumber}
                </TableCell>
                <TableCell>{asset.model}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {asset.location}
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
                      <DropdownMenuItem className="text-destructive">
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
      />
    </div>
  );
}
