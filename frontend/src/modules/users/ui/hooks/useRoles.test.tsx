import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useRoles, useRole, useCreateRole, useUpdateRole, useDeleteRole } from './useRoles';
import { rolesApi } from '../../api/roles.api';
import { AllTheProviders } from '../../../../mocks/test-utils';
import type { Role } from '../../api/users.dto';
import { useAuth } from '../../../auth/ui/hooks/useAuth';

// Мокаем rolesApi
vi.mock('../../api/roles.api', () => ({
    rolesApi: {
        list: vi.fn(),
        get: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
    },
}));

// Мокаем useAuth
vi.mock('../../../auth/ui/hooks/useAuth', () => ({ useAuth: vi.fn() }));

const mockRoles: Role[] = [
    { id: 1, name: 'admin', description: 'Admin role', built_in: true, created_at: '2023-01-01', permissions: [] },
    { id: 2, name: 'editor', description: 'Editor role', built_in: false, created_at: '2023-01-01', permissions: [] },
];

const mockRole: Role = mockRoles[0]!;

describe('useRoles Hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Настраиваем мок useAuth для AllTheProviders
        (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            user: { name: 'Test User' },
            loading: false,
            login: vi.fn(),
            logout: vi.fn(),
        });
    });

    describe('useRoles', () => {
        it('should fetch roles with params', async () => {
            vi.mocked(rolesApi.list).mockResolvedValue({
                items: mockRoles,
                total: 2,
                page: 1,
                size: 10,
                pages: 1
            });

            const { result } = renderHook(() => useRoles({ page: 0, size: 10 }), { wrapper: AllTheProviders });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data?.items).toEqual(mockRoles);
            expect(result.current.data?.total).toBe(2);
            expect(rolesApi.list).toHaveBeenCalledWith({ page: 0, size: 10 });
        });
    });

    describe('useRole', () => {
        it('should fetch a single role by id', async () => {
            vi.mocked(rolesApi.get).mockResolvedValue(mockRole);

            const { result } = renderHook(() => useRole(1), { wrapper: AllTheProviders });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toEqual(mockRole);
            expect(rolesApi.get).toHaveBeenCalledWith(1);
        });

        it('should not fetch if id is not provided', async () => {
            const { result } = renderHook(() => useRole(0), { wrapper: AllTheProviders });
            expect(result.current.isPending).toBe(true);
            expect(result.current.fetchStatus).toBe('idle');
            expect(rolesApi.get).not.toHaveBeenCalled();
        });
    });

    describe('useCreateRole', () => {
        it('should create a role and invalidate queries', async () => {
            const { result } = renderHook(() => useCreateRole(), { wrapper: AllTheProviders });
            const newRole = { ...mockRole, id: 3, name: 'New Role' };
            vi.mocked(rolesApi.create).mockResolvedValue(newRole);

            await result.current.mutateAsync({ name: 'New Role', description: 'Desc' });

            expect(rolesApi.create).toHaveBeenCalledWith({ name: 'New Role', description: 'Desc' });
        });
    });

    describe('useUpdateRole', () => {
        it('should update a role and invalidate/set queries', async () => {
            const { result } = renderHook(() => useUpdateRole(), { wrapper: AllTheProviders });
            const updatedRole = { ...mockRole, name: 'Updated' };
            vi.mocked(rolesApi.update).mockResolvedValue(updatedRole);

            await result.current.mutateAsync({ roleId: 1, data: { name: 'Updated' } });

            expect(rolesApi.update).toHaveBeenCalledWith(1, { name: 'Updated' });
        });
    });

    describe('useDeleteRole', () => {
        it('should delete a role and invalidate queries', async () => {
            const { result } = renderHook(() => useDeleteRole(), { wrapper: AllTheProviders });
            vi.mocked(rolesApi.remove).mockResolvedValue(undefined);

            await result.current.mutateAsync(1);

            expect(rolesApi.remove).toHaveBeenCalledWith(1);
        });
    });
});
