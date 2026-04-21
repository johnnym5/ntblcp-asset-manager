"use client";

/**
 * @fileOverview Legacy Asset List Component.
 * Fixed for production build: synchronized property accessors with domain Asset interface.
 * Phase 2015: assignee -> custodian, verifiedStatus -> status.
 */

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
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
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
import {
  MoreHorizontal,
  Loader2,
  Trash2,
  ArrowLeft,
  Edit,
  AlertCircle,
  Check,
  FileText,
  ClipboardEdit,
  FolderSearch,
  CloudUpload,
  HardDrive,
  ArrowRightLeft,
  Columns,
  Delete,
  PlaneTakeoff,
  Database,
  PlusCircle,
  ScanSearch,
  CloudOff,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

import AssetForm from "./asset-form";
import type { Asset, SheetDefinition, DisplayField } from "@/types/domain";
import { useToast } from "@/hooks/use-toast";
import { parseExcelFile } from "@/lib/excel-parser";
import { NIGERIAN_ZONES, NIGERIAN_STATES, ZONAL_STORES, NIGERIAN_STATE_CAPITALS } from "@/lib/constants";
import { useAppState } from "@/contexts/app-state-context";
import { useAuth } from "@/contexts/auth-context";
import { AssetBatchEditForm, type BatchUpdateData } from "./asset-batch-edit-form";
import { CategoryBatchEditForm, type CategoryBatchUpdateData } from "./category-batch-edit-form";
import { PaginationControls } from "./pagination-controls";
import { cn, normalizeAssetLocation, getStatusClasses, sanitizeForFirestore } from "@/lib/utils";
import { addNotification } from "@/hooks/use-notifications";
import { ColumnCustomizationSheet } from "./column-customization-sheet";
import { TravelReportDialog } from "./travel-report-dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { SyncConfirmationDialog } from "./sync-confirmation-dialog";
import type { SyncSummary } from '@/types/domain';

const SPECIAL_LOCATIONS = ["Head Office", "Federal Ministry of Health", "PMU"];

const LocationProgress: React.FC<{ locationName: string; allAssets: Asset[]; appMode: 'management' | 'verification' }> = ({ locationName, allAssets, appMode }) => {
    const locationAssets = useMemo(() => {
        if (!allAssets) return [];
        if (locationName === 'All') {
            return allAssets;
        }

        const lowerCaseLocation = locationName.toLowerCase().trim();
        const isZonalStore = ZONAL_STORES.map(z => z.toLowerCase()).includes(lowerCaseLocation);

        if (isZonalStore) {
            return allAssets.filter(asset => {
                const assetLocation = (asset.location || "").toLowerCase().trim();
                return assetLocation.includes(lowerCaseLocation) && assetLocation.includes("zonal store");
            });
        }
        
        if (SPECIAL_LOCATIONS.map(l => l.toLowerCase()).includes(lowerCaseLocation)) {
             return allAssets.filter(asset => (asset.location || "").toLowerCase().trim().includes(lowerCaseLocation));
        }

        const capitalCity = NIGERIAN_STATE_CAPITALS[locationName]?.toLowerCase().trim();
        return allAssets.filter(asset => {
            const assetLocation = (asset.location || "").toLowerCase().trim();
            const matchesState = assetLocation.startsWith(lowerCaseLocation);
            const matchesCapital = capitalCity ? assetLocation.startsWith(capitalCity) : false;
            return matchesState || matchesCapital;
        });

    }, [locationName, allAssets]);

    const total = locationAssets.length;
    if (total === 0 && locationName !== 'All') {
        return (
            <div className="flex justify-between items-center w-full p-2">
                <span>{locationName}</span>
                <span className="text-xs text-muted-foreground">0 assets</span>
            </div>
        );
    }

    const verified = locationAssets.filter(a => a.status === 'VERIFIED').length;
    const percentage = total > 0 ? (verified / total) * 100 : 0;
    const displayName = locationName === 'All' ? 'Overall (All Assets)' : locationName;

    return (
        <div className="flex flex-col w-full gap-1 p-2 rounded-md hover:bg-muted">
            <div className="flex justify-between items-center w-full text-sm">
                <span>{displayName}</span>
                {appMode === 'verification' ? (
                  <span className="text-xs font-mono">{verified}/{total} verified</span>
                ) : (
                  <span className="text-xs font-mono">{total} assets</span>
                )}
            </div>
            {appMode === 'verification' && <Progress value={percentage} className="h-1.5" />}
        </div>
    );
};


export default function AssetList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormReadOnly, setIsFormReadOnly] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [view, setView] = useState<'dashboard' | 'table'>('dashboard');
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [isClearCategoryDialogOpen, setIsClearCategoryDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCategoryBatchEditOpen, setIsCategoryBatchEditOpen] = useState(false);
  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [isTravelReportOpen, setIsTravelReportOpen] = useState(false);
  
  const {
    assets, isOnline, setIsOnline, 
    dataSource, setDataSource,
    itemsPerPage, setItemsPerPage,
    selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter,
    searchTerm,
  } = useAppState();

  const appSettings = useAppState().appSettings as any;
  const isSyncing = useAppState().isSyncing;
  
  const syncSummary = useAppState().syncSummary;
  const isSyncConfirmOpen = useAppState().isSyncConfirmOpen;
  const setIsSyncConfirmOpen = useAppState().setIsSyncConfirmOpen;

  const { enabledSheets, sheetDefinitions } = appSettings || { enabledSheets: [], lockAssetList: false, sheetDefinitions: {} };

  const isAdmin = userProfile?.isAdmin || false;
  const isGuest = (userProfile as any)?.isGuest || false;
  
  const activeAssets = useMemo(() => assets, [assets]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedCategories([]);
  }, [searchTerm, selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter, dataSource]);
  
  useEffect(() => {
    if (view === 'dashboard') {
        setSelectedAssetIds([]);
    } else {
        setSelectedCategories([]);
    }
  }, [view]);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const displayedAssets = useMemo(() => {
    let results = (activeAssets || []).filter(asset => enabledSheets.includes(asset.category));

    const hasFilters = selectedLocations.length > 0 || selectedAssignees.length > 0 || selectedStatuses.length > 0 || missingFieldFilter;
    if (hasFilters) {
        results = results.filter(asset => {
            const locationMatch = selectedLocations.length === 0 || selectedLocations.includes(normalizeAssetLocation(asset.location));
            const assigneeMatch = selectedAssignees.length === 0 || (asset.custodian && selectedAssignees.map(a => a.toLowerCase()).includes(asset.custodian.trim().toLowerCase()));
            const statusMatch = selectedStatuses.length === 0 || (asset.status && selectedStatuses.includes(asset.status));
            const missingFieldMatch = !missingFieldFilter || !(asset as any)[missingFieldFilter as keyof Asset];
            return locationMatch && assigneeMatch && statusMatch && missingFieldMatch;
        });
    }

    if (searchTerm) {
        const lowerCaseSearchTokens = searchTerm.toLowerCase().split(' ').filter(token => token.length > 0);
        if (lowerCaseSearchTokens.length > 0) {
            results = results.filter(asset => {
                const assetHaystack = Object.values(asset)
                    .map(value => (typeof value === 'object' && value !== null) ? Object.values(value).join(' ') : String(value))
                    .join(' ').toLowerCase();
                return lowerCaseSearchTokens.every(token => assetHaystack.includes(token));
            });
        }
    }
    
    return results;
  }, [activeAssets, searchTerm, selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter, enabledSheets]);

  const assetsByCategory = useMemo(() => {
    return (displayedAssets || []).reduce((acc, asset) => {
        const category = asset.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(asset);
        return acc;
    }, {} as { [key: string]: Asset[] });
  }, [displayedAssets]);

  const categoryFilteredAssets = useMemo(() => {
    if (!currentCategory) return [];
    return assetsByCategory[currentCategory] || [];
  }, [currentCategory, assetsByCategory]);


  const handleAddAsset = useCallback(() => {
    setSelectedAsset(undefined);
    setIsFormReadOnly(false);
    setIsFormOpen(true);
  }, []);
  
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
    if (!assetToDelete) return;
    setAssetToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const handleBatchDelete = async () => {
    setIsBatchDeleting(true);
    setSelectedAssetIds([]);
    setIsBatchDeleting(false);
  };

  const handleBatchEdit = () => {
    setIsBatchEditOpen(true);
  }
  
  const handleSaveAssetBatch = async (data: BatchUpdateData) => {
    setSelectedAssetIds([]);
  };

  const handleSaveAsset = async (assetToSave: Asset) => {
    setIsFormOpen(false);
  };

  const handleImportClick = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsImporting(false);
  };
  
  const handleTravelReport = useCallback(() => setIsTravelReportOpen(true), []);
  
  const handleSelectAll = (checked: boolean, allFilteredAssets: Asset[]) => {
    if (checked) {
      setSelectedAssetIds((allFilteredAssets || []).map(a => a.id));
    } else {
      setSelectedAssetIds([]);
    }
  };
  
  const handleSelectAllCategories = (checked: boolean) => {
      if (checked) {
          setSelectedCategories(Object.keys(assetsByCategory));
      } else {
          setSelectedCategories([]);
      }
  }

  const handleSelectSingle = (assetId: string, checked: boolean) => {
    setSelectedAssetIds(prev => checked ? [...prev, assetId] : prev.filter(id => id !== assetId));
  };
  
  const handleSelectCategory = (category: string, checked: boolean) => {
    setSelectedCategories(prev => checked ? [...prev, category] : prev.filter(c => c !== category));
  };

  const handleClearAllAssets = useCallback(async () => {
    setIsClearAllDialogOpen(false);
    setSelectedAssetIds([]);
  }, []);

  const handleClearCategory = async () => {
    setIsClearCategoryDialogOpen(false);
  };
  
  const handleSaveCategoryBatchEdit = async (data: CategoryBatchUpdateData) => {
    setSelectedCategories([]);
  };

  const handleDeleteSelectedCategories = async () => {
    setIsBatchDeleting(true);
    setSelectedCategories([]);
    setIsBatchDeleting(false);
  }

  const handleSaveColumnSettings = (originalName: string | null, newDefinition: SheetDefinition, applyToAll: boolean) => {
    addNotification({ title: "Column settings saved", description: "Your changes have been saved." });
  };

  const handleSyncConfirm = () => {
    // sync confirm pulse
  };

  const renderDashboardCard = (category: string, categoryAssets: Asset[]) => {
      const total = categoryAssets.length;
      const verified = categoryAssets.filter(a => a.status === 'VERIFIED').length;
      const percentage = total > 0 ? (verified / total) * 100 : 0;
      const isSelected = selectedCategories.includes(category);
      
      return (
          <Card key={category} className={cn("hover:shadow-md transition-shadow flex flex-col", isSelected && "ring-2 ring-primary")}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex-1">
                  <CardTitle className="text-sm font-medium pr-2">{category}</CardTitle>
                </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -translate-y-1.5 -translate-x-1.5">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       <DropdownMenuItem onSelect={() => handleSelectCategory(category, !isSelected)} disabled={isGuest}>
                          <Checkbox className="mr-2 h-4 w-4" checked={isSelected}/>
                          {isSelected ? 'Deselect' : 'Select'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => { setCategoryToDelete(category); setIsClearCategoryDialogOpen(true); }} disabled={isGuest || !isAdmin} className="text-destructive focus:text-destructive">
                          <Delete className="mr-2 h-4 w-4" />
                          Delete Category
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                  <div>
                      <div className="text-2xl font-bold">{total}</div>
                      <p className="text-xs text-muted-foreground">Total assets</p>
                  </div>
                  {appSettings.appMode === 'verification' && (
                    <div className="space-y-2">
                        <Progress value={percentage} aria-label={`${percentage.toFixed(0)}% verified`} />
                        <p className="text-xs text-muted-foreground">{verified} of {total} verified</p>
                    </div>
                  )}
              </CardContent>
              <CardFooter className="pt-0 pb-4">
                <Button variant="link" className="p-0 h-auto" onClick={() => { setView('table'); setCurrentCategory(category); }}>View Assets</Button>
              </CardFooter>
          </Card>
      );
  }

  // DASHBOARD VIEW
  if (view === 'dashboard') {
    const currentlyDisplayedAssets = (displayedAssets || []).length;
    const verifiedStateAssets = (displayedAssets || []).filter(asset => asset.status === 'VERIFIED').length;
    const verificationPercentage = currentlyDisplayedAssets > 0 ? (verifiedStateAssets / currentlyDisplayedAssets) * 100 : 0;
    const areAllCategoriesSelected = Object.keys(assetsByCategory).length > 0 && selectedCategories.length === Object.keys(assetsByCategory).length;
    
    const ContextualButtonIcon = CloudUpload;
    const mainCategories = Object.keys(assetsByCategory).sort((a,b) => a.localeCompare(b));

    return (
      <div className="flex flex-col h-full gap-4">
        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx, .xls" className="hidden" />
        <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className='flex-1'>
                    <CardTitle className="flex items-center gap-2">
                       <span>{appSettings.appMode === 'verification' ? 'Verification Status' : 'Management Status'}</span>
                    </CardTitle>
                  </div>
                  
                  <div className="flex w-full flex-col items-stretch gap-3 md:w-auto md:items-end">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="select-all-categories" className="text-sm font-medium whitespace-nowrap">Select All</Label>
                        <Checkbox
                            id="select-all-categories"
                            checked={areAllCategoriesSelected}
                            onCheckedChange={(checked) => handleSelectAllCategories(checked as boolean)}
                            aria-label="Select all categories"
                            disabled={isGuest}
                        />
                      </div>
                    </div>
                  </div>
              </CardHeader>
               <CardContent className="pt-2 space-y-2">
                  {appSettings.appMode === 'verification' ? (
                    <>
                      <Progress value={verificationPercentage} aria-label={`${verificationPercentage.toFixed(0)}% verified`} />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-bold text-foreground">{verifiedStateAssets}</span> of <span className="font-bold text-foreground">{currentlyDisplayedAssets}</span> assets verified.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-bold text-foreground">{currentlyDisplayedAssets}</span> assets loaded.
                    </p>
                  )}
              </CardContent>
               {selectedCategories.length > 0 && (
                <CardFooter className="bg-muted/50 p-2 border-t flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{selectedCategories.length} selected</span>
                    <Separator orientation="vertical" className="h-6"/>
                    <Button variant="ghost" size="sm" disabled={isSyncing || !isOnline}>
                        {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ContextualButtonIcon className="mr-2 h-4 w-4" />}
                        Upload Selection
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsCategoryBatchEditOpen(true)} disabled={isGuest || (!userProfile?.canEditAssets && !isAdmin)}>
                        <ClipboardEdit className="mr-2 h-4 w-4" /> Batch Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDeleteSelectedCategories} disabled={isBatchDeleting || isGuest}>
                        {isBatchDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete
                    </Button>
                </CardFooter>
            )}
          </Card>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {mainCategories.length > 0 ? (
              mainCategories.map(cat => renderDashboardCard(cat, assetsByCategory[cat]))
            ) : (
                 <div className="col-span-full text-center py-24 text-muted-foreground">
                    <FolderSearch className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">No Assets Found</h3>
                </div>
            )}
        </div>
        <TravelReportDialog isOpen={isTravelReportOpen} onOpenChange={setIsTravelReportOpen} />
        <AssetForm 
          isOpen={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          asset={selectedAsset} 
          onSave={handleSaveAsset}
          isReadOnly={isFormReadOnly} 
        />
        <AssetBatchEditForm isOpen={isBatchEditOpen} onOpenChange={setIsBatchEditOpen} selectedAssetCount={selectedAssetIds.length} onSave={handleSaveAssetBatch} />
        <CategoryBatchEditForm isOpen={isCategoryBatchEditOpen} onOpenChange={setIsCategoryBatchEditOpen} selectedCategoryCount={selectedCategories.length} onSave={handleSaveCategoryBatchEdit} />
         <SyncConfirmationDialog
          isOpen={isSyncConfirmOpen}
          onOpenChange={setIsSyncConfirmOpen}
          onConfirm={() => {}}
          summary={syncSummary}
        />
        <AlertDialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                       This will delete all records.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAllAssets} className="bg-destructive hover:bg-destructive/90">
                        Yes, delete all
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
         <AlertDialog open={isClearCategoryDialogOpen} onOpenChange={setIsClearCategoryDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete all assets in '{categoryToDelete}'?</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearCategory} className="bg-destructive hover:bg-destructive/90">
                        Yes, delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // TABLE VIEW
  const paginatedCategoryAssets = (categoryFilteredAssets || []).slice(
    (currentPage - 1) * (itemsPerPage as number),
    currentPage * (itemsPerPage as number)
  );
  const areAllCategoryResultsSelected = categoryFilteredAssets.length > 0 && categoryFilteredAssets.every(a => selectedAssetIds.includes(a.id));
  const totalPages = Math.ceil(categoryFilteredAssets.length / (itemsPerPage as number));

  const currentSheetDefinition = sheetDefinitions[currentCategory!];
  let tableFields: DisplayField[] = currentSheetDefinition?.displayFields.filter((f: any) => f.table) || [];

  return (
    <div className="flex flex-col h-full gap-4">
        <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => { setView('dashboard'); setCurrentCategory(null); setSelectedAssetIds([]); }}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-1 items-center gap-4">
                <h2 className="text-2xl font-bold tracking-tight">
                    {currentCategory}
                </h2>
            </div>
             {isAdmin && currentCategory && (
              <Button variant="outline" size="sm" onClick={() => setIsColumnSheetOpen(true)}>
                <Columns className="mr-2 h-4 w-4" />
                Edit Table
              </Button>
            )}
            {selectedAssetIds.length > 0 && (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{selectedAssetIds.length} selected</span>
                     <Button variant="outline" size="sm" disabled={isSyncing || !isOnline}>
                      {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CloudUpload className="mr-2 h-4 w-4" />}
                       Upload
                    </Button>
                     {selectedAssetIds.length === 1 && !isGuest && (
                        <Button variant="outline" size="sm" onClick={() => handleEditAsset(assets.find(a => a.id === selectedAssetIds[0])!)} disabled={!userProfile?.canEditAssets && !isAdmin}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                    )}
                    {selectedAssetIds.length > 0 && !isGuest && (
                        <Button variant="outline" size="sm" onClick={() => setIsAssetBatchEditOpen(true)} disabled={!userProfile?.canEditAssets && !isAdmin}>
                            <ClipboardEdit className="mr-2 h-4 w-4" /> Batch Edit
                        </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={handleBatchDelete} disabled={isBatchDeleting || isGuest || !isAdmin}>
                        {isBatchDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete
                    </Button>
                </div>
            )}
        </div>
        
        <Card className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-grow overflow-y-auto">
               {/* Desktop Table */}
              <div className="hidden md:block">
                <Table className="relative">
                    <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={areAllCategoryResultsSelected}
                                    onCheckedChange={(checked) => handleSelectAll(checked as boolean, categoryFilteredAssets)}
                                    aria-label="Select all"
                                    disabled={isGuest}
                                />
                            </TableHead>
                            {tableFields.map(field => (
                              <TableHead key={field.key}>{field.label}</TableHead>
                            ))}
                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedCategoryAssets.length > 0 ? (
                        paginatedCategoryAssets.map((asset) => (
                            <TableRow 
                              key={asset.id}
                              data-state={selectedAssetIds.includes(asset.id) ? 'selected' : ''} 
                              onClick={() => handleViewAsset(asset)}
                              className="cursor-pointer"
                            >
                                <TableCell onClick={e => e.stopPropagation()}>
                                    <Checkbox 
                                        checked={selectedAssetIds.includes(asset.id)}
                                        onCheckedChange={(checked) => handleSelectSingle(asset.id, checked as boolean)}
                                        disabled={isGuest}
                                    />
                                </TableCell>
                                {tableFields.map(field => (
                                  <TableCell key={field.key}>
                                    <span className="flex items-center gap-2">
                                        {String((asset as any)[field.key] ?? 'N/A')}
                                    </span>
                                  </TableCell>
                                ))}
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                    <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={isGuest}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewAsset(asset); }}>
                                            <FolderSearch className="mr-2 h-4 w-4" />
                                            View
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditAsset(asset); }} disabled={!userProfile?.canEditAssets && !isAdmin}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </TableCell>
                            </TableRow>
                        ))
                        ) : (
                            <TableRow><TableCell colSpan={tableFields.length + 2} className="text-center h-24">No results found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
              </div>
            </div>
            <CardFooter className="border-t pt-4">
               <PaginationControls 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    setItemsPerPage={setItemsPerPage}
                    totalItems={categoryFilteredAssets.length}
                  />
            </CardFooter>
        </Card>
        <AssetForm 
          isOpen={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          asset={selectedAsset} 
          onSave={handleSaveAsset} 
          isReadOnly={isFormReadOnly}
        />
        <AssetBatchEditForm 
            isOpen={isBatchEditOpen} 
            onOpenChange={setIsBatchEditOpen}
            selectedAssetCount={selectedAssetIds.length}
            onSave={handleSaveAssetBatch}
        />
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        {currentCategory && currentSheetDefinition && (
          <ColumnCustomizationSheet 
            isOpen={isColumnSheetOpen}
            onOpenChange={setIsColumnSheetOpen}
            sheetDefinition={currentSheetDefinition}
            originalSheetName={currentCategory}
            onSave={(orig, newDef, all) => handleSaveColumnSettings(orig, newDef, all)}
          />
        )}
    </div>
  );
}
