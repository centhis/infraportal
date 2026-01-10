import { useState, useRef } from "react";
import { Dialog, DialogTitle, DialogContent, Box, Button, IconButton, CircularProgress } from "@mui/material";
import { useTranslation } from 'react-i18next';
import RefreshIcon from '@mui/icons-material/Refresh';

import useRoles from "../hooks/useRoles";
import { usePermissions as useUserPermissions } from "../../../app/providers/PermissionsProvider";
import useAllPermissions from "../hooks/usePermissions";
import RoleTable from "../components/role/RoleTable";
import RoleForm from "../components/role/RoleForm";
import ConfirmDialog from "../../../components/layout/ConfirmDialog/ConfirmDialog";

const RoleTabPage = () => {
    const { t } = useTranslation('user_management');
    const rolesState = useRoles();
    const { can, loading: userPermissionsLoading } = useUserPermissions();
    const { permissions: allPermissions, loading: allPermissionsLoading } = useAllPermissions();
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const addRoleButtonRef = useRef(null);

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState(null);

    const handleAddRole = () => {
        setEditingRole(null);
        setIsFormOpen(true);
    };

    const handleEditRole = (role) => {
        setEditingRole(role);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingRole(null);
        addRoleButtonRef.current?.focus();
    };

    const handleFormSubmit = (data) => {
        if (editingRole) {
            rolesState.updateRole(editingRole.id, data);
        } else {
            rolesState.createRole(data);
        }
        handleCloseForm();
    };

    const handleDeleteRequest = (roleId) => {
        setRoleToDelete(roleId);
        setConfirmDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (roleToDelete) {
            rolesState.deleteRole(roleToDelete);
        }
        setConfirmDialogOpen(false);
        setRoleToDelete(null);
    };

    const handleCancelDelete = () => {
        setConfirmDialogOpen(false);
        setRoleToDelete(null);
    };

    if (rolesState.loading || userPermissionsLoading || allPermissionsLoading) {
        return (
            <Box p={4} display="flex" justifyContent="center">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <>
            <Box display="flex" flexDirection="column" gap={2}>
                <Box sx={{ display: 'flex', gap: 1, alignSelf: 'flex-end' }}>
                    <IconButton onClick={rolesState.refetchRoles} color="primary">
                        <RefreshIcon />
                    </IconButton>
                    <Button
                        variant='contained'
                        color='primary'
                        onClick={handleAddRole}
                        ref={addRoleButtonRef}
                        disabled={!can('users:create')}
                    >
                        {t('user_management.roles.actions.add_role_button')}
                    </Button>
                </Box>
                <RoleTable 
                    roles={rolesState.roles}
                    onEdit={handleEditRole}
                    onDelete={can('users:delete') ? handleDeleteRequest : undefined}
                    canDelete={can('users:delete')}
                    rowCount={rolesState.rowCount}
                    paginationModel={rolesState.paginationModel}
                    onPaginationModelChange={rolesState.setPaginationModel}
                />
            </Box>
            <Dialog open={isFormOpen} onClose={handleCloseForm}>
                <DialogTitle>{editingRole ? t('user_management.roles.form.edit_title') : t('user_management.roles.form.create_title')}</DialogTitle>
                <DialogContent>
                    <RoleForm
                        onSubmit={handleFormSubmit}
                        defaultValues={editingRole}
                        allPermissions={allPermissions}
                        isViewOnly={editingRole ? !can('users:update') : false}
                    />
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                open={confirmDialogOpen}
                onClose={handleCancelDelete}
                onConfirm={handleConfirmDelete}
                title={t('user_management.roles.delete_dialog.title')}
                message={t('user_management.roles.delete_dialog.message')}
            />
        </>
    )
}

export default RoleTabPage;