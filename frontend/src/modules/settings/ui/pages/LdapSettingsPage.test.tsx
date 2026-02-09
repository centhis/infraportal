import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../../../mocks/test-utils';
import { LdapSettingsPage } from './LdapSettingsPage';
import {
    useLdapSettings,
    useLdapEnabled,
    useUpdateLdapSetting,
    useUpdateLdapSettingsBulk,
    useTestLdapConnection
} from '../hooks/useLdapSettings';
import { useToast } from '@core/providers/ToastProvider';
import type { LdapSettings } from '../../api/settings.dto';

// Мокаем зависимости
vi.mock('../hooks/useLdapSettings');
vi.mock('@core/providers/ToastProvider', () => ({
    useToast: vi.fn(() => ({
        showSuccess: vi.fn(),
        showError: vi.fn(),
    })),
    ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('LdapSettingsPage', () => {
    // ===== Фабрика тестовых данных =====
    const createMockSettings = (): LdapSettings => ({
        LDAP_URI: { key: 'LDAP_URI', value: 'ldap://localhost', type: 'string' },
        LDAP_ENABLED: { key: 'LDAP_ENABLED', value: 'true', type: 'boolean' },
    });

    const createDefaultHookValue = (overrides = {}) => ({
        data: undefined,
        isLoading: false,
        error: null,
        isSuccess: true,
        ...overrides,
    });

    const updateMutationMock = { mutateAsync: vi.fn() };
    const bulkUpdateMutationMock = { mutateAsync: vi.fn() };
    const testMutationMock = {
        mutateAsync: vi.fn(),
        isPending: false,
        isSuccess: false,
        isError: false,
        data: null,
        reset: vi.fn(),
    };

    const toastMock = {
        showSuccess: vi.fn(),
        showError: vi.fn(),
    };

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(useUpdateLdapSetting).mockReturnValue(updateMutationMock as unknown as ReturnType<typeof useUpdateLdapSetting>);
        vi.mocked(useUpdateLdapSettingsBulk).mockReturnValue(bulkUpdateMutationMock as unknown as ReturnType<typeof useUpdateLdapSettingsBulk>);
        vi.mocked(useTestLdapConnection).mockReturnValue(testMutationMock as unknown as ReturnType<typeof useTestLdapConnection>);
        // Дефолтный статус включения
        vi.mocked(useLdapEnabled).mockReturnValue(createDefaultHookValue({ data: true }) as unknown as ReturnType<typeof useLdapEnabled>);
        vi.mocked(useToast).mockReturnValue(toastMock as unknown as ReturnType<typeof useToast>);

        // Мок реализации методов тоста, чтобы избежать потенциальных проблем
        toastMock.showSuccess.mockImplementation(() => { });
        toastMock.showError.mockImplementation(() => { });
    });

    // ===== Загрузка и ошибки =====
    it('should show loading spinner', () => {
        vi.mocked(useLdapSettings).mockReturnValue(createDefaultHookValue({ isLoading: true }) as unknown as ReturnType<typeof useLdapSettings>);
        render(<LdapSettingsPage />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show error message', () => {
        vi.mocked(useLdapSettings).mockReturnValue(createDefaultHookValue({ error: new Error('Err') }) as unknown as ReturnType<typeof useLdapSettings>);
        render(<LdapSettingsPage />);
        expect(screen.getByText(/^Error$/i)).toBeInTheDocument();
    });

    // ===== Рендеринг контента =====
    it('should render page title and settings list', () => {
        vi.mocked(useLdapSettings).mockReturnValue(createDefaultHookValue({ data: createMockSettings() }) as unknown as ReturnType<typeof useLdapSettings>);
        render(<LdapSettingsPage />);

        expect(screen.getByRole('heading', { level: 5 })).toHaveTextContent('LDAP Settings');
        // Проверяем наличие секции Connection Parameters
        expect(screen.getByText('Connection Parameters')).toBeInTheDocument();
        // LDAP_ENABLED фильтруется, остается 1 настройка (LDAP_URI)
        expect(screen.getAllByRole('listitem').length).toBe(1);
    });

    it('should display LDAP status correctly', () => {
        vi.mocked(useLdapSettings).mockReturnValue(createDefaultHookValue({ data: createMockSettings() }) as unknown as ReturnType<typeof useLdapSettings>);

        // Случай 1: Включено
        vi.mocked(useLdapEnabled).mockReturnValue(createDefaultHookValue({ data: true }) as unknown as ReturnType<typeof useLdapEnabled>);
        const { unmount } = render(<LdapSettingsPage />);
        expect(screen.getByText(/LDAP Enabled/i)).toBeInTheDocument();
        unmount();

        // Случай 2: Отключено
        vi.mocked(useLdapEnabled).mockReturnValue(createDefaultHookValue({ data: false }) as unknown as ReturnType<typeof useLdapEnabled>);
        render(<LdapSettingsPage />);
        expect(screen.getByText(/LDAP Disabled/i)).toBeInTheDocument();
    });

    // ===== Взаимодействие с тестом подключения =====
    it('should handle test connection click', async () => {
        const mockSettings = createMockSettings();
        vi.mocked(useLdapSettings).mockReturnValue(createDefaultHookValue({ data: mockSettings }) as unknown as ReturnType<typeof useLdapSettings>);
        // Настраиваем успешный ответ
        testMutationMock.mutateAsync.mockResolvedValue({ success: true, message: 'OK' });

        render(<LdapSettingsPage />, { authHookValue: { permissions: ['settings:update'] } });

        const testBtn = screen.getByRole('button', { name: /Save/i });
        fireEvent.click(testBtn);

        expect(testMutationMock.mutateAsync).toHaveBeenCalled();
    });

    it('should show success alert on successful test', async () => {
        vi.mocked(useLdapSettings).mockReturnValue(createDefaultHookValue({ data: createMockSettings() }) as unknown as ReturnType<typeof useLdapSettings>);

        // Симулируем успешный вызов mutateAsync
        testMutationMock.mutateAsync.mockResolvedValue({
            success: true,
            message: 'Connection OK'
        });

        render(<LdapSettingsPage />, { authHookValue: { permissions: ['settings:update'] } });

        const testBtn = screen.getByRole('button', { name: /Save/i });
        fireEvent.click(testBtn);

        await vi.waitFor(() => {
            expect(toastMock.showSuccess).toHaveBeenCalledWith('Connection OK', expect.any(String));
        });
    });

    it('should show error alert on failed test (API returned failure)', async () => {
        vi.mocked(useLdapSettings).mockReturnValue(createDefaultHookValue({ data: createMockSettings() }) as unknown as ReturnType<typeof useLdapSettings>);

        // Симулируем успешный ответ с ошибкой внутри (логическая ошибка)
        testMutationMock.mutateAsync.mockResolvedValue({
            success: false,
            message: 'Invalid credentials'
        });

        render(<LdapSettingsPage />, { authHookValue: { permissions: ['settings:update'] } });

        const testBtn = screen.getByRole('button', { name: /Save/i });
        fireEvent.click(testBtn);

        await vi.waitFor(() => {
            expect(toastMock.showError).toHaveBeenCalledWith('Invalid credentials', expect.any(String));
        });
    });

    it('should show generic error alert on mutation error', async () => {
        vi.mocked(useLdapSettings).mockReturnValue(createDefaultHookValue({ data: createMockSettings() }) as unknown as ReturnType<typeof useLdapSettings>);

        // Симулируем реджект промиса
        testMutationMock.mutateAsync.mockRejectedValue(new Error('Network error'));

        render(<LdapSettingsPage />, { authHookValue: { permissions: ['settings:update'] } });

        const testBtn = screen.getByRole('button', { name: /Save/i });
        fireEvent.click(testBtn);

        await vi.waitFor(() => {
            expect(toastMock.showError).toHaveBeenCalledWith(expect.stringContaining('error'), expect.any(String));
        });
    });

    it('should disable Save button when user lacks settings:update permission', () => {
        // Мокаем отсутствие прав
        vi.mocked(useLdapSettings).mockReturnValue(createDefaultHookValue({ data: createMockSettings() }) as unknown as ReturnType<typeof useLdapSettings>);

        // Рендерим с пустыми правами
        render(<LdapSettingsPage />, { authHookValue: { permissions: [] } });

        const testBtn = screen.getByRole('button', { name: /Save/i });
        expect(testBtn).toBeDisabled();
    });
});
