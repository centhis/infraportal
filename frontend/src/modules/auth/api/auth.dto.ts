/**
 * Auth DTO (Data Transfer Objects)
 * Зеркало Pydantic-схем backend/app/auth
 */

// ============================================================================
// Типы запросов
// ============================================================================

export interface LoginRequest {
    login: string;
    password: string;
}

// ============================================================================
// Типы ответов
// ============================================================================

export interface LoginResponse {
    access_token: string;
    token_type: string;
    permissions: string[];
}

export interface CurrentUser {
    id: number;
    login: string;
    name: string;
    is_active: boolean;
    type: 'local' | 'ldap';
    permissions: string[];
}

export interface UserPermissions {
    permissions: string[];
}
