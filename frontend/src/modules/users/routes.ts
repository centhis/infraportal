import type { RouteConfig } from '@core/router';
import { UserManagementPage } from './ui/pages/UserManagementPage';

/**
 * Маршруты модуля Users
 */
export const usersRoutes: RouteConfig[] = [
    {
        path: '/user_management',
        element: UserManagementPage,
        protected: true,
        showInNavbar: true,
        title: 'User Management',
        permissions: ['users:view'],
    },
];
