'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/lib/error-emitter';
import type { FirestorePermissionError } from '@/lib/errors';

export function FirebaseErrorListener() {
  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // Throwing the error here will cause it to be caught by Next.js's
      // development error overlay, providing rich debugging information.
      throw error;
    };

    const unsubscribe = errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      unsubscribe();
    };
  }, []);

  return null; // This component doesn't render anything
}
