'use client';

/**
 * @fileOverview Global Activity Ledger - Registry Traceability Workspace.
 * Phase 52: Implemented Ledger Pulse Export (JSON/CSV).
 */

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/app-layout';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  User, 
  Clock, 
  ShieldCheck, 
  RotateCcw, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  Tag, 
  MapPin, 
  Database,
  CheckCircle2,
  Trash2,
  Activity,
  FileJson
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { FirestoreService } from '@/services/firebase/firestore';
import type { ActivityLogEntry } from '@/types/domain';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { saveAs } from 'file-saver';

export default function AuditLogPage() {
  const { isOnline, refreshRegistry } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [log, setLog] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [entryToRestore, setEntryToRestore] = useState<ActivityLogEntry | null>(null);

  useEffect(() => {
    if (isOnline) {
      loadLogs();
    }
  }, [isOnline]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await FirestoreService.getGlobalActivity();
      setLog(data);
    } finally {
      setLoading(false);
    }
  };

  const handleExportLedger = () => {
    const snapshot = {
      version: '5.0.4',
      exportedAt: new Date().toISOString(),
      entries: log
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    saveAs(blob, `Assetain-Activity-Ledger-${new Date().toISOString().split('T')[0]}.json`);
    toast({ title: "Ledger Pulse Exported", description: "JSON archive saved to local storage." });
  };

  const handleRestorePulse = async () => {
    if (!entryToRestore || !userProfile) return;
    
    setIsProcessing(true);
    try {
      await FirestoreService.restoreAsset(entryToRestore.assetId, userProfile.displayName);
      toast({ 
        title: "Restoration Pulse Complete", 
        description: "Registry record successfully rolled back to its previous state." 
      });
      await loadLogs();
      await refreshRegistry();
    } catch (e) {
      toast({ 
        variant: "destructive", 
        title: "Restoration Failure", 
        description: e instanceof Error ? e.message : "Heartbeat interruption." 
      });
    } finally {
      setIsProcessing(false);
      setEntryToRestore(null);
    }
  };

  const filteredLog = React.useMemo(() => {
    if (!searchTerm) return log;
    const term = searchTerm.toLowerCase();
    return log.filter(entry => 
      entry.performedBy.toLowerCase().includes(term) ||
      entry.assetId.toLowerCase().includes(term) ||
      entry.assetDescription.toLowerCase().includes(term) ||
      entry.operation.toLowerCase().includes(term)
    );
  }, [log, searchTerm]);

  return (
    <AppLayout>
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32 max-w-6xl mx-auto">
        {/* Header Pulse */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase flex items-center gap-4 leading-none">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <History className="h-8 w-8 text-primary" />
              </div>
              Activity Ledger
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              Immutable Traceability & Global Registry Integrity Pulse
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleExportLedger}
            disabled={log.length === 0}
            className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 bg-card shadow-sm border-2 border-primary/10 hover:border-primary/30 transition-all tactile-pulse"
          >
            <FileJson className="h-4 w-4 text-primary" /> Export Ledger Pulse
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-center gap-4 px-2">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search Tag ID, Auditor Pulse, or Asset Description..." 
              className="pl-14 h-16 rounded-[1.5rem] bg-card border-none shadow-xl font-bold text-sm focus-visible:ring-primary/20 transition-all placeholder:opacity-30"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-16 px-10 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest gap-3 bg-card border-none shadow-xl transition-all hover:bg-primary/5 tactile-pulse">
            <Filter className="h-4 w-4" /> Logic Filters
          </Button>
        </div>

        {/* Ledger Surface */}
        <div className="space-y-6 px-2">
          {loading ? (
            <div className="py-40 flex flex-col items-center justify-center gap-6 opacity-40">
              <Loader2 className="h-14 w-14 animate-spin text-primary" />
              <p className="text-[11px] font-black uppercase tracking-[0.3em] animate-pulse">Replaying Global Ledger...</p>
            </div>
          ) : filteredLog.length > 0 ? (
            filteredLog.map((entry, idx) => (
              <Card key={`log-${entry.id}-${idx}`} className="border-2 border-border/40 hover:border-primary/20 transition-all rounded-[2.5rem] overflow-hidden bg-card/50 shadow-2xl hover:shadow-primary/5 group">
                <CardContent className="p-8">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
                    <div className="flex items-start gap-6 flex-1 min-w-0">
                      <div className={cn(
                        "p-5 rounded-[1.5rem] transition-colors shadow-inner shrink-0",
                        entry.operation === 'CREATE' ? "bg-green-100 text-green-600" :
                        entry.operation === 'RESTORE' ? "bg-blue-100 text-blue-600" :
                        entry.operation === 'DELETE' ? "bg-red-100 text-red-600" :
                        "bg-primary/10 text-primary"
                      )}>
                        {entry.operation === 'CREATE' ? <CheckCircle2 className="h-7 w-7" /> :
                         entry.operation === 'RESTORE' ? <RotateCcw className="h-7 w-7" /> :
                         entry.operation === 'DELETE' ? <Trash2 className="h-7 w-7" /> :
                         <Activity className="h-7 w-7" />}
                      </div>
                      <div className="space-y-4 min-w-0 flex-1">
                        <div className="space-y-1.5">
                          <h4 className="font-black text-lg uppercase tracking-tight text-foreground truncate leading-none">{entry.assetDescription || 'Registry Mutation Pulse'}</h4>
                          <div className="flex flex-wrap items-center gap-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                            <span className="flex items-center gap-2 px-2.5 py-1 bg-muted/50 rounded-lg border border-border/40"><Tag className="h-3 w-3" /> ID: {entry.assetId.split('-')[0]}</span>
                            <span className="flex items-center gap-2"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 items-center">
                          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/30 border border-border/40">
                            <User className="h-3.5 w-3.5 text-primary opacity-60" />
                            <span className="text-[10px] font-black uppercase">{entry.performedBy}</span>
                          </div>
                          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/30 border border-border/40">
                            <MapPin className="h-3.5 w-3.5 text-primary opacity-60" />
                            <span className="text-[10px] font-black uppercase">{entry.userState}</span>
                          </div>
                        </div>

                        {entry.changes && Object.keys(entry.changes).length > 0 && (
                          <div className="p-6 rounded-[1.5rem] bg-muted/20 border-2 border-dashed border-border/40 space-y-3">
                            <p className="text-[9px] font-black uppercase text-primary/60 tracking-[0.3em]">Pulse Modifications:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2">
                              {Object.entries(entry.changes).map(([key, val]: [string, any]) => (
                                <div key={key} className="flex items-center gap-3 text-[10px] font-bold">
                                  <span className="text-muted-foreground uppercase opacity-40 shrink-0">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="line-through opacity-30 truncate max-w-[80px] italic">{String(val.old || 'EMPTY')}</span>
                                    <ArrowRight className="h-2.5 w-2.5 text-primary shrink-0" />
                                    <span className="text-primary font-black truncate">{String(val.new)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="outline" className={cn(
                        "text-[10px] font-black uppercase tracking-[0.2em] h-10 px-6 border-2 rounded-2xl shadow-sm",
                        entry.operation === 'CREATE' ? "text-green-600 border-green-500/20 bg-green-50" :
                        entry.operation === 'RESTORE' ? "text-blue-600 border-blue-500/20 bg-blue-50" :
                        "text-primary border-primary/20 bg-primary/5"
                      )}>
                        {entry.operation}
                      </Badge>
                      
                      {entry.operation === 'UPDATE' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setEntryToRestore(entry)}
                          className="h-12 w-12 rounded-2xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all tactile-pulse"
                        >
                          <RotateCcw className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="py-40 text-center opacity-30 flex flex-col items-center gap-8">
              <div className="p-16 bg-muted rounded-[4rem] shadow-inner">
                <Database className="h-28 w-24 text-muted-foreground" />
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-black uppercase tracking-[0.3em]">Ledger Pulse Silent</h3>
                <p className="text-sm font-medium italic max-w-xs mx-auto leading-relaxed">
                  No registry modifications detected in the current query scope.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!entryToRestore} onOpenChange={() => setEntryToRestore(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-primary/10 shadow-2xl p-10">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-2xl w-fit">
              <RotateCcw className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight">Initialize Reversion Pulse?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium leading-relaxed italic">
                This will overwrite the current registry state for <strong>{entryToRestore?.assetDescription}</strong> with the data from before this mutation pulse. This action is deterministic and will be broadcast to the cloud.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2 m-0">Discard Reversion</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRestorePulse}
              disabled={isProcessing}
              className="h-12 px-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 m-0"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Commit Reversion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
