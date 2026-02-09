import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { usePermissions } from '@core/auth';
import { ROUTES } from '@shared/constants/routes';

interface PermissionGuardProps {
    permissions?: string[];
    children?: React.ReactNode;
    redirectTo?: string;
}

export const PermissionGuard = ({ permissions, children, redirectTo = ROUTES.HOME }: PermissionGuardProps) => {
    const { can, loading } = usePermissions();

    if (loading) {
        return null; // Или спиннер
    }

    if (!permissions || permissions.length === 0) {
        return <>{children || <Outlet />}</>;
    }

    const hasPermission = can(permissions);

    if (!hasPermission) {
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children || <Outlet />}</>;
};
