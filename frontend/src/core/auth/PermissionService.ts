import { getPermissionsState } from './permissions.store';

/**
 * Сервис для проверки прав доступа.
 * Может использоваться как в React-компонентах, так и в обычных функциях.
 */
export class PermissionService {
    /**
     * Проверяет наличие права.
     */
    static has(permission: string): boolean {
        const { permissions, loading } = getPermissionsState();
        if (loading) return false;
        return permissions.includes(permission);
    }

    /**
     * Проверяет наличие хотя бы одного права из списка (OR).
     */
    static can(requiredPermissions: string | string[]): boolean {
        const { permissions, loading } = getPermissionsState();
        if (loading) return false;

        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        if (typeof requiredPermissions === 'string') {
            return permissions.includes(requiredPermissions);
        }

        return requiredPermissions.some((p) => permissions.includes(p));
    }

    /**
     * Проверяет наличие хотя бы одного права из списка.
     * Алиас для can().
     */
    static canAny(requiredPermissions: string[]): boolean {
        return PermissionService.can(requiredPermissions);
    }

    /**
     * Проверяет наличие всех прав из списка (AND).
     */
    static canAll(requiredPermissions: string[]): boolean {
        const { permissions, loading } = getPermissionsState();
        if (loading) return false;

        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        return requiredPermissions.every((p) => permissions.includes(p));
    }

    /**
     * Возвращает список всех прав текущего пользователя.
     */
    static getPermissions(): string[] {
        return getPermissionsState().permissions;
    }

    /**
     * Проверяет, загружаются ли права.
     */
    static isLoading(): boolean {
        return getPermissionsState().loading;
    }
}

// Экспортируем функции для удобства (без необходимости обращаться к классу)
export const can = PermissionService.can;
export const canAny = PermissionService.canAny;
export const canAll = PermissionService.canAll;
export const hasPermission = PermissionService.has;
