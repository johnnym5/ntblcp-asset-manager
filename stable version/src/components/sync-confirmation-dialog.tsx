
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
import { CloudUpload, Edit, Plus, Save } from 'lucide-react';

export interface SyncSummary {
  newFromCloud: Asset[];
  updatedFromCloud: Asset[];
  keptLocal: Asset[];
  toUpload: Asset[];
  type: 'download' | 'upload';
}

interface SyncConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  summary: SyncSummary | null;
}

const SummarySection = ({ title, assets, color, icon }: { title: string; assets: Asset[]; color: string; icon: React.ReactNode }) => {
    if (assets.length === 0) return null;
    return (
        <div>
            <h4 className={`font-semibold text-sm flex items-center gap-2 ${color}`}>
                {icon} {assets.length} {title}
            </h4>
            <ul className="text-xs text-muted-foreground list-disc pl-5 mt-1 max-h-24 overflow-y-auto">
                {assets.slice(0, 10).map(asset => (
                    <li key={asset.id} className="truncate">{asset.description || 'Untitled Asset'}</li>
                ))}
                {assets.length > 10 && <li>...and {assets.length - 10} more.</li>}
            </ul>
        </div>
    );
};


export function SyncConfirmationDialog({ isOpen, onOpenChange, onConfirm, summary }: SyncConfirmationDialogProps) {
  if (!summary) return null;
  
  const isDownload = summary.type === 'download';
  const totalDownloadChanges = summary.newFromCloud.length + summary.updatedFromCloud.length;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm {isDownload ? 'Download' : 'Upload'}</AlertDialogTitle>
          <AlertDialogDescription>
            Review the changes that will be applied.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-4 py-2">
                {isDownload ? (
                    <>
                        <SummarySection title="New Assets from Cloud" assets={summary.newFromCloud} color="text-blue-600 dark:text-blue-400" icon={<Plus />} />
                        <SummarySection title="Assets to be Updated" assets={summary.updatedFromCloud} color="text-yellow-600 dark:text-yellow-400" icon={<Edit />} />
                        <SummarySection title="Local Changes to Keep (Newer)" assets={summary.keptLocal} color="text-green-600 dark:text-green-400" icon={<Save />} />
                    </>
                ) : (
                    <SummarySection title="Local Changes to Upload" assets={summary.toUpload} color="text-purple-600 dark:text-purple-400" icon={<CloudUpload />} />
                )}
            </div>
        </ScrollArea>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isDownload ? totalDownloadChanges === 0 : summary.toUpload.length === 0}>
            {isDownload ? `Download ${totalDownloadChanges} Changes` : `Upload ${summary.toUpload.length} Changes`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

    
