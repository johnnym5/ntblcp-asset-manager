'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RotateCcw, Home, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { toast } = useToast();
  const [hasCopied, setHasCopied] = React.useState(false);

  const handleCopyError = () => {
    navigator.clipboard.writeText(error.message);
    setHasCopied(true);
    toast({ title: "Error Details Copied" });
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/20">
      <Card className="max-w-md w-full border-2 border-destructive/20 shadow-xl rounded-[2rem] overflow-hidden">
        <CardHeader className="text-center pb-2 bg-muted/30 p-8 border-b">
          <div className="p-3 bg-destructive/10 rounded-full w-fit mx-auto mb-4">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-black uppercase tracking-tight">Application Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 p-8">
          <p className="text-center text-muted-foreground text-sm font-medium leading-relaxed italic opacity-60">
            &quot;An unexpected error occurred in the application. Please try refreshing the page.&quot;
          </p>
          
          <div className="relative group">
            <div className="p-6 rounded-2xl bg-black border-2 border-dashed border-white/5 font-mono text-[10px] break-words pr-12 text-white/40">
              {error.message || "Unknown application failure."}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleCopyError}
              className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-white/5 hover:bg-primary/10 text-white/20 hover:text-primary transition-all opacity-0 group-hover:opacity-100"
            >
              {hasCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              onClick={reset}
              className="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-primary text-black shadow-xl shadow-primary/20"
            >
              <RotateCcw className="h-4 w-4" /> Refresh Page
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 border-2"
            >
              <Home className="h-4 w-4" /> Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
