
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
import type { Asset, AppSettings, AuthorizedUser } from '@/lib/types';
import { onSettingsChange } from '@/lib/database';
import { getLocalSettings, saveLocalSettings } from '@/lib/idb';
import { firebaseConfig } from '@/lib/firebase';

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
  dateFilter: 'today' | 'week' | 'new-week' | null;
  setDateFilter: Dispatch<SetStateAction<'today' | 'week' | 'new-week' | null>>;
  conditionFilter: string[];
  setConditionFilter: Dispatch<SetStateAction<string[]>>;

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
  appSettings: AppSettings | null; // Can be null initially
  setAppSettings: Dispatch<SetStateAction<AppSettings | null>>;
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
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'new-week' | null>(null);
  const [conditionFilter, setConditionFilter] = useState<string[]>([]);

  const [locationOptions, setLocationOptions] = useState<OptionType[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<OptionType[]>([]);
  const [statusOptions, setStatusOptions] = useState<OptionType[]>([]);

  const [sortConfig, setSortConfig] = useState<SortConfig | null>({
    key: 'sn',
    direction: 'asc',
  });

  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
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
  
  // This effect loads settings from local DB. It does NOT fetch from cloud.
  // The FirstTimeSetup component is responsible for the initial cloud fetch.
  useEffect(() => {
    const initializeSettings = async () => {
      const localSettings = await getLocalSettings();
      setAppSettings(localSettings);
      if (localSettings?.defaultDataSource) {
        setDataSource(localSettings.defaultDataSource);
      }
      if (localSettings?.defaultDatabase) {
        setActiveDatabase(localSettings.defaultDatabase);
      }
      setSettingsLoaded(true);
    };
    
    initializeSettings();
  }, []);

  // Real-time listener for remote settings changes
  useEffect(() => {
    if (!settingsLoaded || !isBrowserOnline) return;

    const handleRemoteSettingsUpdate = (remoteSettings: AppSettings | null) => {
       if (remoteSettings) {
         setAppSettings(currentSettings => {
           if (!currentSettings || JSON.stringify(remoteSettings) !== JSON.stringify(currentSettings)) {
              saveLocalSettings(remoteSettings);
              return remoteSettings;
           }
           return currentSettings;
         });
       }
    };
    
    const unsubscribe = onSettingsChange(handleRemoteSettingsUpdate);
    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, [settingsLoaded, isBrowserOnline]);

  // Project ID check
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
    if (appSettings && appSettings.appMode === 'management') {
      setSelectedStatuses([]);
    }
  }, [appSettings, setSelectedStatuses]);

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
    dateFilter,
    setDateFilter,
    conditionFilter,
    setConditionFilter,
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
