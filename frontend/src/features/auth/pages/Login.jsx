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

  const {login, error, loading} = useAuthContext();

  const onSubmit = async (data) => {
    const success = await login(data);
    if (success) navigate(ROUTES.HOME);
  };

  // const [showMessage, setShowMessage] = React.useState(false)
  // const [textMessage, setTextMessage] = React.useState('')
  // const [severityMessage, setSeverityMessage] = React.useState('')
  // const [titleMessage, setTitleMessage] = React.useState('')

  // const submission = (data) => {
  //   AxiosInstance.post(`auth/login/`, {
  //     login: data.login,
  //     password: data.password,
  //   }).then((response) => {
  //     console.log(response)
  //     localStorage.setItem('Token', response.data.access_token)
  //     navigate('/home')
  //   }).catch((error) => {
  //     const text = error.response?.data?.detail || "Authorization Error"
  //     setTextMessage(text)
  //     setSeverityMessage('error')
  //     setTitleMessage(t('alert_message.error'))
  //     setShowMessage(true)
  //     console.error('Error during login', error)
  //   })
  // }

  return (
    
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: 2,
      }}
    >
      <Typography variant="h4" gutterBottom>
        {t('login_page.title')}
      </Typography>

      <LoginAlert message={error} />

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
        <Button disabled={changeLanguage == "en"} onClick={() => changeLanguage('en')}>EN</Button>
        <Button disabled={changeLanguage == "ru"} onClick={() => changeLanguage('ru')}>RU</Button>
      </Box>
    </Box>

  );
};

export default Login;