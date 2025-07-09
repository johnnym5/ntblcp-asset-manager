'use client';

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
