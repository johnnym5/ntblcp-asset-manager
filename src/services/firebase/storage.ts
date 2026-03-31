
'use client';

/**
 * @fileOverview Firebase Storage Service.
 * Manages professional persistence for asset visual evidence.
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

    // Extract mime type and actual data
    const formatMatch = base64Data.match(/^data:(image\/[a-z]+);base64,/);
    if (!formatMatch) throw new Error("Invalid image format pulse.");

    const storageRef = ref(storage, `assets/${grantId}/${assetId}/evidence.jpg`);
    
    try {
      // Use 'data_url' format for uploadString
      const snapshot = await uploadString(storageRef, base64Data, 'data_url');
      const downloadUrl = await getDownloadURL(snapshot.ref);
      logger.info(`Storage: Uploaded evidence for asset [${assetId}]`);
      return downloadUrl;
    } catch (e) {
      logger.error("Storage: Failed to upload evidence pulse", e);
      throw e;
    }
  },

  /**
   * Removes an asset photo from storage.
   */
  async deleteAssetPhoto(grantId: string, assetId: string): Promise<void> {
    if (!storage) return;
    const storageRef = ref(storage, `assets/${grantId}/${assetId}/evidence.jpg`);
    try {
      await deleteObject(storageRef);
    } catch (e) {
      // Ignore if file doesn't exist
      logger.warn(`Storage: Could not delete photo for asset [${assetId}]`);
    }
  }
};
