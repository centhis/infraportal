import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { useAuth } from './useAuth';
import { ROUTES } from '@shared/constants/routes';
import { TOKEN_KEY } from '@shared/constants/keys';
import { server } from '../../../../mocks/server';
import { http, HttpResponse } from 'msw';
import { AuthProvider } from '@core/providers/AuthProvider';
import { apiClient } from '@shared/api';
import { useAuthStore } from '../../store/auth.store';
import { initializeAuth } from '../../services/AuthService';
import React from 'react';

// Обёртка с AuthProvider
const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe('useAuth', () => {

    afterEach(() => {
        // Сбрасываем все runtime хендлеры, которые могут использовать тесты.
        server.resetHandlers();
        // Очищаем localStorage
        localStorage.clear();
        // Сбрасываем auth store
        useAuthStore.getState().reset();
    });

    it('should be intercepted by msw', async () => {
        server.use(
            http.get('http://localhost:8000/api/v1/test', () => {
                return HttpResponse.json({ message: 'mocked' });
            })
        );

        const response = await apiClient.get('/test');
        expect(response.data.message).toBe('mocked');
    });

    it('should have correct initial state when no token exists', async () => {
        // Нужно убедиться, что инициализация запускается, если AuthProvider не делает это автоматически.
        // Пока предполагаем, что AuthProvider ИЛИ компонент должен её запустить.
        // Если новая архитектура полагается на ручную инициализацию в App.tsx, симулируем её здесь.
        await initializeAuth();

        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.user).toBeNull();
        expect(result.current.error).toBeNull();
        expect(result.current.loading).toBe(false);
    });

    it('should fetch user on initial load if token exists', async () => {
        const mockUser = { id: 1, name: 'Test User', permissions: ['perm1'] };
        server.use(
            http.get('http://localhost:8000/api/v1/auth/me', () => {
                return HttpResponse.json(mockUser);
            })
        );
        localStorage.setItem(TOKEN_KEY, 'fake-token');

        // Запускаем инициализацию вручную, если AuthProvider не делает это.
        // В реальном приложении это происходит при старте.
        await initializeAuth();

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => {
            expect(result.current.user).toEqual(mockUser);
            // useAuth в новой архитектуре экспортирует user.
            // Права доступа, вероятно, находятся внутри user или обрабатываются отдельно.
            // Проверяем permissions, если useAuth их экспортирует или если они в user.
            // Хук не экспортирует 'permissions' напрямую согласно просмотренному файлу.
            // Смотрим useAuth.ts:
            // возвращает { user, loading, error, initialized, isAuthenticated, login, logout, clearError, setError }
            // НЕТ 'permissions' в возвращаемом объекте.
            // Но AuthProvider экспортирует permissions.
            // Тест тестирует хук useAuth, поэтому проверяем 'user.permissions', если доступно.
            expect((result.current.user as { permissions: string[] })?.permissions).toEqual(mockUser.permissions);
            expect(result.current.loading).toBe(false);
        });
    });

    it('should handle error when fetching user on initial load', async () => {
        server.use(
            http.get('http://localhost:8000/api/v1/auth/me', () => {
                return new HttpResponse(null, { status: 500 });
            })
        );
        localStorage.setItem(TOKEN_KEY, 'bad-token');

        await initializeAuth();

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => {
            expect(result.current.user).toBeNull();
            expect(result.current.loading).toBe(false);
        });
    });

    it('should successfully login, set token, and fetch user', async () => {
        const mockUser = { id: 1, name: 'Test User', permissions: ['perm1'] };
        const mockTokenData = { access_token: 'new-fake-token', permissions: ['perm1'] };

        server.use(
            http.post('http://localhost:8000/api/v1/auth/login/', () => {
                return HttpResponse.json(mockTokenData);
            }),
            http.get('http://localhost:8000/api/v1/auth/me', () => {
                return HttpResponse.json(mockUser);
            })
        );

        const { result } = renderHook(() => useAuth(), { wrapper });

        await act(async () => {
            const loginSuccess = await result.current.login({ login: 'user', password: 'password' });
            expect(loginSuccess).toBe(true);
        });

        expect(localStorage.getItem(TOKEN_KEY)).toBe(mockTokenData.access_token);
        expect(result.current.error).toBeNull();

        await waitFor(() => {
            expect(result.current.user).toEqual(mockUser);
        });
    });

    it('should handle failed login and set error message', async () => {
        server.use(
            http.post('http://localhost:8000/api/v1/auth/login/', () => {
                return HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 });
            })
        );

        const { result } = renderHook(() => useAuth(), { wrapper });

        await act(async () => {
            const loginSuccess = await result.current.login({ login: 'wrong', password: 'user' });
            expect(loginSuccess).toBe(false);
        });

        await waitFor(() => {
            expect(result.current.error).toBe('Invalid credentials');
        });

        expect(result.current.user).toBeNull();
        expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('should logout, remove token, and reset user state', async () => {
        const mockUser = { id: 1, name: 'Test User' };
        localStorage.setItem(TOKEN_KEY, 'fake-token');

        server.use(
            http.get('http://localhost:8000/api/v1/auth/me', () => {
                return HttpResponse.json(mockUser);
            }),
            http.post('http://localhost:8000/api/v1/auth/logout', () => {
                return new HttpResponse(null, { status: 200 });
            })
        );

        await initializeAuth();

        // Мокаем window.location
        const originalLocation = window.location;
        const mockLocation = { ...originalLocation, href: '', pathname: '/' };

        // Используем Object.defineProperty для перезаписи location, так как оно может быть read-only
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: mockLocation,
        });

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => expect(result.current.user).not.toBeNull());

        await act(async () => {
            await result.current.logout();
        });

        expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
        expect(result.current.user).toBeNull();
        expect(window.location.href).toBe(ROUTES.LOGIN);

        // Восстанавливаем window.location
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: originalLocation,
        });
    });
});
