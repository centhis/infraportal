import { render, screen, fireEvent, waitFor, within } from '../../../../mocks/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UserTabPage } from './UserTabPage';
import * as useUsersHooks from '../hooks/useUsers';
import * as useGroupsHooks from '../hooks/useGroups';
import * as authHooks from '@core/auth';
import type { User, Group } from '../../api/users.dto';

// Мокаем переводы для возврата ключей
vi.mock('react-i18next', async () => {
    const original = await vi.importActual('react-i18next');
    return {
        ...original,
        useTranslation: () => ({
            t: (key: string) => key,
        }),
    };
});

// Мокируем персистентное состояние для таблицы
vi.mock('../../../../shared/hooks/usePersistentState', () => ({
    usePersistentState: vi.fn((_key, initialValue) => [initialValue, vi.fn()]),
}));

// Мокируем хуки API
const useUsersMock = vi.fn();
const useCreateUserMock = vi.fn();
const useUpdateUserMock = vi.fn();
const useDeleteUserMock = vi.fn();
const useGroupsMock = vi.fn();
const usePermissionsMock = vi.fn();

vi.spyOn(useUsersHooks, 'useUsers').mockImplementation(useUsersMock);
vi.spyOn(useUsersHooks, 'useCreateUser').mockImplementation(useCreateUserMock);
vi.spyOn(useUsersHooks, 'useUpdateUser').mockImplementation(useUpdateUserMock);
vi.spyOn(useUsersHooks, 'useDeleteUser').mockImplementation(useDeleteUserMock);
vi.spyOn(useGroupsHooks, 'useGroups').mockImplementation(useGroupsMock);
vi.spyOn(authHooks, 'usePermissions').mockImplementation(usePermissionsMock);

const mockUsers: User[] = [
    {
        id: 1,
        login: 'admin',
        name: 'Admin User',
        is_active: true,
        type: 'local',
        groups: [{ id: 1, name: 'Admins', description: '', built_in: true, created_at: '', roles: [] }],
        created_at: '2025-01-01',
        ldap_id: null,
        ldap_dn: null
    },
    {
        id: 2,
        login: 'viewer',
        name: 'Viewer User',
        is_active: false,
        type: 'local',
        groups: [],
        created_at: '2025-01-02',
        ldap_id: null,
        ldap_dn: null
    }
];

const mockGroups: Group[] = [
    { id: 1, name: 'Admins', description: 'Admin Group', built_in: true, created_at: '', roles: [] },
    { id: 2, name: 'Viewers', description: 'Viewer Group', built_in: false, created_at: '', roles: [] }
];

