'use client';

/**
 * @fileOverview AppLayout - SPA Shell Persistence.
 * Phase 109: Optimized Adaptive Layout & Responsive Width Orchestration.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Boxes, 
  FileText, 
  Settings, 
  Cloud, 
  CloudOff,
  LogOut,
  Menu,
  Monitor,
  History,
  CheckCircle2,
  ListTodo,
  Users,
  Activity,
  Zap,
  Database,
  Globe,
  HelpCircle,
  Terminal,
  Search,
  Command,
  ShieldAlert,
  QrCode,
  ChevronDown,
  Download,
  Upload,
  Bell,
  CheckCheck,
  X,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { HelpCenter } from './HelpCenter';
import { CommandPalette } from './CommandPalette';
import { QRScannerDialog } from './registry/QRScannerDialog';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useNotifications, clearAll, removeNotification } from "@/hooks/use-notifications";
import { formatDistanceToNow } from 'date-fns';
import type { WorkstationView } from '@/types/domain';

interface NavItem {
  label: string;
  view: WorkstationView;
  icon: React.ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  shortcut?: string;
  badgeCount?: number;
}

const ENGINEERING_NAV: NavItem[] = [
  { label: 'Asset Registry', view: 'REGISTRY', icon: <Boxes className="h-4 w-4" />, shortcut: 'R' },
];

const AUDIT_NAV: NavItem[] = [
  { label: 'Verify Queue', view: 'VERIFY', icon: <CheckCircle2 className="h-4 w-4" />, shortcut: 'V' },
  { label: 'Sync Queue', view: 'SYNC_QUEUE', icon: <ListTodo className="h-4 w-4" />, shortcut: 'Q' },
  { label: 'Reporting', view: 'REPORTS', icon: <FileText className="h-4 w-4" /> },
  { label: 'Ledger', view: 'AUDIT_LOG', icon: <History className="h-4 w-4" />, shortcut: 'L' },
];

const GOVERNANCE_NAV: NavItem[] = [
  { label: 'Settings', view: 'SETTINGS', icon: <Settings className="h-4 w-4" />, adminOnly: true, shortcut: ',' },
  { label: 'Faults', view: 'ERROR_AUDIT', icon: <ShieldAlert className="h-4 w-4" />, adminOnly: true },
  { label: 'Database', view: 'DATABASE', icon: <Terminal className="h-4 w-4" />, superAdminOnly: true },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { userProfile, logout } = useAuth();
  const { toast } = useToast();
  const { 
    isOnline, 
    setIsOnline, 
    isSyncing, 
    assets, 
    appSettings, 
    refreshRegistry, 
    manualDownload,
    manualUpload,
    activeView, 
    setActiveView 
  } = useAppState();
  
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const { notifications, unreadCount, markAllAsRead } = useNotifications();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'r') setActiveView('REGISTRY');
      if (e.key === 'd') setActiveView('DASHBOARD');
      if (e.key === 'v') setActiveView('VERIFY');
      if (e.key === 'q') setActiveView('SYNC_QUEUE');
      if (e.key === 's') refreshRegistry();
      if (e.key === '?' || e.key === 'h') setIsHelpOpen(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveView, refreshRegistry]);

  const isAdmin = userProfile?.isAdmin;
  
  const alertCount = useMemo(() => {
    return assets.filter(a => 
      ['Stolen', 'Burnt', 'Unsalvageable'].includes(a.condition || '') ||
      a.status === 'DISCREPANCY'
    ).length;
  }, [assets]);

  const handleQRSuccess = (assetId: string) => {
    setActiveView('REGISTRY');
    toast({ title: "QR Pulse Detected", description: "Navigating to record profile..." });
  };

  const NavItemButton = ({ item, isAlert = false }: { item: NavItem, isAlert?: boolean }) => {
    const isActive = activeView === item.view;
    return (
      <button 
        onClick={() => { setActiveView(item.view); }} 
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all relative overflow-hidden group shrink-0", 
          isActive 
            ? (isAlert ? "bg-destructive text-white shadow-lg" : "bg-primary text-primary-foreground shadow-lg") 
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <div className="z-10 flex items-center gap-2 sm:gap-3">
          {item.icon}
          <span className="whitespace-nowrap hidden xs:inline">{item.label}</span>
          {item.badgeCount && item.badgeCount > 0 ? (
            <Badge className={cn(
              "h-4 min-w-4 flex items-center justify-center p-0 rounded-full font-black text-[7px]",
              isActive ? "bg-white text-primary" : "bg-primary text-white"
            )}>
              {item.badgeCount}
            </Badge>
          ) : null}
        </div>
        {isActive && <motion.div layoutId="nav-active" className="absolute inset-0 bg-current opacity-100 z-0" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden font-body selection:bg-primary/20">
      
      {/* Header Pulse */}
      <header className="h-16 shrink-0 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-30">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => setActiveView('DASHBOARD')}>
            <div className="p-1.5 sm:p-2 bg-primary rounded-xl shadow-lg">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-black tracking-tighter uppercase leading-none">Assetain</span>
              <span className="text-[7px] sm:text-[8px] font-black uppercase text-primary tracking-[0.2em] mt-0.5">Core</span>
            </div>
          </div>
          
          <Separator orientation="vertical" className="h-6 mx-1 sm:mx-2 opacity-40" />

          <button 
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }))}
            className="flex items-center gap-2 px-2 h-9 rounded-xl bg-muted/50 border-2 border-transparent hover:border-primary/20 transition-all group"
          >
            <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 hidden sm:inline">Search</span>
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsQRScannerOpen(true)}
            className="rounded-xl border-2 border-primary/10 bg-primary/5 text-primary h-9 w-9 sm:h-10 sm:w-10 shadow-sm"
          >
            <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          <div className="hidden sm:flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={manualDownload} disabled={isSyncing || !isOnline} className="rounded-xl h-10 w-10 bg-card">
              <Download className={cn("h-4 w-4 text-primary", isSyncing && "animate-spin")} />
            </Button>
            <Button variant="outline" size="icon" onClick={manualUpload} disabled={isSyncing || !isOnline} className="rounded-xl h-10 w-10 bg-card">
              <Upload className={cn("h-4 w-4 text-primary", isSyncing && "animate-spin")} />
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsNotificationsOpen(true)}
            className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-xl"
          >
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            {unreadCount > 0 && <Badge className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center p-0 rounded-full bg-primary text-white text-[8px] font-black border-2 border-background">{unreadCount}</Badge>}
          </Button>

          <button 
            onClick={() => setIsOnline(!isOnline)}
            className={cn(
              "flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border-2 transition-all shadow-sm", 
              isOnline ? "border-green-500/20 bg-green-50/5 text-green-600" : "border-destructive/20 bg-destructive/5 text-destructive animate-pulse"
            )}
          >
            <div className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-green-500 animate-pulse" : "bg-destructive")} />
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tighter hidden xxs:inline">{isOnline ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </header>

      {/* Workspace Area - Optimized Adaptive Padding */}
      <main className="flex-1 overflow-hidden bg-muted/10 relative">
        <ScrollArea className="h-full w-full custom-scrollbar">
          <div className="adaptive-container py-6 sm:py-8 lg:py-10">
            {children}
          </div>
        </ScrollArea>
      </main>

      {/* Bottom Navigation Dock */}
      <aside className="h-16 sm:h-20 shrink-0 border-t bg-card/50 backdrop-blur-xl flex items-center px-2 sm:px-4 md:px-8 z-40">
        <div className="flex-1 flex items-center gap-2 sm:gap-6 overflow-hidden h-full">
          <button 
            onClick={() => setActiveView('DASHBOARD')} 
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 sm:px-4 h-full rounded-xl transition-all group shrink-0",
              activeView === 'DASHBOARD' ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest">Dash</span>
          </button>

          <Separator orientation="vertical" className="h-8 opacity-20 hidden xs:block" />

          <ScrollArea className="flex-1 h-full">
            <div className="flex items-center gap-1 sm:gap-2 h-full">
              {ENGINEERING_NAV.map(item => <NavItemButton key={item.view} item={item} />)}
              
              <div className="flex items-center gap-1 sm:gap-2 border-l border-r border-border/40 px-2 sm:px-4 mx-1 sm:mx-2 h-full">
                {AUDIT_NAV.map(item => <NavItemButton key={item.view} item={item} />)}
              </div>

              {isAdmin && (
                <div className="flex items-center gap-1 sm:gap-2 pr-2 sm:pr-4 border-r border-border/40 mr-1 sm:mx-2 h-full">
                  {GOVERNANCE_NAV.map(item => <NavItemButton key={item.view} item={item} />)}
                </div>
              )}

              <NavItemButton 
                item={{ label: 'Risk', view: 'ALERTS', icon: <ShieldAlert className="h-4 w-4" />, badgeCount: alertCount }} 
                isAlert={true}
              />
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 ml-2 sm:ml-6 pl-2 sm:pl-6 border-l border-border/40 h-full">
          <Button variant="ghost" size="icon" onClick={() => setIsHelpOpen(true)} className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-primary/5 text-primary hidden sm:flex">
            <HelpCircle className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group hover:bg-muted/50 p-1 sm:p-1.5 rounded-2xl transition-all border border-transparent hover:border-border/40">
                <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border-2 border-primary/20 shadow-md">
                  <AvatarFallback className="font-black bg-muted text-primary text-[10px] uppercase">{userProfile?.displayName?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col min-w-0">
                  <span className="text-[10px] font-black truncate uppercase leading-none">{userProfile?.displayName}</span>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase truncate tracking-tighter mt-1">{userProfile?.state || 'Global'}</span>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl border-2 shadow-2xl p-2 mb-4">
              <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-[0.3em] px-3 pb-2 opacity-40">System Session</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setIsHelpOpen(true)} className="rounded-xl h-11 flex items-center gap-3 cursor-pointer mb-1">
                <HelpCircle className="h-4 w-4" />
                <span className="font-bold text-[10px] uppercase">Documentation</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsQRScannerOpen(true)} className="rounded-xl h-11 flex items-center gap-3 cursor-pointer mb-1 sm:hidden">
                <QrCode className="h-4 w-4" />
                <span className="font-bold text-[10px] uppercase">QR Scanner</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()} className="rounded-xl h-11 flex items-center gap-3 cursor-pointer text-destructive hover:bg-destructive/5">
                <LogOut className="mr-2 h-4 w-4" />
                <span className="font-bold text-[10px] uppercase">Terminate Session</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <HelpCenter isOpen={isHelpOpen} onOpenChange={setIsHelpOpen} />
      <CommandPalette />
      <QRScannerDialog isOpen={isQRScannerOpen} onOpenChange={setIsQRScannerOpen} onScanSuccess={handleQRSuccess} />

      {/* Activity Center */}
      <Sheet open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col rounded-l-[2rem] sm:rounded-l-[2.5rem] border-none bg-black/95 text-white shadow-2xl">
            <SheetHeader className="p-6 sm:p-8 border-b border-white/5 flex flex-row items-center justify-between space-y-0">
                <SheetTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">Activity Center</SheetTitle>
                <Badge variant="outline" className="h-7 px-4 rounded-full border-white/10 text-white font-black text-[10px] uppercase bg-white/5">{unreadCount} New</Badge>
            </SheetHeader>
            <ScrollArea className="flex-1 custom-scrollbar">
              {notifications.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="relative group p-6 sm:p-8 transition-colors hover:bg-white/5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <p className={cn("text-base sm:text-lg font-black uppercase tracking-tight leading-none", notification.read ? "text-white/40" : "text-white")}>{notification.title}</p>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-white/20 opacity-0 group-hover:opacity-100 hover:text-white" onClick={() => removeNotification(notification.id)}><X className="h-4 w-4" /></Button>
                        </div>
                        {notification.description && <p className={cn("text-xs sm:text-sm font-medium italic leading-relaxed", notification.read ? "text-white/20" : "text-white/60")}>{notification.description}</p>}
                        <div className="flex items-center gap-2 pt-2 opacity-20"><Clock className="h-3 w-3" /><span className="text-[9px] sm:text-[10px] font-black uppercase">{formatDistanceToNow(notification.date, { addSuffix: true })}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-6 text-center p-10 sm:p-20 h-full opacity-20">
                  <div className="p-6 sm:p-8 bg-white/5 rounded-[2.5rem] sm:rounded-[3rem] shadow-inner"><CheckCheck className="h-12 w-12 sm:h-16 sm:w-16" /></div>
                  <h3 className="text-lg sm:text-xl font-black uppercase tracking-widest">Center Clear</h3>
                </div>
              )}
            </ScrollArea>
            <div className="p-6 sm:p-8 border-t border-white/5 bg-black/40">
              <Button variant="ghost" onClick={() => clearAll()} className="w-full h-12 sm:h-14 rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-[0.2em] text-white/40 hover:text-white hover:bg-white/5 transition-all">Clear All History</Button>
            </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}