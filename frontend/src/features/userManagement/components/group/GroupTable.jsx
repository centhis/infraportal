import React, { useMemo } from "react";
import { DataGrid, gridClasses } from "@mui/x-data-grid";
import { Box, IconButton, Chip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useTranslation } from 'react-i18next';

import usePersistentState from "../../hooks/usePersistentState";

const GroupTable = React.memo(({
    groups,
    onEdit,
    onDelete,
    rowCount,
    paginationModel,
    onPaginationModelChange,
}) => {
    const { t } = useTranslation('user_management');

    const [columnVisibilityModel, setColumnVisibilityModel] = usePersistentState('group-table-visibility', {});

    const columns = useMemo(() => [
        { field: "id", headerName: t('user_management.groups.table.id'), width: 90 },
        { field: "name", headerName: t('user_management.groups.table.name'), flex: 1 },
        { field: "description", headerName: t('user_management.groups.table.description'), flex: 2 },
        {
            field: "users",
            headerName: t('user_management.groups.table.users'),
            flex: 1,
            sortable: false,
            renderCell: (params) => (
                <span>{params.row.users?.length || 0}</span>
            )
        },
        {
            field: "roles",
            headerName: t('user_management.groups.table.roles'),
            flex: 1,
            sortable: false,
            renderCell: (params) => (
                <span>{params.row.roles?.length || 0}</span>
            )
        },
        {
            field: "built_in",
            headerName: t('user_management.groups.table.type'),
            flex: 1,
            renderCell: (params) => (
                <Chip
                    label={params.value ? t('user_management.groups.table.type_built_in') : t('user_management.groups.table.type_custom')}
                    color={params.value ? "info" : "default"}
                    variant="outlined"
                    size="small"
                />
            )
        },
        { field: "created_at", headerName: t('user_management.groups.table.created_at'), flex: 1 },
        {
            field: "actions",
            headerName: t('user_management.groups.table.actions'),
            renderHeader: () => null,
            width: 120,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params) => (
                <Box>
                    <IconButton aria-label="delete" color="error" onClick={(event) => {
                        event.stopPropagation();
                        onDelete(params.row.id);
                    }} disabled={params.row.built_in}>
                        <DeleteIcon />
                    </IconButton>
                </Box>
            ),
        },
    ], [t, onDelete]);

    return (
        <DataGrid
            rows={groups}
            columns={columns}
            getRowId={(row) => row.id}
            rowCount={rowCount}
            paginationModel={paginationModel}
            onPaginationModelChange={onPaginationModelChange}
            pagination
            paginationMode="server"
            showToolbar
            pageSizeOptions={[5, 10, 25]}
            disableRowSelectionOnClick
            sortingMode="server"
            filterMode="server"
            columnVisibilityModel={columnVisibilityModel}
            onColumnVisibilityModelChange={setColumnVisibilityModel}
            onRowClick={(params) => onEdit(params.row)}
            sx={{
              [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
                outline: 'transparent',
              },
              [`& .${gridClasses.columnHeader}:focus-within, & .${gridClasses.cell}:focus-within`]:
                {
                  outline: 'none',
                },
              [`& .${gridClasses.row}:hover`]: {
                cursor: 'pointer',
              },
            }}
        />
    )
});

export default GroupTable;
