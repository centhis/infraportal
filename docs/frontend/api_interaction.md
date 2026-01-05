# Документация по взаимодействию с API

Этот документ описывает, как фронтенд-приложение взаимодействует с бэкенд API, центральным элементом которого является настроенный экземпляр `Axios`.

## Централизованный `AxiosInstance`

Вместо того чтобы использовать `axios` напрямую, все API-запросы в проекте должны проходить через преднастроенный экземпляр, который находится в `frontend/src/shared/api/AxiosInstance.jsx`. Этот экземпляр инкапсулирует всю логику, связанную с аутентификацией.

### Ключевые особенности `AxiosInstance`

#### 1. Базовая конфигурация

-   **`baseURL`**: Адрес API, берется из переменной окружения `VITE_API_URL`.
-   **`withCredentials: true`**: Указывает, что `axios` должен отправлять httpOnly-cookie (в нашем случае `refresh_token`) с каждым запросом.
-   **Заголовки**: По умолчанию устанавливаются заголовки `Content-Type: application/json` и `Accept: application/json`.

#### 2. Перехватчик запросов (Request Interceptor)

Перед каждым запросом срабатывает перехватчик, который:
1.  Считывает `access_token` из `localStorage`.
2.  Если токен существует, он добавляет его в заголовок `Authorization` в формате `Bearer <token>`.

Это избавляет от необходимости добавлять токен вручную в каждом запросе.

#### 3. Перехватчик ответов (Response Interceptor) — Автоматическое обновление токена

Это самая важная часть экземпляра `Axios`. Она реализует логику автоматического обновления `access_token` в случае его истечения.

**Алгоритм работы:**
1.  Если API возвращает ошибку `401 Unauthorized` (что означает, что `access_token` истек или невалиден).
2.  Перехватчик "замораживает" исходный запрос и инициирует `GET` запрос на эндпоинт `/api/v1/auth/refresh`. Этот запрос использует `refresh_token` из httpOnly cookie для получения нового `access_token`.
3.  Пока идет процесс обновления, все остальные API-запросы, которые также завершились с ошибкой `401`, ставятся в очередь ожидания.
4.  **В случае успеха**:
    *   Новый `access_token` сохраняется в `localStorage`.
    *   Исходный (и все запросы из очереди) повторяются с новым токеном.
    *   Для пользователя все происходит прозрачно, он не выходит из системы.
5.  **В случае ошибки** (например, `refresh_token` тоже истек):
    *   Все данные аутентификации из `localStorage` удаляются.
    *   Пользователя перенаправляет на страницу логина (`/login`).

## API-модули

Логика запросов для каждой "фичи" вынесена в собственные сервисы или API-файлы, например, `features/userManagement/services/usersService.js`. Эти файлы импортируют и используют настроенный `AxiosInstance`.

**Пример (`usersService.js`):**
```javascript
import AxiosInstance from "../../../shared/api/AxiosInstance";
import { API_ENDPOINTS } from "../../../shared/constants/apiEndpoints";

export const usersService = {
    list: async (params) => {
        const response = await AxiosInstance.get(API_ENDPOINTS.USERS.LIST, { params });
        return response.data;
    },
    create: async (user) => {
        const response = await AxiosInstance.post(API_ENDPOINTS.USERS.CREATE, user);
        return response.data;
    },
    // ... другие методы
};
```

## Пример использования в хуках

Кастомные хуки (`features/.../hooks/`) используют эти сервисные функции для получения и управления данными.

**Пример (`useUsers.jsx`):**
```javascript
import { useEffect, useState, useCallback } from "react";
import { usersService } from "../services/usersService";

export default function useUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const refetchUsers = useCallback(async () => {
        setLoading(true);
        // Вызов функции из сервиса, которая использует AxiosInstance
        const data = await usersService.list({ skip: 0, limit: 10 });
        setUsers(data.users);
        setLoading(false);
    }, []);

    useEffect(() => {
        refetchUsers();
    }, [refetchUsers]);

    return { users, loading, refetchUsers };
}
```

Такая архитектура (`Компонент -> Хук -> Сервис -> AxiosInstance`) позволяет четко разделить обязанности и делает компоненты чистыми, не обременяя их логикой HTTP-запросов и управления токенами.
