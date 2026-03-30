'use client';

/**
 * @fileOverview AppLayout - The Main Navigation Shell with Governance Triggers.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Boxes, 
  FileUp, 
  FileText, 
  Settings, 
  Cloud, 
  CloudOff,
  LogOut,
  Bell,
  Menu,
  Monitor,
  Inbox,
  History,
  ShieldCheck,
  CheckCircle2,
  ListTodo,
  Users,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DatabaseAdminDialog } from './admin/database-admin-dialog';
import { ActivityLogDialog } from './admin/activity-log-sheet';
import { InboxSheet } from './inbox-sheet';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

const PRIMARY_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Asset Registry', href: '/assets', icon: <Boxes className="h-4 w-4" /> },
  { label: 'Verification Queue', href: '/verify', icon: <CheckCircle2 className="h-4 w-4" /> },
  { label: 'Import Engine', href: '/import', icon: <FileUp className="h-4 w-4" /> },
];

const AUDIT_NAV: NavItem[] = [
  { label: 'Audit Reports', href: '/reports', icon: <FileText className="h-4 w-4" /> },
  { label: 'Activity Log', href: '/audit-log', icon: <History className="h-4 w-4" /> },
  { label: 'Offline Queue', href: '/sync-queue', icon: <ListTodo className="h-4 w-4" /> },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Users & Roles', href: '/users', icon: <Users className="h-4 w-4" /> },
  { label: 'Settings', href: '/settings', icon: <Settings className="h-4 w-4" /> },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userProfile, logout } = useAuth();
  const { isOnline, setIsOnline, isSyncing, assets } = useAppState();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminDBOpen, setIsAdminDBOpen] = useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  const isAdmin = userProfile?.isAdmin;
  const pendingCount = assets.filter(a => a.approvalStatus === 'PENDING').length;

  const NavGroup = ({ items, title }: { items: NavItem[], title?: string }) => (
    <div className="space-y-1">
      {title && <p className="px-4 mb-2 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50 mt-6">{title}</p>}
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest rounded-xl transition-all",
            pathname === item.href 
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {item.icon}
          <span className="flex-1">{item.label}</span>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <aside className="hidden lg:flex flex-col w-72 border-r bg-card/50 backdrop-blur-xl p-6">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="p-2 bg-primary rounded-xl shadow-lg">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter">Assetain</span>
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Enterprise</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
          <NavGroup items={PRIMARY_NAV} />
          <NavGroup items={AUDIT_NAV} title="Reporting & Pulse" />
          {isAdmin && <NavGroup items={ADMIN_NAV} title="Governance" />}

          {isAdmin && (
            <div className="mt-6 space-y-1">
              <p className="px-4 mb-2 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50">Quick Actions</p>
              <Button variant="ghost" onClick={() => setIsInboxOpen(true)} className="w-full justify-between px-4 font-black uppercase text-[10px] tracking-widest rounded-xl h-12">
                <span className="flex items-center gap-3"><Inbox className="h-4 w-4" /> Approvals</span>
                {pendingCount > 0 && <Badge className="bg-primary text-[8px] h-4 min-w-4 flex items-center justify-center p-0">{pendingCount}</Badge>}
              </Button>
              <Button variant="ghost" onClick={() => setIsAdminDBOpen(true)} className="w-full justify-start gap-3 px-4 font-black uppercase text-[10px] tracking-widest rounded-xl h-12">
                <Monitor className="h-4 w-4" /> Infrastructure
              </Button>
            </div>
          )}
        </div>

        <div className="mt-auto space-y-4 pt-6 border-t border-border/40">
          <div className="flex items-center gap-3 px-2">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarFallback className="font-black">{userProfile?.displayName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-black truncate">{userProfile?.displayName}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase truncate">{userProfile?.state || 'Global'}</span>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive font-black uppercase text-[10px] tracking-widest" onClick={() => logout()}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-6 z-30">
          <div className="flex items-center gap-4">
            <div className="lg:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon"><Menu className="h-6 w-6" /></Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-6 flex flex-col">
                  <div className="flex items-center gap-3 mb-10">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                    <span className="text-xl font-black">Assetain</span>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <NavGroup items={PRIMARY_NAV} />
                    <NavGroup items={AUDIT_NAV} title="Reporting & Pulse" />
                    {isAdmin && <NavGroup items={ADMIN_NAV} title="Governance" />}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <h1 className="text-sm font-black uppercase tracking-widest text-muted-foreground hidden sm:block">
              {pathname === '/' ? 'Inventory Pulse' : 
               pathname.split('/').pop()?.replace('-', ' ') || 'Workstation'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-full border-2 transition-all",
              isOnline ? "border-green-500/20 bg-green-500/5 text-green-600" : "border-destructive/20 bg-destructive/5 text-destructive"
            )}>
              {isOnline ? <Cloud className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
              <span className="text-[10px] font-black uppercase tracking-tighter">
                {isOnline ? 'Cloud Active' : 'Offline Mode'}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 ml-1 hover:bg-transparent" 
                onClick={() => setIsOnline(!isOnline)}
              >
                <Activity className="h-3 w-3 opacity-40" />
              </Button>
            </div>
            
            <Button variant="ghost" size="icon" className="relative rounded-full">
              <Bell className="h-5 w-5" />
              <Badge className="absolute top-0 right-0 h-4 w-4 p-0 flex items-center justify-center bg-primary text-[8px] font-black">0</Badge>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-muted/20">
          {children}
        </main>
      </div>

      {isAdmin && (
        <>
          <DatabaseAdminDialog isOpen={isAdminDBOpen} onOpenChange={setIsAdminDBOpen} />
          <InboxSheet isOpen={isInboxOpen} onOpenChange={setIsInboxOpen} />
        </>
      )}
    </div>
  );
}
