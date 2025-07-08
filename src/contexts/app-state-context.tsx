'use client';

import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction, useEffect } from 'react';
import type { OptionType } from '@/components/multi-select-filter';
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
  selectedLocation: string;
  setSelectedLocation: Dispatch<SetStateAction<string>>;
  selectedAssignee: string;
  setSelectedAssignee: Dispatch<SetStateAction<string>>;
  selectedStatus: string;
  setSelectedStatus: Dispatch<SetStateAction<string>>;
  
  // Filter Options
  locationOptions: OptionType[];
  setLocationOptions: Dispatch<SetStateAction<OptionType[]>>;
  assigneeOptions: OptionType[];
  setAssigneeOptions: Dispatch<SetStateAction<OptionType[]>>;
  
  // Sorting
  sortConfig: SortConfig | null;
  setSortConfig: Dispatch<SetStateAction<SortConfig | null>>;

  // Sheet Settings
  enabledSheets: string[];
  setEnabledSheets: Dispatch<SetStateAction<string[]>>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [globalStateFilter, setGlobalStateFilter] = useState('');
  
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  
  const [locationOptions, setLocationOptions] = useState<OptionType[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<OptionType[]>([]);
  
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'description', direction: 'asc' });

  const [enabledSheets, setEnabledSheets] = useState<string[]>(() => {
    // Initialize from local storage or default to all sheets
    if (typeof window !== 'undefined') {
      const savedSheets = localStorage.getItem('ntblcp-enabled-sheets');
      return savedSheets ? JSON.parse(savedSheets) : [...TARGET_SHEETS];
    }
    return [...TARGET_SHEETS];
  });

  // Persist enabled sheets to local storage
  useEffect(() => {
    localStorage.setItem('ntblcp-enabled-sheets', JSON.stringify(enabledSheets));
  }, [enabledSheets]);

  const value = {
    isOnline,
    setIsOnline,
    searchTerm,
    setSearchTerm,
    globalStateFilter,
    setGlobalStateFilter,
    selectedLocation,
    setSelectedLocation,
    selectedAssignee,
    setSelectedAssignee,
    selectedStatus,
    setSelectedStatus,
    locationOptions,
    setLocationOptions,
    assigneeOptions,
    setAssigneeOptions,
    sortConfig,
    setSortConfig,
    enabledSheets,
    setEnabledSheets,
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
