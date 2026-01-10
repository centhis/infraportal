import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextField, Button, Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import TransferList from '../../../../components/forms/TransferList';
import { usePermissions } from '../../../../app/providers/PermissionsProvider';

const groupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  roles: z.array(z.number()).optional(),
  users: z.array(z.number()).optional(),
});

const getInitialValues = (defaultValues) => {
    if (defaultValues) {
        return {
            ...defaultValues,
            roles: defaultValues.roles ? defaultValues.roles.map(r => r.id) : [],
            users: defaultValues.users ? defaultValues.users.map(u => u.id) : [],
        };
    }
    return { name: '', description: '', roles: [], users: [] };
};

const GroupForm = ({ onSubmit, defaultValues, allRoles, allUsers, isViewOnly = false }) => { // Add allUsers prop
  const { t } = useTranslation('user_management');
  const isEditing = !!defaultValues;
  const { can } = usePermissions();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: '', description: '', roles: [], users: [] },
  });

  useEffect(() => {
    reset(getInitialValues(defaultValues));
  }, [defaultValues, reset]);

  const canEdit = can('users:update');
  const canCreate = can('users:create');
  const disableFormFields = isViewOnly || (isEditing && !canEdit);
  const isBuiltInGroup = isEditing && defaultValues?.built_in;

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
              disabled={isBuiltInGroup || disableFormFields}
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
              disabled={isBuiltInGroup || disableFormFields}
            />
          )}
        />
        
        <Box data-testid="roles-transfer-list">
          <Typography variant="h6" sx={{ mt: 2 }}>{t('user_management.groups.form.roles_title')}</Typography>
          <Controller
              name="roles"
              control={control}
              render={({ field }) => (
                  <TransferList
                      allItems={allRoles || []}
                      selectedIds={field.value}
                      onChange={field.onChange}
                      disabled={disableFormFields}
                      itemType="role"
                      disabledItemsIds={defaultValues?.built_in_role_ids || []}
                  />
              )}
          />
        </Box>

        <Box data-testid="users-transfer-list">
          <Typography variant="h6" sx={{ mt: 2 }}>{t('user_management.groups.form.users_title')}</Typography>
          <Controller
              name="users"
              control={control}
              render={({ field }) => (
                  <TransferList
                      allItems={allUsers || []}
                      selectedIds={field.value}
                      onChange={field.onChange}
                      disabled={disableFormFields}
                      itemType="user"
                      disabledItemsIds={defaultValues?.built_in_user_ids || []}
                  />
              )}
          />
        </Box>

        <Button 
          type="submit" 
          variant="contained" 
          sx={{ mt: 2 }} 
          disabled={
            isViewOnly ||
            !isDirty ||
            (isEditing && !canEdit) ||
            (!isEditing && !canCreate)
          }
        >
          {isEditing ? t('user_management.groups.form.save_changes') : t('user_management.groups.form.create_group')}
        </Button>
      </Box>
    </form>
  );
};

export default GroupForm;