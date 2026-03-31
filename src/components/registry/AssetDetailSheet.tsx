/**
 * @fileOverview AssetDetailSheet - High-Fidelity Detail Workstation.
 * Phase 57: Integrated Forensic Verification Receipt (Signature & GPS).
 */

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, 
  ChevronRight, 
  Edit3, 
  Share2, 
  Trash2, 
  Tag, 
  MapPin, 
  User, 
  Calendar, 
  History, 
  Info,
  Database,
  ShieldCheck,
  X,
  Camera,
  Navigation,
  FileDown,
  Loader2,
  PenTool
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetRecord, RegistryFieldValue } from '@/types/registry';
import type { Asset } from '@/types/domain';
import { PdfService } from '@/services/pdf-service';

interface AssetDetailSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  record?: AssetRecord;
  onEdit: (id: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

const DetailField = ({ label, value, icon: Icon, isFullWidth = false }: { label: string, value: string, icon?: any, isFullWidth?: boolean }) => (
  <div className={cn(
    "p-5 rounded-[1.5rem] bg-muted/30 border-2 border-transparent hover:border-primary/10 transition-all space-y-1.5",
    isFullWidth ? "col-span-2" : "col-span-1"
  )}>
    <div className="flex items-center gap-2 opacity-40">
      {Icon && <Icon className="h-2.5 w-2.5" />}
      <span className="text-[8px] font-black uppercase tracking-[0.2em]">{label}</span>
    </div>
    <div className="text-sm font-black uppercase tracking-tight text-foreground leading-tight">
      {value || '---'}
    </div>
  </div>
);

export function AssetDetailSheet({ isOpen, onOpenChange, record, onEdit, onNext, onPrevious }: AssetDetailSheetProps) {
  const [isExporting, setIsExporting] = useState(false);

  if (!record) return null;
  const asset = record.rawRow as unknown as Asset;

  const getFieldValue = (normalizedName: string) => {
    const field = record.fields.find(f => {
      const header = record.headers.find(h => h.id === f.headerId);
      return header?.normalizedName === normalizedName;
    });
    return field?.displayValue || '---';
  };

  const handlePdfExport = async () => {
    setIsExporting(true);
    try {
      await PdfService.exportTechnicalProfile(asset);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 border-none rounded-l-[2.5rem] shadow-2xl bg-background overflow-hidden">
        {/* Navigation Strip */}
        <div className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl h-10 w-10">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight uppercase leading-none truncate max-w-[180px]">
                {record.sn || record.id.split('-')[0]} Pulse
              </span>
              <span className="text-[8px] font-black uppercase text-muted-foreground tracking-[0.2em] mt-1 opacity-60">Record Analysis</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted/50 rounded-xl p-1">
              <Button variant="ghost" size="icon" onClick={onPrevious} disabled={!onPrevious} className="h-8 w-8 rounded-lg"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={onNext} disabled={!onNext} className="h-8 w-8 rounded-lg"><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <Button variant="ghost" size="icon" onClick={handlePdfExport} disabled={isExporting} className="text-primary h-10 w-10 rounded-xl hover:bg-primary/10">
              {isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(record.id)} className="text-primary h-10 w-10 rounded-xl hover:bg-primary/10"><Edit3 className="h-5 w-5" /></Button>
          </div>
        </div>

        <ScrollArea className="flex-1 bg-background custom-scrollbar">
          <div className="pb-32">
            {/* Visual Evidence Pulse */}
            {(asset.photoUrl || asset.photoDataUri) && (
              <div className="px-8 pt-8">
                <div className="relative group aspect-video bg-muted rounded-[2rem] overflow-hidden border-2 border-primary/10 shadow-lg">
                  <img src={asset.photoUrl || asset.photoDataUri} className="w-full h-full object-cover" alt="Asset Evidence" />
                  <Badge className="absolute bottom-4 left-4 bg-primary/90 backdrop-blur-md font-black uppercase text-[8px] tracking-[0.2em] px-3 h-6 rounded-lg">
                    <Camera className="h-3 w-3 mr-2" /> VERIFIED VISUAL PULSE
                  </Badge>
                </div>
              </div>
            )}

            {/* Primary ID Pulse */}
            <div className="p-8 space-y-6">
              <div className="flex flex-col gap-2">
                <Badge variant="outline" className="w-fit h-6 px-3 text-[8px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary">
                  {record.sectionName || 'Primary Asset'}
                </Badge>
                <h2 className="text-3xl font-black tracking-tighter uppercase text-foreground leading-none">
                  {getFieldValue('asset_description')}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DetailField label="Tag ID Code" value={getFieldValue('asset_id_code')} icon={Tag} />
                <DetailField label="Manufacturer Serial" value={getFieldValue('serial_number')} icon={ShieldCheck} />
              </div>
            </div>

            {/* Spatial Pulse */}
            {asset.geotag && (
              <>
                <div className="px-8 py-4 bg-muted/20 border-y border-border/40 flex items-center gap-3">
                  <Navigation className="h-4 w-4 text-primary opacity-60" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Spatial Field Protocol</h4>
                </div>
                <div className="p-8 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <DetailField label="Latitude Anchor" value={asset.geotag.lat.toFixed(6)} icon={MapPin} />
                    <DetailField label="Longitude Anchor" value={asset.geotag.lng.toFixed(6)} icon={MapPin} />
                  </div>
                  <div className="p-5 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[8px] font-black uppercase opacity-40">Anchor Precision</span>
                      <p className="text-xs font-bold text-primary">+/- {Math.round(asset.geotag.accuracy)} Meters</p>
                    </div>
                    <Badge variant="outline" className="h-6 px-2 text-[8px] font-black uppercase border-primary/20">Verified GPS Pulse</Badge>
                  </div>
                </div>
              </>
            )}

            {/* Forensic Receipt Pulse */}
            <div className="px-8 py-4 bg-muted/20 border-y border-border/40 flex items-center gap-3">
              <PenTool className="h-4 w-4 text-primary opacity-60" />
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Verification Receipt</h4>
            </div>
            <div className="p-8">
              <div className="p-6 rounded-[2rem] bg-card border-2 border-dashed border-border/40 shadow-inner flex flex-col items-center justify-center text-center">
                {asset.signatureUrl || asset.signatureDataUri ? (
                  <div className="space-y-4 w-full">
                    <img src={asset.signatureUrl || asset.signatureDataUri} className="max-h-24 mx-auto mix-blend-multiply opacity-80" alt="Custodian Signature" />
                    <div className="h-px bg-border/40 w-1/2 mx-auto" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Custodian Signature Anchor</p>
                  </div>
                ) : (
                  <div className="py-6 opacity-20 space-y-2">
                    <PenTool className="h-10 w-10 mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No Signature Captured</p>
                  </div>
                )}
              </div>
            </div>

            {/* Regional Pulse */}
            <div className="px-8 py-4 bg-muted/20 border-y border-border/40 flex items-center gap-3">
              <MapPin className="h-4 w-4 text-primary opacity-60" />
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Regional Scope & Context</h4>
            </div>
            <div className="p-8 grid grid-cols-2 gap-4">
              <DetailField label="Physical Location" value={getFieldValue('location')} icon={MapPin} />
              <DetailField label="Assigned Auditor" value={getFieldValue('assignee_location')} icon={User} />
              <DetailField label="Field Condition" value={getFieldValue('condition')} icon={History} />
              <DetailField label="Verification Status" value={getFieldValue('verification_status')} icon={ShieldCheck} />
            </div>

            {/* Source Provenance Pulse */}
            <div className="px-8 py-4 bg-muted/20 border-y border-border/40 flex items-center gap-3">
              <Info className="h-4 w-4 text-primary opacity-60" />
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Fidelity & Provenance</h4>
            </div>
            <div className="p-8 grid grid-cols-2 gap-4 opacity-60">
              <DetailField label="Source Sheet" value={record.sourceSheet || '---'} />
              <DetailField label="Source Row" value={String(record.sourceRow || '---')} />
              <DetailField label="Temporal Subsection" value={record.subsectionName || '---'} />
              <DetailField label="Asset Family" value={record.assetFamily || '---'} />
            </div>

            {/* Remarks Pulse */}
            <div className="p-8 border-t border-dashed">
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-0.3em opacity-40">Auditor Field Remarks</label>
                <div className="p-6 rounded-[2rem] bg-muted/10 border-2 border-dashed font-medium text-xs leading-relaxed italic">
                  {getFieldValue('remarks') || 'Zero supplementary pulses recorded for this entry.'}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="p-8 bg-background/80 backdrop-blur-xl border-t flex flex-row items-center gap-3 absolute bottom-0 left-0 right-0 z-40">
          <SheetClose asChild>
            <Button variant="ghost" className="flex-1 h-14 font-black uppercase text-[10px] tracking-widest rounded-2xl">Close Profile</Button>
          </SheetClose>
          <Button 
            onClick={() => onEdit(record.id)}
            className="flex-1 h-14 font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-primary/30 rounded-2xl bg-primary text-primary-foreground"
          >
            Audit Record
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
