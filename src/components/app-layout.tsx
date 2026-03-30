'use client';

/**
 * @fileOverview AppLayout - The Main Navigation Shell with Governance Triggers.
 * Phase 39: Integrated Evidence Gallery Pulse.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Inbox,
  History,
  CheckCircle2,
  ListTodo,
  Users,
  Activity,
  Zap,
  Database,
  Globe,
  HelpCircle,
  X,
  Camera,
  Terminal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { InboxSheet } from './inbox-sheet';
import { HelpCenter } from './HelpCenter';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  shortcut?: string;
}

const PRIMARY_NAV: NavItem[] = [
  { label: 'Pulse', href: '/', icon: <LayoutDashboard className="h-4 w-4" />, shortcut: 'D' },
  { label: 'Registry', href: '/assets', icon: <Boxes className="h-4 w-4" />, shortcut: 'R' },
  { label: 'Review', href: '/verify', icon: <CheckCircle2 className="h-4 w-4" />, shortcut: 'V' },
  { label: 'Evidence', href: '/gallery', icon: <Camera className="h-4 w-4" />, shortcut: 'G' },
  { label: 'Upload', href: '/import', icon: <FileUp className="h-4 w-4" />, shortcut: 'U' },
];

const AUDIT_NAV: NavItem[] = [
  { label: 'Reports', href: '/reports', icon: <FileText className="h-4 w-4" /> },
  { label: 'Ledger', href: '/audit-log', icon: <History className="h-4 w-4" />, shortcut: 'L' },
  { label: 'Sync Queue', href: '/sync-queue', icon: <ListTodo className="h-4 w-4" />, shortcut: 'Q' },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Identities', href: '/users', icon: <Users className="h-4 w-4" />, adminOnly: true },
  { label: 'System', href: '/infrastructure', icon: <Monitor className="h-4 w-4" />, adminOnly: true },
  { label: 'Database', href: '/admin/database', icon: <Terminal className="h-4 w-4" />, superAdminOnly: true },
  { label: 'Settings', href: '/settings', icon: <Settings className="h-4 w-4" />, adminOnly: true, shortcut: ',' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { userProfile, logout } = useAuth();
  const { toast } = useToast();
  const { isOnline, setIsOnline, isSyncing, assets, appSettings, refreshRegistry } = useAppState();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'r') router.push('/assets');
      if (e.key === 'd') router.push('/');
      if (e.key === 'g') router.push('/gallery');
      if (e.key === 'u') router.push('/import');
      if (e.key === 'v') router.push('/verify');
      if (e.key === 'q') router.push('/sync-queue');
      if (e.key === 's') refreshRegistry();
      if (e.key === '?' || e.key === 'h') setIsHelpOpen(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, refreshRegistry]);

  const isAdmin = userProfile?.isAdmin;
  const isSuperAdmin = userProfile?.isSuperAdmin || userProfile?.isAdmin;
  const pendingCount = assets.filter(a => a.approvalStatus === 'PENDING').length;
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
        {title && <p className="px-4 mb-2 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50 mt-6">{title}</p>}
        {visibleItems.map((item) => (
          <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className={cn("flex items-center gap-3 px-4 py-3 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all relative overflow-hidden group", pathname === item.href ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <div className="z-10 flex items-center gap-3 w-full">
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {isAdvanced && item.shortcut && <kbd className="text-[8px] font-mono opacity-20 group-hover:opacity-60 border px-1.5 py-0.5 rounded-md bg-muted/20">{item.shortcut}</kbd>}
            </div>
            {pathname === item.href && <motion.div layoutId="nav-active" className="absolute inset-0 bg-primary z-0" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-body selection:bg-primary/10">
      <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r bg-card/50 backdrop-blur-xl p-6">
        <div className="flex items-center gap-3 mb-10 px-2"><div className="p-2.5 bg-primary rounded-2xl shadow-xl shadow-primary/20"><Zap className="h-6 w-6 text-primary-foreground fill-current" /></div><div className="flex flex-col"><span className="text-xl font-black tracking-tighter uppercase leading-none">Assetain</span><span className="text-[9px] font-black uppercase text-primary tracking-[0.3em] mt-1">Enterprise Core</span></div></div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2"><NavGroup items={PRIMARY_NAV} /><NavGroup items={AUDIT_NAV} title="Reporting & Pulse" /><NavGroup items={ADMIN_NAV} title="Governance" />{isAdmin && <div className="mt-6 space-y-1"><p className="px-4 mb-2 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50">Quick Actions</p><Button variant="ghost" onClick={() => setIsInboxOpen(true)} className="w-full justify-between px-4 font-black uppercase text-[10px] tracking-widest rounded-xl h-12 hover:bg-primary/5 hover:text-primary transition-all group"><span className="flex items-center gap-3"><Inbox className="h-4 w-4 group-hover:scale-110 transition-transform" /> Approvals</span>{pendingCount > 0 && <Badge className="bg-primary text-[8px] h-4 min-w-4 flex items-center justify-center p-0 rounded-full animate-pulse">{pendingCount}</Badge>}</Button></div>}</div>
        <div className="mt-auto space-y-4 pt-6 border-t border-border/40"><Button variant="ghost" onClick={() => setIsHelpOpen(true)} className="w-full justify-start font-black uppercase text-[10px] tracking-widest rounded-xl h-12 hover:bg-primary/5 hover:text-primary transition-all group"><HelpCircle className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform" /> Support Hub</Button><div className="p-4 rounded-2xl bg-muted/20 border-2 border-dashed space-y-3"><div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest opacity-40"><span>Security Pulse</span><div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" /></div><div className="flex items-center gap-3"><Avatar className="h-10 w-10 border-2 border-primary/20 shadow-md"><AvatarFallback className="font-black bg-muted text-primary text-xs uppercase">{userProfile?.displayName?.[0] || 'U'}</AvatarFallback></Avatar><div className="flex flex-col min-w-0"><span className="text-xs font-black truncate uppercase">{userProfile?.displayName}</span><span className="text-[9px] font-bold text-muted-foreground uppercase truncate tracking-tighter">{userProfile?.state || 'Global Scope'}</span></div></div></div><Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive font-black uppercase text-[10px] tracking-widest rounded-xl h-12 transition-colors" onClick={() => logout()}><LogOut className="mr-3 h-4 w-4" /> Sign Out</Button></div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-30">
          <div className="flex items-center gap-4"><div className="lg:hidden"><Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="rounded-xl tactile-pulse"><Menu className="h-6 w-6" /></Button></SheetTrigger><SheetContent side="left" className="w-[85vw] max-w-sm p-0 flex flex-col rounded-r-[2.5rem] border-none bg-background shadow-2xl"><div className="p-8 pb-4 flex items-center justify-between"><div className="flex items-center gap-3"><Zap className="h-6 w-6 text-primary fill-current" /><span className="text-xl font-black uppercase tracking-tighter">Assetain</span></div><Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="rounded-xl"><X className="h-5 w-5" /></Button></div><ScrollArea className="flex-1 px-6 py-4"><div className="pb-10"><NavGroup items={PRIMARY_NAV} /><NavGroup items={AUDIT_NAV} title="Reporting & Pulse" /><NavGroup items={ADMIN_NAV} title="Governance" /></div></ScrollArea></SheetContent></Sheet></div><h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2"><span className="opacity-40 hidden sm:inline">Context ›</span><span className="text-foreground">{pathname === '/' ? 'Pulse' : pathname.split('/').pop()?.replace('-', ' ')}</span></h1></div>
          <div className="flex items-center gap-2 sm:gap-4"><TooltipProvider><Tooltip><TooltipTrigger asChild><div className={cn("flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-2xl border-2 transition-all cursor-help", isOnline ? "border-green-500/20 bg-green-500/5 text-green-600" : "border-destructive/20 bg-destructive/5 text-destructive")}><div className="flex items-center gap-1.5"><div className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-green-500 animate-pulse" : "bg-destructive")} /><span className="text-[10px] font-black uppercase tracking-tighter hidden xs:inline">{isOnline ? 'Active' : 'Offline'}</span></div><Separator orientation="vertical" className="h-4 opacity-20 hidden xs:block" /><div className="flex gap-1"><Database className={cn("h-3 w-3", isOnline ? "text-green-600" : "text-destructive")} /><Activity className={cn("h-3 w-3", isSyncing ? "text-primary animate-pulse" : "opacity-30")} /><Globe className={cn("h-3 w-3", isOnline ? "text-green-600" : "text-destructive")} /></div></div></TooltipTrigger><TooltipContent side="bottom" className="p-4 rounded-2xl border-2 shadow-2xl space-y-2 min-w-[200px]"><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground border-b pb-2">Parity Status</p><div className="space-y-1 text-[10px] font-bold"><div className="flex justify-between"><span className="opacity-60">Local Layer:</span><span className="text-green-600">Stable</span></div><div className="flex justify-between"><span className="opacity-60">Primary Cloud:</span><span className={cn(isOnline ? "text-green-600" : "text-destructive")}>{isOnline ? 'Active Pulse' : 'Offline'}</span></div></div></TooltipContent></Tooltip></TooltipProvider></div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar bg-muted/10 relative">
          <AnimatePresence mode="wait"><motion.div key={pathname} initial={{ opacity: 0, y: 10, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.99 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="p-4 md:p-8 lg:p-10"><div className="max-w-[1600px] mx-auto h-full">{children}</div></motion.div></AnimatePresence>
        </main>
      </div>

      {isAdmin && <InboxSheet isOpen={isInboxOpen} onOpenChange={setIsInboxOpen} />}
      <HelpCenter isOpen={isHelpOpen} onOpenChange={setIsHelpOpen} />
    </div>
  );
}
