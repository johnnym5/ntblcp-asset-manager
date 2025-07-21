'use client';

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads an image file to a specified path in Firebase Storage.
 * @param file The image file to upload.
 * @param path The path in Firebase Storage (e.g., 'assets/images').
 * @returns A promise that resolves with the public download URL of the uploaded image.
 */
export const uploadImage = async (file: File, path: string): Promise<string> => {
  const fileName = `${uuidv4()}-${file.name}`;
  const storageRef = ref(storage, `${path}/${fileName}`);
  
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  return downloadURL;
};

/**
 * Deletes a file from Firebase Storage using its download URL.
 * @param url The download URL of the file to delete.
 * @returns A promise that resolves when the file is deleted.
 */
export const deleteImage = async (url: string): Promise<void> => {
    try {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
    } catch (error: any) {
        // It's common for this to fail if the file doesn't exist or permissions are wrong.
        // We can often safely ignore these errors in the UI.
        console.warn("Could not delete file from storage:", error.message);
    }
}
