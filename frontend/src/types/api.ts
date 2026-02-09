/**
 * Типы для API (запросы/ответы)
 */

// ============================================================================
// Пагинация
// ============================================================================

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
    pages: number;
}

export interface PaginationParams {
    page?: number;
    size?: number;
}

// ============================================================================
// API ответ и ошибка
// ============================================================================

export interface ApiResponse<T> {
    data: T;
    status: number;
    message?: string;
}

export interface ApiErrorDetail {
    loc?: (string | number)[];
    msg: string;
    type?: string;
}

export interface ApiError {
    detail: string | ApiErrorDetail[];
    status?: number;
}

// ============================================================================
// Сортировка и фильтрация
// ============================================================================

export type SortDirection = 'asc' | 'desc';

export interface SortParams {
    sort_by?: string;
    sort_dir?: SortDirection;
}

export interface FilterParams {
    search?: string;
    [key: string]: unknown;
}

// ============================================================================
// Общие типы запросов
// ============================================================================

export interface ListParams extends PaginationParams, SortParams, FilterParams { }

// ============================================================================
// Аутентификация
// ============================================================================

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
}

export interface RefreshResponse {
    access_token: string;
    token_type: string;
}
