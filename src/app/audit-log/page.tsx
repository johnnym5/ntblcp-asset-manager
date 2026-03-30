'use client';

/**
 * @fileOverview Global Activity Log - Registry Traceability Workspace.
 * Refined for Phase 7 with detailed modification pulse visibility.
 */

import React from 'react';
import AppLayout from '@/components/app-layout';
import { History, Search, Filter, Download, User, Clock, ShieldCheck, RotateCcw, AlertCircle, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function AuditLogPage() {
  const { assets } = useAppState();
  
  // Historical pulse is derived from assets with lastModified metadata
  const history = assets
    .filter(a => a.lastModified)
    .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
              <History className="h-8 w-8 text-primary" /> Activity Pulse Log
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              Global Traceability & Historical Registry Integrity
            </p>
          </div>
          <Button variant="outline" className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card shadow-sm border-2">
            <Download className="h-4 w-4" /> Export Ledger
          </Button>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input 
              placeholder="Search by auditor, asset ID, or action..." 
              className="pl-12 h-14 rounded-2xl bg-card border-none shadow-sm font-medium text-sm focus-visible:ring-primary/20"
            />
          </div>
          <Button variant="outline" className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card border-none shadow-sm transition-all hover:bg-primary/5">
            <Filter className="h-4 w-4" /> Action Filters
          </Button>
        </div>

        <div className="space-y-4">
          {history.length > 0 ? (
            history.map(asset => (
              <Card key={`log-${asset.id}`} className="border-2 border-border/40 hover:border-primary/20 transition-all rounded-3xl overflow-hidden bg-card/50 group">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className="p-3 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-black text-sm uppercase tracking-tight">{asset.description || asset.name}</h4>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                          <span className="flex items-center gap-1.5"><User className="h-3 w-3" /> {asset.lastModifiedBy}</span>
                          <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(asset.lastModified), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {asset.previousState && (
                        <Badge variant="outline" className="h-8 px-3 rounded-xl font-black uppercase text-[8px] tracking-widest border-orange-200 bg-orange-50 text-orange-600 gap-1.5">
                          <RotateCcw className="h-2.5 w-2.5" /> Revert Pulse Available
                        </Badge>
                      )}
                      <div className="px-4 py-2 rounded-xl bg-muted/50 border border-border/40 text-[10px] font-black uppercase tracking-widest">
                        Registry Update
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/5 hover:text-primary">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="py-32 text-center opacity-30">
              <History className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Ledger Pulse Silent</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
