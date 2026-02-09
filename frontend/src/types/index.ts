/**
 * Центральный хаб типов
 * Реэкспорт API типов для удобства
 */

// API типы
export type {
    // Пагинация
    PaginatedResponse,
    PaginationParams,
    // Ответ и ошибка
    ApiResponse,
    ApiError,
    ApiErrorDetail,
    // Сортировка и фильтрация
    SortDirection,
    SortParams,
    FilterParams,
    ListParams,
    // Аутентификация
    LoginRequest,
    LoginResponse,
    RefreshResponse,
} from './api';

// Сущности реэкспортируются из модулей напрямую
// Используйте: import type { User, Role, ... } from '@modules/users/api/users.dto';

// Настройки реэкспортируются из модулей напрямую
// Используйте: import type { CoreSetting, ... } from '@modules/settings/api/settings.dto';
