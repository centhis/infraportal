import { render, screen, fireEvent, waitFor, within } from '../../../../mocks/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GroupTabPage } from './GroupTabPage';
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup } from '../hooks/useGroups';
import { useRoles } from '../hooks/useRoles';
import { useUsers } from '../hooks/useUsers';
import { usePermissions } from '@core/auth';

// Мок специфичных хуков
vi.mock('../hooks/useGroups');
vi.mock('../hooks/useRoles');
vi.mock('../hooks/useUsers');

// Мок разрешений
vi.mock('@core/auth', () => ({
    usePermissions: vi.fn(),
}));

// Мокаем переводы для возврата ключей
vi.mock('react-i18next', async () => {
    const original = await vi.importActual('react-i18next');
    return {
        ...original,
        useTranslation: () => ({
            t: (key: string) => key,
            i18n: {
                changeLanguage: () => new Promise(() => { }),
            },
        }),
    };
});

describe('GroupTabPage', () => {
    const mockGroups = [
        { id: 1, name: 'Admins', description: 'Admin group', built_in: true, created_at: '2023-01-01', roles: [] },
        { id: 2, name: 'Developers', description: 'Dev group', built_in: false, created_at: '2023-01-01', roles: [] },
    ];
    const mockRoles = [{ id: 1, name: 'manage_users' }];
    const mockUsers = [{ id: 1, login: 'admin', name: 'Admin User' }];

    // Мок мутаций
    const mockCreateGroup = { mutateAsync: vi.fn() };
    const mockUpdateGroup = { mutateAsync: vi.fn() };
    const mockDeleteGroup = { mutateAsync: vi.fn() };
    const mockRefetch = vi.fn();

    // Мок разрешений
    const mockCan = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Дефолтные разрешения - разрешено все
        mockCan.mockReturnValue(true);
        vi.mocked(usePermissions).mockReturnValue({ can: mockCan } as unknown as ReturnType<typeof usePermissions>);

        // Дефолтные реализации моков
        vi.mocked(useGroups).mockReturnValue({
            data: { items: mockGroups, total: 2, page: 1, size: 10, pages: 1 },
            isLoading: false,
            refetch: mockRefetch,
        } as unknown as ReturnType<typeof useGroups>);

        vi.mocked(useCreateGroup).mockReturnValue(mockCreateGroup as unknown as ReturnType<typeof useCreateGroup>);
        vi.mocked(useUpdateGroup).mockReturnValue(mockUpdateGroup as unknown as ReturnType<typeof useUpdateGroup>);
        vi.mocked(useDeleteGroup).mockReturnValue(mockDeleteGroup as unknown as ReturnType<typeof useDeleteGroup>);

        vi.mocked(useRoles).mockReturnValue({
            data: { items: mockRoles, total: 1 },
            isLoading: false,
        } as unknown as ReturnType<typeof useRoles>);

        vi.mocked(useUsers).mockReturnValue({
            data: { items: mockUsers, total: 1 },
            isLoading: false,
        } as unknown as ReturnType<typeof useUsers>);
    });

    it('should show loading spinner when groups are loading', () => {
        vi.mocked(useGroups).mockReturnValue({ isLoading: true } as unknown as ReturnType<typeof useGroups>);
        render(<GroupTabPage />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render the group table with data', () => {
        render(<GroupTabPage />);
        expect(screen.getByText('Admins')).toBeInTheDocument();
        expect(screen.getByText('Developers')).toBeInTheDocument();
        expect(screen.getByText('Admin group')).toBeInTheDocument();
    });

    it('should open create dialog on "Add Group" click', async () => {
        render(<GroupTabPage />);

        // Ключ: user_management.groups.actions.add_group_button
        const addButton = screen.getByText('user_management.groups.actions.add_group_button');
        fireEvent.click(addButton);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        // Ключ заголовка: user_management.groups.form.create_title
        expect(screen.getByText('user_management.groups.form.create_title')).toBeInTheDocument();
    });

    it('should call createMutation on form submit', async () => {
        render(<GroupTabPage />);

        fireEvent.click(screen.getByText('user_management.groups.actions.add_group_button'));

        const dialog = screen.getByRole('dialog');
        const textboxes = within(dialog).getAllByRole('textbox');
        const nameInput = textboxes[0];

        fireEvent.change(nameInput!, { target: { value: 'New Group' } });

        // Ключ кнопки создания: user_management.groups.form.create_group
        fireEvent.click(within(dialog).getByRole('button', { name: 'user_management.groups.form.create_group' }));

        await waitFor(() => {
            expect(mockCreateGroup.mutateAsync).toHaveBeenCalledWith({
                name: 'New Group',
                description: '',
                roles: [],
                users: []
            });
        });
    });

    it('should open edit dialog on row click', async () => {
        render(<GroupTabPage />);

        const row = screen.getByText('Developers');
        fireEvent.click(row);

        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        // Ключ заголовка: user_management.groups.form.edit_title
        expect(screen.getByText('user_management.groups.form.edit_title')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Developers')).toBeInTheDocument();
    });

    it('should call updateMutation on edit submit', async () => {
        render(<GroupTabPage />);

        fireEvent.click(screen.getByText('Developers'));

        const dialog = await screen.findByRole('dialog');
        const textboxes = within(dialog).getAllByRole('textbox');
        const nameInput = textboxes[0];
        fireEvent.change(nameInput!, { target: { value: 'Developers Updated' } });

        // Ключ сохранения изменений: user_management.groups.form.save_changes
        fireEvent.click(within(dialog).getByRole('button', { name: 'user_management.groups.form.save_changes' }));

        await waitFor(() => {
            expect(mockUpdateGroup.mutateAsync).toHaveBeenCalledWith({
                groupId: 2,
                data: expect.objectContaining({ name: 'Developers Updated' })
            });
        });
    });

    it('should open delete confirmation on delete click', async () => {
        render(<GroupTabPage />);

        const row = screen.getByText('Developers').closest('.MuiDataGrid-row');
        if (!row) throw new Error('Row not found');

        // Кнопка удаления имеет aria-label="delete", который захардкожен в компоненте или переведен?
        // В GroupTable.tsx: aria-label="delete" (захардкоженная строка "delete")
        const deleteButton = within(row as HTMLElement).getByRole('button', { name: "delete" });
        fireEvent.click(deleteButton);

        // Ключ заголовка диалога: user_management.groups.delete_dialog.title
        expect(await screen.findByText('user_management.groups.delete_dialog.title')).toBeInTheDocument();
        expect(screen.getByRole('dialog')).toBeVisible();
    });

    it('should call deleteMutation on confirm delete', async () => {
        render(<GroupTabPage />);

        const row = screen.getByText('Developers').closest('.MuiDataGrid-row');
        const deleteButton = within(row as HTMLElement).getByRole('button', { name: "delete" });
        fireEvent.click(deleteButton);

        const dialog = await screen.findByRole('dialog');
        // Кнопка подтверждения: common.delete
        const confirmButton = within(dialog).getByRole('button', { name: 'common.delete' });
        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(mockDeleteGroup.mutateAsync).toHaveBeenCalledWith(2);
        });
    });
});
