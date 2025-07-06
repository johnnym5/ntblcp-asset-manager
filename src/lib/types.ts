export type Asset = {
  id: string;
  serialNumber: string;
  model: string;
  location: string;
  status: 'In Use' | 'In Storage' | 'For Repair' | 'Disposed';
  photoUrl: string;
  attachments?: string[];
  conditionNotes?: string;
};
