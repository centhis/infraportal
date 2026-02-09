# Тестирование

## Технологии

| Инструмент | Назначение |
|------------|------------|
| **Vitest** | Test runner (совместим с Jest API) |
| **React Testing Library** | Тестирование React-компонентов |
| **MSW** | Мокирование API |
| **@testing-library/user-event** | Симуляция пользовательских действий |

---

## Запуск тестов

```bash
# Все тесты
npm run test

# Watch mode
npm run test -- --watch

# Один файл
npm run test -- src/modules/users/ui/hooks/useUsers.test.ts

# С покрытием
npm run test -- --coverage
```

---

## Структура тестов

```
src/
├── __tests__/
│   ├── integration/          # Интеграционные тесты
│   │   ├── auth-flow.test.tsx
│   │   └── users-crud.test.tsx
│   └── architecture.test.ts  # Архитектурные проверки
│
├── modules/
│   └── users/
│       ├── api/
│       │   └── users.api.test.ts     # Тест API-слоя
│       └── ui/
│           ├── hooks/
│           │   └── useUsers.test.tsx  # Тест хуков
│           ├── components/
│           │   └── UserTable.test.tsx # Тест компонента
│           └── pages/
│               └── UserManagementPage.test.tsx
│
└── mocks/
    ├── handlers.ts           # MSW handlers
    ├── server.ts             # MSW server
    └── test-utils.tsx        # Custom render
```

---

## Конфигурация

### vitest.config.ts

```typescript
export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['src/setupTests.ts'],
    },
});
```

### setupTests.ts

```typescript
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Custom Render

```typescript
// src/mocks/test-utils.tsx
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

function AllProviders({ children }: { children: ReactNode }) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    
    return (
        <QueryClientProvider client={queryClient}>
            <I18nextProvider i18n={i18n}>
                <MemoryRouter>
                    {children}
                </MemoryRouter>
            </I18nextProvider>
        </QueryClientProvider>
    );
}

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
    return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
export { renderWithProviders as render };
```

---

## Примеры тестов

### Unit-тест компонента

```tsx
// src/modules/users/ui/components/UserTable.test.tsx
import { render, screen } from '@mocks/test-utils';
import { UserTable } from './UserTable';

const mockUsers = [
    { id: 1, login: 'admin', name: 'Admin' },
    { id: 2, login: 'user1', name: 'User One' },
];

describe('UserTable', () => {
    it('renders users list', () => {
        render(<UserTable users={mockUsers} />);
        
        expect(screen.getByText('admin')).toBeInTheDocument();
        expect(screen.getByText('User One')).toBeInTheDocument();
    });
    
    it('shows empty state when no users', () => {
        render(<UserTable users={[]} />);
        
        expect(screen.getByText(/no users/i)).toBeInTheDocument();
    });
});
```

### Тест хука с TanStack Query

```tsx
// src/modules/users/ui/hooks/useUsers.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUsers } from './useUsers';

function wrapper({ children }: { children: ReactNode }) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}

describe('useUsers', () => {
    it('fetches users successfully', async () => {
        const { result } = renderHook(() => useUsers(), { wrapper });
        
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        
        expect(result.current.data).toHaveLength(2);
    });
});
```

### Интеграционный тест

```tsx
// src/__tests__/integration/auth-flow.test.tsx
import { render, screen, waitFor } from '@mocks/test-utils';
import userEvent from '@testing-library/user-event';
import { App } from '@app/App';

describe('Authentication Flow', () => {
    it('redirects to login when not authenticated', async () => {
        render(<App />);
        
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
        });
    });
    
    it('shows home page after successful login', async () => {
        const user = userEvent.setup();
        render(<App />);
        
        await user.type(screen.getByLabelText(/login/i), 'admin');
        await user.type(screen.getByLabelText(/password/i), 'password');
        await user.click(screen.getByRole('button', { name: /login/i }));
        
        await waitFor(() => {
            expect(screen.getByText(/welcome/i)).toBeInTheDocument();
        });
    });
});
```

---

## MSW Handlers

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
    // Auth
    http.post('/api/v1/auth/login', () => {
        return HttpResponse.json({
            access_token: 'mock-token',
            user: { id: 1, login: 'admin' },
        });
    }),
    
    // Users
    http.get('/api/v1/users', () => {
        return HttpResponse.json({
            items: [
                { id: 1, login: 'admin', name: 'Admin' },
                { id: 2, login: 'user1', name: 'User One' },
            ],
            total: 2,
        });
    }),
    
    http.post('/api/v1/users', async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({ id: 3, ...body }, { status: 201 });
    }),
];
```

---

## Архитектурные тесты

```typescript
// src/__tests__/architecture.test.ts
describe('Architecture Rules', () => {
    it('shared/ should not import from modules/', () => {
        // Проверяет, что shared/ не зависит от modules/
    });
});
```
