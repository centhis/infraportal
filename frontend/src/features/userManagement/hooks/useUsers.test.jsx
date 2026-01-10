import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import useUsers from './useUsers';
import { usersService } from '../services/usersService';
import usePersistentState from './usePersistentState';
import { AllTheProviders } from '../../../mocks/test-utils'; // Import AllTheProviders

// Mock dependencies
vi.mock('../services/usersService');
vi.mock('./usePersistentState');

describe('useUsers', () => {
    const mockUsers = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
    ];
    const mockInitialData = { users: mockUsers, total: mockUsers.length };
    let setPaginationModel;

    beforeEach(() => {
        vi.resetAllMocks();
        setPaginationModel = vi.fn();
        // Mock usePersistentState to behave like a simple useState
        vi.mocked(usePersistentState).mockReturnValue([
            { page: 0, pageSize: 10 },
            setPaginationModel,
        ]);
        vi.mocked(usersService).list.mockResolvedValue(mockInitialData);
    });

    it('should have correct initial state and fetch users', async () => {
        const { result } = renderHook(() => useUsers(), { wrapper: AllTheProviders });

        expect(result.current.loading).toBe(true);
        expect(result.current.users).toEqual([]);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
            expect(result.current.users).toEqual(mockUsers);
            expect(result.current.rowCount).toBe(mockUsers.length);
        });

        expect(usersService.list).toHaveBeenCalledWith({ skip: 0, limit: 10 });
    });

    it('should refetch users when pagination model changes', async () => {
        const { rerender, result: _result } = renderHook(() => useUsers(), { wrapper: AllTheProviders });

        // Wait for initial fetch
        await waitFor(() => expect(usersService.list).toHaveBeenCalledTimes(1));

        // Change pagination model mock
        const newPaginationModel = { page: 1, pageSize: 20 };
        vi.mocked(usePersistentState).mockReturnValue([newPaginationModel, setPaginationModel]);
        vi.mocked(usersService).list.mockResolvedValue({ users: [], total: 0 });

        // Rerender the hook to simulate the change
        rerender();

        await waitFor(() => {
            expect(usersService.list).toHaveBeenCalledTimes(2);
            expect(usersService.list).toHaveBeenLastCalledWith({ skip: 20, limit: 20 });
        });
    });

    it('should optimistically add a user on createUser', async () => {
        const { result } = renderHook(() => useUsers(), { wrapper: AllTheProviders });
        await waitFor(() => expect(result.current.loading).toBe(false));

        const newUser = { id: 3, name: 'Charlie' };
        vi.mocked(usersService).create.mockResolvedValue(newUser);

        await act(async () => {
            await result.current.createUser({ name: 'Charlie' });
        });

        expect(usersService.create).toHaveBeenCalledWith({ name: 'Charlie' });
        expect(result.current.users).toHaveLength(3);
        expect(result.current.users[2]).toEqual(newUser);
        expect(result.current.rowCount).toBe(3);
    });

    it('should optimistically update a user on updateUser', async () => {
        const { result } = renderHook(() => useUsers(), { wrapper: AllTheProviders });
        await waitFor(() => expect(result.current.loading).toBe(false));

        const updatedUser = { id: 1, name: 'Alice Smith' };
        vi.mocked(usersService).update.mockResolvedValue(updatedUser);

        await act(async () => {
            await result.current.updateUser(1, { name: 'Alice Smith' });
        });

        expect(usersService.update).toHaveBeenCalledWith(1, { name: 'Alice Smith' });
        expect(result.current.users).toHaveLength(2);
        expect(result.current.users.find(u => u.id === 1)).toEqual(updatedUser);
    });

    it('should optimistically remove a user on deleteUser', async () => {
        const { result } = renderHook(() => useUsers(), { wrapper: AllTheProviders });
        await waitFor(() => expect(result.current.loading).toBe(false));

        vi.mocked(usersService).remove.mockResolvedValue({});

        await act(async () => {
            await result.current.deleteUser(1);
        });

        expect(usersService.remove).toHaveBeenCalledWith(1);
        expect(result.current.users).toHaveLength(1);
        expect(result.current.users.find(u => u.id === 1)).toBeUndefined();
        expect(result.current.rowCount).toBe(1);
    });
});
