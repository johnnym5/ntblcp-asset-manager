/**
 * @fileOverview RegistryTable - High-Fidelity "Pill Capsule" List Workstation.
 * Optimized for Responsive Stacking and Dynamic Header Awareness.
 * Phase 6: Implemented Dynamic Columns based on TableView setting.
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
  List
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
  const isManagementMode = appSettings?.appMode === 'management';
  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';

  const VERIFICATION_KEYS = ['condition', 'remarks', 'status', 'verified_status'];

  // Dynamically determine columns based on Admin settings
  const tableHeaders = globalHeaders.filter(h => h.table);

  return (
    <div className="space-y-4 pb-40 animate-in fade-in duration-700 w-full overflow-hidden">
      {/* 1. Protocol Header */}
      <div className="flex items-center px-4 sm:px-8 py-4 sm:py-5 bg-card rounded-2xl border border-border mb-6 sticky top-0 z-30 shadow-2xl">
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
            {!isMobile && (!isManagementMode || isAdmin) && (
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">Verification</span>
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
                isSelected ? "border-primary/40 bg-primary/[0.02] shadow-2xl shadow-primary/5" : "border-border bg-card hover:border-primary/20"
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
                  {(!isManagementMode || isAdmin) ? (
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
                  ) : null}
                </div>
              </div>

              <AccordionContent className="bg-muted/10 border-t border-border p-6 sm:p-10 animate-in slide-in-from-top-2 duration-500">
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 sm:gap-x-12 gap-y-8 sm:gap-y-10">
                  {record.fields
                    .filter(f => f.displayValue !== '---')
                    .filter(f => {
                      const h = record.headers.find(header => header.id === f.headerId);
                      const isVerificationField = h ? VERIFICATION_KEYS.includes(h.normalizedName) : false;
                      if (isManagementMode && !isAdmin && isVerificationField) return false;
                      return true;
                    })
                    .map((field) => {
                      const header = record.headers.find(h => h.id === field.headerId);
                      return (
                        <div key={field.headerId} className="space-y-2 group/field">
                          <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-muted-foreground opacity-40 group-hover/field:text-primary transition-colors">
                            {header?.displayName || 'Technical Parameter'}
                          </p>
                          <p className="text-xs sm:text-sm font-black uppercase text-foreground/80 leading-tight">
                            {field.displayValue}
                          </p>
                        </div>
                      );
                    })}
                </div>
                
                <div className="mt-10 sm:mt-12 pt-8 sm:pt-10 border-t border-dashed border-border flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">
                  <div className="flex flex-wrap items-center gap-6 sm:gap-12 w-full sm:w-auto">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2 bg-muted rounded-lg sm:rounded-xl"><User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground/40" /></div>
                      <div className="flex flex-col">
                        <span className="text-[7px] sm:text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none mb-1">Auditor</span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-foreground/60 leading-none">{String(record.rawRow.lastModifiedBy || 'System')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2 bg-muted rounded-lg sm:rounded-xl"><Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground/40" /></div>
                      <div className="flex flex-col">
                        <span className="text-[7px] sm:text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none mb-1">Timestamp</span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-foreground/60 leading-none">{record.rawRow.lastModified ? new Date(record.rawRow.lastModified as string).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => onInspect(record.id)}
                    className="w-full sm:w-auto h-12 sm:h-14 px-8 sm:px-10 rounded-[1.5rem] font-black uppercase text-[9px] sm:text-[10px] tracking-widest gap-3 bg-primary text-black shadow-2xl transition-transform active:scale-95"
                  >
                    <Edit3 className="h-4 w-4" /> Open Full Profile
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
