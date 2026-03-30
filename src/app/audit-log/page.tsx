'use client';

/**
 * @fileOverview Global Activity Log - Registry Traceability Workspace.
 * Refined for Phase 17 with Immutable Activity Log pulse.
 */

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/app-layout';
import { History, Search, Filter, Download, User, Clock, ShieldCheck, RotateCcw, AlertCircle, ArrowRight, Loader2, Tag, MapPin, Database } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { enqueueMutation } from '@/offline/queue';
import { storage } from '@/offline/storage';
import { FirestoreService } from '@/services/firebase/firestore';
import type { ActivityLogEntry, Asset } from '@/types/domain';

export default function AuditLogPage() {
  const { assets, refreshRegistry, isOnline } = useAppState();
  const { toast } = useToast();
  
  const [log, setLog] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
              <History className="h-8 w-8 text-primary" /> Activity Pulse Log
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              Immutable Traceability & Global Registry Integrity
            </p>
          </div>
          <Button variant="outline" className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card shadow-sm border-2">
            <Download className="h-4 w-4" /> Export Ledger
          </Button>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Scan Tag ID, Auditor, or Asset Description..." 
              className="pl-12 h-14 rounded-2xl bg-card border-none shadow-xl font-medium text-sm focus-visible:ring-primary/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card border-none shadow-sm transition-all hover:bg-primary/5">
            <Filter className="h-4 w-4" /> Action Filters
          </Button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center gap-4 opacity-40">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest">Replaying Global Ledger...</p>
            </div>
          ) : filteredLog.length > 0 ? (
            filteredLog.map(entry => (
              <Card key={`log-${entry.id}`} className="border-2 border-border/40 hover:border-primary/20 transition-all rounded-[2rem] overflow-hidden bg-card/50 group">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex items-start gap-5">
                      <div className="p-4 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors shadow-inner">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-3 min-w-0">
                        <div className="space-y-1">
                          <h4 className="font-black text-sm uppercase tracking-tight truncate max-w-[300px]">{entry.assetDescription}</h4>
                          <div className="flex items-center gap-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                            <span className="flex items-center gap-1.5"><Tag className="h-2.5 w-2.5" /> ID: {entry.assetId.split('-')[0]}</span>
                            <span className="flex items-center gap-1.5"><Clock className="h-2.5 w-2.5" /> {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 items-center text-[10px] font-black uppercase">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/40">
                            <User className="h-3 w-3 text-primary opacity-60" />
                            <span>{entry.performedBy}</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/40">
                            <MapPin className="h-3 w-3 text-primary opacity-60" />
                            <span>{entry.userState}</span>
                          </div>
                        </div>

                        {entry.changes && Object.keys(entry.changes).length > 0 && (
                          <div className="p-4 rounded-2xl bg-muted/20 border border-dashed space-y-2">
                            <p className="text-[8px] font-black uppercase text-primary/60 tracking-widest">Modified Pulses:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                              {Object.entries(entry.changes).map(([key, val]: [string, any]) => (
                                <div key={key} className="flex items-center gap-2 text-[9px] font-bold">
                                  <span className="text-muted-foreground uppercase opacity-60">{key}:</span>
                                  <span className="line-through opacity-30 truncate max-w-[60px]">{String(val.old || '---')}</span>
                                  <ArrowRight className="h-2 w-2 text-primary" />
                                  <span className="text-primary truncate">{String(val.new)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={cn(
                        "text-[9px] font-black uppercase tracking-widest h-8 px-4 border-2 rounded-xl",
                        entry.operation === 'CREATE' ? "text-green-600 border-green-500/20 bg-green-50" : "text-primary border-primary/20 bg-primary/5"
                      )}>
                        {entry.operation === 'CREATE' ? 'REGISTRATION' : entry.operation === 'RESTORE' ? 'RESTORATION' : 'UPDATE'}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/5 hover:text-primary transition-all">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="py-32 text-center opacity-30 flex flex-col items-center gap-6">
              <div className="p-12 bg-muted rounded-[3rem] shadow-inner">
                <Database className="h-24 w-20" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-[0.2em]">Ledger Pulse Silent</h3>
                <p className="text-sm font-medium italic">No activity detected matching the current search parameters.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
