"use client";

import React, { useEffect } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Boxes,
  Home,
  PanelLeft,
  Settings,
  Signal,
  SignalZero,
} from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus();
  const { toast } = useToast();

  useEffect(() => {
    if (isOnline === false) {
      toast({
        title: "You are offline",
        description: "Your changes will be saved locally and synced when you're back online.",
        variant: "destructive",
      });
    } else if (isOnline === true) {
      toast({
        title: "You are back online",
        description: "Your data has been synced with the server.",
      });
    }
  }, [isOnline, toast]);

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
              <SidebarMenuButton href="/" isActive>
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
        <SidebarFooter>
          <ThemeToggle />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:h-16 md:px-6">
          <SidebarTrigger className="flex md:hidden">
            <PanelLeft />
            <span className="sr-only">Toggle Sidebar</span>
          </SidebarTrigger>
          <div className="flex-1">
            <h1 className="text-lg font-semibold md:text-xl flex items-center gap-2">
              {isOnline ? (
                <>
                  <Signal className="h-5 w-5 text-green-500" />
                  Online Assets
                </>
              ) : (
                <>
                  <SignalZero className="h-5 w-5 text-red-500" />
                  Locally Saved Assets
                </>
              )}
            </h1>
          </div>
        </header>
        <main className="flex-1 flex flex-col p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
