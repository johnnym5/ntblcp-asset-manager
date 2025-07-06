export type Asset = {
  id: string;
  assetName: string;
  serialNumber: string;
  category: string;
  location: string;
  status: 'In Use' | 'In Storage' | 'For Repair' | 'Disposed';
  assignedTo?: string;
  purchaseDate?: string;
  condition: 'New' | 'Good' | 'Fair' | 'Poor';
  photoUrl: string;
  files?: string[];
  notes?: string;
};

export type RoomUser = {
  id: string;
  displayName: string | null;
  photoURL: string | null;
  lastSeen: number;
};
