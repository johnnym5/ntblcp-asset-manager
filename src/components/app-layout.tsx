'use client';

/**
 * @fileOverview AppLayout - SPA Shell Persistence.
 * Phase 107: Relocated sidebar to a horizontal bottom dock and disabled GIS Spatial Hub.
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
  { label: 'Verification Queue', view: 'VERIFY', icon: <CheckCircle2 className="h-4 w-4" />, shortcut: 'V' },
  { label: 'Sync Queue', view: 'SYNC_QUEUE', icon: <ListTodo className="h-4 w-4" />, shortcut: 'Q' },
  { label: 'Reporting Hub', view: 'REPORTS', icon: <FileText className="h-4 w-4" /> },
  { label: 'Activity Ledger', view: 'AUDIT_LOG', icon: <History className="h-4 w-4" />, shortcut: 'L' },
];

const GOVERNANCE_NAV: NavItem[] = [
  { label: 'Master Control', view: 'SETTINGS', icon: <Settings className="h-4 w-4" />, adminOnly: true, shortcut: ',' },
  { label: 'Resilience Audit', view: 'ERROR_AUDIT', icon: <ShieldAlert className="h-4 w-4" />, adminOnly: true },
  { label: 'Database Control', view: 'DATABASE', icon: <Terminal className="h-4 w-4" />, superAdminOnly: true },
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
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
  const isSuperAdmin = userProfile?.isAdmin;
  
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
        onClick={() => { setActiveView(item.view); setIsMobileMenuOpen(false); }} 
        className={cn(
          "flex items-center gap-3 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all relative overflow-hidden group shrink-0", 
          isActive 
            ? (isAlert ? "bg-destructive text-white shadow-lg shadow-destructive/20" : "bg-primary text-primary-foreground shadow-lg shadow-primary/20") 
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <div className="z-10 flex items-center gap-3">
          {item.icon}
          <span className="whitespace-nowrap">{item.label}</span>
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
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden font-body selection:bg-primary/10">
      
      {/* Header Pulse */}
      <header className="h-16 shrink-0 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('DASHBOARD')}>
            <div className="p-2 bg-primary rounded-xl shadow-xl shadow-primary/20">
              <Zap className="h-5 w-5 text-primary-foreground fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tighter uppercase leading-none">Assetain</span>
              <span className="text-[8px] font-black uppercase text-primary tracking-[0.3em] mt-0.5">Enterprise Core</span>
            </div>
          </div>
          
          <Separator orientation="vertical" className="h-6 mx-2 hidden sm:block opacity-40" />

          <button 
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }))}
            className="hidden md:flex items-center gap-2 px-3 h-9 rounded-xl bg-muted/50 border-2 border-transparent hover:border-primary/20 transition-all group"
          >
            <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Search pulse</span>
            <div className="flex items-center gap-1 opacity-40">
              <Command className="h-3 w-3" />
              <span className="text-[9px] font-mono">K</span>
            </div>
          </button>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsQRScannerOpen(true)}
            className="rounded-xl border-2 border-primary/10 bg-primary/5 text-primary h-10 w-10 shadow-sm"
          >
            <QrCode className="h-5 w-5" />
          </Button>

          <div className="hidden sm:flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={manualDownload} disabled={isSyncing || !isOnline} className="rounded-xl h-10 w-10 bg-card">
                    <Download className={cn("h-4 w-4 text-primary", isSyncing && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="rounded-xl font-bold uppercase text-[9px] tracking-widest">Download Cloud State</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={manualUpload} disabled={isSyncing || !isOnline} className="rounded-xl h-10 w-10 bg-card">
                    <Upload className={cn("h-4 w-4 text-primary", isSyncing && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="rounded-xl font-bold uppercase text-[9px] tracking-widest">Upload Local Changes</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsNotificationsOpen(true)}
                  className="relative h-10 w-10 rounded-xl"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && <Badge className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center p-0 rounded-full bg-primary text-white text-[8px] font-black border-2 border-background">{unreadCount}</Badge>}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="rounded-xl font-bold uppercase text-[9px]">Activity Center</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <button 
            onClick={() => setIsOnline(!isOnline)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all shadow-sm", 
              isOnline ? "border-green-500/20 bg-green-50/5 text-green-600" : "border-destructive/20 bg-destructive/5 text-destructive animate-pulse"
            )}
          >
            <div className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-green-500 animate-pulse" : "bg-destructive")} />
            <span className="text-[9px] font-black uppercase tracking-tighter hidden xs:inline">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </button>
        </div>
      </header>

      {/* Workspace Area */}
      <main className="flex-1 overflow-hidden bg-muted/10 relative">
        <ScrollArea className="h-full w-full custom-scrollbar">
          <div className="p-4 md:p-8 lg:p-10 max-w-[1600px] mx-auto">
            {children}
          </div>
        </ScrollArea>
      </main>

      {/* Bottom Navigation Dock */}
      <aside className="h-20 shrink-0 border-t bg-card/50 backdrop-blur-xl flex items-center px-4 md:px-8 z-40">
        <div className="flex-1 flex items-center gap-6 overflow-hidden">
          <button 
            onClick={() => setActiveView('DASHBOARD')} 
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all group",
              activeView === 'DASHBOARD' ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Dashboard</span>
          </button>

          <Separator orientation="vertical" className="h-8 opacity-20" />

          <ScrollArea className="flex-1">
            <div className="flex items-center gap-2 pb-2">
              {ENGINEERING_NAV.map(item => <NavItemButton key={item.view} item={item} />)}
              
              <div className="flex items-center gap-2 border-l border-r border-border/40 px-4 mx-2">
                {AUDIT_NAV.map(item => <NavItemButton key={item.view} item={item} />)}
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2 pr-4 border-r border-border/40 mr-2">
                  {GOVERNANCE_NAV.map(item => <NavItemButton key={item.view} item={item} />)}
                </div>
              )}

              <NavItemButton 
                item={{ label: 'Risk Alerts', view: 'ALERTS', icon: <ShieldAlert className="h-4 w-4" />, badgeCount: alertCount }} 
                isAlert={true}
              />
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div className="flex items-center gap-4 ml-6 pl-6 border-l border-border/40">
          <Button variant="ghost" size="icon" onClick={() => setIsHelpOpen(true)} className="h-10 w-10 rounded-xl hover:bg-primary/5 text-primary">
            <HelpCircle className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 cursor-pointer group hover:bg-muted/50 p-1.5 pr-3 rounded-2xl transition-all border border-transparent hover:border-border/40">
                <Avatar className="h-9 w-9 border-2 border-primary/20 shadow-md">
                  <AvatarFallback className="font-black bg-muted text-primary text-xs uppercase">{userProfile?.displayName?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col min-w-0">
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
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()} className="rounded-xl h-11 flex items-center gap-3 cursor-pointer text-destructive hover:bg-destructive/5">
                <LogOut className="h-4 w-4" />
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
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col rounded-l-[2.5rem] border-none bg-black/95 text-white shadow-2xl">
            <SheetHeader className="p-8 border-b border-white/5 flex flex-row items-center justify-between space-y-0">
                <SheetTitle className="text-2xl font-black uppercase tracking-tight text-white">Activity Center</SheetTitle>
                <Badge variant="outline" className="h-7 px-4 rounded-full border-white/10 text-white font-black text-[10px] uppercase bg-white/5">{unreadCount} Unread</Badge>
            </SheetHeader>
            <ScrollArea className="flex-1 custom-scrollbar">
              {notifications.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="relative group p-8 transition-colors hover:bg-white/5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <p className={cn("text-lg font-black uppercase tracking-tight leading-none", notification.read ? "text-white/40" : "text-white")}>{notification.title}</p>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-white/20 opacity-0 group-hover:opacity-100 hover:text-white" onClick={() => removeNotification(notification.id)}><X className="h-4 w-4" /></Button>
                        </div>
                        {notification.description && <p className={cn("text-sm font-medium italic leading-relaxed", notification.read ? "text-white/20" : "text-white/60")}>{notification.description}</p>}
                        <div className="flex items-center gap-2 pt-2 opacity-20"><Clock className="h-3 w-3" /><span className="text-[10px] font-black uppercase">{formatDistanceToNow(notification.date, { addSuffix: true })}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-6 text-center p-20 h-full opacity-20">
                  <div className="p-8 bg-white/5 rounded-[3rem] shadow-inner"><CheckCheck className="h-16 w-16" /></div>
                  <h3 className="text-xl font-black uppercase tracking-widest">Center Clear</h3>
                </div>
              )}
            </ScrollArea>
            <div className="p-8 border-t border-white/5 bg-black/40">
              <Button variant="ghost" onClick={() => clearAll()} className="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] text-white/40 hover:text-white hover:bg-white/5 transition-all">Clear All History</Button>
            </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
