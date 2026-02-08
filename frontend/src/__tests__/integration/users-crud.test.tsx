/**
 * Интеграционный тест: Поток CRUD пользователей
 * 
 * Тестирует полные операции CRUD для пользователей
 */
import { render, screen, fireEvent, waitFor, within } from '../../mocks/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UserTabPage } from '../../modules/users/ui/pages/UserTabPage';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';
import { API_ENDPOINTS } from '../../shared/constants/apiEndpoints';

const apiPrefix = '/api/v1';

// Мокаем переводы для возврата ключей для упрощения проверки
vi.mock('react-i18next', async () => {
    const original = await vi.importActual('react-i18next');
    return {
        ...original,
        useTranslation: () => ({
            t: (key: string) => key,
        }),
    };
});

describe('Users CRUD Integration', () => {
    beforeEach(() => {
        // Настройка обработчиков для CRUD пользователей
        server.use(
            // Список пользователей
            http.get(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.USERS}`, () => {
                return HttpResponse.json({
                    items: [
                        { id: 1, login: 'admin', name: 'Admin User', is_active: true, type: 'local', groups: [], created_at: '2025-01-01' },
                        { id: 2, login: 'viewer', name: 'Viewer User', is_active: false, type: 'local', groups: [], created_at: '2025-01-02' },
                    ],
                    total: 2,
                    page: 1,
                    size: 10,
                    pages: 1,
                });
            }),
            // Создание пользователя
            http.post(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.USERS}`, async ({ request }) => {
                const body = await request.json() as Record<string, unknown>;
                return HttpResponse.json({
                    id: 3,
                    ...body,
                    type: 'local',
                    groups: [],
                    created_at: new Date().toISOString(),
                }, { status: 201 });
            }),
            // Обновление пользователя
            http.put(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.USERS}/:id`, async ({ params, request }) => {
                const body = await request.json() as Record<string, unknown>;
                return HttpResponse.json({
                    id: Number(params['id']),
                    ...body,
                    type: 'local',
                    groups: [],
                    created_at: '2025-01-01',
                });
            }),
            // Удаление пользователя
            http.delete(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.USERS}/:id`, () => {
                return new HttpResponse(null, { status: 204 });
            }),
            // Группы для формы пользователя
            http.get(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.GROUPS}`, () => {
                return HttpResponse.json({
                    items: [
                        { id: 1, name: 'Admins', description: 'Admin group', built_in: true, roles: [], created_at: '' },
                    ],
                    total: 1,
                    page: 1,
                    size: 1000,
                    pages: 1,
                });
            })
        );
    });

    it('should display list of users', async () => {
        render(<UserTabPage />, {
            authHookValue: {
                user: { id: 1, permissions: ['users:view', 'users:create', 'users:update', 'users:delete'] },
                permissions: ['users:view', 'users:create', 'users:update', 'users:delete'],
            },
        });

        // Ожидание завершения загрузки
        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        // Проверка отображения пользователей
        expect(await screen.findByText('admin')).toBeInTheDocument();
        expect(screen.getByText('Viewer User')).toBeInTheDocument();
    });

    it('should create a new user', async () => {
        render(<UserTabPage />, {
            authHookValue: {
                user: { id: 1, permissions: ['users:view', 'users:create'] },
                permissions: ['users:view', 'users:create'],
            },
        });

        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        // Клик по кнопке добавления
        const addButton = screen.getByRole('button', { name: /user_management.users.actions.add_user_button/i });
        fireEvent.click(addButton);

        // Заполнение формы
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /user_management.users.form.create_title/i })).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText((c) => c.includes('user_management.users.form.login')), { target: { value: 'newuser' } });
        fireEvent.change(screen.getByLabelText((c) => c.includes('user_management.users.form.name')), { target: { value: 'New User' } });
        fireEvent.change(screen.getByLabelText((c) => c.includes('user_management.users.form.password')), { target: { value: 'password123' } });

        // Отправка
        fireEvent.click(screen.getByRole('button', { name: /user_management.users.form.create_user/i }));

        // Проверка закрытия диалога (успешное создание)
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: /user_management.users.form.create_title/i })).not.toBeInTheDocument();
        });
    });

    it('should edit an existing user', async () => {
        render(<UserTabPage />, {
            authHookValue: {
                user: { id: 1, permissions: ['users:view', 'users:update'] },
                permissions: ['users:view', 'users:update'],
            },
        });

        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        // Клик по строке пользователя для редактирования
        const row = await screen.findByRole('row', { name: /viewer/i });
        fireEvent.click(row);

        // Проверка открытия диалога редактирования
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /user_management.users.form.edit_title/i })).toBeInTheDocument();
        });

        // Изменение имени
        const nameInput = screen.getByLabelText((c) => c.includes('user_management.users.form.name'));
        fireEvent.change(nameInput, { target: { value: 'Updated Viewer' } });

        // Отправка
        fireEvent.click(screen.getByRole('button', { name: /user_management.users.form.save_changes/i }));

        // Проверка закрытия диалога
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: /user_management.users.form.edit_title/i })).not.toBeInTheDocument();
        });
    });

    it('should delete a user', async () => {
        render(<UserTabPage />, {
            authHookValue: {
                user: { id: 1, permissions: ['users:view', 'users:delete'] },
                permissions: ['users:view', 'users:delete'],
            },
        });

        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        // Поиск строки пользователя и клик по удалению
        const row = await screen.findByRole('row', { name: /viewer/i });
        const deleteBtn = within(row).getByRole('button', { name: /delete/i });
        fireEvent.click(deleteBtn);

        // Подтверждение удаления
        await waitFor(() => {
            expect(screen.getByText(/user_management.users.delete_dialog.title/i)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /common.delete/i }));

        // Проверка закрытия диалога подтверждения
        await waitFor(() => {
            expect(screen.queryByText(/user_management.users.delete_dialog.title/i)).not.toBeInTheDocument();
        });
    });
});
