'use client';

/**
 * @fileOverview ReconciliationView - The Discovery Pulse visualization.
 * Phase 310: Enhanced with Per-Group Validation Summaries and Positional Logging.
 * Phase 311: Fixed alignment of error logs to ensure visibility.
 * Phase 312: High-density formatting for synthetic header pulses.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutGrid, 
  Layers, 
  CheckCircle2, 
  History, 
  Database,
  Search,
  FileWarning,
  CheckCircle,
  XCircle
} from 'lucide-react';
import type { Asset } from '@/types/domain';
import type { ImportRunSummary } from '@/parser/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ReconciliationViewProps {
  assets: Asset[];
  summary: ImportRunSummary;
}

export function ReconciliationView({ assets, summary }: ReconciliationViewProps) {
  const stats = React.useMemo(() => {
    return {
      total: assets.length,
      valid: assets.filter(a => !(a as any).validation.isRejected).length,
      invalid: assets.filter(a => (a as any).validation.isRejected).length,
      groupsCount: summary.groups.length
    };
  }, [assets, summary]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* 1. Global Metrics Pulse */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-1">
        <Card className="bg-primary/5 border-primary/10 shadow-xl rounded-3xl group transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-[9px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <Database className="h-3 w-3" /> Total Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter text-white">{stats.total}</div>
            <p className="text-[8px] font-bold text-white/40 uppercase mt-1 opacity-60">Ingestion Pulse</p>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-[#080808] shadow-lg rounded-3xl group">
          <CardHeader className="pb-2">
            <CardTitle className="text-[9px] font-black uppercase tracking-[0.2em] text-green-600 flex items-center gap-2">
              <CheckCircle className="h-3 w-3" /> Fidelity OK
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter text-green-600">{stats.valid}</div>
            <p className="text-[8px] font-bold text-white/40 uppercase mt-1 opacity-60">Ready for Registry</p>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-[#080808] shadow-lg rounded-3xl group">
          <CardHeader className="pb-2">
            <CardTitle className="text-[9px] font-black uppercase tracking-[0.2em] text-destructive flex items-center gap-2">
              <XCircle className="h-3 w-3" /> Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter text-destructive">{stats.invalid}</div>
            <p className="text-[8px] font-bold text-white/40 uppercase mt-1 opacity-60">Alignment Errors</p>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-[#080808] shadow-lg rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
              <LayoutGrid className="h-3 w-3" /> Asset Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter text-white">{stats.groupsCount}</div>
            <p className="text-[8px] font-bold text-white/40 uppercase mt-1 opacity-60">Folder Nodes</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Per-Group Structure Review */}
      <div className="space-y-6 px-1">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Registry Mapping Summary</h4>
          <Badge variant="outline" className="h-5 px-2 border-primary/20 text-primary bg-primary/5 font-black text-[7px] tracking-widest">POSITIONAL SYNC ACTIVE</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {summary.groups.map((group) => (
            <Card key={group.id} className="bg-[#0A0A0A] border-2 border-white/5 rounded-[2rem] overflow-hidden group hover:border-primary/20 transition-all">
              <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-xl"><Layers className="h-4 w-4 text-primary" /></div>
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-black uppercase text-white tracking-tight leading-none truncate max-w-[180px]">{group.groupName}</h5>
                    <p className="text-[7px] font-bold text-white/20 uppercase tracking-widest">{group.headerSetType}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[7px] font-black px-1.5 h-5">{group.metrics.valid} OK</Badge>
                  {group.metrics.invalid > 0 && <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[7px] font-black px-1.5 h-5">{group.metrics.invalid} ERR</Badge>}
                </div>
              </div>
              
              <CardContent className="p-5 space-y-5">
                <div className="space-y-2">
                  <p className="text-[8px] font-black uppercase text-white/20 tracking-widest">Mapped Target Schema</p>
                  <ScrollArea className="w-full">
                    <div className="flex gap-1.5 pb-2">
                      {group.headerSet.map((h, i) => (
                        <Badge key={i} variant="secondary" className="bg-white/5 border-white/5 text-[7px] font-mono whitespace-nowrap px-2 h-5 text-white/60">{h}</Badge>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>

                {group.metrics.invalid > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-destructive pl-1">
                      <FileWarning className="h-3 w-3" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Rejection Logs</span>
                    </div>
                    <ScrollArea className="h-24 rounded-xl bg-destructive/[0.03] border border-destructive/20 p-3">
                      <div className="space-y-2">
                        {group.assets.filter(a => (a as any).validation.isRejected).map((a, i) => (
                          <div key={i} className="space-y-1 border-b border-destructive/10 last:border-0 pb-1.5">
                            {(a as any).validation.logs.map((log: any, lIdx: number) => (
                              <div key={lIdx} className="text-[9px] font-medium text-destructive/80 italic flex items-start gap-2">
                                <span className="font-black opacity-40 shrink-0">R{log.rowNumber}:</span>
                                <span>{log.message}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
