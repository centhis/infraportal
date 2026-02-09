import type { RouteConfig } from '@core/router';
import { SettingsPage } from './ui/pages/SettingsPage';

/**
 * Маршруты модуля Settings
 */
export const settingsRoutes: RouteConfig[] = [
    {
        path: '/settings',
        element: SettingsPage,
        protected: true,
        showInNavbar: true,
        title: 'Settings',
        permissions: ['settings:view'],
    },
];
