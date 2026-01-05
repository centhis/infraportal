import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextField, Button, Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import TransferList from '../../../../components/forms/TransferList';

const roleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  permissions: z.array(z.number()).optional(),
});

const getInitialValues = (defaultValues) => {
    if (defaultValues) {
        return {
            ...defaultValues,
            permissions: defaultValues.permissions ? defaultValues.permissions.map(p => p.id) : [],
        };
    }
    return { name: '', description: '', permissions: [] };
};

const RoleForm = ({ onSubmit, defaultValues, allPermissions }) => {
  const { t } = useTranslation('user_management');
  const isEditing = !!defaultValues;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '', description: '', permissions: [] }, // Initialize with empty, then reset
  });

  useEffect(() => {
    // Reset the form if the defaultValues prop changes (e.g., user selects a different role to edit)
    reset(getInitialValues(defaultValues));
  }, [defaultValues, reset]);

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
              disabled={isEditing && defaultValues?.built_in}
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
              disabled={isEditing && defaultValues?.built_in}
            />
          )}
        />
        
        <Typography variant="h6" sx={{ mt: 2 }}>{t('user_management.roles.form.permissions_title')}</Typography>
        <Controller
            name="permissions"
            control={control}
            render={({ field }) => (
                <TransferList
                    allItems={allPermissions || []}
                    selectedIds={field.value}
                    onChange={field.onChange}
                    disabled={isEditing && defaultValues?.built_in}
                />
            )}
        />

        <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={isEditing && defaultValues?.built_in}>
          {isEditing ? t('user_management.roles.form.save_changes') : t('user_management.roles.form.create_role')}
        </Button>
      </Box>
    </form>
  );
};

export default RoleForm;
