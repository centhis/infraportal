# План рефакторинга Frontend: Mirror-Based Clean Architecture (v2.0)

> **Цель**: Привести архитектуру фронтенда к зеркальному отражению бэкенда, обеспечив модульность enterprise-уровня, максимальную изоляцию доменов и масштабируемость для 1000+ маршрутов.

---

## Целевая структура проекта

```
src/
├── app/                      # Оркестрация (точка входа)
│   ├── App.tsx
│   ├── main.tsx
│   └── providers/            # Глобальные провайдеры
│
├── core/                     # Ядро системы (cross-cutting concerns)
│   ├── auth/                 # Сервисы авторизации и ACL
│   ├── router/               # Конфигурация маршрутов
│   ├── config/               # Глобальные настройки
│   └── providers/            # QueryProvider, ThemeProvider
│
├── shared/                   # Общие утилиты (без бизнес-логики)
│   ├── api/                  # API клиент (axios)
│   ├── ui/                   # UI Kit (Button, DataTable, Dialog)
│   ├── hooks/                # Общие хуки (usePersistentState)
│   ├── types/                # Глобальные типы (Pagination, ApiError)
│   └── lib/                  # Утилиты (formatDate, cn)
│
├── modules/                  # Бизнес-модули (зеркало backend/app/)
│   ├── auth/                 # Зеркало backend/app/auth
│   ├── users/                # Зеркало backend/app/users
│   ├── settings/             # Зеркало backend/app/settings
│   └── content/              # Статический контент
│
└── types/                    # Глобальные TypeScript типы (ТОЛЬКО общие: Pagination, ApiError)
                              # ⚠️ Доменные типы (User, Role, Settings) — в modules/[domain]/api/[domain].dto.ts
```

---

## ⭐ Единый шаблон структуры модуля (Module Template)

Каждый бизнес-модуль в `src/modules/[domain]/` **ОБЯЗАН** следовать этому шаблону. Это обеспечивает единообразие, предсказуемость и простоту навигации для всех разработчиков.

```
src/modules/[domain]/
│
├── api/                          # Сетевой слой (Data Fetching)
│   ├── [domain].api.ts           # Методы API: list, get, create, update, delete
│   └── [domain].dto.ts           # Data Transfer Objects: доменные типы (зеркало Pydantic-схем)
│
├── services/                     # Бизнес-логика (Domain Logic)
│   └── [Domain]Service.ts        # Валидация, трансформация, бизнес-правила
│
├── store/                        # Клиентское состояние (Client State)
│   └── [domain].store.ts         # Zustand store (только если нужен глобальный стейт)
│
├── ui/                           # Презентационный слой (UI Layer)
│   ├── pages/                    # Точки входа для роутера
│   │   └── [Domain]Page.tsx      # Пример: UserManagementPage.tsx
│   │
│   ├── containers/               # "Умные" компоненты (подключены к данным)
│   │   └── [Domain]ListContainer.tsx
│   │
│   ├── components/               # "Глупые" компоненты (только пропсы)
│   │   ├── [Domain]Table.tsx
│   │   ├── [Domain]Form.tsx
│   │   └── [Domain]Card.tsx
│   │
│   └── hooks/                    # UI-специфичные хуки модуля
│       └── use[Domain]UI.ts      # Локальные UI-состояния
│
├── routes.ts                     # Конфигурация маршрутов модуля
├── permissions.ts                # Права доступа модуля (опционально)
└── index.ts                      # Публичный API модуля (реэкспорт)
```

### Правила использования шаблона

