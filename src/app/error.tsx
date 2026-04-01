'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/20">
      <Card className="max-w-md w-full border-2 border-destructive/20 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="p-3 bg-destructive/10 rounded-full w-fit mx-auto mb-4">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">System Pulse Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground text-sm leading-relaxed italic">
            "An unexpected anomaly was detected in the registry stream. The system is standing by for recovery."
          </p>
          <div className="p-4 rounded-lg bg-muted/50 border font-mono text-[10px] break-words">
            {error.message || "Unknown deterministic pulse failure."}
          </div>
          <div className="flex flex-col gap-3">
            <Button 
              onClick={reset}
              className="w-full h-12 rounded-xl font-bold gap-2"
            >
              <RotateCcw className="h-4 w-4" /> Attempt Recovery
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="w-full h-12 rounded-xl font-bold gap-2"
            >
              <Home className="h-4 w-4" /> Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
