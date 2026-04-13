/**
 * @fileOverview RegistryCard - High-Density UI Pulse.
 * Phase 1407: Integrated high-speed verification controls (Red/Green Toggle, Condition, Remarks).
 * Phase 1408: Added Folder Badge for combined project context.
 * Phase 1409: Added Project Name to header for multi-grant clarity.
 * Phase 1410: Implemented Explicit Save button for Remarks input.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Globe, CloudOff, Maximize2, CheckCircle2, XCircle, Edit3, FolderOpen, ShieldCheck, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';
import { useAppState } from '@/contexts/app-state-context';
import { useLongPress } from '@/hooks/use-long-press';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ASSET_CONDITIONS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';

interface RegistryCardProps {
  record: AssetRecord;
  onInspect: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onToggleExpand?: () => void;
  onQuickUpdate?: (id: string, updates: any) => void;
  densityMode?: 'compact' | 'comfortable' | 'expanded';
}

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
  const activeHeaders = globalHeaders.filter(h => h.quickView);
  const forcedFieldNames = ['condition', 'remarks', 'status', 'verified_status'];
  
  const descriptionField = record.fields.find(f => {
    const h = record.headers.find(header => header.id === f.headerId);
    return h?.normalizedName === 'asset_description';
  });

  const tagField = record.fields.find(f => {
    const h = record.headers.find(header => header.id === f.headerId);
    return h?.normalizedName === 'asset_id_code';
  });

  const status = String(record.rawRow.status || 'UNVERIFIED').toUpperCase();
  const syncStatus = (record.rawRow as any).syncStatus || 'local';
  const grantId = (record.rawRow as any).grantId;
  const grantName = appSettings?.grants.find(g => g.id === grantId)?.name || 'Registry';

  const longPressProps = useLongPress(() => {
    onToggleSelect?.(record.id);
  });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onToggleSelect?.(record.id);
  };

  const handleSaveRemark = () => {
    onQuickUpdate?.(record.id, { remarks: localRemark });
  };

  const hasUnsavedRemark = localRemark !== (record.rawRow.remarks || '');

  return (
    <Card 
      className={cn(
        "bg-card border border-border/60 rounded-xl overflow-hidden transition-all relative group h-full flex flex-col",
        selected ? "ring-1 ring-primary border-primary/40 shadow-2xl" : "hover:border-primary/20 shadow-sm",
      )}
      {...longPressProps}
      onContextMenu={handleContextMenu}
    >
      <CardContent className="p-0 flex flex-col flex-1">
        {/* Header Pulse */}
        <div className="p-3.5 flex flex-col gap-1 border-b border-border/40 cursor-pointer" onClick={onToggleExpand}>
          <div className="flex items-center justify-between mb-1.5">
            <div 
              onClick={(e) => { e.stopPropagation(); onToggleSelect?.(record.id); }}
              className={cn(
                "h-4.5 w-4.5 rounded-lg border transition-all flex items-center justify-center",
                selected ? "bg-primary border-primary" : "border-border/40"
              )}
            >
              {selected && <Check className="h-3 w-3 text-black stroke-[4]" />}
            </div>
            
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-0.5 rounded border",
                syncStatus === 'synced' ? "bg-green-500/10 border-green-500/20 text-green-600" : "bg-blue-500/10 border-blue-500/20 text-blue-600"
              )}>
                {syncStatus === 'synced' ? <Globe className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
              </div>
              <Maximize2 className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </div>
          </div>

          <div className="mb-1 flex flex-wrap gap-1">
            <Badge variant="secondary" className="bg-primary/10 border-primary/20 text-primary text-[7px] font-black uppercase tracking-tighter h-4.5 px-1.5 flex items-center gap-1">
              <ShieldCheck className="h-2 w-2" />
              {grantName}
            </Badge>
            <Badge variant="secondary" className="bg-muted/50 border-border/40 text-[7px] font-black uppercase tracking-tighter h-4.5 px-1.5 gap-1">
              <FolderOpen className="h-2.5 w-2.5 text-primary opacity-60" />
              {record.sourceSheet}
            </Badge>
          </div>

          <h4 className="text-[12px] font-black uppercase text-foreground truncate leading-tight tracking-tight">
            {descriptionField?.displayValue || 'Untitled Asset'}
          </h4>
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">{tagField?.displayValue || 'NO TAG'}</span>
        </div>

        {/* Data Grid */}
        <div className="divide-y divide-border/40 bg-white/[0.01] flex-1">
          {activeHeaders
            .filter(h => h.normalizedName !== 'asset_description' && h.normalizedName !== 'asset_id_code')
            .filter(h => isVerificationMode || !forcedFieldNames.includes(h.normalizedName))
            .slice(0, densityMode === 'compact' ? 2 : 3)
            .map((header) => {
              const field = record.fields.find(f => f.headerId === header.id);
              return (
                <div key={header.id} className="px-3.5 py-2 flex items-center justify-between gap-4 group/field">
                  <span className="text-[7px] font-black uppercase text-muted-foreground opacity-40 shrink-0 group-hover/field:text-primary transition-colors">
                    {header.displayName}
                  </span>
                  <p className="text-[10px] font-bold uppercase text-foreground/80 truncate text-right">
                    {field?.displayValue || '---'}
                  </p>
                </div>
              );
            })}
        </div>

        {/* Verification Hub */}
        {isVerificationMode && (
          <div className="p-3 bg-muted/20 border-t border-border/20 space-y-2.5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                onClick={() => onQuickUpdate?.(record.id, { status: status === 'VERIFIED' ? 'UNVERIFIED' : 'VERIFIED' })}
                className={cn(
                  "flex-1 h-8 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all shadow-md",
                  status === 'VERIFIED' 
                    ? "bg-green-600 hover:bg-green-500 text-white" 
                    : "bg-red-600 hover:bg-red-500 text-white"
                )}
              >
                {status === 'VERIFIED' ? <CheckCircle2 className="mr-1.5 h-3 w-3" /> : <XCircle className="mr-1.5 h-3 w-3" />}
                {status === 'VERIFIED' ? 'Verified' : 'Unverified'}
              </Button>

              <Select 
                value={String(record.rawRow.condition || '')} 
                onValueChange={(v) => onQuickUpdate?.(record.id, { condition: v })}
              >
                <SelectTrigger className="flex-1 h-8 bg-background border-border/40 text-[9px] font-black uppercase">
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
              <div className="relative flex-1 group/remark">
                <Input 
                  placeholder="Field observations..." 
                  className={cn(
                    "h-8 text-[9px] font-medium bg-background border-border/40 pr-8 transition-all",
                    hasUnsavedRemark && "border-primary/40 ring-1 ring-primary/20"
                  )}
                  value={localRemark}
                  onChange={(e) => setLocalRemark(e.target.value)}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-20">
                  <Edit3 className="h-3 w-3" />
                </div>
              </div>
              <AnimatePresence>
                {hasUnsavedRemark && (
                  <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                    <Button 
                      size="icon" 
                      onClick={handleSaveRemark}
                      className="h-8 w-8 rounded-lg bg-primary text-black shadow-lg"
                    >
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
