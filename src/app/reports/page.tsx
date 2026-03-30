'use client';

/**
 * @fileOverview Audit Reports Workstation.
 * Orchestrates the generation of executive documentation and field finding pulses.
 * Refined for Phase 12 with professional spacing and reporting protocols.
 */

import React, { useState } from 'react';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Clock, CheckCircle2, Search, Zap, ShieldAlert, FileWarning } from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { TravelReportDialog } from '@/components/travel-report-dialog';
import { Badge } from '@/components/ui/badge';

export default function ReportsPage() {
  const { assets } = useAppState();
  const [isTravelReportOpen, setIsTravelReportOpen] = useState(false);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">Reporting Workstation</h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
            Automated Executive Summaries & High-Fidelity Ledger Pulses
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-2 border-primary/10 bg-card/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <CardHeader className="bg-primary/5 border-b border-primary/10 p-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-4 text-2xl font-black tracking-tight uppercase">
                    <FileText className="text-primary h-8 w-8" /> Executive Travel Report
                  </CardTitle>
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-black uppercase text-[10px] h-8 px-4 rounded-full">
                    Auto-Generator v4.0
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">
                  The integrated reporting engine performs a deep-scan of the active registry to identify field findings, verification milestones, and data quality exceptions. It automatically compiles these into a formatted .docx document ready for management sign-off.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-8 rounded-[2rem] bg-muted/20 border-2 border-dashed space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Active Scan Scope</span>
                    <p className="text-sm font-black text-primary uppercase">Current Project Registry</p>
                  </div>
                  <div className="p-8 rounded-[2rem] bg-muted/20 border-2 border-dashed space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Records Analyzed</span>
                    <p className="text-sm font-black uppercase">{assets.length} Pulses</p>
                  </div>
                </div>

                <Button 
                  onClick={() => setIsTravelReportOpen(true)}
                  className="w-full h-20 rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 bg-primary text-primary-foreground"
                >
                  <Zap className="mr-3 h-5 w-5 fill-current" /> Initialize Intelligence Report
                </Button>
              </CardContent>
            </Card>

            <div className="p-10 rounded-[3rem] bg-muted/10 border-2 border-dashed border-border/40 space-y-6">
              <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3">
                <ShieldAlert className="h-4 w-4" /> Professional Protocol
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="flex gap-4">
                  <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-tight">Discrepancy Analysis</p>
                    <p className="text-[10px] font-medium leading-relaxed italic opacity-70 text-muted-foreground">Reports include automated "Exception Logs" for high-risk assets.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-tight">Audit Chain Integrity</p>
                    <p className="text-[10px] font-medium leading-relaxed italic opacity-70 text-muted-foreground">S/N and Tag ID gaps are flagged to ensure 100% register fidelity.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-8">
            <Card className="border-border/40 shadow-xl rounded-[2.5rem] overflow-hidden bg-card/50">
              <CardHeader className="p-8 bg-muted/20 border-b">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3">
                  <Clock className="h-4 w-4" /> Export Ledger
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                  <div className="p-6 bg-muted rounded-full mb-6">
                    <Download className="h-10 w-10" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest">No exports in current pulse</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-500/5 border-2 border-dashed border-orange-500/20 rounded-[2.5rem] group hover:bg-orange-500/10 transition-all">
              <CardContent className="p-10 space-y-4 text-center">
                <div className="p-4 bg-orange-100 rounded-full w-16 h-16 mx-auto mb-2 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <FileWarning className="h-8 w-8 text-orange-600" />
                </div>
                <h4 className="text-sm font-black uppercase tracking-tight text-orange-700">Data Quality Alert</h4>
                <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase opacity-60">
                  Reports generated while offline will reflect the last verified local heartbeat. Ensure cloud parity before final export.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <TravelReportDialog isOpen={isTravelReportOpen} onOpenChange={setIsTravelReportOpen} />
    </AppLayout>
  );
}
