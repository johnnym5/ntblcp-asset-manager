/**
 * @fileOverview RegistryTable - High-Fidelity "Pill Capsule" List Workstation.
 * Phase 1100: Resolved nested button error by decoupling Select from AccordionTrigger.
 * Phase 1110: Applied user-friendly business terminology.
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
  Database, 
  MapPin, 
  Edit3,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  MoreVertical
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
      {/* List Protocol Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white/[0.03] rounded-2xl border border-white/5 mb-6">
        <div className="flex items-center gap-4">
          <Checkbox 
            checked={allSelected} 
            onCheckedChange={(v) => onSelectAll(!!v)} 
            className="h-5 w-5 rounded-lg border-2 border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Select All Items</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[8px] font-black border-white/10 text-white/20 uppercase tracking-widest px-3">
            Layout: Interactive List
          </Badge>
        </div>
      </div>

      <Accordion type="multiple" className="space-y-2.5">
        {records.map((record) => {
          const status = String(record.rawRow.status || 'UNVERIFIED').toUpperCase();
          const isSelected = selectedIds.has(record.id);

          return (
            <AccordionItem 
              key={record.id} 
              value={record.id} 
              className={cn(
                "border-2 rounded-[1.5rem] transition-all duration-300 overflow-hidden",
                isSelected ? "border-primary/40 bg-primary/5 shadow-xl shadow-primary/5" : "border-white/5 bg-[#0A0A0A] hover:border-white/10"
              )}
            >
              <div className="flex items-center group/item">
                {/* 1. Selection Slot (Outside Trigger to avoid nesting) */}
                <div className="pl-6 pr-2 py-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={isSelected} 
                    onCheckedChange={() => onToggleSelect(record.id)}
                    className="h-6 w-6 rounded-full border-2 border-white/10 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>

                {/* 2. Identity Pulse (The Button Trigger) */}
                <AccordionTrigger className="flex-1 hover:no-underline py-4 px-4 text-left">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-black text-[13px] uppercase tracking-tight text-white truncate max-w-[280px] md:max-w-[400px]">
                      {String(record.rawRow.description || 'Untitled Inventory Item')}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-mono font-bold text-white/20 uppercase tracking-[0.2em]">S/N: {record.sn || '---'}</span>
                      <div className="h-1 w-1 rounded-full bg-white/10" />
                      <span className="text-[9px] font-bold text-primary/60 uppercase tracking-widest">{record.sourceSheet}</span>
                    </div>
                  </div>
                </AccordionTrigger>

                {/* 3. Status Capsule (Outside Trigger to fix Nested Button error) */}
                <div className="pr-10 py-4 flex items-center gap-6" onClick={(e) => e.stopPropagation()}>
                  <Select value={status}>
                    <SelectTrigger className={cn(
                      "h-8 w-32 rounded-full font-black uppercase text-[8px] tracking-[0.2em] border-2 transition-all shadow-lg",
                      status === 'VERIFIED' ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                      status === 'DISCREPANCY' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                      "bg-white/5 text-white/40 border-white/10"
                    )}>
                      <div className="flex items-center gap-2">
                        <div className={cn("h-1.5 w-1.5 rounded-full", status === 'VERIFIED' ? "bg-green-500" : status === 'DISCREPANCY' ? "bg-red-500" : "bg-white/20")} />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0A0A] border-white/10">
                      <SelectItem value="VERIFIED" className="text-[9px] font-black uppercase">Verified</SelectItem>
                      <SelectItem value="UNVERIFIED" className="text-[9px] font-black uppercase">Unverified</SelectItem>
                      <SelectItem value="DISCREPANCY" className="text-[9px] font-black uppercase">Discrepancy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <AccordionContent className="bg-white/[0.01] border-t border-white/5 p-8 animate-in slide-in-from-top-2 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-8">
                  {record.fields.filter(f => f.displayValue !== '---').map((field) => {
                    const header = record.headers.find(h => h.id === field.headerId);
                    return (
                      <div key={field.headerId} className="space-y-1.5 group/field">
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/20 group-hover/field:text-primary/40 transition-colors">
                          {header?.displayName || 'Technical field'}
                        </p>
                        <p className="text-sm font-black uppercase text-white/80 leading-tight">
                          {field.displayValue}
                        </p>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-10 pt-8 border-t border-dashed border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 rounded-lg"><User className="h-3.5 w-3.5 text-white/20" /></div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">Auditor Identity</span>
                        <span className="text-[10px] font-bold text-white/60 leading-none">{String(record.rawRow.lastModifiedBy || 'System')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 rounded-lg"><Clock className="h-3.5 w-3.5 text-white/20" /></div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">Last Update</span>
                        <span className="text-[10px] font-bold text-white/60 leading-none">{new Date(record.rawRow.lastModified as string).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button 
                      onClick={() => onInspect(record.id)}
                      className="flex-1 sm:flex-none h-12 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 bg-primary text-black shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Full Audit Profile
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