"use client";

/**
 * @fileOverview User Management Directory.
 * Phase 1011: Renamed from Auditor Directory to User Directory.
 */

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, Edit, Trash2, ShieldCheck, User as UserIcon } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface UserManagementProps {
  users: AuthorizedUser[];
  onUsersChange: (users: AuthorizedUser[]) => void;
  adminProfile: { loginName: string } | null;
}

export function UserManagement({ users, onUsersChange, adminProfile }: UserManagementProps) {
  const { toast } = useToast();
  
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<AuthorizedUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AuthorizedUser | null>(null);

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
    
    const findIndex = originalLoginName 
      ? newUsers.findIndex(u => u.loginName === originalLoginName)
      : -1;

    if (newUsers.some(u => u.loginName === userToSave.loginName && u.loginName !== originalLoginName)) {
      toast({ variant: "destructive", title: "Identity Conflict", description: `The login ID "${userToSave.loginName}" is already claimed.` });
      return;
    }
    
    if (findIndex > -1) {
      newUsers[findIndex] = {
        ...newUsers[findIndex],
        ...userToSave,
      };
    } else {
      newUsers.push(userToSave as AuthorizedUser);
    }
    
    onUsersChange(newUsers);
    setIsEditFormOpen(false);
    toast({ title: "User Profile Updated" });
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    const newUsers = (users || []).filter(u => u.loginName !== userToDelete.loginName);
    onUsersChange(newUsers);
    setUserToDelete(null);
    toast({ title: "User Account Revoked" });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <UserIcon className="h-4 w-4" /> User Directory
          </h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 tracking-tighter">Authorized personnel and regional scopes.</p>
        </div>
        <Button onClick={handleAddNewUser} className="h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-primary/10">
          <UserPlus className="h-3.5 w-3.5" /> Add New User
        </Button>
      </div>

      <div className="rounded-2xl border-2 border-border/40 overflow-hidden bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-b-2">
              <TableHead className="font-black uppercase text-[10px] tracking-widest py-4 pl-6">User Identity</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest py-4">Security Tier</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest py-4">Scope</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest py-4 text-right pr-6">Pulse Control</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users && users.map(user => (
              <TableRow key={user.loginName} className="group hover:bg-primary/[0.02] transition-colors border-b last:border-0">
                <TableCell className="py-4 pl-6">
                  <div className="flex flex-col">
                    <span className="font-black text-sm tracking-tight">{user.displayName}</span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter opacity-60">ID: {user.loginName}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <Badge variant="outline" className={cn(
                    "text-[9px] font-black uppercase tracking-widest h-6 px-3 rounded-lg border-2",
                    user.isAdmin ? "border-primary/20 bg-primary/5 text-primary" : "border-muted-foreground/20 text-muted-foreground"
                  )}>
                    {user.isAdmin ? <ShieldCheck className="mr-1.5 h-3 w-3" /> : null}
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                    {user.states?.slice(0, 3).map(s => (
                      <Badge key={s} variant="secondary" className="text-[8px] font-black uppercase h-5 px-2 bg-muted/50 border border-border/40">
                        {s}
                      </Badge>
                    ))}
                    {user.states?.length > 3 && <span className="text-[9px] font-bold text-muted-foreground">+{user.states.length - 3}</span>}
                  </div>
                </TableCell>
                <TableCell className="py-4 text-right pr-6">
                   <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all" onClick={() => handleEditUser(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-xl text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-all" 
                      onClick={() => setUserToDelete(user)} 
                      disabled={adminProfile?.loginName === user.loginName}
                    >
                        <Trash2 className="h-4 w-4" />
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
        <AlertDialogContent className="rounded-[2rem] border-primary/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Revoke Account?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium">
              This will permanently revoke all access for <strong>{userToDelete?.displayName}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="font-bold rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90 font-black uppercase text-[10px] tracking-widest h-11 px-6 rounded-xl">
              Confirm Revocation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