| Папка/Файл | Обязательность | Описание |
|------------|----------------|----------|
| `api/` | ✅ Обязательно | Все сетевые запросы модуля |
| `api/[domain].dto.ts` | ✅ Обязательно | Типы запросов и ответов, зеркалят Pydantic-схемы бэкенда |
| `services/` | ⚠️ По необходимости | Создается, если есть бизнес-логика помимо CRUD |
| `store/` | ⚠️ По необходимости | Создается, если состояние модуля нужно вне его |
| `ui/pages/` | ✅ Обязательно | Минимум одна страница — точка входа |
| `ui/containers/` | ✅ Обязательно | Компоненты с `useQuery`/`useMutation` |
| `ui/components/` | ✅ Обязательно | Чистые презентационные компоненты |
| `ui/hooks/` | ⚠️ По необходимости | Локальные UI-хуки модуля |
| `routes.ts` | ✅ Обязательно | Маршруты модуля для авто-регистрации |
| `permissions.ts` | ⚠️ По необходимости | Если модуль определяет свои права |
| `index.ts` | ✅ Обязательно | Публичный API: экспорт только разрешенного |

### Пример: Модуль `users`

```
src/modules/users/
├── api/
│   ├── users.api.ts              # list, get, create, update, delete
│   ├── users.dto.ts              # UserDTO, CreateUserRequest, UpdateUserRequest
│   ├── roles.api.ts
│   ├── roles.dto.ts
│   ├── groups.api.ts
│   └── groups.dto.ts
├── services/
│   ├── UserService.ts            # Логика работы с пользователями
│   └── PermissionReportService.ts
├── ui/
│   ├── pages/
│   │   └── UserManagementPage.tsx
│   ├── containers/
│   │   ├── UserListContainer.tsx
│   │   ├── RoleListContainer.tsx
│   │   └── GroupListContainer.tsx
│   └── components/
│       ├── UserTable.tsx
│       ├── UserForm.tsx
│       ├── RoleTable.tsx
│       └── GroupTable.tsx
├── routes.ts
└── index.ts
```

---

## Раздел 0: Инфраструктура и Инструментарий

### Задача 0.1: Конфигурация TypeScript [DONE]

**Контекст**: Проект использует JavaScript без типизации. Это приводит к ошибкам runtime и затрудняет рефакторинг. Необходимо внедрить TypeScript со строгой политикой.

**Описание работ**:
1. Создать `tsconfig.json` в корне `frontend/`:
   - `strict: true`
   - `noImplicitAny: true`
   - `strictNullChecks: true`
2. Установить зависимости: `typescript`, `@types/react`, `@types/react-dom`, `@types/node`.
3. Обновить `vite.config.ts` для поддержки TypeScript.
4. Настроить ESLint с `@typescript-eslint/parser`.

**Критерий готовности**: Команда `tsc --noEmit` проходит без ошибок на пустом проекте.

**Файлы**:
- `frontend/tsconfig.json` [NEW]
- `frontend/vite.config.ts` [MODIFY]
- `frontend/package.json` [MODIFY]

---

### Задача 0.2: Path Aliases [DONE]

**Контекст**: Текущие импорты используют длинные относительные пути (`../../../shared/api`). Это усложняет рефакторинг и читаемость.

**Описание работ**:
1. Настроить алиасы в `tsconfig.json`:
   - `@app/*` → `src/app/*`
   - `@core/*` → `src/core/*`
   - `@shared/*` → `src/shared/*`
   - `@modules/*` → `src/modules/*`
   - `@types/*` → `src/types/*`
2. Продублировать алиасы в `vite.config.ts` через `resolve.alias`.

**Критерий готовности**: Импорты вида `import { Button } from '@shared/ui'` работают.

**Файлы**:
- `frontend/tsconfig.json` [MODIFY]
- `frontend/vite.config.ts` [MODIFY]

---

### Задача 0.3: Интеграция TanStack Query [DONE]

**Контекст**: Текущие хуки вручную управляют `loading`, `error`, `data`. Дублирование кода, отсутствие кэширования.

**Описание работ**:
1. Установить `@tanstack/react-query` и `@tanstack/react-query-devtools`.
2. Создать `src/core/providers/QueryProvider.tsx`:
   - `staleTime: 5 * 60 * 1000`
   - `retry: 1`
