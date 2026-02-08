# План работ: Актуализация тестов (Раздел 4)

План выполнения задач из Раздела 4 документа `aplan_v2.md`. Основная цель — полный перевод тестовой базы (45 файлов) и инфраструктуры тестирования на TypeScript с обеспечением 100% проходимости тестов для **НОВОЙ АРХИТЕКТУРЫ**.

---

## 🏗️ Этап 1: Инфраструктура и MSW (Task 4.1)

Перед миграцией самих тестов необходимо подготовить почву: типизировать моки API и тестовые утилиты.

### Задачи
- [x] **1.1** `src/mocks/mockData.ts`: **Rename & Type**. Добавить интерфейсы для мок-данных.
- [x] **1.2** `src/mocks/handlers.ts`: **Rename & Type**. Типизировать MSW handlers, request/response bodies.
- [x] **1.3** `src/mocks/server.ts`: **Rename**. Простое переименование (типы подтянутся из `setupServer`).
- [x] **1.4** `src/mocks/test-helpers.ts`: **Rename & Type**. Типизировать `createStorageMock`, `createLocationMock`.
- [x] **1.5** `src/mocks/test-utils.tsx`: **Rename & Type**. Типизировать `renderWithProviders`, `AllTheProviders` (Updated to Core Providers).
- [x] **1.6** `vitest.config.ts`: **Verify**. Убедиться, что конфиг подхватывает `.ts` и `.tsx` файлы тестов.
- [x] **1.7** `src/setupTests.ts`: **Update**. Убрать `@ts-expect-error` после миграции моков.

**Критерий успеха этапа**: `npm run test` запускается без ошибок компиляции инфраструктуры. Инфраструктура использует новые провайдеры из `src/core`.

---

## 🔄 Этап 2: Миграция 45 тестовых файлов (Task 4.2)

Миграция с одновременным рефакторингом под новую архитектуру (`src/modules`, `src/core`, `src/shared`).

### Группа 2.0: Restore Legacy Components
Перед миграцией тестов необходимо восстановить сложные компоненты, которые были пропущены при рефакторинге.
- [x] **2.0.0 COMPONENT** `components/forms/TransferList.jsx` -> `modules/users/ui/components/TransferList.tsx`
    - *Описание*: Компонент содержит доменную логику (авто-выбор прав `users:*`). Мигрировать в модуль `users`.
    - *Действия*: Заменить заглушку `{/* TransferList placeholder */}` в `RoleForm.tsx` и `GroupForm.tsx`.
- [x] **2.0.1 COMPONENT** `components/layout/Navbar/Navbar.jsx` -> `core/layout/Navbar/Navbar.tsx`
    - *Описание*: Основной навигационный компонент (App Shell).
- [x] **2.0.2 COMPONENT** `components/layout/Navbar/UserAvatar.jsx` -> `core/layout/Navbar/UserAvatar.tsx`
- [x] **2.0.3 COMPONENT** `components/layout/Navbar/UserMenu.jsx` -> `core/layout/Navbar/UserMenu.tsx`
- [x] **2.0.4 CORE** `app/App.jsx` -> `app/App.tsx`, `app/main.jsx` -> `app/main.tsx`
    - *Описание*: Замена легаси `App.jsx` и `main.jsx`. Внедрение `AppProvider` (включает Router) и `RouterProvider`.
    - *Действия*: 
        1. `App.tsx`: использовать `AppProvider` и `RouterProvider` (передать `navbarLayout=<Navbar />`).
        2. `main.tsx`: убрать `BrowserRouter` (есть в AppProvider).
        3. `app/routes/AppRoutes.jsx`: перенести конфиг в `core/router/routes.config.ts`.

