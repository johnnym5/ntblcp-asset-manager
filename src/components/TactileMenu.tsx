'use client';

/**
 * @fileOverview TactileMenu - Universal Interaction Wrapper.
 * Provides a context menu triggered by right-click OR long-press.
 */

import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuLabel
} from "@/components/ui/context-menu";
import { useLongPress } from "@/hooks/use-long-press";
import { cn } from "@/lib/utils";

export interface TactileOption {
  label: string;
  icon?: any;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface TactileMenuProps {
  children: React.ReactNode;
  title?: string;
  options: TactileOption[];
  className?: string;
}

export function TactileMenu({ children, title, options, className }: TactileMenuProps) {
  const triggerRef = React.useRef<HTMLDivElement>(null);

  const lp = useLongPress(() => {
    // Deterministic Context Menu Pulse
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      view: window,
      buttons: 2
    });
    triggerRef.current?.dispatchEvent(event);
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger ref={triggerRef} asChild>
        <div {...lp} className={cn("cursor-pointer select-none", className)}>
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64 bg-card border-border rounded-2xl shadow-3xl p-1.5 backdrop-blur-2xl z-[1000]">
        {title && (
          <>
            <ContextMenuLabel className="px-3 py-2 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">
              {title}
            </ContextMenuLabel>
            <ContextMenuSeparator className="bg-border/40" />
          </>
        )}
        <div className="space-y-0.5">
          {options.map((opt, i) => (
            <ContextMenuItem 
              key={`${opt.label}-${i}`} 
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); opt.onClick(); }}
              disabled={opt.disabled}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest cursor-pointer transition-colors",
                opt.destructive 
                  ? "text-destructive focus:bg-destructive/10 focus:text-destructive" 
                  : "text-foreground focus:bg-primary/10 focus:text-primary"
              )}
            >
              {opt.icon && <opt.icon className={cn("h-3.5 w-3.5", opt.destructive ? "text-destructive" : "text-primary")} />}
              <span className="flex-1 truncate">{opt.label}</span>
            </ContextMenuItem>
          ))}
        </div>
      </ContextMenuContent>
    </ContextMenu>
  );
}
