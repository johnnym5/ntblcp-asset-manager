/**
 * @fileOverview RegistryTable - High-Fidelity "Pill Capsule" List Workstation.
 * Phase 1200: Optimized layout with 5-column grid pulse and sticky headers.
 * Phase 1210: Applied business terminology and improved horizontal spacing.
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
  Hash,
  FileText
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

interface RegistryTableProps {
  records: AssetRecord[];
  onInspect: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
}

export function RegistryTable({ 
  records, 
  onInspect, 
  selectedIds, 
  onToggleSelect, 
  onSelectAll 
}: RegistryTableProps) {
  const allSelected = records.length > 0 && records.every(r => selectedIds.has(r.id));

  return (
    <div className="space-y-4 pb-40 animate-in fade-in duration-700">
      {/* 1. List Protocol Header - Sticky for column context */}
      <div className="flex items-center px-8 py-5 bg-white/[0.03] rounded-2xl border border-white/5 mb-6 sticky top-0 z-30 backdrop-blur-3xl shadow-2xl">
        <div className="w-[40px] shrink-0 flex items-center justify-center">
          <Checkbox 
            checked={allSelected} 
            onCheckedChange={(v) => onSelectAll(!!v)} 
            className="h-5 w-5 rounded-lg border-2 border-white/20 data-[state=checked]:bg-primary"
          />
        </div>
        
        <div className="flex-1 grid grid-cols-12 gap-6 ml-6">
          <div className="col-span-1 text-[9px] font-black uppercase tracking-[0.3em] text-white/30">S/N</div>
          <div className="col-span-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Description</div>
          <div className="col-span-2 text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Asset ID / Tag</div>
          <div className="col-span-3 text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Regional Scope</div>
          <div className="col-span-2 text-[9px] font-black uppercase tracking-[0.3em] text-white/30 text-center">Audit Status</div>
        </div>
      </div>

      <Accordion type="multiple" className="space-y-3">
        {records.map((record) => {
          const status = String(record.rawRow.status || 'UNVERIFIED').toUpperCase();
          const isSelected = selectedIds.has(record.id);

          return (
            <AccordionItem 
              key={record.id} 
              value={record.id} 
              className={cn(
                "border-2 rounded-[2rem] transition-all duration-500 overflow-hidden",
                isSelected ? "border-primary/40 bg-primary/5 shadow-2xl shadow-primary/5" : "border-white/5 bg-[#080808] hover:border-white/10"
              )}
            >
              <div className="flex items-center group/item px-8 py-1.5">
                {/* Selection Pulse */}
                <div className="w-[40px] shrink-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={isSelected} 
                    onCheckedChange={() => onToggleSelect(record.id)}
                    className="h-6 w-6 rounded-full border-2 border-white/10 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>

                {/* Identity Grid (The Expansion Trigger) */}
                <AccordionTrigger className="flex-1 hover:no-underline py-6 ml-6">
                  <div className="grid grid-cols-12 gap-6 w-full text-left items-center">
                    <div className="col-span-1">
                      <span className="text-[11px] font-mono font-black text-white/20 tracking-tighter">#{record.sn || '---'}</span>
                    </div>
                    <div className="col-span-4 min-w-0 pr-6">
                      <span className="font-black text-sm uppercase tracking-tight text-white truncate block">
                        {String(record.rawRow.description || 'Untitled Inventory Item')}
                      </span>
                    </div>
                    <div className="col-span-2 min-w-0 pr-4">
                      <div className="flex items-center gap-2.5 opacity-60 group-hover/item:opacity-100 transition-opacity">
                        <Tag className="h-3 w-3 text-primary shrink-0" />
                        <span className="text-[10px] font-bold text-white/80 truncate uppercase tracking-widest">
                          {String(record.rawRow.assetIdCode || 'UNTAGGED')}
                        </span>
                      </div>
                    </div>
                    <div className="col-span-3 min-w-0 pr-4">
                      <div className="flex items-center gap-2.5 opacity-60 group-hover/item:opacity-100 transition-opacity">
                        <MapPin className="h-3 w-3 text-primary shrink-0" />
                        <span className="text-[10px] font-bold text-white/80 truncate uppercase">
                          {String(record.rawRow.location || 'GLOBAL')}
                        </span>
                      </div>
                    </div>
                    <div className="col-span-2" /> {/* Layout Alignment Spacer */}
                  </div>
                </AccordionTrigger>

                {/* Status Capsule (Decoupled Action) */}
                <div className="w-[140px] shrink-0 flex justify-end" onClick={(e) => e.stopPropagation()}>
                  <Select value={status}>
                    <SelectTrigger className={cn(
                      "h-9 w-32 rounded-full font-black uppercase text-[8px] tracking-[0.25em] border-2 transition-all shadow-xl",
                      status === 'VERIFIED' ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                      status === 'DISCREPANCY' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                      "bg-white/5 text-white/40 border-white/10"
                    )}>
                      <div className="flex items-center gap-2">
                        <div className={cn("h-1.5 w-1.5 rounded-full", status === 'VERIFIED' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : status === 'DISCREPANCY' ? "bg-red-500" : "bg-white/20")} />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0A0A] border-white/10 rounded-2xl">
                      <SelectItem value="VERIFIED" className="text-[9px] font-black uppercase tracking-widest py-3">Verified</SelectItem>
                      <SelectItem value="UNVERIFIED" className="text-[9px] font-black uppercase tracking-widest py-3">Unverified</SelectItem>
                      <SelectItem value="DISCREPANCY" className="text-[9px] font-black uppercase tracking-widest py-3 text-destructive">Discrepancy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <AccordionContent className="bg-white/[0.01] border-t border-white/5 p-10 animate-in slide-in-from-top-2 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-10">
                  {record.fields.filter(f => f.displayValue !== '---').map((field) => {
                    const header = record.headers.find(h => h.id === field.headerId);
                    return (
                      <div key={field.headerId} className="space-y-2.5 group/field">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 group-hover/field:text-primary transition-colors">
                          {header?.displayName || 'Technical field'}
                        </p>
                        <p className="text-sm font-black uppercase text-white/80 leading-tight">
                          {field.displayValue}
                        </p>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-12 pt-10 border-t border-dashed border-white/10 flex flex-col sm:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-12">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-white/5 rounded-xl"><User className="h-4 w-4 text-white/20" /></div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none mb-1.5">Last Audit By</span>
                        <span className="text-[10px] font-bold text-white/60 leading-none">{String(record.rawRow.lastModifiedBy || 'System')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-white/5 rounded-xl"><Clock className="h-4 w-4 text-white/20" /></div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none mb-1.5">Audit Pulse</span>
                        <span className="text-[10px] font-bold text-white/60 leading-none">{new Date(record.rawRow.lastModified as string).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <Button 
                      onClick={() => onInspect(record.id)}
                      className="flex-1 sm:flex-none h-14 px-10 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest gap-3 bg-primary text-black shadow-2xl shadow-primary/30 transition-transform hover:scale-105"
                    >
                      <Edit3 className="h-4 w-4" /> Open Full Audit Profile
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
