import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English translations
import commonEN from './locales/en/common.json';
import authEN from './locales/en/auth.json';
import layoutEN from './locales/en/layout.json';
import userManagementEN from './locales/en/user_management.json';
import settingsEN from './locales/en/settings.json';

// Russian translations
import commonRU from './locales/ru/common.json';
import authRU from './locales/ru/auth.json';
import layoutRU from './locales/ru/layout.json';
import userManagementRU from './locales/ru/user_management.json';
import settingsRU from './locales/ru/settings.json';

const resources = {
  en: {
    common: commonEN,
    auth: authEN,
    layout: layoutEN,
    user_management: userManagementEN,
    settings: settingsEN,
  },
  ru: {
    common: commonRU,
    auth: authRU,
    layout: layoutRU,
    user_management: userManagementRU,
    settings: settingsRU,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: true,
    ns: ['common', 'auth', 'layout', 'user_management', 'settings'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;