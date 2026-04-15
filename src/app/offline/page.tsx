'use client';

import React from 'react';
import { WifiOff, LayoutDashboard, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function OfflineFallbackPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black p-6 text-center animate-in fade-in duration-700">
      <div className="p-10 bg-white/5 rounded-[3rem] mb-10 shadow-3xl border border-white/5">
        <WifiOff className="h-20 w-20 text-primary animate-pulse" />
      </div>
      
      <div className="space-y-4 mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tight text-white leading-none">Offline Hub</h1>
        <p className="text-sm font-medium text-white/40 max-w-sm mx-auto italic leading-relaxed">
          The requested page pulse is not currently cached in your regional scope. Please connect to the cloud to synchronize this workstation.
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button asChild className="h-16 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 bg-primary text-black transition-transform active:scale-95">
          <Link href="/">
            <LayoutDashboard className="mr-3 h-5 w-5" /> Intelligence Hub
          </Link>
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="h-16 rounded-2xl font-black uppercase text-xs tracking-widest border-2 border-white/10 text-white hover:bg-white/5"
        >
          <RefreshCw className="mr-3 h-4 w-4" /> Re-attempt Pulse
        </Button>
      </div>

      <div className="mt-20 opacity-20">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Assetain Resilience Protocol</p>
      </div>
    </div>
  );
}
