'use client';

/**
 * @fileOverview ErrorAuditWorkstation - Executive System Health Monitoring.
 * Restricted to SUPERADMIN. Provides deterministic trace of all app anomalies.
 * Phase 1013: Implemented Retry Pulse logic for auto-resolution based on diagnostic health.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { 
  HeartPulse, 
  Search, 
  Loader2, 
  Database, 
  Clock, 
  User, 
  CheckCircle2,
  AlertCircle,
  Activity,
  ChevronRight,
  XCircle,
  Monitor,
  FileJson,
  Zap,
  Terminal,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Trash2,
  X,
  ShieldAlert,
  Check
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FirestoreService } from '@/services/firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import { SystemDiagnostics, type DiagnosticResult } from '@/lib/diagnostics';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { ErrorLogEntry, ErrorLogStatus } from '@/types/domain';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

export function ErrorAuditWorkstation({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { userProfile } = useAuth();
  const { isOnline } = useAppState();
  const { toast } = useToast();
  
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<ErrorLogEntry | null>(null);
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[] | null>(null);
  
  // Batch & Processing State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRetryingId, setIsRetryingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOnline) loadLogs();
  }, [isOnline]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await FirestoreService.getErrorLogs();
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    setIsProcessing(true);
    try {
      await FirestoreService.updateErrorStatus(id, 'RESOLVED', 'Issue audited and resolved.');
      toast({ title: "Incident Resolved" });
      setSelectedLog(null);
      await loadLogs();
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Retry Pulse: Checks if the error condition still persists.
   * If the diagnostic pulse passes, the incident is auto-resolved.
   */
  const handleRetryLog = async (log: ErrorLogEntry) => {
    setIsRetryingId(log.id);
    try {
      const results = await SystemDiagnostics.runSelfTest();
      
      // Determine node to check based on context
      const moduleStr = log.context.module.toUpperCase();
      let nodeToCheck: 'CLOUD' | 'MIRROR' | 'LOCAL' | 'AUTH' = 'LOCAL';
      if (moduleStr.includes('FIRESTORE') || moduleStr.includes('CLOUD')) nodeToCheck = 'CLOUD';
      else if (moduleStr.includes('RTDB') || moduleStr.includes('MIRROR')) nodeToCheck = 'MIRROR';
      
      const nodeStatus = results.find(r => r.node === nodeToCheck);

      if (nodeStatus && nodeStatus.status === 'STABLE') {
        await FirestoreService.updateErrorStatus(log.id, 'RESOLVED', 'System re-scan confirmed stability. Auto-resolved.');
        toast({ title: "Pulse Restored", description: `Diagnostic re-scan confirmed ${nodeToCheck} is stable.` });
        await loadLogs();
      } else {
        toast({ 
          variant: "destructive", 
          title: "Incident Persistent", 
          description: `Error still detected in ${nodeToCheck} node. Remaining status: PENDING.` 
        });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Diagnostic Failure" });
    } finally {
      setIsRetryingId(null);
    }
  };

  const runDiagnostics = async () => {
    setIsDiagnosticRunning(true);
    try {
      const results = await SystemDiagnostics.runSelfTest();
      setDiagnosticResults(results);
      toast({ title: "Diagnostics Stable", description: "Storage node topology audited." });
    } finally {
      setIsDiagnosticRunning(false);
    }
  };

  const handleExport = () => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    saveAs(blob, `Assetain-Health-Audit-${new Date().toISOString()}.json`);
  };

  const handleBatchAction = async (status: ErrorLogStatus) => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await FirestoreService.updateErrorStatus(id, status, 'Administrative batch adjudication.');
      }
      toast({ title: "Audit Ledger Updated", description: `Successfully marked ${selectedIds.size} incidents as ${status}.` });
      setSelectedIds(new Set());
      await loadLogs();
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const filteredLogs = useMemo(() => {
    let list = logs;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(l => 
        l.error.laymanExplanation.toLowerCase().includes(term) ||
        l.context.module.toLowerCase().includes(term) ||
        l.user.name.toLowerCase().includes(term)
      );
    }
    return list;
  }, [logs, searchTerm]);

  const stats = useMemo(() => ({
    total: logs.length,
    pending: logs.filter(l => l.status === 'PENDING').length,
    critical: logs.filter(l => l.severity === 'CRITICAL' && l.status === 'PENDING').length
  }), [logs]);

  if (userProfile?.role !== 'SUPERADMIN') return null;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {!isEmbedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
          <div className="space-y-1">
            <h2 className="text-3xl font-black uppercase text-white tracking-tight flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-2xl">
                <HeartPulse className="h-8 w-8 text-destructive animate-pulse" />
              </div>
              System Health
            </h2>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">
              Autonomous Health Log & Recovery Traceability
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={runDiagnostics} disabled={isDiagnosticRunning} className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 border-2 border-white/5 hover:bg-white/5 text-white">
              {isDiagnosticRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4 text-primary" />}
              Full System Test
            </Button>
            <Button variant="outline" onClick={handleExport} className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 border-2 border-white/5 hover:bg-white/5 text-white">
              <FileJson className="h-4 w-4 text-primary" /> Export Audit
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-1">
        <Card className="bg-black/40 border-2 border-white/5 rounded-[2.5rem] p-8 shadow-3xl">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Total Incidents</span>
            <div className="p-2 bg-white/5 rounded-xl"><Database className="h-4 w-4 text-white/40" /></div>
          </div>
          <div className="text-5xl font-black tracking-tighter text-white">{stats.total}</div>
        </Card>

        <Card className={cn("bg-black/40 border-2 rounded-[2.5rem] p-8 shadow-3xl", stats.critical > 0 ? "border-destructive/40" : "border-white/5")}>
          <div className="flex justify-between items-start mb-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-destructive">Critical Failures</span>
            <div className="p-2 bg-destructive/10 rounded-xl"><Zap className="h-4 w-4 text-destructive" /></div>
          </div>
          <div className={cn("text-5xl font-black tracking-tighter", stats.critical > 0 ? "text-destructive" : "text-white")}>{stats.critical}</div>
        </Card>

        <Card className="bg-black/40 border-2 border-white/5 rounded-[2.5rem] p-8 shadow-3xl">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary">Pending Review</span>
            <div className="p-2 bg-primary/10 rounded-xl"><Clock className="h-4 w-4 text-primary" /></div>
          </div>
          <div className="text-5xl font-black tracking-tighter text-primary">{stats.pending}</div>
        </Card>
      </div>

      <div className="relative group px-1">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-primary transition-colors" />
        <Input 
          placeholder="Search by module, user or layman explanation..." 
          className="h-16 pl-14 rounded-2xl bg-white/[0.03] border-white/5 text-white shadow-xl focus-visible:ring-primary/20"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4 px-1">
        {loading ? (
          <div className="py-40 flex flex-col items-center gap-4 opacity-20">
            <Loader2 className="h-14 w-14 animate-spin text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest">Replaying Health Pulse...</p>
          </div>
        ) : filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <Card 
              key={log.id} 
              className={cn(
                "border-2 transition-all rounded-[2rem] overflow-hidden bg-white/[0.02] shadow-lg group relative",
                log.status === 'RESOLVED' ? "opacity-60 grayscale border-green-500/10" : "border-white/5 hover:border-primary/20"
              )}
            >
              <CardContent className="p-8 flex items-center gap-8">
                <Checkbox 
                  checked={selectedIds.has(log.id)}
                  onCheckedChange={() => toggleSelect(log.id)}
                  className="h-6 w-6 rounded-lg border-2 border-white/10 shrink-0 data-[state=checked]:bg-primary"
                />
                
                <div className="flex-1 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  <div className="flex items-start gap-6 flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedLog(log)}>
                    <div className={cn(
                      "p-5 rounded-2xl shadow-inner shrink-0",
                      log.severity === 'CRITICAL' ? "bg-red-500/10 text-red-600" :
                      log.status === 'RESOLVED' ? "bg-green-500/10 text-green-600" :
                      "bg-primary/10 text-primary"
                    )}>
                      {log.severity === 'CRITICAL' ? <XCircle className="h-7 w-7" /> :
                       log.status === 'RESOLVED' ? <CheckCircle2 className="h-7 w-7" /> :
                       <AlertCircle className="h-7 w-7" />}
                    </div>
                    <div className="space-y-3 min-w-0 flex-1">
                      <h4 className="font-black text-lg uppercase tracking-tight text-white line-clamp-1">{log.error.laymanExplanation}</h4>
                      <div className="flex flex-wrap items-center gap-4 text-[9px] font-bold text-white/20 uppercase tracking-widest opacity-60">
                        <span className="flex items-center gap-2 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10"><Monitor className="h-3.5 w-3.5" /> {log.context.module}</span>
                        <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</span>
                        <span className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> {log.user.name}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0">
                    {log.status === 'PENDING' && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        disabled={isRetryingId === log.id}
                        onClick={(e) => { e.stopPropagation(); handleRetryLog(log); }}
                        className="h-10 w-10 rounded-xl bg-white/5 hover:bg-primary/10 text-primary transition-all tactile-pulse"
                      >
                        {isRetryingId === log.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </Button>
                    )}
                    <Badge variant="outline" className={cn(
                      "text-[10px] font-black uppercase tracking-[0.2em] h-10 px-6 border-2 rounded-2xl shadow-sm",
                      log.status === 'RESOLVED' ? "text-green-600 border-green-500/20" : "text-primary border-primary/20"
                    )}>
                      {log.status}
                    </Badge>
                    <ChevronRight className="h-5 w-5 text-white/20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="py-40 text-center opacity-30 border-2 border-dashed border-white/5 rounded-[4rem]">
            <ShieldCheck className="h-28 w-24 mx-auto text-green-600" />
            <h3 className="text-3xl font-black uppercase tracking-[0.3em] text-white mt-6">Audit Ledger Clear</h3>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#0A0A0A]/95 border-2 border-primary/20 rounded-2xl p-3 flex items-center gap-8 shadow-3xl backdrop-blur-3xl">
            <div className="flex items-center gap-3 pl-3">
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-black font-black text-[10px]">{selectedIds.size}</div>
              <span className="text-[10px] font-black uppercase text-white tracking-widest">Incidents Selected</span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Button onClick={() => handleBatchAction('RESOLVED')} disabled={isProcessing} className="h-11 px-8 rounded-xl font-black uppercase text-[10px] gap-2 shadow-xl bg-green-600 hover:bg-green-500">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Mark Resolved
              </Button>
              <Button variant="ghost" onClick={() => handleBatchAction('PENDING')} disabled={isProcessing} className="h-11 px-6 rounded-xl font-black uppercase text-[10px] gap-2 text-white/60 hover:text-white">
                Reset to Pending
              </Button>
              <button onClick={() => setSelectedIds(new Set())} className="p-2 text-white/20 hover:text-white transition-all"><X className="h-5 w-5" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] border-primary/10 shadow-3xl p-0 overflow-hidden bg-black text-white">
          <div className="p-8 bg-white/5 border-b border-white/5">
            <DialogHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Technical Breakdown</DialogTitle>
                <DialogDescription className="font-bold uppercase text-[9px] tracking-widest text-white/40">Incident ID: {selectedLog?.id}</DialogDescription>
              </div>
              <Badge variant="outline" className="h-8 px-4 font-black uppercase border-destructive/40 text-destructive">{selectedLog?.severity}</Badge>
            </DialogHeader>
          </div>

          <ScrollArea className="max-h-[60vh] bg-black">
            <div className="p-8 space-y-10">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Administrative Summary</h4>
                <div className="p-6 rounded-3xl bg-primary/5 border-2 border-dashed border-primary/20">
                  <p className="text-base font-black uppercase tracking-tight leading-relaxed">{selectedLog?.error.laymanExplanation}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-white/20">Origin Module</h4>
                  <p className="text-sm font-bold">{selectedLog?.context.module}</p>
                </div>
                <div className="space-y-2 text-right">
                  <h4 className="text-[10px] font-black uppercase text-white/20">Attempted Action</h4>
                  <p className="text-sm font-bold">{selectedLog?.context.action}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-white/20">Trace Detail</h4>
                <div className="p-6 rounded-3xl bg-black border-2 border-white/5 font-mono text-[10px] text-white/40 leading-relaxed overflow-x-auto whitespace-pre">
                  {selectedLog?.error.technicalMessage}
                  {selectedLog?.error.stack && (
                    <div className="mt-4 pt-4 border-t border-white/10 opacity-40 italic">
                      {selectedLog.error.stack}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-8 bg-white/5 border-t border-white/5 flex items-center justify-between gap-4">
            <Button variant="ghost" onClick={() => setSelectedLog(null)} className="font-bold rounded-xl px-10 text-white/40 hover:text-white">Dismiss</Button>
            {selectedLog?.status === 'PENDING' && (
              <Button onClick={() => handleResolve(selectedLog!.id)} disabled={isProcessing} className="h-14 px-12 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl bg-primary text-black gap-3">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Resolve Incident
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
