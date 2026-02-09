import type { ReactNode } from 'react';
import { usePermissionsStore } from './permissions.store';

export interface CanProps {
    /** Требуемое право или массив прав (OR логика) */
    do: string | string[];
    /** Элемент при наличии прав */
    children: ReactNode;
    /** Элемент при отсутствии прав */
    fallback?: ReactNode;
    /** Использовать AND логику для массива прав */
    all?: boolean;
}

/**
 * Компонент для условного рендеринга на основе прав.
 * 
 * @example
 * <Can do="users.create">
 *   <Button>Создать пользователя</Button>
 * </Can>
 * 
 * @example
 * <Can do={['users.edit', 'users.delete']} fallback={<span>Нет доступа</span>}>
 *   <ActionButtons />
 * </Can>
 * 
 * @example
 * <Can do={['admin.access', 'settings.edit']} all>
 *   <AdminSettings />
 * </Can>
 */
export function Can({ do: requiredPermissions, children, fallback = null, all = false }: CanProps) {
    const { permissions, loading } = usePermissionsStore();

    if (loading) {
        return null;
    }

    const check = (): boolean => {
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        if (typeof requiredPermissions === 'string') {
            return permissions.includes(requiredPermissions);
        }

        if (all) {
            return requiredPermissions.every((p) => permissions.includes(p));
        }

        return requiredPermissions.some((p) => permissions.includes(p));
    };

    return check() ? <>{children}</> : <>{fallback}</>;
}
