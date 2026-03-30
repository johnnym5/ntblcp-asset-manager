'use client';

import React from 'react';
import AppLayout from '@/components/app-layout';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function VerificationQueuePage() {
  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">Verification Queue</h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
            Mandatory Field Assessments & Operability Checks
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Scan ID or Search Queue..." 
            className="pl-10 h-12 rounded-2xl bg-card border-none shadow-sm font-medium text-sm"
          />
        </div>

        <div className="flex-1 bg-card/50 rounded-3xl border-2 border-dashed border-border/40 flex flex-col items-center justify-center text-center p-20">
          <div className="flex flex-col items-center gap-4 opacity-20">
            <div className="p-6 bg-muted rounded-full">
              <CheckCircle2 className="h-16 w-16" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black uppercase tracking-widest">Queue Clear</h3>
              <p className="text-sm font-medium max-w-xs">All assets in your regional scope have been verified.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