### Группа 2.1: Shared & Components
- [x] **2.1.1** `shared/api/AxiosInstance.test.jsx` -> `shared/api/api-client.test.tsx` (Test: `api-client.ts`)
- [x] **2.1.2** `shared/hooks/usePersistentState.test.js` -> `shared/hooks/usePersistentState.test.ts`
- [-] **2.1.3** `components/forms/IpAlert.test.jsx`: **DELETE** (Legacy, replaced by inline MUI Alert)
- [x] **2.1.4** `components/forms/TransferList.test.jsx` -> `modules/users/ui/components/TransferList.test.tsx` (Test: `TransferList.tsx` in users module)
- [x] **2.1.5** `components/layout/ConfirmDialog/ConfirmDialog.test.jsx` -> `shared/ui/Dialog/ConfirmDialog.test.tsx`
- [x] **2.1.6** `components/layout/Navbar/Navbar.test.jsx` -> `core/layout/Navbar/Navbar.test.tsx`
- [x] **2.1.7** `components/layout/Navbar/UserAvatar.test.jsx` -> `core/layout/Navbar/UserAvatar.test.tsx`
- [x] **2.1.8** `components/layout/Navbar/UserMenu.test.jsx` -> `core/layout/Navbar/UserMenu.test.tsx`

### Группа 2.2: App Infrastructure
- [x] **2.2.9** `app/App.test.jsx` -> `app/App.test.tsx`
- [-] **2.2.10** `app/AppContent.test.jsx`: **DELETE** (Obsolete, logic covered by `App.test.tsx`)
- [x] **2.2.11** `app/main.test.jsx` -> `app/main.test.tsx`
- [x] **2.2.12** `app/providers/AuthProvider.test.jsx` -> `core/providers/AuthProvider.test.tsx`
- [x] **2.2.13** `app/providers/I18nProvider.test.jsx` -> `core/providers/I18nProvider.test.tsx`
- [x] **2.2.14** `app/providers/PermissionsProvider.test.jsx` -> `core/auth/PermissionService.test.ts` & `core/auth/usePermissions.test.tsx` (Combined coverage for Store, Service, Hook)
- [x] **2.2.15** `app/providers/ToastProvider.test.jsx` -> `core/providers/ToastProvider.test.tsx`
- [x] **2.2.16** `app/routes/AppRoutes.test.jsx` -> `core/router/RouterProvider.test.tsx` (Created new unit test)
- [x] **2.2.17** `app/routes/ProtectedRoute.test.jsx` -> `core/router/ProtectedRoute.test.tsx`

### Группа 2.3: Feature - Auth
- [x] **2.3.18** `features/auth/components/LoginAlert.test.jsx` -> `modules/auth/ui/components/LoginAlert.test.tsx`
- [x] **2.3.19** `features/auth/components/LoginFormFields/LoginPassField.test.jsx` -> `modules/auth/ui/components/LoginPassField.test.tsx`
- [x] **2.3.20** `features/auth/components/LoginFormFields/LoginTextField.test.jsx` -> `modules/auth/ui/components/LoginTextField.test.tsx`
- [x] **2.3.21** `features/auth/hooks/useAuth.test.jsx` -> `modules/auth/ui/hooks/useAuth.test.tsx`
- [x] **2.3.22** `features/auth/pages/Login.test.jsx` -> `modules/auth/ui/pages/LoginPage.test.tsx`

### Группа 2.4: Feature - Content Pages
- [x] **2.4.23** `features/contentPages/pages/About.test.jsx` -> `modules/content/ui/pages/AboutPage.test.tsx`
- [x] **2.4.24** `features/contentPages/pages/Home.test.jsx` -> `modules/content/ui/pages/HomePage.test.tsx`

### Группа 2.5: Feature - Settings
- [x] **2.5.25** `features/settings/api/settingsApi.test.js` -> `modules/settings/api/settings.api.test.ts`
- [x] **2.5.26** `features/settings/components/SettingItem.test.jsx` -> `modules/settings/ui/components/SettingItem.test.tsx`
- [x] **2.5.27** `modules/settings/ui/components/SettingInputField.test.tsx` (New component test)
- [x] **2.5.28** `features/settings/hooks/useCoreSettings.test.jsx` -> `modules/settings/ui/hooks/useCoreSettings.test.tsx`
- [x] **2.5.29** `features/settings/hooks/useLdapSettings.test.jsx` -> `modules/settings/ui/hooks/useLdapSettings.test.tsx`
- [x] **2.5.30** `features/settings/pages/CoreSettingsItemsPage.test.jsx` -> `modules/settings/ui/pages/CoreSettingsPage.test.tsx`
- [x] **2.5.31** `modules/settings/ui/pages/LdapSettingsPage.test.tsx` (New page test)
- [x] **2.5.32** `modules/settings/ui/pages/SettingsPage.test.tsx` (Tabs integration test)

