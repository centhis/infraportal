import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { GridPaginationModel, GridSortModel, GridColDef } from '@mui/x-data-grid';
import { ColumnVisibilityButton } from '@shared/ui/DataTable';

import { usePersistentState, useDebounce } from '@shared/hooks';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../hooks/useUsers';
import { useGroups } from '../hooks/useGroups';
import { usePermissions } from '@core/auth';
import { UserTable } from '../components/UserTable';
import { UserForm, type UserFormData } from '../components/UserForm';
import { PermissionsReportDialog } from '../components/PermissionsReportDialog';
import { LdapSyncButton } from '../components/LdapSyncButton';
import type { User } from '../../api/users.dto';

/**
 * Вкладка Users с таблицей и формой
 */
export function UserTabPage() {
    const { t } = useTranslation('user_management');
    const { can } = usePermissions();

    // Состояние пагинации (сохраняется в localStorage)
    const [paginationModel, setPaginationModel] = usePersistentState<GridPaginationModel>('user-table-pagination', { page: 0, pageSize: 10 });

    // Состояние сортировки (сохраняется в localStorage)
    const [sortModel, setSortModel] = usePersistentState<GridSortModel>('user-table-sort', []);

    // Состояние видимости столбцов (сохраняется в localStorage)
    const [columnVisibilityModel, setColumnVisibilityModel] = usePersistentState<Record<string, boolean>>(
        'user-table-visibility',
        { id: false }
    );

    // Состояние фильтрации
    const [filters, setFilters] = useState({});
    const debouncedFilters = useDebounce(filters, 500);

    // Сброс страницы при изменении фильтров
    useEffect(() => {
        setPaginationModel(prev => ({ ...prev, page: 0 }));
    }, [debouncedFilters, setPaginationModel]);

    // Преобразуем sortModel в параметры для API
    const sortParams = sortModel.length > 0 && sortModel[0] ? {
        sort_by: sortModel[0].field,
        sort_order: sortModel[0].sort ?? 'asc'
    } : {};

    // Подготовка фильтров: применяем только те, где 3 и более символов (для строковых полей)
    const effectiveFilters = useMemo(() => {
        return Object.fromEntries(
            Object.entries(debouncedFilters).filter(([_, value]) => {
                if (typeof value === 'string' && value.length > 0 && value.length < 3) {
                    return false;
                }
                return true;
            })
        );
    }, [debouncedFilters]);

    // Загрузка данных
    const { data: usersData, isLoading, isFetching, refetch } = useUsers({
        page: paginationModel.page + 1,
        size: paginationModel.pageSize,
        ...sortParams,
        ...effectiveFilters
    });
    const { data: groupsData } = useGroups({ page: 1, size: 1000 });

    // Мутации
    const createMutation = useCreateUser();
    const updateMutation = useUpdateUser();
    const deleteMutation = useDeleteUser();

    // Состояние диалога формы
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const addUserButtonRef = useRef<HTMLButtonElement>(null);

    // Состояние подтверждения удаления
    const [userToDelete, setUserToDelete] = useState<number | null>(null);

    const handleAddUser = () => {
        setEditingUser(null);
        setIsFormOpen(true);
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        addUserButtonRef.current?.focus();
    };

    const handleFormSubmit = async (data: UserFormData) => {
        try {
            if (editingUser) {
                // Подготавливаем данные для обновления
                const updateData = { ...data };
                // Если пароль не задан (пустая строка), удаляем его из payload
                if (!updateData.password) {
                    delete updateData.password;
                }

                await updateMutation.mutateAsync({ userId: editingUser.id, data: updateData });
            } else {
                await createMutation.mutateAsync({
                    login: data.login,
                    name: data.name,
                    password: data.password ?? '',
                    is_active: data.is_active,
                    group_ids: data.groups ?? [],
                });
            }
            handleCloseForm();
        } catch (error) {
            console.error('Failed to save user:', error);
            // Тут можно добавить уведомление об ошибке
        }
    };

    const handleDeleteRequest = (userId: number) => {
        setUserToDelete(userId);
    };

    const handleConfirmDelete = async () => {
        if (userToDelete) {
            await deleteMutation.mutateAsync(userToDelete);
        }
        setUserToDelete(null);
    };

    // Состояние отчёта о разрешениях
    const [permissionsReportUser, setPermissionsReportUser] = useState<number | null>(null);

    const handlePermissionsReport = (userId: number) => {
        setPermissionsReportUser(userId);
    };

    // Определяем колонки для ColumnVisibilityButton
    const columns: GridColDef[] = [
        { field: 'id', headerName: t('user_management.users.table.id') },
        { field: 'login', headerName: t('user_management.users.table.login') },
        { field: 'name', headerName: t('user_management.users.table.name') },
        { field: 'type', headerName: t('user_management.users.table.type') },
        { field: 'created_at', headerName: t('user_management.users.table.created_at') },
        { field: 'is_active', headerName: t('user_management.users.table.is_active') },
    ];

    const users = usersData?.items ?? [];
    const rowCount = usersData?.total ?? 0;
    const allGroups = groupsData?.items ?? [];

    if (isLoading && !usersData) {
        return (
            <Box p={4} display="flex" justifyContent="center">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Box>
                        <LdapSyncButton />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <ColumnVisibilityButton
                            columns={columns}
                            model={columnVisibilityModel}
                            onModelChange={setColumnVisibilityModel}
                        />
                        <IconButton onClick={() => refetch()} color="primary">
                            <RefreshIcon />
                        </IconButton>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleAddUser}
                            ref={addUserButtonRef}
                            disabled={!can('users:create')}
                        >
                            {t('user_management.users.actions.add_user_button')}
                        </Button>
                    </Box>
                </Box>
                <UserTable
                    users={users}
                    onEdit={handleEditUser}
                    onDelete={can('users:delete') ? handleDeleteRequest : () => { }}
                    canDelete={can('users:delete')}
                    rowCount={rowCount}
                    paginationModel={paginationModel}
                    onPaginationModelChange={setPaginationModel}
                    sortModel={sortModel}
                    onSortModelChange={setSortModel}
                    filters={filters}
                    onFiltersChange={setFilters}
                    columnVisibilityModel={columnVisibilityModel}
                    onColumnVisibilityModelChange={setColumnVisibilityModel}
                    onPermissionsReport={handlePermissionsReport}
                    loading={isFetching}
                />
            </Box>

            {/* Диалог формы пользователя */}
            <Dialog open={isFormOpen} onClose={handleCloseForm} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingUser ? t('user_management.users.form.edit_title') : t('user_management.users.form.create_title')}
                </DialogTitle>
                <DialogContent>
                    <UserForm
                        onSubmit={handleFormSubmit}
                        defaultValues={editingUser}
                        allGroups={allGroups}
                        isViewOnly={editingUser ? !can('users:update') : false}
                    />
                </DialogContent>
            </Dialog>

            {/* Диалог подтверждения удаления */}
            <Dialog open={userToDelete !== null} onClose={() => setUserToDelete(null)}>
                <DialogTitle>{t('user_management.users.delete_dialog.title')}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Button onClick={() => setUserToDelete(null)} variant="outlined">
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button onClick={handleConfirmDelete} variant="contained" color="error">
                            {t('common.delete', 'Delete')}
                        </Button>
                    </Box>
                </DialogContent>
            </Dialog>

            {/* Диалог отчёта о разрешениях */}
            <PermissionsReportDialog
                open={permissionsReportUser !== null}
                onClose={() => setPermissionsReportUser(null)}
                userId={permissionsReportUser}
            />
        </>
    );
}
