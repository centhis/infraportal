# Руководство разработчика

Полное руководство для разработчиков frontend Infraportal.

## Содержание

1. [Быстрый старт](#1-быстрый-старт)
2. [Как добавить...](#2-как-добавить)
3. [Стиль кода и соглашения](#3-стиль-кода-и-соглашения)
4. [Архитектурные правила](#4-архитектурные-правила)
5. [Чеклист перед PR](#5-чеклист-перед-pr)

---

## 1. Быстрый старт

### Требования

- Node.js 18+
- npm 9+

### Установка

```bash
cd frontend
npm install
```

### Запуск dev-сервера

```bash
npm run dev
```

Приложение: `http://localhost:5173`

### Запуск тестов

```bash
# Все тесты
npm run test

# Watch mode
npm run test -- --watch

# Покрытие
npm run test -- --coverage
```

### Линтинг

```bash
npm run lint
```

### Сборка

```bash
npm run build
```

### Рекомендуемые расширения VSCode

```json
// .vscode/extensions.json
{
    "recommendations": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "bradlc.vscode-tailwindcss",
        "ms-vscode.vscode-typescript-next"
    ]
}
```

### Структура проекта (обзор)

```
src/
├── app/        # Точка входа
├── core/       # Провайдеры, роутер, layout
├── shared/     # Общие компоненты, API, хуки
├── modules/    # Бизнес-модули (auth, users, settings, ...)
├── i18n/       # Переводы
├── mocks/      # MSW handlers для тестов
└── types/      # Глобальные типы
```

> Подробнее: [Архитектура](architecture.md)

---

## 2. Как добавить...

### 2.1 Новый модуль

**Шаг 1: Создать структуру папок**

```bash
mkdir -p src/modules/[domain]/{api,ui/{pages,components,hooks}}
```

**Шаг 2: Создать API-слой**

```typescript
// src/modules/[domain]/api/[domain].api.ts
import { apiClient } from '@shared/api/api-client';
import { API_ENDPOINTS } from '@shared/constants/apiEndpoints';
import type { Entity, CreateRequest } from './[domain].dto';

export const [domain]Api = {
    list: async () => {
        const { data } = await apiClient.get<Entity[]>(API_ENDPOINTS.[DOMAIN].LIST);
        return data;
    },
    create: async (payload: CreateRequest) => {
        const { data } = await apiClient.post<Entity>(API_ENDPOINTS.[DOMAIN].CREATE, payload);
        return data;
    },
};
```

**Шаг 3: Создать DTO**

```typescript
// src/modules/[domain]/api/[domain].dto.ts

/** Соответствует app/[domain]/schemas.py → EntityResponse */
export interface Entity {
    id: number;
    name: string;
    created_at: string;
}

export interface CreateRequest {
    name: string;
}
```

**Шаг 4: Создать хуки**

```typescript
// src/modules/[domain]/ui/hooks/use[Domain].ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { [domain]Api } from '../../api/[domain].api';

export function use[Domain]s() {
    return useQuery({
        queryKey: ['[domain]s'],
        queryFn: [domain]Api.list,
    });
}

export function useCreate[Domain]() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: [domain]Api.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['[domain]s'] });
        },
    });
}
```

**Шаг 5: Создать страницу**

```tsx
// src/modules/[domain]/ui/pages/[Domain]Page.tsx
import { use[Domain]s } from '../hooks/use[Domain]';

export function [Domain]Page() {
    const { data, isLoading } = use[Domain]s();
    
    if (isLoading) return <CircularProgress />;
    
    return <[Domain]List items={data} />;
}
```

**Шаг 6: Создать маршруты**

```typescript
// src/modules/[domain]/routes.ts
import { RouteObject } from 'react-router-dom';
import { [Domain]Page } from './ui/pages/[Domain]Page';

export const [domain]Routes: RouteObject[] = [
    { path: '[domain]', element: <[Domain]Page /> },
];
```

**Шаг 7: Создать index.ts (публичное API)**

```typescript
// src/modules/[domain]/index.ts
export { [Domain]Page } from './ui/pages/[Domain]Page';
export { use[Domain]s, useCreate[Domain] } from './ui/hooks/use[Domain]';
export { [domain]Routes } from './routes';
export type { Entity } from './api/[domain].dto';
```

**Шаг 8: Зарегистрировать маршрут в RouterProvider**

### 2.2 Новый маршрут

```typescript
// src/core/router/RouterProvider.tsx
import { [domain]Routes } from '@modules/[domain]';

const router = createBrowserRouter([
    // ...
    {
        element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
        children: [
            // Добавить маршруты модуля
            ...[domain]Routes,
        ],
    },
]);
```

### 2.3 Новый API-endpoint

1. Добавить константу в `src/shared/constants/apiEndpoints.ts`
2. Добавить метод в `src/modules/[domain]/api/[domain].api.ts`
3. Добавить типы в `src/modules/[domain]/api/[domain].dto.ts`
4. Создать/обновить хук в `src/modules/[domain]/ui/hooks/`

### 2.4 Новый тест

**Unit-тест компонента:**

```tsx
// src/modules/[domain]/ui/components/[Component].test.tsx
import { render, screen } from '@mocks/test-utils';
import { [Component] } from './[Component]';

describe('[Component]', () => {
    it('renders correctly', () => {
        render(<[Component] prop="value" />);
        expect(screen.getByText('value')).toBeInTheDocument();
    });
});
```

**Тест хука:**

```tsx
// src/modules/[domain]/ui/hooks/use[Domain].test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { use[Domain]s } from './use[Domain]';
import { wrapper } from '@mocks/test-utils';

describe('use[Domain]s', () => {
    it('fetches data', async () => {
        const { result } = renderHook(() => use[Domain]s(), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeDefined();
    });
});
```

**Интеграционный тест:**

```tsx
// src/__tests__/integration/[domain]-flow.test.tsx
import { render, screen, waitFor } from '@mocks/test-utils';
import userEvent from '@testing-library/user-event';
import { App } from '@app/App';

describe('[Domain] Flow', () => {
    it('creates entity successfully', async () => {
        const user = userEvent.setup();
        render(<App />);
        
        // Навигация, заполнение формы, проверка результата
    });
});
```

### 2.5 Новые переводы (i18n)

1. Добавить ключи в `src/i18n/en/[domain].json`
2. Добавить ключи в `src/i18n/ru/[domain].json`
3. Использовать: `const { t } = useTranslation(); t('[domain].key')`

---

## 3. Стиль кода и соглашения

### 3.1 Языковые требования

> **КРИТИЧЕСКИ ВАЖНО**: Соблюдайте языковые соглашения!

| Контекст | Язык | Пример |
|----------|------|--------|
| **Сообщения об ошибках** | 🇬🇧 English | `throw new Error('User not found')` |
| **Логи (console.log, logger)** | 🇬🇧 English | `console.error('Failed to fetch users')` |
| **Комментарии в коде** | 🇷🇺 Русский | `// Проверяем авторизацию пользователя` |
| **TSDoc/JSDoc** | 🇷🇺 Русский | `/** Хук для получения списка пользователей */` |
| **Названия переменных/функций** | 🇬🇧 English | `fetchUsers`, `handleSubmit` |
| **UI тексты** | i18n | `t('common.save')` — локализуется |
| **Git commits** | 🇬🇧 English | `feat(users): add user creation form` |

**Примеры:**

```typescript
// ✅ Правильно
/**
 * Получает список пользователей с сервера
 * @param params - параметры пагинации
 */
async function fetchUsers(params: PaginationParams): Promise<User[]> {
    try {
        // Формируем запрос к API
        const { data } = await apiClient.get('/users', { params });
        return data;
    } catch (error) {
        // При ошибке логируем и пробрасываем
        console.error('Failed to fetch users:', error);
        throw new Error('Failed to fetch users');
    }
}

// ❌ Неправильно
/**
 * Gets user list from server (комментарии должны быть на русском)
 */
async function fetchUsers(params: PaginationParams): Promise<User[]> {
    try {
        const { data } = await apiClient.get('/users', { params });
        return data;
    } catch (error) {
        console.error('Не удалось загрузить пользователей:', error); // логи на английском!
        throw new Error('Ошибка загрузки пользователей'); // ошибки на английском!
    }
}
```

### 3.2 Именование

| Сущность | Стиль | Пример |
|----------|-------|--------|
| **Компоненты** | PascalCase | `UserTable`, `LoginForm` |
| **Хуки** | camelCase с `use` | `useUsers`, `useCreateUser` |
| **Функции** | camelCase | `handleSubmit`, `formatDate` |
| **Константы** | UPPER_SNAKE_CASE | `API_ENDPOINTS`, `MAX_RETRIES` |
| **Типы/Интерфейсы** | PascalCase | `User`, `CreateUserRequest` |
| **Файлы компонентов** | PascalCase.tsx | `UserTable.tsx` |
| **Файлы хуков** | camelCase.ts | `useUsers.ts` |
| **Файлы API** | kebab-case.ts | `users.api.ts` |
| **Тесты** | *.test.tsx | `UserTable.test.tsx` |

### 3.3 Структура файла компонента

```tsx
// 1. Импорты (сгруппированы)
import { useState, useCallback } from 'react';  // React
import { Box, Button } from '@mui/material';     // Библиотеки
import { useUsers } from '../hooks/useUsers';     // Проект
import type { User } from '../../api/users.dto'; // Типы

// 2. Типы пропсов
interface UserTableProps {
    users: User[];
    onDelete: (id: number) => void;
    loading?: boolean;
}

// 3. Компонент
export function UserTable({ users, onDelete, loading }: UserTableProps) {
    // 3.1 Хуки (всегда в начале)
    const [selected, setSelected] = useState<number | null>(null);
    
    // 3.2 Обработчики
    const handleDelete = useCallback((id: number) => {
        // Подтверждаем удаление
        onDelete(id);
    }, [onDelete]);
    
    // 3.3 Рендер
    return (
        <Table>
            {/* ... */}
        </Table>
    );
}
```

### 3.4 TypeScript

```typescript
// ✅ Используйте строгую типизацию
function processUser(user: User): ProcessedUser { ... }

// ❌ Избегайте any
function processUser(user: any): any { ... }

// ✅ Используйте unknown вместо any для неизвестных типов
function handleError(error: unknown): void {
    if (error instanceof Error) {
        console.error('Error occurred:', error.message);
    }
}

// ✅ Используйте type guards
function isUser(obj: unknown): obj is User {
    return typeof obj === 'object' && obj !== null && 'id' in obj;
}

// ✅ Предпочитайте interface для объектов
interface User {
    id: number;
    name: string;
}

// ✅ Используйте type для union/intersection
type AuthType = 'local' | 'ldap';
type UserWithRoles = User & { roles: Role[] };
```

### 3.5 React паттерны

**Композиция вместо наследования:**

```tsx
// ✅ Правильно
function UserFormDialog({ user, onClose }: Props) {
    return (
        <FormDialog title="Edit User" onClose={onClose}>
            <UserForm user={user} />
        </FormDialog>
    );
}

// ❌ Неправильно — дублирование
function UserFormDialog({ user, onClose }: Props) {
    return (
        <Dialog onClose={onClose}>
            <DialogTitle>Edit User</DialogTitle>
            <UserForm user={user} />
        </Dialog>
    );
}
```

**Ранний return:**

```tsx
// ✅ Правильно
function UserList({ users }: Props) {
    if (!users.length) return <EmptyState />;
    return <Table>{/* ... */}</Table>;
}

// ❌ Неправильно
function UserList({ users }: Props) {
    return (
        <Box>
            {users.length > 0 ? <Table>{/* ... */}</Table> : <EmptyState />}
        </Box>
    );
}
```

### 3.6 TanStack Query

```typescript
// Структура хука
export function useUsers(params?: PaginationParams) {
    return useQuery({
        queryKey: ['users', params],  // Включайте params в ключ!
        queryFn: () => usersApi.list(params),
        staleTime: 5 * 60 * 1000,     // 5 минут
    });
}

// Инвалидация после мутации
export function useCreateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: usersApi.create,
        onSuccess: () => {
            // Инвалидируем весь кеш users
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}
```

### 3.7 ESLint и Prettier

Проект использует ESLint с TypeScript и React плагинами. Конфигурация в `eslint.config.js`.

```bash
# Проверка
npm run lint

# Автофикс
npm run lint -- --fix
```

#### Плагин lang-rules

Кастомный ESLint плагин `eslint-plugin-lang-rules` автоматически проверяет языковые требования:

| Правило | Описание |
|---------|----------|
| `lang-rules/comments-in-russian` | Комментарии должны быть на русском |
| `lang-rules/logs-in-english` | console.* должны быть на английском |
| `lang-rules/errors-in-english` | throw new Error() должны быть на английском |

**Исключения для комментариев:**
- URL-адреса (`http://`, `https://`)
- ESLint директивы (`eslint-disable`, `eslint-enable`)
- TypeScript директивы (`@ts-ignore`, `@ts-expect-error`)

Плагин находится в `frontend/eslint-plugin-lang-rules/`.

### 3.8 Импорты

Используйте path aliases:

```typescript
// ✅ Правильно
import { apiClient } from '@shared/api/api-client';
import { useUsers } from '@modules/users';

// ❌ Неправильно
import { apiClient } from '../../../shared/api/api-client';
```

Порядок импортов:
1. React и хуки
2. Внешние библиотеки
3. Проектные модули (@shared, @core, @modules)
4. Локальные файлы
5. Типы (import type)

---

## 4. Архитектурные правила

### 4.1 Правила зависимостей

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

### 4.2 Публичное API модуля

Импортируйте из других модулей **ТОЛЬКО** через `index.ts`:

```typescript
// ✅ Правильно
import { TaskStatusIndicator, useRunTask } from '@modules/tasks';

// ❌ Неправильно — прямой импорт внутренностей
import { TaskStatusIndicator } from '@modules/tasks/ui/components/TaskStatusIndicator';
```

### 4.3 Циклические зависимости

**Циклические зависимости между модулями ЗАПРЕЩЕНЫ.**

Если A → B, то B ↛ A.

### 4.4 eslint-plugin-boundaries

Правила проверяются автоматически через ESLint:

```bash
npm run lint
# Увидите ошибки при нарушении правил зависимостей
```

### 4.5 Domain-Driven Design

- Каждый модуль = один bounded context
- DTO зеркалят Pydantic-схемы бэкенда
- Бизнес-логика в services/ (опционально)
- UI-логика в hooks/

> Подробнее: [Архитектура](architecture.md)

---

## 5. Чеклист перед PR

### Обязательно

- [ ] **Тесты проходят**: `npm run test`
- [ ] **Линт проходит**: `npm run lint`
- [ ] **Сборка успешна**: `npm run build`
- [ ] **Переводы добавлены** (если есть новые UI-тексты)
  - `src/i18n/en/*.json`
  - `src/i18n/ru/*.json`

### Проверьте также

- [ ] Новые компоненты имеют тесты
- [ ] Хуки покрыты тестами
- [ ] Нет `console.log` в production коде (кроме логгера)
- [ ] Нет `any` типов (используйте `unknown` + type guards)
- [ ] Импорты через path aliases (@shared, @modules, @core)
- [ ] Языковые соглашения соблюдены:
  - Ошибки на английском
  - Логи на английском
  - Комментарии на русском

### Формат коммита

```
type(scope): description

# Примеры:
feat(users): add user creation form
fix(auth): handle token refresh race condition
docs(readme): update installation instructions
test(settings): add LDAP settings tests
refactor(api): extract common error handling
```

Типы: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `style`

---

## Полезные ссылки

- [Архитектура](architecture.md)
- [API Layer](api.md)
- [Тестирование](testing.md)
- [Компоненты](components_and_layout.md)
