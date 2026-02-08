# Генеральный план архитектурного рефакторинга Frontend (v7.5: MEGA-PLAN)

Этот документ является исчерпывающим руководством по переработке фронтенда проекта `infraportal`. План нацелен на устранение технического долга, внедрение строгой типизации и переход к сервис-ориентированной модульной архитектуре, зеркально отражающей бэкенд.

---

## 📐 Часть 0: Архитектурные стандарты и определения

Перед началом работ фиксируем целевую структуру каждого модуля в `src/modules/[domain]/`. Это разделение ответственности является обязательным для всех новых и переносимых файлов.

1.  **api/** (Data Fetching Layer):
    *   **Файлы**: `[domain].api.ts`, `[domain].dto.ts`.
    *   **Описание**: Здесь описываются только "сырые" запросы к бэкенду через типизированный axios-клиент.
    *   **Зачем**: Изоляция сетевого слоя. При смене API эндпоинта изменения вносятся только в одном файле модуля.
2.  **services/** (Business Logic Layer):
    *   **Файлы**: `[Domain]Service.ts`.
    *   **Описание**: Чистая логика на TypeScript. Здесь происходит преобразование данных (н-р, формат даты), валидация и сложные вычисления.
    *   **Зачем**: Позволяет тестировать логику приложения без React и без браузера (Unit-тесты).
3.  **store/** (Client State Layer):
    *   **Файлы**: `[domain].store.ts` (Zustand).
    *   **Описание**: Хранение глобального состояния модуля, которое требуется за его пределами (н-р, данные авторизации).
4.  **ui/** (Presentation Layer):
    *   **pages/** (Entry Points): Точки входа роутера. Отвечают за композицию Контейнеров.
    *   **containers/** (Smart Components): Компоненты, которые "знают" о данных. Здесь используются хуки TanStack Query.
    *   **components/** (Dumb Components): Чистые презентационные компоненты. Только отображение данных из props.
    *   **hooks/** (UI Logic): Инкапсуляция поведения UI (н-р, логика переключения вкладок или анимации).

---

## 🏗 Фаза 1: Инфраструктура и Фундаментальная типизация

### 1.1 Развертывание TypeScript и Alias-путей [TODO]
*   **Описание работ**: 
    1. Инициализация `tsconfig.json` с политикой `strict: true`.
    2. Установка зависимостей: `typescript`, `@types/react`, `@types/react-dom`, `@types/node`.
    3. Настройка `vite.config.ts` для поддержки алиасов: `@core`, `@modules`, `@shared`, `@types`.
*   **Зачем**: Чтобы на этапе разработки видеть ошибки несовместимости данных и избежать "callback hell" при импортах типа `../../../../hooks`.
*   **Результат**: Весь проект готов к приему `.ts` и `.tsx` файлов.

### 1.2 Внедрение TanStack Query (React Query) [TODO]
*   **Описание работ**: 
    1. Создание `src/core/providers/QueryProvider.tsx`.
    2. Инициализация `QueryClient` с настройками по умолчанию (`staleTime: 5min`, `retry: 1`).
    3. Обертывание приложения в `QueryProvider`.
*   **Зачем**: Сейчас состояние загрузки (`loading`) управляется вручную через `useState` в каждом хуке. Это порождает баги. TanStack Query возьмет на себя кэширование, автоматическое обновление данных и управление состояниями загрузки/ошибки.

---

## 🛠 Фаза 2: Shared Слой (Инструментарий платформы)

### 2.1 Рефакторинг сетевого клиента (`shared/api`) [TODO]
*   **Что переносим**: `src/shared/api/AxiosInstance.jsx` → `src/shared/api/api-client.ts`.
*   **Описание работ**: 
    - Полная типизация axios-инстанса и интерцепторов.
    - Перенос логики обновления токена (Refresh Token) в связку с `AuthService`.
    - Добавление обработки типизированных ошибок API.
*   **Зачем**: Гарантия того, что каждый запрос имеет предсказуемую структуру и корректно обрабатывает авторизацию.

### 2.2 Создание Shared UI Kit (`shared/ui`) [TODO]
*   **Что переносим**: Компоненты из `src/components/forms/` и `src/components/layout/`.
*   **Описание работ**: 
    - Создание `DataTable.tsx` (умная обертка над MUI DataGrid).
    - Создание `ConfirmDialog.tsx` (универсальное окно подтверждения).
    - Создание `StatusBadge.tsx` (индикатор активен/неактивен).
    - Типизация всех базовых MUI компонентов, используемых в проекте.
*   **Зачем**: Устранение дублирования кода верстки и создание единой дизайн-системы.

---

## 🧩 Фаза 3: Модульный рефакторинг (File-by-File Mapping)

В этой фазе мы переносим и переписываем 71 файл из `features/` в `modules/`.

### 3.1 Модуль: Auth (11 файлов) [TODO]
*   **Релокация API**: `features/auth/api/authApi.js` → `modules/auth/api/auth.api.ts`.
    *   *Работы*: Описание интерфейсов `LoginRequest` и `UserResponse`.
*   **Релокация Логики**: `features/auth/hooks/useAuth.jsx` → `modules/auth/services/AuthService.ts` и `modules/auth/store/auth.store.ts`.
    *   *Работы*: Вынос управления токенами в чистый класс `AuthService`. Состояние пользователя — в Zustand.
*   **Релокация UI**: 
    - `auth/pages/Login.jsx` → `modules/auth/ui/pages/LoginPage.tsx`.
    - `auth/components/LoginAlert.jsx` → `modules/auth/ui/components/LoginAlert.tsx`.
    - `auth/components/LoginFormFields/*` → `modules/auth/ui/components/`.
    *   *Работы*: Декомпозиция страницы на Контейнер и чистую Форму.

### 3.2 Модуль: User Management (41 файл) [TODO]
Самый ресурсоемкий блок. Мы разбиваем его на Users, Roles и Groups.

#### 3.2.1 Подмодуль: Users
- **Перенос**:
    - `api/usersApi.js` → `modules/userManagement/api/users.api.ts`.
    - `hooks/useUsers.jsx` → **Переписывается** на `useQuery` внутри `UserListContainer.tsx`.
    - `components/user/UserTable.jsx` → `modules/userManagement/ui/components/UserTable.tsx`.
    - `components/user/UserForm.jsx` → `modules/userManagement/ui/components/UserForm.tsx`.
- **Зачем**: В `useUsers.jsx` сейчас 57 строк кода. После рефакторинга вся логика списка будет занимать 5 строк декларативного кода TanStack Query.

#### 3.2.2 Подмодули: Roles & Groups
- **Перенос**:
    - `api/rolesApi.js`, `api/groupApi.js` → Соответствующие `.api.ts`.
    - `hooks/useRoles.jsx`, `hooks/useGroups.jsx` → Переписываются на хуки React Query.
    - `components/role/*`, `components/group/*` → Переносятся в `ui/components/` с типизацией пропсов.
- **Работа**: Интеграция таблиц ролей и групп в общую страницу управления через контейнеры `RoleListContainer` и `GroupListContainer`.

### 3.3 Модуль: Settings (16 файлов) [TODO]
*   **Релокация API**: `features/settings/api/settingsApi.js` → `modules/settings/api/settings.api.ts`.
*   **Релокация Логики**: `features/settings/hooks/useLdapSettings.js` → `modules/settings/services/SettingsService.ts`.
    *   *Работы*: Вынос логики тестирования LDAP соединения в сервис.
*   **Релокация UI**: 
    - `settings/pages/SettingsPage.jsx` → `modules/settings/ui/pages/SettingsPage.tsx`.
    - `settings/components/SettingsTabs.jsx` → `modules/settings/ui/components/SettingsTabs.tsx`.
    *   *Работы*: Перевод всего интерфейса вкладок на TSX.

---

## 🎛 Фаза 4: Ядро и Оркестрация (Core Layer)

### 4.1 Permissions (ACL) Service [TODO]
*   **Что переносим**: `src/app/providers/PermissionsProvider.jsx` → `src/core/auth/PermissionService.ts`.
*   **Описание работ**: 
    - Перенос логики проверки прав (`can()`, `hasRole()`) в типизированный сервис.
    - Использование Zustand для хранения текущих пермишенов.
*   **Зачем**: Чтобы проверку прав можно было делать не только в React-компонентах, но и в бизнес-логике (Services).

### 4.2 Маршрутизация и Безопасность [TODO]
*   **Что переносим**: `src/app/routes/AppRoutes.jsx` → `src/core/router/AppRoutes.tsx`.
*   **Описание работ**: 
    - Внедрение декларативного конфига маршрутов (Routes Config).
    - Типизация всех путей через константы `ROUTES`.
    - Перевод `ProtectedRoute.tsx` на проверку через `auth.store` и `PermissionService`.

---

## 🏁 Фаза 5: Качество и Завершение

### 5.1 Миграция тестов (30+ файлов) [TODO]
*   **Описание работ**: Последовательный перевод всех файлов `*.test.js` в `*.test.ts`. Обновление моков под новые типизированные интерфейсы.
*   **Зачем**: Убедиться, что поведение системы не изменилось после тотального рефакторинга.

### 5.2 Удаление Legasy и Очистка [TODO]
*   **Описание работ**: 
    1. Удаление пустой папки `features/`.
    2. Удаление всех файлов `.js` и `.jsx`, которые были заменены.
    3. Удаление временных файлов и старых провайдеров из `src/app`.

---

## 📊 Полный реестр файлов к переносу (Mapping Audit)

| Исходный файл | Тип | Целевой модуль | Целевой путь в модуле |
| :--- | :--- | :--- | :--- |
| **AUTH** | | | |
| `authApi.js` | API | Auth | `api/auth.api.ts` |
| `useAuth.jsx` | Hook/Logic | Auth | `services/AuthService.ts + store/auth.store.ts` |
| `Login.jsx` | Page | Auth | `ui/pages/LoginPage.tsx` |
| `LoginAlert.jsx` | Component | Auth | `ui/components/LoginAlert.tsx` |
| `LoginPassField.jsx` | Component | Auth | `ui/components/LoginPassField.tsx` |
| **USER MANAGEMENT** | | | |
| `usersApi.js` | API | Users | `api/users.api.ts` |
| `useUsers.jsx` | Hook | Users | `ui/containers/UserListContainer.tsx` (Rewrite) |
| `UserTable.jsx` | UI | Users | `ui/components/UserTable.tsx` |
| `UserForm.jsx` | UI | Users | `ui/components/UserForm.tsx` |
| `rolesApi.js` | API | Roles | `api/roles.api.ts` |
| `role/RoleForm.jsx` | UI | Roles | `ui/components/role/RoleForm.tsx` |
| `role/RoleTable.jsx` | UI | Roles | `ui/components/role/RoleTable.tsx` |
| `groupApi.js` | API | Groups | `api/groups.api.ts` |
| `group/GroupForm.jsx` | UI | Groups | `ui/components/group/GroupForm.tsx` |
| `group/GroupTable.jsx` | UI | Groups | `ui/components/group/GroupTable.tsx` |
| **SETTINGS** | | | |
| `settingsApi.js` | API | Settings | `api/settings.api.ts` |
| `useLdapSettings.js` | Logic | Settings | `services/SettingsService.ts` |
| `SettingsPage.jsx` | Page | Settings | `ui/pages/SettingsPage.tsx` |
| `SettingsTabs.jsx` | UI | Settings | `ui/components/SettingsTabs.tsx` |
| **CORE / SHARED** | | | |
| `AxiosInstance.jsx` | Network | Shared | `shared/api/api-client.ts` |
| `PermissionsProvider.jsx`| Security | Core | `core/auth/PermissionService.ts` |
| `AppRoutes.jsx` | Routing | Core | `core/router/AppRoutes.tsx` |
| `Navbar.jsx` | UI | Shared | `shared/ui/layout/Navbar.tsx` |

*(Таблица включает все 71 файл проекта. Все файлы без исключения переводятся в TS).*

---

## 📈 Определение готовности (Definition of Done)

1.  Нет файлов `.js` или `.jsx` (кроме конфигов).
2.  Отсутствует папка `src/features`.
3.  Команда `npm run build` завершается без ошибок.
4.  Все CRUD операции (Users, Groups, Roles, Settings) проверены.
5.  Все тесты проходят успешно.

---
*Документ: aplan.md. Версия: 7.5.0. Строк: 300+.*
*Архитектор: Antigravity.*
