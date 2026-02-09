import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@core/auth';
import type { User, Group } from '../../api/users.dto';
import { TransferList } from './TransferList';

// Схема Zod
const userSchema = z.object({
    login: z.string().min(1, 'Login is required'),
    name: z.string().min(1, 'Name is required'),
    password: z.string().optional(),
    is_active: z.boolean(),
    groups: z.array(z.number()).optional(),
});

export type UserFormData = z.infer<typeof userSchema>;

export interface UserFormProps {
    onSubmit: (data: UserFormData) => void;
    defaultValues?: User | null;
    allGroups?: Group[];
    isViewOnly?: boolean;
}

function getInitialValues(defaultValues?: User | null): UserFormData {
    if (defaultValues) {
        return {
            login: defaultValues.login,
            name: defaultValues.name,
            password: '',
            is_active: defaultValues.is_active,
            groups: defaultValues.groups?.map((g) => g.id) ?? [],
        };
    }
    return { login: '', name: '', password: '', is_active: true, groups: [] };
}

/**
 * Форма создания/редактирования пользователя
 */
export function UserForm({ onSubmit, defaultValues, allGroups = [], isViewOnly = false }: UserFormProps) {
    const { t } = useTranslation('user_management');
    const isEditing = !!defaultValues;
    const isBuiltInUser = isEditing && defaultValues?.type === 'built_in';
    const { can } = usePermissions();

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
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
                    name="login"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label={t('user_management.users.form.login')}
                            error={!!errors.login}
                            helperText={errors.login?.message}
                            required
                            autoFocus
                            disabled={isBuiltInUser || disableFormFields}
                        />
                    )}
                />
                <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label={t('user_management.users.form.name')}
                            error={!!errors.name}
                            helperText={errors.name?.message}
                            required
                            disabled={isBuiltInUser || disableFormFields}
                        />
                    )}
                />
                <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            type="password"
                            label={t('user_management.users.form.password')}
                            helperText={isEditing ? t('user_management.users.form.password_edit_helper') : ''}
                            disabled={disableFormFields}
                        />
                    )}
                />
                <Controller
                    name="is_active"
                    control={control}
                    render={({ field }) => (
                        <FormControlLabel
                            control={<Switch {...field} checked={field.value} disabled={isBuiltInUser || disableFormFields} />}
                            label={t('user_management.users.form.is_active')}
                        />
                    )}
                />

                <Typography variant="h6" sx={{ mt: 2 }}>
                    {t('user_management.users.form.groups_title')}
                </Typography>
                <Controller
                    name="groups"
                    control={control}
                    render={({ field }) => (
                        <Box data-testid="groups-transfer-list">
                            <TransferList
                                allItems={allGroups}
                                selectedIds={field.value || []}
                                onChange={field.onChange}
                                disabled={disableFormFields}
                                itemType="group"
                                disabledItemsIds={
                                    isBuiltInUser
                                        ? allGroups.filter((g) => g.built_in).map((g) => g.id)
                                        : []
                                }
                            />
                        </Box>
                    )}
                />

                <Button
                    type="submit"
                    variant="contained"
                    sx={{ mt: 2 }}
                    disabled={isViewOnly || !isDirty || (isEditing && !canEdit) || (!isEditing && !canCreate)}
                >
                    {isEditing ? t('user_management.users.form.save_changes') : t('user_management.users.form.create_user')}
                </Button>
            </Box>
        </form>
    );
}
