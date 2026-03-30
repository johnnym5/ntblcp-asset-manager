"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Inbox,
  ShieldCheck,
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
import { DatabaseAdminDialog } from "./admin/database-admin-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { AssetFilterSheet } from "./asset-filter-sheet";
import type { Asset } from "@/lib/types";
import { Separator } from "./ui/separator";
import { InboxSheet } from "./inbox-sheet";
import { ScrollArea } from "./ui/scroll-area";
import { saveAssets } from "@/lib/idb";
import { sanitizeForFirestore } from "@/lib/excel-parser";


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { userProfile, loading, logout } = useAuth();
  const { 
    assets,
    setAssets,
    isOnline, setIsOnline, 
    searchTerm, setSearchTerm, 
    sortConfig, setSortConfig,
    selectedLocations,
    setSelectedLocations,
    setManualDownloadTrigger,
    setManualUploadTrigger,
    isSyncing,
    unreadInboxCount,
    setUnreadInboxCount,
    appSettings,
  } = useAppState();

  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const debouncedSearchTerm = useDebounce(localSearchTerm, 300);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInfrastructureOpen, setIsInfrastructureOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  const { notifications, unreadCount, markAllAsRead } = useNotifications();

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

  const handleApprove = async (assetId: string) => {
    const assetToApprove = assets.find(a => a.id === assetId);
    if (!assetToApprove || !assetToApprove.pendingChanges) return;

    const approvedAsset = sanitizeForFirestore({
        ...assetToApprove,
        ...assetToApprove.pendingChanges,
        approvalStatus: undefined,
        pendingChanges: undefined,
        changeSubmittedBy: undefined,
        syncStatus: 'local',
    });

    const newAssets = assets.map(a => a.id === assetId ? approvedAsset : a);
    setAssets(newAssets);
    await saveAssets(newAssets);

    addNotification({
        title: "Change Approved",
        description: `Changes for "${approvedAsset.description}" have been applied and will be synced.`
    });
  };

  const handleReject = async (assetId: string) => {
    const assetToReject = assets.find(a => a.id === assetId);
    if (!assetToReject) return;

    const rejectedAsset = {
        ...assetToReject,
        approvalStatus: undefined,
        pendingChanges: undefined,
        changeSubmittedBy: undefined,
        syncStatus: 'local',
    };
    
    const newAssets = assets.map(a => a.id === assetId ? rejectedAsset : a);
    setAssets(newAssets);
    await saveAssets(newAssets);

    addNotification({
        title: "Change Rejected",
        description: `Pending changes for "${assetToReject.description}" have been discarded.`
    });
  };
  
  const isAdmin = userProfile?.isAdmin || false;

  useEffect(() => {
    if (isAdmin) {
      const pendingCount = assets.filter(a => a.approvalStatus === 'pending').length;
      setUnreadInboxCount(pendingCount);
    } else {
      setUnreadInboxCount(0);
    }
  }, [assets, isAdmin, setUnreadInboxCount]);

  return (
    <div className="flex flex-col w-full min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b bg-background/95 px-4 py-2 backdrop-blur-sm md:h-16 md:flex-nowrap md:py-0 md:px-6">
        
        <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight leading-none">Assetain</span>
                {appSettings.activeGrantId && (
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mt-0.5">
                        Project: {appSettings.grants.find(g => g.id === appSettings.activeGrantId)?.name || 'Main Registry'}
                    </span>
                )}
            </div>
        </div>
        
        <div className="flex items-center gap-2 md:order-3 sm:gap-4">
            {isOnline && (
              <>
                <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={() => setManualDownloadTrigger(c => c + 1)} disabled={isSyncing}>
                              {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CloudDownload className="h-5 w-5" />}
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Pull Project Data</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={() => setManualUploadTrigger(c => c + 1)} disabled={isSyncing}>
                              {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CloudUpload className="h-5 w-5" />}
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Push Project Data</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsOnline(!isOnline)}
                        >
                            {isOnline ? (
                                <Cloud className="h-5 w-5 text-green-500" />
                            ) : (
                                <CloudOff className="h-5 w-5 text-red-500" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isOnline ? 'Active Cloud Connection' : 'Disconnected (Offline Mode)'}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            
            {loading ? (
              <Skeleton className="h-10 w-10 rounded-full" />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                      <AvatarFallback className="font-bold">{getInitials(userProfile?.displayName)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-xl shadow-2xl">
                  <DropdownMenuLabel className="font-normal p-4">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-bold leading-none">{getUserName()}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{userProfile?.isAdmin ? 'Global Administrator' : userProfile?.state}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {isAdmin && (
                    <>
                        <DropdownMenuItem onClick={() => setIsSettingsOpen(true)} className="py-2 cursor-pointer">
                            <Settings className="mr-2 h-4 w-4 text-primary"/>
                            System Configuration
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsInfrastructureOpen(true)} className="py-2 cursor-pointer">
                            <ShieldCheck className="mr-2 h-4 w-4 text-primary"/>
                            Infrastructure Console
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsInboxOpen(true)} className="py-2 cursor-pointer">
                            <Inbox className="mr-2 h-4 w-4 text-primary" />
                            <span>Approval Queue</span>
                            {unreadInboxCount > 0 && (
                                <Badge className="ml-auto bg-primary text-[10px] h-5 min-w-5 justify-center">{unreadInboxCount}</Badge>
                            )}
                        </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuItem onClick={() => setIsNotificationsOpen(true)} className="py-2 cursor-pointer">
                    <Bell className="mr-2 h-4 w-4 text-primary" />
                    <span>Recent Notifications</span>
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-auto text-[10px] h-5 min-w-5 justify-center">{unreadCount}</Badge>
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="py-2 text-destructive focus:bg-destructive/10 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out Session
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
        </div>

        <div className="w-full md:flex-1 md:order-2 md:px-4">
            <div className="relative flex items-center w-full h-10 rounded-xl border border-input bg-muted/50 focus-within:bg-background transition-all">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search active project..."
                    className="pl-10 w-full h-full bg-transparent border-none focus-visible:ring-0"
                    value={localSearchTerm}
                    onChange={(e) => setLocalSearchTerm(e.target.value)}
                />
                <Button variant="ghost" size="icon" className="absolute right-1 h-8 w-8" onClick={() => setIsFilterSheetOpen(true)}>
                    <Filter className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </header>

      <motion.main
        className="flex-1 flex flex-col p-4 md:p-6 bg-muted/20"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {children}
      </motion.main>

      <SettingsSheet isOpen={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <DatabaseAdminDialog isOpen={isInfrastructureOpen} onOpenChange={setIsInfrastructureOpen} />
      
      <AssetFilterSheet
        isOpen={isFilterSheetOpen}
        onOpenChange={setIsFilterSheetOpen}
        locationOptions={[]}
        selectedLocations={[]}
        setSelectedLocations={() => {}}
        assigneeOptions={[]}
        selectedAssignees={[]}
        setSelectedAssignees={() => {}}
        statusOptions={[]}
        selectedStatuses={[]}
        setSelectedStatuses={() => {}}
        missingFieldFilter={""}
        setMissingFieldFilter={() => {}}
      />

       <InboxSheet isOpen={isInboxOpen} onOpenChange={setIsInboxOpen} onApprove={handleApprove} onReject={handleReject} />
       
       <Sheet open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <SheetContent className="w-full sm:max-w-sm p-0 flex flex-col">
            <SheetHeader className="p-6 border-b">
                <SheetTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary"/> Project Updates</SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1">
              {notifications.length > 0 ? (
                notifications.map((notification, index) => (
                  <div key={notification.id} className="relative p-4 border-b hover:bg-muted/30 transition-colors group">
                      <p className={cn("text-sm font-bold", !notification.read ? "text-foreground" : "text-muted-foreground")}>{notification.title}</p>
                      {notification.description && <p className="text-xs text-muted-foreground mt-1">{notification.description}</p>}
                      <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/60 mt-2">{formatDistanceToNow(notification.date, { addSuffix: true })}</p>
                      <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeNotification(notification.id)}><X className="h-3 w-3" /></Button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground/40">
                  <CheckCircle2 className="h-12 w-12 mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">Feed Clear</p>
                </div>
              )}
            </ScrollArea>
            <SheetFooter className="p-4 border-t bg-muted/10">
              <Button variant="ghost" size="sm" className="w-full text-xs font-bold" onClick={() => clearAll()}>Clear All Notifications</Button>
            </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
