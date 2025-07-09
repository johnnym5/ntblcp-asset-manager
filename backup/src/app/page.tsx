'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/assets');
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </main>
  );
}
