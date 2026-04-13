'use client';

/**
 * @fileOverview SyncConfirmationDialog - Governance Logic Pulse.
 * Allows users to review changes and choose a merge strategy (Update vs Skip).
 */

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CloudUpload, 
  Edit3, 
  Plus, 
  Database,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Zap,
  Info
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import type { SyncSummary, SyncStrategy } from '@/types/domain';

interface SyncConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (strategy: SyncStrategy) => void;
  summary: SyncSummary | null;
}

export function SyncConfirmationDialog({ isOpen, onOpenChange, onConfirm, summary }: SyncConfirmationDialogProps) {
  const [strategy, setStrategy] = useState<SyncStrategy>('UPDATE');

  if (!summary) return null;
  
  const isDownload = summary.type === 'DOWNLOAD';

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl rounded-[2.5rem] border-primary/10 p-0 overflow-hidden shadow-3xl bg-black text-white">
        <div className="p-8 pb-4 bg-white/[0.02] border-b border-white/5">
            <AlertDialogHeader>
                <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-2xl", isDownload ? "bg-blue-500/10 text-blue-500" : "bg-primary/10 text-primary")}>
                        {isDownload ? <Database className="h-8 w-8" /> : <CloudUpload className="h-8 w-8" />}
                    </div>
                    <div className="space-y-1">
                        <AlertDialogTitle className="text-3xl font-black uppercase tracking-tight leading-none text-white">
                            Registry {isDownload ? 'Pull' : 'Push'}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                            Deterministic Sync Protocol v5.0
                        </AlertDialogDescription>
                    </div>
                </div>
            </AlertDialogHeader>
        </div>

        <ScrollArea className="max-h-[50vh] bg-black">
            <div className="p-8 space-y-10">
                {/* 1. Metrics Snapshot */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                        <span className="text-[9px] font-black text-white/20 uppercase">Total Records</span>
                        <p className="text-3xl font-black text-white">{summary.totalCount}</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                        <span className="text-[9px] font-black text-white/20 uppercase">Existing Pulses</span>
                        <p className={cn("text-3xl font-black", summary.existingItems.length > 0 ? "text-primary" : "text-white/40")}>
                            {summary.existingItems.length}
                        </p>
                    </div>
                </div>

                {/* 2. Strategy Selection */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 fill-current" /> Conflict Strategy
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                            onClick={() => setStrategy('UPDATE')}
                            className={cn(
                                "p-6 rounded-2xl border-2 text-left transition-all group",
                                strategy === 'UPDATE' ? "bg-primary/5 border-primary shadow-xl" : "bg-white/[0.02] border-white/5 opacity-40"
                            )}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={cn("text-xs font-black uppercase", strategy === 'UPDATE' ? "text-primary" : "text-white")}>Update Existing</span>
                                {strategy === 'UPDATE' && <CheckCircle2 className="h-4 w-4 text-primary" />}
                            </div>
                            <p className="text-[9px] font-medium text-white/60 italic leading-relaxed">Overwrite local records with fresh cloud pulses.</p>
                        </button>

                        <button 
                            onClick={() => setStrategy('SKIP')}
                            className={cn(
                                "p-6 rounded-2xl border-2 text-left transition-all group",
                                strategy === 'SKIP' ? "bg-blue-500/5 border-blue-500 shadow-xl" : "bg-white/[0.02] border-white/5 opacity-40"
                            )}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={cn("text-xs font-black uppercase", strategy === 'SKIP' ? "text-blue-500" : "text-white")}>Skip Existing</span>
                                {strategy === 'SKIP' && <XCircle className="h-4 w-4 text-blue-500" />}
                            </div>
                            <p className="text-[9px] font-medium text-white/60 italic leading-relaxed">Preserve current data. Only import truly new records.</p>
                        </button>
                    </div>
                </div>

                {/* 3. Detailed Breakdown */}
                {summary.newItems.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Target Preview</h4>
                        <div className="space-y-2">
                            {summary.newItems.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-1.5 bg-primary/10 rounded-lg"><Plus className="h-3 w-3 text-primary" /></div>
                                        <span className="text-[10px] font-black uppercase truncate text-white/80">{item.description}</span>
                                    </div>
                                    <Badge variant="outline" className="text-[7px] font-mono border-white/10 opacity-40">{item.location}</Badge>
                                </div>
                            ))}
                            {summary.newItems.length > 5 && (
                                <p className="text-[9px] font-bold text-center text-white/20 uppercase tracking-widest">+ {summary.newItems.length - 5} More Records</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>

        <AlertDialogFooter className="p-8 bg-[#050505] border-t border-white/5 flex flex-row items-center gap-4">
          <AlertDialogCancel className="flex-1 h-14 font-black uppercase text-[10px] rounded-2xl m-0 border-white/10 bg-transparent text-white/40 hover:text-white">
            Abort Sync
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => onConfirm(strategy)} 
            className={cn(
                "flex-[2] h-14 font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl m-0",
                strategy === 'UPDATE' ? "bg-primary text-black shadow-primary/20" : "bg-blue-600 text-white shadow-blue-600/20"
            )}
          >
            {isDownload ? `Apply ${strategy} Strategy` : `Broadcast ${summary.totalCount} Changes`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
