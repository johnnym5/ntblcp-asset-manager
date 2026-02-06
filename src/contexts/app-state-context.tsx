
'use client';

import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction, useEffect, useMemo, useRef } from 'react';
import type { OptionType } from '@/components/asset-filter-sheet';
import { TARGET_SHEETS } from '@/lib/constants';
import type { Asset, AppSettings, AuthorizedUser } from '@/lib/types';
import { HEADER_DEFINITIONS } from '@/lib/constants';
import { getSettings, synchronizeDatabases } from '@/lib/firestore';
import { getLocalSettings, saveLocalSettings } from '@/lib/idb';
import { addNotification } from '@/hooks/use-notifications';


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
  dataSource: 'cloud' | 'local_locked';
  setDataSource: Dispatch<SetStateAction<'cloud' | 'local_locked'>>;
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
  manualBackendSyncTrigger: number;
  setManualBackendSyncTrigger: Dispatch<SetStateAction<number>>;
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
    databaseSource: 'firestore',
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [manualDownloadTrigger, setManualDownloadTrigger] = useState(0);
  const [manualUploadTrigger, setManualUploadTrigger] = useState(0);
  const [manualBackendSyncTrigger, setManualBackendSyncTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);

  const [dataSource, setDataSource] = useState<'cloud' | 'local_locked'>('cloud');
  const [databaseSource, setDatabaseSource] = useState<DatabaseSource>('firestore');
  const [assetToView, setAssetToView] = useState<Asset | null>(null);
  const [dataActions, setDataActions] = useState<DataActions>({});
  
  const isInitialMount = useRef(true);


  useEffect(() => {
    const initializeSettings = async () => {
      let localSettings = await getLocalSettings();
      if (localSettings) {
        setAppSettings(localSettings);
        setDatabaseSource(localSettings.databaseSource || 'firestore');
      } else {
        await saveLocalSettings(appSettings);
      }
      setSettingsLoaded(true);

      if (isOnline) {
        try {
          const remoteSettings = await getSettings();
          if (remoteSettings && JSON.stringify(remoteSettings) !== JSON.stringify(localSettings)) {
            setAppSettings(remoteSettings);
            setDatabaseSource(remoteSettings.databaseSource || 'firestore');
            await saveLocalSettings(remoteSettings);
          }
        } catch (error) {
          console.warn("Could not fetch remote settings.", error);
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
    const performBackendSync = async () => {
        if (!isOnline) {
          addNotification({ title: 'Offline', description: 'Cannot sync cloud databases while offline.', variant: 'destructive'});
          return;
        }
        setIsSyncing(true);
        addNotification({ title: 'Syncing Cloud Databases...', description: 'Checking for latest data between Firestore and Realtime DB.' });
        try {
            const { toFirestoreCount, toRTDBCount } = await synchronizeDatabases();
            addNotification({ title: 'Cloud Sync Complete', description: `${toFirestoreCount} updates for Firestore, ${toRTDBCount} for Realtime DB.` });
            setManualDownloadTrigger(c => c + 1); // Trigger a download to get latest state
        } catch (e) {
            addNotification({ title: 'Cloud Sync Failed', description: (e as Error).message, variant: 'destructive' });
            setIsSyncing(false); // Ensure syncing is false on error
        }
        // isSyncing will be set to false by the download trigger's effect in asset-list
    };

    if (isInitialMount.current) {
        isInitialMount.current = false;
    } else {
        if(manualBackendSyncTrigger > 0) {
            performBackendSync();
        }
    }
  }, [manualBackendSyncTrigger, isOnline]);
  
  useEffect(() => {
      if (!settingsLoaded) return; // Don't trigger on initial load
      // This effect only runs when the databaseSource is changed by the user
      setManualBackendSyncTrigger(c => c + 1);
  }, [databaseSource, settingsLoaded]);

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
    manualBackendSyncTrigger, setManualBackendSyncTrigger,
    isSyncing, setIsSyncing,
    unreadInboxCount, setUnreadInboxCount,
    dataSource, setDataSource,
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
