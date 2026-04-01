'use client';

/**
 * @fileOverview AppLayout - SPA Shell Persistence.
 * Phase 80: Integrated ERROR_AUDIT into Governance command group.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Boxes, 
  FileUp, 
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
  Navigation
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { InboxSheet } from './inbox-sheet';
import { HelpCenter } from './HelpCenter';
import { CommandPalette } from './CommandPalette';
import { QRScannerDialog } from './registry/QRScannerDialog';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ScrollArea } from './ui/scroll-area';
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
  { label: 'Import Center', view: 'IMPORT', icon: <FileUp className="h-4 w-4" />, shortcut: 'U' },
  { label: 'GIS Spatial Hub', view: 'GIS', icon: <Navigation className="h-4 w-4" />, shortcut: 'G' },
];

const AUDIT_NAV: NavItem[] = [
  { label: 'Verification Queue', view: 'VERIFY', icon: <CheckCircle2 className="h-4 w-4" />, shortcut: 'V' },
  { label: 'Sync Queue', view: 'SYNC_QUEUE', icon: <ListTodo className="h-4 w-4" />, shortcut: 'Q' },
  { label: 'Reporting Hub', view: 'REPORTS', icon: <FileText className="h-4 w-4" /> },
  { label: 'Activity Ledger', view: 'AUDIT_LOG', icon: <History className="h-4 w-4" />, shortcut: 'L' },
];

const GOVERNANCE_NAV: NavItem[] = [
  { label: 'Identities', view: 'USERS', icon: <Users className="h-4 w-4" />, adminOnly: true },
  { label: 'Infrastructure', view: 'INFRASTRUCTURE', icon: <Monitor className="h-4 w-4" />, adminOnly: true },
  { label: 'Resilience Audit', view: 'ERROR_AUDIT', icon: <ShieldAlert className="h-4 w-4" />, adminOnly: true },
  { label: 'Database Control', view: 'DATABASE', icon: <Terminal className="h-4 w-4" />, superAdminOnly: true },
  { label: 'System Settings', view: 'SETTINGS', icon: <Settings className="h-4 w-4" />, adminOnly: true, shortcut: ',' },
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
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'r') setActiveView('REGISTRY');
      if (e.key === 'd') setActiveView('DASHBOARD');
      if (e.key === 'g') setActiveView('GIS');
      if (e.key === 'u') setActiveView('IMPORT');
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
  const pendingCount = assets.filter(a => a.approvalStatus === 'PENDING').length;
  
  const alertCount = useMemo(() => {
    return assets.filter(a => 
      ['Stolen', 'Burnt', 'Unsalvageable'].includes(a.condition || '') ||
      a.status === 'DISCREPANCY'
    ).length;
  }, [assets]);

  const isAdvanced = appSettings?.uxMode === 'advanced';

  const NavGroup = ({ items, title }: { items: NavItem[], title?: string }) => {
    const visibleItems = items.filter(i => {
      if (i.superAdminOnly) return isSuperAdmin;
      if (i.adminOnly) return isAdmin;
      return true;
    });
    if (visibleItems.length === 0) return null;

    return (
      <div className="space-y-1">
        {title && (
          <p className="px-4 mb-2 text-[9px] font-black uppercase tracking-[0.3em] text-primary mt-6">
            {title}
          </p>
        )}
        {visibleItems.map((item) => (
          <button 
            key={item.view} 
            onClick={() => { setActiveView(item.view); setIsMobileMenuOpen(false); }} 
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all relative overflow-hidden group", 
              activeView === item.view ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <div className="z-10 flex items-center gap-3 w-full">
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.badgeCount && item.badgeCount > 0 ? (
                <Badge className={cn(
                  "h-5 min-w-5 flex items-center justify-center p-0 rounded-full font-black text-[8px]",
                  activeView === item.view ? "bg-white text-primary" : "bg-primary text-white"
                )}>
                  {item.badgeCount}
                </Badge>
              ) : null}
              {isAdvanced && item.shortcut && <kbd className="text-[8px] font-mono opacity-20 group-hover:opacity-60 border px-1.5 py-0.5 rounded-md bg-muted/20">{item.shortcut}</kbd>}
            </div>
            {activeView === item.view && <motion.div layoutId="nav-active" className="absolute inset-0 bg-primary z-0" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
          </button>
        ))}
      </div>
    );
  };

  const handleQRSuccess = (assetId: string) => {
    setActiveView('REGISTRY');
    toast({ title: "QR Pulse Detected", description: "Navigating to record profile..." });
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-body selection:bg-primary/10">
      <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r bg-card/50 backdrop-blur-xl p-6">
        <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={() => setActiveView('DASHBOARD')}>
          <div className="p-2.5 bg-primary rounded-2xl shadow-xl shadow-primary/20">
            <Zap className="h-6 w-6 text-primary-foreground fill-current" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter uppercase leading-none">Assetain</span>
            <span className="text-[9px] font-black uppercase text-primary tracking-[0.3em] mt-1">Enterprise Core</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
          <button 
            onClick={() => setActiveView('DASHBOARD')} 
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 mb-2 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all group",
              activeView === 'DASHBOARD' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard Hub</span>
          </button>

          <NavGroup items={ENGINEERING_NAV} title="Registry Engineering" />
          
          <div className="mt-6 space-y-1">
            <p className="px-4 mb-2 text-[9px] font-black uppercase tracking-[0.3em] text-destructive">Tactical Alerts</p>
            <button 
              onClick={() => setActiveView('ALERTS')} 
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all group", 
                activeView === 'ALERTS' ? "bg-destructive text-white shadow-xl" : "text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
              )}
            >
              <ShieldAlert className="h-4 w-4" />
              <span className="flex-1 text-left">Risk Alerts</span>
              {alertCount > 0 && <Badge className={cn("h-5 min-w-5 flex items-center justify-center p-0 rounded-full font-black text-[8px] animate-pulse", activeView === 'ALERTS' ? "bg-white text-destructive" : "bg-destructive text-white")}>{alertCount}</Badge>}
            </button>
          </div>

          <NavGroup items={GOVERNANCE_NAV} title="Governance & Systems" />
        </div>
        
        <div className="mt-auto space-y-4 pt-6 border-t border-border/40">
          <Button variant="ghost" onClick={() => setIsHelpOpen(true)} className="w-full justify-start font-black uppercase text-[10px] tracking-widest rounded-xl h-12 hover:bg-primary/5 hover:text-primary transition-all group">
            <HelpCircle className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform" /> Support Hub
          </Button>
          <div className="p-4 rounded-2xl bg-muted/20 border-2 border-dashed space-y-3">
            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest opacity-40">
              <span>Security Pulse</span>
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-md">
                <AvatarFallback className="font-black bg-muted text-primary text-xs uppercase">{userProfile?.displayName?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black truncate uppercase">{userProfile?.displayName}</span>
                <span className="text-[9px] font-bold text-muted-foreground uppercase truncate tracking-tighter">{userProfile?.state || 'Global Scope'}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive font-black uppercase text-[10px] tracking-widest rounded-xl h-12 transition-colors" onClick={() => logout()}>
            <LogOut className="mr-3 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-30">
          <div className="flex items-center gap-4">
            <div className="lg:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl tactile-pulse">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85vw] max-w-sm p-0 flex flex-col rounded-r-[2.5rem] border-none bg-background shadow-2xl">
                  <SheetHeader className="p-8 pb-4">
                    <SheetTitle className="flex items-center gap-3">
                      <Zap className="h-6 w-6 text-primary fill-current" />
                      <span className="text-xl font-black uppercase tracking-tighter">Assetain</span>
                    </SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="flex-1 px-6 py-4">
                    <div className="pb-10">
                      <button 
                        onClick={() => { setActiveView('DASHBOARD'); setIsMobileMenuOpen(false); }} 
                        className="w-full flex items-center gap-3 px-4 py-3 mb-4 text-[11px] font-bold uppercase tracking-widest rounded-xl bg-muted"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </button>
                      <NavGroup items={ENGINEERING_NAV} title="Registry Engineering" />
                      <NavGroup items={GOVERNANCE_NAV} title="Governance & Systems" />
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>
            <div className="flex items-center gap-4">
              <h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                <span className="opacity-40 hidden sm:inline">Context ›</span>
                <span className="text-foreground">{activeView.replace('_', ' ')}</span>
              </h1>
              
              <button 
                onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }))}
                className="hidden md:flex items-center gap-2 px-3 h-9 rounded-xl bg-muted/50 border-2 border-transparent hover:border-primary/20 transition-all group"
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Search pulse</span>
                <div className="flex items-center gap-1 opacity-40">
                  <Command className="h-3 w-3" />
                  <span className="text-[10px] font-mono">K</span>
                </div>
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden lg:flex items-center gap-2 border-l border-r px-4 border-border/40 mx-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-10 px-4 rounded-2xl font-black text-[9px] uppercase tracking-widest gap-2 hover:bg-primary/5 hover:text-primary transition-all group">
                    <Activity className="h-4 w-4 text-primary group-hover:animate-pulse" />
                    <span className="hidden xl:inline">Audit & Traceability</span>
                    <ChevronDown className="h-3 w-3 opacity-40 group-data-[state=open]:rotate-180 transition-transform" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-[2rem] border-2 shadow-2xl p-2 mt-2">
                  <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-[0.3em] px-3 pb-2 opacity-40">Operational Traceability</DropdownMenuLabel>
                  {AUDIT_NAV.map(item => (
                    <DropdownMenuItem 
                      key={item.view} 
                      onClick={() => setActiveView(item.view)}
                      className={cn(
                        "rounded-xl h-12 flex items-center gap-3 px-3 cursor-pointer mb-1 transition-colors",
                        activeView === item.view ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      )}
                    >
                      {item.icon}
                      <span className="font-bold text-[10px] uppercase tracking-widest">{item.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsQRScannerOpen(true)}
              className="rounded-2xl border-2 border-primary/10 bg-primary/5 text-primary hover:bg-primary/10 lg:hidden shadow-sm"
            >
              <QrCode className="h-5 w-5" />
            </Button>

            <div className="hidden sm:flex items-center gap-2 mr-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={manualDownload} 
                      disabled={isSyncing || !isOnline}
                      className="rounded-xl border-2 h-10 w-10 bg-card hover:bg-primary/5"
                    >
                      <Download className={cn("h-4 w-4 text-primary", isSyncing && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-xl font-bold uppercase text-[9px] tracking-widest">Manual Download (Cloud -> Device)</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={manualUpload} 
                      disabled={isSyncing || !isOnline}
                      className="rounded-xl border-2 h-10 w-10 bg-card hover:bg-primary/5"
                    >
                      <Upload className={cn("h-4 w-4 text-primary", isSyncing && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-xl font-bold uppercase text-[9px] tracking-widest">Manual Upload (Device -> Cloud)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsInboxOpen(true)}
                    className="relative h-10 w-10 rounded-2xl hover:bg-primary/5 hover:text-primary transition-all group"
                  >
                    <Bell className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    {pendingCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center p-0 rounded-full bg-primary text-white text-[8px] font-black border-2 border-background animate-pulse shadow-sm">
                        {pendingCount}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="rounded-xl font-bold uppercase text-[9px] tracking-widest">Approvals & Notifications</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setIsOnline(!isOnline)}
                    className={cn(
                      "flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-2xl border-2 transition-all cursor-pointer shadow-sm", 
                      isOnline ? "border-green-500/20 bg-green-50/5 text-green-600" : "border-destructive/20 bg-destructive/5 text-destructive animate-pulse"
                    )}
                  >
                    <div className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-green-500 animate-pulse" : "bg-destructive")} />
                    <span className="text-[10px] font-black uppercase tracking-tighter hidden xs:inline">{isOnline ? 'Cloud' : 'Offline'}</span>
                    <Separator orientation="vertical" className="h-4 opacity-20 hidden xs:block" />
                    <div className="flex gap-1">
                      <Database className={cn("h-3 w-3", isOnline ? "text-green-600" : "text-destructive")} />
                      <Activity className={cn("h-3 w-3", isSyncing ? "text-primary animate-pulse" : "opacity-30")} />
                      <Globe className={cn("h-3 w-3", isOnline ? "text-green-600" : "text-destructive")} />
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="p-4 rounded-[1.5rem] border-2 shadow-2xl space-y-2 min-w-[220px]">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b pb-2">Cloud Pulse Protocol</p>
                  <div className="space-y-1.5 text-[10px] font-bold">
                    <div className="flex justify-between items-center"><span className="opacity-60">Status:</span><span className={cn(isOnline ? "text-green-600" : "text-destructive")}>{isOnline ? 'ONLINE AWARE' : 'MANUAL ISOLATION'}</span></div>
                    <div className="flex justify-between items-center"><span className="opacity-60">Local Storage:</span><span className="text-green-600">PERSISTENT</span></div>
                  </div>
                  <p className="pt-2 text-[8px] font-medium italic text-muted-foreground leading-tight">Tap to toggle cloud awareness. Fully manual on-device pulse enabled.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </header>

        <main className="flex-1 overflow-hidden bg-muted/10 relative">
          <div className="h-full w-full overflow-y-auto custom-scrollbar p-4 md:p-8 lg:p-10">
            <div className="max-w-[1600px] mx-auto h-full">
              {children}
            </div>
          </div>
        </main>
      </div>

      <InboxSheet isOpen={isInboxOpen} onOpenChange={setIsInboxOpen} />
      <HelpCenter isOpen={isHelpOpen} onOpenChange={setIsHelpOpen} />
      <CommandPalette />
      <QRScannerDialog isOpen={isQRScannerOpen} onOpenChange={setIsQRScannerOpen} onScanSuccess={handleQRSuccess} />
    </div>
  );
}
