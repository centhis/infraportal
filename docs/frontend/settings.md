# Модуль Settings

## Обзор

Модуль `settings` управляет системными настройками приложения:
- **Core Settings** — основные настройки (часовой пояс, язык)
- **LDAP Settings** — настройки интеграции с LDAP

## Структура модуля

```
src/modules/settings/
├── api/
│   ├── settings.api.ts       # coreSettingsApi, ldapSettingsApi
│   └── settings.dto.ts       # CoreSettings, LdapSettings
│
├── ui/
│   ├── pages/
│   │   ├── SettingsPage.tsx         # Главная страница с табами
│   │   ├── CoreSettingsPage.tsx     # Основные настройки
│   │   └── LdapSettingsPage.tsx     # LDAP настройки
│   │
│   ├── components/
│   │   ├── CoreSettingsForm.tsx
│   │   ├── LdapSettingsForm.tsx
│   │   └── LdapConnectionTest.tsx   # Тест подключения
│   │
│   └── hooks/
│       ├── useCoreSettings.ts       # useQuery/useMutation
│       └── useLdapSettings.ts
│
├── routes.ts
└── index.ts
```

---

## API

### settings.api.ts

```typescript
// src/modules/settings/api/settings.api.ts
import { apiClient } from '@shared/api/api-client';
import { API_ENDPOINTS } from '@shared/constants/apiEndpoints';
import type { CoreSettings, LdapSettings } from './settings.dto';

export const coreSettingsApi = {
    get: async () => {
        const { data } = await apiClient.get<CoreSettings>(
            API_ENDPOINTS.SETTINGS.CORE
        );
        return data;
    },
    
    update: async (settings: Partial<CoreSettings>) => {
        const { data } = await apiClient.put<CoreSettings>(
            API_ENDPOINTS.SETTINGS.CORE,
            settings
        );
        return data;
    },
};

export const ldapSettingsApi = {
    get: async () => {
        const { data } = await apiClient.get<LdapSettings>(
            API_ENDPOINTS.SETTINGS.LDAP
        );
        return data;
    },
    
    update: async (settings: Partial<LdapSettings>) => {
        const { data } = await apiClient.put<LdapSettings>(
            API_ENDPOINTS.SETTINGS.LDAP,
            settings
        );
        return data;
    },
    
    testConnection: async () => {
        const { data } = await apiClient.post<{ success: boolean; message: string }>(
            `${API_ENDPOINTS.SETTINGS.LDAP}/test`
        );
        return data;
    },
};
```

### settings.dto.ts

```typescript
// src/modules/settings/api/settings.dto.ts
export interface CoreSettings {
    timezone: string;
    language: string;
    date_format: string;
}

export interface LdapSettings {
    enabled: boolean;
    uri: string;
    base_dn: string;
    bind_dn: string;
    bind_password?: string;
    user_filter: string;
    sync_schedule: string;
}
```

---

## Хуки

### useLdapSettings.ts

```typescript
// src/modules/settings/ui/hooks/useLdapSettings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ldapSettingsApi } from '../../api/settings.api';

export function useLdapSettings() {
    return useQuery({
        queryKey: ['settings', 'ldap'],
        queryFn: ldapSettingsApi.get,
    });
}

export function useUpdateLdapSettings() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ldapSettingsApi.update,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings', 'ldap'] });
        },
    });
}

export function useTestLdapConnection() {
    return useMutation({
        mutationFn: ldapSettingsApi.testConnection,
    });
}
```

---

## Страницы

### LdapSettingsPage

```tsx
// src/modules/settings/ui/pages/LdapSettingsPage.tsx
import { useLdapSettings, useUpdateLdapSettings, useTestLdapConnection } from '../hooks/useLdapSettings';
import { LdapSettingsForm } from '../components/LdapSettingsForm';

export function LdapSettingsPage() {
    const { data: settings, isLoading } = useLdapSettings();
    const updateMutation = useUpdateLdapSettings();
    const testMutation = useTestLdapConnection();
    
    if (isLoading) return <CircularProgress />;
    
    const handleSave = (values: LdapSettings) => {
        updateMutation.mutate(values);
    };
    
    const handleTest = () => {
        testMutation.mutate(undefined, {
            onSuccess: (result) => {
                if (result.success) {
                    toast.success('Подключение успешно!');
                } else {
                    toast.error(result.message);
                }
            },
        });
    };
    
    return (
        <Box>
            <Typography variant="h5">Настройки LDAP</Typography>
            
            <LdapSettingsForm 
                defaultValues={settings}
                onSubmit={handleSave}
                loading={updateMutation.isPending}
            />
            
            <Button 
                onClick={handleTest}
                loading={testMutation.isPending}
            >
                Тест подключения
            </Button>
        </Box>
    );
}
```

---

## Маршруты

```typescript
// src/modules/settings/routes.ts
import { RouteObject } from 'react-router-dom';

export const settingsRoutes: RouteObject[] = [
    {
        path: 'settings',
        element: <SettingsPage />,
        children: [
            { index: true, element: <Navigate to="core" /> },
            { path: 'core', element: <CoreSettingsPage /> },
            { path: 'ldap', element: <LdapSettingsPage /> },
        ],
    },
];
```

---

## Права доступа

```typescript
// src/modules/settings/permissions.ts
export const SETTINGS_PERMISSIONS = {
    VIEW: 'settings:view',
    EDIT: 'settings:edit',
    LDAP_TEST: 'settings:ldap:test',
};
```
