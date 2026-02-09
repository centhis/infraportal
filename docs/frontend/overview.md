# Обзор Frontend

Фронтенд проекта Infraportal — одностраничное приложение (SPA) на React с TypeScript. Использует модульную архитектуру, где каждый бизнес-домен изолирован в отдельный модуль.

## Ключевые технологии

| Технология | Назначение |
|------------|------------|
| **React 18** | UI-библиотека |
| **TypeScript** | Строгая типизация |
| **Vite** | Сборщик проекта |
| **TanStack Query** | Серверное состояние, кеширование |
| **Zustand** | Клиентское состояние |
| **React Router 6** | Маршрутизация |
| **Material-UI** | UI-компоненты |
| **Axios** | HTTP-клиент |
| **React Hook Form** | Управление формами |
| **i18next** | Интернационализация |
| **Vitest + RTL** | Тестирование |
| **MSW** | Мокирование API |

## Структура проекта

```
src/
├── app/                      # Точка входа приложения
│   ├── App.tsx               # Корневой компонент
│   └── main.tsx              # Точка входа React
│
├── core/                     # Ядро приложения
│   ├── providers/            # AuthProvider, I18nProvider, ToastProvider
│   ├── router/               # RouterProvider, ProtectedRoute
│   ├── layout/               # Navbar, глобальный layout
│   └── auth/                 # PermissionService, usePermissions
│
├── shared/                   # Общий переиспользуемый код
│   ├── api/                  # api-client.ts с interceptors
│   ├── ui/                   # UI-компоненты (Button, TextField, Dialog)
│   ├── hooks/                # Общие хуки
│   └── constants/            # apiEndpoints.ts, routes.ts
│
├── modules/                  # Бизнес-модули
│   ├── auth/                 # Аутентификация
│   ├── users/                # Пользователи, роли, группы
│   ├── settings/             # Настройки (Core, LDAP)
│   └── content/              # Контентные страницы
│
├── i18n/                     # Переводы (en/, ru/)
├── mocks/                    # MSW handlers
└── types/                    # Глобальные типы
```

> Подробнее см. [Архитектура](architecture.md)

## Настройка окружения

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
npm run test
```

## Документация

- [Архитектура](architecture.md) — структура, паттерны, правила
- [Взаимодействие с API](api_interaction.md) — api-client, TanStack Query
- [Управление состоянием](state_management.md) — Zustand, Query
- [Маршрутизация](routing.md) — роутер, защищённые маршруты
- [Компоненты](components_and_layout.md) — UI-компоненты, layout
- [Тестирование](testing.md) — Vitest, RTL, MSW
- [Настройки](settings.md) — модуль settings
- [i18n](internationalization.md) — интернационализация
