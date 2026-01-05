import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import useRoles from './useRoles';
import { rolesService } from '../services/rolesService';
import usePersistentState from './usePersistentState';

// Mock dependencies
vi.mock('../services/rolesService');
vi.mock('./usePersistentState');

describe('useRoles', () => {
    const mockRoles = [
        { id: 1, name: 'admin' },
        { id: 2, name: 'editor' },
    ];
    const mockInitialData = { roles: mockRoles, total: mockRoles.length };
    let setPaginationModel;

    beforeEach(() => {
        vi.resetAllMocks();
        setPaginationModel = vi.fn();
        // Mock usePersistentState to behave like a simple useState
        usePersistentState.mockReturnValue([
            { page: 0, pageSize: 10 },
            setPaginationModel,
        ]);
        rolesService.list.mockResolvedValue(mockInitialData);
    });

    it('should fetch paginated roles on initial render', async () => {
        const { result } = renderHook(() => useRoles());

        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
            expect(result.current.roles).toEqual(mockRoles);
            expect(result.current.rowCount).toBe(mockRoles.length);
        });

        expect(rolesService.list).toHaveBeenCalledWith({ skip: 0, limit: 10 });
    });

    it('should fetch all roles when paginated is false', async () => {
        renderHook(() => useRoles({ paginated: false }));

        await waitFor(() => {
            expect(rolesService.list).toHaveBeenCalledWith({ limit: 1000, skip: 0 });
        });
    });

    it('should optimistically add a role on createRole', async () => {
        const { result } = renderHook(() => useRoles());
        await waitFor(() => expect(result.current.loading).toBe(false));

        const newRole = { id: 3, name: 'viewer' };
        rolesService.create.mockResolvedValue(newRole);

        await act(async () => {
            await result.current.createRole({ name: 'viewer' });
        });

        expect(rolesService.create).toHaveBeenCalledWith({ name: 'viewer' });
        expect(result.current.roles).toHaveLength(3);
        expect(result.current.roles[2]).toEqual(newRole);
        expect(result.current.rowCount).toBe(3);
    });

    it('should optimistically update a role on updateRole', async () => {
        const { result } = renderHook(() => useRoles());
        await waitFor(() => expect(result.current.loading).toBe(false));

        const updatedRole = { id: 1, name: 'super-admin' };
        rolesService.update.mockResolvedValue(updatedRole);

        await act(async () => {
            await result.current.updateRole(1, { name: 'super-admin' });
        });

        expect(rolesService.update).toHaveBeenCalledWith(1, { name: 'super-admin' });
        expect(result.current.roles.find(r => r.id === 1)).toEqual(updatedRole);
    });

    it('should optimistically remove a role on deleteRole', async () => {
        const { result } = renderHook(() => useRoles());
        await waitFor(() => expect(result.current.loading).toBe(false));

        rolesService.remove.mockResolvedValue({});

        await act(async () => {
            await result.current.deleteRole(1);
        });

        expect(rolesService.remove).toHaveBeenCalledWith(1);
        expect(result.current.roles).toHaveLength(1);
        expect(result.current.roles.find(r => r.id === 1)).toBeUndefined();
        expect(result.current.rowCount).toBe(1);
    });
});
