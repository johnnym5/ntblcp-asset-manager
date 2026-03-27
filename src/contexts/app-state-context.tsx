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
import { 
    updateSettings as updateSettingsRTDB, 
    getSettings as getSettingsRTDB,
    batchSetAssets as batchSetAssetsRTDB,
    getAssets as getAssetsRTDB
} from '@/lib/database';
import { 
    updateSettings as updateSettingsFS, 
    getSettings as getSettingsFS,
    batchSetAssets as batchSetAssetsFS,
    getAssets as getAssetsFS
} from '@/lib/firestore';
import { getLocalSettings, saveLocalSettings, saveAssets, getLocalAssets } from '@/lib/idb';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { addNotification } from '@/hooks/use-notifications';
import { v4 as uuidv4 } from 'uuid';
import { NIGERIAN_STATES } from '@/lib/constants';
import { logger } from '@/lib/logger';

export interface SortConfig {
  key: keyof Asset;
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
  setActiveGrantId: (id: string | null) => Promise<void>;

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
  const [isOnline, setIsOnline] = useState(true);
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

  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'sn', direction: 'asc' });

  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [activeGrantId, activeGrantIdSet] = useState<string | null>(null);

  const [manualDownloadTrigger, setManualDownloadTrigger] = useState(0);
  const [manualUploadTrigger, setManualUploadTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [firstTimeSetupStatus, setFirstTimeSetupStatus] = useState<'idle' | 'syncing' | 'complete'>('idle');

  const [dataSource, setDataSource] = useState<'cloud' | 'local_locked'>('cloud');
  const [assetToView, setAssetToView] = useState<Asset | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [initialSettingsTab, setInitialSettingsTab] = useState('general');
  const [dataActions, setDataActions] = useState<DataActions>({});
  const [showProjectSwitchDialog, setShowProjectSwitchDialog] = useState(false);
  const [activeDatabase, activeDatabaseSet] = useState<'firestore' | 'rtdb'>('firestore');

  const [onRevertAsset, setOnRevertAsset] = useState<(assetId: string) => Promise<void>>(() => async () => {});

  // Real-time Settings Listener (Broadcasting)
  useEffect(() => {
    if (!db) return;
    const settingsRef = doc(db, 'config', 'settings');
    const unsubscribe = onSnapshot(settingsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const remoteSettings = snapshot.data() as AppSettings;
        setAppSettings(remoteSettings);
        if (remoteSettings.activeGrantId) {
            activeGrantIdSet(remoteSettings.activeGrantId);
        }
        await saveLocalSettings(remoteSettings);
      }
    });
    return () => unsubscribe();
  }, []);

  // Strict Project Scoping: Switch logic
  const setActiveGrantId = async (id: string | null) => {
    if (!appSettings) return;
    const updated = { ...appSettings, activeGrantId: id };
    setAppSettings(updated);
    activeGrantIdSet(id);
    await updateSettingsFS(updated);
    // Project swap deactivates current view
    setAssets([]);
    setManualDownloadTrigger(prev => prev + 1);
  };

  // Database Management Logic: Auto-Backup on Toggle
  const setActiveDatabase = async (targetDb: 'firestore' | 'rtdb') => {
    if (targetDb === activeDatabase) return;
    
    setIsSyncing(true);
    addNotification({ title: 'Performing Database Handover...', description: 'Mirroring primary data to secondary source.' });
    
    try {
        const currentData = await getLocalAssets();
        if (targetDb === 'rtdb') {
            // Firestore was primary, move to RTDB
            await batchSetAssetsRTDB(currentData);
        } else {
            // RTDB was primary, move to Firestore
            await batchSetAssetsFS(currentData);
        }
        activeDatabaseSet(targetDb);
        addNotification({ title: 'Database Switch Successful', description: `Source is now ${targetDb.toUpperCase()}. Backup updated.` });
    } catch (e) {
        logger.error("Auto-backup switch failed", e);
        addNotification({ title: 'Switch Error', variant: 'destructive' });
    } finally {
        setIsSyncing(false);
    }
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
    missingFieldFilter, setMissingFieldFilter,
    dateFilter, setDateFilter,
    conditionFilter, setConditionFilter,
    locationOptions, setLocationOptions,
    assigneeOptions, setAssigneeOptions,
    statusOptions, setStatusOptions,
    conditionOptions, setConditionOptions,
    sortConfig, setSortConfig,
    appSettings, setAppSettings,
    settingsLoaded,
    activeGrantId, setActiveGrantId,
    manualDownloadTrigger, setManualDownloadTrigger,
    manualUploadTrigger, setManualUploadTrigger,
    isSyncing, setIsSyncing,
    firstTimeSetupStatus, setFirstTimeSetupStatus,
    dataSource, setDataSource,
    assetToView, setAssetToView,
    isSettingsOpen, setIsSettingsOpen,
    initialSettingsTab, setInitialSettingsTab,
    dataActions, setDataActions,
    showProjectSwitchDialog, setShowProjectSwitchDialog,
    activeDatabase, setActiveDatabase,
    onRevertAsset, setOnRevertAsset,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) throw new Error('useAppState must be used within AppStateProvider');
  return context;
};
