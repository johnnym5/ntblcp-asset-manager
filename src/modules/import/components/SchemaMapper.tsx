'use client';

/**
 * @fileOverview SchemaMapper - Interactive Data Engineering Interface.
 * Allows users to manually align Excel headers to Registry fields.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRightLeft, 
  Check, 
  Info, 
  AlertCircle, 
  RefreshCw,
  Search,
  Database,
  Loader2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { REGISTRY_MAPPING_CONTRACT } from '@/parser/contracts/mapping';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SchemaMapperProps {
  headers: string[];
  onConfirm: (mapping: Record<string, string>) => void;
  isProcessing: boolean;
}

const TARGET_FIELDS = [
  { id: 'serialNumber', label: 'Serial Number', icon: Database },
  { id: 'description', label: 'Asset Description', icon: Info },
  { id: 'location', label: 'Location / State', icon: Info },
  { id: 'custodian', label: 'Custodian / User', icon: Info },
  { id: 'assetIdCode', label: 'Asset ID / Tag', icon: Info },
  { id: 'condition', label: 'Asset Condition', icon: Info },
];

export function SchemaMapper({ headers, onConfirm, isProcessing }: SchemaMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Auto-suggest mapping logic
  useEffect(() => {
    const initialMap: Record<string, string> = {};
    headers.forEach(header => {
      const normalized = header.toUpperCase().trim();
      const match = (REGISTRY_MAPPING_CONTRACT as any)[normalized];
      if (match) initialMap[header] = match;
    });
    setMapping(initialMap);
  }, [headers]);

  const updateMapping = (source: string, target: string) => {
    setMapping(prev => ({ ...prev, [source]: target }));
  };

  const getMatchStrength = (header: string) => {
    const target = mapping[header];
    if (!target) return 'none';
    const normalized = header.toUpperCase().trim();
    return (REGISTRY_MAPPING_CONTRACT as any)[normalized] === target ? 'strong' : 'manual';
  };

  return (
    <Card className="rounded-[3rem] border-2 border-border/40 shadow-2xl bg-card/50 overflow-hidden">
      <div className="p-8 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-lg font-black uppercase tracking-tight">Technical Column Alignment</h4>
          <p className="text-[10px] font-bold uppercase text-muted-foreground opacity-60">Data Mapping Logic v5.0.1</p>
        </div>
        <div className="p-4 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20 flex items-center gap-4">
          <div className="flex flex-col text-right">
            <span className="text-[9px] font-black uppercase text-primary">Alignment Rate</span>
            <span className="text-xl font-black">{Math.round((Object.keys(mapping).length / headers.length) * 100)}%</span>
          </div>
          <div className="h-10 w-px bg-primary/20" />
          <RefreshCw className="h-5 w-5 text-primary opacity-40" />
        </div>
      </div>

      <CardContent className="p-0">
        <div className="grid grid-cols-12 bg-muted/10 border-b text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          <div className="col-span-5 py-4 pl-10">Incoming Excel Header</div>
          <div className="col-span-2 py-4 text-center">Status</div>
          <div className="col-span-5 py-4 pr-10">Target Registry Field</div>
        </div>

        <ScrollArea className="h-[500px]">
          <div className="divide-y-2 divide-dashed divide-border/40">
            {headers.map((header) => {
              const strength = getMatchStrength(header);
              return (
                <div key={header} className="grid grid-cols-12 items-center group hover:bg-primary/[0.02] transition-colors">
                  <div className="col-span-5 py-6 pl-10 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-[10px] font-black opacity-40">
                      <Search className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-black uppercase tracking-tight text-foreground truncate">{header}</span>
                  </div>

                  <div className="col-span-2 py-6 flex justify-center">
                    <div className={cn(
                      "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all",
                      strength === 'strong' ? "bg-green-100 text-green-600 border-green-200" :
                      strength === 'manual' ? "bg-blue-100 text-blue-600 border-blue-200" :
                      "bg-muted text-muted-foreground border-border/60 opacity-40"
                    )}>
                      {strength === 'strong' ? 'Auto-Match' : strength === 'manual' ? 'Refined' : 'Unmapped'}
                    </div>
                  </div>

                  <div className="col-span-5 py-6 pr-10 flex items-center gap-4">
                    <ArrowRightLeft className="h-4 w-4 text-muted-foreground opacity-20" />
                    <Select 
                      value={mapping[header] || 'metadata'} 
                      onValueChange={(v) => updateMapping(header, v)}
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-background border-2 border-border/40 font-black text-[10px] uppercase tracking-tighter hover:border-primary/40 transition-all shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {TARGET_FIELDS.map(field => (
                          <SelectItem key={field.id} value={field.id} className="text-xs font-bold">
                            {field.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="metadata" className="text-xs font-bold italic opacity-60">
                          Move to Metadata (Hidden)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-10 border-t bg-muted/20 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-start gap-4 max-w-lg">
            <div className="p-3 bg-blue-500/10 rounded-2xl shrink-0"><Info className="h-6 w-6 text-blue-600" /></div>
            <div className="space-y-1">
              <h5 className="text-xs font-black uppercase tracking-tight">Engineering Hint</h5>
              <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic">
                All unmapped columns are automatically sequestered into the record's metadata. You will never lose source data during the ingestion traversal.
              </p>
            </div>
          </div>
          <Button 
            onClick={() => onConfirm(mapping)}
            disabled={isProcessing}
            className="h-16 px-12 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 gap-4 transition-transform hover:scale-105 active:scale-95 min-w-[240px]"
          >
            {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            Confirm Schema Mapping
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
