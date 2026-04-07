
'use client';

/**
 * @fileOverview Reports Workstation - Executive Reporting & Data Quality.
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
  History as HistoryIcon,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Database,
  Search,
  RefreshCw,
  Wrench,
  FileWarning,
  PlaneTakeoff,
  Info
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function ReportsWorkstation({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { assets, refreshRegistry } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [isTravelReportOpen, setIsTravelReportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("reports");
  const [issues, setIssues] = useState<IntegrityIssue[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const scopedAssets = useMemo(() => {
    if (!userProfile?.isAdmin && userProfile?.state) {
      const userState = userProfile.state.toLowerCase().trim();
      return assets.filter(a => (a.location || '').toLowerCase().trim() === userState);
    }
    return assets;
  }, [assets, userProfile]);

  useEffect(() => { if (activeTab === 'quality') runAuditPulse(); }, [activeTab, scopedAssets]);

  const runAuditPulse = async () => {
    setIsScanning(true);
    try {
      const auditIssues = await IntegrityEngine.runFullAudit(scopedAssets);
      setIssues(auditIssues);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFixCasing = async (issue: IntegrityIssue) => {
    setIsFixing(true);
    try {
      const affectedAssets = scopedAssets.filter(a => issue.affectedIds.includes(a.id));
      for (const asset of affectedAssets) {
        const updated = { ...asset, location: IntegrityEngine.standardizeLocation(asset.location), lastModified: new Date().toISOString() };
        await enqueueMutation('UPDATE', 'assets', updated);
        const currentLocal = await storage.getAssets();
        await storage.saveAssets(currentLocal.map(a => a.id === asset.id ? updated : a));
      }
      await refreshRegistry();
      toast({ title: "Fix Applied Successfully" });
    } finally {
      setIsFixing(false);
    }
  };

  const handleExceptionExport = async () => {
    setIsExporting(true);
    try { await PdfService.exportExceptionReport(scopedAssets, userProfile?.state || 'Global Scope'); }
    finally { setIsExporting(false); }
  };

  const stats = useMemo(() => {
    const verified = scopedAssets.filter(a => a.status === 'VERIFIED').length;
    const exceptions = scopedAssets.filter(a => a.status === 'DISCREPANCY' || ['Stolen', 'Burnt'].includes(a.condition || '')).length;
    return { total: scopedAssets.length, verified, exceptions };
  }, [scopedAssets]);

  return (
    <div className={cn("space-y-10", !isEmbedded && "max-w-6xl mx-auto pb-32")}>
      {!isEmbedded && (
        <div className="space-y-2 px-2">
          <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase flex items-center gap-4 leading-none">
            <div className="p-3 bg-primary/10 rounded-2xl"><FileText className="h-8 w-8 text-primary" /></div>
            Reports
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">Official Documents & Data Quality Tools</p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-muted/30 p-1.5 rounded-2xl h-auto border-2 border-border/40 ml-2 w-fit">
          <TabsTrigger value="reports" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-black transition-all">Executive Reports</TabsTrigger>
          <TabsTrigger value="quality" className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-black transition-all">
            Data Quality {issues.length > 0 && <Badge className="ml-2 bg-destructive text-white h-5 px-2">{issues.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-8 px-2 m-0 outline-none">
          <div className={cn("grid gap-8", isEmbedded ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-12")}>
            <div className={cn("space-y-8", !isEmbedded && "lg:col-span-12")}>
              {/* Travel Report */}
              <Card className="border-2 border-primary/20 bg-primary/[0.02] rounded-[2.5rem] overflow-hidden shadow-2xl">
                <CardHeader className="p-8 border-b bg-primary/5 flex flex-row items-center justify-between">
                  <CardTitle className="text-xl font-black uppercase text-primary flex items-center gap-3"><PlaneTakeoff className="h-5 w-5" /> Travel Report</CardTitle>
                  <Badge variant="outline" className="border-primary/20 text-primary uppercase text-[9px] font-black">Official Report</Badge>
                </CardHeader>
                <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <p className="text-[11px] font-medium text-muted-foreground italic leading-relaxed max-w-sm">Generate a Word document report for your site visit or audit period.</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={() => setIsTravelReportOpen(true)} className="h-14 px-10 rounded-2xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 gap-3">
                          <FileText className="h-4 w-4" /> Create Report
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Start the guided process to generate a Travel Report document.</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardContent>
              </Card>

              {/* Exception List */}
              <Card className="border-2 border-destructive/10 bg-card shadow-2xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 border-b bg-destructive/5 flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-4 text-xl font-black uppercase text-destructive"><FileWarning className="text-destructive h-6 w-6" /> Exception List</CardTitle>
                  <Badge variant="outline" className="text-destructive border-destructive/20 font-black text-[9px]">{stats.exceptions} Issues</Badge>
                </CardHeader>
                <CardContent className="p-8">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={handleExceptionExport} disabled={isExporting || stats.exceptions === 0} className="w-full h-16 rounded-2xl font-black uppercase shadow-2xl shadow-destructive/20 bg-destructive text-white gap-4 transition-transform hover:scale-105 active:scale-95">
                          {isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 fill-current" />} Download Issues PDF <ArrowRight className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Download a PDF summary of all stolen, damaged, or out-of-sync assets.</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="px-2 m-0 outline-none">
          <Card className="border-2 border-border/40 shadow-2xl bg-card/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 border-b bg-muted/20 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-black uppercase flex items-center gap-3"><Wrench className="h-5 w-5 text-primary" /> Data Quality Check</CardTitle>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Automatic Scan for Errors</p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={runAuditPulse} disabled={isScanning} className="h-9 px-4 rounded-xl font-black text-[9px] uppercase"><RefreshCw className="h-3 w-3 mr-2" /> Scan Again</Button>
                  </TooltipTrigger>
                  <TooltipContent>Re-scan the registry to find new data errors or inconsistencies.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardHeader>
            <ScrollArea className="h-[400px]">
              {isScanning ? <div className="h-full flex items-center justify-center opacity-40"><Loader2 className="h-12 w-12 animate-spin" /></div> : 
                issues.length > 0 ? issues.map(issue => (
                  <div key={issue.id} className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-start gap-5">
                      <div className={cn("p-4 rounded-2xl shadow-inner", issue.severity === 'CRITICAL' ? "bg-red-100/10 text-red-600" : "bg-orange-100/10 text-orange-600")}>
                        <ShieldAlert className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h5 className="font-black text-sm uppercase text-white">{issue.description}</h5>
                        <p className="text-[10px] font-medium text-white/40 italic leading-relaxed">{issue.suggestedFix}</p>
                      </div>
                    </div>
                    {issue.type === 'CASE_MISMATCH' && <Button onClick={() => handleFixCasing(issue)} disabled={isFixing} className="h-11 px-6 rounded-xl font-black uppercase text-[9px] bg-primary text-black">Apply Automatic Fix</Button>}
                  </div>
                )) : <div className="py-24 text-center opacity-20"><CheckCircle2 className="h-20 w-20 mx-auto mb-4 text-green-600" /><h4 className="text-2xl font-black uppercase text-white">No Errors Found</h4></div>}
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
      <TravelReportDialog isOpen={isTravelReportOpen} onOpenChange={setIsTravelReportOpen} />
    </div>
  );
}
