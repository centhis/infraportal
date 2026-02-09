import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../../../mocks/test-utils';
import { CoreSettingsPage } from './CoreSettingsPage';
import { useCoreSettings, useUpdateCoreSetting } from '../hooks/useCoreSettings';
import type { CoreSettingsMap } from '../../api/settings.dto';

// Мокаем зависимости
vi.mock('../hooks/useCoreSettings');

describe('CoreSettingsPage', () => {
    // ===== Фабрика тестовых данных (DRY) =====
    const createMockSettings = (): CoreSettingsMap => ({
        APP_NAME: { key: 'APP_NAME', value: 'InfraPortal', type: 'string' },
        DEBUG_MODE: { key: 'DEBUG_MODE', value: 'false', type: 'boolean' },
    });

    const createDefaultHookValue = (overrides = {}) => ({
        data: undefined,
        isLoading: false,
        error: null,
        isSuccess: true,
        ...overrides,
    });

    const updateMutationMock = {
        mutateAsync: vi.fn(),
    };

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(useUpdateCoreSetting).mockReturnValue(updateMutationMock as unknown as ReturnType<typeof useUpdateCoreSetting>);
    });

    // ===== Состояние загрузки =====
    describe('Loading State', () => {
        it('should show loading spinner when loading', () => {
            vi.mocked(useCoreSettings).mockReturnValue(
                createDefaultHookValue({ isLoading: true }) as unknown as ReturnType<typeof useCoreSettings>
            );

            render(<CoreSettingsPage />);

            expect(screen.getByRole('progressbar')).toBeInTheDocument();
        });
    });

    // ===== Рендеринг контента =====
    describe('Content Rendering', () => {
        it('should render page title', () => {
            vi.mocked(useCoreSettings).mockReturnValue(
                createDefaultHookValue({ data: createMockSettings() }) as unknown as ReturnType<typeof useCoreSettings>
            );

            render(<CoreSettingsPage />);

            // Проверяем наличие заголовка
            // Typography variant="h6" обычно соответствует h6
            const heading = screen.getByRole('heading', { level: 6 });
            expect(heading).toBeInTheDocument();
        });

        it('should render settings list', () => {
            vi.mocked(useCoreSettings).mockReturnValue(
                createDefaultHookValue({ data: createMockSettings() }) as unknown as ReturnType<typeof useCoreSettings>
            );

            render(<CoreSettingsPage />);

            // Элементы настроек должны быть отрендерены (проверяем наличие списка)
            expect(screen.getByRole('list')).toBeInTheDocument();
            // Должно быть 2 элемента
            const items = screen.getAllByRole('listitem');
            expect(items.length).toBe(2);
        });

        it('should show empty state when no settings', () => {
            vi.mocked(useCoreSettings).mockReturnValue(
                createDefaultHookValue({ data: {} }) as unknown as ReturnType<typeof useCoreSettings>
            );

            render(<CoreSettingsPage />);

            expect(screen.getByText(/No settings available/i)).toBeInTheDocument();
        });
    });

    // ===== Обработка ошибок =====
    describe('Error Handling', () => {
        it('should show error message on error', () => {
            vi.mocked(useCoreSettings).mockReturnValue(
                createDefaultHookValue({ error: new Error('Failed to load') }) as unknown as ReturnType<typeof useCoreSettings>
            );

            render(<CoreSettingsPage />);

            expect(screen.getByText(/Error loading data/i)).toBeInTheDocument();
        });
    });
});
