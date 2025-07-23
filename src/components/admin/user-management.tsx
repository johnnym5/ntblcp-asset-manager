
'use client';

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AUTHORIZED_USERS } from '@/lib/authorized-users';
import type { AuthorizedUser, UserProfile } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';

export function UserManagement() {
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { userProfile: adminProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // In this auth model, the user list is static from the code.
    setUsers(AUTHORIZED_USERS);
    setIsLoading(false);
  }, []);

  const handleRoleChange = async (loginName: string, role: 'admin' | 'user' | 'guest') => {
    // This is a UI-only representation for now. A real implementation
    // would update a database.
    toast({
      title: 'Action Not Implemented',
      description: `In a real app, this would change ${loginName}'s role to ${role}.`,
    });
  };

  const handlePasswordReset = (userToReset: AuthorizedUser) => {
    if (adminProfile?.loginName === userToReset.loginName) {
      toast({
        title: "Action Denied",
        description: "You cannot reset your own password here. Use the 'Change Password' option.",
        variant: 'destructive',
      });
      return;
    }

    // Since we don't have a database of users, we fake this by manipulating
    // the user profile in the viewer's (admin's) local storage.
    // This is a conceptual demonstration. A real app would have a DB.
    try {
        // Find if this user's profile is in the browser's local storage
        const allLocalStorageItems = { ...localStorage };
        let userProfileKey: string | null = null;
        let userProfileData: UserProfile | null = null;

        // This is inefficient but necessary without a user database.
        for (const key in allLocalStorageItems) {
            if (key.includes('ntblcp-user-profile')) {
                const profile = JSON.parse(allLocalStorageItems[key]);
                if (profile.loginName === userToReset.loginName) {
                    userProfileKey = key;
                    userProfileData = profile;
                    break;
                }
            }
        }

        if (userProfileKey && userProfileData) {
            // Found the user's profile, reset the password flag
            userProfileData.passwordChanged = false;
            userProfileData.password = "0000"; // Reset to default
            localStorage.setItem(userProfileKey, JSON.stringify(userProfileData));
             toast({
              title: 'Password Reset',
              description: `${userToReset.displayName}'s password has been reset. They will be prompted to create a new one on their next login.`,
            });
        } else {
             toast({
              title: 'User Has Not Logged In',
              description: `Cannot reset password for ${userToReset.displayName} because they have not logged into this browser before.`,
              variant: 'destructive'
            });
        }
    } catch (e) {
        toast({ title: 'Error', description: 'Could not reset password due to a local storage error.', variant: 'destructive' });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Display Name</TableHead>
            <TableHead>Assigned State(s)</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.loginName}>
              <TableCell className="font-medium">{user.displayName}</TableCell>
              <TableCell className="text-muted-foreground">{user.states.join(', ')}</TableCell>
              <TableCell>
                <Select
                    value={user.isAdmin ? 'admin' : (user.isGuest ? 'guest' : 'user')}
                    onValueChange={(value) => handleRoleChange(user.loginName, value as any)}
                    disabled={adminProfile?.loginName === user.loginName}
                >
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                    </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => handlePasswordReset(user)} disabled={user.isGuest}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Reset Pass
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
