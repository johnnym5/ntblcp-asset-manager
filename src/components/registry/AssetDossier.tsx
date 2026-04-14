'use client';

/**
 * @fileOverview Asset Profile - Detailed Technical View.
 * Optimized for Mobile Responsiveness & Stacked Layout Pulse.
 * Phase 1515: Isolated Full Profile Setup mode from Quick View card editing.
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Database,
  Save,
  Trash2,
  Wrench,
  X,
  PlusCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetRecord, RegistryHeader } from '@/types/registry';
import { AssetChecklist } from '@/components/asset-checklist';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ASSET_CONDITIONS } from '@/lib/constants';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DetailField = ({ 
  headerId, 
  label, 
  value, 
  isEditing,
  onToggleFlag,
  onRename
}: { 
  headerId: string,
  label: string, 
  value: string, 
  isEditing?: boolean,
  onToggleFlag?: (flag: 'table' | 'quickView' | 'inChecklist') => void,
  onRename?: (newName: string) => void
}) => {
  const { headers } = useAppState();
  const header = headers.find(h => h.id === headerId);
  const [localLabel, setLocalLabel] = useState(label);
  const hasLabelChanges = localLabel !== label;

  useEffect(() => {
    setLocalLabel(label);
  }, [label]);

  return (
    <div className={cn(
      "p-4 flex flex-col gap-1 transition-all border-b border-border/40 last:border-0",
      isEditing ? "bg-primary/[0.03] border-primary/10" : "hover:bg-primary/[0.01]"
    )}>
      {isEditing && header && (
        <div className="flex items-center justify-between mb-2 animate-in slide-in-from-top-1 duration-300">
          <div className="flex items-center gap-2 bg-background/80 backdrop-blur-md p-1 px-2 rounded-lg border border-primary/20 shadow-sm">
            <Tooltip><TooltipTrigger asChild><Checkbox checked={header.table} onCheckedChange={() => onToggleFlag?.('table')} className="h-4 w-4" /></TooltipTrigger><TooltipContent className="text-[8px] font-black uppercase">List View</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Checkbox checked={header.quickView} onCheckedChange={() => onToggleFlag?.('quickView')} className="h-4 w-4" /></TooltipTrigger><TooltipContent className="text-[8px] font-black uppercase">Card View</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Checkbox checked={header.inChecklist} onCheckedChange={() => onToggleFlag?.('inChecklist')} className="h-4 w-4" /></TooltipTrigger><TooltipContent className="text-[8px] font-black uppercase">Checklist</TooltipContent></Tooltip>
          </div>
          
          {!header.locked && (
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/40 hover:text-destructive hover:bg-destructive/10" onClick={() => onToggleFlag?.('table')}><Trash2 className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent className="text-[8px] font-black uppercase">Hide Column</TooltipContent></Tooltip>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <Input 
              value={localLabel} 
              onChange={(e) => setLocalLabel(e.target.value)}
              className="h-6 bg-transparent border-none p-0 text-[8px] font-black uppercase tracking-[0.2em] text-primary focus-visible:ring-0 shadow-none"
            />
            {hasLabelChanges && (
              <Button size="icon" variant="ghost" className="h-6 w-6 text-primary" onClick={() => onRename?.(localLabel)}>
                <Save className="h-3 w-3" />
              </Button>
            )}
          </div>
        ) : (
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
            {label}
          </span>
        )}
      </div>
      <p className="text-[12px] font-black uppercase tracking-tight text-foreground leading-tight">
        {value || '---'}
      </p>
    </div>
  );
};

export function AssetDossier({ 
  record, 
  onEdit, 
  onQuickUpdate,
  onUpdateHeader,
  className,
  isHeaderEditingMode: externalHeaderSetup 
}: { 
  record: AssetRecord, 
  onEdit?: (id: string) => void, 
  onQuickUpdate?: (id: string, updates: any) => void,
  onUpdateHeader?: (id: string, updates: Partial<RegistryHeader>) => void,
  className?: string,
  isHeaderEditingMode?: boolean
}) {
  const { appSettings } = useAppState();
  const { userProfile } = useAuth();
  const [remarkValue, setRemarkValue] = useState(String(record.rawRow.remarks || ''));
  const [internalSetupMode, setInternalSetupMode] = useState(false);
  
  const isAdmin = userProfile?.isAdmin || userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const isSetupActive = internalSetupMode || externalHeaderSetup;

  useEffect(() => {
    setRemarkValue(String(record.rawRow.remarks || ''));
  }, [record.rawRow.remarks]);

  const isVerificationMode = appSettings?.appMode === 'verification';
  const status = String(record.rawRow.status || 'UNVERIFIED').toUpperCase();
  const syncStatus = (record.rawRow as any).syncStatus || 'local';
  const isVerified = status === 'VERIFIED';
  const grantId = (record.rawRow as any).grantId;
  const grantName = appSettings?.grants.find(g => g.id === grantId)?.name || 'Project';

  const handleToggleHeaderFlag = (headerId: string, flag: 'table' | 'quickView' | 'inChecklist') => {
    onUpdateHeader?.(headerId, { [flag]: true }); // Parent logic handles toggle
  };

  const handleRenameHeader = (headerId: string, newName: string) => {
    onUpdateHeader?.(headerId, { displayName: newName });
  };

  const handleSaveRemark = () => {
    onQuickUpdate?.(record.id, { remarks: remarkValue });
  };

  const hasUnsavedRemark = remarkValue !== (record.rawRow.remarks || '');

  const hiddenFields = useMemo(() => {
    return (record.headers || []).filter(h => !h.table && !h.quickView && !h.locked);
  }, [record.headers]);

  return (
    <div className={cn(
      "flex flex-col lg:flex-row min-h-0 bg-muted/5 rounded-[2rem] border border-border/40 overflow-hidden", 
      className
    )}>
      <div className="w-full lg:w-[320px] bg-card/30 flex flex-col shrink-0 border-b lg:border-b-0 lg:border-r border-border/40 p-6 space-y-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl"><Tag className="h-5 w-5 text-primary" /></div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <h3 className="text-xl font-black uppercase text-foreground tracking-tight leading-none truncate">{String(record.rawRow.description || 'Untitled')}</h3>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest truncate">ID: {record.rawRow.assetIdCode || 'UNSET'}</p>
            </div>
          </div>
          
          {(record.rawRow.photoUrl || record.rawRow.photoDataUri) && (
            <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-border/60 shadow-xl group">
              <Image 
                src={(record.rawRow.photoUrl || record.rawRow.photoDataUri) as string} 
                alt="Asset Photo"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                unoptimized
              />
            </div>
          )}
        </div>

        {isVerificationMode && (
          <div className="p-5 rounded-[1.5rem] bg-muted/30 border-2 border-primary/10 space-y-4 shadow-inner">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" /> Verification Status
            </h4>
            <div className="space-y-3">
              <Button 
                onClick={() => onQuickUpdate?.(record.id, { status: isVerified ? 'UNVERIFIED' : 'VERIFIED' })}
                className={cn(
                  "w-full h-11 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md",
                  isVerified ? "bg-green-600 hover:bg-green-500 text-white" : "bg-red-600 hover:bg-red-500 text-white"
                )}
              >
                {isVerified ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}
                {isVerified ? 'Verified' : 'Verify Asset'}
              </Button>

              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase text-muted-foreground opacity-60 ml-1">Asset Condition</label>
                <Select value={String(record.rawRow.condition || '')} onValueChange={(v) => onQuickUpdate?.(record.id, { condition: v })}>
                  <SelectTrigger className="h-11 bg-background border-border text-[10px] font-black uppercase rounded-xl">
                    <SelectValue placeholder="Select Condition" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">{ASSET_CONDITIONS.map(c => <SelectItem key={c} value={c} className="text-[9px] font-bold uppercase">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase text-muted-foreground opacity-60 ml-1">Field Remarks</label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Enter notes..." 
                    className={cn(
                      "h-11 text-[10px] font-medium bg-background border-border rounded-xl focus-visible:ring-primary/20 flex-1",
                      hasUnsavedRemark && "border-primary/40 ring-1 ring-primary/10"
                    )}
                    value={remarkValue}
                    onChange={(e) => setRemarkValue(e.target.value)}
                  />
                  <AnimatePresence>
                    {hasUnsavedRemark && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <Button size="icon" onClick={handleSaveRemark} title="Save Remark" className="h-11 w-11 rounded-xl bg-primary text-black">
                          <Save className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Data Quality
          </h4>
          <AssetChecklist values={record.rawRow as any} />
        </div>

        {onEdit && (
          <Button 
            onClick={() => onEdit(record.id)} 
            className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest bg-primary text-black gap-2 transition-transform active:scale-95"
          >
            <Edit3 className="h-4 w-4" /> Full Profile Edit
          </Button>
        )}
      </div>

      <div className="flex-1 flex flex-col bg-background min-h-0 overflow-hidden relative">
        <div className="p-6 sm:p-8 border-b border-border/40 flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 font-black uppercase text-[8px] h-5 px-2 rounded-full">
                {grantName}
              </Badge>
              <Badge className="bg-primary text-black font-black uppercase text-[8px] h-5 px-2 rounded-full">
                {record.sourceSheet || 'Record'}
              </Badge>
            </div>
            <p className="text-xl font-black uppercase text-foreground leading-none">Asset Profile</p>
          </div>
          
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setInternalSetupMode(!internalSetupMode)}
                className={cn(
                  "h-9 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest border-2 gap-2 transition-all",
                  isSetupActive ? "bg-primary text-black border-primary" : "bg-muted/50 border-border/40"
                )}
              >
                <Wrench className="h-3.5 w-3.5" /> {isSetupActive ? 'Exit Setup' : 'Manage Profile Labels'}
              </Button>
            )}
            <Badge variant="outline" className="h-7 px-4 border-primary/20 bg-primary/5 text-primary font-black uppercase text-[9px]">
              {syncStatus === 'synced' ? 'SAVED' : 'LOCAL'}
            </Badge>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {record.fields.map((field) => {
              const header = record.headers.find(h => h.id === field.headerId);
              if (!header) return null;
              return (
                <DetailField 
                  key={field.headerId} 
                  headerId={header.id}
                  label={header.displayName} 
                  value={field.displayValue} 
                  isEditing={isSetupActive}
                  onToggleFlag={(flag) => onUpdateHeader?.(header.id, { [flag]: true })}
                  onRename={(newName) => handleRenameHeader(header.id, newName)}
                />
              );
            })}
          </div>

          <AnimatePresence>
            {isSetupActive && hiddenFields.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 10 }}
                className="p-8 border-t border-primary/10 bg-primary/[0.02] flex flex-col items-center gap-4"
              >
                <div className="flex items-center gap-3 text-primary">
                  <PlusCircle className="h-5 w-5" />
                  <h4 className="text-[11px] font-black uppercase tracking-widest">Restore Hidden Technical Parameter</h4>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-11 rounded-xl border-primary/40 bg-background text-primary font-black uppercase text-[10px]">
                        Select field to reactivate
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 bg-card border-border shadow-3xl">
                      <DropdownMenuLabel className="text-[8px] font-black uppercase opacity-40">Available Parameters</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <ScrollArea className="h-48">
                        {hiddenFields.map(h => (
                          <DropdownMenuItem 
                            key={h.id} 
                            onClick={() => onUpdateHeader?.(h.id, { table: true })}
                            className="text-[10px] font-black uppercase py-2.5 cursor-pointer focus:bg-primary/10 focus:text-primary"
                          >
                            {h.displayName}
                          </DropdownMenuItem>
                        ))}
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-8 border-t border-border/40 space-y-6">
            <div className="flex items-center gap-3 text-muted-foreground/40">
              <Database className="h-4 w-4" />
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">Registry Metadata</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-5 rounded-2xl bg-muted/5 border-2 border-dashed border-border/40 space-y-4 shadow-inner">
                <div className="flex items-center gap-2 opacity-40"><History className="h-3 w-3" /><span className="text-[8px] font-black uppercase tracking-widest">Source Trace</span></div>
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-muted-foreground">Original Sheet</span><span className="text-foreground">{record.sourceSheet || 'Manual'}</span></div>
                  <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-muted-foreground">Excel Row</span><span className="text-primary font-bold">#{record.sourceRow || 'N/A'}</span></div>
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-muted/5 border-2 border-dashed border-border/40 space-y-4 shadow-inner">
                <div className="flex items-center gap-2 opacity-40"><Clock className="h-3 w-3" /><span className="text-[8px] font-black uppercase tracking-widest">Audit Pulse</span></div>
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-muted-foreground">Updated At</span><span className="text-foreground">{new Date(record.rawRow.lastModified as string).toLocaleString()}</span></div>
                  <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-muted-foreground">Officer</span><span className="text-foreground truncate max-w-[100px]">{String(record.rawRow.lastModifiedBy || 'System')}</span></div>
                </div>
              </div>
            </div>
          </div>
          <ScrollBar />
        </ScrollArea>
      </div>
    </div>
  );
}