3. Обернуть `App.tsx` в `QueryProvider`.

**Критерий готовности**: DevTools отображаются, `useQuery` работает.

**Файлы**:
- `src/core/providers/QueryProvider.tsx` [NEW]
- `src/app/App.tsx` [MODIFY]
- `package.json` [MODIFY]

---

### Задача 0.4: Интеграция Zustand [DONE]

**Контекст**: Глобальное состояние через React Context. Zustand проще и производительнее.

**Описание работ**:
1. Установить `zustand`.
2. Создать шаблон стора `src/shared/lib/createStore.ts`.

**Критерий готовности**: Тестовый стор работает.

**Файлы**:
- `package.json` [MODIFY]
- `src/shared/lib/createStore.ts` [NEW]

---

## Раздел 1: Shared Layer (Фундамент)

### Задача 1.1: Миграция API Client [DONE]

**Контекст**: `AxiosInstance.jsx` содержит логику перехватчиков. Необходимо типизировать.

**Описание работ**:
1. `shared/api/AxiosInstance.jsx` → `shared/api/api-client.ts`.
2. Типизировать: `ApiResponse<T>`, `ApiError`.
3. Вынести refresh token логику.

**Критерий готовности**: Все API-вызовы работают с новым клиентом.

**Файлы**:
- `src/shared/api/AxiosInstance.jsx` [DELETE]
- `src/shared/api/api-client.ts` [NEW]
- `src/shared/api/types.ts` [NEW]

---

### Задача 1.2: Глобальные Типы [DONE]

**Контекст**: Отсутствуют общие интерфейсы для сущностей.

**Описание работ**:
1. Создать `src/types/entities.ts`: `User`, `Role`, `Group`, `Permission`.
2. Создать `src/types/api.ts`: `PaginatedResponse<T>`, `ApiError`.

**Критерий готовности**: Типы используются в API-методах.

**Файлы**:
- `src/types/entities.ts` [NEW]
- `src/types/api.ts` [NEW]
- `src/types/index.ts` [NEW]

---

### Задача 1.3: Shared UI Kit [DONE]

**Контекст**: MUI используется напрямую без обертки.

**Описание работ**:
1. Создать `src/shared/ui/`:
   - `Button/Button.tsx`
   - `TextField/TextField.tsx`
   - `DataTable/DataTable.tsx`
   - `Dialog/ConfirmDialog.tsx`
   - `StatusBadge/StatusBadge.tsx`
2. Создать `src/shared/ui/index.ts`.

**Критерий готовности**: Компоненты используются в модулях.

**Файлы**:
- `src/shared/ui/Button/Button.tsx` [NEW]
- `src/shared/ui/DataTable/DataTable.tsx` [NEW]
- `src/shared/ui/Dialog/ConfirmDialog.tsx` [NEW]
- `src/shared/ui/index.ts` [NEW]

---

## Раздел 2: Core Layer (Ядро)

### Задача 2.1: Конфигурация маршрутов [DONE]

**Контекст**: Все маршруты в одном файле. При 1000+ маршрутах неуправляемо.

**Описание работ**:
1. Создать `src/core/router/routes.config.ts`: `RouteConfig[]`.
2. Создать `src/core/router/RouterProvider.tsx`: `generateRoutes()`.
3. Каждый модуль экспортирует `routes.ts`.

**Критерий готовности**: Маршруты загружаются из модулей.

**Файлы**:
- `src/core/router/routes.config.ts` [NEW]
- `src/core/router/RouterProvider.tsx` [NEW]
- `src/core/router/ProtectedRoute.tsx` [NEW]
- `src/core/router/types.ts` [NEW]

---

### Задача 2.2: Permission Service [DONE]

**Контекст**: Логика прав в `PermissionsProvider.jsx`. Нужен сервис для использования вне React.

