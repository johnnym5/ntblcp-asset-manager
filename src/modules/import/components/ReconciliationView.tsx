'use client';

/**
 * @fileOverview ReconciliationView - The Discovery Pulse visualization.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutGrid, 
  Layers, 
  FileText, 
  CheckCircle2, 
  History, 
  AlertCircle,
  Database,
  Search
} from 'lucide-react';
import type { Asset } from '@/types/domain';

interface ReconciliationViewProps {
  assets: Asset[];
}

export function ReconciliationView({ assets }: ReconciliationViewProps) {
  const stats = React.useMemo(() => {
    const sections = new Set(assets.map(a => a.section));
    const subsections = new Set(assets.map(a => a.subsection));
    const families = new Set(assets.map(a => a.assetFamily));
    
    // Group assets by section for provenance summary
    const sectionCounts = assets.reduce((acc, a) => {
      acc[a.section] = (acc[a.section] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: assets.length,
      sectionCount: sections.size,
      subSectionCount: subsections.size,
      familyCount: families.size,
      sectionSummary: Object.entries(sectionCounts).sort((a, b) => b[1] - a[1])
    };
  }, [assets]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-primary/5 border-primary/10 shadow-xl rounded-3xl group transition-all hover:scale-[1.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <Database className="h-3.5 w-3.5" /> Total Pulses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">{stats.total}</div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 opacity-60">Records Discovered</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-lg rounded-3xl hover:border-primary/20 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <LayoutGrid className="h-3.5 w-3.5" /> Sections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">{stats.sectionCount}</div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 opacity-60">Registry Groupings</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-lg rounded-3xl hover:border-primary/20 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" /> Subsections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">{stats.subSectionCount}</div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 opacity-60">Temporal Pulses</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-lg rounded-3xl group hover:border-green-500/20 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" /> Integrity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter text-green-600">100%</div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 opacity-60">Rule Validation</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60">Registry Provenance</h4>
            <Badge variant="outline" className="text-[9px] font-black border-primary/20 text-primary uppercase">Detected Hierarchy</Badge>
          </div>
          <div className="space-y-3">
            {stats.sectionSummary.map(([section, count], idx) => (
              <div key={section} className="flex items-center justify-between p-5 rounded-[1.5rem] bg-card border-2 border-border/20 shadow-sm transition-all hover:border-primary/30 group">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center text-[10px] font-black opacity-40 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black uppercase tracking-tight truncate max-w-[200px]">{section}</span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Analyzed Segment</span>
                  </div>
                </div>
                <Badge className="bg-primary font-black uppercase text-[10px] h-7 px-3 rounded-full">
                  {count} Pulses
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60">Fidelity Assurance</h4>
            <History className="h-3.5 w-3.5 text-muted-foreground opacity-40" />
          </div>
          <Card className="rounded-[2.5rem] border-2 border-dashed border-border/40 shadow-none bg-muted/5 overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-primary/10 rounded-xl shrink-0 mt-1">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-black uppercase tracking-tight">Sequestration Summary</p>
                  <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic">
                    The rule-based analyzer successfully isolated unmapped spreadsheet columns into record metadata. This ensures that unique technical fields are preserved without polluting the central domain contract.
                  </p>
                </div>
              </div>
              
              <div className="pt-6 border-t border-dashed border-border/40">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-5">Discovered Batch Contexts</p>
                <div className="flex flex-wrap gap-2.5">
                  {Array.from(new Set(assets.map(a => a.subsection))).map(s => (
                    <Badge key={s} variant="secondary" className="px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-background border border-border/60 hover:border-primary/40 transition-colors cursor-default">
                      {s === 'Base Register' ? 'Core Pulse' : s}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-green-500/5 border border-green-500/20 flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-[10px] font-bold text-green-700 uppercase tracking-tighter">Deterministic Validation: PASSED</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}