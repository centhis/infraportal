import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextField, Button, Box, FormControlLabel, Switch, Typography } from '@mui/material'; // Add Typography
import { useTranslation } from 'react-i18next';
import TransferList from '../../../../components/forms/TransferList'; // Import TransferList
import { usePermissions } from '../../../../app/providers/PermissionsProvider';

const userSchema = z.object({
  login: z.string().min(1, 'Login is required'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().optional(), // Optional for editing
  is_active: z.boolean(),
  groups: z.array(z.number()).optional(), // Add groups field
});

// Helper function to prepare initial form values, mapping group objects to IDs
const getInitialValues = (defaultValues) => {
    if (defaultValues) {
        return {
            password: '', // Ensure password is not undefined
            ...defaultValues,
            groups: defaultValues.groups ? defaultValues.groups.map(g => g.id) : [],
        };
    }
    return { login: '', name: '', password: '', is_active: true, groups: [] };
};

const UserForm = ({ onSubmit, defaultValues, allGroups, isViewOnly = false }) => { // Add allGroups prop
  const { t } = useTranslation('user_management');
  const isEditing = !!defaultValues;
  const isBuiltInUser = isEditing && defaultValues?.type === 'built_in';
  const { can } = usePermissions();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty }, // Added isDirty
  } = useForm({
    resolver: zodResolver(userSchema),
    // Use getInitialValues here for default form state
    defaultValues: getInitialValues(defaultValues || { login: '', name: '', password: '', is_active: true, groups: [] }),
  });

  useEffect(() => {
    // Reset the form values when defaultValues prop changes
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
              control={<Switch {...field} checked={field.value} disabled={isBuiltInUser || disableFormFields} />}              label={t('user_management.users.form.is_active')}
            />
          )}
        />

        <Typography variant="h6" sx={{ mt: 2 }}>{t('user_management.users.form.groups_title')}</Typography>
        <Controller
            name="groups"
            control={control}
            render={({ field }) => (
                <TransferList
                    allItems={allGroups || []}
                    selectedIds={field.value}
                    onChange={field.onChange}
                    disabled={disableFormFields}
                    itemType="group" // Pass itemType here
                    disabledItemsIds={defaultValues?.built_in_group_ids || []}
                />
            )}
        />

        <Button 
          type="submit" 
          variant="contained" 
          sx={{ mt: 2 }} 
          disabled={
            isViewOnly ||
            !isDirty ||
            (isEditing && !canEdit) ||
            (!isEditing && !canCreate)
          }>
          {isEditing ? t('user_management.users.form.save_changes') : t('user_management.users.form.create_user')}
        </Button>
      </Box>
    </form>
  );
};

export default UserForm;