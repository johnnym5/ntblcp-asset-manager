'use client';

/**
 * @fileOverview Reporting Workstation & Data Quality Suite.
 * Phase 49: Integrated Integrity Engine for Data Cleansing Pulses.
 */

import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Activity,
  History,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Database,
  Search,
  Filter,
  RefreshCw,
  Wrench,
  Trash2
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { TravelReportDialog } from '@/components/travel-report-dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { IntegrityEngine, type IntegrityIssue } from '@/lib/integrity-engine';
import { storage } from '@/offline/storage';
import { enqueueMutation } from '@/offline/queue';
import { useToast } from '@/hooks/use-toast';

export default function ReportsPage() {
  const { assets, refreshRegistry } = useAppState();
  const { toast } = useToast();
  
  const [isTravelReportOpen, setIsTravelReportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("reports");
  
  // Quality Workstation State
  const [issues, setIssues] = useState<IntegrityIssue[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  useEffect(() => {
    if (activeTab === 'quality') {
      runAuditPulse();
    }
  }, [activeTab, assets]);

  const runAuditPulse = async () => {
    setIsScanning(true);
    try {
      const auditIssues = await IntegrityEngine.runFullAudit(assets);
      setIssues(auditIssues);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFixCasing = async (issue: IntegrityIssue) => {
    setIsFixing(true);
    try {
      const affectedAssets = assets.filter(a => issue.affectedIds.includes(a.id));
      for (const asset of affectedAssets) {
        const updated = {
          ...asset,
          location: IntegrityEngine.standardizeLocation(asset.location),
          lastModified: new Date().toISOString(),
          lastModifiedBy: 'Data Integrity Engine'
        };
        await enqueueMutation('UPDATE', 'assets', updated);
        const currentLocal = await storage.getAssets();
        await storage.saveAssets(currentLocal.map(a => a.id === asset.id ? updated : a));
      }
      await refreshRegistry();
      toast({ title: "Cleansing Pulse Applied", description: "Standardized location casing for selected records." });
    } finally {
      setIsFixing(false);
    }
  };

  const stats = useMemo(() => {
    const verified = assets.filter(a => a.status === 'VERIFIED').length;
    const total = assets.length;
    const coverage = total > 0 ? Math.round((verified / total) * 100) : 0;
    return { total, verified, coverage };
  }, [assets]);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase flex items-center gap-4 leading-none">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              Reporting Hub
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              Executive Documentation & Data Integrity Workstation
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-muted/30 p-1 rounded-2xl h-12 border-2 border-border/40 ml-2">
            <TabsTrigger value="reports" className="px-8 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Executive Reports</TabsTrigger>
            <TabsTrigger value="quality" className="px-8 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Data Cleansing
              {issues.length > 0 && <Badge className="ml-2 bg-destructive h-4 px-1.5 min-w-4 p-0">{issues.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-8 animate-in fade-in duration-500 outline-none m-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-2">
              <div className="lg:col-span-8 space-y-8">
                {/* Fidelity Audit Card */}
                <Card className="border-2 border-border/40 shadow-2xl bg-card/50 rounded-[2.5rem] overflow-hidden">
                  <CardHeader className="p-8 border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                          <ShieldCheck className="h-5 w-5 text-primary" /> Registry Fidelity
                        </CardTitle>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground opacity-60">Pre-generation quality pulse</p>
                      </div>
                      <Badge variant="outline" className={cn(
                        "font-black uppercase px-4 h-8 rounded-full border-2",
                        issues.length > 0 ? "border-destructive text-destructive" : "border-green-500 text-green-600"
                      )}>
                        {issues.length > 0 ? `${issues.length} Gaps Detected` : 'Registry Healthy'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-5 rounded-2xl bg-background border-2 border-dashed border-border/40 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase text-muted-foreground opacity-60">Coverage</span>
                          <span className="text-xs font-bold">{stats.coverage}% Verified</span>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="p-5 rounded-2xl bg-background border-2 border-dashed border-border/40 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase text-muted-foreground opacity-60">Exceptions</span>
                          <span className="text-xs font-bold">{issues.filter(i => i.severity === 'CRITICAL').length} Critical</span>
                        </div>
                        <Activity className="h-5 w-5 text-destructive" />
                      </div>
                    </div>
                    {issues.length > 0 && (
                      <Button variant="ghost" onClick={() => setActiveTab('quality')} className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10 border-2 border-dashed border-primary/20">
                        View Detailed Data Audit Pulse <ArrowRight className="ml-2 h-3.5 w-3.5" />
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Travel Report Pulse */}
                <Card className="border-2 border-primary/10 bg-card shadow-2xl rounded-[2.5rem] overflow-hidden group">
                  <CardHeader className="bg-primary/5 border-b border-primary/10 p-10">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-4 text-2xl font-black tracking-tight uppercase">
                        <FileText className="text-primary h-8 w-8" /> Executive Travel Report
                      </CardTitle>
                      <Badge className="bg-primary/10 text-primary border-primary/20 font-black uppercase text-[10px] h-8 px-4 rounded-full shadow-sm">
                        Builder v5.1
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-10">
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
                <Card className="rounded-[2rem] border-2 border-border/40 shadow-none bg-muted/5 p-10 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="p-6 bg-primary/10 rounded-full mb-2">
                    <ShieldAlert className="h-10 w-10 text-primary" />
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-tight">Audit Protocol</h4>
                  <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic opacity-70">
                    Ensure all local edits are synchronized with the cloud mirror before generating final management documents. Discrepant pulses may skew summary statistics.
                  </p>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="quality" className="space-y-8 animate-in fade-in duration-500 outline-none m-0 px-2">
            <Card className="border-2 border-border/40 shadow-2xl bg-card/50 rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-8 border-b bg-muted/20 flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                    <Wrench className="h-5 w-5 text-primary" /> Registry Cleansing Suite
                  </CardTitle>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground opacity-60">Heuristic Data Quality Analysis</p>
                </div>
                <Button variant="outline" size="sm" onClick={runAuditPulse} disabled={isScanning} className="h-9 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest border-2 gap-2">
                  {isScanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Rescan Registry
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {isScanning ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 opacity-40">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Executing Integrity Scan...</p>
                    </div>
                  ) : issues.length > 0 ? (
                    <div className="divide-y border-b">
                      {issues.map((issue) => (
                        <div key={issue.id} className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-muted/10 transition-colors">
                          <div className="flex items-start gap-5">
                            <div className={cn(
                              "p-4 rounded-2xl shrink-0 shadow-inner",
                              issue.severity === 'CRITICAL' ? "bg-red-100 text-red-600" :
                              issue.severity === 'WARNING' ? "bg-orange-100 text-orange-600" :
                              "bg-blue-100 text-blue-600"
                            )}>
                              {issue.severity === 'CRITICAL' ? <ShieldAlert className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <h5 className="font-black text-sm uppercase tracking-tight">{issue.description}</h5>
                                <Badge variant="outline" className="text-[8px] font-black uppercase h-5">{issue.type}</Badge>
                              </div>
                              <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">
                                {issue.suggestedFix}
                              </p>
                              <div className="pt-2 flex items-center gap-2">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-40">Affected:</span>
                                <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">
                                  {issue.affectedIds.length} Pulses
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {issue.type === 'CASE_MISMATCH' && (
                              <Button 
                                onClick={() => handleFixCasing(issue)} 
                                disabled={isFixing}
                                className="h-11 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-lg shadow-primary/10 gap-2"
                              >
                                {isFixing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wrench className="h-3 w-3" />}
                                Standardize Pulse
                              </Button>
                            )}
                            <Button variant="outline" className="h-11 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest border-2 gap-2">
                              <Search className="h-3 w-3" /> Inspect Group
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-24 opacity-30 text-center space-y-6">
                      <div className="p-10 bg-muted rounded-[3rem] shadow-inner">
                        <CheckCircle2 className="h-20 w-20 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-2xl font-black uppercase tracking-widest">Registry Perfect</h4>
                        <p className="text-sm font-medium italic max-w-xs mx-auto">Zero data quality exceptions discovered in current pulse.</p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <TravelReportDialog isOpen={isTravelReportOpen} onOpenChange={setIsTravelReportOpen} />
    </AppLayout>
  );
}
