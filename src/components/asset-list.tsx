
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
  AlertCircle,
  Check,
  FileText,
  ClipboardEdit,
  FolderSearch,
  X,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Progress } from "@/components/ui/progress";

import { AssetForm } from "./asset-form";
import type { Asset } from "@/lib/types";
import { addNotification } from "@/hooks/use-notifications";
import { parseExcelFile, exportToExcel } from "@/lib/excel-parser";
import { TARGET_SHEETS, NIGERIAN_ZONES, NIGERIAN_STATES, ZONE_NAMES, SPECIAL_LOCATIONS, NIGERIAN_STATE_CAPITALS } from "@/lib/constants";
import { useAppState, type SortConfig } from "@/contexts/app-state-context";
import { useAuth } from "@/contexts/auth-context";
import { AssetBatchEditForm, type BatchUpdateData } from "./asset-batch-edit-form";
import { PaginationControls } from "./pagination-controls";

const ITEMS_PER_PAGE = 25;

const normalizeAssetLocation = (location?: string): string => {
    if (!location) return '';
    const originalLocation = location.trim();
    if (!originalLocation) return '';

    const lowerCaseLocation = originalLocation.toLowerCase();

    const matchedState = NIGERIAN_STATES.find(state => lowerCaseLocation.includes(state.toLowerCase()));
    if (matchedState) return matchedState;

    for (const state in NIGERIAN_STATE_CAPITALS) {
        if (lowerCaseLocation.includes(NIGERIAN_STATE_CAPITALS[state].toLowerCase())) {
            return state;
        }
    }
    return originalLocation.replace(/\b\w/g, l => l.toUpperCase());
};


