import type { RouteConfig } from '@core/router';
import { HomePage } from './ui/pages/HomePage';
import { AboutPage } from './ui/pages/AboutPage';

/**
 * Маршруты модуля Content
 */
export const contentRoutes: RouteConfig[] = [
    {
        path: '/home',
        element: HomePage,
        protected: true,
        showInNavbar: true,
        title: 'Home',
    },
    {
        path: '/about',
        element: AboutPage,
        protected: true,
        showInNavbar: true,
        title: 'About',
    },
];
