# Управление состоянием

## Типы состояния

| Тип | Инструмент | Примеры |
|-----|------------|---------|
| **Серверное** | TanStack Query | Пользователи, настройки, данные API |
| **Клиентское глобальное** | Zustand | Права доступа, UI-состояние навбара |
| **Локальное** | useState/useReducer | Форма, модалка, пагинация |
| **Аутентификация** | React Context | Текущий пользователь, токены |

---

## TanStack Query (Серверное состояние)

Все данные с сервера кешируются и синхронизируются через TanStack Query.

### Конфигурация

```typescript
// src/app/App.tsx
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,  // 5 минут
            retry: 1,
        },
    },
});
```

### Query — получение данных

```typescript
// src/modules/users/ui/hooks/useUsers.ts
export function useUsers() {
    return useQuery({
        queryKey: ['users'],
        queryFn: () => usersApi.list(),
    });
}

// Использование
const { data, isLoading, error, refetch } = useUsers();
```

### Mutation — изменение данных

```typescript
export function useCreateUser() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: usersApi.create,
        onSuccess: () => {
            // Инвалидация кеша после успешного создания
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

// Использование
const { mutate, isPending } = useCreateUser();
mutate(userData);
```

### Query Keys

Структура ключей:

```typescript
['users']                    // Список пользователей
['users', { page: 1 }]       // С пагинацией
['user', 123]                // Конкретный пользователь
['settings', 'ldap']         // LDAP настройки
```

---

## Zustand (Глобальное клиентское состояние)

Используется, когда данные нужны во многих компонентах и не связаны с API.

### Пример: Права доступа

```typescript
// src/core/auth/permissions.store.ts
import { create } from 'zustand';

interface PermissionsState {
    permissions: string[];
    setPermissions: (permissions: string[]) => void;
    hasPermission: (permission: string) => boolean;
}

export const usePermissionsStore = create<PermissionsState>((set, get) => ({
    permissions: [],
    setPermissions: (permissions) => set({ permissions }),
    hasPermission: (permission) => get().permissions.includes(permission),
}));
```

### Использование

```tsx
function Navbar() {
    const hasPermission = usePermissionsStore((s) => s.hasPermission);
    
    if (!hasPermission('users:view')) return null;
    
    return <UsersLink />;
}
```

---

## React Context (Аутентификация)

### AuthProvider

```typescript
// src/core/providers/AuthProvider.tsx
interface AuthContextValue {
    user: User | null;
    isAuthenticated: boolean;
    login: (credentials: Credentials) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    
    const login = async (credentials: Credentials) => {
        const { user, token } = await authApi.login(credentials);
        localStorage.setItem('access_token', token);
        setUser(user);
    };
    
    const logout = async () => {
        await authApi.logout();
        localStorage.removeItem('access_token');
        setUser(null);
    };
    
    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
```

---

## Локальное состояние

### useState

```tsx
function UserForm() {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState<UserFormData>({});
    
    return (
        <Dialog open={open} onClose={() => setOpen(false)}>
            <UserFormContent data={formData} onChange={setFormData} />
        </Dialog>
    );
}
```

### React Hook Form

```tsx
function LoginForm() {
    const { register, handleSubmit, formState: { errors } } = useForm<LoginData>();
    
    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <TextField {...register('login', { required: true })} />
            {errors.login && <span>Login required</span>}
        </form>
    );
}
```

---

## Когда что использовать

```
┌─────────────────────────────────────────────────────┐
│                    Данные с сервера?                │
│                         ↓                           │
│          ДА → TanStack Query (useQuery)             │
│          НЕТ → Локальное или глобальное?            │
│                         ↓                           │
│       Нужно в разных частях приложения?             │
│          ДА → Zustand store                         │
│          НЕТ → useState / useReducer                │
└─────────────────────────────────────────────────────┘
```
