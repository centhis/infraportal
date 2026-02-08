import type { ComponentType, LazyExoticComponent } from 'react';

/**
 * Конфигурация маршрута
 */
export interface RouteConfig {
    /** Путь маршрута */
    path: string;
    /** Компонент страницы (lazy или eager) */
    element: ComponentType | LazyExoticComponent<ComponentType>;
    /** Требуется авторизация */
    protected?: boolean;
    /** Требуемые права доступа (любое из списка) */
    permissions?: string[];
    /** Требуются все права из списка */
    permissionsAll?: string[];
    /** Показывать в Navbar */
    showInNavbar?: boolean;
    /** Название для Navbar / breadcrumbs */
    title?: string;
    /** Иконка для Navbar (MUI icon component) */
    icon?: ComponentType;
    /** Вложенные маршруты */
    children?: RouteConfig[];
    /** Использовать layout с Navbar */
    withNavbar?: boolean;
    /** Редирект при загрузке (для index routes) */
    index?: boolean;
    /** Редирект */
    redirectTo?: string;
}

/**
 * Конфигурация модуля маршрутов
 */
export interface ModuleRoutesConfig {
    /** Базовый путь модуля */
    basePath?: string;
    /** Маршруты модуля */
    routes: RouteConfig[];
}
