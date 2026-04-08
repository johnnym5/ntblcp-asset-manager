'use client';

/**
 * @fileOverview AssetDetailSheet - Professional Audit Dossier.
 * Completely restructured for high-fidelity data visualization.
 * Phase 501: Enhanced compactness and implemented visible custom scrollbars.
 */

import React from 'react';
import Image from 'next/image';
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
  Tag,
  Camera,
  PenTool,
  MapPin,
  Clock,
  ExternalLink,
  Globe,
  CloudOff,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';
import { AssetChecklist } from '@/components/asset-checklist';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface AssetDetailSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  record?: AssetRecord;
  onEdit: (id: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

const DossierField = ({ label, value, icon: Icon, isSyncing }: { label: string, value: string, icon?: any, isSyncing?: boolean }) => (
  <div className="p-3.5 flex flex-col gap-1 relative transition-all hover:bg-primary/[0.02] group/field border-b border-border/40 last:border-0">
    <div className="flex items-center justify-between">
      <span className="text-[8px] font-black uppercase tracking-[0.25em] text-muted-foreground opacity-40 group-hover/field:text-primary transition-colors">
        {label}
      </span>
      {isSyncing && <div className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />}
    </div>
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-3 w-3 text-muted-foreground/20 group-hover/field:text-primary/40 transition-colors" />}
      <p className="text-xs font-black uppercase tracking-tight text-foreground leading-tight break-words">
        {value || '---'}
      </p>
    </div>
  </div>
);

export function AssetDetailSheet({ isOpen, onOpenChange, record, onEdit, onNext, onPrevious }: AssetDetailSheetProps) {
  const { appSettings } = useAppState();
  const { userProfile } = useAuth();

  if (!record) return null;

  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const syncStatus = (record.rawRow as any).syncStatus || 'local';
  
  // Photo & Signature Logic
  const hasPhoto = !!(record.rawRow.photoUrl || record.rawRow.photoDataUri);
  const hasSignature = !!(record.rawRow.signatureUrl || record.rawRow.signatureDataUri);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] w-full h-[100dvh] sm:h-[85vh] sm:w-[95vw] p-0 overflow-hidden bg-background text-foreground border-border sm:rounded-[2.5rem] shadow-3xl">
        <div className="flex flex-col h-full">
          
          {/* 1. DOSSIER HEADER - Compacted */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/10 shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-primary/10 rounded-xl shadow-inner hidden sm:block">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-0.5">
                <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-foreground leading-none">
                  Asset Dossier
                </DialogTitle>
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary text-black font-black uppercase text-[8px] h-5 px-2 rounded-full">
                    {record.sourceSheet || 'REGISTRY PULSE'}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-muted-foreground uppercase opacity-40">
                    <Tag className="h-3 w-3" /> ID: {record.id.split('-')[0]}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={cn(
                "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all",
                syncStatus === 'synced' ? "bg-green-500/5 border-green-500/20 text-green-600" : "bg-blue-500/5 border-blue-500/20 text-blue-600"
              )}>
                {syncStatus === 'synced' ? <Globe className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
                <span className="text-[9px] font-black uppercase tracking-widest">{syncStatus === 'synced' ? 'Synchronized' : 'Local Pulse'}</span>
              </div>
              <div className="flex items-center bg-muted/50 rounded-xl p-1 border border-border shadow-inner">
                <Button variant="ghost" size="icon" onClick={onPrevious} disabled={!onPrevious} className="h-8 w-8 rounded-lg hover:bg-background"><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={onNext} disabled={!onNext} className="h-8 w-8 rounded-lg hover:bg-background"><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
            
            {/* 2. MAIN TECHNICAL CORE - Visible Scrollbar */}
            <div className="flex-1 flex flex-col bg-background border-r border-border min-h-0 overflow-hidden relative shadow-inner">
              <ScrollArea className="flex-1 custom-scrollbar">
                <div className="flex flex-col">
                  {/* Visual Evidence Pulse */}
                  {hasPhoto && (
                    <div className="p-6 border-b border-border/40 bg-muted/5 group cursor-zoom-in">
                      <div className="relative aspect-video w-full max-w-[600px] mx-auto rounded-[1.5rem] overflow-hidden border-2 border-border/60 shadow-xl">
                        <Image 
                          src={(record.rawRow.photoUrl || record.rawRow.photoDataUri) as string} 
                          alt="Asset Evidence"
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                          <p className="text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <Camera className="h-3.5 w-3.5" /> Visual Evidence
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Technical Parameters Grid - Compacted */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {record.fields.map((field) => {
                      const header = record.headers.find(h => h.id === field.headerId);
                      return (
                        <DossierField 
                          key={field.headerId} 
                          label={header?.displayName || 'Param'} 
                          value={field.displayValue} 
                          isSyncing={syncStatus === 'local'}
                        />
                      );
                    })}
                  </div>

                  {/* Extended Metadata Pulse - Compacted */}
                  <div className="p-6 space-y-6 bg-muted/5">
                    <div className="flex items-center gap-3 opacity-40">
                      <ListTree className="h-4 w-4 text-primary" />
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">Metadata Logic</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                      {Object.entries(record.rawRow.metadata || {}).map(([key, value]) => (
                        <div key={key} className="space-y-1 group/meta">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 group-hover/meta:text-primary transition-colors">{key}</p>
                          <p className="text-[11px] font-bold text-foreground leading-tight">{String(value || '---')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-24 shrink-0" />
                </div>
              </ScrollArea>
            </div>

            {/* 3. AUDIT & FORENSIC SIDEBAR - Visible Scrollbar */}
            <div className="w-full md:w-[320px] lg:w-[380px] bg-card/30 flex flex-col shrink-0 border-t md:border-t-0 border-border min-h-0 overflow-hidden relative shadow-2xl backdrop-blur-3xl">
              <ScrollArea className="flex-1 custom-scrollbar">
                <div className="p-6 space-y-10 pb-32">
                  
                  {/* Fidelity Audit Workspace - Compacted */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-primary/10 rounded-lg"><ClipboardCheck className="h-4 w-4 text-primary" /></div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.15em]">Fidelity Scan</h4>
                      </div>
                      <Badge variant="outline" className="h-4 px-1.5 border-primary/20 text-primary text-[7px] font-black uppercase">LIVE</Badge>
                    </div>
                    <AssetChecklist values={record.rawRow as any} />
                  </div>

                  {/* Forensic Anchor Slot */}
                  {hasSignature && (
                    <div className="space-y-3">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground opacity-40 px-1 flex items-center gap-2">
                        <PenTool className="h-3 w-3" /> Forensic Signature
                      </h4>
                      <div className="p-4 rounded-[1.5rem] bg-white border-2 border-dashed border-border flex items-center justify-center min-h-[100px] shadow-inner">
                        <Image 
                          src={(record.rawRow.signatureUrl || record.rawRow.signatureDataUri) as string} 
                          alt="Custodian Pulse"
                          width={240}
                          height={80}
                          className="mix-blend-multiply opacity-80"
                          unoptimized
                        />
                      </div>
                    </div>
                  )}

                  {/* Positional Registry Anchor - Compacted */}
                  <div className="p-6 rounded-[2rem] bg-background border-2 border-border/60 space-y-6 shadow-lg">
                    <div className="flex items-center gap-2.5 opacity-40">
                      <History className="h-3.5 w-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Historical State</span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-[9px] uppercase font-black">
                        <span className="text-muted-foreground opacity-60">Source Folder</span>
                        <span className="text-foreground truncate max-w-[140px]">{record.sourceSheet || 'MANUAL'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] uppercase font-black">
                        <span className="text-muted-foreground opacity-60">Index Pulse</span>
                        <span className="text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">ROW #{record.sourceRow || 'SYS'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] uppercase font-black">
                        <span className="text-muted-foreground opacity-60">Last Auditor</span>
                        <span className="text-foreground truncate max-w-[140px]">{String(record.rawRow.lastModifiedBy || 'SYSTEM')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* 4. FOOTER PULSE ACTIONS - Compacted */}
          <div className="px-6 py-4 bg-background border-t border-border flex flex-row items-center gap-4 shrink-0 pb-safe shadow-3xl z-50">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)} 
              className="flex-1 h-12 font-black uppercase text-[10px] tracking-widest rounded-xl bg-muted/20 text-muted-foreground hover:text-foreground transition-all border-2 border-transparent hover:border-border"
            >
              Dismiss
            </Button>
            <Button 
              onClick={() => onEdit(record.id)} 
              className="flex-[2] h-12 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/30 bg-primary text-black gap-3 transition-transform hover:scale-[1.02] active:scale-95"
            >
              <Edit3 className="h-4 w-4" /> Modification Pulse
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
