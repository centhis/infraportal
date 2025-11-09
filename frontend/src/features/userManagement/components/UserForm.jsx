import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextField, Button, Box, FormControlLabel, Switch } from '@mui/material';
import { useTranslation } from 'react-i18next';

const userSchema = z.object({
  login: z.string().min(1, 'Login is required'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().optional(), // Optional for editing
  is_active: z.boolean(),
});

const UserForm = ({ onSubmit, defaultValues }) => {
  const { t } = useTranslation('user_management');
  const isEditing = !!defaultValues;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: defaultValues || { login: '', name: '', password: '', is_active: true },
  });

  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
    } else {
      reset({ login: '', name: '', password: '', is_active: true });
    }
  }, [defaultValues, reset]);

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
            />
          )}
        />
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch {...field} checked={field.value} />}
              label={t('user_management.users.form.is_active')}
            />
          )}
        />
        <Button type="submit" variant="contained" sx={{ mt: 2 }}>
          {isEditing ? t('user_management.users.form.save_changes') : t('user_management.users.form.create_user')}
        </Button>
      </Box>
    </form>
  );
};

export default UserForm;