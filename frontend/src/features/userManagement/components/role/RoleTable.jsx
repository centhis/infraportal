import { useMemo } from "react";
import { DataGrid, gridClasses } from "@mui/x-data-grid";
import { Box, IconButton, Chip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useTranslation } from 'react-i18next';

import usePersistentState from "../../../../shared/hooks/usePersistentState";

const RoleTable = ({
    roles,
    onEdit,
    onDelete,
    rowCount,
    paginationModel,
    onPaginationModelChange,
    canDelete // New prop
}) => {
    const { t } = useTranslation('user_management');

    const [columnVisibilityModel, setColumnVisibilityModel] = usePersistentState('role-table-visibility', {});

    const columns = useMemo(() => [
        { field: "id", headerName: t('user_management.roles.table.id'), width: 90 },
        { field: "name", headerName: t('user_management.roles.table.name'), flex: 1 },
        { field: "description", headerName: t('user_management.roles.table.description'), flex: 2 },
        {
            field: "permissions",
            headerName: t('user_management.roles.table.permissions'),
            flex: 1,
            sortable: false,
            renderCell: (params) => (
                <span>{params.row.permissions?.length || 0}</span>
            )
        },
        {
            field: "built_in",
            headerName: t('user_management.roles.table.type'),
            flex: 1,
            renderCell: (params) => (
                <Chip
                    label={params.value ? t('user_management.roles.table.type_built_in') : t('user_management.roles.table.type_custom')}
                    color={params.value ? "info" : "default"}
                    variant="outlined"
                    size="small"
                />
            )
        },
        { field: "created_at", headerName: t('user_management.roles.table.created_at'), flex: 1 },
        {
            field: "actions",
            headerName: t('user_management.roles.table.actions'),
            renderHeader: () => null,
            width: 120,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params) => (
                <Box>
                    <IconButton aria-label="delete" color="error" onClick={(event) => {
                        event.stopPropagation(); // Prevent onRowClick from firing
                        onDelete(params.row.id);
                    }} disabled={!canDelete || params.row.built_in}>
                        <DeleteIcon />
                    </IconButton>
                </Box>
            ),
        },
    ], [t, onDelete, canDelete]); // Added canDelete to dependencies

    return (
        <DataGrid
            rows={roles}
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
            onRowClick={(params) => onEdit(params.row)} // <--- Added onRowClick
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
};

export default RoleTable;
