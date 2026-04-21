'use client';

/**
 * @fileOverview Firebase Storage Service.
 * Manages professional persistence for asset visual evidence and signatures.
 */

import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { logger } from '@/lib/logger';

export const FirebaseStorageService = {
  /**
   * Uploads a base64 asset photo to storage.
   * Path follows the structure: assets/{grantId}/{assetId}/evidence.jpg
   */
  async uploadAssetPhoto(grantId: string, assetId: string, base64Data: string): Promise<string> {
    if (!storage) throw new Error("Storage service unavailable.");

    const storageRef = ref(storage, `assets/${grantId}/${assetId}/evidence.jpg`);
    
    try {
      const snapshot = await uploadString(storageRef, base64Data, 'data_url');
      const downloadUrl = await getDownloadURL(snapshot.ref);
      logger.info(`Storage: Uploaded evidence for asset [${assetId}]`);
      return downloadUrl;
    } catch (e) {
      logger.error("Storage: Failed to upload evidence file", e);
      throw e;
    }
  },

  /**
   * Uploads a base64 signature to storage.
   * Path follows the structure: assets/{grantId}/{assetId}/signature.png
   */
  async uploadAssetSignature(grantId: string, assetId: string, base64Data: string): Promise<string> {
    if (!storage) throw new Error("Storage service unavailable.");

    const storageRef = ref(storage, `assets/${grantId}/${assetId}/signature.png`);
    
    try {
      const snapshot = await uploadString(storageRef, base64Data, 'data_url');
      const downloadUrl = await getDownloadURL(snapshot.ref);
      logger.info(`Storage: Uploaded signature for asset [${assetId}]`);
      return downloadUrl;
    } catch (e) {
      logger.error("Storage: Failed to upload signature file", e);
      throw e;
    }
  },

  /**
   * Removes asset media from storage.
   */
  async deleteAssetMedia(grantId: string, assetId: string): Promise<void> {
    if (!storage) return;
    const photoRef = ref(storage, `assets/${grantId}/${assetId}/evidence.jpg`);
    const signRef = ref(storage, `assets/${grantId}/${assetId}/signature.png`);
    try {
      await Promise.all([
        deleteObject(photoRef).catch(() => {}),
        deleteObject(signRef).catch(() => {})
      ]);
    } catch (e) {
      logger.warn(`Storage: Cleanup failed for asset [${assetId}]`);
    }
  }
};