**Описание работ**:
1. Создать `src/core/auth/PermissionService.ts`: `can()`, `canAny()`, `canAll()`.
2. Создать `src/core/auth/permissions.store.ts` (Zustand).
3. Обновить `Can.tsx`.

**Критерий готовности**: Проверка прав работает в сервисах.

**Файлы**:
- `src/core/auth/PermissionService.ts` [NEW]
- `src/core/auth/permissions.store.ts` [NEW]
- `src/core/auth/Can.tsx` [NEW]

---

### Задача 2.3: Рефакторинг провайдеров [DONE]

**Контекст**: Провайдеры разбросаны. Нужна единая точка.

**Описание работ**:
1. Переместить в `core/providers/`: `AuthProvider.tsx`, `I18nProvider.tsx`, `ToastProvider.tsx`.
2. Создать `AppProvider.tsx` — композиция всех.
3. Удалить `app/providers/`.

**Критерий готовности**: `App.tsx` использует единый `AppProvider`.

**Файлы**:
- `src/core/providers/AppProvider.tsx` [NEW]
- `src/app/providers/` [DELETE]

---

## Раздел 3: Domain Modules (Миграция бизнес-логики)

### Задача 3.1: Модуль Auth [DONE]

**Контекст**: Логика авторизации разбросана. Нужна консолидация.

**Описание работ**:
1. Создать `src/modules/auth/` по шаблону:
   - `api/auth.api.ts`, `api/auth.dto.ts`
   - `services/AuthService.ts`
   - `store/auth.store.ts`
   - `ui/pages/LoginPage.tsx`
   - `ui/containers/LoginFormContainer.tsx`
   - `ui/components/LoginForm.tsx`
   - `routes.ts`, `index.ts`
2. Перенести типы `CurrentUser`, `UserPermissions` из `src/types/entities.ts` в `api/auth.dto.ts`.
3. Удалить `features/auth/`.

**Критерий готовности**: Вход/выход работают.

**Файлы**:
- `src/modules/auth/` [NEW — все по шаблону]
- `src/features/auth/` [DELETE]

---

### Задача 3.2: Модуль Users [DONE]

**Контекст**: `features/userManagement/` — 41 файл. Разбить на подмодули.

**Описание работ**:
1. Создать `src/modules/users/` по шаблону.
2. API: `users.api.ts`, `roles.api.ts`, `groups.api.ts`, `permissions.api.ts`.
3. Services: `UserService.ts`, `RoleService.ts`, `GroupService.ts`.
4. UI: Pages, Containers, Components.
5. Перенести типы `User`, `Role`, `Group`, `Permission` (+ Create/Update) из `src/types/entities.ts` в соответствующие `dto.ts`.
6. Удалить `features/userManagement/`.

**Критерий готовности**: CRUD для Users/Roles/Groups работает.

**Файлы**:
- `src/modules/users/` [NEW — все по шаблону]
- `src/features/userManagement/` [DELETE]

---

### Задача 3.3: Модуль Settings [DONE]

**Контекст**: `features/settings/` — Core и LDAP настройки.

**Описание работ**:
1. Создать `src/modules/settings/` по шаблону.
2. `services/SettingsService.ts` — логика `testLdapConnection`.
3. Перенести типы из `src/types/settings.ts` в `api/settings.dto.ts`.
4. Удалить `features/settings/`.

**Критерий готовности**: Настройки Core и LDAP работают.

**Файлы**:
- `src/modules/settings/` [NEW — все по шаблону]
- `src/features/settings/` [DELETE]

---

### Задача 3.4: Модуль Content [DONE]

**Контекст**: Статические страницы Home и About.

**Описание работ**:
1. Создать `src/modules/content/` по шаблону (только pages).
2. Удалить `features/contentPages/`.

**Критерий готовности**: Страницы отображаются.

**Файлы**:
- `src/modules/content/` [NEW]
- `src/features/contentPages/` [DELETE]

