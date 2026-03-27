"use client";

import React, { useState, useEffect } from "react";
import dynamic from 'next/dynamic';
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
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  MapPin,
  Inbox,
  MoreVertical,
} from "lucide-react";
import { useNotifications, clearAll, removeNotification } from "@/hooks/use-notifications";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

import { Button } from "./ui/button";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "./ui/skeleton";
import { useAppState } from "@/contexts/app-state-context";
import { Input } from "./ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

const SettingsSheet = dynamic(() => import("./settings-sheet").then(mod => mod.SettingsSheet), { ssr: false });
const InboxSheet = dynamic(() => import("./inbox-sheet").then(mod => mod.InboxSheet), { ssr: false });
const ActivityLogDialog = dynamic(() => import("./admin/activity-log-sheet").then(mod => mod.ActivityLogDialog), { ssr: false });
const DatabaseAdminDialog = dynamic(() => import("./admin/database-admin-dialog").then(mod => mod.DatabaseAdminDialog), { ssr: false });

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { userProfile, loading, logout } = useAuth();
  const isMobile = useIsMobile();
  const { 
    assets, isOnline, setIsOnline, 
    searchTerm, setSearchTerm, 
    sortConfig, setSortConfig,
    globalStateFilters, setGlobalStateFilters,
    setManualDownloadTrigger, setManualUploadTrigger,
    isSyncing, isSettingsOpen, setIsSettingsOpen,
    initialSettingsTab, setInitialSettingsTab, onRevertAsset,
  } = useAppState();

  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const debouncedSearchTerm = useDebounce(localSearchTerm, 300);
  const [isDbAdminOpen, setIsDbAdminOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isActivityLogDialogOpen, setIsActivityLogDialogOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  const { notifications, unreadCount, markAllAsRead } = useNotifications();

  const isAdmin = userProfile?.isAdmin || false;

  useEffect(() => { setSearchTerm(debouncedSearchTerm); }, [debouncedSearchTerm, setSearchTerm]);

  const handleManualDownload = () => !isSyncing && setManualDownloadTrigger(c => c + 1);
  const handleManualUpload = () => !isSyncing && setManualUploadTrigger(c => c + 1);

  const toggleRegionalScope = (state: string) => {
    setGlobalStateFilters(prev => {
        if (state === 'All') return ['All'];
        const withoutAll = prev.filter(s => s !== 'All');
        if (withoutAll.includes(state)) {
            const next = withoutAll.filter(s => s !== state);
            return next.length === 0 ? ['All'] : next;
        }
        return [...withoutAll, state];
    });
  };

  const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  return (
    <div className="flex flex-col w-full h-screen bg-background overflow-hidden">
      <header className="flex flex-col border-b bg-background/95 backdrop-blur-md z-50">
        <div className="flex items-center justify-between px-4 py-2 h-14 sm:h-16 md:px-6">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary rounded-lg"><Boxes className="h-5 w-5 text-primary-foreground" /></div>
                <span className="text-lg font-bold hidden sm:inline-block tracking-tight">Assetain</span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
                {isOnline && (
                  <div className="flex items-center gap-1 mr-2 bg-muted/50 p-1 rounded-lg">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleManualDownload} disabled={isSyncing}>
                        {isSyncing ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <CloudDownload className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleManualUpload} disabled={isSyncing}>
                        {isSyncing ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <CloudUpload className="h-4 w-4" />}
                    </Button>
                  </div>
                )}

                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setIsOnline(!isOnline)}>
                    {isOnline ? <Cloud className="h-5 w-5 text-green-500 animate-pulse" /> : <CloudOff className="h-5 w-5 text-destructive" />}
                </Button>
                
                <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-9 w-9">
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background">{unreadCount}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[350px] p-0 shadow-2xl">
                    <div className="p-4 border-b bg-muted/30 flex items-center justify-between"><h3 className="font-bold">Activity</h3><Badge variant="outline">{unreadCount} Unread</Badge></div>
                    <ScrollArea className="h-64">{/* Notification list */}</ScrollArea>
                  </PopoverContent>
                </Popover>

                {loading ? <Skeleton className="h-10 w-10 rounded-full" /> : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-10 w-10 rounded-full">
                        <Avatar className="h-9 w-9 border-2"><AvatarFallback>{getInitials(userProfile?.displayName)}</AvatarFallback></Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 p-2 shadow-2xl">
                      <DropdownMenuLabel className="p-3">
                        <p className="text-sm font-bold">{userProfile?.displayName}</p>
                        <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 truncate"><MapPin className="h-2.5 w-2.5" /> {globalStateFilters.join(', ')}</p>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      {userProfile?.states && userProfile.states.length > 1 && !isAdmin && (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger><MapPin className="mr-2 h-4 w-4"/> Regional Scope</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-56">
                            {userProfile.states.map(state => (
                              <DropdownMenuCheckboxItem key={state} checked={globalStateFilters.includes(state)} onCheckedChange={() => toggleRegionalScope(state)}>{state}</DropdownMenuCheckboxItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      )}

                      <DropdownMenuItem onClick={() => { setInitialSettingsTab('general'); setIsSettingsOpen(true); }}><Settings className="mr-2 h-4 w-4"/> Settings</DropdownMenuItem>
                      {isAdmin && <DropdownMenuItem onClick={() => setIsDbAdminOpen(true)}><DatabaseZap className="mr-2 h-4 w-4"/> Infrastructure</DropdownMenuItem>}
                      {isAdmin && <DropdownMenuItem onClick={() => setIsInboxOpen(true)}><Inbox className="mr-2 h-4 w-4"/> Approval Queue</DropdownMenuItem>}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={logout} className="text-destructive"><LogOut className="mr-2 h-4 w-4" /> Sign Out</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </div>
        </div>

        <div className="px-4 pb-3 sm:px-6">
            <div className="relative flex items-center w-full h-11">
                <Search className="absolute left-4 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search project assets..." className="pl-11 pr-24 w-full h-full bg-muted/40 rounded-xl" value={localSearchTerm} onChange={(e) => setLocalSearchTerm(e.target.value)} />
            </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full bg-muted/30">
            <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">{children}</div>
        </ScrollArea>
      </main>

      <SettingsSheet isOpen={isSettingsOpen} onOpenChange={setIsSettingsOpen} initialTab={initialSettingsTab} />
      {isAdmin && <DatabaseAdminDialog isOpen={isDbAdminOpen} onOpenChange={setIsDbAdminOpen} />}
      {isAdmin && <ActivityLogDialog isOpen={isActivityLogDialogOpen} onOpenChange={setIsActivityLogDialogOpen} onRevert={onRevertAsset} />}
      {isAdmin && <InboxSheet isOpen={isInboxOpen} onOpenChange={setIsInboxOpen} />}
    </div>
  );
}
