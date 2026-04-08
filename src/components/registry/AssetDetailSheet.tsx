'use client';

/**
 * @fileOverview AssetDetailSheet - High-Fidelity Professional Workstation.
 * Hardened for responsive stacking and dual-pane vertical scrollbars.
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
    "p-5 flex flex-col gap-1.5 relative transition-colors hover:bg-foreground/[0.03] group/field",
    !isLast && "border-b border-border/40"
  )}>
    <span className="text-[8px] font-black uppercase tracking-[0.25em] text-muted-foreground opacity-40 group-hover/field:text-primary group-hover/field:opacity-100 transition-all leading-none">
      {label}
    </span>
    <p className="text-[13px] font-black uppercase tracking-tight text-foreground leading-tight break-words">
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
      <DialogContent className="max-w-[1200px] w-full h-[100dvh] sm:h-[85vh] sm:w-[95vw] p-0 overflow-hidden bg-background text-foreground border-border sm:rounded-[2.5rem] shadow-3xl">
        <motion.div 
          className="flex flex-col h-full"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {/* Header Pulse */}
          <div className="p-6 sm:p-8 border-b border-border flex items-center justify-between bg-muted/10 shrink-0">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-primary/10 rounded-2xl shadow-inner hidden sm:block">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl sm:text-3xl font-black uppercase tracking-tight text-foreground leading-none">
                  Asset Profile
                </DialogTitle>
                <div className="flex items-center gap-3">
                  <DialogDescription className="text-[9px] font-black uppercase text-primary tracking-[0.3em]">
                    Dossier Analysis
                  </DialogDescription>
                  <div className="h-1 w-1 rounded-full bg-border" />
                  <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase truncate hidden sm:inline">UUID: {record.id.split('-')[0]}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-muted/50 rounded-2xl p-1 border border-border shadow-inner">
                <Button variant="ghost" size="icon" onClick={onPrevious} disabled={!onPrevious} className="h-10 w-10 rounded-xl hover:bg-background text-muted-foreground hover:text-primary"><ChevronLeft className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" onClick={onNext} disabled={!onNext} className="h-10 w-10 rounded-xl hover:bg-background text-muted-foreground hover:text-primary"><ChevronRight className="h-5 w-5" /></Button>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-background border-r border-border min-h-0 overflow-hidden relative">
              <div className="px-8 py-4 shrink-0 flex items-center justify-between bg-muted/5 border-b border-border">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="h-7 px-4 text-[9px] font-black uppercase tracking-widest rounded-full border-2 bg-card" style={{ color: record.accentColor, borderColor: `${record.accentColor}40` }}>
                    <Database className="h-3.5 w-3.5 mr-2" /> {record.sourceSheet || 'REGISTRY'}
                  </Badge>
                </div>
                {isManagementMode && !isAdmin && (
                  <Badge className="bg-muted text-muted-foreground border-border h-7 px-3 rounded-full font-black uppercase text-[8px] tracking-widest gap-2">
                    <Lock className="h-3 w-3" /> System Locked
                  </Badge>
                )}
              </div>

              {/* dossier Scroll Surface */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex flex-col">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-b border-border/40">
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
                            label={header?.displayName || 'Technical Parameter'} 
                            value={field.displayValue} 
                          />
                        );
                      })}
                  </div>

                  {metadataEntries.length > 0 && (
                    <div className="p-8 space-y-6 bg-muted/5">
                      <div className="flex items-center gap-3 opacity-40">
                        <ListTree className="h-4 w-4" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">Extended Data Pulse</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-6">
                        {metadataEntries.map(([key, value]) => (
                          <div key={key} className="space-y-1.5 group/meta">
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 group-hover/meta:text-primary transition-colors">{key}</p>
                            <p className="text-[11px] font-bold text-foreground leading-tight break-words">{String(value || '---')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="h-32 shrink-0" />
                </div>
              </div>
            </div>

            {/* Sidebar Pane */}
            <div className="w-full md:w-[320px] lg:w-[380px] bg-card/30 flex flex-col shrink-0 border-t md:border-t-0 border-border min-h-0 overflow-hidden relative shadow-2xl">
              {/* Sidebar Scroll Surface */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-8 space-y-12 pb-24">
                  <div className="flex items-center gap-4 text-primary">
                    <div className="p-2 bg-primary/10 rounded-xl shadow-inner"><ClipboardCheck className="h-5 w-5" /></div>
                    <h4 className="text-xs font-black uppercase tracking-[0.2em]">Fidelity Audit</h4>
                  </div>
                  
                  <AssetChecklist values={record.rawRow as any} />
                  
                  <div className="p-6 rounded-3xl bg-muted/20 border-2 border-dashed border-border space-y-6">
                    <div className="flex items-center gap-3 opacity-40">
                      <History className="h-4 w-4" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Historical Anchor</span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-[9px] uppercase font-black">
                        <span className="text-muted-foreground opacity-60">Source</span>
                        <span className="text-foreground truncate max-w-[140px]">{record.sourceSheet || 'MANUAL'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] uppercase font-black">
                        <span className="text-muted-foreground opacity-60">Positional Anchor</span>
                        <span className="text-primary bg-primary/5 px-2 py-0.5 rounded-lg">ROW #{record.sourceRow || 'MAN'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] uppercase font-black">
                        <span className="text-muted-foreground opacity-60">Registry Sync</span>
                        <span className="text-foreground">{record.rawRow.lastModified ? new Date(record.rawRow.lastModified as string).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 sm:p-10 bg-background border-t border-border flex flex-row items-center gap-4 shrink-0 pb-safe shadow-3xl">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-14 font-black uppercase text-[10px] tracking-widest rounded-2xl bg-muted/20 text-muted-foreground hover:text-foreground transition-all">
              Dismiss Pulse
            </Button>
            <Button onClick={() => onEdit(record.id)} className="flex-[2] h-14 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-primary/30 bg-primary text-black gap-3 transition-transform active:scale-95">
              <Edit3 className="h-4 w-4" /> <span className="hidden xs:inline">Initialize Modification Pulse</span>
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}