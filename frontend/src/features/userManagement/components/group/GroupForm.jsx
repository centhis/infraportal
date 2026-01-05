import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextField, Button, Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import TransferList from '../../../../components/forms/TransferList';

const groupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  roles: z.array(z.number()).optional(),
});

const getInitialValues = (defaultValues) => {
    if (defaultValues) {
        return {
            ...defaultValues,
            roles: defaultValues.roles ? defaultValues.roles.map(r => r.id) : [],
        };
    }
    return { name: '', description: '', roles: [] };
};

const GroupForm = ({ onSubmit, defaultValues, allRoles }) => {
  const { t } = useTranslation('user_management');
  const isEditing = !!defaultValues;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: '', description: '', roles: [] },
  });

  useEffect(() => {
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
              label={t('user_management.groups.form.name')}
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
              label={t('user_management.groups.form.description')}
              error={!!errors.description}
              helperText={errors.description?.message}
              multiline
              rows={3}
              disabled={isEditing && defaultValues?.built_in}
            />
          )}
        />
        
        <Typography variant="h6" sx={{ mt: 2 }}>{t('user_management.groups.form.roles_title')}</Typography>
        <Controller
            name="roles"
            control={control}
            render={({ field }) => (
                <TransferList
                    allItems={allRoles || []}
                    selectedIds={field.value}
                    onChange={field.onChange}
                    disabled={isEditing && defaultValues?.built_in}
                />
            )}
        />

        <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={isEditing && defaultValues?.built_in}>
          {isEditing ? t('user_management.groups.form.save_changes') : t('user_management.groups.form.create_group')}
        </Button>
      </Box>
    </form>
  );
};

export default GroupForm;
