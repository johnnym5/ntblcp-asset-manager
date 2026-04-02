'use client';

/**
 * @fileOverview ReconciliationView - The Discovery Pulse visualization.
 * Phase 310: Enhanced with Per-Group Validation Summaries and Positional Logging.
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
  AlertTriangle,
  FileWarning,
  CheckCircle,
  XCircle,
  ArrowRight
} from 'lucide-react';
import type { Asset } from '@/types/domain';
import type { ImportRunSummary, GroupImportContainer } from '@/parser/types';
import { ScrollArea } from '@/components/ui/scroll-area';
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-primary/5 border-primary/10 shadow-xl rounded-3xl group transition-all hover:scale-[1.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <Database className="h-3.5 w-3.5" /> Total Pulses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">{stats.total}</div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 opacity-60">Records Mapped</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-lg rounded-3xl group hover:border-green-500/20 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600 flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5" /> Valid Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter text-green-600">{stats.valid}</div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 opacity-60">Fidelity Confirmed</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-lg rounded-3xl group hover:border-destructive/20 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive flex items-center gap-2">
              <XCircle className="h-3.5 w-3.5" /> Rejected Rows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter text-destructive">{stats.invalid}</div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 opacity-60">Alignment Failures</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-lg rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <LayoutGrid className="h-3.5 w-3.5" /> Folder Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">{stats.groupsCount}</div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 opacity-60">Structural Containers</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Per-Group Structure Review */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Registry Folder Summary</h4>
          <Badge variant="outline" className="h-6 px-3 border-primary/20 text-primary bg-primary/5 font-black text-[9px]">POSITIONAL MAPPING ENABLED</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {summary.groups.map((group) => (
            <Card key={group.id} className="bg-[#0A0A0A] border-2 border-white/5 rounded-[2rem] overflow-hidden group hover:border-primary/20 transition-all">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-primary/10 rounded-xl"><Layers className="h-5 w-5 text-primary" /></div>
                  <div className="space-y-0.5">
                    <h5 className="text-sm font-black uppercase text-white tracking-tight leading-none truncate max-w-[200px]">{group.groupName}</h5>
                    <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">{group.templateId}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[9px] font-black px-2">{group.metrics.valid} OK</Badge>
                  {group.metrics.invalid > 0 && <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[9px] font-black px-2">{group.metrics.invalid} ERR</Badge>}
                </div>
              </div>
              
              <CardContent className="p-6 space-y-6">
                <div className="space-y-3">
                  <p className="text-[9px] font-black uppercase text-white/20 tracking-widest pl-1">Target Schema</p>
                  <ScrollArea className="w-full">
                    <div className="flex gap-2 pb-2">
                      {group.headerSet.map((h, i) => (
                        <Badge key={i} variant="secondary" className="bg-white/5 border-white/5 text-[8px] font-mono whitespace-nowrap px-3 h-6">{h}</Badge>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {group.metrics.invalid > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-destructive pl-1">
                      <FileWarning className="h-3 w-3" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Alignment Exceptions</span>
                    </div>
                    <ScrollArea className="h-24 rounded-xl bg-destructive/5 border border-destructive/10 p-3">
                      <div className="space-y-2">
                        {group.assets.filter(a => a.validation.isRejected).map((a, i) => (
                          <div key={i} className="flex flex-col gap-1">
                            {a.validation.logs.map((log, lIdx) => (
                              <div key={lIdx} className="text-[9px] font-medium text-destructive/80 italic flex items-start gap-2">
                                <span className="font-black opacity-40">ROW {log.rowNumber}:</span>
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

      <div className="p-10 rounded-[3rem] bg-[#050505] border-2 border-white/5 shadow-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
          <History className="h-24 w-24 text-primary" />
        </div>
        <div className="flex items-start gap-6 max-w-2xl relative z-10">
          <div className="p-4 bg-primary/10 rounded-2xl shrink-0"><Search className="h-8 w-8 text-primary" /></div>
          <div className="space-y-2">
            <h4 className="text-2xl font-black uppercase text-white tracking-tight">Engineering Pulse: Structural Fidelity</h4>
            <p className="text-sm font-medium text-white/40 leading-relaxed italic">
              Positional mapping ensures that every column in the Excel workbook is precisely mapped to its corresponding registry field. Unmapped technical columns have been successfully sequestered into the hidden record metadata.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
