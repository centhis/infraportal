/* eslint-disable react-refresh/only-export-components */
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { vi, type Mock } from 'vitest';
import i18n from 'i18next';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactElement } from 'react';

// Используем алиасы путей или относительные пути к провайдерам CORE
import { AuthProvider } from '../core/providers/AuthProvider';
import { ToastProvider } from '../core/providers/ToastProvider';
// Хук авторизации, используемый AuthProvider
import { useAuth } from '../modules/auth/ui/hooks/useAuth';
import { usePermissionsStore } from '../core/auth/permissions.store';

// Импорт переводов
import userManagementTranslations from '../i18n/locales/en/user_management.json';
import commonTranslations from '../i18n/locales/en/common.json';
import layoutTranslations from '../i18n/locales/en/layout.json';
import settingsTranslations from '../i18n/locales/en/settings.json';

// Мокаем реальные хуки, которые хотим контролировать
vi.mock('../modules/auth/ui/hooks/useAuth');

// Создаем новый экземпляр i18n
const i18nTest = i18n.createInstance();

// Инициализируем экземпляр i18n
i18nTest.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    ns: ['user_management', 'common', 'layout', 'settings'],
    defaultNS: 'common',
    resources: {
        en: {
            user_management: userManagementTranslations,
            common: commonTranslations,
            layout: layoutTranslations,
            settings: settingsTranslations,
        },
    },
    interpolation: {
        escapeValue: false, // Не требуется для React
    },
});

interface AllTheProvidersProps {
    children: React.ReactNode;
    initialEntries?: MemoryRouterProps['initialEntries'];
}

export const AllTheProviders = ({ children, initialEntries = ['/'] }: AllTheProvidersProps) => {
    // Создаем новый QueryClient для каждого теста, чтобы избежать утечки состояния
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    return (
        <MemoryRouter initialEntries={initialEntries}>
            <QueryClientProvider client={queryClient}>
                <I18nextProvider i18n={i18nTest}>
                    <AuthProvider>
                        <ToastProvider>
                            {children}
                        </ToastProvider>
                    </AuthProvider>
                </I18nextProvider>
            </QueryClientProvider>
        </MemoryRouter>
    );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    authHookValue?: Partial<{
        user: unknown;
        permissions: unknown[];
        loading: boolean;
        logout: Mock;
        login: Mock;
    }>;
    initialEntries?: MemoryRouterProps['initialEntries'];
}

const renderWithProviders = (
    ui: ReactElement,
    {
        authHookValue: providedAuthHookValue = {},
        initialEntries = ['/'], // По умолчанию корневой путь, если не указан
        ...renderOptions
    }: CustomRenderOptions = {}
): RenderResult => {
    const defaultAuthHookValue = {
        user: null,
        permissions: [],
        loading: false,
        logout: vi.fn(),
        login: vi.fn().mockResolvedValue(true),
    };

    const authHookValue = { ...defaultAuthHookValue, ...providedAuthHookValue };
    // Устанавливаем возвращаемое значение мока для хука useAuth перед рендером
    (useAuth as Mock).mockImplementation(() => authHookValue);

    // Синхронизируем permissions И loading со стором для компонентов, использующих Can/usePermissions
    const store = usePermissionsStore.getState();
    if (authHookValue.permissions) {
        store.setPermissions(authHookValue.permissions as string[]);
    }
    if (typeof authHookValue.loading !== 'undefined') {
        store.setLoading(authHookValue.loading);
    }

    return render(ui, {
        wrapper: ({ children }) => (
            <ThemeProvider theme={createTheme()}>
                <AllTheProviders initialEntries={initialEntries}>{children}</AllTheProviders>
            </ThemeProvider>
        ),
        ...renderOptions,
    });
};

// Ре-экспортируем всё из testing-library
export * from '@testing-library/react';
// Переопределяем метод render нашим кастомным
export { renderWithProviders as render };
