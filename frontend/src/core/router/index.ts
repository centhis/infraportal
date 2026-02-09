// Типы
export type { RouteConfig, ModuleRoutesConfig } from './types';

// Компоненты
export { ProtectedRoute, type ProtectedRouteProps } from './ProtectedRoute';
export { RouterProvider, type RouterProviderProps } from './RouterProvider';

// Конфигурация
export {
    registerModuleRoutes,
    getRegisteredRoutes,
    getNavbarRoutes,
    resetRouteRegistry,
} from './routes.config';

