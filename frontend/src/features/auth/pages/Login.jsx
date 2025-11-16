import * as React from 'react';
import { Button, Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';

import LoginTextField from '../components/LoginFormFields/LoginTextField';
import LoginPassField from '../components/LoginFormFields/LoginPassField';
import LoginAlert from '../components/LoginAlert';
import { useI18n } from '../../../app/providers/I18nProvider';
import { ROUTES } from '../../../shared/constants/routes';
import { useAuthContext } from '../../../app/providers/AuthProvider';


const Login = () => {
  
  const {t} = useTranslation('auth');
  const { currentLanguage, changeLanguage } = useI18n();
  const navigate = useNavigate();
  const {handleSubmit, control} = useForm({
    defaultValues: {
      login: '',
      password: ''
    }
  });

  const {login, error, loading, clearError} = useAuthContext(); // Destructure clearError

  const onSubmit = async (data) => {
    const success = await login(data);
    if (success) navigate(ROUTES.HOME);
  };

  React.useEffect(() => { // Use React.useEffect since React is imported as * as React
    if (error) {
      const timeout = Number(import.meta.env.VITE_ALERT_TIMEOUT || 15000); // Default to 15s
      const timer = setTimeout(() => {
        clearError();
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [error, clearError]); // Depend on error and clearError

  return (
    
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: 2,
        position: 'relative', // Make this the positioning context for absolute alert
      }}
    >
      {error && ( // Only render the alert container if there's an error
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            p: 2, // Padding around the alert
            zIndex: 1000, // Ensure it's above other content
          }}
        >
          <LoginAlert message={error} />
        </Box>
      )}

      <Typography variant="h4" gutterBottom>
        {t('login_page.title')}
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%', maxWidth: 400 }}>
        <LoginTextField
          label={t('login_page.login')}
          name={"login"}
          control = {control}
          fullWidth
          margin="normal"
        />
        <LoginPassField 
          label={t('login_page.password')}
          name={"password"}
          control={control}
          fullWidth
          margin="normal"
        />
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ marginTop: 2 }}
          disabled={loading}
        >
          {loading ? t("login_page.loading") : t("login_page.submit")}
        </Button> 
      </form>
      <Box sx={{ marginTop: 2 }}>
        {/* Пример переключения языка */}
        <Button disabled={currentLanguage == "en"} onClick={() => changeLanguage('en')}>EN</Button>
        <Button disabled={currentLanguage == "ru"} onClick={() => changeLanguage('ru')}>RU</Button>
      </Box>
    </Box>

  );
};

export default Login;