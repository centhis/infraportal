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
import { useRoles, useCreateRole, useUpdateRole, useDeleteRole } from '../hooks/useRoles';
import { usePermissionsList } from '../hooks/usePermissionsList';
import { usePermissions } from '@core/auth';
import { RoleTable } from '../components/RoleTable';
import { RoleForm, type RoleFormData } from '../components/RoleForm';
import type { Role } from '../../api/users.dto';

/**
 * Вкладка Roles с таблицей и формой
 */
export function RoleTabPage() {
    const { t } = useTranslation('user_management');
    const { can } = usePermissions();

    // Состояние пагинации (сохраняется в localStorage)
    const [paginationModel, setPaginationModel] = usePersistentState<GridPaginationModel>('role-table-pagination', { page: 0, pageSize: 10 });

    // Состояние сортировки (сохраняется в localStorage)
    const [sortModel, setSortModel] = usePersistentState<GridSortModel>('role-table-sort', []);

    // Состояние видимости столбцов (сохраняется в localStorage)
    const [columnVisibilityModel, setColumnVisibilityModel] = usePersistentState<Record<string, boolean>>(
        'role-table-visibility',
        { id: false }
    );

    // Состояние фильтрации
    const [filters, setFilters] = useState({});
    const debouncedFilters = useDebounce(filters, 500);

    // Сброс страницы при изменении фильтров
    useEffect(() => {
        setPaginationModel(prev => ({ ...prev, page: 0 }));
    }, [debouncedFilters, setPaginationModel]);

    // Преобразуем sortModel v параметры для API
    const sortParams = sortModel.length > 0 && sortModel[0] ? {
        sort_by: sortModel[0].field,
        sort_order: sortModel[0].sort ?? 'asc'
    } : {};

    // Определяем колонки для ColumnVisibilityButton
    const columns: GridColDef[] = [
        { field: 'id', headerName: t('user_management.roles.table.id') },
        { field: 'name', headerName: t('user_management.roles.table.name') },
        { field: 'description', headerName: t('user_management.roles.table.description') },
        { field: 'built_in', headerName: t('user_management.roles.table.type') },
        { field: 'created_at', headerName: t('user_management.roles.table.created_at') },
    ];

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
    const { data: rolesData, isLoading, isFetching, refetch } = useRoles({
        page: paginationModel.page + 1,
        size: paginationModel.pageSize,
        ...sortParams,
        ...effectiveFilters
    });
    const { data: permissionsData } = usePermissionsList();

    // Мутации
    const createMutation = useCreateRole();
    const updateMutation = useUpdateRole();
    const deleteMutation = useDeleteRole();

    // Состояние диалога формы
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const addRoleButtonRef = useRef<HTMLButtonElement>(null);

    // Состояние подтверждения удаления
    const [roleToDelete, setRoleToDelete] = useState<number | null>(null);

    const handleAddRole = () => {
        setEditingRole(null);
        setIsFormOpen(true);
    };

    const handleEditRole = (role: Role) => {
        setEditingRole(role);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        addRoleButtonRef.current?.focus();
    };

    const handleFormSubmit = async (data: RoleFormData) => {
        if (editingRole) {
            await updateMutation.mutateAsync({ roleId: editingRole.id, data });
        } else {
            await createMutation.mutateAsync({
                name: data.name,
                description: data.description ?? '',
                permissions: data.permissions ?? [],
            });
        }
        handleCloseForm();
    };

    const handleDeleteRequest = (roleId: number) => {
        setRoleToDelete(roleId);
    };

    const handleConfirmDelete = async () => {
        if (roleToDelete) {
            await deleteMutation.mutateAsync(roleToDelete);
        }
        setRoleToDelete(null);
    };

    const roles = rolesData?.items ?? [];
    const rowCount = rolesData?.total ?? 0;
    const allPermissions = permissionsData?.items ?? [];

    if (isLoading && !rolesData) {
        return (
            <Box p={4} display="flex" justifyContent="center">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', gap: 1, alignSelf: 'flex-end', alignItems: 'center' }}>
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
                        onClick={handleAddRole}
                        ref={addRoleButtonRef}
                        disabled={!can('users:create')}
                    >
                        {t('user_management.roles.actions.add_role_button')}
                    </Button>
                </Box>
                <RoleTable
                    roles={roles}
                    onEdit={handleEditRole}
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
                    loading={isFetching}
                />
            </Box>

            {/* Диалог формы роли */}
            <Dialog open={isFormOpen} onClose={handleCloseForm} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingRole ? t('user_management.roles.form.edit_title') : t('user_management.roles.form.create_title')}
                </DialogTitle>
                <DialogContent>
                    <RoleForm
                        onSubmit={handleFormSubmit}
                        defaultValues={editingRole}
                        allPermissions={allPermissions}
                        isViewOnly={editingRole ? !can('users:update') : false}
                    />
                </DialogContent>
            </Dialog>

            {/* Диалог подтверждения удаления */}
            <Dialog open={roleToDelete !== null} onClose={() => setRoleToDelete(null)}>
                <DialogTitle>{t('user_management.roles.delete_dialog.title')}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Button onClick={() => setRoleToDelete(null)} variant="outlined">
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button onClick={handleConfirmDelete} variant="contained" color="error">
                            {t('common.delete', 'Delete')}
                        </Button>
                    </Box>
                </DialogContent>
            </Dialog>
        </>
    );
}
