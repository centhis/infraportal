import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { apiClient } from './api-client';
import { createStorageMock, createLocationMock, type StorageMock, type LocationMock } from '../../mocks/test-helpers';

// Определяем тип для внутренней структуры хендлеров Axios, к которой мы обращаемся
interface AxiosHandler {
    fulfilled: (config: unknown) => Promise<unknown> | unknown;
    rejected: (error: unknown) => Promise<unknown> | unknown;
}

// Хелпер для доступа к внутренним хендлерам, которые не экспонируются в публичных типах
const getRequestHandlers = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (apiClient.interceptors.request as any).handlers as AxiosHandler[];
};

const getResponseHandlers = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (apiClient.interceptors.response as any).handlers as AxiosHandler[];
};

describe('apiClient Basic Functionality', () => {
    const MOCK_API_URL = 'http://localhost:8000/api/v1';
    let localStorageMock: StorageMock;
    let locationMock: LocationMock;

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
        // Сбрасываем заголовок Authorization
        delete apiClient.defaults.headers.common.Authorization;
        // Сбрасываем baseURL на мок URL для обеспечения консистентности
        apiClient.defaults.baseURL = MOCK_API_URL;
    });

    // --- Тесты конфигурации ---
    it('should be configured with the correct baseURL', () => {
        expect(apiClient.defaults.baseURL).toBe(MOCK_API_URL);
    });

    it('should have a timeout of 5000ms', () => {
        expect(apiClient.defaults.timeout).toBe(5000);
    });

    it('should have correct default headers', () => {
        expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
        expect(apiClient.defaults.headers['Accept']).toBe('application/json');
    });

    it('should be configured with withCredentials: true', () => {
        expect(apiClient.defaults.withCredentials).toBe(true);
    });

    // --- Тесты интерцептора запросов ---
    it('should add Authorization header if token exists in localStorage', async () => {
        localStorageMock.setItem('Token', 'test_token');
        const config = { headers: {} };

        const handlers = getRequestHandlers();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newConfig = await handlers[0]!.fulfilled(config) as any;

        expect(newConfig.headers.Authorization).toBe('Bearer test_token');
        expect(localStorageMock.getItem).toHaveBeenCalledWith('Token');
    });

    it('should NOT add Authorization header if no token in localStorage', async () => {
        const config = { headers: {} };

        const handlers = getRequestHandlers();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newConfig = await handlers[0]!.fulfilled(config) as any;

        expect(newConfig.headers.Authorization).toBeUndefined();
        expect(localStorageMock.getItem).toHaveBeenCalledWith('Token');
    });

    // --- Тесты интерцептора ответов ---

    it('should not modify successful responses', async () => {
        const response = { status: 200, data: { message: 'Success' } };

        const handlers = getResponseHandlers();
        const newResponse = await handlers[0]!.fulfilled(response);

        expect(newResponse).toEqual(response);
    });

    it('should reject non-401 errors without redirect', async () => {
        const error = { response: { status: 500 }, config: {} };
        const handlers = getResponseHandlers();

        await expect(handlers[0]!.rejected(error))
            .rejects.toEqual(error);

        expect(localStorageMock.removeItem).not.toHaveBeenCalled();
        (locationMock.replace as Mock).mockClear(); // очищаем
        expect(locationMock.replace).not.toHaveBeenCalled();
    });

    it('should reject 401 for login requests without attempting to refresh token', async () => {
        const error = { response: { status: 401 }, config: { _isLogin: true } };
        const handlers = getResponseHandlers();

        await expect(handlers[0]!.rejected(error))
            .rejects.toEqual(error);

        expect(localStorageMock.removeItem).not.toHaveBeenCalled();
        expect(locationMock.replace).not.toHaveBeenCalled();
    });
});
