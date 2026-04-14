"use client";

/**
 * @fileOverview User Management Directory.
 * Phase 1600: Zonal Admin scoping. Filters users by zonal states.
 * Phase 1610: Integrated Tactile Menu for User Rows.
 * Phase 1620: Simplified Role Labels (Admin, Zonal Admin, User, Super Admin).
 */

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, Edit, Trash2, ShieldCheck, User as UserIcon, KeyRound, Mail, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AuthorizedUser } from '@/types/domain';
import { UserEditForm } from './user-edit-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { cn, getFuzzySignature } from '@/lib/utils';
import { NIGERIAN_ZONES } from '@/lib/constants';
import { TactileMenu } from '@/components/TactileMenu';

interface UserManagementProps {
  users: AuthorizedUser[];
  onUsersChange: (users: AuthorizedUser[]) => void;
  adminProfile: any;
}

export function UserManagement({ users, onUsersChange, adminProfile }: UserManagementProps) {
  const { toast } = useToast();
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<AuthorizedUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AuthorizedUser | null>(null);

  const isSuperAdmin = adminProfile?.role === 'SUPERADMIN';
  const isZonalAdmin = !!adminProfile?.isZonalAdmin;
  const assignedZone = adminProfile?.assignedZone;

  const filteredUsers = useMemo(() => {
    if (isSuperAdmin) return users;
    
    if (isZonalAdmin && assignedZone) {
      const zonalStates = NIGERIAN_ZONES[assignedZone as keyof typeof NIGERIAN_ZONES] || [];
      const zonalStatesFuzzy = zonalStates.map(s => getFuzzySignature(s));
      
      return users.filter(u => {
        if (u.loginName === adminProfile.loginName) return true;
        return u.states.some(s => zonalStatesFuzzy.includes(getFuzzySignature(s)));
      });
    }

    return users;
  }, [users, isSuperAdmin, isZonalAdmin, assignedZone, adminProfile]);

  const handleAddNewUser = () => {
    setUserToEdit(null);
    setIsEditFormOpen(true);
  };
  
  const handleEditUser = (user: AuthorizedUser) => {
    setUserToEdit(user);
    setIsEditFormOpen(true);
  };

  const handleSaveUser = async (userToSave: Partial<AuthorizedUser>, originalLoginName?: string) => {
    let newUsers = [...(users || [])];
    const findIndex = originalLoginName ? newUsers.findIndex(u => u.loginName === originalLoginName) : -1;

    if (newUsers.some(u => u.loginName === userToSave.loginName && u.loginName !== originalLoginName)) {
      toast({ variant: "destructive", title: "Identity Conflict", description: `Login ID "${userToSave.loginName}" is taken.` });
      return;
    }
    
    if (findIndex > -1) newUsers[findIndex] = { ...newUsers[findIndex], ...userToSave };
    else newUsers.push(userToSave as AuthorizedUser);
    
    onUsersChange(newUsers);
    setIsEditFormOpen(false);
    toast({ title: "User Protocol Synchronized" });
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    onUsersChange(users.filter(u => u.loginName !== userToDelete.loginName));
    setUserToDelete(null);
    toast({ title: "Identity Purged" });
  };

  const getRoleLabel = (user: AuthorizedUser) => {
    if (user.role === 'SUPERADMIN') return 'Super Admin';
    if (user.role === 'ADMIN') return 'Admin';
    if (user.isZonalAdmin) return 'Zonal Admin';
    return 'User';
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <UserIcon className="h-4 w-4" /> Personnel Directory
          </h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
            {isZonalAdmin ? `Managing Zone: ${assignedZone}` : 'Authorized system auditors & admins.'}
          </p>
        </div>
        <Button onClick={handleAddNewUser} className="h-10 px-6 rounded-xl font-black uppercase text-[10px] shadow-lg">
          <UserPlus className="h-3.5 w-3.5 mr-2" /> Add Personnel
        </Button>
      </div>

      <div className="rounded-2xl border-2 border-border/40 overflow-hidden bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-b-2">
              <TableHead className="font-black uppercase text-[9px] tracking-widest py-4 pl-6">Personnel</TableHead>
              <TableHead className="font-black uppercase text-[9px] tracking-widest py-4">Security Tier</TableHead>
              <TableHead className="font-black uppercase text-[9px] tracking-widest py-4">Authorized Scope</TableHead>
              <TableHead className="text-right pr-6 text-[9px] font-black uppercase tracking-widest py-4">Pulse</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map(user => (
              <TableRow key={user.loginName} className="group hover:bg-primary/[0.02] border-b last:border-0 transition-colors">
                <TableCell className="py-4 pl-6 p-0">
                  <TactileMenu
                    title="User Shortcuts"
                    className="w-full h-full py-4 pl-6"
                    options={[
                      { label: 'Edit Profile', icon: Edit, onClick: () => handleEditUser(user) },
                      { label: 'Copy Email', icon: Mail, onClick: () => navigator.clipboard.writeText(user.email) },
                      { label: 'Purge Identity', icon: Trash2, onClick: () => setUserToDelete(user), destructive: true, disabled: adminProfile?.loginName === user.loginName }
                    ]}
                  >
                    <div className="flex flex-col">
                      <span className="font-black text-xs uppercase text-foreground">{user.displayName}</span>
                      <span className="text-[9px] font-mono text-muted-foreground uppercase opacity-40">ID: {user.loginName}</span>
                    </div>
                  </TactileMenu>
                </TableCell>
                <TableCell className="py-4">
                  <Badge variant="outline" className={cn(
                    "text-[8px] font-black uppercase h-6 px-3 rounded-lg border-2",
                    user.role === 'SUPERADMIN' ? "border-primary/40 bg-primary/10 text-primary" :
                    user.role === 'ADMIN' ? "border-primary/20 bg-primary/5 text-primary" : 
                    user.isZonalAdmin ? "border-teal-500/20 bg-teal-500/5 text-teal-600" :
                    "border-muted-foreground/20"
                  )}>
                    {user.role === 'SUPERADMIN' ? <ShieldAlert className="mr-1.5 h-2.5 w-2.5" /> :
                     user.isAdmin && <ShieldCheck className="mr-1.5 h-2.5 w-2.5" />}
                    {getRoleLabel(user)}
                  </Badge>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                    {user.states?.slice(0, 2).map(s => (
                      <Badge key={s} variant="secondary" className="text-[7px] font-black uppercase px-2 h-5 bg-muted/50 border border-border/40">
                        {s}
                      </Badge>
                    ))}
                    {user.states?.length > 2 && <span className="text-[8px] font-bold text-muted-foreground">+{user.states.length - 2}</span>}
                  </div>
                </TableCell>
                <TableCell className="py-4 text-right pr-6">
                   <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => handleEditUser(user)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg text-destructive/40 hover:text-destructive hover:bg-destructive/10" 
                      onClick={() => setUserToDelete(user)} 
                      disabled={adminProfile?.loginName === user.loginName}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                   </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <UserEditForm isOpen={isEditFormOpen} onOpenChange={setIsEditFormOpen} user={userToEdit} onSave={handleSaveUser} />
      
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-primary/10 shadow-3xl bg-black text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase">Purge Identity?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic text-white/40 leading-relaxed">
              This will permanently revoke system access for <strong>{userToDelete?.displayName}</strong>. All staged regional scope locks for this user will be destroyed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="font-bold rounded-xl border-2 border-white/10 m-0">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-white font-black uppercase text-[10px] tracking-widest h-12 px-8 rounded-xl m-0 shadow-2xl shadow-destructive/20">
              Execute Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
