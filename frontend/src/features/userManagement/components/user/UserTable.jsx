import React, { useMemo } from "react";
import { DataGrid, gridClasses } from "@mui/x-data-grid";
import { Box, IconButton, Chip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PolicyIcon from "@mui/icons-material/Policy"; // Импортируем PolicyIcon
import { useTranslation } from 'react-i18next';

import usePersistentState from "../../hooks/usePersistentState";

const AuthTypeChip = ({ type, t }) => {
    const typeMap = {
        built_in: { label: t('user_management.users.table.auth_type.built_in'), color: "info" },
        local: { label: t('user_management.users.table.auth_type.local'), color: "default" },
        ldap: { label: t('user_management.users.table.auth_type.ldap'), color: "warning" },
        openid: { label: t('user_management.users.table.auth_type.openid'), color: "secondary" },
    };

    const { label, color } = typeMap[type] || { label: type, color: "default" };

    return (
        <Chip
            label={label}
            color={color}
            variant="outlined"
            size="small"
        />
    );
};

const UserTable = React.memo(({ 
    users, 
    onEdit, 
    onDelete,
    rowCount,
    paginationModel,
    onPaginationModelChange,
    onPermissionsReport, // Добавлен новый пропс
    canDelete,
}) => {
    const {t} = useTranslation('user_management');

    const [columnVisibilityModel, setColumnVisibilityModel] = usePersistentState('user-table-visibility', {});

    const columns = useMemo(() => [
        { field: "id", headerName: t('user_management.users.table.id'), width: 90 },
        { field: "login", headerName: t('user_management.users.table.login'), flex: 1 },
        { field: "name", headerName: t('user_management.users.table.name'), flex: 1 },
        { 
            field: "type", 
            headerName: t('user_management.users.table.type'), 
            flex: 1,
            renderCell: (params) => (
                <AuthTypeChip 
                    type={params.value}
                    t={t} 
                />
            )
        },
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
            width: 120, // Увеличить ширину для новой кнопки
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params) => (
                <Box>
                    <IconButton 
                        aria-label={t('user_management.users.table.permissions_report_button')} // Используем перевод
                        color="primary" // Можно выбрать другой цвет, например "info"
                        onClick={(event) => {
                            event.stopPropagation();
                            onPermissionsReport(params.row.id, params.row.name); // Передаем id и имя пользователя
                        }}
                    >
                        <PolicyIcon />
                    </IconButton>
                    <IconButton aria-label="delete" color="error" onClick={(event) => {
                        event.stopPropagation();
                        onDelete(params.row.id);
                    }} disabled={!canDelete || params.row.type === 'built_in'}>
                        <DeleteIcon />
                    </IconButton>
                </Box>
            ),
        },
    ], [t, onDelete, onPermissionsReport, canDelete]); // Добавляем canDelete в зависимости useMemo

    return (
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