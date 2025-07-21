
"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  RefreshCw,
  Database,
  FileDown,
  FileUp,
  PlusCircle,
  Trash2,
  Bell,
  Sun,
  Moon,
  CheckCheck,
  X,
  Inbox,
  HardDrive,
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
import { useTheme } from "next-themes";
import { Separator } from "./ui/separator";
import { InboxSheet } from "./inbox-sheet";
import { ScrollArea } from "./ui/scroll-area";


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { userProfile, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { 
    isOnline, setIsOnline, 
    dataSource, setDataSource,
    searchTerm, setSearchTerm, 
    sortConfig, setSortConfig,
    selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter,
    locationOptions, assigneeOptions, statusOptions,
    setSelectedLocations, setSelectedAssignees, setSelectedStatuses, setMissingFieldFilter,
    setManualSyncTrigger, isSyncing,
    dataActions,
    unreadInboxCount
  } = useAppState();

  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const debouncedSearchTerm = useDebounce(localSearchTerm, 300);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const { setTheme } = useTheme();

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
  
  const handleManualSync = () => {
    if (isSyncing || !isOnline) return;
    setManualSyncTrigger(c => c + 1);
  };

  const handleNotificationsOpenChange = (open: boolean) => {
    setIsNotificationsOpen(open);
    if (open && unreadCount > 0) {
      setTimeout(() => markAllAsRead(), 500);
    }
  }
  
  const activeFilterCount = selectedLocations.length + selectedAssignees.length + selectedStatuses.length + (missingFieldFilter ? 1 : 0);
  const isAdmin = userProfile?.isAdmin || false;

  return (
    <div className="flex flex-col w-full min-h-screen">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:h-16 md:px-6">
        
        {/* Left Side */}
        <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold hidden sm:inline-block">Asset Assist</span>
        </div>

        {/* Center */}
        <div className="flex-1 flex justify-center px-4">
            <div className="w-full max-w-lg">
                {pathname === '/assets' && (
                    <div className="relative flex items-center w-full h-10 rounded-md border border-input bg-muted shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search assets..."
                            className="pl-10 pr-20 w-full h-full bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
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
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 sm:gap-4">
             <div className="flex items-center space-x-2">
                <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                         <HardDrive className={cn("h-5 w-5", dataSource === 'local' && "text-primary")} />
                      </TooltipTrigger>
                      <TooltipContent><p>Local Data</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Switch
                  id="data-source-switch"
                  checked={dataSource === 'cloud'}
                  onCheckedChange={(checked) => setDataSource(checked ? 'cloud' : 'local')}
                  disabled={!isOnline}
                />
                <TooltipProvider>
                   <Tooltip>
                      <TooltipTrigger asChild>
                        <Cloud className={cn("h-5 w-5", dataSource === 'cloud' && "text-primary", !isOnline && "text-muted-foreground/50")} />
                      </TooltipTrigger>
                      <TooltipContent><p>Cloud Data</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
            </div>
            
            <Separator orientation="vertical" className="h-6" />

            <TooltipProvider>
              <Tooltip>
                  <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={handleManualSync} disabled={isSyncing || !isOnline}>
                          {isSyncing ? <div className="animate-spin"><RefreshCw className="h-5 w-5" /></div> : <RefreshCw className="h-5 w-5" />}
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Sync Now</p></TooltipContent>
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
                  
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Database className="mr-2 h-4 w-4" />
                        Data Management
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                           {(isAdmin || !isOnline) && (
                            <DropdownMenuItem onClick={dataActions.onImport} disabled={dataActions.isImporting}>
                              <FileUp className="mr-2 h-4 w-4" />
                              Import from Excel
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={dataActions.onExport}>
                            <FileDown className="mr-2 h-4 w-4" />
                            Export to Excel
                          </DropdownMenuItem>
                           <DropdownMenuItem onClick={dataActions.onAddAsset}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add New Asset
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/20 focus:text-destructive"
                            onClick={dataActions.onClearAll}
                            disabled={!dataActions.hasAssets}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear All Assets
                          </DropdownMenuItem>
                          
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                      <Settings className="mr-2 h-4 w-4"/>
                      Settings
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  
                  {isAdmin && (
                     <DropdownMenuItem onClick={() => setIsInboxOpen(true)}>
                      <Inbox className="mr-2 h-4 w-4" />
                      <span>Inbox</span>
                      {unreadInboxCount > 0 && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
                          {unreadInboxCount}
                        </span>
                      )}
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem onClick={() => handleNotificationsOpenChange(true)}>
                    <Bell className="mr-2 h-4 w-4" />
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                        {unreadCount}
                      </span>
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Sun className="mr-2 h-4 w-4" />
                      <span>Theme</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => setTheme('light')}>
                          Light
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme('dark')}>
                          Dark
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme('system')}>
                          System
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
        </div>
      </header>
      <main className="flex-1 flex flex-col p-4 md:p-6 bg-muted/40">{children}</main>
      <SettingsSheet isOpen={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
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
       <InboxSheet isOpen={isInboxOpen} onOpenChange={setIsInboxOpen} />
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
