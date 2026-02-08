# Компоненты и Layout

## Структура UI-компонентов

### Уровни компонентов

| Уровень | Расположение | Описание |
|---------|--------------|----------|
| **Shared** | `src/shared/ui/` | Базовые UI-примитивы без бизнес-логики |
| **Core Layout** | `src/core/layout/` | Глобальный layout (Navbar, Sidebar) |
| **Module Components** | `src/modules/*/ui/components/` | Доменные компоненты |
| **Module Pages** | `src/modules/*/ui/pages/` | Точки входа для роутера |
| **Module Containers** | `src/modules/*/ui/containers/` | Компоненты с подключением к данным |

---

## Shared UI (`src/shared/ui/`)

Базовые компоненты без бизнес-логики. Построены на Material-UI.

```
src/shared/ui/
├── Button/
│   └── Button.tsx
├── TextField/
│   └── TextField.tsx
├── Dialog/
│   ├── ConfirmDialog.tsx
│   └── FormDialog.tsx
├── Table/
│   └── DataTable.tsx
└── index.ts              # Реэкспорт
```

### Пример: ConfirmDialog

```tsx
// src/shared/ui/Dialog/ConfirmDialog.tsx
interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
}

export function ConfirmDialog({ 
    open, title, message, onConfirm, onCancel, 
    confirmText = 'Confirm', cancelText = 'Cancel',
    loading 
}: ConfirmDialogProps) {
    return (
        <Dialog open={open} onClose={onCancel}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>{message}</DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>{cancelText}</Button>
                <Button onClick={onConfirm} loading={loading} variant="contained">
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
```

---

## Core Layout (`src/core/layout/`)

### Navbar

```tsx
// src/core/layout/Navbar/Navbar.tsx
import { useAuth } from '@core/providers/AuthProvider';
import { Can } from '@core/auth';

export function Navbar() {
    const { user, logout } = useAuth();
    
    return (
        <AppBar>
            <Toolbar>
                <Logo />
                
                <NavLinks>
                    <NavLink to="/">Главная</NavLink>
                    <Can permission="users:view">
                        <NavLink to="/users">Пользователи</NavLink>
                    </Can>
                    <Can permission="settings:view">
                        <NavLink to="/settings">Настройки</NavLink>
                    </Can>
                </NavLinks>
                
                <UserMenu user={user} onLogout={logout} />
            </Toolbar>
        </AppBar>
    );
}
```

### MainLayout

```tsx
// src/core/layout/MainLayout.tsx
import { Outlet } from 'react-router-dom';

export function MainLayout() {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            <Container component="main" sx={{ flex: 1, py: 3 }}>
                <Outlet />  {/* Рендерит страницу */}
            </Container>
            <Footer />
        </Box>
    );
}
```

---

## Module Components

### Структура

```
src/modules/users/ui/
├── pages/
│   └── UserManagementPage.tsx    # Точка входа
├── containers/
│   ├── UserListContainer.tsx     # Подключён к useUsers()
│   └── UserFormContainer.tsx     # Подключён к useCreateUser()
└── components/
    ├── UserTable.tsx             # Только пропсы
    ├── UserForm.tsx              # Только пропсы
    └── UserCard.tsx              # Только пропсы
```

### Container (умный компонент)

```tsx
// src/modules/users/ui/containers/UserListContainer.tsx
import { useUsers, useDeleteUser } from '../hooks/useUsers';
import { UserTable } from '../components/UserTable';

export function UserListContainer() {
    const { data, isLoading, error } = useUsers();
    const deleteMutation = useDeleteUser();
    
    if (isLoading) return <CircularProgress />;
    if (error) return <Alert severity="error">{error.message}</Alert>;
    
    return (
        <UserTable 
            users={data.items}
            onDelete={(id) => deleteMutation.mutate(id)}
            loading={deleteMutation.isPending}
        />
    );
}
```

### Component (презентационный)

```tsx
// src/modules/users/ui/components/UserTable.tsx
interface UserTableProps {
    users: User[];
    onDelete: (id: number) => void;
    loading?: boolean;
}

export function UserTable({ users, onDelete, loading }: UserTableProps) {
    return (
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell>Login</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Actions</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {users.map(user => (
                    <TableRow key={user.id}>
                        <TableCell>{user.login}</TableCell>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>
                            <IconButton onClick={() => onDelete(user.id)} disabled={loading}>
                                <DeleteIcon />
                            </IconButton>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
```

### Page (точка входа)

```tsx
// src/modules/users/ui/pages/UserManagementPage.tsx
import { Tabs, Tab } from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

export function UserManagementPage() {
    const navigate = useNavigate();
    const location = useLocation();
    
    const currentTab = location.pathname.includes('roles') ? 'roles' : 'users';
    
    return (
        <Box>
            <Typography variant="h4">Управление пользователями</Typography>
            
            <Tabs value={currentTab} onChange={(_, v) => navigate(v)}>
                <Tab label="Пользователи" value="users" />
                <Tab label="Роли" value="roles" />
            </Tabs>
            
            <Outlet />
        </Box>
    );
}
```

---

## Паттерны

### Композиция vs Наследование

```tsx
// ✅ Правильно — композиция
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
            <DialogContent>
                <UserForm user={user} />
            </DialogContent>
        </Dialog>
    );
}
```

### Render Props

```tsx
<Can permission="users:delete" fallback={<DisabledButton />}>
    {() => <DeleteButton onClick={handleDelete} />}
</Can>
```
