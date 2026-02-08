// Экспорт API
export { authApi } from './api/auth.api';
export type { LoginRequest, LoginResponse, CurrentUser, UserPermissions } from './api/auth.dto';

// Стор
export { useAuthStore, getAuthState, isAuthenticated } from './store/auth.store';
export type { AuthState, AuthActions, AuthStore } from './store/auth.store';

// Сервисы
export { AuthService, login, logout, initializeAuth } from './services/AuthService';

// Хуки
export { useAuth } from './ui/hooks/useAuth';

// Страницы
export { LoginPage } from './ui/pages/LoginPage';

// Маршруты
export { authRoutes } from './routes';

