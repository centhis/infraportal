import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@core/auth';
import { TransferList } from './TransferList'; // Импорт TransferList
import type { Group, Role, User } from '../../api/users.dto';

// Схема Zod
const groupSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    roles: z.array(z.number()).optional(),
    users: z.array(z.number()).optional(),
});

export type GroupFormData = z.infer<typeof groupSchema>;

export interface GroupFormProps {
    onSubmit: (data: GroupFormData) => void;
    defaultValues?: Group | null;
    allRoles?: Role[];
    allUsers?: User[];
    isViewOnly?: boolean;
}

function getInitialValues(defaultValues?: Group | null): GroupFormData {
    if (defaultValues) {
        return {
            name: defaultValues.name,
            description: defaultValues.description ?? '',
            roles: defaultValues.roles?.map((r) => r.id) ?? [],
            users: defaultValues.users?.map((u) => u.id) ?? [],
        };
    }
    return { name: '', description: '', roles: [], users: [] };
}

/**
 * Форма создания/редактирования группы
 */
export function GroupForm({ onSubmit, defaultValues, allRoles = [], allUsers = [], isViewOnly = false }: GroupFormProps) {
    const { t } = useTranslation('user_management');
    const isEditing = !!defaultValues;
    const isBuiltIn = isEditing && defaultValues?.built_in;
    const { can } = usePermissions();

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm<GroupFormData>({
        resolver: zodResolver(groupSchema),
        defaultValues: getInitialValues(defaultValues),
    });

    useEffect(() => {
        reset(getInitialValues(defaultValues));
    }, [defaultValues, reset]);

    const canEdit = can('users:update');
    const canCreate = can('users:create');
    const disableFormFields = isViewOnly || (isEditing && !canEdit);

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label={t('user_management.groups.form.name')}
                            error={!!errors.name}
                            helperText={errors.name?.message}
                            required
                            autoFocus
                            disabled={isBuiltIn || disableFormFields}
                        />
                    )}
                />
                <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label={t('user_management.groups.form.description')}
                            error={!!errors.description}
                            helperText={errors.description?.message}
                            multiline
                            rows={3}
                            disabled={isBuiltIn || disableFormFields}
                        />
                    )}
                />

                <Box data-testid="roles-transfer-list">
                    <Typography variant="h6" sx={{ mt: 2 }}>
                        {t('user_management.groups.form.roles_title')}
                    </Typography>
                    <Controller
                        name="roles"
                        control={control}
                        render={({ field }) => (
                            <TransferList
                                allItems={allRoles}
                                selectedIds={field.value || []}
                                onChange={field.onChange}
                                disabled={disableFormFields}
                                itemType="role"
                                disabledItemsIds={
                                    defaultValues?.built_in_role_ids && defaultValues.built_in_role_ids.length > 0
                                        ? defaultValues.built_in_role_ids
                                        : []
                                }
                            />
                        )}
                    />
                </Box>

                <Box data-testid="users-transfer-list">
                    <Typography variant="h6" sx={{ mt: 2 }}>
                        {t('user_management.groups.form.users_title')}
                    </Typography>
                    <Controller
                        name="users"
                        control={control}
                        render={({ field }) => (
                            <TransferList
                                allItems={allUsers}
                                selectedIds={field.value || []}
                                onChange={field.onChange}
                                disabled={disableFormFields}
                                itemType="user"
                                disabledItemsIds={
                                    defaultValues?.built_in_user_ids && defaultValues.built_in_user_ids.length > 0
                                        ? defaultValues.built_in_user_ids
                                        : []
                                }
                            />
                        )}
                    />
                </Box>

                <Button
                    type="submit"
                    variant="contained"
                    sx={{ mt: 2 }}
                    disabled={isViewOnly || !isDirty || (isEditing && !canEdit) || (!isEditing && !canCreate)}
                >
                    {isEditing ? t('user_management.groups.form.save_changes') : t('user_management.groups.form.create_group')}
                </Button>
            </Box>
        </form>
    );
}
