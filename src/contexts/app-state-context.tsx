'use client';

import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction, useEffect, useMemo } from 'react';
import type { OptionType } from '@/components/asset-filter-sheet';
import { TARGET_SHEETS } from '@/lib/constants';
import type { Asset, AppSettings, AuthorizedUser } from '@/lib/types';
import { HEADER_DEFINITIONS } from '@/lib/constants';
import { getSettings, updateSettings } from '@/lib/firestore';


export interface SortConfig {
  key: keyof import('@/lib/types').Asset;
  direction: 'asc' | 'desc';
}

export interface DataActions {
  onImport?: () => void;
  onExport?: () => void;
  onAddAsset?: () => void;
  onClearAll?: () => void;
  onTravelReport?: () => void;
  isImporting?: boolean;
  isAdmin?: boolean;
  hasAssets?: boolean;
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
  
  // Sync Settings
  manualDownloadTrigger: number;
  setManualDownloadTrigger: Dispatch<SetStateAction<number>>;
  manualUploadTrigger: number;
  setManualUploadTrigger: Dispatch<SetStateAction<number>>;
  isSyncing: boolean;
  setIsSyncing: Dispatch<SetStateAction<boolean>>;
  
  // Data Actions
  dataActions: DataActions;
  setDataActions: Dispatch<SetStateAction<DataActions>>;

  // Inbox count for UI display
  unreadInboxCount: number;
  setUnreadInboxCount: Dispatch<SetStateAction<number>>;
  dismissedActivities: string[];
  setDismissedActivities: Dispatch<SetStateAction<string[]>>;

  // Cross-component communication
  assetToView: Asset | null;
  setAssetToView: Dispatch<SetStateAction<Asset | null>>;
}

