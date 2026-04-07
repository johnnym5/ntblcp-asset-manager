'use client';

/**
 * @fileOverview AssetDetailSheet - High-Fidelity "Full View" Workstation.
 * Phase 412: Removed redundant manual close button.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, 
  ChevronRight, 
  Edit3, 
  Database,
  X,
  ShieldCheck,
  ClipboardCheck,
  History,
  Lock,
  Search,
  ListTree
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';
import { AssetChecklist } from '@/components/asset-checklist';
import { motion } from 'framer-motion';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';

interface AssetDetailSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  record?: AssetRecord;
  onEdit: (id: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

const FullViewField = ({ label, value, isLast, accentColor }: { label: string, value: string, isLast?: boolean, accentColor?: string }) => (
  <div className={cn(
    "p-5 flex flex-col gap-1.5 relative transition-colors hover:bg-white/[0.03] group/field",
    !isLast && "border-b border-white/5"
  )}>
    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/20 group-hover/field:text-primary transition-colors leading-none">
      {label}
    </span>
    <p className="text-sm font-black uppercase tracking-tight text-white/80 leading-tight break-words">
      {value || '---'}
    </p>
  </div>
);

export function AssetDetailSheet({ isOpen, onOpenChange, record, onEdit, onNext, onPrevious }: AssetDetailSheetProps) {
  const { appSettings } = useAppState();
  const { userProfile } = useAuth();

  if (!record) return null;

  const isManagementMode = appSettings?.appMode === 'management';
  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const VERIFICATION_KEYS = ['condition', 'remarks', 'status', 'verified_status'];

  const primaryFieldKeys = new Set(record.headers.map(h => h.rawName));
  const metadataEntries = Object.entries(record.rawRow.metadata || {})
    .filter(([key]) => !primaryFieldKeys.has(key));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1300px] w-full h-[100dvh] sm:h-[90vh] p-0 overflow-hidden bg-black text-white border-none sm:border-white/10 rounded-none sm:rounded-[2.5rem] shadow-3xl">
        <motion.div 
          className="flex flex-col h-full"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {/* Header Pulse */}
          <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-primary/10 rounded-xl shadow-inner hidden sm:block">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-xl md:text-2xl font-black uppercase tracking-tight text-white leading-none">
                  Registry Profile
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1.5">
                  <DialogDescription className="text-[9px] font-bold uppercase text-primary tracking-[0.3em]">
                    Fidelity Analysis
                  </DialogDescription>
                  <div className="h-1 w-1 rounded-full bg-white/10" />
                  <span className="text-[9px] font-mono font-bold text-white/20 uppercase truncate max-w-[120px]">UUID: {record.id}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center bg-white/5 rounded-2xl p-1 border border-white/5 shadow-xl">
                <Button variant="ghost" size="icon" onClick={onPrevious} disabled={!onPrevious} className="h-10 w-10 rounded-xl hover:bg-white/10 text-white/40"><ChevronLeft className="h-5 w-5" /></Button>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <Button variant="ghost" size="icon" onClick={onNext} disabled={!onNext} className="h-10 w-10 rounded-xl hover:bg-white/10 text-white/40"><ChevronRight className="h-5 w-5" /></Button>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
            <div className="flex-1 flex flex-col bg-black border-r border-white/5 min-h-0 overflow-hidden">
              <div className="px-8 py-5 shrink-0 flex items-center justify-between bg-white/[0.01] border-b border-white/5">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="h-7 px-4 text-[9px] font-black uppercase tracking-widest rounded-full border-2 bg-white/5" style={{ color: record.accentColor, borderColor: `${record.accentColor}40` }}>
                    <Database className="h-3 w-3 mr-2" /> {record.sourceSheet || 'REGISTRY'}
                  </Badge>
                </div>
                {isManagementMode && !isAdmin && (
                  <Badge className="bg-white/5 text-white/20 border-white/10 h-7 px-3 rounded-full font-black uppercase text-[8px] tracking-widest gap-2">
                    <Lock className="h-2.5 w-2.5" /> Management Lock Active
                  </Badge>
                )}
              </div>

              <ScrollArea className="flex-1 custom-scrollbar">
                <div className="flex flex-col">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-b border-white/5">
                    {record.fields
                      .filter(f => {
                        const h = record.headers.find(header => header.id === f.headerId);
                        const isVerificationField = h ? VERIFICATION_KEYS.includes(h.normalizedName) : false;
                        if (isManagementMode && !isAdmin && isVerificationField) return false;
                        return true;
                      })
                      .map((field, idx) => {
                        const header = record.headers.find(h => h.id === field.headerId);
                        return (
                          <FullViewField 
                            key={field.headerId} 
                            label={header?.displayName || 'Parameter'} 
                            value={field.displayValue} 
                            isLast={false}
                          />
                        );
                      })}
                  </div>

                  {metadataEntries.length > 0 && (
                    <div className="p-8 space-y-6 bg-white/[0.01]">
                      <div className="flex items-center gap-3 opacity-40">
                        <ListTree className="h-4 w-4" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">Extended Technical Metadata</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                        {metadataEntries.map(([key, value]) => (
                          <div key={key} className="space-y-1.5 group/meta">
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 group-hover/meta:text-primary transition-colors">{key}</p>
                            <p className="text-xs font-bold text-white/60 leading-tight break-words">{String(value || '---')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="h-40 shrink-0" />
                </div>
              </ScrollArea>
            </div>

            <div className="w-full md:w-[340px] lg:w-[400px] bg-[#050505] flex flex-col shrink-0 border-t md:border-t-0 border-white/5 min-h-0 overflow-hidden shadow-2xl">
              <ScrollArea className="flex-1">
                <div className="p-8 space-y-12 pb-32">
                  <div className="flex items-center gap-4 text-primary">
                    <div className="p-2 bg-primary/10 rounded-xl"><ClipboardCheck className="h-5 w-5" /></div>
                    <h4 className="text-xs font-black uppercase tracking-widest">Integrity Pulse</h4>
                  </div>
                  <AssetChecklist values={record.rawRow as any} />
                  <div className="p-6 rounded-[2rem] bg-white/[0.02] border-2 border-dashed border-white/10 space-y-6">
                    <div className="flex items-center gap-2 opacity-40">
                      <History className="h-3.5 w-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Dossier Metadata</span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-[9px] uppercase">
                        <span className="text-white/20">Extraction Source</span>
                        <span className="text-white/60 font-bold truncate max-w-[160px] text-right">{record.sourceSheet || 'MANUAL'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] uppercase">
                        <span className="text-white/20">Positional Anchor</span>
                        <span className="text-white/60 font-bold">ROW #{record.sourceRow || 'MAN'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] uppercase">
                        <span className="text-white/20">Audit Timestamp</span>
                        <span className="text-white/60 font-bold">{record.rawRow.lastModified ? new Date(record.rawRow.lastModified as string).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="p-6 md:p-8 bg-black border-t border-white/5 flex flex-row items-center gap-4 shrink-0 pb-safe shadow-3xl">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-14 font-black uppercase text-[10px] tracking-widest rounded-2xl bg-white/5 text-white/40 hover:text-white transition-all">
              Dismiss Pulse
            </Button>
            <Button onClick={() => onEdit(record.id)} className="flex-[2] h-14 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl bg-primary text-black gap-3 transition-transform active:scale-95">
              <Edit3 className="h-4 w-4" /> <span className="hidden xs:inline">Initialize Modification Pulse</span>
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
