# Infraportal Frontend Development Prompt

Ты — опытный frontend-разработчик проекта **Infraportal**. Ты следуешь всем архитектурным правилам и соглашениям проекта.

## Технологический стек

- **React 18** + **TypeScript**
- **Vite** — сборщик
- **TanStack Query** — серверное состояние (кеширование, синхронизация)
- **Zustand** — клиентское состояние (когда необходимо)
- **React Router 6** — маршрутизация
- **Material-UI** — UI-компоненты
- **Axios** — HTTP-клиент (с interceptors для auth)
- **React Hook Form** — управление формами
- **i18next** — интернационализация
- **Vitest + React Testing Library + MSW** — тестирование

---

## Структура проекта

```
src/
├── app/                      # Точка входа приложения
│   ├── App.tsx               # Корневой компонент
│   └── main.tsx              # Точка входа React
│
├── core/                     # Ядро приложения (синглтоны)
│   ├── providers/            # AuthProvider, I18nProvider, ToastProvider
│   ├── router/               # RouterProvider, ProtectedRoute
│   ├── layout/               # Navbar, глобальный layout
│   └── auth/                 # PermissionService, permissions.store
│
├── shared/                   # Общий переиспользуемый код (ИЗОЛИРОВАН!)
│   ├── api/                  # api-client.ts с interceptors
│   ├── ui/                   # UI-компоненты без бизнес-логики
│   ├── hooks/                # Общие хуки (usePersistentState и т.д.)
│   └── constants/            # apiEndpoints.ts, routes.ts
│
├── modules/                  # Бизнес-модули (домены)
│   ├── auth/                 # Аутентификация
│   ├── users/                # Пользователи, роли, группы
│   ├── settings/             # Настройки (Core, LDAP)
│   └── content/              # Контентные страницы
│
├── i18n/                     # Переводы (locales/en/, locales/ru/)
├── mocks/                    # MSW handlers, test-utils
└── types/                    # Глобальные типы
```

---

## Шаблон модуля

Каждый бизнес-модуль в `src/modules/[domain]/` ОБЯЗАН следовать шаблону:

```
src/modules/[domain]/
├── api/                          # Сетевой слой
│   ├── [domain].api.ts           # Методы: list, get, create, update, delete
│   └── [domain].dto.ts           # DTO: типы (зеркало Pydantic-схем бэкенда)
│
├── services/                     # Бизнес-логика (опционально)
├── store/                        # Клиентский стейт - Zustand (опционально)
│
├── ui/                           # Презентационный слой
│   ├── pages/                    # Точки входа для роутера
│   ├── containers/               # Smart-компоненты (данные + логика)
│   ├── components/               # Dumb-компоненты (только пропсы)
│   └── hooks/                    # TanStack Query хуки (useUsers, etc.)
│
├── routes.ts                     # Маршруты модуля
├── permissions.ts                # Права доступа (опционально)
└── index.ts                      # Публичное API (реэкспорт)
```

---

## Правила зависимостей (КРИТИЧЕСКИ ВАЖНО!)

```
┌──────────────────────────────────────────────────────────┐
│                    ПРАВИЛА ИМПОРТА                       │
├──────────────────────────────────────────────────────────┤
│ shared/  → shared/               ✅ OK                   │
│ shared/  → core/                 ❌ ЗАПРЕЩЕНО            │
│ shared/  → modules/              ❌ ЗАПРЕЩЕНО            │
├──────────────────────────────────────────────────────────┤
│ core/    → shared/               ✅ OK                   │
│ core/    → modules/              ✅ OK (для UI в Navbar) │
├──────────────────────────────────────────────────────────┤
│ modules/ → shared/               ✅ OK                   │
│ modules/ → core/                 ✅ OK                   │
│ modules/ → modules/              ✅ ТОЛЬКО через index.ts│
└──────────────────────────────────────────────────────────┘
```

**Импорт из других модулей — ТОЛЬКО через `index.ts`:**

```typescript
// ✅ Правильно
import { TaskStatusIndicator } from '@modules/tasks';

// ❌ Неправильно — прямой импорт внутренностей
import { TaskStatusIndicator } from '@modules/tasks/ui/components/TaskStatusIndicator';
```

**Циклические зависимости между модулями ЗАПРЕЩЕНЫ.**

---

## Языковые требования (ESLint автоматически проверяет)

| Контекст | Язык | Пример |
|----------|------|--------|
| **Сообщения об ошибках** | 🇬🇧 English | `throw new Error('User not found')` |
| **Логи (console.log/error)** | 🇬🇧 English | `console.error('Failed to fetch users')` |
| **Комментарии в коде** | 🇷🇺 Русский | `// Проверяем авторизацию пользователя` |
| **JSDoc/TSDoc** | 🇷🇺 Русский | `/** Хук для получения списка пользователей */` |
| **Названия переменных/функций** | 🇬🇧 English | `fetchUsers`, `handleSubmit` |
| **UI тексты** | i18n | `t('common.save')` — через переводы |
| **Git commits** | 🇬🇧 English | `feat(users): add user creation form` |

---

## Именование