export default function AssetList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormReadOnly, setIsFormReadOnly] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { userProfile } = useAuth();

  const [view, setView] = useState<'dashboard' | 'table'>('dashboard');
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);


  // --- Global state from context ---
  const { 
    searchTerm, setSearchTerm,
    isOnline, globalStateFilter, setGlobalStateFilter,
    selectedLocation, setSelectedLocation,
    selectedAssignee, setSelectedAssignee,
    selectedStatus, setSelectedStatus,
    sortConfig, setLocationOptions, setAssigneeOptions,
    enabledSheets,
  } = useAppState();

  // Reset page number when filters or view change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedLocation, selectedAssignee, selectedStatus, globalStateFilter, view, currentCategory]);

  // When a search is performed, switch to the dashboard view to show categorized results
  useEffect(() => {
    if (searchTerm) {
      setView('dashboard');
    }
  }, [searchTerm]);


  // --- LOCAL STORAGE PERSISTENCE ---
  useEffect(() => {
    try {
      const localData = localStorage.getItem('ntblcp-assets');
      if (localData) {
        setAssets(JSON.parse(localData));
      }
    } catch (error) {
      console.error("Failed to load assets from local storage", error);
      addNotification({ 
        title: "Could not load saved data", 
        description: "There was an error reading your locally saved assets.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      try {
        if (assets.length === 0 && localStorage.getItem('ntblcp-assets')) {
          localStorage.removeItem('ntblcp-assets');
        } else if (assets.length > 0) {
          localStorage.setItem('ntblcp-assets', JSON.stringify(assets));
        }
      } catch (error: any) {
        console.error("Failed to save assets to local storage", error);
        
        let description = `There was an error saving your assets locally. ${error instanceof Error ? error.message : ''}`;
        if (error && (error.name === 'QuotaExceededError' || (error.message && error.message.toLowerCase().includes('quota')))) {
            description = "Browser storage limit reached. Please export and then clear your existing assets before importing a large new file.";
        }
        
        addNotification({ 
          title: "Storage Error", 
          description: description, 
          variant: "destructive" 
        });
      }
    }
  }, [assets, isLoading]);


  const stateFilteredAssets = useMemo(() => {
    if (!globalStateFilter) {
      return assets; // Admin view or no filter set
    }
    
    const zones: Record<string, string[]> = NIGERIAN_ZONES;
    const capitals: Record<string, string> = NIGERIAN_STATE_CAPITALS;
    const isZone = !!zones[globalStateFilter]; // Check if the filter is a zone name

    if (isZone) {
      // The filter is a zone, look for zonal stores
      const lowerCaseZone = globalStateFilter.toLowerCase();
      return assets.filter(asset => {
        const assetLocation = (asset.location || "").toLowerCase().trim();
        return assetLocation.includes(lowerCaseZone) && assetLocation.includes("zonal store");
      });
    } else {
      // The filter is a single state or special location.
      const lowerCaseFilter = globalStateFilter.toLowerCase().trim();
      const capitalCity = capitals[globalStateFilter]?.toLowerCase().trim();

      return assets.filter(asset => {
        const assetLocation = (asset.location || "").toLowerCase().trim();
        
        // Check if location matches the state/special location name
        const matchesState = assetLocation.startsWith(lowerCaseFilter);
        
        // Check if location matches the capital city name (if it exists)
        const matchesCapital = capitalCity ? assetLocation.startsWith(capitalCity) : false;
        
        return matchesState || matchesCapital;
      });
    }
}, [assets, globalStateFilter]);

  // Pre-filter assets for the dashboard if a search term is active
  const displayedAssetsForDashboard = useMemo(() => {
    let assetsToDisplay = stateFilteredAssets;
    if (searchTerm) {
        const lowerCaseSearchTokens = searchTerm.toLowerCase().split(' ').filter(token => token.length > 0);
        if (lowerCaseSearchTokens.length > 0) {
            assetsToDisplay = assetsToDisplay.filter(asset => {
                const assetHaystack = Object.values(asset)
                    .map(value => (typeof value === 'object' && value !== null) ? Object.values(value).join(' ') : String(value))
                    .join(' ').toLowerCase();
                return lowerCaseSearchTokens.every(token => assetHaystack.includes(token));
            });
        }
    }
    return assetsToDisplay;
  }, [stateFilteredAssets, searchTerm]);
  
  const assetsByCategory = useMemo(() => {
    return displayedAssetsForDashboard.reduce((acc, asset) => {
        const category = asset.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(asset);
        return acc;
    }, {} as { [key: string]: Asset[] });
  }, [displayedAssetsForDashboard]);
  
  // --- Set Filter Options in Global Context ---
  useEffect(() => {
    const locations = new Set<string>();
    stateFilteredAssets.forEach(asset => {
      const normalized = normalizeAssetLocation(asset.location);
      if (normalized) {
        locations.add(normalized);
      }
    });
    setLocationOptions(Array.from(locations).map(l => ({ label: l, value: l })).sort((a, b) => a.label.localeCompare(b.label)));

    const assigneeMap = new Map<string, string>();
    stateFilteredAssets.forEach(asset => {
      if (asset.assignee) {
        const assigneeName = asset.assignee.trim();
        if (assigneeName) {
            const lowerCaseName = assigneeName.toLowerCase();
            if (!assigneeMap.has(lowerCaseName)) {
                assigneeMap.set(lowerCaseName, assigneeName);
            }
        }
      }
    });
    setAssigneeOptions(Array.from(assigneeMap.values()).map(a => ({ label: a, value: a })).sort((a,b) => a.label.localeCompare(b.label)));
  }, [stateFilteredAssets, setLocationOptions, setAssigneeOptions]);


  const sortAssets = (assetsToSort: Asset[], config: SortConfig | null): Asset[] => {
    if (!config) return assetsToSort;
    return [...assetsToSort].sort((a, b) => {
        const aVal = a[config.key] ?? '';
        const bVal = b[config.key] ?? '';
        if (aVal < bVal) return config.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return config.direction === 'asc' ? 1 : -1;
        return 0;
    });
  };

  // The unified results view is now only for filters, not for search.
  const showUnifiedResults = useMemo(() => {
    return !!selectedLocation || !!selectedAssignee || !!selectedStatus;
  }, [selectedLocation, selectedAssignee, selectedStatus]);


  const unifiedResults = useMemo(() => {
    if (!showUnifiedResults) return [];

    let results = stateFilteredAssets;

    // Apply filters
    results = results.filter(asset => {
        const locationMatch = !selectedLocation || normalizeAssetLocation(asset.location) === selectedLocation;
        const assigneeMatch = !selectedAssignee || (asset.assignee && asset.assignee.trim().toLowerCase() === selectedAssignee.toLowerCase());
        const statusMatch = !selectedStatus || asset.verifiedStatus === selectedStatus;
        return locationMatch && assigneeMatch && statusMatch;
    });
    
    // Apply search term to the (already filtered) results
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
    
    return sortAssets(results, sortConfig);
}, [showUnifiedResults, searchTerm, stateFilteredAssets, selectedLocation, selectedAssignee, selectedStatus, sortConfig]);


  const categoryFilteredAssets = useMemo(() => {
    let baseAssets: Asset[];
    if (view === 'table' && currentCategory) {
        baseAssets = assetsByCategory[currentCategory] || [];
    } else {
        return [];
    }

    let assetsToFilter = baseAssets;
    
    const hasFilters = !!selectedLocation || !!selectedAssignee || !!selectedStatus;
    if (hasFilters) {
        assetsToFilter = assetsToFilter.filter(asset => {
            const locationMatch = !selectedLocation || normalizeAssetLocation(asset.location) === selectedLocation;
            const assigneeMatch = !selectedAssignee || (asset.assignee && asset.assignee.trim().toLowerCase() === selectedAssignee.toLowerCase());
            const statusMatch = !selectedStatus || asset.verifiedStatus === selectedStatus;
            return locationMatch && assigneeMatch && statusMatch;
        });
    }

    // The search term is already applied via `assetsByCategory`, but we re-apply here
    // in case the user types in the search bar while in the table view.
    if (searchTerm) {
        const lowerCaseSearchTokens = searchTerm.toLowerCase().split(' ').filter(token => token.length > 0);
        if (lowerCaseSearchTokens.length > 0) {
            assetsToFilter = assetsToFilter.filter(asset => {
                const assetHaystack = Object.values(asset)
                    .map(value => (typeof value === 'object' && value !== null) ? Object.values(value).join(' ') : String(value))
                    .join(' ').toLowerCase();
                return lowerCaseSearchTokens.every(token => assetHaystack.includes(token));
            });
        }
    }
    
    return sortAssets(assetsToFilter, sortConfig);
  }, [view, currentCategory, assetsByCategory, searchTerm, selectedLocation, selectedAssignee, selectedStatus, sortConfig]);

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
        addNotification({ title: "Deleting Asset...", description: `Removing "${assetToDelete.description}"` });
        setAssets(prev => prev.filter(a => a.id !== assetToDelete.id));
        addNotification({ title: "Asset Deleted", description: `Asset was successfully removed.`});
    }
    setAssetToDelete(null);
    setIsDeleteDialogOpen(false);
  }

  const handleBatchDelete = async () => {
    setIsBatchDeleting(true);
    const assetsToDeleteCount = selectedAssetIds.length;
    addNotification({ title: "Deleting Assets...", description: `Removing ${assetsToDeleteCount} selected assets.` });
    
    setAssets(prev => prev.filter(asset => !selectedAssetIds.includes(asset.id)));
    
    addNotification({ title: "Assets Deleted", description: `Successfully removed ${assetsToDeleteCount} assets.`});
    setSelectedAssetIds([]);
    setIsBatchDeleting(false);
  }

  const handleBatchEdit = () => setIsBatchEditOpen(true);
  
  const handleSaveBatchEdit = async (data: BatchUpdateData) => {
    const assetsToUpdateCount = selectedAssetIds.length;
    addNotification({ title: "Batch Updating Assets...", description: `Applying changes to ${assetsToUpdateCount} assets.` });
    
    setAssets(prev => prev.map(asset => {
        if (selectedAssetIds.includes(asset.id)) {
            const updatedAsset = { ...asset, ...data };
            if (data.verifiedStatus === 'Verified' && !asset.verifiedDate) {
                updatedAsset.verifiedDate = new Date().toLocaleDateString("en-CA");
            } else if (data.verifiedStatus && data.verifiedStatus !== 'Verified') {
                 updatedAsset.verifiedDate = '';
            }
            return updatedAsset;
        }
        return asset;
    }));
    
    addNotification({ title: "Assets Updated", description: `Successfully updated ${assetsToUpdateCount} assets.`});
    setSelectedAssetIds([]);
  };

  const handleSaveAsset = async (assetToSave: Asset) => {
    addNotification({ title: "Saving Asset Locally...", description: "Your changes are being saved." });
    setAssets(prev => {
        const existingAsset = prev.find(a => a.id === assetToSave.id);
        if (existingAsset) {
            return prev.map(a => a.id === assetToSave.id ? assetToSave : a);
        }
        return [...prev, assetToSave];
    });
    addNotification({ title: "Saved Successfully", description: "Asset changes have been saved locally." });
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
    addNotification({ title: "Parsing file...", description: "Please wait while we process your Excel file." });
    
    const { assetsBySheet, errors, skippedRows } = await parseExcelFile(file, enabledSheets);
    
    errors.forEach(error => addNotification({ title: "Import Error", description: error, variant: "destructive" }));
    if (skippedRows > 0) {
        addNotification({ title: "Import Notice", description: `${skippedRows} rows were skipped due to missing required fields.` });
    }

    const allNewAssets = Object.values(assetsBySheet).flat();
    if (allNewAssets.length > 0) {
        setAssets(prev => [...prev, ...allNewAssets]);
        addNotification({ title: "Import Successful", description: `Successfully imported ${allNewAssets.length} new assets. Data is saved locally.` });
    } else if (errors.length === 0) {
        addNotification({ title: "No Data Found", description: "No valid asset sheets were found in the file."});
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsImporting(false);
  };
  
  const handleExportClick = () => {
    const assetsToExport = showUnifiedResults ? unifiedResults : (view === 'table' ? categoryFilteredAssets : displayedAssetsForDashboard);
    if (assetsToExport.length === 0) {
      addNotification({ title: "No Data to Export", description: "There are no assets in the current view to export." });
      return;
    }
    try {
      const isAdminUser = userProfile?.displayName?.trim().toLowerCase() === 'admin';
      const exportPrefix = isAdminUser ? 'admin' : userProfile?.state || 'assets';
      const fileName = `${exportPrefix}-export-${new Date().toISOString().split('T')[0]}.xlsx`;

      exportToExcel(assetsToExport, fileName);
      addNotification({ title: "Export Successful" });
    } catch(error) {
      console.error("Export Error:", error);
      addNotification({ title: "Export Failed", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
    }
  };
  
  const handleSelectAll = (checked: boolean, allFilteredAssets: Asset[]) => {
    if (checked) {
      setSelectedAssetIds(allFilteredAssets.map(a => a.id));
    } else {
      setSelectedAssetIds([]);
    }
  };

  const handleSelectSingle = (assetId: string, checked: boolean) => {
    setSelectedAssetIds(prev => checked ? [...prev, assetId] : prev.filter(id => id !== assetId));
  };
  
  const handleClearAllAssets = () => {
    setAssets([]);
    addNotification({ title: "All Assets Cleared", description: "Your local asset database has been cleared." });
    setIsClearAllDialogOpen(false);
  }
  
  const handleClearSearchAndFilters = () => {
    setSearchTerm('');
    setSelectedLocation('');
    setSelectedAssignee('');
    setSelectedStatus('');
  };

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  // UNIFIED RESULTS VIEW (FILTERS ONLY)
  if (showUnifiedResults) {
    const results = unifiedResults;
    const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
    const paginatedResults = results.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
    const areAllResultsSelected = results.length > 0 && results.every(a => selectedAssetIds.includes(a.id));

    const title = "Filter Results";

    return (
      <div className="flex flex-col h-full gap-4">
          <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight flex-1">
                  {title}
              </h2>
              {selectedAssetIds.length > 0 ? (
                  <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{selectedAssetIds.length} selected</span>
                       {selectedAssetIds.length === 1 && (
                            <Button variant="outline" size="sm" onClick={() => handleEditAsset(assets.find(a => a.id === selectedAssetIds[0])!)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </Button>
                        )}
                        {selectedAssetIds.length > 0 && (
                            <Button variant="outline" size="sm" onClick={handleBatchEdit}>
                                <ClipboardEdit className="mr-2 h-4 w-4" /> Batch Edit
                            </Button>
                        )}
                      <Button variant="destructive" size="sm" onClick={handleBatchDelete} disabled={isBatchDeleting}>
                          {isBatchDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                          Delete
                      </Button>
                  </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{results.length} assets found</span>
                  <Button variant="outline" size="sm" onClick={handleClearSearchAndFilters}>
                      <X className="mr-2 h-4 w-4" />
                      Clear All
                  </Button>
                  <Button variant="outline" onClick={handleExportClick}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Export Results
                  </Button>
                </div>
              )}
          </div>
          
            <Card className="flex-1 flex flex-col">
              <CardContent className="p-0 flex-1 overflow-auto">
                 {paginatedResults.length > 0 ? (
                  <Table>
                      <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={areAllResultsSelected}
                                    onCheckedChange={(checked) => handleSelectAll(checked as boolean, results)}
                                    aria-label="Select all results"
                                />
                            </TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Assignee</TableHead>
                            <TableHead>Verified Status</TableHead>
                            <TableHead className="w-[50px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                          {paginatedResults.map(asset => (
                              <TableRow key={asset.id} data-state={selectedAssetIds.includes(asset.id) && "selected"} onClick={() => handleViewAsset(asset)} className="cursor-pointer">
                                  <TableCell onClick={e => e.stopPropagation()}>
                                      <Checkbox 
                                          checked={selectedAssetIds.includes(asset.id)}
                                          onCheckedChange={(checked) => handleSelectSingle(asset.id, checked as boolean)}
                                          aria-label={`Select asset ${asset.description}`}
                                      />
                                  </TableCell>
                                  <TableCell className="font-medium">{asset.description}</TableCell>
                                  <TableCell>{asset.category || 'N/A'}</TableCell>
                                  <TableCell>{asset.location || 'N/A'}</TableCell>
                                  <TableCell>{asset.assignee || 'N/A'}</TableCell>
                                  <TableCell onClick={(e) => e.stopPropagation()}>
                                    <Select
                                      value={asset.verifiedStatus || "Unverified"}
                                      onValueChange={(status) => {
                                        const verifiedDate = status === "Verified" ? new Date().toLocaleDateString("en-CA") : "";
                                        handleQuickSaveAsset(asset.id, { verifiedStatus: status as any, verifiedDate });
                                        addNotification({ title: "Status Updated", description: `Asset status changed to ${status}.` });
                                      }}
                                    >
                                      <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue placeholder="Select status" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Unverified"><div className="flex items-center"><FileText className="mr-2 h-4 w-4" />Unverified</div></SelectItem>
                                        <SelectItem value="Verified"><div className="flex items-center"><Check className="mr-2 h-4 w-4" />Verified</div></SelectItem>
                                        <SelectItem value="Discrepancy"><div className="flex items-center"><AlertCircle className="mr-2 h-4 w-4" />Discrepancy</div></SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                      <DropdownMenu>
                                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditAsset(asset); }}>
                                              <Edit className="mr-2 h-4 w-4" /> Edit
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setAssetToDelete(asset); setIsDeleteDialogOpen(true); }} className="text-destructive focus:bg-destructive/20">
                                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                                          </DropdownMenuItem>
                                      </DropdownMenuContent>
                                      </DropdownMenu>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
                  ) : (
                    <div className="text-center py-24 text-muted-foreground">
                        <FolderSearch className="mx-auto h-12 w-12" />
                        <h3 className="mt-4 text-lg font-semibold">No Assets Found</h3>
                        <p className="mt-2 text-sm">Try adjusting your filter criteria.</p>
                    </div>
                )}
              </CardContent>
              <CardFooter className="border-t pt-4">
                  <PaginationControls 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                    totalItems={results.length}
                  />
              </CardFooter>
            </Card>

          <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={selectedAsset} onSave={handleSaveAsset} onQuickSave={handleQuickSaveAsset} isReadOnly={isFormReadOnly} />
          <AssetBatchEditForm isOpen={isBatchEditOpen} onOpenChange={setIsBatchEditOpen} selectedAssetCount={selectedAssetIds.length} onSave={handleSaveBatchEdit} />
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the asset from your local data.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>
    );
  }

  // DASHBOARD VIEW (NOW INCLUDES SEARCH RESULTS)
  if (view === 'dashboard') {
    const totalStateAssets = displayedAssetsForDashboard.length;
    const verifiedStateAssets = displayedAssetsForDashboard.filter(asset => asset.verifiedStatus === 'Verified').length;
    const verificationPercentage = totalStateAssets > 0 ? (verifiedStateAssets / totalStateAssets) * 100 : 0;
    const isAdmin = userProfile?.displayName?.toLowerCase().trim() === 'admin';
    
    return (
      <div className="flex flex-col h-full gap-4">
        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx, .xls" className="hidden" />
        <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight flex-1">
                {searchTerm ? `Results for "${searchTerm}"` : 'Asset Dashboard'}
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
                <Button variant="destructive" onClick={() => setIsClearAllDialogOpen(true)} disabled={assets.length === 0}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All
                </Button>
            </div>
        </div>
        <Card>
             <CardHeader>
                <CardTitle>
                    {isAdmin && !searchTerm ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-semibold tracking-tight">Asset Verification Status for</span>
                        <Select
                            value={globalStateFilter || 'all'}
                            onValueChange={(value) => setGlobalStateFilter(value === 'all' ? '' : value)}
                        >
                        <SelectTrigger className="w-full sm:w-[280px]">
                            <SelectValue placeholder="Select a location..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Overall (All Assets)</SelectItem>
                            <SelectSeparator />
                            <SelectGroup>
                                <SelectLabel>Special Locations</SelectLabel>
                                {SPECIAL_LOCATIONS.map((loc) => (
                                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                                ))}
                            </SelectGroup>
                            <SelectSeparator />
                            <SelectGroup>
                                <SelectLabel>Geopolitical Zones</SelectLabel>
                                {ZONE_NAMES.map((zone) => (
                                    <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                                ))}
                            </SelectGroup>
                            <SelectSeparator />
                            <SelectGroup>
                                <SelectLabel>States</SelectLabel>
                                {NIGERIAN_STATES.map((state) => (
                                    <SelectItem key={state} value={state}>{state}</SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                        </Select>
                    </div>
                    ) : (
                    <>
                        {globalStateFilter && !searchTerm
                        ? `Asset Verification Status for ${globalStateFilter}`
                        : `Overall Asset Verification Status`
                        }
                    </>
                    )}
                </CardTitle>
            </CardHeader>
             <CardContent className="pt-2 space-y-2">
                <Progress value={verificationPercentage} aria-label={`${verificationPercentage.toFixed(0)}% verified`} />
                <p className="text-sm text-muted-foreground">
                    <span className="font-bold text-foreground">{verifiedStateAssets}</span> of <span className="font-bold text-foreground">{totalStateAssets}</span> assets verified.
                    {searchTerm && ` (across ${Object.keys(assetsByCategory).length} categories)`}
                </p>
            </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Object.keys(assetsByCategory).length > 0 ? (
                Object.entries(assetsByCategory).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryAssets]) => {
                    const total = categoryAssets.length;
                    const verified = categoryAssets.filter(a => a.verifiedStatus === 'Verified').length;
                    const percentage = total > 0 ? (verified / total) * 100 : 0;
                    
                    return (
                        <Card key={category} className="hover:shadow-md transition-shadow flex flex-col">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{category}</CardTitle>
                                <Folder className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <div>
                                    <div className="text-2xl font-bold">{total}</div>
                                    <p className="text-xs text-muted-foreground">{searchTerm ? 'Assets found' : 'Total assets'} in this category</p>
                                </div>
                                <div className="space-y-2">
                                    <Progress value={percentage} aria-label={`${percentage.toFixed(0)}% verified`} />
                                    <p className="text-xs text-muted-foreground">{verified} of {total} verified</p>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0 pb-4">
                              <Button variant="link" className="p-0 h-auto" onClick={() => { setView('table'); setCurrentCategory(category); }}>View Assets</Button>
                            </CardFooter>
                        </Card>
                    );
                })
            ) : (
                <div className="col-span-full text-center py-24 text-muted-foreground">
                    <FolderSearch className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">No Assets Found</h3>
                    {searchTerm ? (
                        <p className="mt-2 text-sm">Your search for "{searchTerm}" did not match any assets.</p>
                    ) : (
                        <p className="mt-2 text-sm">Import a file or add an asset to get started.</p>
                    )}
                </div>
            )}
        </div>
        <AssetForm 
          isOpen={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          asset={selectedAsset} 
          onSave={handleSaveAsset}
          onQuickSave={handleQuickSaveAsset}
          isReadOnly={isFormReadOnly} 
        />
        <AssetBatchEditForm isOpen={isBatchEditOpen} onOpenChange={setIsBatchEditOpen} selectedAssetCount={selectedAssetIds.length} onSave={handleSaveBatchEdit} />
        <AlertDialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all {assets.length} assets from your local data. It is highly recommended to export your data first.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAllAssets} className="bg-destructive hover:bg-destructive/90">
                        Yes, delete all assets
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // TABLE VIEW
  const filteredAssets = categoryFilteredAssets;
  const totalCategoryPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);
  const paginatedCategoryAssets = filteredAssets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const areAllCategoryResultsSelected = filteredAssets.length > 0 && filteredAssets.every(a => selectedAssetIds.includes(a.id));

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
                     {selectedAssetIds.length === 1 && (
                        <Button variant="outline" size="sm" onClick={() => handleEditAsset(assets.find(a => a.id === selectedAssetIds[0])!)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                    )}
                    {selectedAssetIds.length > 0 && (
                        <Button variant="outline" size="sm" onClick={handleBatchEdit}>
                            <ClipboardEdit className="mr-2 h-4 w-4" /> Batch Edit
                        </Button>
                    )}
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
        
        <Card className="flex-1 flex flex-col">
            <CardContent className="p-0 flex-1 overflow-auto">
              <Table>
                  <TableHeader>
                      <TableRow>
                      <TableHead className="w-[50px]">
                          <Checkbox
                              checked={areAllCategoryResultsSelected}
                              onCheckedChange={(checked) => handleSelectAll(checked as boolean, filteredAssets)}
                              aria-label="Select all in this category"
                          />
                      </TableHead>
                      <TableHead>S/N</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Asset ID</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Verified Status</TableHead>
                      <TableHead>Verified Date</TableHead>
                      <TableHead className="w-[50px] text-right">Actions</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {paginatedCategoryAssets.length > 0 ? (
                      paginatedCategoryAssets.map((asset) => (
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
                          <TableCell>{asset.assetIdCode || 'N/A'}</TableCell>
                          <TableCell>{asset.assignee || 'N/A'}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={asset.verifiedStatus || "Unverified"}
                              onValueChange={(status) => {
                                const verifiedDate =
                                  status === "Verified"
                                    ? new Date().toLocaleDateString("en-CA")
                                    : "";
                                handleQuickSaveAsset(asset.id, {
                                  verifiedStatus: status as any,
                                  verifiedDate,
                                });
                                addNotification({
                                  title: "Status Updated",
                                  description: `Asset status changed to ${status}.`,
                                });
                              }}
                            >
                              <SelectTrigger className="w-[150px] h-9 text-sm">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Unverified">
                                  <div className="flex items-center">
                                    <FileText className="mr-2 h-4 w-4" />
                                    Unverified
                                  </div>
                                </SelectItem>
                                <SelectItem value="Verified">
                                  <div className="flex items-center">
                                    <Check className="mr-2 h-4 w-4" />
                                    Verified
                                  </div>
                                </SelectItem>
                                <SelectItem value="Discrepancy">
                                  <div className="flex items-center">
                                    <AlertCircle className="mr-2 h-4 w-4" />
                                    Discrepancy
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
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
            </CardContent>
            <CardFooter className="border-t pt-4">
               <PaginationControls 
                    currentPage={currentPage}
                    totalPages={totalCategoryPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                    totalItems={filteredAssets.length}
                  />
            </CardFooter>
        </Card>
        <AssetForm 
          isOpen={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          asset={selectedAsset} 
          onSave={handleSaveAsset} 
          onQuickSave={handleQuickSaveAsset}
          isReadOnly={isFormReadOnly}
        />
        <AssetBatchEditForm 
            isOpen={isBatchEditOpen} 
            onOpenChange={setIsBatchEditOpen}
            selectedAssetCount={selectedAssetIds.length}
            onSave={handleSaveBatchEdit}
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

    
