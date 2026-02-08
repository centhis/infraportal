import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '@shared/constants/routes';

// TODO: Заменить на новый AuthStore после миграции модуля auth

import { useAuthContext } from '../providers/AuthProvider';

export interface ProtectedRouteProps {
    /** Требуемые права (любое из списка) */
    permissions?: string[];
    /** Требуются все права из списка */
    permissionsAll?: string[];
    /** Редирект при отсутствии доступа */
    redirectTo?: string;
}

/**
 * Защищённый маршрут с проверкой авторизации и прав доступа.
 */
export function ProtectedRoute({
    permissions: _permissions,
    permissionsAll: _permissionsAll,
    redirectTo = ROUTES.LOGIN,
}: ProtectedRouteProps) {
    const { user, loading } = useAuthContext() as {
        user: unknown;
        loading: boolean;
    };

    // Показываем пустую страницу пока загружается auth state
    if (loading) {
        return null;
    }

    // Редирект на логин если не авторизован
    if (!user) {
        return <Navigate to={redirectTo} replace />;
    }

    // TODO: Добавить проверку permissions после миграции PermissionService
    // Код проверки:
    // eslint-disable-next-line lang-rules/comments-in-russian
    // if (permissions && !canAny(permissions)) { return <Navigate to="/403" />; }
    // eslint-disable-next-line lang-rules/comments-in-russian
    // if (permissionsAll && !canAll(permissionsAll)) { return <Navigate to="/403" />; }

    return <Outlet />;
}
