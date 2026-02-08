import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Button, TextField } from '@shared/ui';
import { useI18n } from '@core/providers';
import { useToast } from '@core/providers/ToastProvider';
import { ROUTES } from '@shared/constants/routes';
import { useAuth } from '../hooks/useAuth';
import type { LoginRequest } from '../../api/auth.dto';

/**
 * Страница авторизации
 */
export function LoginPage() {
    const { t } = useTranslation('auth');
    const { currentLanguage, changeLanguage } = useI18n();
    const { showError } = useToast();
    const navigate = useNavigate();
    const { login, error, loading, isAuthenticated } = useAuth();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginRequest>({
        defaultValues: {
            login: '',
            password: '',
        },
    });

    // Редирект если уже авторизован
    useEffect(() => {
        if (isAuthenticated) {
            navigate(ROUTES.HOME);
        }
    }, [isAuthenticated, navigate]);

    // Показ ошибки через Toast
    useEffect(() => {
        if (error) {
            // Пытаемся перевести ошибку, если она есть в словаре.
            // Если нет, выводим как есть (для fallbacks)
            const translatedError = t(`auth:errors.${error}`, error);
            showError(translatedError);
        }
    }, [error, showError, t]);

    const onSubmit: SubmitHandler<LoginRequest> = async (data) => {
        const success = await login(data);
        if (success) {
            navigate(ROUTES.HOME);
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                padding: 2,
                position: 'relative',
            }}
        >
            <Typography variant="h4" gutterBottom>
                {t('login_page.title')}
            </Typography>

            <Box
                component="form"
                onSubmit={handleSubmit(onSubmit)}
                sx={{ width: '100%', maxWidth: 400 }}
            >
                <TextField
                    {...register('login', { required: true })}
                    label={t('login_page.login')}
                    fullWidth
                    margin="normal"
                    error={!!errors.login}
                    helperText={errors.login ? t('login_page.required') : undefined}
                    autoComplete="username"
                />

                <TextField
                    {...register('password', { required: true })}
                    label={t('login_page.password')}
                    type="password"
                    fullWidth
                    margin="normal"
                    error={!!errors.password}
                    helperText={errors.password ? t('login_page.required') : undefined}
                    autoComplete="current-password"
                />

                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    loading={loading}
                    sx={{ marginTop: 2 }}
                >
                    {t('login_page.submit')}
                </Button>
            </Box>

            <Box sx={{ marginTop: 2 }}>
                <Button
                    disabled={currentLanguage === 'en'}
                    onClick={() => changeLanguage('en')}
                >
                    EN
                </Button>
                <Button
                    disabled={currentLanguage === 'ru'}
                    onClick={() => changeLanguage('ru')}
                >
                    RU
                </Button>
            </Box>
        </Box>
    );
}
