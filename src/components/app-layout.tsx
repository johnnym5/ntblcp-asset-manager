'use client';

/**
 * @fileOverview AppLayout - The Main Navigation Shell.
 */

import React from 'react';
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
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Asset Registry', href: '/assets', icon: <Boxes className="h-4 w-4" /> },
  { label: 'Import Data', href: '/import', icon: <FileUp className="h-4 w-4" /> },
  { label: 'Audit Reports', href: '/reports', icon: <FileText className="h-4 w-4" /> },
  { label: 'Settings', href: '/settings', icon: <Settings className="h-4 w-4" /> },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userProfile, logout } = useAuth();
  const { isOnline, setIsOnline, isSyncing } = useAppState();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const NavLinks = ({ className, onClick }: { className?: string, onClick?: () => void }) => (
    <nav className={cn("space-y-1", className)}>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClick}
          className={cn(
            "flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest rounded-xl transition-all",
            pathname === item.href 
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <aside className="hidden lg:flex flex-col w-72 border-r bg-card/50 backdrop-blur-xl p-6">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="p-2 bg-primary rounded-xl shadow-lg">
            <Boxes className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter">Assetain</span>
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Enterprise</span>
          </div>
        </div>

        <NavLinks className="flex-1" />

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
          <div className="flex items-center gap-4 lg:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon"><Menu className="h-6 w-6" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-6">
                <div className="flex items-center gap-3 mb-10">
                  <Boxes className="h-6 w-6 text-primary" />
                  <span className="text-xl font-black">Assetain</span>
                </div>
                <NavLinks onClick={() => setIsMobileMenuOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="text-lg font-black tracking-tight">Assetain</span>
          </div>

          <div className="hidden lg:block">
            <h1 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
              {NAV_ITEMS.find(i => i.href === pathname)?.label || 'Registry'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOnline(!isOnline)}
              className={cn(
                "rounded-full px-4 font-black text-[10px] uppercase tracking-tighter",
                isOnline ? "text-green-500 bg-green-500/10" : "text-destructive bg-destructive/10"
              )}
            >
              {isOnline ? <Cloud className="mr-2 h-3.5 w-3.5" /> : <CloudOff className="mr-2 h-3.5 w-3.5" />}
              {isOnline ? 'Online' : 'Offline'}
            </Button>
            
            <Button variant="ghost" size="icon" className="relative rounded-full">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-primary text-[8px] font-black">0</Badge>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-muted/20">
          {children}
        </main>
      </div>
    </div>
  );
}
