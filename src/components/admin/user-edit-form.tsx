'use client';

/**
 * @fileOverview UserEditForm - Personnel Identity Configuration.
 * Terminology: Passcode.
 * Phase 1800: Integrated Granular Access Control Hub (Permissions).
 * Phase 1810: Hidden Super-Admin Tier via Tactile Interaction.
 * Phase 1820: Enhanced Zonal Admin regional scope (Zone selection).
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { AuthorizedUser, UserPermissions } from '@/types/domain';
import { NIGERIAN_STATES, NIGERIAN_ZONES } from '@/lib/constants';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { 
  ChevronsUpDown, 
  Check, 
  MapPin, 
  ShieldCheck, 
  User, 
  Mail, 
  PlusCircle, 
  FileEdit, 
  KeyRound, 
  Lock, 
  ShieldAlert, 
  LayoutGrid, 
  Activity, 
  Terminal,
  Database,
  RefreshCw,
  Monitor,
  Trash2,
  Wrench,
  RotateCcw,
  Settings as SettingsIcon,
  History,
  FileUp,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { TactileMenu } from '@/components/TactileMenu';
import { motion, AnimatePresence } from 'framer-motion';

const defaultPermissions: UserPermissions = {
  page_dashboard: true,
  page_registry: true,
  page_groups: true,
  page_reports: true,
  page_alerts: true,
  page_audit_log: true,
  page_sync_queue: true,
  page_users: false,
  page_infrastructure: false,
  page_database: false,
  page_settings: true,
  func_add_asset: true,
  func_edit_asset: true,
  func_delete_asset: false,
  func_import: false,
  func_batch_edit: false,
  func_edit_headers: false,
  func_revert: false,
  func_approve: false,
};

const adminPermissions: UserPermissions = {
  page_dashboard: true,
  page_registry: true,
  page_groups: true,
  page_reports: true,
  page_alerts: true,
  page_audit_log: true,
  page_sync_queue: true,
  page_users: true,
  page_infrastructure: false,
  page_database: false,
  page_settings: true,
  func_add_asset: true,
  func_edit_asset: true,
  func_delete_asset: true,
  func_import: true,
  func_batch_edit: true,
  func_edit_headers: true,
  func_revert: true,
  func_approve: true,
};

const superAdminPermissions: UserPermissions = {
  page_dashboard: true,
  page_registry: true,
  page_groups: true,
  page_reports: true,
  page_alerts: true,
  page_audit_log: true,
  page_sync_queue: true,
  page_users: true,
  page_infrastructure: true,
  page_database: true,
  page_settings: true,
  func_add_asset: true,
  func_edit_asset: true,
  func_delete_asset: true,
  func_import: true,
  func_batch_edit: true,
  func_edit_headers: true,
  func_revert: true,
  func_approve: true,
};

const userFormSchema = z.object({
  displayName: z.string().min(2, 'Display name required.'),
  loginName: z.string().min(2, 'Login name required.').transform(v => v.toLowerCase().trim()),
  email: z.string().email('Valid email address required.'),
  states: z.array(z.string()).min(1, 'Select at least one state.'),
  isAdmin: z.boolean(),
  isZonalAdmin: z.boolean().optional(),
  assignedZone: z.string().optional(),
  isGuest: z.boolean(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  canAddAssets: z.boolean(),
  canEditAssets: z.boolean(),
  role: z.enum(['ADMIN', 'MANAGER', 'VERIFIER', 'VIEWER', 'SUPERADMIN']).default('VERIFIER'),
  permissions: z.any(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passcodes don't match",
  path: ["confirmPassword"],
});

type UserFormValues = z.infer<typeof userFormSchema>;

export function UserEditForm({ isOpen, onOpenChange, user, onSave }: { isOpen: boolean, onOpenChange: (o: boolean) => void, user: AuthorizedUser | null, onSave: (u: any, orig?: string) => Promise<void> }) {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { 
        displayName: '', 
        loginName: '', 
        email: '',
        states: [], 
        isAdmin: false, 
        isZonalAdmin: false, 
        assignedZone: '', 
        isGuest: false, 
        password: '', 
        confirmPassword: '', 
        canAddAssets: false, 
        canEditAssets: false,
        role: 'VERIFIER',
        permissions: defaultPermissions
    },
  });
  
  const currentRole = form.watch('role');
  const isZonalAdmin = form.watch('isZonalAdmin');
  const assignedZone = form.watch('assignedZone');

  useEffect(() => {
    if (isOpen) {
      if (user) {
        form.reset({ 
            ...user, 
            email: user.email || '',
            password: user.password || '', 
            confirmPassword: user.password || '',
            role: user.role || 'VERIFIER',
            permissions: user.permissions || defaultPermissions
        });
        setShowSuperAdmin(user.role === 'SUPERADMIN');
      } else {
        form.reset({ 
            displayName: '', 
            loginName: '', 
            email: '',
            states: [], 
            isAdmin: false, 
            isZonalAdmin: false, 
            assignedZone: '', 
            isGuest: false, 
            password: '', 
            confirmPassword: '', 
            canAddAssets: true, 
            canEditAssets: true,
            role: 'VERIFIER',
            permissions: defaultPermissions
        });
        setShowSuperAdmin(false);
      }
    }
  }, [isOpen, user, form]);

  const handleSubmit = async (data: UserFormValues) => {
    setIsSaving(true);
    const { confirmPassword, ...userToSave } = data;
    await onSave(userToSave as AuthorizedUser, user?.loginName);
    setIsSaving(false);
  };

  const handlePermissionToggle = (key: keyof UserPermissions, val: boolean) => {
    const current = form.getValues('permissions');
    form.setValue('permissions', { ...current, [key]: val });
  };

  const PermissionRow = ({ label, pKey, icon: Icon }: { label: string, pKey: keyof UserPermissions, icon?: any }) => {
    const val = form.watch(`permissions.${pKey}`);
    return (
      <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-all group">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-3.5 w-3.5 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />}
          <span className="text-[11px] font-black uppercase tracking-tight text-foreground/70">{label}</span>
        </div>
        <Checkbox checked={val} onCheckedChange={(c) => handlePermissionToggle(pKey, !!c)} className="h-5 w-5 rounded-md border-2 border-border" />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-[2.5rem] overflow-hidden p-0 border-primary/10 shadow-3xl bg-background">
        <DialogHeader className="p-8 bg-muted/20 border-b">
          <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight leading-none text-foreground">
            <User className="h-6 w-6 text-primary"/> {user ? 'Edit User' : 'New User'}
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70 mt-1">
            Manage user roles and regional permissions.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="p-8 space-y-10 pb-32">
                <div className="space-y-4">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Identity Hub</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="displayName" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Full Name</FormLabel><FormControl><Input placeholder="Auditor Name" {...field} className="h-12 rounded-xl bg-muted/10 border-border" /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="loginName" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Login ID (Username)</FormLabel><FormControl><Input placeholder="username" {...field} className="h-12 rounded-xl bg-muted/10 border-border" /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2"><Mail className="h-3 w-3" /> Email Link</FormLabel><FormControl><Input placeholder="user@example.com" type="email" {...field} className="h-12 rounded-xl bg-muted/10 border-border" /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>

                <div className="space-y-4">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Access Credentials</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground">System Passcode</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} className="h-12 rounded-xl bg-muted/10 border-border" /></FormControl></FormItem>
                        )}/>
                        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Confirm Passcode</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} className="h-12 rounded-xl bg-muted/10 border-border" /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Regional Scope</Label>
                    
                    {currentRole === 'SUPERADMIN' ? (
                        <div className="p-5 rounded-2xl bg-muted/10 border-2 border-dashed border-border/40 text-center">
                            <span className="text-[10px] font-black uppercase text-muted-foreground opacity-60">Global Administrative Clearance: Unrestricted Scope.</span>
                        </div>
                    ) : isZonalAdmin ? (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-500">
                            <FormField 
                                control={form.control} 
                                name="assignedZone" 
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Authorized Zonal Region</FormLabel>
                                        <Select 
                                            onValueChange={(val) => {
                                                field.onChange(val);
                                                // Deterministically populate states pulse for this zone
                                                const zoneStates = NIGERIAN_ZONES[val as keyof typeof NIGERIAN_ZONES] || [];
                                                form.setValue('states', zoneStates);
                                            }} 
                                            value={field.value || ''}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="h-12 rounded-xl bg-muted/10 border-border font-black text-xs uppercase tracking-tight">
                                                    <SelectValue placeholder="CHOOSE ZONE..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl border-border bg-card shadow-3xl">
                                                {Object.keys(NIGERIAN_ZONES).map(zone => (
                                                    <SelectItem key={zone} value={zone} className="text-[10px] font-black uppercase py-2.5">{zone}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <AnimatePresence>
                                {assignedZone && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.98 }} 
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        className="p-5 rounded-[1.5rem] bg-primary/[0.03] border-2 border-dashed border-primary/20 space-y-3 shadow-inner"
                                    >
                                        <div className="flex items-center gap-2 text-primary">
                                            <ShieldCheck className="h-3 w-3" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Restricting Scope to States in {assignedZone}:</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {NIGERIAN_ZONES[assignedZone as keyof typeof NIGERIAN_ZONES]?.map(s => (
                                                <Badge key={s} variant="secondary" className="text-[7px] font-black uppercase px-2 h-5 bg-background border border-border/40 text-foreground/60">
                                                    {s}
                                                </Badge>
                                            ))}
                                        </div>
                                        <p className="text-[8px] font-medium italic text-muted-foreground">System will lock this user to all {NIGERIAN_ZONES[assignedZone as keyof typeof NIGERIAN_ZONES]?.length} administrative states.</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <FormField control={form.control} name="states" render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Individual State Selection</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full h-14 justify-between rounded-xl border-2 border-border/40 bg-muted/10 hover:border-primary/20 transition-all shadow-sm">
                                            <div className="flex items-center gap-3">
                                                {field.value?.length > 0 ? (
                                                    <Badge className="bg-primary text-black font-black text-[9px] h-6 px-3">{field.value.length} STATES</Badge>
                                                ) : (
                                                    <span className="text-[10px] font-black uppercase text-muted-foreground opacity-40">Select authorized states...</span>
                                                )}
                                            </div>
                                            <ChevronsUpDown className="h-4 w-4 opacity-20" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0 rounded-2xl shadow-3xl border-primary/10 overflow-hidden" align="start">
                                        <div className="p-4 bg-muted/30 border-b flex items-center justify-between"><h4 className="text-[10px] font-black uppercase tracking-widest">Authorized States</h4></div>
                                        <ScrollArea className="h-72 bg-background">
                                            <div className="p-3 grid grid-cols-2 gap-1">
                                                {NIGERIAN_STATES.map(s => (
                                                    <div key={s} className="flex items-center gap-3 p-2.5 hover:bg-primary/5 rounded-xl cursor-pointer" onClick={() => {
                                                        const cur = field.value || [];
                                                        field.onChange(cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]);
                                                    }}>
                                                        <Checkbox checked={field.value?.includes(s)} className="rounded-md h-5 w-5 border-2"/>
                                                        <span className="text-[11px] font-black uppercase">{s}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </PopoverContent>
                                </Popover>
                            </FormItem>
                        )}/>
                    )}
                </div>

                <div className="space-y-4">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Access Control Hub</Label>
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="permissions" className="border-2 border-border/40 rounded-[1.5rem] bg-card/50 overflow-hidden px-1">
                            <AccordionTrigger className="px-6 hover:no-underline py-5 group">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform"><Lock className="h-4 w-4 text-primary" /></div>
                                    <div className="text-left">
                                        <span className="text-sm font-black uppercase tracking-tight">Capabilities</span>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-60">Granular Page & Function Access</p>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-8 space-y-8">
                                <div className="space-y-4">
                                    <h5 className="text-[9px] font-black uppercase text-primary tracking-widest border-b border-primary/10 pb-2 flex items-center gap-2"><LayoutGrid className="h-3 w-3" /> Navigation Scope</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                                        <PermissionRow label="Dashboard" pKey="page_dashboard" icon={Activity} />
                                        <PermissionRow label="Asset List" pKey="page_registry" icon={Database} />
                                        <PermissionRow label="Folder Browse" pKey="page_groups" icon={LayoutGrid} />
                                        <PermissionRow label="Reports" pKey="page_reports" icon={Activity} />
                                        <PermissionRow label="Alerts" pKey="page_alerts" icon={ShieldAlert} />
                                        <PermissionRow label="History" pKey="page_audit_log" icon={History} />
                                        <PermissionRow label="Sync Queue" pKey="page_sync_queue" icon={RefreshCw} />
                                        <PermissionRow label="Personnel" pKey="page_users" icon={User} />
                                        <PermissionRow label="Infrastructure" pKey="page_infrastructure" icon={Monitor} />
                                        <PermissionRow label="Database Hub" pKey="page_database" icon={Terminal} />
                                        <PermissionRow label="Settings" pKey="page_settings" icon={SettingsIcon} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h5 className="text-[9px] font-black uppercase text-primary tracking-widest border-b border-primary/10 pb-2 flex items-center gap-2"><Lock className="h-3 w-3" /> Functional Access</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                                        <PermissionRow label="Create Assets" pKey="func_add_asset" icon={PlusCircle} />
                                        <PermissionRow label="Edit Assets" pKey="func_edit_asset" icon={FileEdit} />
                                        <PermissionRow label="Delete Assets" pKey="func_delete_asset" icon={Trash2} />
                                        <PermissionRow label="Import Excel" pKey="func_import" icon={FileUp} />
                                        <PermissionRow label="Batch Update" pKey="func_batch_edit" icon={Activity} />
                                        <PermissionRow label="Manage Layouts" pKey="func_edit_headers" icon={Wrench} />
                                        <PermissionRow label="Rollback History" pKey="func_revert" icon={RotateCcw} />
                                        <PermissionRow label="Approve Changes" pKey="func_approve" icon={ShieldCheck} />
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>

                <div className="space-y-4">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Security Tiers</Label>
                    <div className="grid grid-cols-1 gap-3">
                        {/* System Admin - Wrapped in TactileMenu to reveal Super Admin */}
                        <TactileMenu
                            title="Advanced Security"
                            options={[
                                { 
                                    label: showSuperAdmin ? "Disable Super-Admin Mode" : "Enable Super-Admin Mode", 
                                    icon: ShieldAlert, 
                                    onClick: () => setShowSuperAdmin(!showSuperAdmin) 
                                }
                            ]}
                        >
                            <FormField control={form.control} name="role" render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-5 rounded-2xl border transition-all hover:bg-primary/[0.02] group">
                                    <div className="space-y-0.5">
                                        <FormLabel className="font-black text-sm uppercase text-foreground group-hover:text-primary">System Administrator</FormLabel>
                                        <FormDescription className="text-[10px] font-bold uppercase opacity-40">Full project management and user oversight.</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch 
                                            checked={field.value === 'ADMIN' || field.value === 'SUPERADMIN'} 
                                            onCheckedChange={(v) => { 
                                                if (v) {
                                                    field.onChange('ADMIN');
                                                    form.setValue('isAdmin', true);
                                                    form.setValue('permissions', adminPermissions);
                                                } else {
                                                    field.onChange('VERIFIER');
                                                    form.setValue('isAdmin', false);
                                                    form.setValue('permissions', defaultPermissions);
                                                }
                                                form.setValue('isZonalAdmin', false);
                                            }}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}/>
                        </TactileMenu>

                        {/* Zonal Admin */}
                        <FormField control={form.control} name="isZonalAdmin" render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-5 rounded-2xl border transition-all hover:bg-primary/[0.02] group">
                                <div className="space-y-0.5">
                                    <FormLabel className="font-black text-sm uppercase text-foreground group-hover:text-primary">Zonal Administrator</FormLabel>
                                    <FormDescription className="text-[10px] font-bold uppercase opacity-40">Regional oversight for assigned zones.</FormDescription>
                                </div>
                                <FormControl>
                                    <Switch 
                                        checked={field.value} 
                                        onCheckedChange={(v) => { 
                                            field.onChange(v); 
                                            if(v) {
                                                form.setValue('role', 'MANAGER');
                                                form.setValue('isAdmin', false);
                                                form.setValue('permissions', adminPermissions);
                                                // Reset scope selection
                                                form.setValue('states', []);
                                                form.setValue('assignedZone', '');
                                            } else {
                                                form.setValue('role', 'VERIFIER');
                                                form.setValue('permissions', defaultPermissions);
                                                form.setValue('assignedZone', '');
                                            }
                                        }}
                                    />
                                </FormControl>
                            </FormItem>
                        )}/>

                        {/* Hidden Super Admin Tier */}
                        <AnimatePresence>
                            {showSuperAdmin && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                                    <FormField control={form.control} name="role" render={({ field }) => (
                                        <FormItem className="flex items-center justify-between p-5 rounded-2xl border-2 border-primary/20 bg-primary/5 group mt-3">
                                            <div className="space-y-0.5">
                                                <FormLabel className="font-black text-sm uppercase text-primary">Super Administrator</FormLabel>
                                                <FormDescription className="text-[10px] font-bold uppercase text-primary/40">Unrestricted infrastructure & database access.</FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch 
                                                    checked={field.value === 'SUPERADMIN'} 
                                                    onCheckedChange={(v) => { 
                                                        if (v) {
                                                            field.onChange('SUPERADMIN');
                                                            form.setValue('isAdmin', true);
                                                            form.setValue('permissions', superAdminPermissions);
                                                            form.setValue('states', ['All']);
                                                        } else {
                                                            field.onChange('ADMIN');
                                                            form.setValue('permissions', adminPermissions);
                                                        }
                                                    }}
                                                    className="data-[state=checked]:bg-primary"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}/>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </form>
            </Form>
        </ScrollArea>
        <DialogFooter className="p-8 bg-muted/20 border-t gap-3 shrink-0">
            <DialogClose asChild><Button variant="ghost" className="font-black uppercase text-[10px] px-8 rounded-xl">Discard</Button></DialogClose>
            <Button onClick={form.handleSubmit(handleSubmit)} disabled={isSaving} className="h-14 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 px-10 rounded-[1.5rem] bg-primary text-black transition-transform active:scale-95">
                {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-3"/> : <ShieldCheck className="h-4 w-4 mr-3"/>} Save User Profile
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
