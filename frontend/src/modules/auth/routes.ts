import type { RouteConfig } from '@core/router';
import { LoginPage } from './ui/pages/LoginPage';

/**
 * Маршруты модуля Auth
 */
export const authRoutes: RouteConfig[] = [
    {
        path: '/',
        element: LoginPage,
        protected: false,
        title: 'Login',
    },
];
