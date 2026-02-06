
"use client";

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
import type { AuthorizedUser } from '@/lib/types';
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

interface UserManagementProps {
  users: AuthorizedUser[];
  onUsersChange: (users: AuthorizedUser[]) => Promise<void>;
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
    let newUsers = [...users];
    
    const findIndex = originalLoginName 
      ? newUsers.findIndex(u => u.loginName === originalLoginName)
      : -1;

    if (newUsers.some(u => u.loginName === userToSave.loginName && u.loginName !== originalLoginName)) {
      toast({ title: "Save Failed", description: `The login name "${userToSave.loginName}" is already in use.`, variant: "destructive" });
      return;
    }
    
    if (findIndex > -1) {
      const existingUser = newUsers[findIndex];
      newUsers[findIndex] = {
        ...existingUser,
        ...userToSave,
        password: userToSave.password || existingUser.password
      };
    } else {
      newUsers.push(userToSave as AuthorizedUser);
    }
    
    await onUsersChange(newUsers);
    setIsEditFormOpen(false);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    const newUsers = users.filter(u => u.loginName !== userToDelete.loginName);
    await onUsersChange(newUsers);
    
    setUserToDelete(null);
  };
  
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.loginName}>
                <TableCell className="font-medium">{user.displayName}</TableCell>
                <TableCell className="text-muted-foreground">{user.loginName}</TableCell>
                <TableCell>{user.isAdmin ? 'Admin' : (user.isGuest ? 'Guest' : 'User')}</TableCell>
                <TableCell className="text-right space-x-1">
                   <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                    <Edit className="h-4 w-4" />
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
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
              Yes, remove user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    
