import { useState, useRef } from "react";
import { Dialog, DialogTitle, DialogContent, Box, Button, IconButton, CircularProgress } from "@mui/material";
import { useTranslation } from 'react-i18next';
import RefreshIcon from '@mui/icons-material/Refresh';

import useUsers from "../hooks/useUsers";
import useGroups from "../hooks/useGroups"; // Import useGroups
import { usePermissions } from "../../../app/providers/PermissionsProvider";
import UserTable from "../components/user/UserTable";
import UserForm from "../components/user/UserForm";
import ConfirmDialog from "../../../components/layout/ConfirmDialog/ConfirmDialog";
import PermissionsReportDialog from "../components/user/PermissionsReportDialog"; // Импорт нового компонента
import AxiosInstance from "../../../shared/api/AxiosInstance"; // Правильный импорт


const UserTabPage = () => {
    const { t } = useTranslation('user_management');
    const usersState = useUsers();
    const { groups: allGroups, loading: groupsLoading } = useGroups({ paginated: false }); // Fetch all groups
    const { can, loading: userPermissionsLoading } = usePermissions();
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const addUserButtonRef = useRef(null);

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    // Состояния для отчета по разрешениям
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [isReportLoading, setIsReportLoading] = useState(false);

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

    // Функция для открытия отчета по разрешениям
    const handlePermissionsReport = async (userId) => {
        setIsReportLoading(true);
        setIsReportDialogOpen(true);
        setReportData(null); // Сброс предыдущих данных
        try {
            const response = await AxiosInstance.get(`/users/${userId}/permissions_report`); // Исправленный URL
            setReportData(response.data);
        } catch (error) {
            console.error("Error fetching permissions report:", error); // Ошибка на английском
            // Возможно, здесь стоит добавить обработку ошибок для пользователя
        } finally {
            setIsReportLoading(false);
        }
    };

    // Функция для закрытия диалога отчета
    const handleCloseReportDialog = () => {
        setIsReportDialogOpen(false);
        setReportData(null);
    };


    if (usersState.loading || groupsLoading || userPermissionsLoading) {
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
                        disabled={!can('users:create')}
                    >
                        {t('user_management.users.actions.add_user_button')}
                    </Button>
                </Box>
                <UserTable 
                    users={usersState.users}
                    onEdit={handleEditUser}
                    onDelete={can('users:delete') ? handleDeleteRequest : undefined}
                    canDelete={can('users:delete')}
                    rowCount={usersState.rowCount}
                    paginationModel={usersState.paginationModel}
                    onPaginationModelChange={usersState.setPaginationModel}
                    onPermissionsReport={handlePermissionsReport} // Передача новой функции
                />
            </Box>
            <Dialog open={isFormOpen} onClose={handleCloseForm}>
                <DialogTitle>{editingUser ? t('user_management.users.form.edit_title') : t('user_management.users.form.create_title')}</DialogTitle>
                <DialogContent>
                    <UserForm 
                        onSubmit={handleFormSubmit}
                        defaultValues={editingUser}
                        allGroups={allGroups}
                        isViewOnly={editingUser ? !can('users:update') : false}
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
            {/* Диалог отчета по разрешениям */}
            <PermissionsReportDialog
                open={isReportDialogOpen}
                onClose={handleCloseReportDialog}
                reportData={reportData}
                isLoading={isReportLoading}
            />
        </>
    )
}

export default UserTabPage;
