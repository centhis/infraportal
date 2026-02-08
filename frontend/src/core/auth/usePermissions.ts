import { usePermissionsStore } from './permissions.store';
import { PermissionService } from './PermissionService';

/**
 * Хук для проверки прав в React-компонентах.
 * 
 * @example
 * const { can, canAll, permissions, loading } = usePermissions();
 * 
 * if (can('users.create')) {
 *   // показать кнопку создания
 * }
 */
export function usePermissions() {
    const { permissions, loading, error } = usePermissionsStore();

    return {
        /** Список всех прав */
        permissions,
        /** Загрузка прав */
        loading,
        /** Ошибка загрузки */
        error,
        /** Проверить наличие права (OR логика для массива) */
        can: (requiredPermissions: string | string[]): boolean => {
            if (loading) return false;

            if (!requiredPermissions || requiredPermissions.length === 0) {
                return true;
            }

            if (typeof requiredPermissions === 'string') {
                return permissions.includes(requiredPermissions);
            }

            return requiredPermissions.some((p) => permissions.includes(p));
        },
        /** Проверить наличие хотя бы одного права */
        canAny: (requiredPermissions: string[]): boolean => {
            if (loading) return false;
            return requiredPermissions.some((p) => permissions.includes(p));
        },
        /** Проверить наличие всех прав (AND логика) */
        canAll: (requiredPermissions: string[]): boolean => {
            if (loading) return false;
            return requiredPermissions.every((p) => permissions.includes(p));
        },
    };
}

// Re-export для удобства
export { PermissionService };