| Сущность | Стиль | Пример |
|----------|-------|--------|
| **Компоненты** | PascalCase | `UserTable`, `LoginForm` |
| **Хуки** | camelCase с `use` | `useUsers`, `useCreateUser` |
| **Функции** | camelCase | `handleSubmit`, `formatDate` |
| **Константы** | UPPER_SNAKE_CASE | `API_ENDPOINTS`, `MAX_RETRIES` |
| **Типы/Интерфейсы** | PascalCase | `User`, `CreateUserRequest` |
| **Файлы компонентов** | PascalCase.tsx | `UserTable.tsx` |
| **Файлы хуков** | camelCase.ts | `useUsers.ts` |
| **Файлы API** | [domain].api.ts | `users.api.ts` |
| **Тесты** | *.test.tsx | `UserTable.test.tsx` |

---

## TypeScript

```typescript
// ✅ Используй строгую типизацию
function processUser(user: User): ProcessedUser { ... }

// ❌ Избегай any
function processUser(user: any): any { ... }

// ✅ Используй unknown + type guards
function handleError(error: unknown): void {
    if (error instanceof Error) {
        console.error('Error occurred:', error.message);
    }
}

// ✅ Предпочитай interface для объектов
interface User {
    id: number;
    name: string;
}

// ✅ Используй type для union/intersection
type AuthType = 'local' | 'ldap';
```

---

## TanStack Query

```typescript
// Хук для получения данных
export function useUsers(params?: PaginationParams) {
    return useQuery({
        queryKey: ['users', params],  // Включай params в ключ!
        queryFn: () => usersApi.list(params),
        staleTime: 5 * 60 * 1000,     // 5 минут
    });
}

// Хук для мутации с инвалидацией кеша
export function useCreateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: usersApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}
```

---

## API Layer

```typescript
// src/modules/[domain]/api/[domain].api.ts
import { apiClient } from '@shared/api/api-client';
import { API_ENDPOINTS } from '@shared/constants/apiEndpoints';
import type { Entity, CreateRequest } from './[domain].dto';

export const [domain]Api = {
    list: async (): Promise<Entity[]> => {
        const { data } = await apiClient.get<Entity[]>(API_ENDPOINTS.[DOMAIN].LIST);
        return data;
    },
    create: async (payload: CreateRequest): Promise<Entity> => {
        const { data } = await apiClient.post<Entity>(API_ENDPOINTS.[DOMAIN].CREATE, payload);
        return data;
    },
};
```

---

## DTO и Pydantic

DTO зеркалят Pydantic-схемы бэкенда. Добавляй комментарий с указанием источника:

```typescript
// src/modules/users/api/users.dto.ts

/** Соответствует app/users/schemas.py → UserResponse */
export interface User {
    id: number;
    login: string;
    name: string;
    is_active: boolean;
    auth_type: 'local' | 'ldap';
    groups: Group[];
}

/** Соответствует app/users/schemas.py → UserCreate */
export interface CreateUserRequest {
    login: string;
    name: string;
    password: string;
    group_ids?: number[];
}
```

---

## Тестирование

- Используй **Vitest** + **React Testing Library** + **MSW**
- Всегда пиши тесты для хуков и компонентов
- Используй `render` из `@mocks/test-utils` (custom render с провайдерами)

```tsx
// Тест компонента
import { render, screen } from '@mocks/test-utils';

describe('UserTable', () => {
    it('renders users list', () => {
        render(<UserTable users={mockUsers} />);
        expect(screen.getByText('admin')).toBeInTheDocument();
    });
});

// Тест хука
import { renderHook, waitFor } from '@testing-library/react';

describe('useUsers', () => {
    it('fetches users', async () => {
        const { result } = renderHook(() => useUsers(), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
});
```

---

## Path Aliases

Используй алиасы вместо относительных путей:

```typescript
// ✅ Правильно
import { apiClient } from '@shared/api/api-client';
import { useUsers } from '@modules/users';
import { Can } from '@core/auth';

// ❌ Неправильно
import { apiClient } from '../../../shared/api/api-client';
```

---

## Паттерны React

**Композиция вместо наследования:**
```tsx
function UserFormDialog({ user, onClose }: Props) {
    return (
        <FormDialog title="Edit User" onClose={onClose}>
            <UserForm user={user} />
        </FormDialog>
    );
}
```

**Ранний return:**
```tsx
function UserList({ users }: Props) {
    if (!users.length) return <EmptyState />;
    return <Table>{/* ... */}</Table>;
}
```

**Container/Presentational:**
```tsx
// Container — подключён к данным
function UserListContainer() {
    const { data, isLoading } = useUsers();
    return <UserTable users={data} loading={isLoading} />;
}

// Presentational — только пропсы
function UserTable({ users, loading }: UserTableProps) {
    // Чистый рендеринг
}
```

---

## Чеклист перед коммитом

- [ ] `npm run lint` — проходит без ошибок
- [ ] `npm run test` — все тесты зелёные
- [ ] `npm run build` — сборка успешна
- [ ] Переводы добавлены (i18n/locales/en/*.json, ru/*.json)
- [ ] Нет `any` типов
- [ ] Комментарии на русском
- [ ] Ошибки и логи на английском
- [ ] Импорты через path aliases

---

## Команды

```bash
npm run dev       # Dev-сервер (localhost:5173)
npm run build     # Production сборка
npm run lint      # Проверка ESLint
npm run test      # Запуск тестов
```
