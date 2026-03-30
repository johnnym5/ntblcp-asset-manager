'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Asset } from '@/lib/types';
import { CloudUpload, Edit, Plus, Save, Trash2, ArrowRight } from 'lucide-react';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

export interface SyncSummary {
  newFromCloud: Asset[];
  updatedFromCloud: Asset[];
  keptLocal: Asset[];
  toUpload: Asset[];
  deletedOnCloud?: Asset[];
  type: 'download' | 'upload';
}

interface SyncConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  summary: SyncSummary | null;
}

const SummarySection = ({ title, assets, color, icon, description }: { title: string; assets: Asset[]; color: string; icon: React.ReactNode, description: string }) => {
    if (assets.length === 0) return null;
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className={`font-black text-xs uppercase tracking-widest flex items-center gap-3 ${color}`}>
                    <div className="p-1.5 rounded-lg bg-current/10">{icon}</div>
                    {assets.length} {title}
                </h4>
                <Badge variant="outline" className="text-[9px] font-bold h-5 uppercase">{description}</Badge>
            </div>
            <div className="rounded-2xl border-2 border-dashed bg-muted/5 p-4">
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                    {assets.map(asset => (
                        <div key={asset.id} className="flex items-center justify-between gap-4 py-1.5 border-b last:border-0 border-border/40">
                            <div className="flex flex-col min-w-0">
                                <span className="text-[11px] font-black truncate text-foreground">{asset.description || 'Untitled Registry Record'}</span>
                                <span className="text-[9px] font-bold text-muted-foreground uppercase truncate tracking-tighter">
                                    {asset.category} &bull; TAG: {asset.assetIdCode || asset.sn || 'N/A'}
                                </span>
                            </div>
                            <Badge variant="secondary" className="shrink-0 text-[8px] h-4 font-mono">{asset.location || 'GLOBAL'}</Badge>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


export function SyncConfirmationDialog({ isOpen, onOpenChange, onConfirm, summary }: SyncConfirmationDialogProps) {
  if (!summary) return null;
  
  const isDownload = summary.type === 'download';
  const totalDownloadChanges = (summary.newFromCloud?.length || 0) + (summary.updatedFromCloud?.length || 0) + (summary.deletedOnCloud?.length || 0);

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl rounded-3xl border-primary/10 p-0 overflow-hidden shadow-2xl">
        <div className="p-8 pb-4 bg-muted/30 border-b">
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-3 text-3xl font-black tracking-tight text-foreground">
                    {isDownload ? <Plus className="text-blue-500 h-8 w-8" /> : <CloudUpload className="text-primary h-8 w-8" />}
                    Confirm Registry {isDownload ? 'Pull' : 'Push'}
                </AlertDialogTitle>
                <AlertDialogDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
                    Review state modifications before {isDownload ? 'local injection' : 'cloud broadcast'}.
                </AlertDialogDescription>
            </AlertDialogHeader>
        </div>

        <ScrollArea className="max-h-[60vh] px-8 py-6 bg-background">
            <div className="space-y-8">
                {isDownload ? (
                    <>
                        <SummarySection 
                            title="New Cloud Assets" 
                            assets={summary.newFromCloud} 
                            color="text-blue-600" 
                            icon={<Plus className="h-4 w-4" />}
                            description="Registration"
                        />
                        <SummarySection 
                            title="Modified Assets" 
                            assets={summary.updatedFromCloud} 
                            color="text-orange-600" 
                            icon={<Edit className="h-4 w-4" />}
                            description="Evolution"
                        />
                        <SummarySection 
                            title="Conflict Protected" 
                            assets={summary.keptLocal} 
                            color="text-green-600" 
                            icon={<Save className="h-4 w-4" />}
                            description="Integrity"
                        />
                        <SummarySection 
                            title="Deletions Detected" 
                            assets={summary.deletedOnCloud || []} 
                            color="text-destructive" 
                            icon={<Trash2 className="h-4 w-4" />}
                            description="Purge"
                        />
                    </>
                ) : (
                    <SummarySection 
                        title="Local Sync Items" 
                        assets={summary.toUpload} 
                        color="text-primary" 
                        icon={<CloudUpload className="h-4 w-4" />}
                        description="Submission"
                    />
                )}
            </div>
        </ScrollArea>

        <AlertDialogFooter className="p-8 bg-muted/10 border-t flex flex-row items-center gap-4">
          <AlertDialogCancel className="flex-1 h-12 font-bold rounded-2xl m-0">Cancel Sync</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            disabled={isDownload ? totalDownloadChanges === 0 : summary.toUpload.length === 0}
            className="flex-1 h-12 font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-primary/20 m-0"
          >
            {isDownload ? `Synchronize ${totalDownloadChanges} Changes` : `Broadcast ${summary.toUpload.length} Changes`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
