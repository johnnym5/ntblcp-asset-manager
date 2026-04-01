'use client';

/**
 * @fileOverview AppLayout - Unified Command Shell.
 * Phase 118: Fixed Notification interaction and unified theme pulses.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Boxes, 
  FileText, 
  Settings, 
  Cloud, 
  CloudOff,
  LogOut,
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
  QrCode,
  Bell,
  CheckCheck,
  X,
  Clock,
  LayoutGrid,
  ShieldAlert,
  ChevronRight,
  ShieldCheck,
  Package,
  Wrench,
  Command,
  User,
  Power
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { HelpCenter } from './HelpCenter';
import { CommandPalette } from './CommandPalette';
import { QRScannerDialog } from './registry/QRScannerDialog';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { useNotifications, clearAll, markAllAsRead, removeNotification } from "@/hooks/use-notifications";
import { formatDistanceToNow } from 'date-fns';
import type { WorkstationView } from '@/types/domain';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { userProfile, logout } = useAuth();
  const { toast } = useToast();
  const { 
    isOnline, 
    setIsOnline, 
    isSyncing, 
    assets, 
    activeView, 
    setActiveView 
  } = useAppState();
  
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPortalOpen, setIsPortalOpen] = useState(false);

  const { notifications, unreadCount } = useNotifications();

  const isAdmin = userProfile?.isAdmin;
  const isSuperAdmin = userProfile?.role === 'SUPERADMIN' || userProfile?.loginName === 'admin';

  const alertCount = useMemo(() => {
    return assets.filter(a => 
      ['Stolen', 'Burnt', 'Unsalvageable'].includes(a.condition || '') ||
      a.status === 'DISCREPANCY'
    ).length;
  }, [assets]);

  const handlePortalNavigate = (view: WorkstationView) => {
    setActiveView(view);
    setIsPortalOpen(false);
  };

  const handleOpenNotifications = () => {
    setIsNotificationsOpen(true);
    if (unreadCount > 0) {
      markAllAsRead();
    }
  };

  const PortalGroup = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-2">
        <Icon className="h-4 w-4 text-primary opacity-40" />
        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{title}</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  );

  const PortalItem = ({ label, view, icon: Icon, description, badge }: { label: string, view: WorkstationView, icon: any, description: string, badge?: number }) => (
    <button 
      onClick={() => handlePortalNavigate(view)}
      className="w-full text-left p-5 rounded-[1.5rem] bg-white/[0.03] border-2 border-white/5 hover:border-primary/40 hover:bg-primary/[0.02] transition-all group flex items-center justify-between"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="p-3 bg-white/5 rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black uppercase tracking-tight text-white group-hover:text-primary transition-colors">{label}</span>
            {badge ? <Badge className="bg-destructive text-white text-[8px] h-4 min-w-4 p-0 flex items-center justify-center rounded-full">{badge}</Badge> : null}
          </div>
          <span className="text-[9px] font-bold text-white/40 uppercase truncate">{description}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary" />
    </button>
  );

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden font-body selection:bg-primary/20">
      
      {/* Header Command Strip */}
      <header className="h-16 shrink-0 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('DASHBOARD')}>
            <div className="p-2 bg-primary rounded-xl shadow-lg">
              <Zap className="h-5 w-5 text-primary-foreground fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tighter uppercase leading-none">Assetain</span>
              <span className="text-[8px] font-black uppercase text-primary tracking-[0.2em] mt-0.5">Intelligence Hub</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsOnline(!isOnline)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all shadow-sm hidden xs:flex", 
              isOnline ? "border-green-500/20 bg-green-50/5 text-green-600" : "border-destructive/20 bg-destructive/5 text-destructive animate-pulse"
            )}
          >
            <div className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-green-500 animate-pulse" : "bg-destructive")} />
            <span className="text-[9px] font-black uppercase tracking-tighter">{isOnline ? 'CLOUD ACTIVE' : 'OFFLINE PULSE'}</span>
          </button>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleOpenNotifications} 
            className="relative h-10 w-10 rounded-xl bg-muted/30 hover:bg-primary/10 group transition-all"
          >
            <Bell className="h-5 w-5 group-hover:text-primary transition-colors" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center p-0 rounded-full bg-primary text-white text-[8px] font-black border-2 border-background animate-in zoom-in duration-300">
                {unreadCount}
              </Badge>
            )}
          </Button>

          {/* Management Terminal Trigger */}
          <div 
            onClick={() => setIsPortalOpen(true)}
            className="flex items-center gap-3 cursor-pointer group hover:bg-muted/50 p-1.5 rounded-2xl transition-all border-2 border-transparent hover:border-primary/20 bg-card/50 shadow-sm ml-2 relative"
          >
            <Avatar className="h-9 w-9 border-2 border-primary/20 shadow-md">
              <AvatarFallback className="font-black bg-muted text-primary text-[10px] uppercase">{userProfile?.displayName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col min-w-0 pr-2">
              <span className="text-[10px] font-black truncate uppercase leading-none text-foreground">{userProfile?.displayName}</span>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="h-1 w-1 rounded-full bg-primary" />
                <span className="text-[8px] font-bold text-muted-foreground uppercase truncate tracking-tighter">{userProfile?.role}</span>
              </div>
            </div>
            {alertCount > 0 && (
              <Badge className="absolute -top-1 -left-1 bg-destructive text-white text-[7px] font-black h-4 min-w-4 p-0 flex items-center justify-center rounded-full border-2 border-background shadow-lg animate-pulse">
                {alertCount}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 overflow-hidden bg-muted/10 relative">
        <ScrollArea className="h-full w-full">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10">
            {children}
          </div>
        </ScrollArea>
      </main>

      {/* Bottom Dock */}
      <aside className="h-20 shrink-0 border-t bg-card/80 backdrop-blur-2xl flex items-center px-4 md:px-10 z-40">
        <div className="max-w-[1600px] mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveView('DASHBOARD')} 
              className={cn(
                "flex items-center gap-3 px-6 h-12 rounded-2xl transition-all group shrink-0 tactile-pulse",
                activeView === 'DASHBOARD' ? "bg-primary text-black shadow-xl" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Intelligence Center</span>
            </button>
            <Separator orientation="vertical" className="h-8 mx-4 opacity-20 hidden sm:block" />
            <div className="hidden md:flex items-center gap-2">
              <Badge variant="outline" className={cn("h-8 px-4 rounded-xl border-2 transition-all", isSyncing ? "border-primary/40 animate-pulse" : "border-border/40 opacity-40")}>
                <Activity className="h-3 w-3 mr-2" />
                <span className="text-[8px] font-black uppercase tracking-widest">{isSyncing ? 'SYNC_ACTIVE' : 'SYSTEM_IDLE'}</span>
              </Badge>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4">
            <button onClick={() => setIsHelpOpen(true)} className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground hover:text-primary transition-colors">
              <HelpCircle className="h-4 w-4" /> Documentation
            </button>
            <Separator orientation="vertical" className="h-4 opacity-20" />
            <p className="text-[9px] font-mono text-muted-foreground opacity-40">VER 5.0.4</p>
          </div>
        </div>
      </aside>

      {/* Management Portal */}
      <Sheet open={isPortalOpen} onOpenChange={setIsPortalOpen}>
        <SheetContent side="bottom" className="h-[90vh] bg-black border-none rounded-t-[3rem] p-0 flex flex-col overflow-hidden text-white shadow-3xl">
          <div className="p-10 pb-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-primary rounded-[1.5rem] shadow-2xl">
                <Terminal className="h-8 w-8 text-black" />
              </div>
              <div className="space-y-1">
                <SheetTitle className="text-3xl font-black uppercase tracking-tight text-white leading-none">Management Terminal</SheetTitle>
                <SheetDescription className="text-[10px] font-black uppercase text-primary tracking-[0.3em] opacity-60">Professional Operational Orchestration Pulse</SheetDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsPortalOpen(false)} className="h-14 w-14 rounded-2xl bg-white/5 hover:bg-white/10 text-white">
              <X className="h-6 w-6" />
            </Button>
          </div>

          <ScrollArea className="flex-1 custom-scrollbar">
            <div className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-16">
              
              <div className="lg:col-span-12">
                <div className="p-8 rounded-[2rem] bg-white/5 border-2 border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20 border-4 border-primary/20">
                      <AvatarFallback className="bg-muted text-primary text-2xl font-black">{userProfile?.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black uppercase tracking-tight">{userProfile?.displayName}</h3>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-primary text-black font-black uppercase text-[10px]">{userProfile?.role}</Badge>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{userProfile?.email}</span>
                      </div>
                      <p className="text-[10px] font-black uppercase text-primary/60 mt-2">Active Scope: {userProfile?.state || 'Global'}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setIsQRScannerOpen(true)} className="h-14 px-8 rounded-2xl border-white/10 bg-white/5 font-black uppercase text-[10px] tracking-widest gap-3">
                      <QrCode className="h-4 w-4" /> Identity Scan
                    </Button>
                    <Button onClick={() => logout()} className="h-14 px-10 rounded-2xl bg-destructive text-white font-black uppercase text-[10px] tracking-widest gap-3 shadow-xl shadow-destructive/20 transition-transform hover:scale-105 active:scale-95">
                      <Power className="h-4 w-4" /> Terminate Session
                    </Button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-10">
                <PortalGroup title="Registry Audit" icon={Activity}>
                  <PortalItem label="Verify Queue" view="VERIFY" icon={CheckCircle2} description="Field Assessment pulses" />
                  <PortalItem label="Sync Ledger" view="SYNC_QUEUE" icon={ListTodo} description="Pending modifications" />
                  <PortalItem label="Reporting" view="REPORTS" icon={FileText} description="Executive documentation" />
                  <PortalItem label="Activity" view="AUDIT_LOG" icon={History} description="Forensic traceability" />
                  <PortalItem label="Exceptions" view="ALERTS" icon={ShieldAlert} description="Critical risk alerts" badge={alertCount} />
                </PortalGroup>
              </div>

              <div className="lg:col-span-4 space-y-10">
                <PortalGroup title="Control & Identity" icon={Wrench}>
                  <PortalItem label="Environment" view="SETTINGS" icon={Settings} description="UI/UX & System Pulse" />
                  <PortalItem label="Identity" view="SETTINGS" icon={Users} description="User Governance & Scopes" />
                  <PortalItem label="Resilience" view="ERROR_AUDIT" icon={ShieldCheck} description="System fault ledger" />
                </PortalGroup>
              </div>

              <div className="lg:col-span-4 space-y-10">
                {isSuperAdmin ? (
                  <PortalGroup title="Infrastructure Hub" icon={Database}>
                    <PortalItem label="Hybrid Database" view="DATABASE" icon={Terminal} description="Mission control orchestration" />
                    <div className="p-8 rounded-[2rem] bg-primary/5 border-2 border-dashed border-primary/20 space-y-4">
                      <div className="flex items-center gap-3">
                        <ShieldAlert className="h-5 w-5 text-primary" />
                        <h5 className="text-[10px] font-black uppercase text-primary">Authority Guard</h5>
                      </div>
                      <p className="text-[10px] font-medium text-white/40 italic leading-relaxed">Infrastructure controls are restricted to the master system identity.</p>
                    </div>
                  </PortalGroup>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-10 opacity-20 text-center border-4 border-dashed border-white/5 rounded-[3rem]">
                    <Lock className="h-16 w-16 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Infrastructure Clearance Required</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Notification Sheet */}
      <Sheet open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col border-none shadow-3xl bg-background rounded-l-[2rem]">
          <div className="p-8 border-b bg-muted/20">
            <SheetHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Bell className="text-primary h-6 w-6" />
                  </div>
                  <SheetTitle className="text-2xl font-black uppercase tracking-tight">System Pulse</SheetTitle>
                </div>
                {notifications.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => clearAll()} className="h-8 text-[9px] font-black uppercase text-muted-foreground hover:text-destructive">
                    Clear All
                  </Button>
                )}
              </div>
              <SheetDescription className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">Registry modifications and connectivity alerts.</SheetDescription>
            </SheetHeader>
          </div>

          <ScrollArea className="flex-1 custom-scrollbar">
            {notifications.length > 0 ? (
              <div className="divide-y border-b">
                {notifications.map((n) => (
                  <div key={n.id} className={cn("p-6 relative group hover:bg-primary/[0.02] transition-colors", !n.read && "bg-primary/[0.01]")}>
                    <div className="flex gap-4">
                      <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", n.read ? "bg-muted" : "bg-primary animate-pulse")} />
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-black uppercase tracking-tight leading-none">{n.title}</p>
                        <p className="text-xs font-medium text-muted-foreground leading-relaxed italic">{n.description}</p>
                        <p className="text-[9px] font-bold uppercase opacity-40 pt-2 flex items-center gap-2">
                          <Clock className="h-2.5 w-2.5" /> {formatDistanceToNow(n.date, { addSuffix: true })}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeNotification(n.id)} 
                        className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-10 opacity-20 text-center gap-4">
                <CheckCheck className="h-16 w-16" />
                <p className="text-sm font-black uppercase tracking-widest">Pulse Status: Clear</p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <HelpCenter isOpen={isHelpOpen} onOpenChange={setIsHelpOpen} />
      <CommandPalette />
      <QRScannerDialog isOpen={isQRScannerOpen} onOpenChange={setIsQRScannerOpen} onScanSuccess={() => {}} />
    </div>
  );
}