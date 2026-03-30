'use client';

import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction, useEffect } from 'react';
import type { OptionType } from '@/components/asset-filter-sheet';
import { TARGET_SHEETS } from '@/lib/constants';
import type { Asset, AppSettings, Grant } from '@/lib/types';
import { HEADER_DEFINITIONS } from '@/lib/constants';
import { updateSettings as updateSettingsFS } from '@/lib/firestore';
import { getLocalSettings, saveLocalSettings } from '@/lib/idb';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '@/lib/firebase';

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
  
  selectedLocations: string[];
  setSelectedLocations: Dispatch<SetStateAction<string[]>>;
  selectedAssignees: string[];
  setSelectedAssignees: Dispatch<SetStateAction<string[]>>;
  selectedStatuses: string[];
  setSelectedStatuses: Dispatch<SetStateAction<string[]>>;
  selectedConditions: string[];
  setSelectedConditions: Dispatch<SetStateAction<string[]>>;
  missingFieldFilter: string;
  setMissingFieldFilter: Dispatch<SetStateAction<string>>;
  
  locationOptions: OptionType[];
  setLocationOptions: Dispatch<SetStateAction<OptionType[]>>;
  assigneeOptions: OptionType[];
  setAssigneeOptions: Dispatch<SetStateAction<OptionType[]>>;
  statusOptions: OptionType[];
  setStatusOptions: Dispatch<SetStateAction<OptionType[]>>;
  conditionOptions: OptionType[];
  setConditionOptions: Dispatch<SetStateAction<OptionType[]>>;
  
  sortConfig: SortConfig | null;
  setSortConfig: Dispatch<SetStateAction<SortConfig | null>>;

  appSettings: AppSettings;
  setAppSettings: Dispatch<SetStateAction<AppSettings>>;
  settingsLoaded: boolean;
  
  activeGrantId: string | null;
  setActiveGrantId: (id: string | null) => void;

  manualDownloadTrigger: number;
  setManualDownloadTrigger: Dispatch<SetStateAction<number>>;
  manualUploadTrigger: number;
  setManualUploadTrigger: Dispatch<SetStateAction<number>>;
  isSyncing: boolean;
  setIsSyncing: Dispatch<SetStateAction<boolean>>;

  unreadInboxCount: number;
  setUnreadInboxCount: Dispatch<SetStateAction<number>>;

  assetToView: Asset | null;
  setAssetToView: Dispatch<SetStateAction<Asset | null>>;
  dataActions: DataActions;
  setDataActions: Dispatch<SetStateAction<DataActions>>;
  
  activeDatabase: 'firestore' | 'rtdb';
  setActiveDatabase: (db: 'firestore' | 'rtdb') => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

