
'use client';

import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction, useEffect, useMemo } from 'react';
import type { OptionType } from '@/components/asset-filter-sheet';
import { HEADER_DEFINITIONS, TARGET_SHEETS } from '@/lib/constants';
import type { Asset, InboxMessageGroup, AppSettings, SheetDefinition } from '@/lib/types';
import { getSettings, listenToSettings } from '@/lib/firestore';


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

export type DataSource = 'cloud' | 'local';

interface AppStateContextType {
  assets: Asset[];
  setAssets: Dispatch<SetStateAction<Asset[]>>;
  isOnline: boolean;
  setIsOnline: Dispatch<SetStateAction<boolean>>;
  dataSource: DataSource;
  setDataSource: Dispatch<SetStateAction<DataSource>>;
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  globalStateFilter: string;
  setGlobalStateFilter: Dispatch<SetStateAction<string>>;
  
  // Pagination
  itemsPerPage: number;
  setItemsPerPage: Dispatch<SetStateAction<number>>;

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

  // Sheet Settings from Firestore
  appSettings: AppSettings;
  setAppSettings: Dispatch<SetStateAction<AppSettings>>;
  
  // Sync Settings
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
  autoSyncEnabled: boolean;
}

// Convert initial constants to the new AppSettings format
const initialSheetDefinitions: Record<string, SheetDefinition> = {};
TARGET_SHEETS.forEach(sheetName => {
  initialSheetDefinitions[sheetName] = {
    name: sheetName,
    headers: HEADER_DEFINITIONS[sheetName] || [],
    displayFields: ['sn', 'description', 'assetIdCode', 'assignee', 'verifiedStatus', 'lastModified'],
  };
});

const defaultAppSettings: AppSettings = {
  lockAssetList: true,
  autoSyncEnabled: true,
  enabledSheets: [...TARGET_SHEETS],
  sheetDefinitions: initialSheetDefinitions,
};


const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>('local');
  const [searchTerm, setSearchTerm] = useState('');
  const [globalStateFilter, setGlobalStateFilter] = useState('');
  
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [missingFieldFilter, setMissingFieldFilter] = useState('');
  
  const [locationOptions, setLocationOptions] = useState<OptionType[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<OptionType[]>([]);
  const [statusOptions, setStatusOptions] = useState<OptionType[]>([]);
  
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'description', direction: 'asc' });

  // --- Global Settings from Firestore ---
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);


  const [manualSyncTrigger, setManualSyncTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dataActions, setDataActions] = useState<DataActions>({});
  
  const [inboxMessages, setInboxMessages] = useState<InboxMessageGroup[]>([]);
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);

  // Effect for real-time settings
  useEffect(() => {
    // Only listen for settings if online
    if (!isOnline) return;

    const unsubscribe = listenToSettings((settings) => {
        if (settings) {
            setAppSettings(prevSettings => ({
              ...prevSettings,
              ...settings
            }));
        }
    });

    // Clean up listener on component unmount or when going offline
    return () => unsubscribe();
  }, [isOnline]);

  useEffect(() => {
    // Safely read from localStorage only on the client
    const savedStatus = localStorage.getItem('ntblcp-online-status');
    // Default to false (offline) if nothing is saved
    setIsOnline(savedStatus ? JSON.parse(savedStatus) : false);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ntblcp-online-status', JSON.stringify(isOnline));
    }
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline) {
        setDataSource('local');
    }
  }, [isOnline]);

  const value = {
    assets,
    setAssets,
    isOnline,
    setIsOnline,
    dataSource,
    setDataSource,
    searchTerm,
    setSearchTerm,
    globalStateFilter,
    setGlobalStateFilter,
    itemsPerPage,
    setItemsPerPage,
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
    appSettings,
    setAppSettings,
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
    autoSyncEnabled: appSettings.autoSyncEnabled,
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