describe('UserTabPage', () => {
    const mutateCreate = vi.fn();
    const mutateUpdate = vi.fn();
    const mutateDelete = vi.fn();
    const refetchMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Дефолтные реализации моков
        useUsersMock.mockReturnValue({
            data: { items: mockUsers, total: 2, page: 1, size: 10, pages: 1 },
            isLoading: false,
            refetch: refetchMock
        });

        useGroupsMock.mockReturnValue({
            data: { items: mockGroups, total: 2 },
            isLoading: false
        });

        useCreateUserMock.mockReturnValue({ mutateAsync: mutateCreate });
        useUpdateUserMock.mockReturnValue({ mutateAsync: mutateUpdate });
        useDeleteUserMock.mockReturnValue({ mutateAsync: mutateDelete });

        usePermissionsMock.mockReturnValue({
            can: (_perm: string) => true, // По умолчанию разрешаем все
        });
    });

    it('should render loading state', () => {
        useUsersMock.mockReturnValue({ isLoading: true, data: null });
        render(<UserTabPage />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render the user table with data', async () => {
        render(<UserTabPage />);
        expect(screen.getByText('admin')).toBeInTheDocument();
        expect(screen.getByText('Viewer User')).toBeInTheDocument();
        // Проверяем рендеринг статуса local/active (ключи или текст в зависимости от реализации UserTable, но UserTable теперь устойчив к i18n)
        // UserTable рендерит ключи для статуса/типа.
        // Будем полагаться на логин/имя для базовой проверки наличия.
    });

    it('should open create dialog when "Add User" is clicked', async () => {
        render(<UserTabPage />);

        // Ключ кнопки: user_management.users.actions.add_user_button
        const addButton = screen.getByRole('button', { name: 'user_management.users.actions.add_user_button' });
        fireEvent.click(addButton);

        // Ключ заголовка диалога: user_management.users.form.create_title
        expect(await screen.findByRole('heading', { name: 'user_management.users.form.create_title' })).toBeInTheDocument();
    });

    it('should create a new user', async () => {
        render(<UserTabPage />);

        fireEvent.click(screen.getByRole('button', { name: 'user_management.users.actions.add_user_button' }));

        // Заполняем форму
        fireEvent.change(screen.getByLabelText((content) => content.includes('user_management.users.form.login')), { target: { value: 'newuser' } });
        fireEvent.change(screen.getByLabelText((content) => content.includes('user_management.users.form.name')), { target: { value: 'New User' } });
        fireEvent.change(screen.getByLabelText((content) => content.includes('user_management.users.form.password')), { target: { value: 'password123' } });

        // Отправляем
        // Ключ: user_management.users.form.create_user
        fireEvent.click(screen.getByRole('button', { name: 'user_management.users.form.create_user' }));

        await waitFor(() => {
            expect(mutateCreate).toHaveBeenCalledWith({
                login: 'newuser',
                name: 'New User',
                password: 'password123',
                is_active: true, // По умолчанию
                group_ids: [],
            });
        });
    });

    it('should open edit dialog when row is clicked', async () => {
        render(<UserTabPage />);

        // Клик по строке 'viewer' (используя логин)
        const row = screen.getByRole('row', { name: /viewer/ });
        fireEvent.click(row);

        // Ключ заголовка диалога: user_management.users.form.edit_title
        expect(await screen.findByRole('heading', { name: 'user_management.users.form.edit_title' })).toBeInTheDocument();

        // Проверяем, что инпут имеет значение
        expect(screen.getByLabelText((content) => content.includes('user_management.users.form.login'))).toHaveValue('viewer');
    });

    it('should update an existing user', async () => {
        render(<UserTabPage />);

        const row = screen.getByRole('row', { name: /viewer/ });
        fireEvent.click(row);

        const nameInput = await screen.findByLabelText((content) => content.includes('user_management.users.form.name'));
        fireEvent.change(nameInput, { target: { value: 'Viewer Updated' } });

        // Ключ: user_management.users.form.save_changes
        fireEvent.click(screen.getByRole('button', { name: 'user_management.users.form.save_changes' }));

        await waitFor(() => {
            expect(mutateUpdate).toHaveBeenCalledWith({
                userId: 2,
                data: expect.objectContaining({ name: 'Viewer Updated' })
            });
        });
    });

    it('should open delete confirmation when delete action is clicked', async () => {
        render(<UserTabPage />);

        const row = screen.getByRole('row', { name: /viewer/ });
        // Таблица имеет специфичную колонку удаления с кнопкой.
        // Логика UserTable.tsx: если canDelete, рендерится IconButton с DeleteIcon.
        // Aria-label не задан явно на IconButton в рендере UserTable?
        // Проверим реализацию UserTable, если здесь упадет.
        // Предполагаем, что кнопка удаления есть.
        // На самом деле, UserTable вероятно использует тот же паттерн: клик по строке для редактирования, отдельная кнопка для удаления.
        // Стоп, UserTable.tsx строка 125: onDelete={canDelete ? onDelete : undefined}
        // Проверим, рендерит ли её общая таблица (если используется) или UserTable.
        // UserTable.tsx (проверяли ранее) рендерит DataGrid.
        // Обычно DataGrid не имеет кнопки удаления в строке, если не настроено.
        // Стоп! В UserTable.test.tsx было `screen.getAllByRole('button', { name: /delete/i })`.
        // Так что да, кнопка удаления в строке есть.
        const deleteBtn = within(row).getByRole('button', { name: /delete/i });
        fireEvent.click(deleteBtn);

        // Ключ заголовка диалога: user_management.users.delete_dialog.title
        expect(await screen.findByText('user_management.users.delete_dialog.title')).toBeInTheDocument();
    });

    it('should delete a user when confirmed', async () => {
        render(<UserTabPage />);

        const row = screen.getByRole('row', { name: /viewer/ });
        fireEvent.click(within(row).getByRole('button', { name: /delete/i }));

        // Подтверждаем удаление. Ключ: common.delete
        const confirmBtn = await screen.findByRole('button', { name: 'common.delete' });
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(mutateDelete).toHaveBeenCalledWith(2);
        });
    });

    it('should open permissions report when permissions button is clicked', async () => {
        render(<UserTabPage />);

        const row = screen.getByRole('row', { name: /admin/ });

        // Ключ: "user_management.users.table.permissions_report_button"

        const reportBtn = within(row).getByRole('button', { name: /user_management.users.table.permissions_report_button/i });
        fireEvent.click(reportBtn);

        // Ожидаем, что PermissionsReportDialog открыт.
        // Он рендерит "user_management.users.permissions_report.title"
        expect(await screen.findByText(/user_management.users.permissions_report.title/)).toBeInTheDocument();
    });

    it('should disable add button if no create permission', () => {
        usePermissionsMock.mockReturnValue({
            can: (_perm: string) => false,
        });
        render(<UserTabPage />);
        expect(screen.getByRole('button', { name: 'user_management.users.actions.add_user_button' })).toBeDisabled();
    });
});
