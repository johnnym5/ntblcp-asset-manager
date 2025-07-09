
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page is no longer used for login, it just redirects to the main app.
export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/assets');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
