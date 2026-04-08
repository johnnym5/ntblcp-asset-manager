'use client';

/**
 * @fileOverview RegistryTable - High-Fidelity "Pill Capsule" List Workstation.
 * Optimized for Inline Expansion using the central AssetDossier.
 * Phase 606: Implemented "Full View as Dropdown" inline expansion.
 */

import React from 'react';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  User,
  Clock,
  Edit3,
  Tag,
  MapPin,
  Settings2,
  Lock,
  ChevronDown,
  Globe,
  CloudOff,
  List,
  ShieldCheck,
  Database
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
import { useAuth } from '@/contexts/auth-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AssetDossier } from './AssetDossier';

interface RegistryTableProps {
  records: AssetRecord[];
  onInspect: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onConfigureHeaders?: () => void;
}

export function RegistryTable({ 
  records, 
  onInspect, 
  selectedIds, 
  onToggleSelect, 
  onSelectAll
}: RegistryTableProps) {
  const { appSettings, headers: globalHeaders } = useAppState();
  const { userProfile } = useAuth();
  const isMobile = useIsMobile();
  
  const allSelected = records.length > 0 && records.every(r => selectedIds.has(r.id));
  const isVerificationMode = appSettings?.appMode === 'verification';

  const VERIFICATION_KEYS = ['condition', 'remarks', 'status', 'verified_status'];

  const tableHeaders = globalHeaders
    .filter(h => h.table)
    .filter(h => isVerificationMode || !VERIFICATION_KEYS.includes(h.normalizedName));

  return (
    <div className="space-y-4 pb-40 animate-in fade-in duration-700 w-full overflow-hidden">
      {/* 1. Protocol Header */}
      <div className="flex items-center px-4 sm:px-8 py-4 sm:py-5 bg-card rounded-2xl border border-border mb-6 sticky top-0 z-30 shadow-2xl backdrop-blur-xl">
        <div className="w-[30px] sm:w-[40px] shrink-0 flex items-center justify-center">
          <Checkbox 
            checked={allSelected} 
            onCheckedChange={(v) => onSelectAll(!!v)} 
            className="h-5 w-5 rounded-lg border-2 border-border data-[state=checked]:bg-primary"
          />
        </div>
        
        <div className="flex-1 grid grid-cols-12 gap-4 sm:gap-6 ml-4 sm:ml-6 items-center">
          {tableHeaders.slice(0, 4).map((header, idx) => (
            <div 
              key={header.id} 
              className={cn(
                "text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40",
                idx === 0 ? "col-span-1" : idx === 1 ? "col-span-4" : idx === 2 ? "col-span-3" : "col-span-2"
              )}
            >
              {header.displayName}
            </div>
          ))}
          <div className="col-span-2 flex items-center justify-end sm:justify-center gap-2">
            {!isMobile && isVerificationMode && (
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">Pulse Assessment</span>
            )}
          </div>
        </div>
      </div>

      <Accordion type="multiple" className="space-y-3">
        {records.map((record) => {
          const status = String(record.rawRow.status || 'UNVERIFIED').toUpperCase();
          const syncStatus = (record.rawRow as any).syncStatus || 'local';
          const isSelected = selectedIds.has(record.id);

          return (
            <AccordionItem 
              key={record.id} 
              value={record.id} 
              className={cn(
                "border-2 rounded-[1.5rem] sm:rounded-[2rem] transition-all duration-500 overflow-hidden",
                isSelected ? "border-primary/40 bg-primary/[0.02] shadow-2xl" : "border-border bg-card hover:border-primary/20"
              )}
            >
              <div className="flex items-center group/item px-4 sm:px-8 py-1.5">
                <div className="w-[30px] sm:w-[40px] shrink-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={isSelected} 
                    onCheckedChange={() => onToggleSelect(record.id)}
                    className="h-5 w-5 sm:h-6 sm:w-6 rounded-full border-2 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>

                <AccordionTrigger className="flex-1 hover:no-underline py-4 sm:py-6 ml-4 sm:ml-6">
                  <div className="grid grid-cols-12 gap-4 sm:gap-6 w-full text-left items-center">
                    {tableHeaders.slice(0, 4).map((header, idx) => {
                      const field = record.fields.find(f => f.headerId === header.id);
                      return (
                        <div 
                          key={header.id} 
                          className={cn(
                            "min-w-0 pr-2",
                            idx === 0 ? "col-span-1" : idx === 1 ? "col-span-4" : idx === 2 ? "col-span-3" : "col-span-2"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-black tracking-tight truncate block uppercase",
                              idx === 0 ? "text-[10px] font-mono text-muted-foreground/40" : "text-xs sm:text-sm text-foreground"
                            )}>
                              {idx === 0 ? `#${field?.displayValue || '---'}` : field?.displayValue || '---'}
                            </span>
                            {idx === 1 && (
                              <div className={cn(
                                "p-1 rounded-md border shrink-0",
                                syncStatus === 'synced' ? "bg-green-500/10 border-green-500/20 text-green-600" : "bg-blue-500/10 border-blue-500/20 text-blue-600"
                              )}>
                                {syncStatus === 'synced' ? <Globe className="h-2.5 w-2.5" /> : <CloudOff className="h-2.5 w-2.5" />}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div className="col-span-2" />
                  </div>
                </AccordionTrigger>

                <div className="hidden sm:flex w-[140px] shrink-0 justify-end" onClick={(e) => e.stopPropagation()}>
                  {isVerificationMode ? (
                    <Select value={status}>
                      <SelectTrigger className={cn(
                        "h-8 sm:h-9 w-32 rounded-full font-black uppercase text-[8px] tracking-[0.25em] border-2 transition-all",
                        status === 'VERIFIED' ? "bg-green-500/10 text-green-600 border-green-500/20" : 
                        status === 'DISCREPANCY' ? "bg-red-500/10 text-red-600 border-red-500/20" :
                        "bg-muted text-muted-foreground border-border"
                      )}>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-1.5 w-1.5 rounded-full", status === 'VERIFIED' ? "bg-green-500" : status === 'DISCREPANCY' ? "bg-red-500" : "bg-muted-foreground/20")} />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VERIFIED" className="text-[9px] font-black uppercase">Verified</SelectItem>
                        <SelectItem value="UNVERIFIED" className="text-[9px] font-black uppercase">Unverified</SelectItem>
                        <SelectItem value="DISCREPANCY" className="text-[9px] font-black uppercase text-destructive">Discrepancy</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="h-8 px-4 rounded-xl font-black uppercase text-[8px] border-primary/20 text-primary bg-primary/5">
                      <Database className="h-3 w-3 mr-1.5" /> Full Dossier
                    </Badge>
                  )}
                </div>
              </div>

              <AccordionContent className="bg-muted/5 border-t border-border p-4 sm:p-8 animate-in slide-in-from-top-2 duration-500">
                <AssetDossier 
                  record={record} 
                  onEdit={onInspect}
                  className="shadow-inner border-dashed border-2 border-primary/10"
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
