
'use client';

import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction, useEffect, useMemo } from 'react';
import type { OptionType } from '@/components/asset-filter-sheet';
import { TARGET_SHEETS } from '@/lib/constants';
import type { Asset, AppSettings, AuthorizedUser } from '@/lib/types';
import { HEADER_DEFINITIONS } from '@/lib/constants';
import { getSettings } from '@/lib/firestore';
import { getLocalSettings, saveLocalSettings } from '@/lib/idb';


export interface SortConfig {
  key: keyof import('@/lib/types').Asset;
  direction: 'asc' | 'desc';
}

export interface DataActions {
  onImport?: () => void;
  onScanAndImport?: () => void;
  onExportToJson?: () => void;
  onAddAsset?: () => void;
  onClearAll?: () => void;
  onTravelReport?: () => void;
  isImporting?: boolean;
}

export type DatabaseSource = 'firestore' | 'rtdb';

interface AppStateContextType {
  assets: Asset[];
  setAssets: Dispatch<SetStateAction<Asset[]>>;
  offlineAssets: Asset[];
  setOfflineAssets: Dispatch<SetStateAction<Asset[]>>;
  isOnline: boolean;
  setIsOnline: Dispatch<SetStateAction<boolean>>;
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  globalStateFilter: string;
  setGlobalStateFilter: Dispatch<SetStateAction<string>>;
  itemsPerPage: number;
  setItemsPerPage: Dispatch<SetStateAction<number>>;
  assetSource: 'cloud' | 'local_locked';
  setAssetSource: Dispatch<SetStateAction<'cloud' | 'local_locked'>>;
  databaseSource: DatabaseSource;
  setDatabaseSource: Dispatch<SetStateAction<DatabaseSource>>;
  
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

  // App Settings
  appSettings: AppSettings;
  setAppSettings: Dispatch<SetStateAction<AppSettings>>;
  settingsLoaded: boolean;
  
  // Sync Settings
  manualDownloadTrigger: number;
  setManualDownloadTrigger: Dispatch<SetStateAction<number>>;
  manualUploadTrigger: number;
  setManualUploadTrigger: Dispatch<SetStateAction<number>>;
  isSyncing: boolean;
  setIsSyncing: Dispatch<SetStateAction<boolean>>;

  // Inbox count for UI display
  unreadInboxCount: number;
  setUnreadInboxCount: Dispatch<SetStateAction<number>>;

  // Cross-component communication
  assetToView: Asset | null;
  setAssetToView: Dispatch<SetStateAction<Asset | null>>;
  dataActions: DataActions;
  setDataActions: Dispatch<SetStateAction<DataActions>>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [offlineAssets, setOfflineAssets] = useState<Asset[]>([]);
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedStatus = localStorage.getItem('ntblcp-online-status');
      return savedStatus ? JSON.parse(savedStatus) : true;
    }
    return true;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [globalStateFilter, setGlobalStateFilter] = useState('All');
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [missingFieldFilter, setMissingFieldFilter] = useState('');
  
  const [locationOptions, setLocationOptions] = useState<OptionType[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<OptionType[]>([]);
  const [statusOptions, setStatusOptions] = useState<OptionType[]>([]);
  
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'sn', direction: 'asc' });

  const [appSettings, setAppSettings] = useState<AppSettings>({
    authorizedUsers: [],
    sheetDefinitions: HEADER_DEFINITIONS,
    enabledSheets: TARGET_SHEETS,
    lockAssetList: true,
    appMode: 'management',
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [manualDownloadTrigger, setManualDownloadTrigger] = useState(0);
  const [manualUploadTrigger, setManualUploadTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);

  const [assetSource, setAssetSource] = useState<'cloud' | 'local_locked'>('cloud');
  const [databaseSource, setDatabaseSource] = useState<DatabaseSource>('firestore');
  const [assetToView, setAssetToView] = useState<Asset | null>(null);
  const [dataActions, setDataActions] = useState<DataActions>({});


  useEffect(() => {
    const initializeSettings = async () => {
      // 1. Load local settings first for a fast offline-first experience.
      let localSettings = await getLocalSettings();

      if (!localSettings) {
        localSettings = {
          authorizedUsers: [],
          sheetDefinitions: HEADER_DEFINITIONS,
          enabledSheets: TARGET_SHEETS,
          lockAssetList: true,
          appMode: 'management',
        };
        await saveLocalSettings(localSettings);
      }
      setAppSettings(localSettings);
      setSettingsLoaded(true);

      // 2. After loading local settings, try to fetch the latest from the cloud.
      if (isOnline) {
        try {
          const remoteSettings = await getSettings();
          if (remoteSettings && JSON.stringify(remoteSettings) !== JSON.stringify(localSettings)) {
            console.log("Found newer settings in Firestore, updating local state.");
            setAppSettings(remoteSettings);
            await saveLocalSettings(remoteSettings);
          }
        } catch (error) {
          console.warn("Could not fetch remote settings. Using local version.", error);
        }
      }
    };

    initializeSettings();
  }, [isOnline]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ntblcp-online-status', JSON.stringify(isOnline));
    }
  }, [isOnline]);

  useEffect(() => {
    if (appSettings.appMode === 'management') {
      setSelectedStatuses([]);
    }
  }, [appSettings.appMode]);

  const value = {
    assets, setAssets,
    offlineAssets, setOfflineAssets,
    isOnline, setIsOnline,
    searchTerm, setSearchTerm,
    globalStateFilter, setGlobalStateFilter,
    itemsPerPage, setItemsPerPage,
    selectedLocations, setSelectedLocations,
    selectedAssignees, setSelectedAssignees,
    selectedStatuses, setSelectedStatuses,
    missingFieldFilter, setMissingFieldFilter,
    locationOptions, setLocationOptions,
    assigneeOptions, setAssigneeOptions,
    statusOptions, setStatusOptions,
    sortConfig, setSortConfig,
    appSettings, setAppSettings,
    settingsLoaded,
    manualDownloadTrigger, setManualDownloadTrigger,
    manualUploadTrigger, setManualUploadTrigger,
    isSyncing, setIsSyncing,
    unreadInboxCount, setUnreadInboxCount,
    assetSource, setAssetSource,
    databaseSource, setDatabaseSource,
    assetToView, setAssetToView,
    dataActions, setDataActions,
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
