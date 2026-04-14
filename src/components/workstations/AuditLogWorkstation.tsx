'use client';

/**
 * @fileOverview History Hub - Detailed Log of Asset Changes.
 * Phase 1914: Updated with simple terminology (History, Users, Changes).
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  History as HistoryIcon, 
  Search, 
  User, 
  Clock, 
  RotateCcw, 
  Loader2, 
  Tag, 
  Activity,
  FileJson,
  Zap,
  ArrowRightLeft,
  X,
  ShieldCheck
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn, sanitizeSearch } from '@/lib/utils';
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
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { saveAs } from 'file-saver';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from 'framer-motion';

export function AuditLogWorkstation({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { isOnline, refreshRegistry } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [log, setLog] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [entryToRestore, setEntryToRestore] = useState<ActivityLogEntry | null>(null);

  useEffect(() => { if (isOnline) loadLogs(); }, [isOnline]);

  const loadLogs = async () => {
    setLoading(true);
    try { 
      const data = await FirestoreService.getGlobalActivity(); 
      setLog(data); 
    } catch (e) {
      console.error("Failed to load history.");
    } finally { 
      setLoading(false); 
    }
  };

  const handleRestorePulse = async () => {
    if (!entryToRestore || !userProfile) return;
    setIsProcessing(true);
    try {
      await FirestoreService.restoreAsset(entryToRestore.assetId, userProfile.displayName);
      toast({ title: "Undo Successful", description: "Record restored to previous version." });
      await loadLogs();
      await refreshRegistry();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not undo this change." });
    } finally {
      setIsProcessing(false);
      setEntryToRestore(null);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(sanitizeSearch(val));
  };

  const handleExpandSearch = () => {
    setIsSearchExpanded(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const filteredLog = useMemo(() => {
    let results = log;
    if (!userProfile?.isAdmin && userProfile?.state) {
      const userState = userProfile.state.toLowerCase().trim();
      results = results.filter(entry => (entry.userState || '').toLowerCase().trim() === userState);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(entry => 
        entry.performedBy.toLowerCase().includes(term) || 
        entry.assetId.toLowerCase().includes(term) || 
        entry.assetDescription.toLowerCase().includes(term)
      );
    }
    return results;
  }, [log, searchTerm, userProfile]);

  return (
    <div className={cn("space-y-10 animate-in fade-in duration-700", !isEmbedded && "pb-32 max-w-6xl mx-auto")}>
      {!isEmbedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tighter uppercase flex items-center gap-4 leading-none text-white">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <HistoryIcon className="h-8 w-8 text-primary" />
              </div>
              Activity History
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              Detailed list of all changes made to assets.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <AnimatePresence mode="wait">
              {!isSearchExpanded ? (
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleExpandSearch}
                  className="h-12 w-12 rounded-xl border-white/10 bg-white/5 hover:bg-primary/10 text-primary"
                >
                  <Search className="h-5 w-5" />
                </Button>
              ) : (
                <motion.div 
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "300px", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="relative"
                >
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input 
                    ref={searchInputRef}
                    placeholder="Search history..." 
                    className="h-12 pl-11 pr-10 rounded-xl bg-white/[0.05] border-2 border-primary/20 text-white" 
                    value={searchTerm} 
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onBlur={() => !searchTerm && setIsSearchExpanded(false)}
                  />
                  <button onClick={() => { setSearchTerm(''); setIsSearchExpanded(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"><X className="h-4 w-4" /></button>
                </motion.div>
              )}
            </AnimatePresence>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={() => { 
                      const blob = new Blob([JSON.stringify(filteredLog, null, 2)], { type: 'application/json' }); 
                      saveAs(blob, `Activity-History-${new Date().toISOString().split('T')[0]}.json`); 
                    }} 
                    className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-3 shadow-sm border-2 border-white/5 hover:bg-white/5 transition-all text-white"
                  >
                    <FileJson className="h-4 w-4 text-primary" /> Download Log
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download history as a file.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}

      <div className={cn("space-y-6 px-2", isEmbedded ? "pb-10" : "pb-32")}>
        {loading ? (
          <div className="py-40 flex flex-col items-center gap-4 opacity-20">
            <Loader2 className="h-14 w-14 animate-spin text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white">Loading History...</p>
          </div>
        ) : filteredLog.length > 0 ? (
          filteredLog.map((entry, idx) => (
            <Card key={`log-${entry.id}-${idx}`} className="border-2 border-white/5 hover:border-primary/20 transition-all rounded-[2rem] overflow-hidden bg-white/[0.02] shadow-2xl">
              <CardContent className="p-8">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
                  <div className="flex items-start gap-6 flex-1 min-w-0">
                    <div className={cn(
                      "p-5 rounded-[1.5rem] shadow-inner shrink-0", 
                      entry.operation === 'CREATE' ? "bg-green-100/10 text-green-600" : 
                      entry.operation === 'RESTORE' ? "bg-blue-100/10 text-blue-600" : 
                      entry.operation === 'DELETE' ? "bg-red-100/10 text-red-600" :
                      "bg-primary/10 text-primary"
                    )}>
                      {entry.operation === 'CREATE' ? <ShieldCheck className="h-7 w-7" /> : 
                       entry.operation === 'RESTORE' ? <RotateCcw className="h-7 w-7" /> : 
                       entry.operation === 'DELETE' ? <Trash2 className="h-7 w-7" /> :
                       <Activity className="h-7 w-7" />}
                    </div>
                    <div className="space-y-4 min-w-0 flex-1">
                      <div className="space-y-1">
                        <h4 className="font-black text-lg uppercase tracking-tight text-white truncate leading-none">
                          {entry.assetDescription || 'System Activity'}
                        </h4>
                        <div className="flex flex-wrap items-center gap-4 text-[9px] font-bold text-white/20 uppercase tracking-widest opacity-60">
                          <span className="flex items-center gap-2 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
                            <Tag className="h-3.5 w-3.5" /> ID: {entry.assetId.split('-')[0]}
                          </span>
                          <span className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" /> {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                          </span>
                          <span className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5" /> {entry.performedBy}
                          </span>
                        </div>
                      </div>

                      {entry.changes && Object.keys(entry.changes).length > 0 && (
                        <div className="p-6 rounded-[1.5rem] bg-black/40 border-2 border-dashed border-white/5 space-y-4">
                          <p className="text-[10px] font-black uppercase text-primary tracking-[0.3em] flex items-center gap-2">
                            <Zap className="h-3 w-3 fill-current" /> Changes:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3">
                            {Object.entries(entry.changes).map(([key, val]: [string, any]) => (
                              <div key={key} className="flex flex-col gap-1.5">
                                <span className="text-[8px] font-black uppercase text-white/20 opacity-40">{key.replace(/([A-Z])/g, ' $1')}</span>
                                <div className="flex items-center gap-3 text-[10px] font-bold">
                                  <div className="flex items-center gap-2 bg-red-500/5 border border-white/5 px-2 py-1 rounded-lg line-through text-red-500/40 truncate max-w-[120px] italic">
                                    {String(val.old || 'Empty')}
                                  </div>
                                  <ArrowRightLeft className="h-3 w-3 text-white/10 shrink-0" />
                                  <div className="flex items-center gap-2 bg-green-500/5 border border-white/5 px-2 py-1 rounded-lg text-green-600 font-black truncate max-w-[120px]">
                                    {String(val.new)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="outline" className="h-10 px-6 font-black uppercase border-2 border-white/10 rounded-2xl shadow-sm tracking-widest text-[10px] text-white/60 bg-white/5">
                      {entry.operation}
                    </Badge>
                    {entry.operation === 'UPDATE' && userProfile?.isAdmin && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setEntryToRestore(entry)} 
                              className="h-12 w-12 rounded-2xl bg-white/5 hover:bg-primary/10 hover:text-primary transition-all text-white/20"
                            >
                              <RotateCcw className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Undo change</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="py-24 text-center opacity-30 border-2 border-dashed border-white/5 rounded-[3rem]">
            <HistoryIcon className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase tracking-[0.3em] text-white">No History</h3>
              <p className="text-sm font-medium italic max-w-xs mx-auto text-white/40">
                No record changes found in this view.
              </p>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!entryToRestore} onOpenChange={setEntryToRestore}>
        <AlertDialogContent className="rounded-[2.5rem] border-primary/10 p-10 shadow-3xl bg-black">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-2xl w-fit">
              <RotateCcw className="h-12 w-12 text-primary" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Undo change?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed italic text-white/40">
              Restore <strong>{entryToRestore?.assetDescription}</strong> to its previous state. This action will be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2 border-white/10 m-0 text-white hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRestorePulse} 
              disabled={isProcessing} 
              className="h-12 px-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 bg-primary text-black m-0"
            >
              Restore Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
