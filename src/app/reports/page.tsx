'use client';

/**
 * @fileOverview Audit Reports Workstation.
 * Orchestrates the generation of executive documentation and field finding pulses.
 */

import React, { useState } from 'react';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Clock, CheckCircle2, Search, Zap } from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { TravelReportDialog } from '@/components/travel-report-dialog';
import { Badge } from '@/components/ui/badge';

export default function ReportsPage() {
  const { assets } = useAppState();
  const [isTravelReportOpen, setIsTravelReportOpen] = useState(false);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">Audit Reports Workstation</h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
            Automated Executive Summaries & Field Finding Pulses
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <Card className="border-2 border-primary/10 bg-card/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <CardHeader className="bg-primary/5 border-b border-primary/10 p-8">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-xl font-black tracking-tight uppercase">
                    <FileText className="text-primary h-6 w-6" /> Executive Travel Report
                  </CardTitle>
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-black uppercase text-[10px] h-7 px-3 rounded-full">
                    Auto-Generator v3.0
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">
                  The automated travel report compiler scans the active registry for field observations, verified totals, and critical exceptions. It generates a professional .docx document with built-in audit tables.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 rounded-3xl bg-muted/20 border-2 border-dashed space-y-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Active Scan Target</span>
                    <p className="text-xs font-black text-primary uppercase">Global Project Registry</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-muted/20 border-2 border-dashed space-y-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Records in Scope</span>
                    <p className="text-xs font-black uppercase">{assets.length} Assets</p>
                  </div>
                </div>

                <Button 
                  onClick={() => setIsTravelReportOpen(true)}
                  className="w-full h-16 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 transition-transform hover:scale-[1.02] active:scale-95"
                >
                  <Zap className="mr-2 h-4 w-4 fill-current" /> Initialize Report Generator
                </Button>
              </CardContent>
            </Card>

            <div className="p-8 rounded-[2.5rem] bg-muted/10 border-2 border-dashed border-border/40 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reporting Protocol</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex gap-3">
                  <div className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-[10px] font-medium leading-relaxed italic opacity-70">Reports include automated "Exception Tables" for assets flagged with remarks.</p>
                </div>
                <div className="flex gap-3">
                  <div className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-[10px] font-medium leading-relaxed italic opacity-70">Fidelity metadata (S/N, Tag ID) is cross-referenced for 100% accuracy.</p>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <Card className="border-border/40 shadow-xl rounded-[2rem] overflow-hidden bg-card/50">
              <CardHeader className="p-6 bg-muted/20 border-b">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Recent Pulse Exports</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col items-center justify-center py-16 text-center opacity-30">
                  <div className="p-4 bg-muted rounded-full mb-4">
                    <Clock className="h-8 w-8" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest">Zero Session Exports</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-500/5 border-2 border-dashed border-green-500/20 rounded-[2rem]">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-green-600">Data Integrity Pulse</h4>
                </div>
                <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase opacity-60">
                  Documentation is generated from the local write-ahead log or the last verified cloud heartbeat.
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
