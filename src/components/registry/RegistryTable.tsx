'use client';

/**
 * @fileOverview RegistryTable - Ground-up Professional List Workstation.
 * Phase 1500: Rebuilt with a 12-column grid pulse for deterministic alignment.
 * Phase 1501: Integrated inline high-speed verification controls with color-coding.
 * Phase 1502: Added Folder column for combined project views.
 * Phase 1503: Implemented Explicit Save button for Remarks input.
 */

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  Edit3, 
  Tag, 
  Globe, 
  CloudOff,
  Maximize2,
  CheckCircle2,
  XCircle,
  Clock,
  FolderOpen,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppState } from '@/contexts/app-state-context';
import { ASSET_CONDITIONS } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

interface RegistryTableProps {
  records: AssetRecord[];
  onInspect: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onToggleExpand: (id: string) => void;
  onQuickUpdate?: (id: string, updates: any) => void;
}

const TableRemarkInput = ({ record, onUpdate }: { record: AssetRecord, onUpdate: (id: string, updates: any) => void }) => {
  const [val, setVal] = useState(String(record.rawRow.remarks || ''));
  const hasChanges = val !== (record.rawRow.remarks || '');

  useEffect(() => {
    setVal(String(record.rawRow.remarks || ''));
  }, [record.rawRow.remarks]);

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <div className="relative flex-1 group/remark">
        <Input 
          placeholder="Remark..." 
          className={cn(
            "h-9 text-[9px] font-medium bg-muted/20 border-border/40 pr-8 rounded-xl focus-visible:ring-primary/20 transition-all",
            hasChanges && "border-primary/40 ring-1 ring-primary/10"
          )}
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
        <Edit3 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-20 group/remark:opacity-40 transition-opacity pointer-events-none" />
      </div>
      <AnimatePresence>
        {hasChanges && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <Button size="icon" className="h-9 w-9 rounded-xl bg-primary text-black shadow-lg" onClick={() => onUpdate(record.id, { remarks: val })}>
              <Save className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function RegistryTable({ 
  records, 
  selectedIds, 
  onToggleSelect, 
  onSelectAll,
  onToggleExpand,
  onQuickUpdate
}: RegistryTableProps) {
  const { appSettings } = useAppState();
  
  const allSelected = records.length > 0 && records.every(r => selectedIds.has(r.id));
  const isVerificationMode = appSettings?.appMode === 'verification';

  // Determine if we should show the category column (if multiple categories exist in the view)
  const uniqueCategories = Array.from(new Set(records.map(r => r.sourceSheet)));
  const showCategoryCol = uniqueCategories.length > 1;

  return (
    <div className="w-full flex flex-col gap-3 pb-40">
      {/* 1. Ground-up Header Pulse */}
      <div className="sticky top-0 z-30 flex items-center h-14 bg-card border border-border rounded-xl px-6 shadow-xl backdrop-blur-3xl">
        <div className="w-10 shrink-0 flex items-center justify-center">
          <Checkbox 
            checked={allSelected} 
            onCheckedChange={(v) => onSelectAll(!!v)} 
            className="h-5 w-5 rounded-md border-2 border-border data-[state=checked]:bg-primary"
          />
        </div>
        
        <div className="flex-1 grid grid-cols-12 gap-6 ml-6 items-center">
          <div className="col-span-1 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">S/N</div>
          <div className={showCategoryCol ? "col-span-3" : "col-span-4"}>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">Identification</span>
          </div>
          {showCategoryCol && (
            <div className="col-span-2 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">Asset Folder</div>
          )}
          <div className="col-span-2 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">Registry Scope</div>
          {isVerificationMode ? (
            <div className="col-span-4 text-[9px] font-black uppercase tracking-[0.3em] text-primary">Field Assessment Pulse</div>
          ) : (
            <div className="col-span-4 text-right text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 pr-10">Actions</div>
          )}
        </div>
      </div>

      {/* 2. Structured Data Rows */}
      <div className="space-y-2">
        {records.map((record) => {
          const status = String(record.rawRow.status || 'UNVERIFIED').toUpperCase();
          const syncStatus = (record.rawRow as any).syncStatus || 'local';
          const isSelected = selectedIds.has(record.id);
          const isVerified = status === 'VERIFIED';
          const grantId = (record.rawRow as any).grantId;
          const grantName = appSettings?.grants.find(g => g.id === grantId)?.name || 'Registry';

          return (
            <div 
              key={record.id} 
              className={cn(
                "h-16 flex items-center px-6 rounded-2xl border-2 transition-all duration-300 group cursor-pointer",
                isSelected ? "border-primary/40 bg-primary/[0.03] shadow-lg" : "border-border/40 bg-card hover:border-primary/20",
                isVerificationMode && isVerified && !isSelected && "bg-green-500/[0.02] border-green-500/10",
                isVerificationMode && !isVerified && !isSelected && "bg-red-500/[0.02] border-red-500/10"
              )}
              onClick={() => onToggleExpand(record.id)}
            >
              <div className="w-10 shrink-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <Checkbox 
                  checked={isSelected} 
                  onCheckedChange={() => onToggleSelect(record.id)}
                  className="h-5 w-5 rounded-full border-2 border-border data-[state=checked]:bg-primary"
                />
              </div>

              <div className="flex-1 grid grid-cols-12 gap-6 ml-6 items-center">
                {/* Col 1: S/N */}
                <div className="col-span-1">
                  <span className="text-[10px] font-mono font-black text-muted-foreground/40">{record.sn || '---'}</span>
                </div>

                {/* Col 2: Identification */}
                <div className={showCategoryCol ? "col-span-3 flex items-center gap-3 min-w-0" : "col-span-4 flex items-center gap-3 min-w-0"}>
                  <div className={cn(
                    "p-1.5 rounded-lg border shrink-0",
                    syncStatus === 'synced' ? "bg-green-500/5 border-green-500/20 text-green-600" : "bg-blue-500/5 border-blue-500/20 text-blue-600"
                  )}>
                    {syncStatus === 'synced' ? <Globe className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-black uppercase text-foreground leading-none truncate">{String(record.rawRow.description || 'Untitled Asset')}</span>
                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1">TAG: {record.rawRow.assetIdCode || 'UNSET'}</span>
                  </div>
                </div>

                {/* Optional Folder Column */}
                {showCategoryCol && (
                  <div className="col-span-2 min-w-0 flex flex-col gap-1">
                    <span className="text-[7px] font-black uppercase text-primary tracking-tighter truncate opacity-60">
                      {grantName}
                    </span>
                    <Badge variant="outline" className="border-border/60 text-[8px] font-black uppercase tracking-tighter truncate max-w-full">
                      <FolderOpen className="h-2.5 w-2.5 mr-1 text-primary opacity-60" />
                      {record.sourceSheet}
                    </Badge>
                  </div>
                )}

                {/* Col 3: Scope */}
                <div className="col-span-2 min-w-0">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black uppercase text-foreground/80 truncate leading-none">{String(record.rawRow.location || 'Global')}</span>
                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter mt-1 truncate">{String(record.rawRow.custodian || 'Unassigned')}</span>
                  </div>
                </div>

                {/* Col 4: Assessment / Actions */}
                <div className="col-span-4" onClick={e => e.stopPropagation()}>
                  {isVerificationMode ? (
                    <div className="flex items-center gap-3">
                      <Button 
                        size="sm" 
                        onClick={() => onQuickUpdate?.(record.id, { status: isVerified ? 'UNVERIFIED' : 'VERIFIED' })}
                        className={cn(
                          "h-9 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-md",
                          isVerified ? "bg-green-600 hover:bg-green-500 text-white" : "bg-red-600 hover:bg-red-500 text-white"
                        )}
                      >
                        {isVerified ? <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> : <XCircle className="h-3.5 w-3.5 mr-1.5" />}
                        {isVerified ? 'Verified' : 'Confirm'}
                      </Button>

                      <Select 
                        value={String(record.rawRow.condition || '')} 
                        onValueChange={(v) => onQuickUpdate?.(record.id, { condition: v })}
                      >
                        <SelectTrigger className="h-9 w-28 bg-muted/20 border-border/40 text-[9px] font-black uppercase rounded-xl">
                          <SelectValue placeholder="Condition" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border">
                          {ASSET_CONDITIONS.map(c => <SelectItem key={c} value={c} className="text-[9px] font-bold uppercase">{c}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      {onQuickUpdate && <TableRemarkInput record={record} onUpdate={onQuickUpdate} />}
                    </div>
                  ) : (
                    <div className="flex justify-end pr-4">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-xl bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all opacity-40 group-hover/item:opacity-100"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
