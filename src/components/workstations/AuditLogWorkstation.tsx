'use client';

/**
 * @fileOverview AuditLogWorkstation - SPA Activity Ledger.
 */

import React, { useEffect, useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  User, 
  Clock, 
  RotateCcw, 
  Loader2, 
  Tag, 
  MapPin, 
  Database,
  CheckCircle2,
  Trash2,
  Activity,
  FileJson,
  Zap,
  ArrowRightLeft
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { saveAs } from 'file-saver';

export function AuditLogWorkstation() {
  const { isOnline, refreshRegistry } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [log, setLog] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [entryToRestore, setEntryToRestore] = useState<ActivityLogEntry | null>(null);

  useEffect(() => { if (isOnline) loadLogs(); }, [isOnline]);

  const loadLogs = async () => {
    setLoading(true);
    try { const data = await FirestoreService.getGlobalActivity(); setLog(data); }
    finally { setLoading(false); }
  };

  const handleRestorePulse = async () => {
    if (!entryToRestore || !userProfile) return;
    setIsProcessing(true);
    try {
      await FirestoreService.restoreAsset(entryToRestore.assetId, userProfile.displayName);
      toast({ title: "Restoration Pulse Complete" });
      await loadLogs();
      await refreshRegistry();
    } finally {
      setIsProcessing(false);
      setEntryToRestore(null);
    }
  };

  const filteredLog = React.useMemo(() => {
    if (!searchTerm) return log;
    const term = searchTerm.toLowerCase();
    return log.filter(entry => entry.performedBy.toLowerCase().includes(term) || entry.assetId.toLowerCase().includes(term) || entry.assetDescription.toLowerCase().includes(term));
  }, [log, searchTerm]);

  return (
    <div className="space-y-10 pb-32 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tighter uppercase flex items-center gap-4 leading-none">
            <div className="p-3 bg-primary/10 rounded-2xl"><History className="h-8 w-8 text-primary" /></div>
            Activity Ledger
          </h2>
          <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">Immutable Traceability & Forensic Pulse Replay</p>
        </div>
        <Button variant="outline" onClick={() => { const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' }); saveAs(blob, `Assetain-Ledger.json`); }} className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 shadow-sm border-2 border-primary/10">
          <FileJson className="h-4 w-4 text-primary" /> Export Ledger Pulse
        </Button>
      </div>

      <div className="relative group px-2">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
        <Input placeholder="Search Tag ID or Auditor Pulse..." className="h-16 pl-14 rounded-[1.5rem] bg-card border-none shadow-xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="space-y-6 px-2">
        {loading ? <div className="py-40 flex justify-center"><Loader2 className="h-14 w-14 animate-spin text-primary" /></div> : 
          filteredLog.length > 0 ? filteredLog.map((entry, idx) => (
            <Card key={`log-${idx}`} className="border-2 border-border/40 hover:border-primary/20 transition-all rounded-[2.5rem] overflow-hidden bg-card/50 shadow-2xl">
              <CardContent className="p-8">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
                  <div className="flex items-start gap-6 flex-1 min-w-0">
                    <div className={cn("p-5 rounded-[1.5rem] shadow-inner shrink-0", entry.operation === 'CREATE' ? "bg-green-100 text-green-600" : entry.operation === 'RESTORE' ? "bg-blue-100 text-blue-600" : "bg-primary/10 text-primary")}>
                      {entry.operation === 'CREATE' ? <CheckCircle2 className="h-7 w-7" /> : entry.operation === 'RESTORE' ? <RotateCcw className="h-7 w-7" /> : <Activity className="h-7 w-7" />}
                    </div>
                    <div className="space-y-4 min-w-0 flex-1">
                      <h4 className="font-black text-lg uppercase truncate">{entry.assetDescription || 'Registry Mutation Pulse'}</h4>
                      <div className="flex flex-wrap gap-4 text-[9px] font-bold text-muted-foreground uppercase">
                        <span className="flex items-center gap-2"><Tag className="h-3 w-3" /> ID: {entry.assetId.split('-')[0]}</span>
                        <span className="flex items-center gap-2"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}</span>
                        <span className="flex items-center gap-2"><User className="h-3 w-3" /> {entry.performedBy}</span>
                      </div>
                      {entry.changes && (
                        <div className="p-6 rounded-[1.5rem] bg-muted/20 border-2 border-dashed border-border/40 space-y-4">
                          <p className="text-[10px] font-black uppercase text-primary tracking-[0.3em] flex items-center gap-2"><Zap className="h-3 w-3 fill-current" /> Forensic Value Pulse:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3">
                            {Object.entries(entry.changes).map(([key, val]: [string, any]) => (
                              <div key={key} className="flex flex-col gap-1.5 text-[10px] font-bold">
                                <span className="text-[8px] uppercase text-muted-foreground opacity-40">{key}</span>
                                <div className="flex items-center gap-3"><span className="line-through text-destructive/60 italic">{String(val.old || 'EMPTY')}</span><ArrowRightLeft className="h-3 w-3 opacity-20" /><span className="text-green-600 font-black">{String(val.new)}</span></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="h-10 px-6 font-black uppercase border-2 rounded-2xl">{entry.operation}</Badge>
                    {entry.operation === 'UPDATE' && <Button variant="ghost" size="icon" onClick={() => setEntryToRestore(entry)} className="h-12 w-12 rounded-2xl bg-muted/50 hover:bg-primary/10"><RotateCcw className="h-5 w-5" /></Button>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )) : <div className="py-40 text-center opacity-30"><Database className="h-28 w-24 mx-auto mb-8" /><h3 className="text-3xl font-black uppercase">Ledger Pulse Silent</h3></div>}
      </div>

      <AlertDialog open={!!entryToRestore} onOpenChange={() => setEntryToRestore(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-primary/10 p-10">
          <AlertDialogHeader className="space-y-4">
            <RotateCcw className="h-12 w-12 text-primary" />
            <AlertDialogTitle className="text-2xl font-black uppercase">Initialize Reversion Pulse?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic">Overwrite the current state for <strong>{entryToRestore?.assetDescription}</strong>. This is deterministic.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2">Discard Reversion</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestorePulse} disabled={isProcessing} className="h-12 px-10 rounded-2xl font-black uppercase bg-primary text-white">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />} Commit Reversion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}