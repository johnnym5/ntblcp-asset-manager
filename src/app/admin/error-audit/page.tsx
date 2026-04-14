'use client';

/**
 * @fileOverview System Health Hub - Error Tracking.
 * Phase 1914: Updated with simple terminology (Health, Issues, Records).
 */

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/app-layout';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Loader2, 
  Database, 
  Clock, 
  User, 
  Terminal,
  CheckCircle2,
  AlertCircle,
  Activity,
  ChevronRight,
  Info,
  XCircle,
  Monitor,
  FileJson
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FirestoreService } from '@/services/firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { ErrorLogEntry } from '@/types/domain';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { saveAs } from 'file-saver';

export default function ErrorAuditPage() {
  const { userProfile } = useAuth();
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<ErrorLogEntry | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await FirestoreService.getErrorLogs();
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  const handleExportErrors = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    saveAs(blob, `System-Health-${new Date().toISOString().split('T')[0]}.json`);
  };

  const handleResolve = async (logId: string) => {
    await FirestoreService.updateErrorStatus(logId, 'RESOLVED', 'Issue fixed by admin.');
    loadLogs();
    setSelectedLog(null);
  };

  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs;
    const term = searchTerm.toLowerCase();
    return logs.filter(l => 
      l.error.laymanExplanation.toLowerCase().includes(term) ||
      l.user.name.toLowerCase().includes(term) ||
      l.context.module.toLowerCase().includes(term)
    );
  }, [logs, searchTerm]);

  const stats = useMemo(() => {
    const critical = logs.filter(l => l.severity === 'CRITICAL').length;
    const pending = logs.filter(l => l.status === 'PENDING').length;
    return { critical, pending, total: logs.length };
  }, [logs]);

  if (!userProfile?.isAdmin) {
    return (
      <AppLayout>
        <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
          <ShieldAlert className="h-20 w-20" />
          <h2 className="text-xl font-black uppercase tracking-widest">Admin Only</h2>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase flex items-center gap-4 leading-none">
              <div className="p-3 bg-destructive/10 rounded-2xl">
                <ShieldAlert className="h-8 w-8 text-destructive" />
              </div>
              System Health
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              Admin log of system errors and health checks
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={handleExportErrors}
              disabled={logs.length === 0}
              className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 border-2 hover:bg-muted transition-all"
            >
              <FileJson className="h-4 w-4" /> Download Health Log
            </Button>
            <Button variant="outline" onClick={loadLogs} className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 border-2 hover:bg-muted transition-all">
              <Activity className="h-4 w-4" /> Refresh Health
            </Button>
          </div>
        </div>

        {/* Health Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2">
          <Card className="rounded-[2rem] border-2 border-border/40 shadow-xl bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Database className="h-3.5 w-3.5" /> Total Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black tracking-tighter">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className={cn("rounded-[2rem] border-2 shadow-xl bg-card/50", stats.critical > 0 ? "border-destructive/40" : "border-border/40")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-destructive flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5" /> Critical Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-5xl font-black tracking-tighter", stats.critical > 0 ? "text-destructive" : "text-foreground")}>{stats.critical}</div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-2 border-border/40 shadow-xl bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" /> Unresolved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black tracking-tighter text-primary">{stats.pending}</div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-center gap-4 px-2">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search by User or Issue..." 
              className="pl-14 h-16 rounded-[1.5rem] bg-card border-none shadow-xl font-bold text-sm focus-visible:ring-primary/20 transition-all placeholder:opacity-30"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-16 px-10 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest gap-3 bg-card border-none shadow-xl transition-all hover:bg-primary/5">
            <Filter className="h-4 w-4" /> Filter Errors
          </Button>
        </div>

        {/* Log Surface */}
        <div className="space-y-4 px-2">
          {loading ? (
            <div className="py-40 flex flex-col items-center justify-center gap-6 opacity-40">
              <Loader2 className="h-14 w-14 animate-spin text-primary" />
              <p className="text-[11px] font-black uppercase tracking-[0.3em]">Checking health status...</p>
            </div>
          ) : filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <Card 
                key={log.id} 
                onClick={() => setSelectedLog(log)}
                className={cn(
                  "border-2 transition-all rounded-[2rem] overflow-hidden bg-card/50 shadow-lg cursor-pointer group hover:-translate-y-1",
                  log.status === 'RESOLVED' ? "border-green-500/20 opacity-60" : "border-border/40 hover:border-primary/20"
                )}
              >
                <CardContent className="p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="flex items-start gap-6 flex-1 min-w-0">
                      <div className={cn(
                        "p-5 rounded-2xl shadow-inner shrink-0",
                        log.severity === 'CRITICAL' ? "bg-red-100 text-red-600" :
                        log.status === 'RESOLVED' ? "bg-green-100 text-green-600" :
                        "bg-primary/10 text-primary"
                      )}>
                        {log.severity === 'CRITICAL' ? <XCircle className="h-7 w-7" /> :
                         log.status === 'RESOLVED' ? <CheckCircle2 className="h-7 w-7" /> :
                         <AlertCircle className="h-7 w-7" />}
                      </div>
                      <div className="space-y-3 min-w-0 flex-1">
                        <div className="space-y-1">
                          <h4 className="font-black text-lg uppercase tracking-tight text-foreground line-clamp-1">{log.error.laymanExplanation}</h4>
                          <div className="flex flex-wrap items-center gap-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                            <span className="flex items-center gap-2 px-2.5 py-1 bg-muted/50 rounded-lg border border-border/40"><Monitor className="h-3 w-3" /> {log.context.module}</span>
                            <span className="flex items-center gap-2"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</span>
                            <span className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> {log.user.name}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <Badge variant="outline" className={cn(
                        "text-[10px] font-black uppercase tracking-[0.2em] h-10 px-6 border-2 rounded-2xl shadow-sm",
                        log.status === 'RESOLVED' ? "text-green-600 border-green-500/20 bg-green-50" : "text-primary border-primary/20 bg-primary/5"
                      )}>
                        {log.status}
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="py-40 text-center opacity-30 flex flex-col items-center gap-8">
              <CheckCircle2 className="h-28 w-24 text-green-600" />
              <div className="space-y-3">
                <h3 className="text-3xl font-black uppercase tracking-[0.3em]">System Healthy</h3>
                <p className="text-sm font-medium italic max-w-xs mx-auto leading-relaxed">
                  No system issues found in this view.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] border-primary/10 shadow-2xl p-0 overflow-hidden">
          <div className="p-8 bg-muted/30 border-b space-y-2">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Issue Details</DialogTitle>
                <Badge variant="outline" className="border-destructive/20 text-destructive font-black uppercase px-4 h-8 rounded-full">{selectedLog?.severity}</Badge>
              </div>
            </DialogHeader>
          </div>

          <ScrollArea className="max-h-[60vh] bg-background">
            <div className="p-8 space-y-10">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Summary</h4>
                <div className="p-6 rounded-3xl bg-primary/5 border-2 border-dashed border-primary/20">
                  <p className="text-base font-black uppercase tracking-tight text-foreground leading-relaxed">{selectedLog?.error.laymanExplanation}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60">Module</h4>
                  <p className="text-sm font-bold">{selectedLog?.context.module}</p>
                </div>
                <div className="space-y-2 text-right">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60">Action Attempted</h4>
                  <p className="text-sm font-bold">{selectedLog?.context.action}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60">Technical Info</h4>
                <div className="p-6 rounded-3xl bg-muted/20 border-2 border-border/40 font-mono text-[10px] text-muted-foreground leading-relaxed overflow-x-auto whitespace-pre">
                  {selectedLog?.error.technicalMessage}
                  {selectedLog?.error.stack && (
                    <div className="mt-4 pt-4 border-t border-border/40 opacity-40">
                      {selectedLog.error.stack}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-8 bg-muted/30 border-t flex items-center justify-between gap-4">
            <Button variant="ghost" onClick={() => setSelectedLog(null)} className="font-bold rounded-xl px-10">Close</Button>
            <Button 
              onClick={() => selectedLog && handleResolve(selectedLog.id)}
              disabled={selectedLog?.status === 'RESOLVED'}
              className="h-14 px-12 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 bg-primary text-primary-foreground gap-3"
            >
              <CheckCircle2 className="h-4 w-4" /> Mark Fixed
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
