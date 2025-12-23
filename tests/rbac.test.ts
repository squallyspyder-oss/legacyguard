import { describe, it, expect } from 'vitest';
import {
  getUserRole,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissions,
} from '../src/lib/rbac';

describe('rbac', () => {
  describe('getUserRole', () => {
    it('returns guest for null session', () => {
      expect(getUserRole(null)).toBe('guest');
    });

    it('returns guest for session without user', () => {
      expect(getUserRole({})).toBe('guest');
    });

    it('returns role from session if valid', () => {
      expect(getUserRole({ user: { role: 'admin' } })).toBe('admin');
      expect(getUserRole({ user: { role: 'viewer' } })).toBe('viewer');
    });

    it('returns developer as default for authenticated users', () => {
      expect(getUserRole({ user: { name: 'Test' } })).toBe('developer');
    });
  });

  describe('hasPermission', () => {
    it('admin has all permissions', () => {
      expect(hasPermission('admin', 'orchestrate')).toBe(true);
      expect(hasPermission('admin', 'approve')).toBe(true);
      expect(hasPermission('admin', 'execute')).toBe(true);
      expect(hasPermission('admin', 'config:write')).toBe(true);
    });

    it('developer has limited permissions', () => {
      expect(hasPermission('developer', 'orchestrate')).toBe(true);
      expect(hasPermission('developer', 'chat')).toBe(true);
      expect(hasPermission('developer', 'approve')).toBe(false);
      expect(hasPermission('developer', 'execute')).toBe(false);
    });

    it('viewer has read-only permissions', () => {
      expect(hasPermission('viewer', 'chat')).toBe(true);
      expect(hasPermission('viewer', 'audit:read')).toBe(true);
      expect(hasPermission('viewer', 'orchestrate')).toBe(false);
      expect(hasPermission('viewer', 'config:write')).toBe(false);
    });

    it('guest has minimal permissions', () => {
      expect(hasPermission('guest', 'chat')).toBe(true);
      expect(hasPermission('guest', 'orchestrate')).toBe(false);
      expect(hasPermission('guest', 'audit:read')).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('returns true if role has all permissions', () => {
      expect(hasAllPermissions('admin', ['orchestrate', 'approve', 'execute'])).toBe(true);
    });

    it('returns false if role lacks any permission', () => {
      expect(hasAllPermissions('developer', ['orchestrate', 'approve'])).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('returns true if role has at least one permission', () => {
      expect(hasAnyPermission('developer', ['approve', 'orchestrate'])).toBe(true);
    });

    it('returns false if role has none of the permissions', () => {
      expect(hasAnyPermission('guest', ['orchestrate', 'approve'])).toBe(false);
    });
  });

  describe('getPermissions', () => {
    it('returns all permissions for a role', () => {
      const adminPerms = getPermissions('admin');
      expect(adminPerms).toContain('orchestrate');
      expect(adminPerms).toContain('config:write');
      expect(adminPerms.length).toBeGreaterThan(10);
    });

    it('returns empty array for invalid role', () => {
      expect(getPermissions('invalid' as any)).toEqual([]);
    });
  });
});
