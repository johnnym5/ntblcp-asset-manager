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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, Trash2, Users, Loader2 } from "lucide-react";
import Image from "next/image";
import { AssetForm, type AssetFormValues } from "./asset-form";
import type { Asset, RoomUser } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { getAssetsStream, addAsset, updateAsset, deleteAsset, getRoomUsersStream, updateUserPresence } from "@/lib/firestore";
import { uploadImage } from "@/lib/storage";

interface CollaborationRoomProps {
  roomId: string;
}

export default function CollaborationRoom({ roomId }: CollaborationRoomProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeUsers, setActiveUsers] = useState<RoomUser[]>([]);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!roomId) return;
    const unsubscribeAssets = getAssetsStream(roomId, setAssets);
    const unsubscribeUsers = getRoomUsersStream(roomId, setActiveUsers);

    return () => {
      unsubscribeAssets();
      unsubscribeUsers();
    };
  }, [roomId]);

  useEffect(() => {
    if (!user || !roomId) return;
    
    // Initial presence update
    updateUserPresence(roomId, user);

    // Update presence every 30 seconds
    const intervalId = setInterval(() => {
      updateUserPresence(roomId, user);
    }, 30000);

    // Update presence on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateUserPresence(roomId, user);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [roomId, user]);

  const handleAddAsset = () => {
    setSelectedAsset(undefined);
    setIsFormOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsFormOpen(true);
  };

  const handleSaveAsset = async (data: AssetFormValues, imageFile: File | null) => {
    setIsSaving(true);
    try {
      let photoUrl = selectedAsset?.photoUrl;

      if (imageFile) {
        toast({ title: "Uploading image...", description: "Please wait." });
        photoUrl = await uploadImage(imageFile, `rooms/${roomId}/assets`);
      }

      if (selectedAsset) {
        const dataToUpdate: Partial<Asset> = { ...data };
        if (photoUrl) {
          dataToUpdate.photoUrl = photoUrl;
        }
        await updateAsset(roomId, selectedAsset.id, dataToUpdate);
        toast({
          title: "Asset Updated",
          description: `Asset "${data.assetName}" has been successfully updated.`,
        });
      } else {
        await addAsset(roomId, data, photoUrl || "https://placehold.co/400x400.png");
        toast({
          title: "Asset Added",
          description: `New asset "${data.assetName}" has been successfully added.`,
        });
      }
    } catch (error) {
      console.error("Error saving asset:", error);
      toast({
        title: "Error Saving Asset",
        description: "Could not save asset to the database.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (asset: Asset) => {
    setAssetToDelete(asset);
  };

  const confirmDelete = async () => {
    if (assetToDelete) {
      try {
        await deleteAsset(roomId, assetToDelete.id);
        toast({
          title: "Asset Deleted",
          description: `Asset "${assetToDelete.assetName}" has been deleted.`,
          variant: 'destructive',
        });
      } catch (error) {
         toast({
          title: "Error Deleting Asset",
          description: "Could not delete the asset.",
          variant: "destructive",
        });
      } finally {
        setAssetToDelete(null);
      }
    }
  };

  const getStatusVariant = (status: Asset["status"]) => {
    switch (status) {
      case "In Use": return "default";
      case "In Storage": return "secondary";
      case "For Repair": return "destructive";
      case "Disposed": return "outline";
      default: return "default";
    }
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    if (name.includes(' ')) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-2xl font-bold tracking-tight flex-1">
          Room: <span className="text-primary">{roomId}</span>
        </h2>
        <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-2 mr-2">
                <TooltipProvider>
                {activeUsers.map(u => (
                    <Tooltip key={u.id}>
                        <TooltipTrigger>
                            <Avatar className="border-2 border-background">
                                <AvatarImage src={u.photoURL || ''} alt={u.displayName || 'User'}/>
                                <AvatarFallback>{getInitials(u.displayName)}</AvatarFallback>
                            </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{u.displayName || 'Anonymous User'}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
                </TooltipProvider>
            </div>
             <Users className="h-5 w-5"/>
            <span>{activeUsers.length}</span>
        </div>
        <Button onClick={handleAddAsset} disabled={isSaving}>
          {isSaving ? (
             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PlusCircle className="mr-2 h-4 w-4" />
          )}
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
                    src={asset.photoUrl || "https://placehold.co/400x400.png"}
                    alt={asset.assetName}
                    width={50}
                    height={50}
                    className="rounded-md object-cover"
                    data-ai-hint="product photo"
                  />
                </TableCell>
                <TableCell className="font-medium">{asset.assetName}</TableCell>
                <TableCell>{asset.serialNumber}</TableCell>
                <TableCell className="hidden md:table-cell">{asset.category}</TableCell>
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
                      <DropdownMenuItem onClick={() => handleEditAsset(asset)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteClick(asset)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
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
              <span className="font-bold"> "{assetToDelete?.assetName}"</span> from this room.
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
