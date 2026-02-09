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
import type { Role, Permission } from '../../api/users.dto';

// Схема Zod
const roleSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    permissions: z.array(z.number()).optional(),
});

export type RoleFormData = z.infer<typeof roleSchema>;

export interface RoleFormProps {
    onSubmit: (data: RoleFormData) => void;
    defaultValues?: Role | null;
    allPermissions?: Permission[];
    isViewOnly?: boolean;
}

function getInitialValues(defaultValues?: Role | null): RoleFormData {
    if (defaultValues) {
        return {
            name: defaultValues.name,
            description: defaultValues.description ?? '',
            permissions: defaultValues.permissions?.map((p) => p.id) ?? [],
        };
    }
    return { name: '', description: '', permissions: [] };
}

/**
 * Форма создания/редактирования роли
 */
export function RoleForm({ onSubmit, defaultValues, allPermissions = [], isViewOnly = false }: RoleFormProps) {
    const { t } = useTranslation('user_management');
    const isEditing = !!defaultValues;
    const isBuiltIn = isEditing && defaultValues?.built_in;
    const { can } = usePermissions();

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm<RoleFormData>({
        resolver: zodResolver(roleSchema),
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
                            label={t('user_management.roles.form.name')}
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
                            label={t('user_management.roles.form.description')}
                            error={!!errors.description}
                            helperText={errors.description?.message}
                            multiline
                            rows={3}
                            disabled={isBuiltIn || disableFormFields}
                        />
                    )}
                />

                <Typography variant="h6" sx={{ mt: 2 }}>
                    {t('user_management.roles.form.permissions_title')}
                </Typography>
                <Controller
                    name="permissions"
                    control={control}
                    render={({ field }) => (
                        <TransferList
                            allItems={allPermissions}
                            selectedIds={field.value || []}
                            onChange={field.onChange}
                            disabled={disableFormFields}
                            itemType="permission"
                            disabledItemsIds={
                                defaultValues?.built_in_permission_ids && defaultValues.built_in_permission_ids.length > 0
                                    ? defaultValues.built_in_permission_ids
                                    : []
                            }
                        />
                    )}
                />

                <Button
                    type="submit"
                    variant="contained"
                    sx={{ mt: 2 }}
                    disabled={isViewOnly || !isDirty || (isEditing && !canEdit) || (!isEditing && !canCreate)}
                >
                    {isEditing ? t('user_management.roles.form.save_changes') : t('user_management.roles.form.create_role')}
                </Button>
            </Box>
        </form>
    );
}
