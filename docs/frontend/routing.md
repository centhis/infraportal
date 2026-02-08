# Маршрутизация

## Структура роутера

Маршрутизация реализована на React Router 6 с централизованной конфигурацией.

```
src/core/router/
├── RouterProvider.tsx    # Провайдер с маршрутами
├── ProtectedRoute.tsx    # Защита аутентификацией
└── routes.ts             # Конфигурация маршрутов
```

---

## Конфигурация маршрутов

```typescript
// src/core/router/RouterProvider.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
    // Публичные
    { path: '/login', element: <LoginPage /> },
    
    // Защищённые
    {
        path: '/',
        element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
        children: [
            { index: true, element: <HomePage /> },
            { path: 'users/*', element: <UserManagementPage /> },
            { path: 'settings/*', element: <SettingsPage /> },
            { path: 'about', element: <AboutPage /> },
        ],
    },
    
    // 404
    { path: '*', element: <NotFoundPage /> },
]);

export function AppRouterProvider() {
    return <RouterProvider router={router} />;
}
```

---

## Модульные маршруты

Каждый модуль экспортирует свои маршруты:

```typescript
// src/modules/users/routes.ts
import { RouteObject } from 'react-router-dom';
import { UserManagementPage } from './ui/pages/UserManagementPage';

export const usersRoutes: RouteObject[] = [
    { path: 'users', element: <UserManagementPage /> },
    { path: 'users/:id', element: <UserDetailPage /> },
];
```

---

## Защищённые маршруты

### ProtectedRoute

```tsx
// src/core/router/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@core/providers/AuthProvider';

interface ProtectedRouteProps {
    children: ReactNode;
    requiredPermission?: string;
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
    const { isAuthenticated } = useAuth();
    const { hasPermission } = usePermissionsStore();
    const location = useLocation();
    
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    if (requiredPermission && !hasPermission(requiredPermission)) {
        return <Navigate to="/403" replace />;
    }
    
    return <>{children}</>;
}
```

### Использование

```tsx
// Только аутентификация
<ProtectedRoute>
    <HomePage />
</ProtectedRoute>

// С проверкой прав
<ProtectedRoute requiredPermission="users:manage">
    <UserManagementPage />
</ProtectedRoute>
```

---

## Константы маршрутов

```typescript
// src/shared/constants/routes.ts
export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    USERS: '/users',
    SETTINGS: '/settings',
    SETTINGS_CORE: '/settings/core',
    SETTINGS_LDAP: '/settings/ldap',
    ABOUT: '/about',
};
```

---

## Навигация

### Программная навигация

```tsx
import { useNavigate } from 'react-router-dom';

function LoginForm() {
    const navigate = useNavigate();
    
    const onSuccess = () => {
        navigate(ROUTES.HOME);
    };
}
```

### Ссылки

```tsx
import { Link, NavLink } from 'react-router-dom';

<Link to={ROUTES.USERS}>Пользователи</Link>

// NavLink для активного состояния
<NavLink 
    to={ROUTES.USERS}
    className={({ isActive }) => isActive ? 'active' : ''}
>
    Пользователи
</NavLink>
```

---

## Параметры маршрута

```tsx
// Определение
{ path: 'users/:userId', element: <UserDetailPage /> }

// Использование
import { useParams } from 'react-router-dom';

function UserDetailPage() {
    const { userId } = useParams<{ userId: string }>();
    const { data } = useUser(Number(userId));
}
```

---

## Вложенные маршруты

```tsx
// Родитель с Outlet
function UserManagementPage() {
    return (
        <div>
            <Tabs>
                <Tab label="Пользователи" to="users" />
                <Tab label="Роли" to="roles" />
            </Tabs>
            <Outlet />  {/* Рендерит дочерний маршрут */}
        </div>
    );
}

// Конфигурация
{
    path: 'management',
    element: <UserManagementPage />,
    children: [
        { path: 'users', element: <UsersTab /> },
        { path: 'roles', element: <RolesTab /> },
    ],
}
```