---

### Задача 3.5: Миграция UI компонентов модулей [DONE]

**Контекст**: В модулях созданы только заглушки страниц. Нужно мигрировать все UI компоненты.

**Описание работ**:

#### 3.5.1: Модуль Auth UI
- `LoginAlert.jsx` → `src/modules/auth/ui/components/LoginAlert.tsx`
- `LoginTextField.jsx` → `src/modules/auth/ui/components/LoginTextField.tsx`
- `LoginPassField.jsx` → `src/modules/auth/ui/components/LoginPassField.tsx`

#### 3.5.2: Модуль Users UI
**Таблицы:**
- `UserTable.jsx` → `src/modules/users/ui/components/UserTable.tsx`
- `RoleTable.jsx` → `src/modules/users/ui/components/RoleTable.tsx`
- `GroupTable.jsx` → `src/modules/users/ui/components/GroupTable.tsx`

**Формы:**
- `UserForm.jsx` → `src/modules/users/ui/components/UserForm.tsx`
- `RoleForm.jsx` → `src/modules/users/ui/components/RoleForm.tsx`
- `GroupForm.jsx` → `src/modules/users/ui/components/GroupForm.tsx`

**Диалоги:**
- `PermissionsReportDialog.jsx` → `src/modules/users/ui/components/PermissionsReportDialog.tsx`

#### 3.5.3: Модуль Settings UI
- `SettingItem.jsx` → `src/modules/settings/ui/components/SettingItem.tsx`
- `SettingInputField.jsx` → `src/modules/settings/ui/components/SettingInputField.tsx`
- `SettingsTabs.jsx` → объединить в `SettingsPage.tsx`

**Критерий готовности**: 
- Все компоненты типизированы
- Используют Shared UI Kit (`Button`, `TextField`, `DataTable`, `ConfirmDialog`)
- Используют новые хуки модулей (`useUsers`, `useRoles`, etc.)
- Удалены TODO комментарии из pages

**Файлы**:
- `src/modules/auth/ui/components/*.tsx` [NEW]
- `src/modules/users/ui/components/*.tsx` [NEW]
- `src/modules/settings/ui/components/*.tsx` [NEW]
- `src/features/*/components/**/*.jsx` [DELETE после миграции]

---

## Раздел 4: Актуализация тестов


### Задача 4.1: Обновление инфраструктуры тестов [DONE]

**Контекст**: Тесты на JavaScript. Перевести на TypeScript.

**Описание работ**:
1. Обновить `vitest.config.ts`.
2. `setupTests.js` → `setupTests.ts`.
3. Обновить MSW моки.

**Критерий готовности**: `npm run test` проходит.

**Файлы**:
- `vitest.config.ts` [MODIFY]
- `src/setupTests.ts` [MODIFY]

---

### Задача 4.2: Миграция Unit-тестов [DONE]

**Контекст**: `*.test.jsx` → `*.test.tsx`.

**Описание работ**:
1. Перевести тесты Auth, Users, Settings.
2. Обновить импорты.

**Критерий готовности**: 100% тестов проходят.

**Файлы**:
- `src/modules/*/**/*.test.tsx` [NEW]

---

### Задача 4.3: Интеграционные тесты [DONE]

**Контекст**: Добавить E2E тесты критических потоков.

**Описание работ**:
1. Тест Login → Home → Logout.
2. Тест CRUD пользователей.
3. Тест LDAP настроек.

**Критерий готовности**: Тесты в CI.

**Файлы**:
- `src/__tests__/integration/*.test.tsx` [NEW]

---

### Задача 4.4: Архитектурные тесты [DONE]

**Контекст**: Необходимо автоматически контролировать зависимости между модулями и соблюдение архитектурных правил.

