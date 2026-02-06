
'use client';

import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction, useEffect, useMemo } from 'react';
import type { OptionType } from '@/components/asset-filter-sheet';
import { TARGET_SHEETS } from '@/lib/constants';
import type { Asset, AppSettings, AuthorizedUser } from '@/lib/types';
import { HEADER_DEFINITIONS } from '@/lib/constants';
import { getSettings, updateSettings } from '@/lib/firestore';
import { getLocalSettings, saveLocalSettings } from '@/lib/idb';


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
  { state: 'Abia', displayName: 'Abia Asset Manager', password: 'Abia!72#vX' },
  { state: 'Adamawa', displayName: 'Adamawa Asset Manager', password: 'Adam@94*nQ' },
  { state: 'Akwa Ibom', displayName: 'Akwa Ibom Asset Manager', password: 'Akwa$11&mB' },
  { state: 'Anambra', displayName: 'Anambra Asset Manager', password: 'Anam#85^kT' },
  { state: 'Bauchi', displayName: 'Bauchi Asset Manager', password: 'Bauc%33(rZ' },
  { state: 'Bayelsa', displayName: 'Bayelsa Asset Manager', password: 'Baye!62)pW' },
  { state: 'Benue', displayName: 'Benue Asset Manager', password: 'Benu*48@dX' },
  { state: 'Borno', displayName: 'Borno Asset Manager', password: 'Born&29#sL' },
  { state: 'Cross River', displayName: 'Cross River Asset Manager', password: 'Cros#77!fM' },
  { state: 'Delta', displayName: 'Delta Asset Manager', password: 'Delt$56^gH' },
  { state: 'Ebonyi', displayName: 'Ebonyi Asset Manager', password: 'Ebon@42*vR' },
  { state: 'Edo', displayName: 'Edo Asset Manager', password: 'EdoA!81(zQ' },
  { state: 'Ekiti', displayName: 'Ekiti Asset Manager', password: 'Ekit%19&pX' },
  { state: 'Enugu', displayName: 'Enugu Asset Manager', password: 'Enug#64@mN' },
  { state: 'Gombe', displayName: 'Gombe Asset Manager', password: 'Gomb$37^rW' },
  { state: 'Imo', displayName: 'Imo Asset Manager', password: 'ImoA*22#kL' },
  { state: 'Jigawa', displayName: 'Jigawa Asset Manager', password: 'Jiga&93!bV' },
  { state: 'Kaduna', displayName: 'Kaduna Asset Manager', password: 'Kadu#55(pT' },
  { state: 'Kano', displayName: 'Kano Asset Manager', password: 'Kano$18@sR' },
  { state: 'Katsina', displayName: 'Katsina Asset Manager', password: 'Kats%44*mZ' },
  { state: 'Kebbi', displayName: 'Kebbi Asset Manager', password: 'Kebb!76^dX' },
  { state: 'Kogi', displayName: 'Kogi Asset Manager', password: 'Kogi&31#vN' },
  { state: 'Kwara', displayName: 'Kwara Asset Manager', password: 'Kwar#88!pG' },
  { state: 'Lagos', displayName: 'Lagos Asset Manager', password: 'Lago$25(mT' },
  { state: 'Nasarawa', displayName: 'Nasarawa Asset Manager', password: 'Nasa%69@bF' },
  { state: 'Niger', displayName: 'Niger Asset Manager', password: 'Nige*52&rK' },
  { state: 'Ogun', displayName: 'Ogun Asset Manager', password: 'Ogun#14^zX' },
  { state: 'Ondo', displayName: 'Ondo Asset Manager', password: 'Ondo$97!hL' },
  { state: 'Osun', displayName: 'Osun Asset Manager', password: 'Osun%38#kQ' },
  { state: 'Oyo', displayName: 'Oyo Asset Manager', password: 'OyoA&21*vB' },
  { state: 'Plateau', displayName: 'Plateau Asset Manager', password: 'Plat#59(rW' },
  { state: 'Rivers', displayName: 'Rivers Asset Manager', password: 'Rive$46@nX' },
  { state: 'Sokoto', displayName: 'Sokoto Asset Manager', password: 'Soko%73^mT' },
  { state: 'Taraba', displayName: 'Taraba Asset Manager', password: 'Tara&12!kP' },
  { state: 'Yobe', displayName: 'Yobe Asset Manager', password: 'Yobe#84*bG' },
  { state: 'Zamfara', displayName: 'Zamfara Asset Manager', password: 'Zamf$66#rZ' },
].map(m => ({
  ...m,
  email: m.displayName.toLowerCase().replace(/ /g, '.') + '@domain.com'
}));


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
    const initializeSettings = async () => {
      let settings = await getLocalSettings();

      let isInitialSetup = false;
      if (!settings) {
        isInitialSetup = true;
        settings = {
          authorizedUsers: [],
          sheetDefinitions: HEADER_DEFINITIONS,
          enabledSheets: TARGET_SHEETS,
          lockAssetList: true,
        };
      }
      
      let currentUsers = settings.authorizedUsers || [];
      let usersModified = false;
      
      const userMap = new Map(currentUsers.map(u => [u.email.toLowerCase(), u]));

      stateManagersToAdd.forEach(manager => {
          const loginName = manager.displayName.toLowerCase().replace(/ /g, '-');
          const existingUser = userMap.get(manager.email.toLowerCase());

          if (!existingUser) {
              currentUsers.push({
                  loginName: loginName,
                  displayName: manager.displayName,
                  email: manager.email,
                  password: manager.password,
                  states: [manager.state],
                  isAdmin: false,
                  isGuest: false,
                  canAddAssets: true,
                  canEditAssets: true,
              });
              usersModified = true;
          } else {
              const needsUpdate = 
                  existingUser.displayName !== manager.displayName ||
                  existingUser.password !== manager.password ||
                  existingUser.loginName !== loginName ||
                  JSON.stringify(existingUser.states.sort()) !== JSON.stringify([manager.state].sort());
              
              if (needsUpdate) {
                  const userIndex = currentUsers.findIndex(u => u.email.toLowerCase() === manager.email.toLowerCase());
                  if (userIndex !== -1) {
                      currentUsers[userIndex] = {
                          ...currentUsers[userIndex],
                          loginName: loginName,
                          displayName: manager.displayName,
                          password: manager.password,
                          states: [manager.state],
                      };
                      usersModified = true;
                  }
              }
          }
      });
      
      const adminEmail = 'jegbase@gmail.com';
      const adminIndex = currentUsers.findIndex(u => u.email.toLowerCase() === adminEmail);

      if (adminIndex !== -1) {
        if (!currentUsers[adminIndex].isAdmin || currentUsers[adminIndex].loginName !== 'jegbase') {
          currentUsers[adminIndex] = { ...currentUsers[adminIndex], isAdmin: true, states: ['All'], loginName: 'jegbase' };
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
        settings.authorizedUsers = currentUsers;
        await saveLocalSettings(settings);
      }
      
      if (isInitialSetup && usersModified && typeof window !== 'undefined' && navigator.onLine) {
        await updateSettings(settings);
      }

      setAppSettings(settings);
    };

    initializeSettings();
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
