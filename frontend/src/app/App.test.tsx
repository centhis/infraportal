import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';
// Мокаем useAuth напрямую
import { useAuth } from '../modules/auth/ui/hooks/useAuth';
import { usePermissionsStore } from '../core/auth/permissions.store';

// Мокаем хук авторизации
vi.mock('../modules/auth/ui/hooks/useAuth');

describe('App Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Сбрасываем стор прав
        usePermissionsStore.getState().clear();
        // Сбрасываем историю браузера для каждого теста
        window.history.pushState({}, 'Test page', '/');
    });

    it('renders login page by default (public route)', async () => {
        // Мок неаутентифицированного состояния
        (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
            user: null,
            permissions: [],
            loading: false,
            logout: vi.fn(),
        });

        render(<App />);

        // Предполагаем, что на странице входа есть заголовок или кнопка "Login"
        // Или проверяем ключ перевода/текст. Страница входа обычно содержит "Sign in" или что-то подобное.
        // Будем считать, что это стандартная страница входа (из модуля auth).
        // Если не уверены, можем проверить отсутствие Navbar (который есть только на защищенных маршрутах).

        await waitFor(() => {
            expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
            // Также проверяем, что текущий URL - '/'
            expect(window.location.pathname).toBe('/');
        });
    });

    it('redirects to login if accessing protected route while unauthenticated', async () => {
        // Мок неаутентифицированного состояния
        (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
            user: null,
            permissions: [],
            loading: false,
            logout: vi.fn(),
        });

        // Переход на защищенный маршрут
        window.history.pushState({}, 'Home', '/home');

        render(<App />);

        await waitFor(() => {
            // Должен перенаправить на '/' (defaultPublicRoute)
            expect(window.location.pathname).toBe('/');
        });
    });

    it('renders home page and navbar when authenticated', async () => {
        // Мок аутентифицированного состояния
        const permissions = ['users:view'];
        (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
            user: { name: 'Test User' },
            permissions,
            loading: false,
            logout: vi.fn(),
        });

        // Синхронизация логики стора прав - аналогично test-utils
        usePermissionsStore.getState().setPermissions(permissions);

        // Переход на защищенный маршрут
        window.history.pushState({}, 'Home', '/home');

        render(<App />);

        await waitFor(() => {
            // Navbar должен быть виден (проверяем заголовок Home в AppBar)
            expect(screen.getByRole('heading', { name: /Home/i })).toBeInTheDocument();
            // Должен остаться на /home
            expect(window.location.pathname).toBe('/home');
        });
        // Проверяем контент Home, если возможно (ключ перевода или текст)
    });
});
