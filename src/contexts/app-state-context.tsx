
'use client';

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import type { OptionType } from '@/components/asset-filter-sheet';
import {
  NIGERIAN_STATES,
  HEADER_DEFINITIONS,
  ZONAL_STORES,
  SPECIAL_LOCATIONS,
} from '@/lib/constants';
import type { Asset, AppSettings, AuthorizedUser } from '@/lib/types';
import { onSettingsChange } from '@/lib/database';
import { getLocalSettings, saveLocalSettings } from '@/lib/idb';
import { firebaseConfig } from '@/lib/firebase';

const defaultStateUsers: AuthorizedUser[] = NIGERIAN_STATES.map((state) => ({
  loginName: state.toLowerCase().replace(/\s|-/g, ''),
  displayName: state,
  password: '000000',
  states: [state],
  isAdmin: false,
  isGuest: false,
  canAddAssets: true,
  canEditAssets: true,
  canVerifyAssets: true,
}));

export interface SortConfig {
  key: keyof import('@/lib/types').Asset;
  direction: 'asc' | 'desc';
}

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

  // Cross-component communication
  assetToView: Asset | null;
  setAssetToView: Dispatch<SetStateAction<Asset | null>>;
  isSettingsOpen: boolean;
  setIsSettingsOpen: Dispatch<SetStateAction<boolean>>;
  initialSettingsTab: string;
  setInitialSettingsTab: Dispatch<SetStateAction<string>>;

  // Project Switch
  showProjectSwitchDialog: boolean;
  setShowProjectSwitchDialog: Dispatch<SetStateAction<boolean>>;

  // Active Database
  activeDatabase: 'firestore' | 'rtdb';
  setActiveDatabase: Dispatch<SetStateAction<'firestore' | 'rtdb'>>;

  // Asset Actions
  onRevertAsset: (assetId: string) => Promise<void>;
  setOnRevertAsset: Dispatch<SetStateAction<(assetId: string) => Promise<void>>>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

const defaultInitialLocations = [
  ...NIGERIAN_STATES,
  ...ZONAL_STORES,
  ...SPECIAL_LOCATIONS,
];

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

  const [sortConfig, setSortConfig] = useState<SortConfig | null>({
    key: 'sn',
    direction: 'asc',
  });

  const [appSettings, setAppSettings] = useState<AppSettings>({
    authorizedUsers: defaultStateUsers,
    sheetDefinitions: HEADER_DEFINITIONS,
    lockAssetList: true,
    appMode: 'management',
    locations: defaultInitialLocations,
    settingsHistory: [],
    defaultDataSource: 'cloud',
    defaultDatabase: 'rtdb',
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isBrowserOnline, setIsBrowserOnline] = useState(true);

  const [manualDownloadTrigger, setManualDownloadTrigger] = useState(0);
  const [manualUploadTrigger, setManualUploadTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const [dataSource, setDataSource] = useState<'cloud' | 'local_locked'>(
    'cloud'
  );
  const [assetToView, setAssetToView] = useState<Asset | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [initialSettingsTab, setInitialSettingsTab] = useState('general');

  const [showProjectSwitchDialog, setShowProjectSwitchDialog] =
    useState(false);
  const [activeDatabase, setActiveDatabase] = useState<'firestore' | 'rtdb'>(
    'rtdb'
  );

  const [onRevertAsset, setOnRevertAsset] = useState<
    (assetId: string) => Promise<void>
  >(() => async () => {});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsBrowserOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Effect 1: One-time initialization from local storage
  useEffect(() => {
    const initializeSettings = async () => {
      let localSettings = await getLocalSettings();

      if (!localSettings) {
        localSettings = {
          authorizedUsers: defaultStateUsers,
          sheetDefinitions: HEADER_DEFINITIONS,
          lockAssetList: true,
          appMode: 'management',
          locations: defaultInitialLocations,
          settingsHistory: [],
          defaultDataSource: 'cloud',
          defaultDatabase: 'rtdb',
        };
      } else {
        if (!localSettings.locations) {
          localSettings.locations = defaultInitialLocations;
        }
      }
      
      setAppSettings(localSettings);
      if (localSettings.defaultDataSource) {
        setDataSource(localSettings.defaultDataSource);
      }
      if (localSettings.defaultDatabase) {
        setActiveDatabase(localSettings.defaultDatabase);
      }
      await saveLocalSettings(localSettings);
      setSettingsLoaded(true);
    };
    
    initializeSettings();
  }, []);

  // Effect 2: Real-time synchronization with remote settings from RTDB
  useEffect(() => {
    if (!settingsLoaded || !isBrowserOnline) return;

    const handleRemoteSettingsUpdate = (remoteSettings: AppSettings) => {
       setAppSettings(currentSettings => {
          if (remoteSettings) {
            const remoteTimestamp = remoteSettings.lastModified ? new Date(remoteSettings.lastModified).getTime() : 0;
            const localTimestamp = currentSettings.lastModified ? new Date(currentSettings.lastModified).getTime() : 0;

            // Update if remote is newer OR if the content is different (for manual edits without timestamp change)
            if (remoteTimestamp > localTimestamp || JSON.stringify(remoteSettings) !== JSON.stringify(currentSettings)) {
              const finalSettings = { ...remoteSettings, locations: remoteSettings.locations || defaultInitialLocations };
              
              if (JSON.stringify(finalSettings) !== JSON.stringify(currentSettings)) {
                saveLocalSettings(finalSettings);
                return finalSettings;
              }
            }
          }
          return currentSettings;
        });
    };
    
    // Listen to RTDB for settings changes
    const unsubscribe = onSettingsChange(handleRemoteSettingsUpdate);

    return () => {
        if (unsubscribe) {
            unsubscribe();
        }
    };
  }, [settingsLoaded, isBrowserOnline]);

  // Effect 3: Project ID check for user notification
  useEffect(() => {
    if (typeof window !== 'undefined' && settingsLoaded) {
        const currentProjectId = firebaseConfig.projectId;
        const savedProjectId = localStorage.getItem('ntblcp-firebase-project-id');

        if (currentProjectId && savedProjectId && currentProjectId !== savedProjectId) {
            setShowProjectSwitchDialog(true);
        }

        if (currentProjectId) {
            localStorage.setItem('ntblcp-firebase-project-id', currentProjectId);
        }
    }
  }, [settingsLoaded]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ntblcp-online-status', JSON.stringify(isOnline));
    }
  }, [isOnline]);

  useEffect(() => {
    if (appSettings.appMode === 'management') {
      setSelectedStatuses([]);
    }
  }, [appSettings.appMode, setSelectedStatuses]);

  const value = {
    assets,
    setAssets,
    offlineAssets,
    setOfflineAssets,
    isOnline,
    setIsOnline,
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
    settingsLoaded,
    manualDownloadTrigger,
    setManualDownloadTrigger,
    manualUploadTrigger,
    setManualUploadTrigger,
    isSyncing,
    setIsSyncing,
    dataSource,
    setDataSource,
    assetToView,
    setAssetToView,
    isSettingsOpen,
    setIsSettingsOpen,
    initialSettingsTab,
    setInitialSettingsTab,
    showProjectSwitchDialog,
    setShowProjectSwitchDialog,
    activeDatabase,
    setActiveDatabase,
    onRevertAsset,
    setOnRevertAsset,
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
