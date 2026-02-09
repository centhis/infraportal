import { Suspense, type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import type { RouteConfig } from './types';

export interface RouterProviderProps {
    /** Конфигурация маршрутов */
    routes: RouteConfig[];
    /** Компонент Layout с Navbar */
    navbarLayout?: ReactNode;
    /** Fallback для Suspense (lazy loading) */
    fallback?: ReactNode;
    /** Маршрут по умолчанию для неавторизованных */
    defaultPublicRoute?: string;
    /** Маршрут по умолчанию для авторизованных */
    defaultProtectedRoute?: string;
}

import { PermissionGuard } from './PermissionGuard';

/**
 * Генерирует Route элементы из конфигурации.
 */
function generateRouteElement(route: RouteConfig, fallback: ReactNode): ReactNode {
    const Component = route.element;

    let element = (
        <Suspense fallback={fallback}>
            <Component />
        </Suspense>
    );

    if (route.permissions && route.permissions.length > 0) {
        element = (
            <PermissionGuard permissions={route.permissions}>
                {element}
            </PermissionGuard>
        );
    }

    return element;
}

/**
 * Рекурсивно генерирует Routes из конфигурации.
 */
function renderRoutes(routes: RouteConfig[], fallback: ReactNode): ReactNode[] {
    return routes.map((route) => {
        // Редирект
        if (route.redirectTo) {
            return (
                <Route
                    key={route.path}
                    path={route.path}
                    element={<Navigate to={route.redirectTo} replace />}
                />
            );
        }

        // Маршрут с детьми
        if (route.children && route.children.length > 0) {
            return (
                <Route
                    key={route.path}
                    path={route.path}
                    element={generateRouteElement(route, fallback)}
                >
                    {renderRoutes(route.children, fallback)}
                </Route>
            );
        }

        // Обычный маршрут
        return (
            <Route
                key={route.path}
                path={route.path}
                element={generateRouteElement(route, fallback)}
            />
        );
    });
}

/**
 * Провайдер маршрутов с авто-генерацией из конфигурации.
 */
export function RouterProvider({
    routes,
    navbarLayout,
    fallback = null,
    defaultPublicRoute = '/',
    defaultProtectedRoute = '/home',
}: RouterProviderProps) {
    const publicRoutes = routes.filter((r) => !r.protected);
    const protectedRoutes = routes.filter((r) => r.protected);

    return (
        <Routes>
            {/* Публичные маршруты */}
            {renderRoutes(publicRoutes, fallback)}

            {/* Защищённые маршруты */}
            <Route element={<ProtectedRoute redirectTo={defaultPublicRoute} />}>
                {navbarLayout ? (
                    <Route element={navbarLayout}>
                        {renderRoutes(protectedRoutes, fallback)}
                        <Route path="*" element={<Navigate to={defaultProtectedRoute} replace />} />
                    </Route>
                ) : (
                    <>
                        {renderRoutes(protectedRoutes, fallback)}
                        <Route path="*" element={<Navigate to={defaultProtectedRoute} replace />} />
                    </>
                )}
            </Route>
        </Routes>
    );
}
