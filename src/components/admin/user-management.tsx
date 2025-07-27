
'use client';

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
import { Loader2, KeyRound, UserPlus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AuthorizedUser, UserProfile } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useAppState } from '@/contexts/app-state-context';
import { updateSettings } from '@/lib/firestore';
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

export function UserManagement() {
  const { userProfile: adminProfile } = useAuth();
  const { appSettings, setAppSettings, isOnline } = useAppState();
  const { toast } = useToast();
  
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<AuthorizedUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AuthorizedUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAddNewUser = () => {
    setUserToEdit(null);
    setIsEditFormOpen(true);
  };
  
  const handleEditUser = (user: AuthorizedUser) => {
    setUserToEdit(user);
    setIsEditFormOpen(true);
  };

  const handleSaveUser = async (userToSave: AuthorizedUser) => {
    const newUsers = [...appSettings.authorizedUsers];
    const existingUserIndex = newUsers.findIndex(u => u.loginName === userToSave.loginName);

    if (existingUserIndex > -1) {
      // Update existing user
      newUsers[existingUserIndex] = userToSave;
    } else {
      // Add new user
      newUsers.push(userToSave);
    }
    
    const newSettings = { ...appSettings, authorizedUsers: newUsers };
    setAppSettings(newSettings);
    await updateSettings({ authorizedUsers: newUsers });

    toast({ title: 'User Saved', description: `${userToSave.displayName} has been saved.` });
    setIsEditFormOpen(false);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);

    const newUsers = appSettings.authorizedUsers.filter(u => u.loginName !== userToDelete.loginName);
    const newSettings = { ...appSettings, authorizedUsers: newUsers };

    setAppSettings(newSettings);
    await updateSettings({ authorizedUsers: newUsers });
    
    toast({ title: 'User Removed', description: `${userToDelete.displayName} has been removed from the system.` });
    setUserToDelete(null);
    setIsDeleting(false);
  };
  
  const handlePasswordReset = async (userToReset: AuthorizedUser) => {
    if (adminProfile?.loginName === userToReset.loginName) {
      toast({
        title: "Action Denied",
        description: "You cannot reset your own password here.",
        variant: 'destructive',
      });
      return;
    }

    const newUsers = appSettings.authorizedUsers.map(u => 
      u.loginName === userToReset.loginName 
        ? { ...u, password: '0000', passwordChanged: false } 
        : u
    );
    const newSettings = { ...appSettings, authorizedUsers: newUsers };
    
    setAppSettings(newSettings);
    await updateSettings({ authorizedUsers: newUsers });

    toast({
      title: 'Password Reset',
      description: `${userToReset.displayName}'s password has been reset to the default.`,
    });
  }
  
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddNewUser}>
          <UserPlus className="mr-2 h-4 w-4" /> Add New User
        </Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Display Name</TableHead>
              <TableHead>Login Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Password</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appSettings.authorizedUsers.map(user => (
              <TableRow key={user.loginName}>
                <TableCell className="font-medium">{user.displayName}</TableCell>
                <TableCell className="text-muted-foreground">{user.loginName}</TableCell>
                <TableCell>{user.isAdmin ? 'Admin' : (user.isGuest ? 'Guest' : 'User')}</TableCell>
                <TableCell className="font-mono text-muted-foreground text-xs">{user.password}</TableCell>
                <TableCell className="text-right space-x-1">
                   <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handlePasswordReset(user)} disabled={user.isGuest}>
                      <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setUserToDelete(user)} disabled={adminProfile?.loginName === user.loginName}>
                      <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <UserEditForm 
        isOpen={isEditFormOpen} 
        onOpenChange={setIsEditFormOpen} 
        user={userToEdit}
        onSave={handleSaveUser}
      />
      
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{userToDelete?.displayName}</strong> from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, remove user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