### Группа 2.6: Feature - User Management
- [x] **2.6.31** `features/userManagement/components/group/GroupForm.test.jsx` -> `modules/users/ui/components/GroupForm.test.tsx` DONE
- [x] **2.6.32** `features/userManagement/components/group/GroupTable.test.jsx` -> `modules/users/ui/components/GroupTable.test.tsx` DONE
- [x] **2.6.33** `features/userManagement/components/role/RoleForm.test.jsx` -> `modules/users/ui/components/RoleForm.test.tsx` DONE
- [x] **2.6.34** `features/userManagement/components/role/RoleTable.test.jsx` -> `modules/users/ui/components/RoleTable.test.tsx` DONE
- [x] **2.6.35** **MIGRATE & TEST** `features/userManagement/components/user/PermissionsReportDialog.jsx` -> `modules/users/ui/components/PermissionsReportDialog.tsx` & `.test.tsx` DONE
    - *Action*: Restore component from legacy, add `getPermissionsReport` to `users.api.ts`, integrate in `UserTabPage.tsx`.
- [x] **2.6.36** `features/userManagement/components/user/UserForm.test.jsx` -> `modules/users/ui/components/UserForm.test.tsx` DONE
    - *Action*: **INTEGRATE TransferList** into `UserForm.tsx` (component exists, need to replace placeholder).
- [x] **2.6.37** `features/userManagement/components/user/UserTable.test.jsx` -> `modules/users/ui/components/UserTable.test.tsx` DONE
- [x] **2.6.38** `features/userManagement/hooks/useGroups.test.jsx` -> `modules/users/ui/hooks/useGroups.test.tsx` DONE
- [x] **2.6.39** `features/userManagement/hooks/usePermissions.test.jsx` -> `core/auth/usePermissions.test.tsx` (Moved to Core, checked `core/auth` test and created `usePermissionsList.test.tsx`) DONE
- [x] **2.6.40** `features/userManagement/hooks/useRoles.test.jsx` -> `modules/users/ui/hooks/useRoles.test.tsx` DONE
- [x] **2.6.41** `features/userManagement/hooks/useUsers.test.jsx` -> `modules/users/ui/hooks/useUsers.test.tsx` DONE
- [x] **2.6.42** `features/userManagement/pages/GroupTabPage.test.jsx` -> `modules/users/ui/pages/GroupTabPage.test.tsx` DONE
- [x] **2.6.43** `features/userManagement/pages/RoleTabPage.test.jsx` -> `modules/users/ui/pages/RoleTabPage.test.tsx` DONE
- [x] **2.6.44** `features/userManagement/pages/UserManagementPage.test.jsx` -> `modules/users/ui/pages/UserManagementPage.test.tsx` DONE
- [x] **2.6.45** `features/userManagement/pages/UserTabPage.test.jsx` -> `modules/users/ui/pages/UserTabPage.test.tsx` DONE
- [x] **2.6.46** `NEW` `modules/users/api/users.api.test.ts` (Verified transformation logic) DONE
- [x] **2.6.47** `NEW` `modules/users/api/roles.api.test.ts` (Skipped: Trivial proxy) DONE
- [x] **2.6.48** `NEW` `modules/users/api/groups.api.test.ts` (Skipped: Trivial proxy) DONE
*(Note: Hooks might be replaced by Services + TanStack Query hooks, so tests should verify the Service or the Query Hook)*

---

## 🚀 Этап 3: Интеграционные тесты (Task 4.3)

Создание E2E сценариев для проверки критических путей на TypeScript.

### Задачи
- [ ] **3.1** **Authentication Flow**: Login -> Access Protected Route -> Logout -> Redirect to Login
- [ ] **3.2** **User CRUD**: Create User -> List Shows User -> Edit User -> Delete User
- [ ] **3.3** **Settings Flow**: Change Settings -> Save -> Verify Persistence

---

## ✅ Критерии готовности (Definition of Done)

1. **Компиляция**: `tsc --noEmit` не выдает ошибок на тестовых файлах.
2. **Тесты**: `npm run test` проходит успешно (все тесты новой архитектуры pass).
3. **Legacy Tests**: Старые файлы из `src/features` удалены.