**Описание работ**:
1. Установить и настроить `eslint-plugin-boundaries`:
   - Определить элементы: `app`, `core`, `shared`, `module`
   - Правила: `shared/` не импортирует из `modules/`, модули импортируют друг друга только через `index.ts`
   - Запретить циклические зависимости
2. Создать архитектурный тест `src/__tests__/architecture.test.ts`:
   - Проверка, что `shared/` не импортирует из `modules/`
   - Проверка, что модули не имеют циклических зависимостей
3. (Опционально) Настроить `dependency-cruiser` для визуализации графа зависимостей

**Критерий готовности**: ESLint выдаёт ошибку при нарушении правил зависимостей.

**Файлы**:
- `.eslintrc.cjs` [MODIFY] — добавить правила `boundaries`
- `src/__tests__/architecture.test.ts` [NEW]
- `package.json` [MODIFY] — добавить `eslint-plugin-boundaries`

---

## Раздел 5: Актуализация документации

> **Контекст**: Существующая документация в `docs/frontend/` описывает **устаревшую архитектуру** (`features/`, `AxiosInstance.jsx`, кастомные хуки с `useState`/`useEffect`). Необходимо актуализировать под новую архитектуру (`modules/`, `api-client.ts`, TanStack Query, Zustand, TypeScript).

---

### Задача 5.0: Актуализация существующей документации [DONE]

**Контекст**: 8 файлов в `docs/frontend/` описывают старую архитектуру.

**Описание работ**:
1. `overview.md` — обновить структуру проекта и Mermaid-схему под `modules/`
2. `api_interaction.md` — описать `api-client.ts`, удалить `AxiosInstance.jsx`, добавить примеры TanStack Query
3. `state_management.md` — добавить Zustand и TanStack Query, удалить кастомные хуки с `useState`/`useEffect`
4. `routing.md` — обновить под новую структуру `core/router/` и модульные `routes.ts`
5. `testing.md` — обновить под TypeScript, добавить интеграционные тесты
6. `components_and_layout.md` — обновить под `shared/ui/` и `modules/[domain]/ui/components/`
7. `settings.md` — обновить под `modules/settings/`

**Критерий готовности**: Все файлы отражают новую архитектуру.

**Файлы**:
- `docs/frontend/overview.md` [MODIFY]
- `docs/frontend/api_interaction.md` [MODIFY]
- `docs/frontend/state_management.md` [MODIFY]
- `docs/frontend/routing.md` [MODIFY]
- `docs/frontend/testing.md` [MODIFY]
- `docs/frontend/components_and_layout.md` [MODIFY]
- `docs/frontend/settings.md` [MODIFY]

---

### Задача 5.1: Документация архитектуры [DONE]

**Контекст**: Нужен отдельный документ с детальным описанием архитектуры.

**Описание работ**:
1. Создать `docs/frontend/architecture.md`:
   - Структура папок (`app/`, `core/`, `shared/`, `modules/`)
   - Диаграмма модулей (Mermaid)
   - Описание паттернов (Container/Presentational, Service Layer, TanStack Query)
   - **Единый шаблон модуля** (копия из этого плана)
   - **Domain-Driven Design**: принципы модульной архитектуры Дяди Боба
   - **Правила зависимостей между модулями**:
     - `shared/` НЕ импортирует из `core/` или `modules/`
     - `core/` может импортировать из `modules/` (для UI-интеграции в Navbar и т.д.)
     - `modules/` импортируют друг друга ТОЛЬКО через публичное API (`index.ts`)
     - Циклические зависимости между модулями запрещены
   - Примеры cross-module интеграции (как `tasks` модуль экспортирует компоненты для `users`)
   - Описание `eslint-plugin-boundaries` и архитектурных тестов

**Критерий готовности**: Новый разработчик понимает архитектуру и правила зависимостей за 15 минут.

**Файлы**:
- `docs/frontend/architecture.md` [NEW]

---

### Задача 5.2: Документация API-слоя [DONE]

**Контекст**: Нужна документация API-слоя с примерами.

