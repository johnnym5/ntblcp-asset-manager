/**
 * @fileOverview RegistryCard - High-Density UI Pulse.
 * Phase 1500: Reformatted to support 7 headers with prioritized S/N and ID.
 * Phase 1501: Added inline editing for Name, Location, and LGA with explicit save buttons.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Globe, CloudOff, Maximize2, CheckCircle2, XCircle, Edit3, FolderOpen, ShieldCheck, Save, Trash2, Tag, MapPin, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';
import { useAppState } from '@/contexts/app-state-context';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ASSET_CONDITIONS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { TactileMenu } from '@/components/TactileMenu';
import { motion, AnimatePresence } from 'framer-motion';

interface RegistryCardProps {
  record: AssetRecord;
  onInspect: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onToggleExpand?: () => void;
  onQuickUpdate?: (id: string, updates: any) => void;
  densityMode?: 'compact' | 'comfortable' | 'expanded';
}

const InlineField = ({ 
  label, 
  value, 
  onSave, 
  icon: Icon,
  disabled 
}: { 
  label: string, 
  value: string, 
  onSave: (val: string) => void,
  icon: any,
  disabled?: boolean
}) => {
  const [localVal, setLocalVal] = useState(value);
  const hasChanges = localVal !== value;

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  return (
    <div className="flex flex-col gap-0.5 group/inline">
      <span className="text-[7px] font-black uppercase text-muted-foreground opacity-40 group-hover/inline:text-primary transition-colors">{label}</span>
      <div className="flex items-center gap-1.5">
        <Input 
          value={localVal} 
          onChange={(e) => setLocalVal(e.target.value)}
          disabled={disabled}
          className={cn(
            "h-7 text-[10px] font-bold bg-muted/20 border-transparent rounded-lg px-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 transition-all",
            hasChanges && "border-primary/40 bg-primary/5 shadow-sm"
          )}
        />
        <AnimatePresence>
          {hasChanges && (
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
              <Button 
                size="icon" 
                className="h-7 w-7 rounded-lg bg-primary text-black shadow-lg hover:scale-105 transition-transform" 
                onClick={() => onSave(localVal)}
              >
                <Save className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export function RegistryCard({ 
  record, 
  onInspect, 
  selected, 
  onToggleSelect, 
  onToggleExpand,
  onQuickUpdate,
  densityMode = 'comfortable'
}: RegistryCardProps) {
  const { appSettings, headers: globalHeaders } = useAppState();
  const [localRemark, setLocalRemark] = useState(String(record.rawRow.remarks || ''));

  useEffect(() => {
    setLocalRemark(String(record.rawRow.remarks || ''));
  }, [record.rawRow.remarks]);

  const isVerificationMode = appSettings?.appMode === 'verification';
  const isAdmin = appSettings?.appMode === 'management';
  const canEditBase = isAdmin || isVerificationMode;

  const forcedFieldNames = ['condition', 'remarks', 'status'];
  
  // Deterministic 7-header slice with priority
  const activeHeaders = useMemo(() => {
    const priority = ['sn', 'assetIdCode'];
    const core = globalHeaders.filter(h => priority.includes(h.normalizedName));
    const others = globalHeaders.filter(h => h.quickView && !priority.includes(h.normalizedName) && h.normalizedName !== 'description');
    return [...core, ...others].slice(0, 7);
  }, [globalHeaders]);

  const status = String(record.rawRow.status || 'UNVERIFIED').toUpperCase();
  const syncStatus = (record.rawRow as any).syncStatus || 'local';
  const grantId = (record.rawRow as any).grantId;
  const grantName = appSettings?.grants.find(g => g.id === grantId)?.name || 'Registry';

  const handleSaveRemark = () => {
    onQuickUpdate?.(record.id, { remarks: localRemark });
  };

  const hasUnsavedRemark = localRemark !== (record.rawRow.remarks || '');

  return (
    <TactileMenu
      title="Asset Shortcuts"
      options={[
        { label: 'View Profile', icon: Maximize2, onClick: () => onToggleExpand?.() },
        { label: 'Edit Record', icon: Edit3, onClick: () => onInspect(record.id) },
        { label: status === 'VERIFIED' ? 'Mark Unverified' : 'Mark Verified', icon: status === 'VERIFIED' ? XCircle : CheckCircle2, onClick: () => onQuickUpdate?.(record.id, { status: status === 'VERIFIED' ? 'UNVERIFIED' : 'VERIFIED' }) },
        { label: selected ? 'Deselect Item' : 'Select Item', icon: Check, onClick: () => onToggleSelect?.(record.id) },
        { label: 'Clear Record', icon: Trash2, onClick: () => {}, destructive: true }
      ]}
    >
      <Card 
        className={cn(
          "bg-card border border-border/60 rounded-xl overflow-hidden transition-all relative group h-full flex flex-col shadow-xl",
          selected ? "ring-1 ring-primary border-primary/40 shadow-2xl" : "hover:border-primary/20",
        )}
      >
        <CardContent className="p-0 flex flex-col flex-1">
          {/* Header Pulse */}
          <div className="p-4 flex flex-col gap-3 border-b border-border/40 bg-muted/10">
            <div className="flex items-center justify-between">
              <div 
                onClick={(e) => { e.stopPropagation(); onToggleSelect?.(record.id); }}
                className={cn(
                  "h-5 w-5 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-inner",
                  selected ? "bg-primary border-primary" : "border-border/40 bg-background"
                )}
              >
                {selected && <Check className="h-3.5 w-3.5 text-black stroke-[4]" />}
              </div>
              
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1 rounded border",
                  syncStatus === 'synced' ? "bg-green-500/10 border-green-500/20 text-green-600" : "bg-blue-500/10 border-blue-500/20 text-blue-600"
                )}>
                  {syncStatus === 'synced' ? <Globe className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
                </div>
                <button onClick={onToggleExpand} className="p-1 hover:bg-primary/10 rounded-lg text-muted-foreground/40 hover:text-primary transition-all">
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="bg-primary/10 border-primary/20 text-primary text-[7px] font-black uppercase h-5 px-2 flex items-center gap-1">
                <ShieldCheck className="h-2.5 w-2.5" /> {grantName}
              </Badge>
              <Badge variant="secondary" className="bg-muted/50 border-border/40 text-[7px] font-black uppercase h-5 px-2 flex items-center gap-1">
                <FolderOpen className="h-2.5 w-2.5 opacity-60" /> {record.sourceSheet}
              </Badge>
            </div>

            <InlineField 
              label="Asset Name" 
              value={String(record.rawRow.description || 'Untitled Asset')} 
              onSave={(v) => onQuickUpdate?.(record.id, { description: v })} 
              icon={Tag}
              disabled={!canEditBase}
            />
          </div>

          {/* Core Location Pulse */}
          <div className="p-4 grid grid-cols-2 gap-4 bg-background">
            <InlineField 
              label="Location" 
              value={String(record.rawRow.location || 'Global')} 
              onSave={(v) => onQuickUpdate?.(record.id, { location: v })} 
              icon={MapPin}
              disabled={!canEditBase}
            />
            <InlineField 
              label="LGA" 
              value={String(record.rawRow.lga || 'N/A')} 
              onSave={(v) => onQuickUpdate?.(record.id, { lga: v })} 
              icon={Building}
              disabled={!canEditBase}
            />
          </div>

          {/* Technical Data Grid (Remaining 7-slice) */}
          <div className="divide-y divide-border/20 bg-muted/5 flex-1">
            {activeHeaders
              .filter(h => !['description', 'location', 'lga'].includes(h.normalizedName))
              .map((header) => {
                const field = record.fields.find(f => f.headerId === header.id);
                return (
                  <div key={header.id} className="px-4 py-2 flex items-center justify-between gap-4 group/field">
                    <span className="text-[7px] font-black uppercase text-muted-foreground opacity-40 shrink-0 group-hover/field:text-primary transition-colors">
                      {header.displayName}
                    </span>
                    <p className="text-[9px] font-bold uppercase text-foreground/80 truncate text-right">
                      {field?.displayValue || '---'}
                    </p>
                  </div>
                );
              })}
          </div>

          {/* Verification Hub */}
          {isVerificationMode && (
            <div className="p-4 bg-muted/20 border-t border-border/20 space-y-3">
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={() => onQuickUpdate?.(record.id, { status: status === 'VERIFIED' ? 'UNVERIFIED' : 'VERIFIED' })}
                  className={cn(
                    "flex-1 h-9 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-md",
                    status === 'VERIFIED' 
                      ? "bg-green-600 hover:bg-green-500 text-white" 
                      : "bg-red-600 hover:bg-red-500 text-white"
                  )}
                >
                  {status === 'VERIFIED' ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : <XCircle className="mr-1.5 h-3.5 w-3.5" />}
                  {status === 'VERIFIED' ? 'Verified' : 'Verify Asset'}
                </Button>

                <Select 
                  value={String(record.rawRow.condition || '')} 
                  onValueChange={(v) => onQuickUpdate?.(record.id, { condition: v })}
                >
                  <SelectTrigger className="flex-1 h-9 bg-background border-border/40 text-[9px] font-black uppercase rounded-xl">
                    <SelectValue placeholder="Condition" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    {ASSET_CONDITIONS.map(c => (
                      <SelectItem key={c} value={c} className="text-[9px] font-bold uppercase">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Input 
                    placeholder="Field observations..." 
                    className={cn(
                      "h-9 text-[9px] font-medium bg-background border-border/40 pr-10 rounded-xl transition-all",
                      hasUnsavedRemark && "border-primary/40 ring-1 ring-primary/10"
                    )}
                    value={localRemark}
                    onChange={(e) => setLocalRemark(e.target.value)}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
                    <Edit3 className="h-3.5 w-3.5" />
                  </div>
                </div>
                <AnimatePresence>
                  {hasUnsavedRemark && (
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                      <Button 
                        size="icon" 
                        onClick={handleSaveRemark}
                        className="h-9 w-9 rounded-xl bg-primary text-black shadow-lg hover:scale-105 transition-transform"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TactileMenu>
  );
}
