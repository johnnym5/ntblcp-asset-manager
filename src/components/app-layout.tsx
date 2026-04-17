
"use client";

/**
 * @fileOverview AppLayout - Minimal Shell for Standalone Pages.
 * Optimized for resilience during static prerendering.
 */

import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Boxes,
  LogOut,
  ChevronLeft,
  Loader2,
  Settings as SettingsIcon,
  ShieldAlert
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useAppState } from "@/contexts/app-state-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { userProfile, logout } = useAuth();
  const { isSyncing } = useAppState();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col w-full min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Minimal Header for Standalone Pages */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 sm:px-8 bg-background/80 backdrop-blur-3xl z-50 sticky top-0">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.history.back()}
            className="h-9 w-9 rounded-xl hover:bg-primary/5"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Boxes className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-black uppercase tracking-tight hidden sm:block">Assetain Control</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isSyncing && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 w-9 rounded-full border-2 border-primary/20 bg-primary/10 text-primary flex items-center justify-center font-black text-[11px] hover:border-primary/40 transition-all">
                {userProfile?.displayName?.[0] || 'U'}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border rounded-2xl shadow-3xl p-1.5">
              <DropdownMenuLabel className="p-3">
                <p className="text-[11px] font-black uppercase">{userProfile?.displayName}</p>
                <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">{userProfile?.role}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="p-2.5 rounded-xl focus:bg-red-600 focus:text-white text-red-500 gap-3">
                <LogOut className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-8 max-w-[1800px] mx-auto w-full animate-in fade-in duration-500">
        {children}
      </main>
    </div>
  );
}
