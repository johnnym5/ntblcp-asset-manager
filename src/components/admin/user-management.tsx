
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAllUserProfiles, updateUserRole } from '@/lib/firestore';
import type { UserProfile } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null); // Store UID of user being saved
  const { userProfile: adminProfile } = useAuth();
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const userProfiles = await getAllUserProfiles();
      setUsers(userProfiles);
    } catch (error) {
      toast({
        title: 'Error fetching users',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (uid: string, role: 'admin' | 'user' | 'guest') => {
    if (adminProfile?.uid === uid) {
      toast({
        title: 'Action Denied',
        description: 'You cannot change your own role.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSaving(uid);
    try {
      await updateUserRole(uid, role);
      // Update local state to reflect change immediately
      setUsers(prevUsers => prevUsers.map(user => 
        user.uid === uid ? { ...user, role } : user
      ));
      toast({
        title: 'Role Updated',
        description: `User role has been successfully changed to ${role}.`,
      });
    } catch (error) {
      toast({
        title: 'Error updating role',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(null);
    }
  };

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
            <TableHead>Email</TableHead>
            <TableHead>Assigned State</TableHead>
            <TableHead className="w-[180px]">Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.uid}>
              <TableCell className="font-medium">{user.displayName}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.state}</TableCell>
              <TableCell>
                {isSaving === user.uid ? (
                    <div className="flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                ) : (
                    <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChange(user.uid, value as any)}
                        disabled={adminProfile?.uid === user.uid}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="guest">Guest</SelectItem>
                        </SelectContent>
                    </Select>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
