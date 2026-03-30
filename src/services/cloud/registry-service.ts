/**
 * @fileOverview Firestore Service Abstraction.
 * Decouples the registry logic from the Firebase SDK.
 */

import { doc, collection, getDocs, setDoc, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Asset } from '@/types/domain';
import { validateAsset } from '@/core/registry/validation';

export class RegistryService {
  private static collectionName = 'assets';

  /**
   * Fetches assets for a specific project with strict typing.
   */
  static async getProjectAssets(grantId: string): Promise<Asset[]> {
    if (!db) throw new Error("Cloud Database Offline");

    const q = query(collection(db, this.collectionName), where('grantId', '==', grantId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      // Ensure data integrity during retrieval
      return validateAsset({ ...data, id: doc.id }) as Asset;
    });
  }

  /**
   * Single record update with atomic timestamping.
   */
  static async updateAsset(asset: Asset): Promise<void> {
    if (!db) throw new Error("Cloud Database Offline");
    
    const docRef = doc(db, this.collectionName, asset.id);
    await setDoc(docRef, {
      ...asset,
      lastModified: new Date().toISOString()
    }, { merge: true });
  }

  /**
   * Batch write utility for high-volume synchronization.
   */
  static async batchSync(assets: Asset[]): Promise<void> {
    if (!db) throw new Error("Cloud Database Offline");
    
    const batch = writeBatch(db);
    assets.forEach(asset => {
      const docRef = doc(db, this.collectionName, asset.id);
      batch.set(docRef, asset, { merge: true });
    });
    
    await batch.commit();
  }
}
