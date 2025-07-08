'use client';

import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction, useEffect } from 'react';
import type { OptionType } from '@/components/asset-filter-sheet';
import { TARGET_SHEETS } from '@/lib/constants';

export interface SortConfig {
  key: keyof import('@/lib/types').Asset;
  direction: 'asc' | 'desc';
}

interface AppStateContextType {
  isOnline: boolean;
  setIsOnline: Dispatch<SetStateAction<boolean>>;
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  globalStateFilter: string;
  setGlobalStateFilter: Dispatch<SetStateAction<string>>;
  
  // Filters
  selectedLocations: string[];
  setSelectedLocations: Dispatch<SetStateAction<string[]>>;
  selectedAssignees: string[];
  setSelectedAssignees: Dispatch<SetStateAction<string[]>>;
  selectedStatuses: string[];
  setSelectedStatuses: Dispatch<SetStateAction<string[]>>;
  
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

  // Sheet Settings
  enabledSheets: string[];
  setEnabledSheets: Dispatch<SetStateAction<string[]>>;
  
  // Sync Settings
  autoSync: boolean;
  setAutoSync: Dispatch<SetStateAction<boolean>>;
  manualSyncTrigger: number;
  setManualSyncTrigger: Dispatch<SetStateAction<number>>;
  isSyncing: boolean;
  setIsSyncing: Dispatch<SetStateAction<boolean>>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [globalStateFilter, setGlobalStateFilter] = useState('');
  
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  
  const [locationOptions, setLocationOptions] = useState<OptionType[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<OptionType[]>([]);
  const [statusOptions, setStatusOptions] = useState<OptionType[]>([]);
  
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'description', direction: 'asc' });

  const [enabledSheets, setEnabledSheets] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const savedSheets = localStorage.getItem('ntblcp-enabled-sheets');
      return savedSheets ? JSON.parse(savedSheets) : [...TARGET_SHEETS];
    }
    return [...TARGET_SHEETS];
  });
  
  const [autoSync, setAutoSync] = useState(() => {
    if (typeof window !== 'undefined') {
        const savedSync = localStorage.getItem('ntblcp-autosync');
        return savedSync ? JSON.parse(savedSync) : true;
    }
    return true;
  });

  const [manualSyncTrigger, setManualSyncTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    localStorage.setItem('ntblcp-enabled-sheets', JSON.stringify(enabledSheets));
  }, [enabledSheets]);
  
  useEffect(() => {
    localStorage.setItem('ntblcp-autosync', JSON.stringify(autoSync));
  }, [autoSync]);

  const value = {
    isOnline,
    setIsOnline,
    searchTerm,
    setSearchTerm,
    globalStateFilter,
    setGlobalStateFilter,
    selectedLocations,
    setSelectedLocations,
    selectedAssignees,
    setSelectedAssignees,
    selectedStatuses,
    setSelectedStatuses,
    locationOptions,
    setLocationOptions,
    assigneeOptions,
    setAssigneeOptions,
    statusOptions,
    setStatusOptions,
    sortConfig,
    setSortConfig,
    enabledSheets,
    setEnabledSheets,
    autoSync,
    setAutoSync,
    manualSyncTrigger,
    setManualSyncTrigger,
    isSyncing,
    setIsSyncing,
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
