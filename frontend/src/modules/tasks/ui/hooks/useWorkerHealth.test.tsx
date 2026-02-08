import { renderHook, waitFor } from '@testing-library/react';
import { useWorkerHealth } from './useWorkerHealth';
import { AllTheProviders } from '@mocks/test-utils';
import { tasksApi } from '../../api/tasks.api';
import { vi, type Mock } from 'vitest';
import React from 'react';
import { useAuth } from '@modules/auth/ui/hooks/useAuth';

vi.mock('../../api/tasks.api', () => ({
    tasksApi: {
        getWorkersHealth: vi.fn(),
    },
}));

describe('useWorkerHealth', () => {
    it('fetches worker health successfully', async () => {
        (useAuth as Mock).mockReturnValue({
            user: { id: 1, login: 'admin' },
            loading: false,
            login: vi.fn(),
            logout: vi.fn(),
        });

        (tasksApi.getWorkersHealth as any).mockResolvedValue({
            active_workers: 2,
            status: 'OK',
        });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <AllTheProviders>{children} </AllTheProviders>
        );

        const { result } = renderHook(() => useWorkerHealth(), {
            wrapper,
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual({
            active_workers: 2,
            status: 'OK',
        });
    });
});
