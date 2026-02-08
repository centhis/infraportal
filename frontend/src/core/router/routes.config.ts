import type { RouteConfig, ModuleRoutesConfig } from './types';

/**
 * Глобальная конфигурация маршрутов.
 * Маршруты из модулей регистрируются через registerModuleRoutes().
 */
const routeRegistry: RouteConfig[] = [];

/**
 * Регистрация маршрутов модуля.
 * Вызывается из index.ts каждого модуля.
 */
export function registerModuleRoutes(config: ModuleRoutesConfig): void {
    const { basePath = '', routes } = config;

    const prefixedRoutes = routes.map((route) => ({
        ...route,
        path: basePath ? `${basePath}${route.path}` : route.path,
    }));

    routeRegistry.push(...prefixedRoutes);
}

/**
 * Получение всех зарегистрированных маршрутов.
 */
export function getRegisteredRoutes(): RouteConfig[] {
    return [...routeRegistry];
}

/**
 * Получение маршрутов для Navbar.
 */
export function getNavbarRoutes(): RouteConfig[] {
    return routeRegistry.filter((route) => route.showInNavbar);
}

/**
 * Сброс реестра (для тестов).
 */
export function resetRouteRegistry(): void {
    routeRegistry.length = 0;
}
