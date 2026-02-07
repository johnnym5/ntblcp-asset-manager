
'use client';

import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction, useEffect, useMemo } from 'react';
import type { OptionType } from '@/components/asset-filter-sheet';
import { NIGERIAN_STATES, HEADER_DEFINITIONS, ZONAL_STORES, SPECIAL_LOCATIONS } from '@/lib/constants';
import type { Asset, AppSettings, AuthorizedUser } from '@/lib/types';
import { getSettings, updateSettings } from '@/lib/firestore';
import { getLocalSettings, saveLocalSettings } from '@/lib/idb';
import { firebaseConfig } from '@/lib/firebase';

const defaultStateUsers: AuthorizedUser[] = NIGERIAN_STATES.map(state => ({
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

export interface DataActions {
  onScanAndImport?: () => void;
  onExport?: () => void;
  onAddAsset?: () => void;
  onClearAll?: () => void;
  onTravelReport?: () => void;
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
  dataActions: DataActions;
  setDataActions: Dispatch<SetStateAction<DataActions>>;

  // Project Switch
  showProjectSwitchDialog: boolean;
  setShowProjectSwitchDialog: Dispatch<SetStateAction<boolean>>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

const defaultInitialLocations = [...NIGERIAN_STATES, ...ZONAL_STORES, ...SPECIAL_LOCATIONS];

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
    authorizedUsers: defaultStateUsers,
    sheetDefinitions: HEADER_DEFINITIONS,
    lockAssetList: true,
    appMode: 'management',
    databaseSource: 'rtdb',
    locations: defaultInitialLocations,
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isBrowserOnline, setIsBrowserOnline] = useState(true);

  const [manualDownloadTrigger, setManualDownloadTrigger] = useState(0);
  const [manualUploadTrigger, setManualUploadTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [dataSource, setDataSource] = useState<'cloud' | 'local_locked'>('cloud');
  const [assetToView, setAssetToView] = useState<Asset | null>(null);
  const [dataActions, setDataActions] = useState<DataActions>({});

  const [showProjectSwitchDialog, setShowProjectSwitchDialog] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial state
    setIsBrowserOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const syncRemoteSettings = async () => {
      if (!isBrowserOnline) return;

      try {
        const remoteSettings = await getSettings();
        const localSettings = await getLocalSettings();

        if (remoteSettings) {
          const remoteTimestamp = remoteSettings.lastModified ? new Date(remoteSettings.lastModified).getTime() : 0;
          const localTimestamp = localSettings?.lastModified ? new Date(localSettings.lastModified).getTime() : 0;

          if (remoteTimestamp > localTimestamp) {
            console.log("Found newer settings in the cloud, updating local state.");
            const finalSettings = { ...remoteSettings, locations: remoteSettings.locations || defaultInitialLocations };
            setAppSettings(finalSettings);
            await saveLocalSettings(finalSettings);
          }
        }
      } catch (error) {
        console.warn("Could not sync remote settings. Using local version.", error);
      }
    };

    const initializeAndSyncSettings = async () => {
      let localSettings = await getLocalSettings();

      if (!localSettings) {
        localSettings = {
          authorizedUsers: defaultStateUsers,
          sheetDefinitions: HEADER_DEFINITIONS,
          lockAssetList: true,
          appMode: 'management',
          databaseSource: 'rtdb',
          locations: defaultInitialLocations,
        };
      } else {
        if (!localSettings.databaseSource) {
            localSettings.databaseSource = 'rtdb';
        }
        if (!localSettings.locations) {
          localSettings.locations = defaultInitialLocations;
        }
      }
      
      // Migration from old enabledSheets setting to isHidden flag
      if ((localSettings as any).enabledSheets) {
        const enabledSheets = new Set((localSettings as any).enabledSheets);
        Object.keys(localSettings.sheetDefinitions).forEach(sheetName => {
          // If a sheet was NOT in enabledSheets, it should now be hidden.
          if (!enabledSheets.has(sheetName)) {
            localSettings!.sheetDefinitions[sheetName].isHidden = true;
          } else {
            // Ensure it's not hidden if it was enabled
            localSettings!.sheetDefinitions[sheetName].isHidden = false;
          }
        });
        delete (localSettings as any).enabledSheets;
      }
      
      setAppSettings(localSettings);
      await saveLocalSettings(localSettings);
      
      // Immediately after setting local state, sync with remote BEFORE settings are "loaded" for auth
      await syncRemoteSettings();
      setSettingsLoaded(true);
    };

    if (!settingsLoaded) {
      initializeAndSyncSettings();
    }

    const interval = setInterval(syncRemoteSettings, 30000); // Poll every 30s
    const handleFocus = () => syncRemoteSettings();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isBrowserOnline, settingsLoaded]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !settingsLoaded) return;

    const currentProjectId = firebaseConfig.projectId;
    const savedProjectId = localStorage.getItem('ntblcp-firebase-project-id');
    
    if (currentProjectId && savedProjectId && currentProjectId !== savedProjectId) {
      setShowProjectSwitchDialog(true);
    }
    
    if (currentProjectId) {
      localStorage.setItem('ntblcp-firebase-project-id', currentProjectId);
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
    dataSource, setDataSource,
    assetToView, setAssetToView,
    dataActions, setDataActions,
    showProjectSwitchDialog, setShowProjectSwitchDialog,
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
