'use client';

/**
 * @fileOverview RegistryTable - High-Fidelity List Workstation.
 * Enhanced with Overlay Expansion triggers.
 */

import React from 'react';
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
  Database,
  Maximize2
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
  onToggleExpand: (id: string) => void;
}

export function RegistryTable({ 
  records, 
  onInspect, 
  selectedIds, 
  onToggleSelect, 
  onSelectAll,
  onToggleExpand
}: RegistryTableProps) {
  const { appSettings, headers: globalHeaders } = useAppState();
  const isMobile = useIsMobile();
  
  const allSelected = records.length > 0 && records.every(r => selectedIds.has(r.id));
  const isVerificationMode = appSettings?.appMode === 'verification';

  const VERIFICATION_KEYS = ['condition', 'remarks', 'status', 'verified_status'];

  const tableHeaders = globalHeaders
    .filter(h => h.table)
    .filter(h => isVerificationMode || !VERIFICATION_KEYS.includes(h.normalizedName));

  return (
    <div className="space-y-4 pb-40 animate-in fade-in duration-700 w-full overflow-hidden">
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
          <div className="col-span-2" />
        </div>
      </div>

      <div className="space-y-3">
        {records.map((record) => {
          const status = String(record.rawRow.status || 'UNVERIFIED').toUpperCase();
          const syncStatus = (record.rawRow as any).syncStatus || 'local';
          const isSelected = selectedIds.has(record.id);

          return (
            <div 
              key={record.id} 
              className={cn(
                "border-2 rounded-[1.5rem] sm:rounded-[2rem] transition-all duration-500 overflow-hidden flex items-center group/item px-4 sm:px-8 py-3 cursor-pointer",
                isSelected ? "border-primary/40 bg-primary/[0.02] shadow-2xl" : "border-border bg-card hover:border-primary/20"
              )}
              onClick={() => onToggleExpand(record.id)}
            >
              <div className="w-[30px] sm:w-[40px] shrink-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <Checkbox 
                  checked={isSelected} 
                  onCheckedChange={() => onToggleSelect(record.id)}
                  className="h-5 w-5 sm:h-6 sm:w-6 rounded-full border-2 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </div>

              <div className="flex-1 grid grid-cols-12 gap-4 sm:gap-6 ml-4 sm:ml-6 items-center">
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
                <div className="col-span-2 flex justify-end">
                  <Maximize2 className="h-4 w-4 text-muted-foreground/20 group-hover/item:text-primary transition-colors" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