const DEFAULT_GRANT: Grant = {
  id: 'default-registry',
  name: 'Main Asset Register',
  sheetDefinitions: HEADER_DEFINITIONS,
  enabledSheets: TARGET_SHEETS,
};

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [offlineAssets, setOfflineAssets] = useState<Asset[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [globalStateFilters, setGlobalStateFilters] = useState<string[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [missingFieldFilter, setMissingFieldFilter] = useState('');
  
  const [locationOptions, setLocationOptions] = useState<OptionType[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<OptionType[]>([]);
  const [statusOptions, setStatusOptions] = useState<OptionType[]>([]);
  const [conditionOptions, setConditionOptions] = useState<OptionType[]>([]);
  
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'sn', direction: 'asc' });

  const [appSettings, setAppSettings] = useState<AppSettings>({
    grants: [DEFAULT_GRANT],
    activeGrantId: DEFAULT_GRANT.id,
    authorizedUsers: [],
    lockAssetList: true,
    appMode: 'management',
    activeDatabase: 'firestore',
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [manualDownloadTrigger, setManualDownloadTrigger] = useState(0);
  const [manualUploadTrigger, setManualUploadTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);
  const [dataSource, setDataSource] = useState<'cloud' | 'local_locked'>('cloud');
  const [assetToView, setAssetToView] = useState<Asset | null>(null);
  const [dataActions, setDataActions] = useState<DataActions>({});

  // 1. Initial Load from IndexedDB
  useEffect(() => {
    const initialize = async () => {
      let local = await getLocalSettings();
      if (!local) {
        local = {
          grants: [DEFAULT_GRANT],
          activeGrantId: DEFAULT_GRANT.id,
          authorizedUsers: [],
          lockAssetList: true,
          appMode: 'management',
          activeDatabase: 'firestore',
        };
        await saveLocalSettings(local);
      }
      setAppSettings(local);
      setSettingsLoaded(true);
    };
    initialize();
  }, []);

  // 2. Real-Time Cloud Listeners (Config Broadcast)
  useEffect(() => {
    if (!isOnline || !db) return;

    let unsubscribe: () => void = () => {};
    
    if (appSettings.activeDatabase === 'firestore') {
      unsubscribe = onSnapshot(doc(db, 'config', 'settings'), (docSnap) => {
        if (docSnap.exists()) {
          const remote = docSnap.data() as AppSettings;
          setAppSettings(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(remote)) {
              saveLocalSettings(remote);
              return remote;
            }
            return prev;
          });
        }
      });
    } else if (appSettings.activeDatabase === 'rtdb' && rtdb) {
      const settingsRef = ref(rtdb, 'config/settings');
      onValue(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
          const remote = snapshot.val() as AppSettings;
          setAppSettings(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(remote)) {
              saveLocalSettings(remote);
              return remote;
            }
            return prev;
          });
        }
      });
    }

    return () => unsubscribe();
  }, [isOnline, appSettings.activeDatabase]);

  // 3. Asset Synchronization (Project-Scoped)
  useEffect(() => {
    if (!isOnline || !appSettings.activeGrantId) return;

    let unsubscribe: () => void = () => {};

    if (appSettings.activeDatabase === 'firestore' && db) {
      const q = query(collection(db, 'assets'), where('grantId', '==', appSettings.activeGrantId));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const fetched = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Asset));
        setAssets(fetched);
      });
    } else if (appSettings.activeDatabase === 'rtdb' && rtdb) {
      const assetsRef = ref(rtdb, 'assets');
      onValue(assetsRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const fetched = Object.entries(data)
            .map(([id, val]: [string, any]) => ({ ...val, id }))
            .filter(a => a.grantId === appSettings.activeGrantId);
          setAssets(fetched);
        } else {
          setAssets([]);
        }
      });
    }

    return () => unsubscribe();
  }, [isOnline, appSettings.activeGrantId, appSettings.activeDatabase]);

  const setActiveGrantId = async (id: string | null) => {
    const updated = { ...appSettings, activeGrantId: id };
    setAppSettings(updated);
    await saveLocalSettings(updated);
    if (isOnline) await updateSettingsFS(updated);
  };

  const setActiveDatabase = async (choice: 'firestore' | 'rtdb') => {
    const updated = { ...appSettings, activeDatabase: choice };
    setAppSettings(updated);
    await saveLocalSettings(updated);
    if (isOnline) await updateSettingsFS(updated);
  };

  const value = {
    assets, setAssets,
    offlineAssets, setOfflineAssets,
    isOnline, setIsOnline,
    searchTerm, setSearchTerm,
    globalStateFilters, setGlobalStateFilters,
    itemsPerPage, setItemsPerPage,
    selectedLocations, setSelectedLocations,
    selectedAssignees, setSelectedAssignees,
    selectedStatuses, setSelectedStatuses,
    selectedConditions, setSelectedConditions,
    missingFieldFilter, setMissingFieldFilter,
    locationOptions, setLocationOptions,
    assigneeOptions, setAssigneeOptions,
    statusOptions, setStatusOptions,
    conditionOptions, setConditionOptions,
    sortConfig, setSortConfig,
    appSettings, setAppSettings,
    settingsLoaded,
    activeGrantId: appSettings.activeGrantId,
    setActiveGrantId,
    manualDownloadTrigger, setManualDownloadTrigger,
    manualUploadTrigger, setManualUploadTrigger,
    isSyncing, setIsSyncing,
    unreadInboxCount, setUnreadInboxCount,
    dataSource, setDataSource,
    assetToView, setAssetToView,
    dataActions, setDataActions,
    activeDatabase: appSettings.activeDatabase,
    setActiveDatabase,
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
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
};
