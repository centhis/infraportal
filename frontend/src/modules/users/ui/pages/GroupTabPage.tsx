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
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup } from '../hooks/useGroups';
import { useRoles } from '../hooks/useRoles';
import { useUsers } from '../hooks/useUsers';
import { usePermissions } from '@core/auth';
import { GroupTable } from '../components/GroupTable';
import { GroupForm, type GroupFormData } from '../components/GroupForm';
import type { Group } from '../../api/users.dto';

/**
 * Вкладка Groups с таблицей и формой
 */
export function GroupTabPage() {
    const { t } = useTranslation('user_management');
    const { can } = usePermissions();

    // Состояние пагинации (сохраняется в localStorage)
    const [paginationModel, setPaginationModel] = usePersistentState<GridPaginationModel>('group-table-pagination', { page: 0, pageSize: 10 });

    // Состояние сортировки (сохраняется в localStorage)
    const [sortModel, setSortModel] = usePersistentState<GridSortModel>('group-table-sort', []);

    // Состояние видимости столбцов (сохраняется в localStorage)
    const [columnVisibilityModel, setColumnVisibilityModel] = usePersistentState<Record<string, boolean>>(
        'group-table-visibility',
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

    // Определяем колонки для ColumnVisibilityButton
    const columns: GridColDef[] = [
        { field: 'id', headerName: t('user_management.groups.table.id') },
        { field: 'name', headerName: t('user_management.groups.table.name') },
        { field: 'description', headerName: t('user_management.groups.table.description') },
        { field: 'roles', headerName: t('user_management.groups.table.roles') },
        { field: 'users', headerName: t('user_management.groups.table.users') },
        { field: 'built_in', headerName: t('user_management.groups.table.type') },
        { field: 'created_at', headerName: t('user_management.groups.table.created_at') },
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
    const { data: groupsData, isLoading, isFetching, refetch } = useGroups({
        page: paginationModel.page + 1,
        size: paginationModel.pageSize,
        ...sortParams,
        ...effectiveFilters
    });
    const { data: rolesData } = useRoles({ page: 1, size: 1000 });
    const { data: usersData } = useUsers({ page: 1, size: 1000 });

    // Мутации
    const createMutation = useCreateGroup();
    const updateMutation = useUpdateGroup();
    const deleteMutation = useDeleteGroup();

    // Состояние диалога формы
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const addGroupButtonRef = useRef<HTMLButtonElement>(null);

    // Состояние подтверждения удаления
    const [groupToDelete, setGroupToDelete] = useState<number | null>(null);

    const handleAddGroup = () => {
        setEditingGroup(null);
        setIsFormOpen(true);
    };

    const handleEditGroup = (group: Group) => {
        setEditingGroup(group);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        addGroupButtonRef.current?.focus();
    };

    const handleFormSubmit = async (data: GroupFormData) => {
        if (editingGroup) {
            await updateMutation.mutateAsync({ groupId: editingGroup.id, data });
        } else {
            await createMutation.mutateAsync({
                name: data.name,
                description: data.description ?? '',
                roles: data.roles ?? [],
                users: data.users ?? [],
            });
        }
        handleCloseForm();
    };

    const handleDeleteRequest = (groupId: number) => {
        setGroupToDelete(groupId);
    };

    const handleConfirmDelete = async () => {
        if (groupToDelete) {
            await deleteMutation.mutateAsync(groupToDelete);
        }
        setGroupToDelete(null);
    };

    const groups = groupsData?.items ?? [];
    const rowCount = groupsData?.total ?? 0;
    const allRoles = rolesData?.items ?? [];
    const allUsers = usersData?.items ?? [];

    if (isLoading && !groupsData) {
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
                        onClick={handleAddGroup}
                        ref={addGroupButtonRef}
                        disabled={!can('users:create')}
                    >
                        {t('user_management.groups.actions.add_group_button')}
                    </Button>
                </Box>
                <GroupTable
                    groups={groups}
                    onEdit={handleEditGroup}
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

            {/* Диалог формы группы */}
            <Dialog open={isFormOpen} onClose={handleCloseForm} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingGroup ? t('user_management.groups.form.edit_title') : t('user_management.groups.form.create_title')}
                </DialogTitle>
                <DialogContent>
                    <GroupForm
                        onSubmit={handleFormSubmit}
                        defaultValues={editingGroup}
                        allRoles={allRoles}
                        allUsers={allUsers}
                        isViewOnly={editingGroup ? !can('users:update') : false}
                    />
                </DialogContent>
            </Dialog>

            {/* Диалог подтверждения удаления */}
            <Dialog open={groupToDelete !== null} onClose={() => setGroupToDelete(null)}>
                <DialogTitle>{t('user_management.groups.delete_dialog.title')}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Button onClick={() => setGroupToDelete(null)} variant="outlined">
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
