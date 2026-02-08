import { render, screen } from '@testing-library/react';
import { WorkerStatusIndicator } from './WorkerStatusIndicator';
import { AllTheProviders } from '@mocks/test-utils';
import { vi, type Mock } from 'vitest';
import { useWorkerHealth } from '../../ui/hooks/useWorkerHealth';
import { useAuth } from '@modules/auth/ui/hooks/useAuth';
import React from 'react';

// Mock the hook directly
vi.mock('../../ui/hooks/useWorkerHealth', () => ({
    useWorkerHealth: vi.fn(),
}));

describe('WorkerStatusIndicator', () => {
    beforeEach(() => {
        (useAuth as Mock).mockReturnValue({
            user: { id: 1, login: 'admin' },
            loading: false,
            login: vi.fn(),
            logout: vi.fn(),
        });
    });

    it('renders loading state', () => {
        (useWorkerHealth as Mock).mockReturnValue({
            isLoading: true,
            isError: false,
            data: undefined,
        });

        render(<WorkerStatusIndicator />, { wrapper: ({ children }) => <AllTheProviders>{children}</AllTheProviders> });

        // Should have checking tooltip (on the IconButton or via Tooltip logic)
        // Since Tooltips are sometimes hard to test without hover, we can check if the button exists
        // and if it contains the orange light (we can't easily check color without computed styles).
        // Best proxy is accessibility label title
        expect(screen.getByLabelText('Checking worker status...')).toBeInTheDocument();
    });

    it('renders healthy state', () => {
        (useWorkerHealth as Mock).mockReturnValue({
            isLoading: false,
            isError: false,
            data: {
                active_workers: 2,
                active_tasks: 5,
                queued_tasks: 3,
                status: 'OK',
                workers: [
                    { name: 'celery@worker1', active_tasks: 2, concurrency: 4, queued_tasks: 1, memory_usage: 65000 },
                    { name: 'celery@worker2', active_tasks: 3, concurrency: 4, queued_tasks: 2, memory_usage: 72000 }
                ]
            },
        });

        render(<WorkerStatusIndicator />, { wrapper: ({ children }) => <AllTheProviders>{children}</AllTheProviders> });

        // Healthy state has a complex tooltip title which might be the aria-label
        // Material UI Tooltip adds aria-label to the child if title is string, 
        // but if title is ReactNode it might behave differently or rely on hover.
        // Let's just check that component renders
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders error state', () => {
        (useWorkerHealth as Mock).mockReturnValue({
            isLoading: false,
            isError: true,
            data: undefined,
        });

        render(<WorkerStatusIndicator />, { wrapper: ({ children }) => <AllTheProviders>{children}</AllTheProviders> });

        expect(screen.getByLabelText('Worker monitoring unavailable')).toBeInTheDocument();
    });
});
