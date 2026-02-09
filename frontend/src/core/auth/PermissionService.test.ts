import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionService } from './PermissionService';
import { usePermissionsStore } from './permissions.store';

describe('PermissionService', () => {

    beforeEach(() => {
        usePermissionsStore.getState().clear();
    });

    it('should return false if loading is true', () => {
        usePermissionsStore.setState({ loading: true, permissions: ['users:view'] });

        expect(PermissionService.has('users:view')).toBe(false);
        expect(PermissionService.can('users:view')).toBe(false);
        expect(PermissionService.can(['users:view'])).toBe(false);
        expect(PermissionService.canAll(['users:view'])).toBe(false);
    });

    describe('has()', () => {
        it('should return true if permission exists', () => {
            usePermissionsStore.setState({ permissions: ['users:view'], loading: false });
            expect(PermissionService.has('users:view')).toBe(true);
        });

        it('should return false if permission does not exist', () => {
            usePermissionsStore.setState({ permissions: ['users:view'], loading: false });
            expect(PermissionService.has('users:delete')).toBe(false);
        });
    });

    describe('can()', () => {
        it('should return true for single permission present', () => {
            usePermissionsStore.setState({ permissions: ['users:view'], loading: false });
            expect(PermissionService.can('users:view')).toBe(true);
        });

        it('should return false for single permission missing', () => {
            usePermissionsStore.setState({ permissions: ['users:view'], loading: false });
            expect(PermissionService.can('users:delete')).toBe(false);
        });

        it('should return true if ANY permission in array is present (OR logic)', () => {
            usePermissionsStore.setState({ permissions: ['users:view'], loading: false });
            expect(PermissionService.can(['users:create', 'users:view'])).toBe(true);
        });

        it('should return false if NO permission in array is present', () => {
            usePermissionsStore.setState({ permissions: ['users:view'], loading: false });
            expect(PermissionService.can(['users:create', 'users:delete'])).toBe(false);
        });

        it('should return true if empty array passed (no requirements)', () => {
            usePermissionsStore.setState({ permissions: [], loading: false });
            expect(PermissionService.can([])).toBe(true);
        });
    });

    describe('canAny()', () => {
        it('should behave validly as OR logic', () => {
            usePermissionsStore.setState({ permissions: ['A'], loading: false });
            expect(PermissionService.canAny(['A', 'B'])).toBe(true);
            expect(PermissionService.canAny(['C', 'B'])).toBe(false);
        });
    });

    describe('canAll()', () => {
        it('should return true only if ALL permissions are present', () => {
            usePermissionsStore.setState({ permissions: ['A', 'B'], loading: false });
            expect(PermissionService.canAll(['A', 'B'])).toBe(true);
        });

        it('should return false if ANY permission is missing', () => {
            usePermissionsStore.setState({ permissions: ['A'], loading: false });
            expect(PermissionService.canAll(['A', 'B'])).toBe(false);
        });

        it('should return true if empty array passed', () => {
            usePermissionsStore.setState({ permissions: [], loading: false });
            expect(PermissionService.canAll([])).toBe(true);
        });
    });
});
