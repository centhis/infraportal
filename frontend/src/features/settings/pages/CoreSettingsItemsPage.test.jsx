import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../../../mocks/test-utils';
import CoreSettingsItemsPage from './CoreSettingsItemsPage';
import useCoreSettings from '../hooks/useCoreSettings';

// Mock dependencies
vi.mock('../hooks/useCoreSettings');

describe('CoreSettingsItemsPage', () => {
    // ===== Test Data Factory (DRY) =====
    const createMockSettings = () => [
        { key: 'APP_NAME', value: 'InfraPortal', type: 'string', is_sensitive: false },
        { key: 'DEBUG_MODE', value: 'false', type: 'boolean', is_sensitive: false },
    ];

    const createDefaultHookValue = (overrides = {}) => ({
        coreSettings: [],
        loading: false,
        error: null,
        fetchCoreSettings: vi.fn(),
        updateCoreSetting: vi.fn(),
        ...overrides,
    });

    beforeEach(() => {
        vi.resetAllMocks();
    });

    // ===== Loading State =====
    describe('Loading State', () => {
        it('should show loading spinner when loading with empty settings', () => {
            vi.mocked(useCoreSettings).mockReturnValue(
                createDefaultHookValue({ loading: true })
            );

            render(<CoreSettingsItemsPage />);

            expect(screen.getByRole('progressbar')).toBeInTheDocument();
        });

        it('should not show loading spinner when settings are loaded', () => {
            vi.mocked(useCoreSettings).mockReturnValue(
                createDefaultHookValue({ coreSettings: createMockSettings() })
            );

            render(<CoreSettingsItemsPage />);

            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });
    });

    // ===== Content Rendering =====
    describe('Content Rendering', () => {
        it('should render page title', () => {
            vi.mocked(useCoreSettings).mockReturnValue(
                createDefaultHookValue({ coreSettings: createMockSettings() })
            );

            render(<CoreSettingsItemsPage />);

            // Check for heading element
            const heading = screen.getByRole('heading', { level: 5 });
            expect(heading).toBeInTheDocument();
        });

        it('should render settings list', () => {
            vi.mocked(useCoreSettings).mockReturnValue(
                createDefaultHookValue({ coreSettings: createMockSettings() })
            );

            render(<CoreSettingsItemsPage />);

            // Settings items should be rendered (check for list)
            expect(screen.getByRole('list')).toBeInTheDocument();
        });

        it('should show empty state when no settings', () => {
            vi.mocked(useCoreSettings).mockReturnValue(
                createDefaultHookValue({ coreSettings: [], loading: false })
            );

            render(<CoreSettingsItemsPage />);

            // Empty state is inside the list container
            expect(screen.getByRole('list')).toBeInTheDocument();
        });
    });

    // ===== Fetch on Mount =====
    describe('Fetch on Mount', () => {
        it('should call fetchCoreSettings on mount', () => {
            const fetchMock = vi.fn();
            vi.mocked(useCoreSettings).mockReturnValue(
                createDefaultHookValue({ fetchCoreSettings: fetchMock })
            );

            render(<CoreSettingsItemsPage />);

            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
    });

    // ===== Error Handling =====
    describe('Error Handling', () => {
        it('should show toast on error', async () => {
            const error = 'Failed to load settings';
            vi.mocked(useCoreSettings).mockReturnValue(
                createDefaultHookValue({ error })
            );

            render(<CoreSettingsItemsPage />);

            await waitFor(() => {
                expect(screen.getByText(error)).toBeInTheDocument();
            });
        });
    });
});
