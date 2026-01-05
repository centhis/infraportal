import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import useGroups from './useGroups';
import { groupsService } from '../services/groupsService';
import usePersistentState from './usePersistentState';

// Mock dependencies
vi.mock('../services/groupsService');
vi.mock('./usePersistentState');

describe('useGroups', () => {
    const mockGroups = [
        { id: 1, name: 'Admins' },
        { id: 2, name: 'Developers' },
    ];
    const mockInitialData = { groups: mockGroups, total: mockGroups.length };
    let setPaginationModel;

    beforeEach(() => {
        vi.resetAllMocks();
        setPaginationModel = vi.fn();
        // Mock usePersistentState to behave like a simple useState
        usePersistentState.mockReturnValue([
            { page: 0, pageSize: 10 },
            setPaginationModel,
        ]);
        groupsService.list.mockResolvedValue(mockInitialData);
    });

    it('should fetch paginated groups on initial render', async () => {
        const { result } = renderHook(() => useGroups());

        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
            expect(result.current.groups).toEqual(mockGroups);
            expect(result.current.rowCount).toBe(mockGroups.length);
        });

        expect(groupsService.list).toHaveBeenCalledWith({ skip: 0, limit: 10 });
    });

    it('should fetch all groups when paginated is false', async () => {
        renderHook(() => useGroups({ paginated: false }));

        await waitFor(() => {
            expect(groupsService.list).toHaveBeenCalledWith({ limit: 1000, skip: 0 });
        });
    });

    it('should optimistically add a group on createGroup', async () => {
        const { result } = renderHook(() => useGroups());
        await waitFor(() => expect(result.current.loading).toBe(false));

        const newGroup = { id: 3, name: 'Viewers' };
        groupsService.create.mockResolvedValue(newGroup);

        await act(async () => {
            await result.current.createGroup({ name: 'Viewers' });
        });

        expect(groupsService.create).toHaveBeenCalledWith({ name: 'Viewers' });
        expect(result.current.groups).toHaveLength(3);
        expect(result.current.groups[2]).toEqual(newGroup);
        expect(result.current.rowCount).toBe(3);
    });

    it('should optimistically update a group on updateGroup', async () => {
        const { result } = renderHook(() => useGroups());
        await waitFor(() => expect(result.current.loading).toBe(false));

        const updatedGroup = { id: 1, name: 'Super Admins' };
        groupsService.update.mockResolvedValue(updatedGroup);

        await act(async () => {
            await result.current.updateGroup(1, { name: 'Super Admins' });
        });

        expect(groupsService.update).toHaveBeenCalledWith(1, { name: 'Super Admins' });
        expect(result.current.groups.find(g => g.id === 1)).toEqual(updatedGroup);
    });

    it('should optimistically remove a group on deleteGroup', async () => {
        const { result } = renderHook(() => useGroups());
        await waitFor(() => expect(result.current.loading).toBe(false));

        groupsService.remove.mockResolvedValue({});

        await act(async () => {
            await result.current.deleteGroup(1);
        });

        expect(groupsService.remove).toHaveBeenCalledWith(1);
        expect(result.current.groups).toHaveLength(1);
        expect(result.current.groups.find(g => g.id === 1)).toBeUndefined();
        expect(result.current.rowCount).toBe(1);
    });
});
