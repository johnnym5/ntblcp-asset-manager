'use client';

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useCallback,
} from 'react';
import type { OptionType } from '@/components/asset-filter-sheet';
import type { Asset, AppSettings, Grant, AuthorizedUser } from '@/lib/types';
import { updateSettings as updateSettingsRTDB, getSettings as getSettingsRTDB } from '@/lib/database';
import { updateSettings as updateSettingsFS, getSettings as getSettingsFS } from '@/lib/firestore';
import { getLocalSettings, saveLocalSettings } from '@/lib/idb';
import { db, rtdb, firebaseConfig } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { addNotification } from '@/hooks/use-notifications';
import { v4 as uuidv4 } from 'uuid';
import { NIGERIAN_STATES, NIGERIAN_ZONES } from '@/lib/constants';
import { assetMatchesGlobalFilter } from '@/lib/utils';
import { logger } from '@/lib/logger';

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
  globalStateFilters: string[];
  setGlobalStateFilters: Dispatch<SetStateAction<string[]>>;
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
  setActiveDatabase: (db: 'firestore' | 'rtdb') => Promise<void>;

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
      const savedStatus = localStorage.getItem('assetain-online-status');
      return savedStatus ? JSON.parse(savedStatus) : true;
    }
    return true;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [globalStateFilters, setGlobalStateFilters] = useState<string[]>(['All']);
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
  const [activeGrantId, activeGrantIdSet] = useState<string | null>(null);

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
  
  const [activeDatabase, setActiveDatabaseInternal] = useState<'firestore' | 'rtdb'>(() => {
      if (typeof window !== 'undefined') {
          return (localStorage.getItem('assetain-active-db') as 'firestore' | 'rtdb') || 'rtdb';
      }
      return 'rtdb';
  });

  const [onRevertAsset, setOnRevertAsset] = useState<
    (assetId: string) => Promise<void>
  >(() => async () => {});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('assetain-online-status', JSON.stringify(isOnline));
    
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
            activeDatabase: activeDatabase,
        };
        delete (migratedSettings as any).sheetDefinitions;
        await saveLocalSettings(migratedSettings);
        return migratedSettings;
      }
      return settings;
  }, [activeDatabase]);
  
  useEffect(() => {
    const initializeSettings = async () => {
        let settings: AppSettings | null = await getLocalSettings();

        if (navigator.onLine) {
            try {
                let cloudSettings = activeDatabase === 'rtdb' ? await getSettingsRTDB() : await getSettingsFS();
                if (!cloudSettings) {
                    cloudSettings = activeDatabase === 'rtdb' ? await getSettingsFS() : await getSettingsRTDB();
                }
                
                if (cloudSettings) {
                    settings = cloudSettings;
                    await saveLocalSettings(settings);
                }
            } catch (e) {
                logger.error("Failed to fetch settings from cloud", e);
            }
        }
        
        if (settings) {
            settings = await migrateSettings(settings);
        }

        if (!settings) {
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
                activeDatabase: activeDatabase,
                lastModified: new Date().toISOString(),
            };

            settings = newSettings;
            await saveLocalSettings(settings);
            
            if (navigator.onLine) {
                await Promise.allSettled([
                    updateSettingsRTDB(settings),
                    updateSettingsFS(settings)
                ]);
            }
        }

        setAppSettings(settings);
        if (settings?.activeGrantId) {
            activeGrantIdSet(settings.activeGrantId);
        }
        
        setSettingsLoaded(true);
    };
    
    initializeSettings();
  }, [migrateSettings, activeDatabase]);

  // Real-time listener for Configuration Settings - Automatic Broadcast
  useEffect(() => {
    if (!isOnline || !settingsLoaded) return;

    let unsubscribe: () => void = () => {};

    if (activeDatabase === 'firestore' && db) {
        const settingsRef = doc(db, 'config', 'settings');
        unsubscribe = onSnapshot(settingsRef, async (snapshot) => {
            if (snapshot.exists()) {
                const remoteSettings = snapshot.data() as AppSettings;
                const localSettings = await getLocalSettings();
                if (JSON.stringify(remoteSettings) !== JSON.stringify(localSettings)) {
                    logger.log("Cloud (Firestore) config updated. Broadcasting to local state...");
                    await saveLocalSettings(remoteSettings);
                    setAppSettings(remoteSettings);
                    if (remoteSettings.activeGrantId && remoteSettings.activeGrantId !== activeGrantId) {
                        activeGrantIdSet(remoteSettings.activeGrantId);
                    }
                }
            }
        });
    } else if (activeDatabase === 'rtdb' && rtdb) {
        const settingsRef = ref(rtdb, 'config/settings');
        unsubscribe = onValue(settingsRef, async (snapshot) => {
            if (snapshot.exists()) {
                const remoteSettings = snapshot.val() as AppSettings;
                const localSettings = await getLocalSettings();
                if (JSON.stringify(remoteSettings) !== JSON.stringify(localSettings)) {
                    logger.log("Cloud (RTDB) config updated. Broadcasting to local state...");
                    await saveLocalSettings(remoteSettings);
                    setAppSettings(remoteSettings);
                    if (remoteSettings.activeGrantId && remoteSettings.activeGrantId !== activeGrantId) {
                        activeGrantIdSet(remoteSettings.activeGrantId);
                    }
                }
            }
        });
    }

    return () => unsubscribe();
  }, [isOnline, activeDatabase, settingsLoaded, activeGrantId]);
  
  const setActiveDatabase = async (newDb: 'firestore' | 'rtdb') => {
      setActiveDatabaseInternal(newDb);
      if (typeof window !== 'undefined') {
          localStorage.setItem('assetain-active-db', newDb);
      }
      
      if (appSettings) {
          const updatedSettings = { ...appSettings, activeDatabase: newDb };
          setAppSettings(updatedSettings);
          await saveLocalSettings(updatedSettings);
          
          if (isOnline) {
              await Promise.allSettled([
                  updateSettingsFS(updatedSettings),
                  updateSettingsRTDB(updatedSettings)
              ]);
          }
      }
  };

  const setActiveGrantId = (id: string | null) => {
      activeGrantIdSet(id);
  }

  const value = {
    assets,
    setAssets,
    offlineAssets,
    setOfflineAssets,
    isOnline,
    setIsOnline,
    searchTerm,
    setSearchTerm,
    globalStateFilters,
    setGlobalStateFilters,
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
