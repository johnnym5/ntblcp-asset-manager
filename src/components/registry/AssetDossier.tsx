'use client';

/**
 * @fileOverview AssetDossier - The High-Fidelity Technical Registry Node.
 * Phase 1200: Simplified naming scheme (Asset Details) and production hardening.
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
  Columns,
  LayoutGrid,
  Eye,
  ClipboardCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';
import { AssetChecklist } from '@/components/asset-checklist';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppState } from '@/contexts/app-state-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const DetailField = ({ 
  headerId, 
  label, 
  value, 
  icon: Icon, 
  isSyncing, 
  isEditing,
  onToggleFlag 
}: { 
  headerId: string,
  label: string, 
  value: string, 
  icon?: any, 
  isSyncing?: boolean,
  isEditing?: boolean,
  onToggleFlag?: (flag: 'table' | 'quickView' | 'inChecklist') => void
}) => {
  const { headers } = useAppState();
  const header = headers.find(h => h.id === headerId);

  return (
    <div className={cn(
      "p-3.5 flex flex-col gap-1 relative transition-all group/field border-b border-border/40 last:border-0",
      isEditing ? "bg-primary/[0.03] border-primary/10" : "hover:bg-primary/[0.01]"
    )}>
      {isEditing && header && (
        <div className="flex items-center gap-4 mb-3 animate-in slide-in-from-top-1 duration-300">
          <TooltipProvider>
            <div className="flex items-center gap-3 bg-background/80 backdrop-blur-md p-1.5 px-3 rounded-lg border border-primary/20 shadow-sm">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Checkbox checked={header.table} onCheckedChange={() => onToggleFlag?.('table')} className="h-3.5 w-3.5 rounded-sm" />
                    <LayoutGrid className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-[8px] font-black uppercase">Table Visibility</TooltipContent>
              </Tooltip>
              <div className="w-px h-3 bg-border" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Checkbox checked={header.quickView} onCheckedChange={() => onToggleFlag?.('quickView')} className="h-3.5 w-3.5 rounded-sm" />
                    <Eye className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-[8px] font-black uppercase">Card Focus</TooltipContent>
              </Tooltip>
              <div className="w-px h-3 bg-border" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Checkbox checked={header.inChecklist} onCheckedChange={() => onToggleFlag?.('inChecklist')} className="h-3.5 w-3.5 rounded-sm" />
                    <ClipboardCheck className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-[8px] font-black uppercase">Fidelity Check</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      )}

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
};

export function AssetDossier({ 
  record, 
  onEdit, 
  className,
  isHeaderEditingMode 
}: { 
  record: AssetRecord, 
  onEdit?: (id: string) => void, 
  className?: string,
  isHeaderEditingMode?: boolean
}) {
  const { headers, setHeaders } = useAppState();
  const syncStatus = (record.rawRow as any).syncStatus || 'local';
  const hasPhoto = !!(record.rawRow.photoUrl || record.rawRow.photoDataUri);
  const hasSignature = !!(record.rawRow.signatureUrl || record.rawRow.signatureDataUri);

  const handleToggleHeaderFlag = (headerId: string, flag: 'table' | 'quickView' | 'inChecklist') => {
    setHeaders(prev => prev.map(h => h.id === headerId ? { ...h, [flag]: !h[flag] } : h));
  };

  const visibleFields = isHeaderEditingMode 
    ? record.fields 
    : record.fields.filter(f => {
        const header = headers.find(h => h.id === f.headerId);
        return header?.quickView;
      });

  return (
    <div className={cn(
      "flex flex-col lg:flex-row min-h-0 overflow-hidden bg-muted/5 rounded-2xl border border-border/40 animate-in fade-in slide-in-from-top-2 duration-500", 
      className
    )}>
      {/* 1. Main Data Core */}
      <div className="flex-1 flex flex-col bg-background border-r border-border/40 min-h-0 overflow-hidden relative">
        <div className="flex flex-col">
          {/* Visual Evidence */}
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

          {/* Technical Data Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {visibleFields.map((field) => {
              const header = headers.find(h => h.id === field.headerId);
              if (!header) return null;
              return (
                <DetailField 
                  key={field.headerId} 
                  headerId={header.id}
                  label={header.displayName} 
                  value={field.displayValue} 
                  isSyncing={syncStatus === 'local'}
                  isEditing={isHeaderEditingMode}
                  onToggleFlag={(flag) => handleToggleHeaderFlag(header.id, flag)}
                />
              );
            })}
          </div>

          {/* Extended Metadata */}
          <div className="p-5 space-y-4 bg-muted/5 border-t border-border/40">
            <div className="flex items-center gap-2.5 opacity-40">
              <ListTree className="h-3.5 w-3.5 text-primary" />
              <h4 className="text-[9px] font-black uppercase tracking-[0.3em]">Metadata Store</h4>
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

      {/* 2. Audit & Forensic Context */}
      <div className="w-full lg:w-[280px] bg-card/30 flex flex-col shrink-0 border-t lg:border-t-0 border-border/40 min-h-0 overflow-hidden relative backdrop-blur-3xl">
        <div className="p-5 space-y-8">
          
          {/* Fidelity Audit Workspace */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.15em]">Fidelity Check</h4>
              </div>
              <Badge variant="outline" className="h-4 px-1.5 border-primary/20 text-primary text-[7px] font-black uppercase">LIVE</Badge>
            </div>
            <AssetChecklist values={record.rawRow as any} />
          </div>

          {/* Forensic Signature */}
          {hasSignature && (
            <div className="space-y-3">
              <h4 className="text-[8px] font-black uppercase tracking-[0.25em] text-muted-foreground opacity-40 px-1 flex items-center gap-2">
                <PenTool className="h-3 w-3" /> Custodian Signature
              </h4>
              <div className="p-3 rounded-xl bg-white border border-border/40 flex items-center justify-center min-h-[70px] shadow-inner">
                <Image 
                  src={(record.rawRow.signatureUrl || record.rawRow.signatureDataUri) as string} 
                  alt="Asset Signature"
                  width={180}
                  height={50}
                  className="mix-blend-multiply opacity-80"
                  unoptimized
                />
              </div>
            </div>
          )}

          {/* History Context */}
          <div className="p-4 rounded-xl bg-background border border-border/60 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 opacity-40">
              <History className="h-3 w-3" />
              <span className="text-[8px] font-black uppercase tracking-widest">Traceability</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[8px] uppercase font-black">
                <span className="text-muted-foreground opacity-60">Source Folder</span>
                <span className="text-foreground truncate max-w-[100px]">{record.sourceSheet || 'MANUAL'}</span>
              </div>
              <div className="flex justify-between items-center text-[8px] uppercase font-black">
                <span className="text-muted-foreground opacity-60">Position</span>
                <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">ROW #{record.sourceRow || 'N/A'}</span>
              </div>
            </div>
          </div>

          {onEdit && (
            <Button 
              onClick={(e) => { e.stopPropagation(); onEdit(record.id); }} 
              className="w-full h-10 rounded-xl font-black uppercase text-[9px] tracking-[0.2em] shadow-xl shadow-primary/20 bg-primary text-black gap-2 transition-transform active:scale-95"
            >
              <Edit3 className="h-3.5 w-3.5" /> Modify Record
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
