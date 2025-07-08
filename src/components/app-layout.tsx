
"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Boxes,
  Home,
  PanelLeft,
  Settings,
  LogOut,
  User,
  Search,
  Cloud,
  CloudOff,
  Filter,
  ArrowUpDown,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { addNotification } from "@/hooks/use-notifications";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "./ui/skeleton";
import { useAppState } from "@/contexts/app-state-context";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import type { OptionType } from "./multi-select-filter";
import type { Asset } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { userProfile, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { 
    isOnline, setIsOnline, 
    searchTerm, setSearchTerm, 
    locationOptions,
    assigneeOptions,
    selectedLocation, setSelectedLocation,
    selectedAssignee, setSelectedAssignee,
    selectedStatus, setSelectedStatus,
    sortConfig, setSortConfig
  } = useAppState();

  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const debouncedSearchTerm = useDebounce(localSearchTerm, 300);
  const [locationPopoverOpen, setLocationPopoverOpen] = useState(false);
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);

  useEffect(() => {
    setSearchTerm(debouncedSearchTerm);
  }, [debouncedSearchTerm, setSearchTerm]);

  // Reset local search when global search is cleared
  useEffect(() => {
    if (searchTerm === '') {
        setLocalSearchTerm('');
    }
  }, [searchTerm]);
  
  const handleLogout = () => {
    logout();
    addNotification({
      title: 'Session Ended',
      description: 'You have been logged out.',
    });
    router.refresh();
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    if (name.includes(' ')) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  
  const getUserName = () => {
    return userProfile?.displayName || "User";
  }

  const statusOptions: OptionType[] = [
      { value: "Verified", label: "Verified" },
      { value: "Unverified", label: "Unverified" },
      { value: "Discrepancy", label: "Discrepancy" },
  ];

  const sortableFields: { key: keyof Asset, label: string }[] = [
      { key: 'description', label: 'Description' },
      { key: 'category', label: 'Category' },
      { key: 'location', label: 'Location' },
      { key: 'verifiedDate', label: 'Verified Date' },
      { key: 'assetIdCode', label: 'Asset ID' },
  ];

  const handleSort = (key: keyof Asset) => {
    setSortConfig(prev => {
        if (prev?.key === key && prev.direction === 'asc') {
            return { key, direction: 'desc' };
        }
        return { key, direction: 'asc' };
    });
  };
  
  const handleClearFilters = () => {
    setSelectedLocation('');
    setSelectedAssignee('');
    setSelectedStatus('');
  };

  const activeFilterCount = [selectedLocation, selectedAssignee, selectedStatus].filter(Boolean).length;

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Boxes className="h-5 w-5 text-primary" />
            </Button>
            <span className="text-lg font-semibold">Asset Assist</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center justify-between w-full p-2 text-sm">
                <Label htmlFor="online-mode-toggle" className="flex items-center gap-2">
                  {isOnline ? <Cloud className="h-4 w-4 text-green-500" /> : <CloudOff className="h-4 w-4 text-red-500" />}
                  {isOnline ? 'Online Mode' : 'Offline Mode'}
                </Label>
                <Switch
                  id="online-mode-toggle"
                  checked={isOnline}
                  onCheckedChange={(online) => {
                    setIsOnline(online);
                    addNotification({
                      title: `Mode Changed to ${online ? 'Online' : 'Offline'}`,
                      description: online
                        ? 'Application is now connected to the server.'
                        : 'Application is running in offline mode.',
                    });
                  }}
                  aria-label={`Switch to ${isOnline ? 'Offline' : 'Online'} mode`}
                />
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/assets" >
                <Home />
                Assets
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="#">
                <Settings />
                Settings
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <div className="flex flex-col w-full">
        <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:h-16 md:px-6">
          <SidebarTrigger className="flex md:hidden">
            <PanelLeft />
            <span className="sr-only">Toggle Sidebar</span>
          </SidebarTrigger>
          <div className="flex-1">
             {pathname === '/assets' && (
                <div className="relative flex items-center w-full h-10 rounded-md border border-input bg-muted shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary max-w-lg">
                    <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search assets..."
                        className="pl-10 pr-20 w-full h-full bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        value={localSearchTerm}
                        onChange={(e) => setLocalSearchTerm(e.target.value)}
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Sort assets">
                                    <ArrowUpDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {sortableFields.map(field => (
                                    <DropdownMenuItem key={field.key} onClick={() => handleSort(field.key)}>
                                        {field.label}
                                        {sortConfig?.key === field.key && (
                                            <span className="ml-auto text-xs">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 relative" aria-label="Filter assets">
                                    <Filter className="h-4 w-4" />
                                    {activeFilterCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-[300px] p-0">
                                <div className="p-4 space-y-4">
                                    <h4 className="font-medium leading-none">Filters</h4>
                                    
                                    <div className="space-y-2">
                                        <Label>Location</Label>
                                        <Popover open={locationPopoverOpen} onOpenChange={setLocationPopoverOpen}>
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant="outline"
                                              role="combobox"
                                              aria-expanded={locationPopoverOpen}
                                              className="w-full justify-between"
                                            >
                                              {selectedLocation
                                                ? locationOptions.find((option) => option.value === selectedLocation)?.label
                                                : "All Locations"}
                                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command>
                                              <CommandInput placeholder="Search location..." />
                                              <CommandList>
                                                <ScrollArea className="h-[200px]">
                                                  <CommandEmpty>No location found.</CommandEmpty>
                                                  <CommandGroup>
                                                    <CommandItem value="All Locations" onSelect={() => { setSelectedLocation(''); setLocationPopoverOpen(false); }}>
                                                      <Check className={cn("mr-2 h-4 w-4", selectedLocation === '' ? "opacity-100" : "opacity-0")} />
                                                      All Locations
                                                    </CommandItem>
                                                    {locationOptions.map((option) => (
                                                      <CommandItem
                                                        key={option.value}
                                                        value={option.label}
                                                        onSelect={(currentValue) => {
                                                          const value = locationOptions.find(o => o.label.toLowerCase() === currentValue.toLowerCase())?.value || ''
                                                          setSelectedLocation(value);
                                                          setLocationPopoverOpen(false);
                                                        }}
                                                      >
                                                        <Check className={cn("mr-2 h-4 w-4", selectedLocation === option.value ? "opacity-100" : "opacity-0")} />
                                                        {option.label}
                                                      </CommandItem>
                                                    ))}
                                                  </CommandGroup>
                                                </ScrollArea>
                                              </CommandList>
                                            </Command>
                                          </PopoverContent>
                                        </Popover>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label>Assignee</Label>
                                        <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant="outline"
                                              role="combobox"
                                              aria-expanded={assigneePopoverOpen}
                                              className="w-full justify-between"
                                            >
                                              {selectedAssignee
                                                ? assigneeOptions.find((option) => option.value === selectedAssignee)?.label
                                                : "All Assignees"}
                                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command>
                                              <CommandInput placeholder="Search assignee..." />
                                              <CommandList>
                                                <ScrollArea className="h-[200px]">
                                                  <CommandEmpty>No assignee found.</CommandEmpty>
                                                  <CommandGroup>
                                                    <CommandItem value="All Assignees" onSelect={() => { setSelectedAssignee(''); setAssigneePopoverOpen(false); }}>
                                                      <Check className={cn("mr-2 h-4 w-4", selectedAssignee === '' ? "opacity-100" : "opacity-0")} />
                                                      All Assignees
                                                    </CommandItem>
                                                    {assigneeOptions.map((option) => (
                                                      <CommandItem
                                                        key={option.value}
                                                        value={option.label}
                                                        onSelect={(currentValue) => {
                                                          const value = assigneeOptions.find(o => o.label.toLowerCase() === currentValue.toLowerCase())?.value || ''
                                                          setSelectedAssignee(value);
                                                          setAssigneePopoverOpen(false);
                                                        }}
                                                      >
                                                        <Check className={cn("mr-2 h-4 w-4", selectedAssignee === option.value ? "opacity-100" : "opacity-0")} />
                                                        {option.label}
                                                      </CommandItem>
                                                    ))}
                                                  </CommandGroup>
                                                </ScrollArea>
                                              </CommandList>
                                            </Command>
                                          </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Status</Label>
                                        <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value === 'all' ? '' : value)}>
                                            <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Statuses</SelectItem>
                                                <SelectSeparator />
                                                {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    
                                    <Button variant="outline" className="w-full" onClick={handleClearFilters} disabled={activeFilterCount === 0}>
                                        Clear All Filters
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
            {loading ? (
              <Skeleton className="h-10 w-10 rounded-full" />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={''} alt={getUserName()} />
                      <AvatarFallback>{getInitials(userProfile?.displayName)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{getUserName()}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4"/>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4"/>
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        <main className="flex-1 flex flex-col p-4 md:p-6">{children}</main>
      </div>
    </SidebarProvider>
  );
}
