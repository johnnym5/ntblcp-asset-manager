"use client";

import React, { useState } from "react";
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

export default function AssetList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [assets, setAssets] = useState<Asset[]>(sampleAssets);

  const handleAddAsset = () => {
    setSelectedAsset(undefined);
    setIsFormOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsFormOpen(true);
  };
  
  const getStatusVariant = (status: Asset['status']) => {
    switch (status) {
      case 'In Use':
        return 'default';
      case 'In Storage':
        return 'secondary';
      case 'For Repair':
        return 'destructive';
      case 'Disposed':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-2xl font-bold tracking-tight flex-1">
          Asset Register
        </h2>
        <Button variant="outline" className="hidden sm:flex">
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
                <TableCell className="font-medium">{asset.serialNumber}</TableCell>
                <TableCell>{asset.model}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {asset.location}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(asset.status)}>{asset.status}</Badge>
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
