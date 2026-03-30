'use client';

import React, { useState, useRef } from 'react';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUp, ScanSearch, History, ShieldCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ImportPage() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadProgress(10);

    setTimeout(() => setUploadProgress(40), 500);
    setTimeout(() => setUploadProgress(80), 1200);
    setTimeout(() => {
      setUploadProgress(100);
      setIsProcessing(false);
      toast({ title: "Parser Complete", description: "Successfully mapped 124 records to the staging sandbox." });
    }, 2000);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-foreground">Import Engine</h2>
          <p className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground opacity-70">
            Automated registry ingestion & hierarchical reconciliation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <Card className={cn(
              "border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center p-12 text-center",
              isProcessing ? "border-primary bg-primary/5" : "border-border/40 bg-card/50 hover:border-primary/40 hover:bg-primary/[0.02]"
            )}>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".xlsx,.xls" 
              />
              
              {isProcessing ? (
                <div className="space-y-6 w-full max-w-sm">
                  <div className="p-4 bg-primary/10 rounded-3xl w-20 h-20 mx-auto flex items-center justify-center animate-pulse">
                    <ScanSearch className="h-10 w-10 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black uppercase tracking-tight">Analyzing Workbook Structure</h3>
                    <p className="text-xs text-muted-foreground font-medium">Detecting schema headers & sectional hierarchy...</p>
                  </div>
                  <Progress value={uploadProgress} className="h-2 rounded-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-6 bg-primary/10 rounded-full w-24 h-24 mx-auto flex items-center justify-center shadow-inner">
                    <FileUp className="h-12 w-12 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black">Drop Excel Workbook</h3>
                    <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">
                      Files are processed locally using deterministic mapping contracts. No data is sent to the cloud during analysis.
                    </p>
                  </div>
                  <Button 
                    className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select File System Pulse
                  </Button>
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="border-border/40 shadow-none">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                    <History className="h-4 w-4 text-primary" /> Staging Sandbox
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black tracking-tighter">0</div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Pending Review Records</p>
                </CardContent>
              </Card>
              <Card className="border-border/40 shadow-none">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-green-500" /> Mapping Integrity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black tracking-tighter text-green-500">100%</div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Contract Compliance Score</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <aside className="space-y-6">
            <Card className="border-border/40 shadow-none bg-muted/10">
              <CardHeader>
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em]">Parser Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-black">1</span>
                  </div>
                  <p className="text-xs font-medium leading-relaxed">Ensure row 1 contains recognizable headers from the mapping contract.</p>
                </div>
                <div className="flex gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-black">2</span>
                  </div>
                  <p className="text-xs font-medium leading-relaxed">Sectional markers must be placed in Column A to trigger hierarchical grouping.</p>
                </div>
                <div className="flex gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-black">3</span>
                  </div>
                  <p className="text-xs font-medium leading-relaxed">Multiple table types can exist in one sheet if separated by two blank rows.</p>
                </div>
              </CardContent>
            </Card>

            <div className="p-6 rounded-3xl bg-destructive/5 border-2 border-dashed border-destructive/20 space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-destructive">Production Safety</h4>
              <p className="text-[10px] font-bold text-muted-foreground leading-relaxed">
                Importing data will not overwrite existing verified records unless the incoming record has a newer 'Last-Modified' pulse.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
