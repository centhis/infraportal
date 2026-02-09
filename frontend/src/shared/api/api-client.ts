import axios, { type AxiosInstance, type AxiosError, type AxiosResponse } from 'axios';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { ROUTES } from '../constants/routes';
import type { AuthTokens, ExtendedRequestConfig, QueueItem, ApiError } from './types';

const baseURL = import.meta.env['VITE_API_URL'] as string;

/**
 * Типизированный API клиент с автоматическим refresh токенов
 */
const apiClient: AxiosInstance = axios.create({
    baseURL,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
    withCredentials: true,
});

// ============================================================================
// Перехватчик запросов
// ============================================================================

apiClient.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem('Token');
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// ============================================================================
// Перехватчик ответов (логика обновления токена)
// ============================================================================

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: AxiosError | null, token: string | null = null): void => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else if (token) {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as ExtendedRequestConfig | undefined;

        if (!originalRequest) {
            return Promise.reject(error);
        }

        // Обработка 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Не перехватываем login запросы
            if (originalRequest._isLogin) {
                return Promise.reject(error);
            }

            // Если уже идёт refresh — добавляем в очередь
            if (isRefreshing) {
                return new Promise<string>((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return apiClient(originalRequest);
                    })
                    .catch((err: AxiosError) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const response = await axios.get<AuthTokens>(
                    `${baseURL}${API_ENDPOINTS.AUTH.REFRESH}`,
                    { withCredentials: true }
                );

                const newAccessToken = response.data.access_token;
                localStorage.setItem('Token', newAccessToken);
                apiClient.defaults.headers['Authorization'] = `Bearer ${newAccessToken}`;

                processQueue(null, newAccessToken);
                return apiClient(originalRequest);
            } catch (err) {
                const axiosErr = err as AxiosError;
                processQueue(axiosErr, null);
                localStorage.removeItem('Token');

                if (window.location.pathname !== ROUTES.LOGIN) {
                    window.location.href = ROUTES.LOGIN;
                }
                return Promise.reject(axiosErr);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// ============================================================================
// Вспомогательные методы
// ============================================================================

/**
 * Маркирует запрос как login (не будет retry на 401)
 */
export function markAsLoginRequest(config: ExtendedRequestConfig): ExtendedRequestConfig {
    config._isLogin = true;
    return config;
}

/**
 * API клиент по умолчанию
 */
export default apiClient;

/**
 * Named export для явного импорта
 */
export { apiClient };
