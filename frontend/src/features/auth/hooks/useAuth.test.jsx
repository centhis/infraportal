import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useAuth } from './useAuth';
import { authApi } from '../api/authApi';
import { ROUTES } from '../../../shared/constants/routes'; // Import ROUTES
import { TOKEN_KEY } from '../../../shared/constants/keys';

// Mock authApi
vi.mock('../api/authApi');

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => {
            store[key] = value.toString();
        },
        clear: () => {
            store = {};
        },
        removeItem: (key) => {
            delete store[key];
        },
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.location.href more robustly
let locationHref = 'https://www.example.com';
const mockLocation = {
    set href(val) {
        locationHref = val;
    },
    get href() {
        return locationHref;
    },
    pathname: '/', // Default pathname
    assign: vi.fn(),
    replace: vi.fn(),
};


describe('useAuth', () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.resetAllMocks();
        locationHref = 'https://www.example.com'; // Reset location on each test
        window.location = mockLocation; // Directly assign the mock
        // Suppress console.error for cleaner test output
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should have correct initial state when no token exists', async () => {
        const { result } = renderHook(() => useAuth());

        expect(result.current.user).toBeNull();
        expect(result.current.error).toBeNull();
        // The loading state should become false after the initial check
        await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it('should fetch user on initial load if token exists', async () => {
        const mockUser = { id: 1, name: 'Test User' };
        window.localStorage.setItem(TOKEN_KEY, 'fake-token');
        authApi.getCurrentUser.mockResolvedValue(mockUser);

        const { result } = renderHook(() => useAuth());

        await waitFor(() => {
            expect(authApi.getCurrentUser).toHaveBeenCalledTimes(1);
            expect(result.current.user).toEqual(mockUser);
            expect(result.current.loading).toBe(false);
        });
    });

    it('should handle error when fetching user on initial load', async () => {
        window.localStorage.setItem(TOKEN_KEY, 'bad-token');
        authApi.getCurrentUser.mockRejectedValue(new Error('Bad token'));

        const { result } = renderHook(() => useAuth());

        await waitFor(() => {
            expect(authApi.getCurrentUser).toHaveBeenCalledTimes(1);
            expect(result.current.user).toBeNull();
            expect(result.current.loading).toBe(false);
        });
    });

    it('should successfully login, set token, and fetch user', async () => {
        const mockUser = { id: 1, name: 'Test User' };
        const mockTokenData = { access_token: 'new-fake-token' };
        authApi.login.mockResolvedValue(mockTokenData);
        authApi.getCurrentUser.mockResolvedValue(mockUser);

        const { result } = renderHook(() => useAuth());

        let loginSuccess;
        await act(async () => {
            loginSuccess = await result.current.login({ login: 'user', password: 'password' });
        });

        expect(loginSuccess).toBe(true);
        expect(authApi.login).toHaveBeenCalledWith('user', 'password');
        expect(window.localStorage.getItem(TOKEN_KEY)).toBe(mockTokenData.access_token);
        expect(result.current.error).toBeNull();
        
        await waitFor(() => {
            expect(result.current.user).toEqual(mockUser);
        });
    });

    it('should handle failed login and set error message', async () => {
        const errorResponse = { response: { data: { detail: 'Invalid credentials' } } };
        authApi.login.mockRejectedValue(errorResponse);

        const { result } = renderHook(() => useAuth());

        let loginSuccess;
        await act(async () => {
            loginSuccess = await result.current.login({ login: 'wrong', password: 'user' });
        });

        expect(loginSuccess).toBe(false);
        expect(result.current.error).toBe('Invalid credentials');
        expect(result.current.user).toBeNull();
        expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('should logout, remove token, and reset user state', async () => {
        const mockUser = { id: 1, name: 'Test User' };
        window.localStorage.setItem(TOKEN_KEY, 'fake-token');
        authApi.getCurrentUser.mockResolvedValue(mockUser);
        authApi.logout.mockResolvedValue({});

        const { result } = renderHook(() => useAuth());

        // Wait for initial user fetch to complete
        await waitFor(() => expect(result.current.user).not.toBeNull());
        
        await act(async () => {
            await result.current.logout();
        });

        expect(authApi.logout).toHaveBeenCalledTimes(1);
        expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
        expect(result.current.user).toBeNull();
        expect(window.location.href).toBe(ROUTES.LOGIN); // Use ROUTES.LOGIN
    });
});
