'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import AppLayout from '@/components/app-layout';
import CollaborationRoom from '@/components/collaboration-room';
import { Loader2 } from 'lucide-react';

export default function RoomDetailsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!roomId) {
     return (
      <AppLayout>
        <div className="flex flex-1 items-center justify-center">
            <p>Invalid Room ID.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <CollaborationRoom roomId={roomId} />
    </AppLayout>
  );
}
