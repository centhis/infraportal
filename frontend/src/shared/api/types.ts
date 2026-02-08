import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

/**
 * Стандартный ответ API
 */
export interface ApiResponse<T> {
    data: T;
    status: number;
    message?: string;
}

/**
 * Структура ошибки API (согласно бэкенду)
 */
export interface ApiErrorDetail {
    loc?: (string | number)[];
    msg: string;
    type?: string;
}

export interface ApiError {
    detail: string | ApiErrorDetail[];
    status?: number;
}

/**
 * Пагинированный ответ
 */
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
    pages: number;
}

/**
 * Токен авторизации
 */
export interface AuthTokens {
    access_token: string;
    token_type: string;
}

/**
 * Расширенная конфигурация запроса для retry логики
 */
export interface ExtendedRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
    _isLogin?: boolean;
}

/**
 * Тип для очереди отложенных запросов
 */
export interface QueueItem {
    resolve: (token: string) => void;
    reject: (error: AxiosError) => void;
}

/**
 * Хелпер для извлечения сообщения ошибки
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        const axiosError = error as AxiosError<ApiError>;
        const detail = axiosError.response?.data?.detail;

        if (typeof detail === 'string') {
            return detail;
        }

        if (Array.isArray(detail) && detail.length > 0) {
            return detail.map((d) => d.msg).join(', ');
        }

        return axiosError.message || 'Неизвестная ошибка';
    }

    return 'Неизвестная ошибка';
}

/**
 * Type guard для проверки AxiosError
 */
export function isAxiosError<T = ApiError>(error: unknown): error is AxiosError<T> {
    return (error as AxiosError).isAxiosError === true;
}

/**
 * Типы для generic API методов
 */
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiRequestConfig = {
    method: ApiMethod;
    url: string;
    data?: unknown;
    params?: Record<string, unknown>;
};

// Ре-экспорт типов axios для удобства
export type { AxiosError, AxiosResponse, InternalAxiosRequestConfig };