**Описание работ**:
1. Создать `docs/frontend/api.md`:
   - Описание `shared/api/api-client.ts`
   - Перехватчики (request/response interceptors)
   - Список API-модулей (`users.api.ts`, `roles.api.ts`, и т.д.)
   - DTO и их связь с Pydantic-схемами бэкенда
   - Примеры использования с TanStack Query hooks

**Критерий готовности**: Все методы задокументированы.

**Файлы**:
- `docs/frontend/api.md` [NEW]

---

### Задача 5.3: Руководство разработчика [DONE]

**Контекст**: Отсутствует комплексный гайд для новых разработчиков и требования к стилю кода.

**Описание работ**:
1. Создать `docs/frontend/developer-guide.md`:

   **Раздел 1: Быстрый старт для новых разработчиков**
   - Настройка окружения (IDE, расширения VSCode)
   - Запуск проекта локально
   - Запуск тестов
   - Обзор структуры проекта

   **Раздел 2: Как добавить...**
   - Как добавить новый модуль (степ-бай-степ с примерами)
   - Как добавить новый маршрут
   - Как добавить новый API-endpoint
   - Как написать тест (унит, интеграционный)
   - Как добавить переводы (i18n)

   **Раздел 3: Стиль кода и соглашения**
   - Структура файлов и импортов
   - Соглашения об именовании (PascalCase для компонентов, camelCase для функций)
   - ESLint/Prettier конфигурация
   - TypeScript: строгая типизация, запрет `any`
   - Паттерны React: hooks, композиция
   - TanStack Query: структура хуков, cache invalidation
   - Обработка ошибок
   - Комментарии и TSDoc

   **Раздел 4: Архитектурные правила и DDD**
   - Domain-Driven Design: модульная архитектура
   - Правила импорта между `app/`, `core/`, `shared/`, `modules/`
   - Как правильно экспортировать компоненты для использования в других модулях
   - Как добавить cross-module интеграцию (пример: `tasks` → `users`)
   - Как работает `eslint-plugin-boundaries`

   **Раздел 5: Чеклист перед PR**
   - Тесты проходят (`npm run test`)
   - Линт проходит (`npm run lint`)
   - Сборка успешна (`npm run build`)
   - Переводы добавлены (en, ru)
   - Документация обновлена (если требуется)

**Критерий готовности**: Гайд покрывает все сценарии разработки.

**Файлы**:
- `docs/frontend/developer-guide.md` [NEW]

---

## Раздел 6: Очистка и верификация

### Задача 6.1: Удаление legacy-кода [DONE]

**Контекст**: После миграции останутся старые файлы.

**Описание работ**:
1. Удалить `src/features/`.
2. Удалить `src/app/providers/`.
3. Удалить все `.jsx` файлы.
4. Удалить `src/types/entities.ts` и `src/types/settings.ts` (типы перенесены в `modules/[domain]/api/*.dto.ts`).
5. Очистить `package.json`.

**Критерий готовности**: Нет файлов в `features/`.

**Файлы**:
- `src/features/` [DELETE]
- `src/app/providers/` [DELETE]

---

### Задача 6.2: Финальная верификация [DONE]

**Контекст**: Убедиться, что все работает.

**Описание работ**:
1. `npm run build` — 0 ошибок.
2. `npm run test` — 100%.
3. Ручные проверки CRUD.
4. Проверка ACL.

**Критерий готовности**: Все проверки пройдены.

---

## Definition of Done

1.  ✅ Ни одного файла `.js`/`.jsx` (кроме конфигов).
2.  ✅ Папка `features/` удалена.
3.  ✅ Все тесты проходят.
4.  ✅ Документация обновлена (включая шаблон модуля в developer-guide).
5.  ✅ `npm run build` — 0 ошибок.

---

*Документ: aplan_v2.md | Версия: 2.0 | Дата: 25.01.2026*
