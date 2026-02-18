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
import { Loader2, KeyRound, UserPlus, Edit, Trash2, MapPin } from 'lucide-react';
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
import { Badge } from '../ui/badge';

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
    let newUsers = [...(users || [])];
    
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

    const newUsers = (users || []).filter(u => u.loginName !== userToDelete.loginName);
    await onUsersChange(newUsers);
    
    setUserToDelete(null);
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Manage user accounts and state assignments</h3>
        <Button onClick={handleAddNewUser} size="sm">
          <UserPlus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>
      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Display Name</TableHead>
              <TableHead>Login Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>States</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users && users.map(user => (
              <TableRow key={user.loginName} className="group">
                <TableCell className="font-medium">{user.displayName}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">{user.loginName}</TableCell>
                <TableCell>
                  {user.isAdmin ? (
                    <Badge variant="default" className="font-normal">Admin</Badge>
                  ) : user.isGuest ? (
                    <Badge variant="outline" className="font-normal text-blue-500 border-blue-200">Guest</Badge>
                  ) : (
                    <Badge variant="secondary" className="font-normal">User</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {user.states?.map(s => (
                      <Badge key={s} variant="outline" className="text-[10px] h-5 py-0 px-1.5 flex items-center gap-1">
                        <MapPin className="h-2 w-2" /> {s}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right space-x-1">
                   <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditUser(user)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
                    onClick={() => setUserToDelete(user)} 
                    disabled={adminProfile?.loginName === user.loginName}
                  >
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
