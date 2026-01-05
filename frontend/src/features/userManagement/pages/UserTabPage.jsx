import { useState, useRef } from "react";
import { Dialog, DialogTitle, DialogContent, Box, Button, IconButton, CircularProgress } from "@mui/material";
import { useTranslation } from 'react-i18next';
import RefreshIcon from '@mui/icons-material/Refresh';

import useUsers from "../hooks/useUsers";
import UserTable from "../components/user/UserTable";
import UserForm from "../components/user/UserForm";
import ConfirmDialog from "../../../components/layout/ConfirmDialog/ConfirmDialog";

const UserTabPage = () => {
    const { t } = useTranslation('user_management');
    const usersState = useUsers();
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const addUserButtonRef = useRef(null);

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    const handleAddUser = () => {
        setEditingUser(null);
        setIsFormOpen(true);
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingUser(null);
        addUserButtonRef.current?.focus();
    };

    const handleFormSubmit = (data) => {
        if (editingUser) {
            usersState.updateUser(editingUser.id, data);
        } else {
            usersState.createUser(data);
        }
        handleCloseForm();
    };

    const handleDeleteRequest = (userId) => {
        setUserToDelete(userId);
        setConfirmDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (userToDelete) {
            usersState.deleteUser(userToDelete);
        }
        setConfirmDialogOpen(false);
        setUserToDelete(null);
    };

    const handleCancelDelete = () => {
        setConfirmDialogOpen(false);
        setUserToDelete(null);
    };

    if (usersState.loading) {
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
                    <IconButton onClick={usersState.refetchUsers} color="primary">
                        <RefreshIcon />
                    </IconButton>
                    <Button
                        variant='contained'
                        color='primary'
                        onClick={handleAddUser}
                        ref={addUserButtonRef}
                    >
                        {t('user_management.users.actions.add_user_button')}
                    </Button>.
                </Box>
                <UserTable 
                    users={usersState.users}
                    onEdit={handleEditUser}
                    onDelete={handleDeleteRequest}
                    rowCount={usersState.rowCount}
                    paginationModel={usersState.paginationModel}
                    onPaginationModelChange={usersState.setPaginationModel}
                />
            </Box>
            <Dialog open={isFormOpen} onClose={handleCloseForm}>
                <DialogTitle>{editingUser ? t('user_management.users.form.edit_title') : t('user_management.users.form.create_title')}</DialogTitle>
                <DialogContent>
                    <UserForm 
                        onSubmit={handleFormSubmit}
                        defaultValues={editingUser}
                    />
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                open={confirmDialogOpen}
                onClose={handleCancelDelete}
                onConfirm={handleConfirmDelete}
                title={t('user_management.users.delete_dialog.title')}
                message={t('user_management.users.delete_dialog.message')}
            />
        </>
    )
}

export default UserTabPage;
