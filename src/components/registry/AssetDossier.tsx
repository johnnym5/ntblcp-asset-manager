'use client';

/**
 * @fileOverview AssetDossier - The High-Fidelity Technical Registry Node.
 * Extracted from the pop-up logic to provide a reusable, expanding inline dossier.
 * Phase 605: Implemented responsive dual-pane layout for inline workstation pulses.
 */

import React from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  Tag, 
  Camera, 
  PenTool, 
  History, 
  Clock, 
  Globe, 
  CloudOff,
  ListTree,
  Edit3,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';
import { AssetChecklist } from '@/components/asset-checklist';
import { Button } from '@/components/ui/button';

const DossierField = ({ label, value, icon: Icon, isSyncing }: { label: string, value: string, icon?: any, isSyncing?: boolean }) => (
  <div className="p-3 flex flex-col gap-1 relative transition-all hover:bg-primary/[0.02] group/field border-b border-border/40 last:border-0">
    <div className="flex items-center justify-between">
      <span className="text-[7px] font-black uppercase tracking-[0.25em] text-muted-foreground opacity-40 group-hover/field:text-primary transition-colors">
        {label}
      </span>
      {isSyncing && <div className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />}
    </div>
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-3 w-3 text-muted-foreground/20 group-hover/field:text-primary/40 transition-colors" />}
      <p className="text-[11px] font-black uppercase tracking-tight text-foreground leading-tight break-words">
        {value || '---'}
      </p>
    </div>
  </div>
);

export function AssetDossier({ 
  record, 
  onEdit, 
  className 
}: { 
  record: AssetRecord, 
  onEdit?: (id: string) => void, 
  className?: string 
}) {
  const syncStatus = (record.rawRow as any).syncStatus || 'local';
  const hasPhoto = !!(record.rawRow.photoUrl || record.rawRow.photoDataUri);
  const hasSignature = !!(record.rawRow.signatureUrl || record.rawRow.signatureDataUri);

  return (
    <div className={cn(
      "flex flex-col lg:flex-row min-h-0 overflow-hidden bg-muted/5 rounded-2xl border border-border/40 animate-in fade-in slide-in-from-top-2 duration-500", 
      className
    )}>
      {/* 1. MAIN TECHNICAL CORE */}
      <div className="flex-1 flex flex-col bg-background border-r border-border/40 min-h-0 overflow-hidden relative">
        <div className="flex flex-col">
          {/* Visual Evidence Pulse */}
          {hasPhoto && (
            <div className="p-4 border-b border-border/40 bg-muted/5 group">
              <div className="relative aspect-video w-full max-w-[400px] mx-auto rounded-xl overflow-hidden border-2 border-border/60 shadow-lg">
                <Image 
                  src={(record.rawRow.photoUrl || record.rawRow.photoDataUri) as string} 
                  alt="Asset Evidence"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <p className="text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Camera className="h-3 w-3" /> Visual Anchor
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Technical Parameters Grid */}
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

          {/* Extended Metadata Pulse */}
          <div className="p-5 space-y-4 bg-muted/5 border-t border-border/40">
            <div className="flex items-center gap-2.5 opacity-40">
              <ListTree className="h-3.5 w-3.5 text-primary" />
              <h4 className="text-[9px] font-black uppercase tracking-[0.3em]">Metadata logic</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              {Object.entries(record.rawRow.metadata || {}).map(([key, value]) => (
                <div key={key} className="space-y-1 group/meta">
                  <p className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 group-hover/meta:text-primary transition-colors">{key}</p>
                  <p className="text-[10px] font-bold text-foreground leading-tight">{String(value || '---')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. AUDIT & FORENSIC SIDEBAR */}
      <div className="w-full lg:w-[280px] bg-card/30 flex flex-col shrink-0 border-t lg:border-t-0 border-border/40 min-h-0 overflow-hidden relative backdrop-blur-3xl">
        <div className="p-5 space-y-8">
          
          {/* Fidelity Audit Workspace */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.15em]">Fidelity Scan</h4>
              </div>
              <Badge variant="outline" className="h-4 px-1.5 border-primary/20 text-primary text-[7px] font-black uppercase">LIVE</Badge>
            </div>
            <AssetChecklist values={record.rawRow as any} />
          </div>

          {/* Forensic Anchor Slot */}
          {hasSignature && (
            <div className="space-y-3">
              <h4 className="text-[8px] font-black uppercase tracking-[0.25em] text-muted-foreground opacity-40 px-1 flex items-center gap-2">
                <PenTool className="h-3 w-3" /> Forensic Signature
              </h4>
              <div className="p-3 rounded-xl bg-white border border-border/40 flex items-center justify-center min-h-[70px] shadow-inner">
                <Image 
                  src={(record.rawRow.signatureUrl || record.rawRow.signatureDataUri) as string} 
                  alt="Custodian Signature"
                  width={180}
                  height={50}
                  className="mix-blend-multiply opacity-80"
                  unoptimized
                />
              </div>
            </div>
          )}

          {/* Positional Registry Anchor */}
          <div className="p-4 rounded-xl bg-background border border-border/60 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 opacity-40">
              <History className="h-3 w-3" />
              <span className="text-[8px] font-black uppercase tracking-widest">History</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[8px] uppercase font-black">
                <span className="text-muted-foreground opacity-60">Folder</span>
                <span className="text-foreground truncate max-w-[100px]">{record.sourceSheet || 'MANUAL'}</span>
              </div>
              <div className="flex justify-between items-center text-[8px] uppercase font-black">
                <span className="text-muted-foreground opacity-60">Positional</span>
                <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">ROW #{record.sourceRow || 'SYS'}</span>
              </div>
            </div>
          </div>

          {onEdit && (
            <Button 
              onClick={(e) => { e.stopPropagation(); onEdit(record.id); }} 
              className="w-full h-10 rounded-xl font-black uppercase text-[9px] tracking-[0.2em] shadow-xl shadow-primary/20 bg-primary text-black gap-2 transition-transform active:scale-95"
            >
              <Edit3 className="h-3.5 w-3.5" /> Modify Pulse
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
