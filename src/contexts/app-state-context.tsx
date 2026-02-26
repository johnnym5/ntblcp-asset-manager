
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
import type { Asset, AppSettings, Grant, AuthorizedUser } from '@/lib/types';
import { updateSettings as updateSettingsRTDB, getSettings as getSettingsRTDB } from '@/lib/database';
import { updateSettings as updateSettingsFS, getSettings as getSettingsFS } from '@/lib/firestore';
import { getLocalSettings, saveLocalSettings } from '@/lib/idb';
import { firebaseConfig } from '@/lib/firebase';
import { addNotification } from '@/hooks/use-notifications';
import { v4 as uuidv4 } from 'uuid';
import { NIGERIAN_STATES } from '@/lib/constants';
import { assetMatchesGlobalFilter } from '@/lib/utils';

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
  conditionOptions: OptionType[];
  setConditionOptions: Dispatch<SetStateAction<OptionType[]>>;

  // Sorting
  sortConfig: SortConfig | null;
  setSortConfig: Dispatch<SetStateAction<SortConfig | null>>;

  // App Settings
  appSettings: AppSettings | null;
  setAppSettings: Dispatch<SetStateAction<AppSettings | null>>;
  settingsLoaded: boolean;
  activeGrantId: string | null;
  setActiveGrantId: Dispatch<SetStateAction<string | null>>;

  // Sync Settings
  manualDownloadTrigger: number;
  setManualDownloadTrigger: Dispatch<SetStateAction<number>>;
  manualUploadTrigger: number;
  setManualUploadTrigger: Dispatch<SetStateAction<number>>;
  isSyncing: boolean;
  setIsSyncing: Dispatch<SetStateAction<boolean>>;

  // First Time Setup
  firstTimeSetupStatus: 'idle' | 'syncing' | 'complete';
  setFirstTimeSetupStatus: Dispatch<SetStateAction<'idle' | 'syncing' | 'complete'>>;

  // Cross-component communication
  assetToView: Asset | null;
  setAssetToView: Dispatch<SetStateAction<Asset | null>>;
  isSettingsOpen: boolean;
  setIsSettingsOpen: Dispatch<SetStateAction<boolean>>;
  initialSettingsTab: string;
  setInitialSettingsTab: Dispatch<SetStateAction<string>>;
  dataActions: DataActions;
  setDataActions: Dispatch<SetStateAction<DataActions>>;

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
      const savedStatus = localStorage.getItem('assetbase-online-status');
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
  const [conditionOptions, setConditionOptions] = useState<OptionType[]>([]);

  const [sortConfig, setSortConfig] = useState<SortConfig | null>({
    key: 'sn',
    direction: 'asc',
  });

  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [activeGrantId, setActiveGrantId] = useState<string | null>(null);

  const [manualDownloadTrigger, setManualDownloadTrigger] = useState(0);
  const [manualUploadTrigger, setManualUploadTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [firstTimeSetupStatus, setFirstTimeSetupStatus] = useState<'idle' | 'syncing' | 'complete'>('idle');

  const [dataSource, setDataSource] = useState<'cloud' | 'local_locked'>(
    'cloud'
  );
  const [assetToView, setAssetToView] = useState<Asset | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [initialSettingsTab, setInitialSettingsTab] = useState('general');
  const [dataActions, setDataActions] = useState<DataActions>({});

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
    localStorage.setItem('assetbase-online-status', JSON.stringify(isOnline));
    
    const handleBrowserConnectivityChange = () => {
        setIsOnline(navigator.onLine);
    };
    window.addEventListener('online', handleBrowserConnectivityChange);
    window.addEventListener('offline', handleBrowserConnectivityChange);

    return () => {
      window.removeEventListener('online', handleBrowserConnectivityChange);
      window.removeEventListener('offline', handleBrowserConnectivityChange);
    };
  }, [isOnline]);
  
  const migrateSettings = useCallback(async (settings: AppSettings | null): Promise<AppSettings | null> => {
      if (settings && !(settings as any).grants) {
        const grantId = 'default-grant';
        const defaultGrant: Grant = {
            id: grantId,
            name: 'Default Project',
            sheetDefinitions: (settings as any).sheetDefinitions || {},
        };
        const migratedSettings: AppSettings = {
            ...settings,
            grants: [defaultGrant],
            activeGrantId: grantId,
        };
        delete (migratedSettings as any).sheetDefinitions;
        await saveLocalSettings(migratedSettings);
        return migratedSettings;
      }
      return settings;
  }, []);
  
  useEffect(() => {
    const initializeSettings = async () => {
        let settings: AppSettings | null = await getLocalSettings();

        // SPLIT DB STRATEGY: Prioritize Firestore for settings as it's more robust for structured config
        if (!settings && navigator.onLine) {
            try {
                // Try Firestore first for settings
                let cloudSettings = await getSettingsFS(); 
                if (!cloudSettings) {
                    // Fallback to RTDB if Firestore is empty
                    cloudSettings = await getSettingsRTDB();
                }
                
                if (cloudSettings) {
                    settings = cloudSettings;
                    await saveLocalSettings(settings);
                }
            } catch (e) {
                console.error("Failed to fetch settings from cloud", e);
            }
        }
        
        if (settings) {
            settings = await migrateSettings(settings);
        }

        if (!settings) {
            addNotification({ title: 'First-Time Setup', description: 'Creating default settings and user accounts.' });
            
            const grantId = uuidv4();
            const defaultGrant: Grant = {
                id: grantId,
                name: 'Default Project',
                sheetDefinitions: {},
            };

            const defaultUsers: AuthorizedUser[] = NIGERIAN_STATES.map(state => ({
                loginName: state.toLowerCase().replace(/[\s-]/g, ''),
                displayName: `${state} User`,
                states: [state],
                isAdmin: false,
                canAddAssets: true,
                canEditAssets: true,
                isGuest: false,
                password: 'password',
            }));
            
            const newSettings: AppSettings = {
                grants: [defaultGrant],
                activeGrantId: grantId,
                authorizedUsers: defaultUsers,
                lockAssetList: false,
                appMode: 'verification',
                lastModified: new Date().toISOString(),
            };

            settings = newSettings;
            await saveLocalSettings(settings);
            
            if (navigator.onLine) {
                // Save to both for initial split redundancy
                await Promise.allSettled([
                    updateSettingsRTDB(settings),
                    updateSettingsFS(settings)
                ]);
            }
        }

        setAppSettings(settings);
        if (settings?.activeGrantId) {
            setActiveGrantId(settings.activeGrantId);
        } else if (settings?.grants && settings.grants.length > 0) {
            setActiveGrantId(settings.grants[0].id);
        }
        
        // Default behavior: RTDB for assets
        setActiveDatabase('rtdb');
        setSettingsLoaded(true);
    };
    
    initializeSettings();
  }, [migrateSettings]);
  
  useEffect(() => {
    if (!settingsLoaded || !isOnline) return;

    const handleRemoteSettingsUpdate = async (remoteSettings: AppSettings | null) => {
       if (remoteSettings) {
         const remoteTimestamp = remoteSettings.lastModified ? new Date(remoteSettings.lastModified).getTime() : 0;
         const localTimestamp = appSettings?.lastModified ? new Date(appSettings.lastModified).getTime() : 0;

         if (!appSettings || remoteTimestamp > localTimestamp) {
            const migrated = await migrateSettings(remoteSettings);
            if (migrated) {
                await saveLocalSettings(migrated);
                setAppSettings(migrated);
            }
         }
       }
    };
    
    // Periodically check Firestore for settings updates
    const interval = setInterval(async () => {
        if (isOnline) {
            const settings = await getSettingsFS();
            handleRemoteSettingsUpdate(settings);
        }
    }, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, [settingsLoaded, isOnline, migrateSettings, appSettings]);

  useEffect(() => {
    if (typeof window !== 'undefined' && settingsLoaded) {
        const currentProjectId = firebaseConfig.projectId;
        const savedProjectId = localStorage.getItem('assetbase-firebase-project-id');

        if (currentProjectId && savedProjectId && currentProjectId !== savedProjectId) {
            setShowProjectSwitchDialog(true);
        }

        if (currentProjectId) {
            localStorage.setItem('assetbase-firebase-project-id', currentProjectId);
        }
    }
  }, [settingsLoaded]);

  useEffect(() => {
    if (appSettings && appSettings.appMode === 'management') {
      setSelectedStatuses([]);
    }
  }, [appSettings, setSelectedStatuses]);

  useEffect(() => {
      if (appSettings?.activeGrantId && activeGrantId !== appSettings.activeGrantId) {
          setActiveGrantId(appSettings.activeGrantId);
      }
  }, [appSettings?.activeGrantId, activeGrantId]);


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
    conditionOptions,
    setConditionOptions,
    sortConfig,
    setSortConfig,
    appSettings,
    setAppSettings,
    settingsLoaded,
    activeGrantId,
    setActiveGrantId,
    manualDownloadTrigger,
    setManualDownloadTrigger,
    manualUploadTrigger,
    setManualUploadTrigger,
    isSyncing,
    setIsSyncing,
    firstTimeSetupStatus,
    setFirstTimeSetupStatus,
    dataSource,
    setDataSource,
    assetToView,
    setAssetToView,
    isSettingsOpen,
    setIsSettingsOpen,
    initialSettingsTab,
    setInitialSettingsTab,
    dataActions,
    setDataActions,
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
