'use client';

/**
 * @fileOverview Root Shell - Unified Single-Page Operational Hub.
 * Phase 190: Merged Audit Trail and Cloud Sync Status into the Unified Dashboard.
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import UserProfileSetup from '@/components/user-profile-setup';
import { 
  LayoutDashboard, 
  Boxes, 
  FileUp, 
  ShieldCheck, 
  Activity, 
  Settings,
  Map,
  History,
  AlertTriangle,
  Loader2,
  Package,
  LogOut,
  ChevronRight,
  Menu,
  Database,
  Monitor,
  CloudDownload,
  CloudUpload,
  Bell,
  Search,
  RefreshCw,
  LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { DashboardWorkstation } from '@/components/workstations/DashboardWorkstation';
import { ImportWorkstation } from '@/components/workstations/ImportWorkstation';
import { AlertsWorkstation } from '@/components/workstations/AlertsWorkstation';
import { SettingsWorkstation } from '@/components/workstations/SettingsWorkstation';
import { RegionalScopeDrawer } from '@/components/registry/RegionalScopeDrawer';
import { NotificationsSheet } from '@/components/NotificationsSheet';
import { CommandPalette } from '@/components/CommandPalette';
import { WelcomeExperience } from '@/components/WelcomeExperience';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useNotifications } from '@/hooks/use-notifications';
import type { WorkstationView } from '@/types/domain';

export default function SPAHub() {
  const { userProfile, loading, profileSetupComplete, logout } = useAuth();
  const { activeView, setActiveView, appSettings, isOnline, isSyncing, manualDownload, manualUpload } = useAppState();
  const { unreadCount } = useNotifications();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isScopeOpen, setIsScopeOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (profileSetupComplete && !appSettings?.onboardingComplete) {
      setShowWelcome(true);
    }
  }, [profileSetupComplete, appSettings]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!profileSetupComplete) {
    return <UserProfileSetup />;
  }

  // Phase 190: Audit Trail and Sync Status merged into Dashboard
  const navItems: { id: WorkstationView; label: string; icon: any; adminOnly?: boolean; group: string }[] = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard, group: 'Core' },
    { id: 'IMPORT', label: 'Data Import Center', icon: FileUp, group: 'Tools' },
    { id: 'ALERTS', label: 'Critical Exceptions', icon: AlertTriangle, group: 'Tools' },
    { id: 'SETTINGS', label: 'Settings', icon: Settings, group: 'System Administration' },
  ];

  const renderWorkstation = () => {
    switch (activeView) {
      case 'DASHBOARD': return <DashboardWorkstation />;
      case 'IMPORT': return <ImportWorkstation />;
      case 'ALERTS': return <AlertsWorkstation />;
      case 'SETTINGS': return <SettingsWorkstation />;
      default: return <DashboardWorkstation />;
    }
  };

  const NavButton = ({ item }: { item: typeof navItems[0] }) => (
    <button
      onClick={() => { setActiveView(item.id); setIsSidebarOpen(false); }}
      className={cn(
        "w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group tactile-pulse",
        activeView === item.id 
          ? "bg-primary text-black shadow-2xl shadow-primary/20 scale-[1.02] z-10" 
          : "text-white/40 hover:text-white hover:bg-white/5"
      )}
    >
      <div className="flex items-center gap-4">
        <item.icon className={cn("h-5 w-5 transition-transform duration-500", activeView === item.id ? "scale-110" : "group-hover:scale-110")} />
        <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
      </div>
      {activeView === item.id && <ChevronRight className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="flex h-screen bg-black overflow-hidden font-sans selection:bg-primary/30">
      <CommandPalette />
      <WelcomeExperience isOpen={showWelcome} onComplete={() => setShowWelcome(false)} />
      <NotificationsSheet isOpen={isNotificationsOpen} onOpenChange={setIsNotificationsOpen} />
      
      <aside className={cn(
        "bg-[#050505] border-r border-white/5 flex flex-col transition-all duration-700 ease-out z-50 fixed inset-y-0 left-0 lg:relative lg:translate-x-0",
        isSidebarOpen ? "w-[280px] translate-x-0" : "w-[280px] -translate-x-full"
      )}>
        <div className="p-8 pb-4 flex items-center gap-4">
          <div className="p-2.5 bg-primary rounded-2xl shadow-xl shadow-primary/20">
            <Boxes className="h-6 w-6 text-black fill-current" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tighter text-white uppercase leading-none">NTBLCP</h1>
            <span className="text-[8px] font-black uppercase text-primary tracking-[0.3em] mt-1.5 opacity-60">Asset Register</span>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 py-8">
          <div className="space-y-10 pb-20">
            {['Core', 'Tools', 'System Administration'].map(group => {
              const items = navItems.filter(i => i.group === group && (!i.adminOnly || userProfile?.isAdmin));
              if (items.length === 0) return null;
              return (
                <div key={group} className="space-y-3">
                  <h4 className="px-4 text-[9px] font-black uppercase tracking-[0.4em] text-white/20">{group}</h4>
                  <div className="space-y-1">
                    {items.map(item => <NavButton key={item.id} item={item} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-white/5 bg-black/40">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-4 p-4 rounded-xl text-white/40 hover:text-red-500 hover:bg-red-500/5 transition-all"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden bg-black">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/80 backdrop-blur-3xl z-40">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-white/60 hover:text-white">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Boxes className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-xl font-black uppercase text-white tracking-tighter">NTBLCP</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-4">
              <button 
                onClick={manualDownload} 
                disabled={isSyncing}
                title="Fetch Cloud Updates"
                className="p-2.5 bg-white/5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all tactile-pulse"
              >
                <CloudDownload className={cn("h-4 w-4", isSyncing && "animate-pulse")} />
              </button>
              <button 
                onClick={manualUpload} 
                disabled={isSyncing}
                title="Push Local Changes"
                className="p-2.5 bg-white/5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all tactile-pulse"
              >
                <CloudUpload className={cn("h-4 w-4", isSyncing && "animate-spin")} />
              </button>
            </div>
            
            <div className="flex items-center gap-3 pr-4 border-r border-white/5">
              <div className={cn("h-2.5 w-2.5 rounded-full", isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500")} />
              <button 
                onClick={() => setIsNotificationsOpen(true)}
                className="relative p-2.5 bg-white/5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all tactile-pulse"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-600 rounded-full flex items-center justify-center border-2 border-black animate-in zoom-in duration-300">
                    <span className="text-[8px] font-black text-white leading-none">{unreadCount}</span>
                  </div>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3 group cursor-pointer pl-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary text-xs shadow-xl group-hover:bg-primary group-hover:text-black transition-all">
                {userProfile?.displayName?.[0] || 'SA'}
              </div>
            </div>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="p-6 lg:p-10 min-h-full">
            <ErrorBoundary module={activeView}>
              <Suspense fallback={
                <div className="h-[60vh] flex flex-col items-center justify-center gap-6 opacity-40">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Waking Workstation...</p>
                </div>
              }>
                {renderWorkstation()}
              </Suspense>
            </ErrorBoundary>
          </div>
        </ScrollArea>
      </main>

      <RegionalScopeDrawer isOpen={isScopeOpen} onOpenChange={setIsScopeOpen} />
    </div>
  );
}
