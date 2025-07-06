
"use client";

import React from "react";
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
  CloudOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "./ui/skeleton";
import { useAppState } from "@/contexts/app-state-context";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { userProfile, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isOnline, setIsOnline, searchTerm, setSearchTerm } = useAppState();

  const handleLogout = () => {
    logout();
    toast({
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
                  onCheckedChange={setIsOnline}
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
              <div className="relative w-full max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by any detail (e.g. 'Dell XPS Lagos')..."
                  className="pl-8 w-full h-9 bg-muted"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
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
