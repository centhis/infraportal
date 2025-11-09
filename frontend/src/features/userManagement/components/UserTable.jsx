import React, { useMemo } from "react";
import { DataGrid, GridActionsCellItem, gridClasses } from "@mui/x-data-grid";
import { Box, IconButton, Chip } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useTranslation } from 'react-i18next';

import usePersistentState from "../hooks/usePersistentState";

const UserTable = React.memo(({ 
    users, 
    onEdit, 
    onDelete,
    rowCount,
    paginationModel,
    onPaginationModelChange,
}) => {
    const {t} = useTranslation('user_management');

    const [columnVisibilityModel, setColumnVisibilityModel] = usePersistentState('user-table-visibility', {});

    const columns = useMemo(() => [
        { field: "id", headerName: t('user_management.users.table.id'), width: 90 },
        { field: "login", headerName: t('user_management.users.table.login'), flex: 1 },
        { field: "name", headerName: t('user_management.users.table.name'), flex: 1 },
        { field: "auth_type", headerName: t('user_management.users.table.auth'), flex: 1 },
        { field: "created_at", headerName: t('user_management.users.table.created_at'), flex: 1 },
        { 
            field: "is_active", 
            headerName: t('user_management.users.table.is_active'), 
            flex: 1,
            renderCell: (params) => (
                <Chip 
                    label={params.value ? t('user_management.users.table.status.active') : t('user_management.users.table.status.inactive')}
                    color={params.value ? "success" : "error"}
                    variant="outlined"
                    size="small"
                />
            )
        },
        {
            field: "actions",
            headerName: t('user_management.users.table.actions'),
            renderHeader: () => null,
            width: 120,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params) => (
                <Box>
                    <IconButton color="primary" onClick={() => onEdit(params.row)}>
                        <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => onDelete(params.row.id)}>
                        <DeleteIcon />
                    </IconButton>
                </Box>
            ),
        },
    ], [t, onEdit, onDelete]);

    return (
        <DataGrid 
            rows={users}
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

export default UserTable;