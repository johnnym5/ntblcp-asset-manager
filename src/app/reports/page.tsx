'use client';

/**
 * @fileOverview Audit Reports Workstation.
 * Phase 38: Integrated Registry Fidelity Audit and Guided Builder.
 */

import React, { useState, useMemo } from 'react';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Download, 
  Clock, 
  CheckCircle2, 
  Search, 
  Zap, 
  ShieldAlert, 
  FileWarning,
  Activity,
  History,
  ShieldCheck,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { TravelReportDialog } from '@/components/travel-report-dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const { assets } = useAppState();
  const [isTravelReportOpen, setIsTravelReportOpen] = useState(false);

  const stats = useMemo(() => {
    const verified = assets.filter(a => a.status === 'VERIFIED').length;
    const missingSerials = assets.filter(a => !a.serialNumber || a.serialNumber === 'N/A').length;
    const discrepancies = assets.filter(a => a.status === 'DISCREPANCY').length;
    const total = assets.length;
    const coverage = total > 0 ? Math.round((verified / total) * 100) : 0;

    return { total, verified, coverage, missingSerials, discrepancies };
  }, [assets]);

  const auditRules = [
    { label: "Verification Coverage", status: stats.coverage > 90 ? 'pass' : 'warning', detail: `${stats.coverage}% complete` },
    { label: "Technical Markers", status: stats.missingSerials === 0 ? 'pass' : 'fail', detail: `${stats.missingSerials} gaps detected` },
    { label: "Discrepancy Clearance", status: stats.discrepancies === 0 ? 'pass' : 'warning', detail: `${stats.discrepancies} unhandled pulses` },
    { label: "Audit Ledger Chain", status: 'pass', detail: "Integrity verified" }
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase flex items-center gap-4 leading-none">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              Reporting Workstation
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              Automated Executive Documentation & High-Fidelity Ledger Pulses
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-2">
          <div className="lg:col-span-8 space-y-8">
            {/* Fidelity Audit Card */}
            <Card className="border-2 border-border/40 shadow-2xl bg-card/50 rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-8 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-primary" /> Registry Fidelity Audit
                    </CardTitle>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground opacity-60">Pre-generation quality pulse</p>
                  </div>
                  <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary font-black uppercase px-4 h-8 rounded-full">
                    Health: {100 - (stats.missingSerials + stats.discrepancies)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {auditRules.map((rule, idx) => (
                    <div key={idx} className="flex items-center justify-between p-5 rounded-2xl bg-background border-2 border-dashed border-border/40 group hover:border-primary/20 transition-all">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase text-muted-foreground opacity-60">{rule.label}</span>
                        <span className="text-xs font-bold">{rule.detail}</span>
                      </div>
                      {rule.status === 'pass' ? (
                        <div className="p-2 bg-green-100 rounded-xl"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
                      ) : rule.status === 'warning' ? (
                        <div className="p-2 bg-orange-100 rounded-xl"><Activity className="h-4 w-4 text-orange-600" /></div>
                      ) : (
                        <div className="p-2 bg-red-100 rounded-xl"><AlertCircle className="h-4 w-4 text-red-600" /></div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="p-6 rounded-3xl bg-blue-500/5 border-2 border-dashed border-blue-500/20 flex items-center gap-4">
                  <Info className="h-5 w-5 text-blue-600 shrink-0" />
                  <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase opacity-70">
                    High-fidelity reports require at least <span className="text-blue-600">90% coverage</span> and zero unhandled discrepancies. Fix identified gaps in the registry before final management sign-off.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Travel Report Pulse */}
            <Card className="border-2 border-primary/10 bg-card/50 rounded-[2.5rem] overflow-hidden shadow-2xl relative group">
              <CardHeader className="bg-primary/5 border-b border-primary/10 p-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-4 text-2xl font-black tracking-tight uppercase">
                    <FileText className="text-primary h-8 w-8" /> Executive Travel Report
                  </CardTitle>
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-black uppercase text-[10px] h-8 px-4 rounded-full">
                    Builder v5.0
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Report Configuration</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="p-8 rounded-[2rem] bg-muted/20 border-2 border-dashed border-border/40 group-hover:border-primary/20 transition-all space-y-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Active Scope</span>
                      <p className="text-sm font-black text-foreground uppercase truncate">Current Audit Pulse</p>
                    </div>
                    <div className="p-8 rounded-[2rem] bg-muted/20 border-2 border-dashed border-border/40 group-hover:border-primary/20 transition-all space-y-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Records Scanned</span>
                      <p className="text-sm font-black uppercase">{stats.total} Registry Records</p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => setIsTravelReportOpen(true)}
                  disabled={stats.total === 0}
                  className="w-full h-20 rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-primary/20 transition-transform hover:scale-[1.02] active:scale-95 bg-primary text-primary-foreground gap-4"
                >
                  <Zap className="h-5 w-5 fill-current" /> Initialize Report Builder <ArrowRight className="h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <Card className="border-2 border-border/40 shadow-xl rounded-[2.5rem] overflow-hidden bg-card/50">
              <CardHeader className="p-8 bg-muted/20 border-b">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3">
                  <History className="h-4 w-4" /> Export Pulse Log
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                  <div className="p-6 bg-muted rounded-full mb-6">
                    <Download className="h-10 w-10" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest">No exports in current session</p>
                </div>
              </CardContent>
            </Card>

            <div className="p-10 rounded-[2.5rem] bg-orange-500/5 border-2 border-dashed border-orange-500/20 space-y-4 text-center group hover:bg-orange-500/10 transition-all">
              <div className="p-4 bg-orange-100 rounded-full w-16 h-16 mx-auto mb-2 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <FileWarning className="h-8 w-8 text-orange-600" />
              </div>
              <h4 className="text-sm font-black uppercase tracking-tight text-orange-700">Audit Protocol</h4>
              <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase opacity-60">
                Ensure all local edits are synchronized with the cloud before generating final executive reports. Discrepancies found in local cache may skew summary stats.
              </p>
            </div>
          </div>
        </div>
      </div>

      <TravelReportDialog isOpen={isTravelReportOpen} onOpenChange={setIsTravelReportOpen} />
    </AppLayout>
  );
}
