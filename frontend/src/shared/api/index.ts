// API клиент
export { apiClient, markAsLoginRequest } from './api-client';
export { default as AxiosInstance } from './api-client'; // Обратная совместимость

// Типы
export type {
    ApiResponse,
    ApiError,
    ApiErrorDetail,
    PaginatedResponse,
    AuthTokens,
    ExtendedRequestConfig,
    QueueItem,
    ApiMethod,
    ApiRequestConfig,
    AxiosError,
    AxiosResponse,
} from './types';

export { getErrorMessage, isAxiosError } from './types';

