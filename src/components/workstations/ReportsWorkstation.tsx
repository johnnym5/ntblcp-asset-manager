'use client';

/**
 * @fileOverview ReportsWorkstation - SPA Document & Quality Module.
 */

import React, { useState, useMemo, useEffect } from 'react';
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
  RefreshCw,
  Wrench,
  FileWarning
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { TravelReportDialog } from '@/components/travel-report-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { IntegrityEngine, type IntegrityIssue } from '@/lib/integrity-engine';
import { storage } from '@/offline/storage';
import { enqueueMutation } from '@/offline/queue';
import { useToast } from '@/hooks/use-toast';
import { PdfService } from '@/services/pdf-service';
import { useAuth } from '@/contexts/auth-context';

export function ReportsWorkstation() {
  const { assets, refreshRegistry } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [isTravelReportOpen, setIsTravelReportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("reports");
  const [issues, setIssues] = useState<IntegrityIssue[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => { if (activeTab === 'quality') runAuditPulse(); }, [activeTab, assets]);

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
        const updated = { ...asset, location: IntegrityEngine.standardizeLocation(asset.location), lastModified: new Date().toISOString() };
        await enqueueMutation('UPDATE', 'assets', updated);
        const currentLocal = await storage.getAssets();
        await storage.saveAssets(currentLocal.map(a => a.id === asset.id ? updated : a));
      }
      await refreshRegistry();
      toast({ title: "Cleansing Pulse Applied" });
    } finally {
      setIsFixing(false);
    }
  };

  const handleExceptionExport = async () => {
    setIsExporting(true);
    try { await PdfService.exportExceptionReport(assets, userProfile?.state || 'Global Scope'); }
    finally { setIsExporting(false); }
  };

  const stats = useMemo(() => {
    const verified = assets.filter(a => a.status === 'VERIFIED').length;
    const exceptions = assets.filter(a => a.status === 'DISCREPANCY' || ['Stolen', 'Burnt'].includes(a.condition)).length;
    return { total: assets.length, verified, exceptions };
  }, [assets]);

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32">
      <div className="space-y-2 px-2">
        <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase flex items-center gap-4 leading-none">
          <div className="p-3 bg-primary/10 rounded-2xl"><FileText className="h-8 w-8 text-primary" /></div>
          Reporting Hub
        </h2>
        <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">Executive Documentation & Data Integrity Workstation</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-muted/30 p-1.5 rounded-2xl h-auto border-2 border-border/40 ml-2">
          <TabsTrigger value="reports" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest">Executive Reports</TabsTrigger>
          <TabsTrigger value="quality" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest">
            Data Cleansing {issues.length > 0 && <Badge className="ml-2 bg-destructive">{issues.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-8 px-2">
          <Card className="border-2 border-destructive/20 bg-destructive/[0.02] rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 border-b bg-destructive/5 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-black uppercase text-destructive flex items-center gap-3"><FileWarning className="h-5 w-5" /> High-Risk exceptions</CardTitle>
              <Badge variant="outline" className="border-destructive/20 text-destructive">{stats.exceptions} Critical Pulses</Badge>
            </CardHeader>
            <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <p className="text-[11px] font-medium text-muted-foreground italic leading-relaxed max-w-sm">Extract a PDF compendium of all Stolen, Burnt, and Discrepant asset pulses.</p>
              <Button onClick={handleExceptionExport} disabled={isExporting || stats.exceptions === 0} className="h-14 px-10 rounded-2xl bg-destructive text-white shadow-xl shadow-destructive/20 gap-3">
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export Exception PDF
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/10 bg-card shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-10 border-b bg-primary/5">
              <CardTitle className="flex items-center gap-4 text-2xl font-black uppercase"><FileText className="text-primary h-8 w-8" /> Executive Travel Report</CardTitle>
            </CardHeader>
            <CardContent className="p-10">
              <Button onClick={() => setIsTravelReportOpen(true)} disabled={stats.total === 0} className="w-full h-20 rounded-[1.5rem] font-black uppercase shadow-2xl shadow-primary/20 bg-primary text-primary-foreground gap-4">
                <Zap className="h-5 w-5 fill-current" /> Initialize Report Builder <ArrowRight className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="px-2">
          <Card className="border-2 border-border/40 shadow-2xl bg-card/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 border-b bg-muted/20 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-black uppercase flex items-center gap-3"><Wrench className="h-5 w-5 text-primary" /> Registry Cleansing Suite</CardTitle>
              <Button variant="outline" size="sm" onClick={runAuditPulse} disabled={isScanning} className="h-9 px-4 rounded-xl font-black text-[9px] uppercase"><RefreshCw className="h-3 w-3 mr-2" /> Rescan</Button>
            </CardHeader>
            <ScrollArea className="h-[500px]">
              {isScanning ? <div className="h-full flex items-center justify-center opacity-40"><Loader2 className="h-12 w-12 animate-spin" /></div> : 
                issues.length > 0 ? issues.map(issue => (
                  <div key={issue.id} className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b">
                    <div className="flex items-start gap-5">
                      <div className={cn("p-4 rounded-2xl shadow-inner", issue.severity === 'CRITICAL' ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600")}>
                        <ShieldAlert className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h5 className="font-black text-sm uppercase">{issue.description}</h5>
                        <p className="text-[10px] font-medium text-muted-foreground italic leading-relaxed">{issue.suggestedFix}</p>
                      </div>
                    </div>
                    {issue.type === 'CASE_MISMATCH' && <Button onClick={() => handleFixCasing(issue)} disabled={isFixing} className="h-11 px-6 rounded-xl font-black uppercase text-[9px]">Standardize Pulse</Button>}
                  </div>
                )) : <div className="py-24 text-center opacity-20"><CheckCircle2 className="h-20 w-20 mx-auto mb-4" /><h4 className="text-2xl font-black uppercase">Registry Perfect</h4></div>}
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
      <TravelReportDialog isOpen={isTravelReportOpen} onOpenChange={setIsTravelReportOpen} />
    </div>
  );
}