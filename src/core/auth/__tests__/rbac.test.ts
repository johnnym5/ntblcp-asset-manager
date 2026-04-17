import { hasPermission, isWithinScope } from '../rbac';
import { AuthorizedUser, Asset } from '@/types/domain';

describe('RBAC Engine', () => {
  const mockAdmin: AuthorizedUser = {
    loginName: 'admin',
    displayName: 'Admin User',
    email: 'admin@test.com',
    role: 'ADMIN',
    states: ['All'],
    isAdmin: true
  };

  const mockOfficer: AuthorizedUser = {
    loginName: 'officer',
    displayName: 'Lagos Officer',
    email: 'officer@test.com',
    role: 'MANAGER',
    states: ['Lagos'],
    isAdmin: false
  };

  const mockAsset: Asset = {
    id: '1',
    description: 'Lagos Asset',
    location: 'Lagos'
  } as any;

  const mockAbiaAsset: Asset = {
    id: '2',
    description: 'Abia Asset',
    location: 'Abia'
  } as any;

  describe('Permission Checks', () => {
    it('should allow ADMIN to manage users', () => {
      expect(hasPermission(mockAdmin, 'MANAGE_USERS')).toBe(true);
    });

    it('should deny non-ADMIN from managing users', () => {
      expect(hasPermission(mockOfficer, 'MANAGE_USERS')).toBe(false);
    });

    it('should allow MANAGER to add assets', () => {
      expect(hasPermission(mockOfficer, 'ADD_ASSET')).toBe(true);
    });
  });

  describe('Scope Checks', () => {
    it('should allow ADMIN global scope access', () => {
      expect(isWithinScope(mockAdmin, mockAsset)).toBe(true);
      expect(isWithinScope(mockAdmin, mockAbiaAsset)).toBe(true);
    });

    it('should allow Officer access to their assigned state', () => {
      expect(isWithinScope(mockOfficer, mockAsset)).toBe(true);
    });

    it('should deny Officer access outside their assigned state', () => {
      expect(isWithinScope(mockOfficer, mockAbiaAsset)).toBe(false);
    });
  });
});
