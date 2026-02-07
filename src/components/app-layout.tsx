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
  Database,
  Flame,
  DatabaseZap,
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
import { ScrollArea } from "./ui/scroll-area";
import { DatabaseAdminDialog } from "./admin/database-admin-dialog";


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { userProfile, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { 
    isOnline, setIsOnline, 
    searchTerm, setSearchTerm, 
    sortConfig, setSortConfig,
    selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter,
    locationOptions, assigneeOptions, statusOptions,
    setSelectedLocations, setSelectedAssignees, setSelectedStatuses, setMissingFieldFilter,
    setManualDownloadTrigger,
    setManualUploadTrigger,
    isSyncing,
    appSettings,
  } = useAppState();

  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const debouncedSearchTerm = useDebounce(localSearchTerm, 300);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDbAdminOpen, setIsDbAdminOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

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

  const sortableFields: { key: keyof Asset, label: string }[] = [
      { key: 'sn', label: 'S/N' },
      { key: 'description', label: 'Description' },
      { key: 'category', label: 'Category' },
      { key: 'location', label: 'Location' },
      { key: 'verifiedDate', label: 'Verified Date' },
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
      addNotification({
        title: "Currently Offline",
        description: "Please connect to the internet to download from the cloud.",
        variant: "destructive"
      });
      return;
    }
    if (isSyncing) return;
    setManualDownloadTrigger(c => c + 1);
  };
  
  const handleManualUpload = () => {
    if (!isOnline) {
      addNotification({
        title: "Currently Offline",
        description: "Please connect to the internet to upload to the cloud.",
        variant: "destructive"
      });
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
  
  const activeFilterCount = selectedLocations.length + selectedAssignees.length + selectedStatuses.length + (missingFieldFilter ? 1 : 0);

  return (
    <div className="flex flex-col w-full h-screen border-8 border-muted/50">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b bg-background/95 px-4 py-2 backdrop-blur-sm md:h-16 md:flex-nowrap md:py-0 md:px-6">
        
        {/* Left Side */}
        <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold hidden sm:inline-block">Asset Manager</span>
        </div>
        
        {/* Right Side */}
        <div className="flex items-center gap-2 md:order-3 sm:gap-4">
            {isOnline && (
              <>
                <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={handleManualDownload} disabled={isSyncing}>
                              {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CloudDownload className="h-5 w-5" />}
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Download from Cloud</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={handleManualUpload} disabled={isSyncing}>
                              {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CloudUpload className="h-5 w-5" />}
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Upload to Cloud</p></TooltipContent>
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
                            onClick={() => {
                                const newIsOnline = !isOnline;
                                setIsOnline(newIsOnline);
                                addNotification({
                                    title: `Mode Changed to ${newIsOnline ? 'Online' : 'Offline'}`,
                                    description: newIsOnline
                                        ? 'Application is now connecting to the server.'
                                        : 'Application is running in offline mode.',
                                });
                            }}
                            aria-label={`Switch to ${isOnline ? 'Online' : 'Online'} mode`}
                        >
                           {isOnline ? (
                                appSettings.databaseSource === 'firestore' ? (
                                    <Cloud className="h-5 w-5 text-green-500" />
                                ) : (
                                    <Flame className="h-5 w-5 text-orange-500" />
                                )
                            ) : (
                                <CloudOff className="h-5 w-5 text-red-500" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isOnline 
                            ? (appSettings.databaseSource === 'firestore' ? 'Online (Firestore)' : 'Online (Realtime DB)')
                            : 'Offline'
                        }</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative" onClick={() => handleNotificationsOpenChange(true)}>
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                                {unreadCount}
                            </span>
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Notifications</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {loading ? (
              <Skeleton className="h-10 w-10 rounded-full" />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={''} alt={getUserName()} />
                      <AvatarFallback>{getInitials(userProfile?.displayName)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{getUserName()}</p>
                      <p className="text-xs text-muted-foreground">{userProfile?.state}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {userProfile && (
                    <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                      <Settings className="mr-2 h-4 w-4"/>
                      Settings
                    </DropdownMenuItem>
                  )}

                  {userProfile?.loginName === 'admin' && (
                     <DropdownMenuItem onClick={() => setIsDbAdminOpen(true)}>
                      <DatabaseZap className="mr-2 h-4 w-4"/>
                      Database Admin
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
        </div>

        {/* Center Search */}
        <div className="w-full md:flex-1 md:order-2 md:px-4">
            {pathname === '/' && (
                <div className="relative flex items-center w-full h-10 rounded-full border border-input bg-muted shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                    <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search assets..."
                        className="pl-10 pr-20 w-full h-full bg-transparent border-none rounded-full focus-visible:ring-0 focus-visible:ring-offset-0"
                        value={localSearchTerm}
                        onChange={(e) => setLocalSearchTerm(e.target.value)}
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Sort assets">
                                    <ArrowUpDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {sortableFields.map(field => (
                                    <DropdownMenuItem key={field.key} onClick={() => handleSort(field.key)}>
                                        {field.label}
                                        {sortConfig?.key === field.key && (
                                            <span className="ml-auto text-xs">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                         <Button variant="ghost" size="icon" className="h-8 w-8 relative" onClick={() => setIsFilterSheetOpen(true)}>
                            <Filter className="h-4 w-4" />
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                    {activeFilterCount}
                                </span>
                            )}
                         </Button>
                    </div>
                </div>
            )}
        </div>
      </header>
      <motion.main
        className="flex-1 flex flex-col p-4 md:p-6 bg-muted/40 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        {children}
      </motion.main>
      <SettingsSheet isOpen={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      {userProfile?.loginName === 'admin' && (
        <DatabaseAdminDialog isOpen={isDbAdminOpen} onOpenChange={setIsDbAdminOpen} />
      )}
      <AssetFilterSheet
        isOpen={isFilterSheetOpen}
        onOpenChange={setIsFilterSheetOpen}
        locationOptions={locationOptions}
        selectedLocations={selectedLocations}
        setSelectedLocations={setSelectedLocations}
        assigneeOptions={assigneeOptions}
        selectedAssignees={selectedAssignees}
        setSelectedAssignees={setSelectedAssignees}
        statusOptions={statusOptions}
        selectedStatuses={selectedStatuses}
        setSelectedStatuses={setSelectedStatuses}
        missingFieldFilter={missingFieldFilter}
        setMissingFieldFilter={setMissingFieldFilter}
      />
       <Sheet open={isNotificationsOpen} onOpenChange={handleNotificationsOpenChange}>
        <SheetContent className="w-full sm:max-w-sm p-0 flex flex-col">
            <SheetHeader className="p-4">
                <SheetTitle>Notifications</SheetTitle>
            </SheetHeader>
            <Separator />
            <ScrollArea className="flex-1">
              {notifications.length > 0 ? (
                notifications.map((notification, index) => (
                  <div key={notification.id}>
                    <div className="relative group p-4">
                      <p className={cn("font-semibold mb-1 pr-8", !notification.read && "text-foreground", notification.read && "text-muted-foreground")}>
                        {notification.title}
                      </p>
                      {notification.description && (
                        <p className={cn("text-sm pr-8", !notification.read && "text-muted-foreground", notification.read && "text-muted-foreground/70")}>
                          {notification.description}
                        </p>
                      )}
                      {notification.action && <div className="mt-2">{notification.action}</div>}
                      <p className="text-xs text-muted-foreground/80 mt-2">
                        {formatDistanceToNow(notification.date, { addSuffix: true })}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-3 right-3 h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100"
                        onClick={() => removeNotification(notification.id)}
                        aria-label="Dismiss notification"
                      >
                          <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {index < notifications.length - 1 && <Separator />}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-center p-8 text-muted-foreground h-full">
                  <CheckCheck className="h-8 w-8" />
                  <p className="text-sm font-medium">You're all caught up!</p>
                  <p className="text-xs">New notifications will appear here.</p>
                </div>
              )}
            </ScrollArea>
            <SheetFooter className="p-4 border-t">
              {notifications.length > 0 && (
                <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => clearAll()}>
                  Clear all
                </Button>
              )}
            </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
