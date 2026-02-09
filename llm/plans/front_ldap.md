# План имплементации домена Tasks и расширения LDAP функциональности

Этот план описывает создание домена `tasks`, мониторинг через Flower и интеграцию кнопки синхронизации LDAP с соблюдением требований к правам доступа и UI-поведению.

---

## 1. Бэкенд (Backend)

### 1.1 Модуль Tasks: Статус воркеров через Flower
- **Задача 1.1.1** [MODIFY] [tasks/api/tasks.py](file:///home/centhis/infraportal/backend/app/tasks/api/tasks.py)
  - **Описание**: Добавить эндпоинт `GET /api/v1/tasks/workers/health` для получения состояния воркеров.
  - **Ожидаемый результат**: Эндпоинт доступен и возвращает данные в формате `WorkerHealthResponseSchema`.
  - **Статус**: Готово
- **Задача 1.1.2** [MODIFY] [tasks/services.py](file:///home/centhis/infraportal/backend/app/tasks/services.py)
  - **Описание**: Добавить метод `get_workers_health()` в `TaskService`, который выполняет асинхронный запрос к Flower API (`/api/workers`).
  - **Ожидаемый результат**: Метод корректно парсит ответ Flower и возвращает количество активных воркеров.
  - **Статус**: Готово
- **Задача 1.1.3** [NEW] [tasks/schemas.py](file:///home/centhis/infraportal/backend/app/tasks/schemas.py)
  - **Описание**: Описать схему `WorkerHealthResponseSchema` для валидации ответа о состоянии воркеров.
  - **Ожидаемый результат**: Схема содержит поля `active_workers` (int) и `status` (str).
  - **Статус**: Готово

### 1.2 Настройки: Автоматизация планировщика
- **Задача 1.2.1** [MODIFY] [settings/ldap/services.py](file:///home/centhis/infraportal/backend/app/settings/ldap/services.py)
  - **Описание**: Добавить вызов `scheduler.create_or_update_periodic_task` в функции массового и одиночного обновления настроек LDAP.
  - **Ожидаемый результат**: При сохранении нового расписания (Cron) или включении/выключении LDAP, задача `users:sync_ldap` в Celery Beat обновляется автоматически.
  - **Статус**: В очереди

### 1.3 Безопасность и задачи (Permissions)
- **Задача 1.3.1** [MODIFY] [users/ldap/tasks.py](file:///home/centhis/infraportal/backend/app/users/ldap/tasks.py)
  - **Описание**: Настроить регистрацию задачи `users:sync_ldap`.
  - **Ожидаемый результат**: Задача зарегистрирована в `TASK_REGISTRY`.
  - **Статус**: В очереди
- **Задача 1.3.2** [MODIFY] [tasks/services.py](file:///home/centhis/infraportal/backend/app/tasks/services.py)
  - **Описание**: Реализовать проверку набора прав (`users:create`, `users:update`, `users:delete`) перед запуском задачи синхронизации.
  - **Ожидаемый результат**: Пользователи без полного набора прав получают 403 Forbidden при попытке запуска.
  - **Статус**: В очереди

---

## 2. Фронтенд (Frontend)

### 2.1 Модуль Tasks
  - **Описание**: Описать интерфейсы `WorkerHealth` (включая `workers` stats, memory usage) и `TaskExecution`.
  - **Ожидаемый результат**: Типы соответствуют Pydantic-схемам бэкенда.
  - **Статус**: Готово
- **Задача 2.1.2** [NEW] [api/tasks.api.ts](file:///home/centhis/infraportal/frontend/src/modules/tasks/api/tasks.api.ts)
  - **Описание**: Создать методы `getWorkersHealth`, `runTask` и `getExecutionStatus`.
  - **Ожидаемый результат**: API-клиент может запрашивать статус воркеров и управлять задачами.
  - **Статус**: Готово
- **Задача 2.1.3** [NEW] [ui/hooks/useWorkerHealth.ts](file:///home/centhis/infraportal/frontend/src/modules/tasks/ui/hooks/useWorkerHealth.ts)
  - **Описание**: Реализовать хук на базе TanStack Query с polling каждые 30 секунд.
  - **Ожидаемый результат**: Данные о воркерах обновляются автоматически в фоновом режиме.
  - **Статус**: Готово
- **Задача 2.1.4** [NEW] [ui/hooks/useTaskExecution.ts](file:///home/centhis/infraportal/frontend/src/modules/tasks/ui/hooks/useTaskExecution.ts)
  - **Описание**: Реализовать хук для отслеживания прогресса запущенной задачи до её завершения (polling).
  - **Ожидаемый результат**: Хук возвращает статус выполнения (PENDING, SUCCESS, FAILURE).
  - **Статус**: Готово

### 2.2 Интеграция в Navbar
- **Задача 2.2.1** [MODIFY] [core/layout/Navbar/Navbar.tsx](file:///home/centhis/infraportal/frontend/src/core/layout/Navbar/Navbar.tsx)
  - **Описание**: Внедрить компонент `WorkerStatusIndicator`.
  - **Ожидаемый результат**: В шапке сайта отображается "лампочка" статуса системы.
  - **Статус**: Готово

### 2.3 Интеграция в User Management
- **Задача 2.3.1** [NEW] [modules/users/ui/components/LdapSyncButton.tsx](file:///home/centhis/infraportal/frontend/src/modules/users/ui/components/LdapSyncButton.tsx)
  - **Описание**: Реализовать кнопку синхронизации с проверкой `LDAP_ENABLED`, прав доступа, отображением спиннера и выводом Toast.
  - **Ожидаемый результат**: Кнопка функциональна, визуально не ломает верстку и информирует пользователя об ошибках.
  - **Статус**: Готово
- **Задача 2.3.2** [MODIFY] [modules/users/ui/pages/UserTabPage.tsx](file:///home/centhis/infraportal/frontend/src/modules/users/ui/pages/UserTabPage.tsx)
  - **Описание**: Разместить кнопку в тулбаре действий над таблицей пользователей.
  - **Ожидаемый результат**: Кнопка доступна уполномоченным пользователям на вкладке "Пользователи".
  - **Статус**: Готово

---

## 3. Качество и документация (Quality & Documentation)

### 3.1 Тестирование (Backend & Frontend)
- **Задача 3.1.1** [NEW] [backend/tests/test_tasks_health.py](file:///home/centhis/infraportal/backend/tests/test_tasks_health.py)
  - **Описание**: Написать тесты для нового эндпоинта `tasks/workers/health` с мокированием Flower API.
  - **Ожидаемый результат**: Тесты подтверждают корректность обработки ответов Flower.
  - **Статус**: Готово
- **Задача 3.1.2** [NEW] [frontend/src/modules/tasks/ui/hooks/useWorkerHealth.test.ts](file:///home/centhis/infraportal/frontend/src/modules/tasks/ui/hooks/useWorkerHealth.test.ts)
  - **Описание**: Протестировать хук `useWorkerHealth` на корректность запросов и интервалов обновления.
  - **Ожидаемый результат**: Хук корректно обрабатывает состояния загрузки и ошибки.
  - **Статус**: Готово
- **Задача 3.1.3** [NEW] [frontend/src/modules/users/ui/components/LdapSyncButton.test.tsx](file:///home/centhis/infraportal/frontend/src/modules/users/ui/components/LdapSyncButton.test.tsx)
  - **Описание**: Unit-тест для кнопки синхронизации: проверка состояний Disabled/Enabled в зависимости от прав и флага `LDAP_ENABLED`.
  - **Ожидаемый результат**: Кнопка ведет себя согласно бизнес-логике.
  - **Статус**: Готово
- **Задача 3.1.4** [CHECK] Frontend Integration
  - **Описание**: Проверить корректность отображения спиннера при активной мутации и появление Toast при ошибке.
  - **Ожидаемый результат**: UI предоставляет обратную связь пользователю.
  - **Статус**: В очереди

### 3.2 Линтинг и стандарты
- **Задача 3.2.1** [CHECK] Backend Linting
  - **Описание**: Запустить `ruff` и `lang_linter --lang` для бэкенда.
  - **Ожидаемый результат**: Код соответствует стандартам PEP8 и языковым правилам проекта.
  - **Статус**: В очереди
- **Задача 3.2.2** [CHECK] Frontend Linting
  - **Описание**: Запустить `npm run lint` для фронтенда.
  - **Ожидаемый результат**: ESLint и TypeScript проверки проходят без ошибок.
  - **Статус**: В очереди

### 3.3 Обновление документации и промтов
- **Задача 3.3.1** [MODIFY] [docs/backend/tasks.md](file:///home/centhis/infraportal/docs/backend/tasks.md)
  - **Описание**: Отразить новый эндпоинт мониторинга и логику автоматизации планировщика.
  - **Ожидаемый результат**: Техническая документация актуальна.
  - **Статус**: В очереди
- **Задача 3.3.2** [MODIFY] [llm/prompts/backend-llm.md](file:///home/centhis/infraportal/llm/prompts/backend-llm.md)
  - **Описание**: Обновить древо структуры проекта и список эндпоинтов в бэкенд-промте.
  - **Ожидаемый результат**: Промт содержит актуальную информацию о модуле `tasks`.
  - **Статус**: В очереди
- **Задача 3.3.3** [MODIFY] [llm/prompts/front-llm.md](file:///home/centhis/infraportal/llm/prompts/front-llm.md)
  - **Описание**: Обновить древо структуры проекта и константы эндпоинтов во фронтенд-промте.
  - **Ожидаемый результат**: Промт содержит актуальную информацию о домене `tasks`.
  - **Статус**: В очереди

---

## Верификация
- [ ] Manual: Проверить, что кнопка исчезает при `LDAP_ENABLED=false`.
- [ ] Manual: Проверить, что кнопка заблокирована для пользователя с правами "только чтение".
- [ ] Manual: Проверить отображение спиннера при синхронизации.
- [ ] Manual: Симулировать ошибку бэкенда и проверить появление toast-уведомления.
- [ ] Admin: Проверить обновление расписания в БД при смене настроек.
- [ ] Check: Пройдены тесты бэкенда (`pytest backend/tests/test_tasks_health.py`).
- [ ] Check: Пройдены тесты фронтенда (`npm run test` в модуле tasks).
- [ ] Check: Линтер бэкенда (`ruff`, `lang_linter --lang`) не выдает ошибок.
- [ ] Check: Линтер фронтенда (`npm run lint`, `tsc`) не выдает ошибок.
- [ ] Check: Бэкенд-промт (`llm/prompts/backend-llm.md`) актуализирован.
- [ ] Check: Фронтенд-промт (`llm/prompts/front-llm.md`) актуализирован.
