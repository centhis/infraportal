import { renderHook, act, waitFor } from '@testing-library/react';
import { vi as _vi } from 'vitest';
import { useAuth } from './useAuth';
import { ROUTES } from '../../../shared/constants/routes';
import { TOKEN_KEY } from '../../../shared/constants/keys';
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';
import { AuthProvider } from '../../../app/providers/AuthProvider';
import AxiosInstance from '../../../shared/api/AxiosInstance';

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe('useAuth', () => {

    afterEach(() => {
        // Reset any runtime handlers tests may use.
        server.resetHandlers();
        // Clear local storage
        localStorage.clear();
    });

    it('should be intercepted by msw', async () => {
        server.use(
            http.get('http://localhost:8000/api/v1/test', () => {
                return HttpResponse.json({ message: 'mocked' });
            })
        );
    
        const response = await AxiosInstance.get('/test');
        expect(response.data.message).toBe('mocked');
    });

    it('should have correct initial state when no token exists', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.user).toBeNull();
        expect(result.current.error).toBeNull();
        await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it('should fetch user on initial load if token exists', async () => {
        const mockUser = { id: 1, name: 'Test User', permissions: ['perm1'] };
        server.use(
            http.get('http://localhost:8000/api/v1/auth/me', () => {
                return HttpResponse.json(mockUser);
            })
        );
        localStorage.setItem(TOKEN_KEY, 'fake-token');

        const { result } = renderHook(() => useAuth(), { wrapper });
        
        await waitFor(() => {
            expect(result.current.user).toEqual(mockUser);
            expect(result.current.permissions).toEqual(mockUser.permissions);
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
            expect(result.current.permissions).toEqual(mockUser.permissions);
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

        expect(result.current.error).toBe('Invalid credentials');
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
        
        // Mock window.location.href
        const location = window.location;
        delete window.location;
        window.location = { ...location, href: 'http://localhost:3000' };

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => expect(result.current.user).not.toBeNull());
        
        await act(async () => {
            await result.current.logout();
        });

        expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
        expect(result.current.user).toBeNull();
        expect(window.location.href).toBe(ROUTES.LOGIN);

        // Restore window.location
        window.location = location;
    });
});
