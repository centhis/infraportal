/**
 * Users DTO (Data Transfer Objects)
 * Зеркало Pydantic-схем backend/app/users
 */

import type { PaginatedResponse } from '../../../types';

// ============================================================================
// Разрешение
// ============================================================================

export interface Permission {
    id: number;
    name: string;
    description: string | null;
    built_in: boolean;
    created_at: string;
}

export interface PermissionCreate {
    name: string;
    description?: string;
}

// ============================================================================
// Роль
// ============================================================================

export interface Role {
    id: number;
    name: string;
    description: string | null;
    built_in: boolean;
    created_at: string;
    permissions: Permission[];
    built_in_permission_ids?: number[];
}

export interface RoleCreate {
    name: string;
    description?: string;
    permissions?: number[];
}

export interface RoleUpdate {
    name?: string | undefined;
    description?: string | undefined;
    permissions?: number[] | undefined;
}

// ============================================================================
// Группа
// ============================================================================

export interface Group {
    id: number;
    name: string;
    description: string | null;
    built_in: boolean;
    created_at: string;
    roles: Role[];
    users: User[];
    built_in_role_ids?: number[];
    built_in_user_ids?: number[];
}

export interface GroupCreate {
    name: string;
    description?: string;
    roles?: number[];
    users?: number[];
}

export interface GroupUpdate {
    name?: string | undefined;
    description?: string | undefined;
    roles?: number[] | undefined;
    users?: number[] | undefined;
}

// ============================================================================
// Пользователь
// ============================================================================

export type UserType = 'local' | 'ldap' | 'built_in';

export interface User {
    id: number;
    login: string;
    name: string;
    is_active: boolean;
    type: UserType;
    ldap_id: string | null;
    ldap_dn: string | null;
    created_at: string;
    groups: Group[];
}

export interface UserCreate {
    login: string;
    password: string;
    name: string;
    is_active?: boolean;
    group_ids?: number[];
}

export interface UserUpdate {
    login?: string | undefined;
    password?: string | undefined;
    name?: string | undefined;
    is_active?: boolean | undefined;
    group_ids?: number[] | undefined;
}

// ============================================================================
// Отчёт о разрешениях
// ============================================================================

export interface PermissionsReport {
    user_id: number;
    username: string;
    all_unique_permissions: Permission[];
    groups_with_roles_and_permissions: Group[];
}

// ============================================================================
// Параметры списка
// ============================================================================

export interface UsersListParams {
    page?: number;
    size?: number;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    // Фильтры
    login?: string;
    name?: string;
    type?: UserType;
    is_active?: boolean;
    created_at_from?: string;
    created_at_to?: string;
}

export interface RolesListParams {
    page?: number;
    size?: number;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    // Фильтры
    name?: string;
    built_in?: boolean;
    created_at_from?: string;
    created_at_to?: string;
}

export interface GroupsListParams {
    page?: number;
    size?: number;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    // Фильтры
    name?: string;
    built_in?: boolean;
    created_at_from?: string;
    created_at_to?: string;
}

// ============================================================================
// Пагинированные ответы
// ============================================================================

export type UsersPaginatedResponse = PaginatedResponse<User>;
export type RolesPaginatedResponse = PaginatedResponse<Role>;
export type GroupsPaginatedResponse = PaginatedResponse<Group>;
export type PermissionsPaginatedResponse = PaginatedResponse<Permission>;
