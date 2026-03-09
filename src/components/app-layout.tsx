
"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/avatar';
import {
  Boxes,
  Settings,
  LogOut,
  Search,
  Cloud,
  CloudOff,
  Filter,
  ArrowUpDown,
  Loader2,
  CloudDownload,
  CloudUpload,
  Bell,
  CheckCheck,
  X,
  DatabaseZap,
  History,
  Menu,
  MoreVertical,
  MapPin,
  Inbox,
} from "lucide-react";
import { addNotification, useNotifications, clearAll, removeNotification } from "@/hooks/use-notifications";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

import { Button } from "./ui/button";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "./ui/skeleton";
import { useAppState } from "@/contexts/app-state-context";
import { Input } from "./ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { SettingsSheet } from "./settings-sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { AssetFilterDialog } from "./asset-filter-sheet";
import type { Asset } from "@/lib/types";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { DatabaseAdminDialog } from "./admin/database-admin-dialog";
import { ActivityLogDialog } from "./admin/activity-log-sheet";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "./ui/badge";
import { InboxSheet } from "./inbox-sheet";
import { saveAssets } from "@/lib/idb";
import { sanitizeForFirestore } from "@/lib/excel-parser";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { userProfile, loading, logout } = useAuth();
  const isMobile = useIsMobile();
  const { 
    assets, setAssets,
    isOnline, setIsOnline, 
    searchTerm, setSearchTerm, 
    sortConfig, setSortConfig,
    selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter,
    locationOptions, assigneeOptions, statusOptions,
    setSelectedLocations, setSelectedAssignees, setSelectedStatuses, setMissingFieldFilter,
    conditionOptions, conditionFilter, setConditionFilter,
    setManualDownloadTrigger,
    setManualUploadTrigger,
    isSyncing,
    isSettingsOpen,
    setIsSettingsOpen,
    initialSettingsTab,
    setInitialSettingsTab,
    onRevertAsset,
    globalStateFilter,
    setGlobalStateFilter,
  } = useAppState();

  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const debouncedSearchTerm = useDebounce(localSearchTerm, 300);
  const [isDbAdminOpen, setIsDbAdminOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isActivityLogDialogOpen, setIsActivityLogDialogOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  const { notifications, unreadCount, markAllAsRead } = useNotifications();

  const isAdmin = userProfile?.isAdmin || false;

  useEffect(() => {
    setSearchTerm(debouncedSearchTerm);
  }, [debouncedSearchTerm, setSearchTerm]);

  useEffect(() => {
    if (searchTerm === '') {
        setLocalSearchTerm('');
    }
  }, [searchTerm]);
  
  const handleLogout = () => {
    logout();
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    if (name.includes(' ')) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  
  const getUserName = () => {
    return userProfile?.displayName || "User";
  }
  
  const sortableFields: { key: keyof Asset, label: string }[] = [
      { key: 'sn', label: 'S/N' },
      { key: 'description', label: 'Description' },
      { key: 'category', label: 'Category' },
      { key: 'location', label: 'Location' },
      { key: 'verifiedDate', label: 'Verified Date' },
      { key: 'lastModified', label: 'Last Modified' },
      { key: 'assetIdCode', label: 'Asset ID' },
  ];

  const handleSort = (key: keyof Asset) => {
    setSortConfig(prev => {
        if (prev?.key === key && prev.direction === 'asc') {
            return { key, direction: 'desc' };
        }
        return { key, direction: 'asc' };
    });
  };
  
  const handleManualDownload = () => {
    if (!isOnline) {
      addNotification({ title: "Currently Offline", variant: "destructive" });
      return;
    }
    if (isSyncing) return;
    setManualDownloadTrigger(c => c + 1);
  };
  
  const handleManualUpload = () => {
    if (!isOnline) {
      addNotification({ title: "Currently Offline", variant: "destructive" });
      return;
    }
    if (isSyncing) return;
    setManualUploadTrigger(c => c + 1);
  };

  const handleNotificationsOpenChange = (open: boolean) => {
    setIsNotificationsOpen(open);
    if (open && unreadCount > 0) {
      setTimeout(() => markAllAsRead(), 500);
    }
  }
  
  const handleApprove = async (assetId: string, comment?: string) => {
    const assetToApprove = assets.find(a => a.id === assetId);
    if (!assetToApprove || !assetToApprove.pendingChanges) return;

    const approvedAsset = sanitizeForFirestore({
        ...assetToApprove,
        ...assetToApprove.pendingChanges,
        approvalStatus: 'approved',
        pendingChanges: undefined,
        adminComment: comment,
        syncStatus: 'local',
    } as Asset);

    const newAssets = assets.map(a => a.id === assetId ? approvedAsset : a);
    setAssets(newAssets);
    await saveAssets(newAssets);

    addNotification({
        title: "Approval Accepted",
        description: `Changes for "${approvedAsset.description}" have been applied and data updated.`,
        variant: "default"
    });
  };

  const handleReject = async (assetId: string, comment?: string) => {
    const assetToReject = assets.find(a => a.id === assetId);
    if (!assetToReject) return;

    const rejectedAsset = sanitizeForFirestore({
        ...assetToReject,
        approvalStatus: 'rejected',
        pendingChanges: undefined,
        adminComment: comment,
        syncStatus: 'local',
    } as Asset);
    
    const newAssets = assets.map(a => a.id === assetId ? rejectedAsset : a);
    setAssets(newAssets);
    await saveAssets(newAssets);

    addNotification({
        title: "Request Denied",
        description: `Changes for "${assetToReject.description}" were rejected by admin. Reason: ${comment || 'No reason provided'}. Try again or close.`,
        variant: "destructive"
    });
  };

  const activeFilterCount = selectedLocations.length + selectedAssignees.length + selectedStatuses.length + (missingFieldFilter ? 1 : 0) + conditionFilter.length;

  const handleSettingsOpen = () => {
    setInitialSettingsTab('general');
    setIsSettingsOpen(true);
  }

  const userHasMultipleStates = userProfile?.states && userProfile.states.length > 1;
  const pendingCount = assets.filter(a => a.approvalStatus === 'pending').length;

  return (
    <div className="flex flex-col w-full h-screen bg-background overflow-hidden">
      <header className="flex flex-col border-b bg-background/95 backdrop-blur-md z-50">
        <div className="flex items-center justify-between px-4 py-2 h-14 sm:h-16 md:px-6">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary rounded-lg">
                    <Boxes className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold hidden sm:inline-block tracking-tight">Assetain</span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
                {!isMobile && isOnline && (
                  <div className="flex items-center gap-1 mr-2 bg-muted/50 p-1 rounded-lg">
                    <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleManualDownload} disabled={isSyncing}>
                                  {isSyncing ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <CloudDownload className="h-4 w-4" />}
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Sync Down</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleManualUpload} disabled={isSyncing}>
                                  {isSyncing ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <CloudUpload className="h-4 w-4" />}
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Sync Up</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}

                {isMobile && isOnline && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Sync Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={handleManualDownload} disabled={isSyncing}>
                                <CloudDownload className="mr-2 h-4 w-4" /> Download Changes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleManualUpload} disabled={isSyncing}>
                                <CloudUpload className="mr-2 h-4 w-4" /> Upload Changes
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => setIsOnline(!isOnline)}
                            >
                               {isOnline ? (
                                    <Cloud className="h-5 w-5 text-green-500 animate-pulse" />
                                ) : (
                                    <CloudOff className="h-5 w-5 text-destructive" />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isOnline ? 'System Online' : 'System Offline'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                
                <Popover open={isNotificationsOpen} onOpenChange={handleNotificationsOpenChange}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-9 w-9">
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-screen sm:w-[400px] p-0 mr-4 shadow-2xl border-primary/20">
                    <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                      <h3 className="font-bold text-base">Activity Center</h3>
                      <Badge variant="outline" className="text-[10px]">{unreadCount} Unread</Badge>
                    </div>
                    <ScrollArea className="h-[400px]">
                      {notifications.length > 0 ? (
                        notifications.map((notification, index) => (
                          <div key={notification.id} className={cn("relative group p-4 transition-colors", !notification.read ? "bg-primary/5" : "bg-transparent")}>
                            <p className={cn("text-sm font-semibold mb-1 pr-8", !notification.read ? "text-foreground" : "text-muted-foreground")}>
                              {notification.title}
                            </p>
                            {notification.description && (
                              <p className="text-xs text-muted-foreground pr-8 leading-relaxed">
                                {notification.description}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground/60 mt-2 flex items-center gap-1">
                              <History className="h-3 w-3" /> {formatDistanceToNow(notification.date, { addSuffix: true })}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-3 right-3 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeNotification(notification.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            {index < notifications.length - 1 && <Separator className="mt-4" />}
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-3 text-center p-12 text-muted-foreground">
                          <CheckCheck className="h-10 w-10 text-green-500/50" />
                          <p className="text-sm font-medium">All caught up!</p>
                        </div>
                      )}
                    </ScrollArea>
                    <div className="p-3 border-t bg-muted/10 flex justify-end">
                      <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => clearAll()}>Clear All History</Button>
                    </div>
                  </PopoverContent>
                </Popover>

                {loading ? (
                  <Skeleton className="h-10 w-10 rounded-full" />
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-offset-background transition-all hover:ring-2 hover:ring-primary/20">
                        <Avatar className="h-9 w-9 border-2 border-muted shadow-sm">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">{getInitials(userProfile?.displayName)}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 p-2 shadow-2xl">
                      <DropdownMenuLabel className="p-3">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-bold leading-none">{getUserName()}</p>
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Filter className="h-3 w-3" /> {globalStateFilter}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      {userHasMultipleStates && !isAdmin && (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="h-10">
                            <MapPin className="mr-2 h-4 w-4 text-muted-foreground"/>
                            Switch State Scope
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-48">
                            <DropdownMenuRadioGroup value={globalStateFilter} onValueChange={setGlobalStateFilter}>
                              {userProfile.states.map(state => (
                                <DropdownMenuRadioItem key={state} value={state}>
                                  {state}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      )}

                      <DropdownMenuItem onClick={handleSettingsOpen} className="h-10 cursor-pointer">
                        <Settings className="mr-2 h-4 w-4 text-muted-foreground"/>
                        Configuration Settings
                      </DropdownMenuItem>

                      {userProfile?.loginName === 'admin' && (
                        <DropdownMenuItem onClick={() => setIsDbAdminOpen(true)} className="h-10 cursor-pointer">
                          <DatabaseZap className="mr-2 h-4 w-4 text-muted-foreground"/>
                          Database Management
                        </DropdownMenuItem>
                      )}

                      {userProfile?.isAdmin && (
                        <>
                          <DropdownMenuItem onClick={() => setIsInboxOpen(true)} className="h-10 cursor-pointer flex items-center justify-between">
                            <div className="flex items-center">
                              <Inbox className="mr-2 h-4 w-4 text-muted-foreground"/>
                              Approval Queue
                            </div>
                            {pendingCount > 0 && <Badge className="h-5 px-1.5 min-w-[20px] justify-center bg-primary text-primary-foreground">{pendingCount}</Badge>}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setIsActivityLogDialogOpen(true)} className="h-10 cursor-pointer">
                            <History className="mr-2 h-4 w-4 text-muted-foreground"/>
                            Audit & Activity Log
                          </DropdownMenuItem>
                        </>
                      )}

                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="h-10 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </div>
        </div>

        <div className="px-4 pb-3 sm:px-6">
            <div className="relative flex items-center w-full h-11 group">
                <div className="absolute left-4 z-10">
                    <Search className={cn("h-4 w-4 transition-colors", localSearchTerm ? "text-primary" : "text-muted-foreground group-focus-within:text-primary")} />
                </div>
                <Input
                    type="search"
                    placeholder="Search serials, descriptions, or locations..."
                    className="pl-11 pr-24 w-full h-full bg-muted/40 hover:bg-muted/60 focus:bg-background border-none rounded-xl transition-all shadow-inner focus:ring-2 focus:ring-primary/20"
                    value={localSearchTerm}
                    onChange={(e) => setLocalSearchTerm(e.target.value)}
                />
                <div className="absolute right-2 flex items-center gap-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-background/80">
                                <ArrowUpDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Sort Database</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {sortableFields.map(field => (
                                <DropdownMenuItem key={field.key} onClick={() => handleSort(field.key)} className="justify-between">
                                    {field.label}
                                    {sortConfig?.key === field.key && (
                                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold">
                                            {sortConfig.direction}
                                        </span>
                                    )}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                     <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-background/80 relative" onClick={() => setIsFilterDialogOpen(true)}>
                        <Filter className="h-4 w-4" />
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                                {activeFilterCount}
                            </span>
                        )}
                     </Button>
                </div>
            </div>
        </div>
      </header>

      <motion.main
        className="flex-1 flex flex-col bg-muted/30 overflow-hidden relative"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <ScrollArea className="flex-1">
            <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
                {children}
            </div>
        </ScrollArea>
      </motion.main>

      <SettingsSheet isOpen={isSettingsOpen} onOpenChange={setIsSettingsOpen} initialTab={initialSettingsTab} />
      {userProfile?.loginName === 'admin' && (
        <DatabaseAdminDialog isOpen={isDbAdminOpen} onOpenChange={setIsDbAdminOpen} />
      )}
      {userProfile?.isAdmin && (
        <>
          <ActivityLogDialog isOpen={isActivityLogDialogOpen} onOpenChange={setIsActivityLogDialogOpen} onRevert={onRevertAsset} />
          <InboxSheet isOpen={isInboxOpen} onOpenChange={setIsInboxOpen} onApprove={handleApprove} onReject={handleReject} />
        </>
      )}
      <AssetFilterDialog
        isOpen={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        locationOptions={locationOptions}
        selectedLocations={selectedLocations}
        setSelectedLocations={setSelectedLocations}
        assigneeOptions={assigneeOptions}
        selectedAssignees={selectedAssignees}
        setSelectedAssignees={setSelectedAssignees}
        statusOptions={statusOptions}
        selectedStatuses={selectedStatuses}
        setSelectedStatuses={setSelectedStatuses}
        conditionOptions={conditionOptions}
        selectedConditions={conditionFilter}
        setSelectedConditions={setConditionFilter}
        missingFieldFilter={missingFieldFilter}
        setMissingFieldFilter={setMissingFieldFilter}
      />
    </div>
  );
}
