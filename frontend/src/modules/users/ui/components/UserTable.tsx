import { memo, useMemo, useCallback, type Dispatch, type SetStateAction } from 'react';
import dayjs from 'dayjs';
import { DataGrid, gridClasses, type GridColDef, type GridPaginationModel, type GridSortModel } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import DeleteIcon from '@mui/icons-material/Delete';
import PolicyIcon from '@mui/icons-material/Policy';
import { useTranslation } from 'react-i18next';
import { ColumnFilterHeader, ColumnSelectFilterHeader, ColumnDateRangeFilterHeader } from '@shared/ui/DataTable';
import type { User, UserType } from '../../api/users.dto';

interface AuthTypeChipProps {
    type: UserType;
}

function AuthTypeChip({ type }: AuthTypeChipProps) {
    const { t } = useTranslation('user_management');

    const typeMap: Record<UserType | 'built_in' | 'openid', { label: string; color: 'info' | 'default' | 'warning' | 'secondary' }> = {
        built_in: { label: t('user_management.users.table.auth_type.built_in'), color: 'info' },
        local: { label: t('user_management.users.table.auth_type.local'), color: 'default' },
        ldap: { label: t('user_management.users.table.auth_type.ldap'), color: 'warning' },
        openid: { label: t('user_management.users.table.auth_type.openid'), color: 'secondary' },
    };

    const { label, color } = typeMap[type] ?? { label: type, color: 'default' as const };

    return <Chip label={label} color={color} variant="outlined" size="small" />;
}

export interface UserTableFilters {
    id?: string;
    login?: string;
    name?: string;
    type?: string;
    created_at_from?: string;
    created_at_to?: string;
    is_active?: string;
}

export interface UserTableProps {
    users: User[];
    rowCount: number;
    paginationModel: GridPaginationModel;
    onPaginationModelChange: (model: GridPaginationModel) => void;
    sortModel: GridSortModel;
    onSortModelChange: (model: GridSortModel) => void;
    filters: UserTableFilters;
    onFiltersChange: Dispatch<SetStateAction<UserTableFilters>>;
    columnVisibilityModel: Record<string, boolean>;
    onColumnVisibilityModelChange: (model: Record<string, boolean>) => void;
    onEdit: (user: User) => void;
    onDelete: (userId: number) => void;
    onPermissionsReport: (userId: number, userName: string) => void;
    canDelete?: boolean;
    loading?: boolean;
}

/**
 * Таблица пользователей с серверной пагинацией
 */
