import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, afterEach, beforeEach, type Mock } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { authApi } from '../../api/auth.api';
import { MOCK_API_MESSAGES } from '../../../../mocks/mockData';
import { ROUTES } from '@shared/constants/routes';
import { TOKEN_KEY } from '@shared/constants/keys';
import { AuthProvider } from '@core/providers/AuthProvider';
import { I18nProvider } from '@core/providers/I18nProvider';
import { ToastProvider } from '@core/providers/ToastProvider';
import { useAuthStore } from '../../store/auth.store';
import { LoginPage } from './LoginPage';

// Мокаем authApi
vi.mock('../../api/auth.api', () => ({
    authApi: {
        login: vi.fn(),
        getCurrentUser: vi.fn(),
        getPermissions: vi.fn(),
        logout: vi.fn(),
    }
}));

// Мокаем глобальный экземпляр i18n, используемый I18nProvider
vi.mock('../../../../i18n/i18n', async () => {
    const i18next = await import('i18next');
    const { initReactI18next } = await import('react-i18next');

    const testInstance = i18next.createInstance();
    await testInstance.use(initReactI18next).init({
        lng: 'en',
        fallbackLng: 'en',
        ns: ['auth'],
        defaultNS: 'auth',
        resources: {
            en: {
                auth: {
                    login_page: {
                        title: "Login",
                        login: "Username",
                        password: "Password",
                        submit: "Sign In",
                        required: "Required"
                    }
                }
            },
        },
        interpolation: {
            escapeValue: false,
        },
    });

    return {
        __esModule: true,
        default: testInstance,
    };
});

// Моковый компонент для Home
const HomeComponent = () => <div>Welcome Home</div>;

describe('LoginPage Integration', () => {
    afterEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        useAuthStore.getState().reset();
    });

    beforeEach(() => {
        // Убеждаемся, что изначально не загружается, чтобы кнопка была активна
        act(() => {
            useAuthStore.getState().setLoading(false);
        });
    });

    it('should successfully log in and redirect to home', async () => {
        const mockUser = { id: 1, name: 'Test User', permissions: [] };
        const mockTokenData = { access_token: 'fake-token', permissions: [] };

        // Настраиваем мок API
        (authApi.login as Mock).mockResolvedValue(mockTokenData);
        (authApi.getCurrentUser as Mock).mockResolvedValue(mockUser);

        render(
            <MemoryRouter initialEntries={[ROUTES.LOGIN]}>
                <ThemeProvider theme={createTheme()}>
                    <I18nProvider>
                        <ToastProvider>
                            <AuthProvider>
                                <Routes>
                                    <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                                    <Route path={ROUTES.HOME} element={<HomeComponent />} />
                                </Routes>
                            </AuthProvider>
                        </ToastProvider>
                    </I18nProvider>
                </ThemeProvider>
            </MemoryRouter>
        );

        // Заполняем форму
        fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password' } });

        const submitBtn = screen.getByRole('button', { name: /Sign In/i });

        // Отправляем форму
        await act(async () => {
            fireEvent.click(submitBtn);
        });

        // Проверяем вызовы API
        expect(authApi.login).toHaveBeenCalled();
        expect(authApi.getCurrentUser).toHaveBeenCalled();

        // Ждём редиректа
        expect(await screen.findByText('Welcome Home', {}, { timeout: 4000 })).toBeInTheDocument();

        // Проверяем токен в localStorage
        expect(localStorage.getItem(TOKEN_KEY)).toBe('fake-token');
    });

    it('should show an error message on failed login', async () => {
        // Мокаем ошибку Login API
        const error = new Error('Auth Failed');
        Object.assign(error, {
            response: {
                status: 401,
                data: { detail: MOCK_API_MESSAGES.LOGIN_ERROR }
            },
            isAxiosError: true
        });
        (authApi.login as Mock).mockRejectedValue(error);

        render(
            <MemoryRouter initialEntries={[ROUTES.LOGIN]}>
                <ThemeProvider theme={createTheme()}>
                    <I18nProvider>
                        <ToastProvider>
                            <AuthProvider>
                                <Routes>
                                    <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                                    <Route path={ROUTES.HOME} element={<HomeComponent />} />
                                </Routes>
                            </AuthProvider>
                        </ToastProvider>
                    </I18nProvider>
                </ThemeProvider>
            </MemoryRouter>
        );

        // Заполняем форму
        fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'wronguser' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrongpass' } });

        // Отправляем
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
        });

        // Проверяем сообщение об ошибке
        expect(await screen.findByText(MOCK_API_MESSAGES.LOGIN_ERROR)).toBeInTheDocument();

        // Проверяем, что не было редиректа
        expect(screen.queryByText('Welcome Home')).not.toBeInTheDocument();
    });
});
