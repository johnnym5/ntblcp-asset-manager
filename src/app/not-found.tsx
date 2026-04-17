'use client';

/**
 * @fileOverview 404 Error Workstation - Operational Scope Failure.
 * Phase 64: Hardened static export recovery.
 */

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SearchX, LayoutDashboard } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-6 text-center animate-in fade-in duration-700">
      <div className="p-8 bg-muted/20 rounded-[3rem] mb-8 shadow-inner">
        <SearchX className="h-20 w-20 text-muted-foreground opacity-40" />
      </div>
      <div className="space-y-3 mb-10">
        <h1 className="text-4xl font-black uppercase tracking-tight text-foreground leading-none">404 - Pulse Not Found</h1>
        <p className="text-sm font-medium text-muted-foreground max-w-sm mx-auto italic leading-relaxed">
          The requested registry workstation or record pulse does not exist in the current operational scope.
        </p>
      </div>
      <Button asChild className="h-16 px-12 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95">
        <Link href="/">
          <LayoutDashboard className="mr-3 h-5 w-5" /> Return to Intelligence Hub
        </Link>
      </Button>
    </div>
  );
}
