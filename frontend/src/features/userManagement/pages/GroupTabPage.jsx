import { useState, useRef } from "react";
import { Dialog, DialogTitle, DialogContent, Box, Button, IconButton, CircularProgress } from "@mui/material";
import { useTranslation } from 'react-i18next';
import RefreshIcon from '@mui/icons-material/Refresh';

import useGroups from "../hooks/useGroups";
import useRoles from "../hooks/useRoles";
import useUsers from "../../userManagement/hooks/useUsers";
import { usePermissions } from "../../../app/providers/PermissionsProvider";
import GroupTable from "../components/group/GroupTable";
import GroupForm from "../components/group/GroupForm";
import ConfirmDialog from "../../../components/layout/ConfirmDialog/ConfirmDialog";

const GroupTabPage = () => {
    const { t } = useTranslation('user_management');
    const groupsState = useGroups();
    const { roles: allRoles, loading: rolesLoading } = useRoles({ paginated: false });
    const { users: allUsers, loading: usersLoading } = useUsers({ paginated: false });
    const { can, loading: userPermissionsLoading } = usePermissions();
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const addGroupButtonRef = useRef(null);

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);

    const handleAddGroup = () => {
        setEditingGroup(null);
        setIsFormOpen(true);
    };

    const handleEditGroup = (group) => {
        setEditingGroup(group);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingGroup(null);
        addGroupButtonRef.current?.focus();
    };

    const handleFormSubmit = (data) => {
        if (editingGroup) {
            groupsState.updateGroup(editingGroup.id, data);
        } else {
            groupsState.createGroup(data);
        }
        handleCloseForm();
    };

    const handleDeleteRequest = (groupId) => {
        setGroupToDelete(groupId);
        setConfirmDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (groupToDelete) {
            groupsState.deleteGroup(groupToDelete);
        }
        setConfirmDialogOpen(false);
        setGroupToDelete(null);
    };

    const handleCancelDelete = () => {
        setConfirmDialogOpen(false);
        setGroupToDelete(null);
    };

    if (groupsState.loading || rolesLoading || usersLoading || userPermissionsLoading) {
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
                    <IconButton onClick={groupsState.refetchGroups} color="primary">
                        <RefreshIcon />
                    </IconButton>
                    <Button
                        variant='contained'
                        color='primary'
                        onClick={handleAddGroup}
                        ref={addGroupButtonRef}
                        disabled={!can('users:create')}
                    >
                        {t('user_management.groups.actions.add_group_button')}
                    </Button>
                </Box>
                <GroupTable 
                    groups={groupsState.groups}
                    onEdit={handleEditGroup}
                    onDelete={can('users:delete') ? handleDeleteRequest : undefined}
                    canDelete={can('users:delete')}
                    rowCount={groupsState.rowCount}
                    paginationModel={groupsState.paginationModel}
                    onPaginationModelChange={groupsState.setPaginationModel}
                />
            </Box>
            <Dialog open={isFormOpen} onClose={handleCloseForm}>
                <DialogTitle>{editingGroup ? t('user_management.groups.form.edit_title') : t('user_management.groups.form.create_title')}</DialogTitle>
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
            <ConfirmDialog
                open={confirmDialogOpen}
                onClose={handleCancelDelete}
                onConfirm={handleConfirmDelete}
                title={t('user_management.groups.delete_dialog.title')}
                message={t('user_management.groups.delete_dialog.message')}
            />
        </>
    )
}

export default GroupTabPage;