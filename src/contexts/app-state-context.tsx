
'use client';

import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction, useEffect, useMemo } from 'react';
import type { OptionType } from '@/components/asset-filter-sheet';
import { TARGET_SHEETS } from '@/lib/constants';
import type { InboxMessageGroup } from '@/lib/types';


export interface SortConfig {
  key: keyof import('@/lib/types').Asset;
  direction: 'asc' | 'desc';
}

export interface DataActions {
  onImport?: () => void;
  onExport?: () => void;
  onAddAsset?: () => void;
  onClearAll?: () => void;
  isImporting?: boolean;
  isAdmin?: boolean;
  hasAssets?: boolean;
}

interface AppStateContextType {
  isOnline: boolean;
  setIsOnline: Dispatch<SetStateAction<boolean>>;
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  globalStateFilter: string;
  setGlobalStateFilter: Dispatch<SetStateAction<string>>;
  
  // Filters
  selectedLocations: string[];
  setSelectedLocations: Dispatch<SetStateAction<string[]>>;
  selectedAssignees: string[];
  setSelectedAssignees: Dispatch<SetStateAction<string[]>>;
  selectedStatuses: string[];
  setSelectedStatuses: Dispatch<SetStateAction<string[]>>;
  missingFieldFilter: string;
  setMissingFieldFilter: Dispatch<SetStateAction<string>>;
  
  // Filter Options
  locationOptions: OptionType[];
  setLocationOptions: Dispatch<SetStateAction<OptionType[]>>;
  assigneeOptions: OptionType[];
  setAssigneeOptions: Dispatch<SetStateAction<OptionType[]>>;
  statusOptions: OptionType[];
  setStatusOptions: Dispatch<SetStateAction<OptionType[]>>;
  
  // Sorting
  sortConfig: SortConfig | null;
  setSortConfig: Dispatch<SetStateAction<SortConfig | null>>;

  // Sheet Settings
  enabledSheets: string[];
  setEnabledSheets: Dispatch<SetStateAction<string[]>>;
  lockAssetList: boolean;
  setLockAssetList: Dispatch<SetStateAction<boolean>>;
  
  // Sync Settings
  autoSyncEnabled: boolean;
  setAutoSyncEnabled: Dispatch<SetStateAction<boolean>>;
  manualSyncTrigger: number;
  setManualSyncTrigger: Dispatch<SetStateAction<number>>;
  isSyncing: boolean;
  setIsSyncing: Dispatch<SetStateAction<boolean>>;
  
  // Data Actions
  dataActions: DataActions;
  setDataActions: Dispatch<SetStateAction<DataActions>>;

  // Inbox
  inboxMessages: InboxMessageGroup[];
  setInboxMessages: Dispatch<SetStateAction<InboxMessageGroup[]>>;
  unreadInboxCount: number;
  setUnreadInboxCount: Dispatch<SetStateAction<number>>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedStatus = localStorage.getItem('ntblcp-online-status');
      return savedStatus ? JSON.parse(savedStatus) : false;
    }
    return false;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [globalStateFilter, setGlobalStateFilter] = useState('');
  
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [missingFieldFilter, setMissingFieldFilter] = useState('');
  
  const [locationOptions, setLocationOptions] = useState<OptionType[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<OptionType[]>([]);
  const [statusOptions, setStatusOptions] = useState<OptionType[]>([]);
  
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'description', direction: 'asc' });

  const [enabledSheets, setEnabledSheets] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const savedSheets = localStorage.getItem('ntblcp-enabled-sheets');
      return savedSheets ? JSON.parse(savedSheets) : [...TARGET_SHEETS];
    }
    return [...TARGET_SHEETS];
  });
  
  const [lockAssetList, setLockAssetList] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedLock = localStorage.getItem('ntblcp-asset-lock');
      // Default to true (locked) unless explicitly set to false by an admin.
      return savedLock ? JSON.parse(savedLock) : true;
    }
    return true;
  });

  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ntblcp-autosync-enabled');
      return saved ? JSON.parse(saved) : true; // Default to true for admins
    }
    return true;
  });

  const [manualSyncTrigger, setManualSyncTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dataActions, setDataActions] = useState<DataActions>({});

  const [inboxMessages, setInboxMessages] = useState<InboxMessageGroup[]>([]);
  const [unreadInboxCount, setUnreadInboxCount] = useState<number>(0);


  useEffect(() => {
    localStorage.setItem('ntblcp-enabled-sheets', JSON.stringify(enabledSheets));
  }, [enabledSheets]);
  
  useEffect(() => {
    localStorage.setItem('ntblcp-asset-lock', JSON.stringify(lockAssetList));
  }, [lockAssetList]);

  useEffect(() => {
    localStorage.setItem('ntblcp-autosync-enabled', JSON.stringify(autoSyncEnabled));
  }, [autoSyncEnabled]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ntblcp-online-status', JSON.stringify(isOnline));
    }
  }, [isOnline]);

  const value = {
    isOnline,
    setIsOnline,
    searchTerm,
    setSearchTerm,
    globalStateFilter,
    setGlobalStateFilter,
    selectedLocations,
    setSelectedLocations,
    selectedAssignees,
    setSelectedAssignees,
    selectedStatuses,
    setSelectedStatuses,
    missingFieldFilter,
    setMissingFieldFilter,
    locationOptions,
    setLocationOptions,
    assigneeOptions,
    setAssigneeOptions,
    statusOptions,
    setStatusOptions,
    sortConfig,
    setSortConfig,
    enabledSheets,
    setEnabledSheets,
    lockAssetList,
    setLockAssetList,
    autoSyncEnabled,
    setAutoSyncEnabled,
    manualSyncTrigger,
    setManualSyncTrigger,
    isSyncing,
    setIsSyncing,
    dataActions,
    setDataActions,
    inboxMessages,
    setInboxMessages,
    unreadInboxCount,
    setUnreadInboxCount,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
