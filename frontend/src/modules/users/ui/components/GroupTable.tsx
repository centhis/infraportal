import { memo, useMemo, useCallback, type Dispatch, type SetStateAction } from 'react';
import dayjs from 'dayjs';
import { DataGrid, gridClasses, type GridColDef, type GridPaginationModel, type GridSortModel } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { ColumnFilterHeader, ColumnSelectFilterHeader, ColumnDateRangeFilterHeader } from '@shared/ui/DataTable';
import type { Group } from '../../api/users.dto';

export interface GroupTableFilters {
    id?: string;
    name?: string;
    description?: string;
    built_in?: string;
    created_at_from?: string;
    created_at_to?: string;
}

export interface GroupTableProps {
    groups: Group[];
    rowCount: number;
    paginationModel: GridPaginationModel;
    onPaginationModelChange: (model: GridPaginationModel) => void;
    sortModel: GridSortModel;
    onSortModelChange: (model: GridSortModel) => void;
    filters: GroupTableFilters;
    onFiltersChange: Dispatch<SetStateAction<GroupTableFilters>>;
    columnVisibilityModel: Record<string, boolean>;
    onColumnVisibilityModelChange: (model: Record<string, boolean>) => void;
    onEdit: (group: Group) => void;
    onDelete: (groupId: number) => void;
    canDelete?: boolean;
    loading?: boolean;
}

/**
 * Таблица групп с серверной пагинацией
 */
export const GroupTable = memo(function GroupTable({
    groups,
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
    canDelete = true,
    loading = false,
}: GroupTableProps) {
    const { t } = useTranslation(['user_management', 'common']);

    const handleFilterChange = useCallback((field: keyof GroupTableFilters, value: string) => {
        onFiltersChange((prev: GroupTableFilters) => ({
            ...prev,
            [field]: value,
        }));
    }, [onFiltersChange]);

    const columns: GridColDef<Group>[] = useMemo(
        () => [
            {
                field: 'id',
                headerName: t('user_management.groups.table.id'),
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
                field: 'name',
                headerName: t('user_management.groups.table.name'),
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
                field: 'description',
                headerName: t('user_management.groups.table.description'),
                flex: 2,
                renderHeader: (params) => (
                    <ColumnFilterHeader
                        label={params.colDef.headerName ?? ''}
                        value={filters.description ?? ''}
                        onFilterChange={(val) => handleFilterChange('description', val)}
                    />
                ),
            },
            {
                field: 'roles',
                headerName: t('user_management.groups.table.roles'),
                width: 100,
                sortable: false,
                renderCell: (params) => <span>{params.row.roles?.length ?? 0}</span>,
            },
            {
                field: 'users',
                headerName: t('user_management.groups.table.users'),
                width: 100,
                sortable: false,
                renderCell: (params) => <span>{params.row.users?.length ?? 0}</span>,
            },
            {
                field: 'built_in',
                headerName: t('user_management.groups.table.type'),
                width: 150,
                renderCell: (params) => (
                    <Chip
                        label={params.value ? t('user_management.groups.table.type_built_in') : t('user_management.groups.table.type_custom')}
                        color={params.value ? 'info' : 'default'}
                        variant="outlined"
                        size="small"
                    />
                ),
                renderHeader: (params) => (
                    <ColumnSelectFilterHeader
                        label={params.colDef.headerName ?? ''}
                        value={filters.built_in ?? ''}
                        options={[
                            { value: 'true', label: t('user_management.groups.table.type_built_in') },
                            { value: 'false', label: t('user_management.groups.table.type_custom') },
                        ]}
                        allLabel={t('common:all', 'All')}
                        onFilterChange={(val) => handleFilterChange('built_in', val)}
                    />
                ),
            },
            {
                field: 'created_at',
                headerName: t('user_management.groups.table.created_at'),
                width: 180,
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
                field: 'actions',
                headerName: t('user_management.groups.table.actions'),
                renderHeader: () => null,
                width: 120,
                sortable: false,
                filterable: false,
                disableColumnMenu: true,
                renderCell: (params) => (
                    <Box>
                        <IconButton
                            aria-label="delete"
                            color="error"
                            onClick={(event) => {
                                event.stopPropagation();
                                onDelete(params.row.id);
                            }}
                            disabled={!canDelete || params.row.built_in}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Box>
                ),
            },
        ],
        [t, onDelete, canDelete, handleFilterChange, onFiltersChange, filters.id, filters.name, filters.description, filters.built_in, filters.created_at_from, filters.created_at_to]
    );

    return (
        <Box sx={{ width: '100%', overflow: 'hidden' }}>
            <DataGrid
                rows={groups}
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
