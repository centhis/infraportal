# Взаимодействие с API

## Централизованный API-клиент

Все API-запросы проходят через `src/shared/api/api-client.ts` — настроенный экземпляр Axios.

### Конфигурация

```typescript
// src/shared/api/api-client.ts
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 5000,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});
```

### Request Interceptor

Автоматически добавляет `Authorization: Bearer <token>`:

```typescript
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

### Response Interceptor — Auto-Refresh Token

При получении `401 Unauthorized`:
1. Запрос "замораживается"
2. Выполняется `/api/v1/auth/refresh` для обновления токена
3. Исходный запрос повторяется с новым токеном
4. При неудаче — редирект на `/login`

---

## API-модули

Каждый модуль имеет свой API-слой в `modules/[domain]/api/`:

```
src/modules/users/api/
├── users.api.ts      # usersApi.list(), create(), update(), delete()
├── roles.api.ts      # rolesApi.list(), create(), ...
├── groups.api.ts     # groupsApi.list(), create(), ...
└── users.dto.ts      # User, Role, Group типы (зеркало Pydantic)
```

### Пример API-модуля

```typescript
// src/modules/users/api/users.api.ts
import { apiClient } from '@shared/api/api-client';
import { API_ENDPOINTS } from '@shared/constants/apiEndpoints';
import type { User, CreateUserRequest, UpdateUserRequest } from './users.dto';

export const usersApi = {
    list: async (params?: PaginationParams) => {
        const { data } = await apiClient.get<PaginatedResponse<User>>(
            API_ENDPOINTS.USER_MANAGEMENT.USERS,
            { params }
        );
        return data;
    },
    
    create: async (userData: CreateUserRequest) => {
        const { data } = await apiClient.post<User>(
            API_ENDPOINTS.USER_MANAGEMENT.USERS,
            userData
        );
        return data;
    },
    
    update: async (id: number, userData: UpdateUserRequest) => {
        // Трансформация: groups → group_ids для бэкенда
        const payload = { ...userData };
        if (payload.groups) {
            payload.group_ids = payload.groups;
            delete payload.groups;
        }
        const { data } = await apiClient.put<User>(
            `${API_ENDPOINTS.USER_MANAGEMENT.USERS}/${id}`,
            payload
        );
        return data;
    },
    
    delete: async (id: number) => {
        await apiClient.delete(`${API_ENDPOINTS.USER_MANAGEMENT.USERS}/${id}`);
    },
};
```

---

## TanStack Query Hooks

API-вызовы обёрнуты в TanStack Query хуки:

```typescript
// src/modules/users/ui/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api/users.api';

export function useUsers(params?: PaginationParams) {
    return useQuery({
        queryKey: ['users', params],
        queryFn: () => usersApi.list(params),
    });
}

export function useCreateUser() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: usersApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) =>
            usersApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}
```

### Использование в компонентах

```tsx
function UserListContainer() {
    const { data, isLoading, error } = useUsers();
    const createMutation = useCreateUser();
    
    if (isLoading) return <CircularProgress />;
    if (error) return <Alert severity="error">{error.message}</Alert>;
    
    return (
        <UserTable 
            users={data.items} 
            onAdd={(user) => createMutation.mutate(user)}
        />
    );
}
```

---

## DTO (Data Transfer Objects)

Типы зеркалят Pydantic-схемы бэкенда:

```typescript
// src/modules/users/api/users.dto.ts
export interface User {
    id: number;
    login: string;
    name: string;
    is_active: boolean;
    auth_type: 'local' | 'ldap';
    groups: Group[];
    created_at: string;
}

export interface CreateUserRequest {
    login: string;
    name: string;
    password: string;
    group_ids?: number[];
}

export interface UpdateUserRequest {
    name?: string;
    password?: string;
    is_active?: boolean;
    groups?: number[];  // Трансформируется в group_ids при отправке
}
```

---

## Константы API

```typescript
// src/shared/constants/apiEndpoints.ts
export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh',
        PROFILE: '/auth/me',
    },
    USER_MANAGEMENT: {
        USERS: '/users',
        ROLES: '/roles',
        GROUPS: '/groups',
        PERMISSIONS: '/permissions',
    },
    SETTINGS: {
        CORE: '/settings/core',
        LDAP: '/settings/ldap',
    },
};
```
