'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-[#0F172A] p-6 text-white font-sans">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="p-6 bg-red-500/10 rounded-3xl border border-red-500/20 inline-block">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black uppercase tracking-tighter">Critical Failure</h1>
            <p className="text-sm text-white/60 font-medium italic">&quot;Registry terminal protocol interrupted by a global exception.&quot;</p>
          </div>
          <div className="p-6 bg-black/40 rounded-2xl border border-white/5 font-mono text-[10px] text-left opacity-80 overflow-hidden">
            {error.message}
          </div>
          <Button 
            onClick={reset}
            className="w-full h-16 bg-white text-black hover:bg-white/90 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl"
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Re-Initialize Pulse
          </Button>
        </div>
      </body>
    </html>
  );
}
