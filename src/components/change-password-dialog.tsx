
'use client';

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '@/contexts/auth-context';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function ChangePasswordDialog({ isOpen, onOpenChange }: ChangePasswordDialogProps) {
  const { userProfile, updatePassword } = useAuth();
  const { toast } = useToast();
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const isInitialChange = userProfile && !userProfile.passwordChanged;

  const handleSave = async () => {
    setError(null);

    if (!isInitialChange && oldPassword !== userProfile?.password) {
      setError('The old password you entered is incorrect.');
      return;
    }
    
    if (!newPassword) {
      setError('New password cannot be empty.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    
    if (newPassword === '0000') {
      setError('You cannot use the default password.');
      return;
    }

    setIsSaving(true);
    try {
      await updatePassword(newPassword);
      toast({
        title: 'Password Updated',
        description: 'Your password has been changed successfully.',
      });
      onOpenChange(false);
    } catch (e) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isInitialChange) {
      // Don't allow closing if it's the mandatory initial change
      toast({
        title: "Password Change Required",
        description: "You must change your default password to continue.",
        variant: "destructive"
      });
      return;
    }
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      resetForm();
    }
    
    if (!open) {
        handleClose();
    } else {
        onOpenChange(true);
    }
  };


  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isInitialChange ? 'Create Your New Password' : 'Change Your Password'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isInitialChange
              ? 'For security, you must change your default password before you can use the application.'
              : 'Enter your old password and a new one below.'
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4 space-y-4">
          {!isInitialChange && (
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Old Password</Label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <AlertDialogFooter>
            {!isInitialChange && <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>}
            <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save New Password
            </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
