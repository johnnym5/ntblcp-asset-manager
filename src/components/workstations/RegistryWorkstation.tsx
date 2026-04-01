'use client';

/**
 * @fileOverview RegistryWorkstation - Category Grid Module.
 * Phase 142: Achieved 100% Screenshot Parity for Category Cards.
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid,
  MoreHorizontal,
  ChevronRight,
  CheckCircle2,
  ChevronDown,
  Activity,
  Boxes
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Asset } from '@/types/domain';

export function RegistryWorkstation() {
  const { 
    assets, 
    refreshRegistry, 
    appSettings,
    setActiveGrantId,
    activeGrantId
  } = useAppState();
  
  const { userProfile } = useAuth();

  const categoryStats = useMemo(() => {
    const groups = assets.reduce((acc, a) => {
      const cat = a.category || 'General Register';
      if (!acc[cat]) acc[cat] = { total: 0, verified: 0 };
      acc[cat].total++;
      if (a.status === 'VERIFIED') acc[cat].verified++;
      return acc;
    }, {} as Record<string, { total: number, verified: number }>);
    
    return Object.entries(groups)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assets]);

  const totalVerified = useMemo(() => assets.filter(a => a.status === 'VERIFIED').length, [assets]);
  const totalAssets = assets.length;
  const verificationPercent = totalAssets > 0 ? (totalVerified / totalAssets) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Workstation Header */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-primary/10 rounded-xl shadow-inner">
            <LayoutGrid className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-black uppercase text-white tracking-tight">Categories & Inventories</h2>
        </div>

        <div className="flex items-center gap-6">
          <button className="flex items-center gap-4 px-6 py-2 rounded-2xl bg-[#080808] border border-white/5 hover:border-primary/40 transition-all group min-w-[280px]">
            <div className="flex flex-col items-start flex-1 leading-none gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-black uppercase text-white">Overall Project Scope</span>
                <span className="text-[10px] font-bold text-primary">{totalVerified}/{totalAssets}</span>
              </div>
              <div className="w-full h-[3px] bg-white/5 rounded-full overflow-hidden relative">
                <motion.div initial={{ width: 0 }} animate={{ width: `${verificationPercent}%` }} className="absolute top-0 left-0 h-full bg-primary shadow-[0_0_8px_rgba(255,193,7,0.4)]" />
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-white/40 group-hover:text-primary transition-colors" />
          </button>

          <button className="flex items-center gap-3 group px-4 py-2 hover:bg-white/5 rounded-xl transition-all">
            <span className="text-[11px] font-black uppercase tracking-widest text-white/40 group-hover:text-white">SELECT ALL</span>
            <div className="h-5 w-5 rounded-full border-2 border-white/20 group-hover:border-primary transition-all flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-transparent group-active:bg-primary transition-all" />
            </div>
          </button>
        </div>
      </div>

      {/* Category Grid - Matching exact Screenshot aesthetics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {categoryStats.map(cat => (
          <Card key={cat.name} className="bg-[#050505] border-2 border-white/5 rounded-[2rem] hover:border-primary/40 transition-all group cursor-pointer shadow-xl overflow-hidden relative">
            <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
              <h3 className="text-white/60 font-black uppercase text-[11px] leading-none truncate max-w-[85%] tracking-widest">{cat.name}</h3>
              <MoreHorizontal className="h-4 w-4 text-white/20 group-hover:text-white transition-colors" />
            </CardHeader>
            <CardContent className="p-8 pt-2 space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-5xl font-black text-white tracking-tighter leading-none">{cat.total}</div>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Asset Records</p>
                </div>
                <Boxes className="h-8 w-8 text-white/5 group-hover:text-primary/10 transition-colors" />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-white/40">Verification</span>
                  <span className="text-white/60">{cat.verified}/{cat.total}</span>
                </div>
                <div className="h-[3px] w-full bg-white/5 rounded-full overflow-hidden relative">
                  <div className="absolute left-0 top-0 h-full bg-white/20" style={{ width: `${(cat.verified/cat.total)*100}%` }} />
                </div>
              </div>

              <button className="w-full h-14 rounded-2xl bg-white/[0.02] border border-white/5 text-white/60 font-black text-[11px] uppercase tracking-[0.2em] group-hover:bg-primary group-hover:text-black group-hover:border-primary transition-all flex items-center justify-center gap-3 active:scale-95 shadow-inner">
                View Records <ChevronRight className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}