export const UserTable = memo(function UserTable({
    users,
    rowCount,
    paginationModel,
    onPaginationModelChange,
    sortModel,
    onSortModelChange,
    filters,
    onFiltersChange,
    columnVisibilityModel,
    onColumnVisibilityModelChange,
    onEdit,
    onDelete,
    onPermissionsReport,
    canDelete = true,
    loading = false,
}: UserTableProps) {
    const { t } = useTranslation(['user_management', 'common']);

    const handleFilterChange = useCallback((field: keyof UserTableFilters, value: string) => {
        onFiltersChange((prev: UserTableFilters) => ({
            ...prev,
            [field]: value,
        }));
    }, [onFiltersChange]);

    const columns: GridColDef<User>[] = useMemo(
        () => [
            {
                field: 'id',
                headerName: t('user_management.users.table.id'),
                width: 90,
                renderHeader: (params) => (
                    <ColumnFilterHeader
                        label={params.colDef.headerName ?? ''}
                        value={filters.id ?? ''}
                        onFilterChange={(val) => handleFilterChange('id', val)}
                    />
                ),
            },
            {
                field: 'login',
                headerName: t('user_management.users.table.login'),
                flex: 1,
                renderHeader: (params) => (
                    <ColumnFilterHeader
                        label={params.colDef.headerName ?? ''}
                        value={filters.login ?? ''}
                        onFilterChange={(val) => handleFilterChange('login', val)}
                    />
                ),
            },
            {
                field: 'name',
                headerName: t('user_management.users.table.name'),
                flex: 1,
                renderHeader: (params) => (
                    <ColumnFilterHeader
                        label={params.colDef.headerName ?? ''}
                        value={filters.name ?? ''}
                        onFilterChange={(val) => handleFilterChange('name', val)}
                    />
                ),
            },
            {
                field: 'type',
                headerName: t('user_management.users.table.type'),
                flex: 1,
                renderCell: (params) => <AuthTypeChip type={params.value} />,
                renderHeader: (params) => (
                    <ColumnSelectFilterHeader
                        label={params.colDef.headerName ?? ''}
                        value={filters.type ?? ''}
                        options={[
                            { value: 'local', label: t('user_management.users.table.auth_type.local') },
                            { value: 'ldap', label: t('user_management.users.table.auth_type.ldap') },
                            { value: 'built_in', label: t('user_management.users.table.auth_type.built_in') },
                            { value: 'openid', label: t('user_management.users.table.auth_type.openid') },
                        ]}
                        allLabel={t('common:all', 'All')}
                        onFilterChange={(val) => handleFilterChange('type', val)}
                    />
                ),
            },
            {
                field: 'created_at',
                headerName: t('user_management.users.table.created_at'),
                flex: 1,
                valueFormatter: (value) => value ? dayjs(value).format('DD.MM.YYYY HH:mm') : '',
                renderHeader: (params) => (
                    <ColumnDateRangeFilterHeader
                        label={params.colDef.headerName ?? ''}
                        fromValue={filters.created_at_from ?? ''}
                        toValue={filters.created_at_to ?? ''}
                        onFilterChange={(from, to) => {
                            onFiltersChange({
                                ...filters,
                                created_at_from: from,
                                created_at_to: to,
                            });
                        }}
                        fromPlaceholder={t('common.from', 'From')}
                        toPlaceholder={t('common.to', 'To')}
                    />
                ),
            },
            {
                field: 'is_active',
                headerName: t('user_management.users.table.is_active'),
                flex: 1,
                renderCell: (params) => (
                    <Chip
                        label={params.value ? t('user_management.users.table.status.active') : t('user_management.users.table.status.inactive')}
                        color={params.value ? 'success' : 'error'}
                        variant="outlined"
                        size="small"
                    />
                ),
                renderHeader: (params) => (
                    <ColumnSelectFilterHeader
                        label={params.colDef.headerName ?? ''}
                        value={filters.is_active ?? ''}
                        options={[
                            { value: 'true', label: t('user_management.users.table.status.active') },
                            { value: 'false', label: t('user_management.users.table.status.inactive') },
                        ]}
                        allLabel={t('common:all', 'All')}
                        onFilterChange={(val) => handleFilterChange('is_active', val)}
                    />
                ),
            },
            {
                field: 'actions',
                headerName: t('user_management.users.table.actions'),
                renderHeader: () => null,
                width: 120,
                sortable: false,
                filterable: false,
                disableColumnMenu: true,
                renderCell: (params) => (
                    <Box>
                        <IconButton
                            aria-label={t('user_management.users.table.permissions_report_button')}
                            color="primary"
                            onClick={(event) => {
                                event.stopPropagation();
                                onPermissionsReport(params.row.id, params.row.name);
                            }}
                        >
                            <PolicyIcon />
                        </IconButton>
                        <IconButton
                            aria-label="delete"
                            color="error"
                            onClick={(event) => {
                                event.stopPropagation();
                                onDelete(params.row.id);
                            }}
                            disabled={!canDelete || params.row.type === 'built_in'}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Box>
                ),
            },
        ],
        [t, onDelete, onPermissionsReport, canDelete, handleFilterChange, onFiltersChange, filters.id, filters.login, filters.name, filters.type, filters.created_at_from, filters.created_at_to, filters.is_active]
    );

    return (
        <Box sx={{ width: '100%', overflow: 'hidden' }}>
            <DataGrid
                rows={users}
                columns={columns}
                getRowId={(row) => row.id}
                rowCount={rowCount}
                paginationModel={paginationModel}
                onPaginationModelChange={onPaginationModelChange}
                onRowClick={(params) => onEdit(params.row)}
                pagination
                paginationMode="server"
                pageSizeOptions={[5, 10, 25]}
                disableRowSelectionOnClick
                sortingMode="server"
                sortModel={sortModel}
                onSortModelChange={onSortModelChange}
                sortingOrder={['asc', 'desc']}
                filterMode="server"
                columnHeaderHeight={90}
                disableColumnMenu
                columnVisibilityModel={columnVisibilityModel}
                onColumnVisibilityModelChange={onColumnVisibilityModelChange}
                loading={loading}
                localeText={{
                    paginationRowsPerPage: t('common:table.rows_per_page'),
                    paginationDisplayedRows: ({ from, to, count }) =>
                        `${from}–${to} ${t('common:table.of')} ${count !== -1 ? count : `> ${to}`}`,
                }}
                sx={{
                    [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
                        outline: 'transparent !important',
                    },
                    [`& .${gridClasses.columnHeader}:focus-within, & .${gridClasses.cell}:focus-within`]: {
                        outline: 'none !important',
                    },
                    [`& .${gridClasses.row}:hover`]: {
                        cursor: 'pointer',
                    },
                    minHeight: 400,
                }}
            />
        </Box>
    );
});
