import { type ReactNode } from 'react';
import {
    DataGrid,
    type DataGridProps,
    type GridColDef,
    type GridRowSelectionModel,
    type GridPaginationModel,
} from '@mui/x-data-grid';
import Box from '@mui/material/Box';

export interface DataTableProps<R extends { id: number | string }>
    extends Omit<DataGridProps<R>, 'columns' | 'rows'> {
    /** Колонки таблицы */
    columns: GridColDef<R>[];
    /** Данные */
    rows: R[];
    /** Общее количество записей (для серверной пагинации) */
    totalRows?: number;
    /** Индикатор загрузки */
    loading?: boolean;
    /** Пагинация */
    paginationModel?: GridPaginationModel;
    /** Callback изменения пагинации */
    onPaginationModelChange?: (model: GridPaginationModel) => void;
    /** Выделенные строки */
    rowSelectionModel?: GridRowSelectionModel;
    /** Callback выделения */
    onRowSelectionModelChange?: (model: GridRowSelectionModel) => void;
    /** Слот для пустого состояния */
    emptyStateSlot?: ReactNode;
    /** Высота таблицы */
    height?: number | string;
}

/**
 * Обёртка над MUI DataGrid с преднастроенными опциями.
 */
export function DataTable<R extends { id: number | string }>({
    columns,
    rows,
    totalRows,
    loading = false,
    paginationModel,
    onPaginationModelChange,
    rowSelectionModel,
    onRowSelectionModelChange,
    emptyStateSlot,
    height = 400,
    ...props
}: DataTableProps<R>) {
    return (
        <Box sx={{ height, width: '100%' }}>
            <DataGrid
                columns={columns}
                rows={rows}
                {...(totalRows !== undefined && { rowCount: totalRows })}
                loading={loading}
                {...(paginationModel && { paginationModel })}
                {...(onPaginationModelChange && { onPaginationModelChange })}
                {...(rowSelectionModel && { rowSelectionModel })}
                {...(onRowSelectionModelChange && { onRowSelectionModelChange })}
                paginationMode={totalRows !== undefined ? 'server' : 'client'}
                pageSizeOptions={[10, 25, 50, 100]}
                disableRowSelectionOnClick
                slots={emptyStateSlot ? { noRowsOverlay: () => <>{emptyStateSlot}</> } : {}}
                sx={{
                    border: 'none',
                    '& .MuiDataGrid-cell:focus': {
                        outline: 'none',
                    },
                    '& .MuiDataGrid-columnHeader:focus': {
                        outline: 'none',
                    },
                }}
                {...props}
            />
        </Box>
    );
}
