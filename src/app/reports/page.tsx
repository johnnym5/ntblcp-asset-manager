'use client';

import React from 'react';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Clock, CheckCircle2 } from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';

export default function ReportsPage() {
  const { assets } = useAppState();

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-foreground">Audit Reports</h2>
          <p className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
            Generate executive summaries and field findings pulses
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <Card className="border-2 border-primary/10 bg-card/50 rounded-3xl overflow-hidden shadow-2xl">
              <CardHeader className="bg-primary/5 border-b border-primary/10 p-8">
                <CardTitle className="flex items-center gap-3 text-xl font-black tracking-tight">
                  <FileText className="text-primary h-6 w-6" /> Executive Travel Report
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                  The automated travel report compiler scans the active registry for field observations, verified totals, and critical exceptions. It generates a professional .docx document ready for submission.
                </p>
                <div className="p-6 rounded-2xl bg-muted/20 border-2 border-dashed space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Scan Target</span>
                    <span className="text-xs font-black text-primary">All Regions</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Records in scope</span>
                    <span className="text-xs font-black">{assets.length} Assets</span>
                  </div>
                </div>
                <Button className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/20">
                  <Download className="mr-2 h-4 w-4" /> Initialize Report Generator
                </Button>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="border-border/40 shadow-none rounded-2xl">
              <CardHeader>
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em]">Recent Pulse Exports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
                  <Clock className="h-10 w-10 mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No recent exports detected</p>
                </div>
              </CardContent>
            </Card>

            <div className="p-6 rounded-3xl bg-green-500/5 border-2 border-dashed border-green-500/20 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-green-600">Data Integrity</h4>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground leading-relaxed">
                All reports are generated based on the latest 'Synced' cloud heartbeat or the 'Sandbox' staging store.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