const stateManagersToAdd = [
  { state: "Abia", email: "manager.abia@domain.com", password: "zX9!pL2#mN" },
  { state: "Adamawa", email: "manager.adamawa@domain.com", password: "vR5*tB8&qW" },
  { state: "Akwa Ibom", email: "manager.akwaibom@domain.com", password: "kY1@sH7^dX" },
  { state: "Anambra", email: "manager.anambra@domain.com", password: "mJ4$fG9(bZ" },
  { state: "Bauchi", email: "manager.bauchi@domain.com", password: "pQ2)nK6%vT" },
  { state: "Bayelsa", email: "manager.bayelsa@domain.com", password: "cL8!rV3#wY" },
  { state: "Benue", email: "manager.benue@domain.com", password: "xZ5*mT1&uP" },
  { state: "Borno", email: "manager.borno@domain.com", password: "hN9@jL4^rK" },
  { state: "Cross River", email: "manager.crossriver@domain.com", password: "bF7$dS2(gM" },
  { state: "Delta", email: "manager.delta@domain.com", password: "vT3)kX8%nB" },
  { state: "Ebonyi", email: "manager.ebonyi@domain.com", password: "qW1!pZ6#fR" },
  { state: "Edo", email: "manager.edo@domain.com", password: "mG5*hY9&tL" },
  { state: "Ekiti", email: "manager.ekiti@domain.com", password: "jK2@rD7^vP" },
  { state: "Enugu", email: "manager.enugu@domain.com", password: "sX4$bN8(zQ" },
  { state: "Gombe", email: "manager.gombe@domain.com", password: "wY9)mT3%hL" },
  { state: "Imo", email: "manager.imo@domain.com", password: "vR1!kZ5#pB" },
  { state: "Jigawa", email: "manager.jigawa@domain.com", password: "nG7*dX2&qM" },
  { state: "Kaduna", email: "manager.kaduna@domain.com", password: "hT4@fS9^bZ" },
  { state: "Kano", email: "manager.kano@domain.com", password: "pL6$wY1(rK" },
  { state: "Katsina", email: "manager.katsina@domain.com", password: "mX3)vN8%tD" },
  { state: "Kebbi", email: "manager.kebbi@domain.com", password: "bH9!rG4#qZ" },
  { state: "Kogi", email: "manager.kogi@domain.com", password: "zV2*mT7&fP" },
  { state: "Kwara", email: "manager.kwara@domain.com", password: "sK5@hL9^xR" },
  { state: "Lagos", email: "manager.lagos@domain.com", password: "nB1$pD6(vT" },
  { state: "Nasarawa", email: "manager.nasarawa@domain.com", password: "qW8)rZ3%mY" },
  { state: "Niger", email: "manager.niger@domain.com", password: "fX5!hT2#kG" },
  { state: "Ogun", email: "manager.ogun@domain.com", password: "vL9*mS4&pB" },
  { state: "Ondo", email: "manager.ondo@domain.com", password: "zR1@qW7^dX" },
  { state: "Osun", email: "manager.osun@domain.com", password: "mT4$vK8(bG" },
  { state: "Oyo", email: "manager.oyo@domain.com", password: "pY9)nS2%fR" },
  { state: "Plateau", email: "manager.plateau@domain.com", password: "hK1!rX6#vT" },
  { state: "Rivers", email: "manager.rivers@domain.com", password: "mD5*zG9&qW" },
  { state: "Sokoto", email: "manager.sokoto@domain.com", password: "bL2@hT7^pX" },
  { state: "Taraba", email: "manager.taraba@domain.com", password: "sZ4$vN8(kG" },
  { state: "Yobe", email: "manager.yobe@domain.com", password: "qW9)rB3%mT" },
  { state: "Zamfara", email: "manager.zamfara@domain.com", password: "fX1!pL6#hR" },
];


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
  
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'description', direction: 'asc' });

  const [appSettings, setAppSettings] = useState<AppSettings>({
    authorizedUsers: [],
    sheetDefinitions: HEADER_DEFINITIONS,
    enabledSheets: TARGET_SHEETS,
    lockAssetList: true,
    autoSyncEnabled: true,
  });

  const [manualDownloadTrigger, setManualDownloadTrigger] = useState(0);
  const [manualUploadTrigger, setManualUploadTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dataActions, setDataActions] = useState<DataActions>({});
  
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);
  const [dismissedActivities, setDismissedActivities] = useState<string[]>([]);

  const [dataSource, setDataSource] = useState<'cloud' | 'local_locked'>('cloud');
  const [assetToView, setAssetToView] = useState<Asset | null>(null);

  useEffect(() => {
    const fetchAndEnsureUsers = async () => {
      const settingsFromDb = await getSettings();
      let currentUsers = settingsFromDb?.authorizedUsers || [];
      let usersModified = false;
      
      const userMap = new Map(currentUsers.map(u => [u.email.toLowerCase(), u]));
      
      stateManagersToAdd.forEach(manager => {
          if (!userMap.has(manager.email)) {
              const loginName = manager.email.split('@')[0].replace('.', '-');
              currentUsers.push({
                  loginName: loginName,
                  displayName: `${manager.state} Manager`,
                  email: manager.email,
                  password: manager.password,
                  states: [manager.state],
                  isAdmin: false,
                  isGuest: false,
                  canAddAssets: true,
                  canEditAssets: true,
              });
              usersModified = true;
          }
      });

      const adminEmail = 'jegbase@gmail.com';
      const adminIndex = currentUsers.findIndex(u => u.email.toLowerCase() === adminEmail);

      if (adminIndex !== -1) {
        if (!currentUsers[adminIndex].isAdmin) {
          currentUsers[adminIndex] = { ...currentUsers[adminIndex], isAdmin: true, states: ['All'] };
          usersModified = true;
        }
      } else {
        currentUsers.push({
          loginName: 'jegbase',
          displayName: 'Jegbase Admin',
          email: adminEmail,
          password: 'password',
          states: ['All'],
          isAdmin: true,
          isGuest: false,
          canAddAssets: true,
          canEditAssets: true,
        });
        usersModified = true;
      }
      
      if (usersModified) {
        await updateSettings({ authorizedUsers: currentUsers });
      }
      
      setAppSettings(prev => ({
        ...prev,
        ...(settingsFromDb || {}),
        authorizedUsers: currentUsers,
        sheetDefinitions: settingsFromDb?.sheetDefinitions || HEADER_DEFINITIONS,
        enabledSheets: settingsFromDb?.enabledSheets || TARGET_SHEETS,
        lockAssetList: settingsFromDb?.lockAssetList ?? true,
        autoSyncEnabled: settingsFromDb?.autoSyncEnabled ?? true,
      }));
    };

    fetchAndEnsureUsers();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ntblcp-online-status', JSON.stringify(isOnline));
    }
  }, [isOnline]);

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
    manualDownloadTrigger, setManualDownloadTrigger,
    manualUploadTrigger, setManualUploadTrigger,
    isSyncing, setIsSyncing,
    dataActions, setDataActions,
    unreadInboxCount, setUnreadInboxCount,
    dismissedActivities, setDismissedActivities,
    dataSource, setDataSource,
    assetToView, setAssetToView
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
