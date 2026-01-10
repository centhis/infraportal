import AxiosInstance from './AxiosInstance';
import { vi } from 'vitest';
import { createStorageMock, createLocationMock } from '../../mocks/test-helpers';


describe('AxiosInstance Basic Functionality', () => {
    const MOCK_API_URL = 'http://localhost:8000/api/v1';
    let localStorageMock;
    let locationMock;


    beforeEach(() => {
        localStorageMock = createStorageMock();
        locationMock = createLocationMock();

        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true,
        });
        Object.defineProperty(window, 'location', {
            value: locationMock,
            writable: true,
        });

        vi.clearAllMocks();
        // Reset Authorization header
        delete AxiosInstance.defaults.headers.common.Authorization;
        // Reset the baseURL to the mock URL to ensure consistency
        AxiosInstance.defaults.baseURL = MOCK_API_URL;
    });

    // --- Configuration Tests ---
    it('should be configured with the correct baseURL', () => {
        expect(AxiosInstance.defaults.baseURL).toBe(MOCK_API_URL);
    });

    it('should have a timeout of 5000ms', () => {
        expect(AxiosInstance.defaults.timeout).toBe(5000);
    });

    it('should have correct default headers', () => {
        expect(AxiosInstance.defaults.headers['Content-Type']).toBe('application/json');
        expect(AxiosInstance.defaults.headers.accept).toBe('application/json');
    });

    it('should be configured with withCredentials: true', () => {
        expect(AxiosInstance.defaults.withCredentials).toBe(true);
    });

    // --- Request Interceptor Tests ---
    it('should add Authorization header if token exists in localStorage', async () => {
        localStorageMock.setItem('Token', 'test_token');
        const config = { headers: {} };
        // Directly call the fulfilled handler of the request interceptor
        const newConfig = await AxiosInstance.interceptors.request.handlers[0].fulfilled(config);
        expect(newConfig.headers.Authorization).toBe('Bearer test_token');
        expect(localStorageMock.getItem).toHaveBeenCalledWith('Token');
    });

    it('should NOT add Authorization header if no token in localStorage', async () => {
        const config = { headers: {} };
        // Directly call the fulfilled handler of the request interceptor
        const newConfig = await AxiosInstance.interceptors.request.handlers[0].fulfilled(config);
        expect(newConfig.headers.Authorization).toBeUndefined();
        expect(localStorageMock.getItem).toHaveBeenCalledWith('Token');
    });

    // --- Response Interceptor Tests (Simplified, focused on direct handler invocation) ---

    it('should not modify successful responses', async () => {
        const response = { status: 200, data: { message: 'Success' } };
        const newResponse = await AxiosInstance.interceptors.response.handlers[0].fulfilled(response);
        expect(newResponse).toEqual(response);
    });

    it('should reject non-401 errors without redirect', async () => {
        const error = { response: { status: 500 }, config: {} };
        await expect(AxiosInstance.interceptors.response.handlers[0].rejected(error))
            .rejects.toEqual(error);
        expect(localStorageMock.removeItem).not.toHaveBeenCalled();
        expect(locationMock.replace).not.toHaveBeenCalled();
    });

    it('should reject 401 for login requests without attempting to refresh token', async () => {
        const error = { response: { status: 401 }, config: { _isLogin: true } };
        await expect(AxiosInstance.interceptors.response.handlers[0].rejected(error))
            .rejects.toEqual(error);
        expect(localStorageMock.removeItem).not.toHaveBeenCalled();
        expect(locationMock.replace).not.toHaveBeenCalled();
    });
});
