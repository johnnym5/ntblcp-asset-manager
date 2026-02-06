
'use client';

import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction, useEffect, useMemo } from 'react';
import type { OptionType } from '@/components/asset-filter-sheet';
import { TARGET_SHEETS } from '@/lib/constants';
import type { Asset, AppSettings, AuthorizedUser } from '@/lib/types';
import { HEADER_DEFINITIONS } from '@/lib/constants';
import { getSettings, updateSettings } from '@/lib/firestore';
import { getLocalSettings, saveLocalSettings } from '@/lib/idb';
import { firebaseConfig } from '@/lib/firebase';


export interface SortConfig {
  key: keyof import('@/lib/types').Asset;
  direction: 'asc' | 'desc';
}

export interface DataActions {
  onImport?: () => void;
  onScanAndImport?: () => void;
  onExport?: () => void;
  onAddAsset?: () => void;
  onClearAll?: () => void;
  onTravelReport?: () => void;
  isImporting?: boolean;
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

  // Inbox count for UI display
  unreadInboxCount: number;
  setUnreadInboxCount: Dispatch<SetStateAction<number>>;

  // Cross-component communication
  assetToView: Asset | null;
  setAssetToView: Dispatch<SetStateAction<Asset | null>>;
  dataActions: DataActions;
  setDataActions: Dispatch<SetStateAction<DataActions>>;
  
  // Failover state
  isInFailoverMode: boolean;
  triggerFailover: () => void;

  // Project Switch
  showProjectSwitchDialog: boolean;
  setShowProjectSwitchDialog: Dispatch<SetStateAction<boolean>>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// This custom hook manages the AppSettings state while ensuring the databaseSource
// preference is persisted to localStorage for immediate access on app load.
const useAppSettingsWithPersistence = (): [AppSettings, Dispatch<SetStateAction<AppSettings>>] => {
  const [appSettings, _setAppSettings] = useState<AppSettings>(() => {
    // Force RTDB as the primary database to resolve post-deployment issues.
    return {
      authorizedUsers: [],
      sheetDefinitions: HEADER_DEFINITIONS,
      enabledSheets: TARGET_SHEETS,
      lockAssetList: true,
      appMode: 'management',
      databaseSource: 'rtdb',
    };
  });

  const setAppSettings: Dispatch<SetStateAction<AppSettings>> = (newSettingsAction) => {
    _setAppSettings(prevState => {
      const resolvedSettings = typeof newSettingsAction === 'function' ? newSettingsAction(prevState) : newSettingsAction;
      
      // Force databaseSource to RTDB and persist it to localStorage.
      if (typeof window !== 'undefined') {
        localStorage.setItem('ntblcp-db-source', 'rtdb');
      }
      
      return {...resolvedSettings, databaseSource: 'rtdb'};
    });
  };

  return [appSettings, setAppSettings];
};


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

  const [appSettings, setAppSettings] = useAppSettingsWithPersistence();
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [manualDownloadTrigger, setManualDownloadTrigger] = useState(0);
  const [manualUploadTrigger, setManualUploadTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);

  const [dataSource, setDataSource] = useState<'cloud' | 'local_locked'>('cloud');
  const [assetToView, setAssetToView] = useState<Asset | null>(null);
  const [dataActions, setDataActions] = useState<DataActions>({});

  const [isInFailoverMode, setIsInFailoverMode] = useState(false);
  const [showProjectSwitchDialog, setShowProjectSwitchDialog] = useState(false);

  const triggerFailover = () => {
    // This function is now less relevant as we are hard-coding to RTDB.
    // Kept for potential future use.
    console.warn("Failover triggered, but the app is already locked to RTDB.");
  };

  useEffect(() => {
    // This effect is now simplified as failover is not the primary mechanism.
  }, [isInFailoverMode]);


  useEffect(() => {
    const fetchAndApplySettings = async () => {
      if (!isOnline || !settingsLoaded) return;

      try {
        const remoteSettings = await getSettings();
        const localSettings = await getLocalSettings();
        
        if (remoteSettings && remoteSettings.lastModified && (!localSettings || !localSettings.lastModified || new Date(remoteSettings.lastModified) > new Date(localSettings.lastModified))) {
          console.log("Polling: Found newer settings in the cloud, updating local state.");
          setAppSettings(remoteSettings);
          await saveLocalSettings(remoteSettings);
        }
      } catch (error) {
        console.warn("Could not fetch remote settings on interval. Using local version.", error);
      }
    };

    const initializeSettings = async () => {
      let localSettings = await getLocalSettings();

      // Force RTDB on initialization
      const dbSource = 'rtdb';
      
      if (!localSettings) {
        localSettings = {
          authorizedUsers: [],
          sheetDefinitions: HEADER_DEFINITIONS,
          enabledSheets: TARGET_SHEETS,
          lockAssetList: true,
          appMode: 'management',
          databaseSource: dbSource,
        };
      } else {
        localSettings.databaseSource = dbSource;
      }
      
      await saveLocalSettings(localSettings);
      setAppSettings(localSettings);
      setSettingsLoaded(true);
    };
    
    if (!settingsLoaded) {
        initializeSettings();
    }

    const interval = setInterval(fetchAndApplySettings, 30000);
    return () => clearInterval(interval);

  }, [isOnline, settingsLoaded, setAppSettings]);

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
    unreadInboxCount, setUnreadInboxCount,
    dataSource, setDataSource,
    assetToView, setAssetToView,
    dataActions, setDataActions,
    isInFailoverMode, triggerFailover,
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
