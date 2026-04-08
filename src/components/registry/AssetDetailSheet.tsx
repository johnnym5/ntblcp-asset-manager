'use client';

/**
 * @fileOverview AssetDetailSheet - High-Fidelity Concise Workstation.
 * Phase 1201: Enhanced with visible vertical scrollbars for better navigation.
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, 
  ChevronRight, 
  Edit3, 
  Database,
  ShieldCheck,
  ClipboardCheck,
  History,
  Lock,
  ListTree,
  Tag
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

const FullViewField = ({ label, value, isLast }: { label: string, value: string, isLast?: boolean }) => (
  <div className={cn(
    "p-3.5 flex flex-col gap-1 relative transition-colors hover:bg-white/[0.03] group/field",
    !isLast && "border-b border-white/5"
  )}>
    <span className="text-[8px] font-black uppercase tracking-[0.25em] text-white/20 group-hover/field:text-primary transition-colors leading-none">
      {label}
    </span>
    <p className="text-[11px] font-black uppercase tracking-tight text-white/80 leading-tight break-words">
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
      <DialogContent className="max-w-[1100px] w-[95vw] h-[85vh] p-0 overflow-hidden bg-black text-white border-white/10 rounded-[2rem] shadow-3xl">
        <motion.div 
          className="flex flex-col h-full"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {/* Header Pulse */}
          <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-xl shadow-inner hidden sm:block">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-lg font-black uppercase tracking-tight text-white leading-none">
                  Asset Profile
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <DialogDescription className="text-[8px] font-bold uppercase text-primary tracking-[0.3em]">
                    Dossier Analysis
                  </DialogDescription>
                  <div className="h-1 w-1 rounded-full bg-white/10" />
                  <span className="text-[8px] font-mono font-bold text-white/20 uppercase truncate">ID: {record.id.split('-')[0]}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white/5 rounded-xl p-0.5 border border-white/5">
                <Button variant="ghost" size="icon" onClick={onPrevious} disabled={!onPrevious} className="h-8 w-8 rounded-lg hover:bg-white/10 text-white/40"><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={onNext} disabled={!onNext} className="h-8 w-8 rounded-lg hover:bg-white/10 text-white/40"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-black border-r border-white/5 min-h-0 overflow-hidden relative">
              <div className="px-6 py-3 shrink-0 flex items-center justify-between bg-white/[0.01] border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="h-6 px-3 text-[8px] font-black uppercase tracking-widest rounded-full border-2 bg-white/5" style={{ color: record.accentColor, borderColor: `${record.accentColor}40` }}>
                    <Database className="h-3 w-3 mr-1.5" /> {record.sourceSheet || 'REGISTRY'}
                  </Badge>
                </div>
                {isManagementMode && !isAdmin && (
                  <Badge className="bg-white/5 text-white/20 border-white/10 h-6 px-2.5 rounded-full font-black uppercase text-[7px] tracking-widest gap-1.5">
                    <Lock className="h-2.5 w-2.5" /> Locked
                  </Badge>
                )}
              </div>

              <ScrollArea className="flex-1 custom-scrollbar">
                <div className="flex flex-col">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-b border-white/5 bg-black">
                    {record.fields
                      .filter(f => {
                        const h = record.headers.find(header => header.id === f.headerId);
                        const isVerificationField = h ? VERIFICATION_KEYS.includes(h.normalizedName) : false;
                        if (isManagementMode && !isAdmin && isVerificationField) return false;
                        return true;
                      })
                      .map((field) => {
                        const header = record.headers.find(h => h.id === field.headerId);
                        return (
                          <FullViewField 
                            key={field.headerId} 
                            label={header?.displayName || 'Parameter'} 
                            value={field.displayValue} 
                          />
                        );
                      })}
                  </div>

                  {metadataEntries.length > 0 && (
                    <div className="p-6 space-y-4 bg-white/[0.01]">
                      <div className="flex items-center gap-2.5 opacity-40">
                        <ListTree className="h-3.5 w-3.5" />
                        <h4 className="text-[9px] font-black uppercase tracking-[0.25em]">Extended Attributes</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                        {metadataEntries.map(([key, value]) => (
                          <div key={key} className="space-y-1 group/meta">
                            <p className="text-[7px] font-black uppercase tracking-[0.2em] text-white/20 group-hover/meta:text-primary transition-colors">{key}</p>
                            <p className="text-[10px] font-bold text-white/60 leading-tight break-words">{String(value || '---')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="h-20 shrink-0" />
                </div>
                <ScrollBar orientation="vertical" className="bg-white/5" />
              </ScrollArea>
            </div>

            {/* Sidebar Pane */}
            <div className="w-full md:w-[300px] lg:w-[340px] bg-[#050505] flex flex-col shrink-0 border-t md:border-t-0 border-white/5 min-h-0 overflow-hidden shadow-2xl relative">
              <ScrollArea className="flex-1 custom-scrollbar">
                <div className="p-6 space-y-10 pb-20">
                  <div className="flex items-center gap-3 text-primary">
                    <div className="p-1.5 bg-primary/10 rounded-lg"><ClipboardCheck className="h-4 w-4" /></div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest">Quality Audit</h4>
                  </div>
                  
                  <AssetChecklist values={record.rawRow as any} />
                  
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 space-y-5">
                    <div className="flex items-center gap-2 opacity-40">
                      <History className="h-3 w-3" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Tracking Pulse</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[8px] uppercase">
                        <span className="text-white/20">Source</span>
                        <span className="text-white/60 font-bold truncate max-w-[120px]">{record.sourceSheet || 'MANUAL'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[8px] uppercase">
                        <span className="text-white/20">Positional Anchor</span>
                        <span className="text-white/60 font-bold">ROW #{record.sourceRow || 'MAN'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[8px] uppercase">
                        <span className="text-white/20">Last Sync</span>
                        <span className="text-white/60 font-bold">{record.rawRow.lastModified ? new Date(record.rawRow.lastModified as string).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <ScrollBar orientation="vertical" className="bg-white/5" />
              </ScrollArea>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-5 sm:p-6 bg-black border-t border-white/5 flex flex-row items-center gap-3 shrink-0 pb-safe shadow-3xl">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-12 font-black uppercase text-[9px] tracking-widest rounded-xl bg-white/5 text-white/40 hover:text-white transition-all">
              Dismiss
            </Button>
            <Button onClick={() => onEdit(record.id)} className="flex-[2] h-12 rounded-xl font-black uppercase text-[9px] tracking-[0.2em] shadow-2xl bg-primary text-black gap-2.5 transition-transform active:scale-95">
              <Edit3 className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Initialize Edit Pulse</span>
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
