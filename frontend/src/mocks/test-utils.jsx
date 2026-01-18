import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { vi } from 'vitest';
import i18n from 'i18next';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import { AuthProvider } from '../app/providers/AuthProvider';
import { PermissionsProvider } from '../app/providers/PermissionsProvider';
import { ToastProvider } from '../app/providers/ToastProvider';
import { useAuth } from '../features/auth/hooks/useAuth';

// Import translations
import userManagementTranslations from '../i18n/locales/en/user_management.json';
import commonTranslations from '../i18n/locales/en/common.json';
import layoutTranslations from '../i18n/locales/en/layout.json';
import settingsTranslations from '../i18n/locales/en/settings.json';


// Mock the actual hooks we want to control
vi.mock('../features/auth/hooks/useAuth');

// Create a new i18n instance
const i18nTest = i18n.createInstance();

// Initialize the i18n instance
i18nTest.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['user_management', 'common', 'layout', 'settings'],
  defaultNS: 'common',
  resources: {
    en: {
      user_management: userManagementTranslations,
      common: commonTranslations,
      layout: layoutTranslations,
      settings: settingsTranslations,
    },
  },
  interpolation: {
    escapeValue: false, // Not needed for React
  },
  // Return the key if the translation is not found
  fallback: (lng, ns, key) => key,
});


const AllTheProviders = ({ children, initialEntries }) => {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <I18nextProvider i18n={i18nTest}>
        <AuthProvider>
          <ToastProvider>
            <PermissionsProvider>{children}</PermissionsProvider>
          </ToastProvider>
        </AuthProvider>
      </I18nextProvider>
    </MemoryRouter>
  );
};

const renderWithProviders = (
  ui,
  {
    authHookValue: providedAuthHookValue = {},
    initialEntries = ['/'], // Default to root path if not provided
    ...renderOptions
  } = {}
) => {
  const defaultAuthHookValue = {
    user: null,
    permissions: [],
    loading: false,
    logout: vi.fn(),
  };

  const authHookValue = { ...defaultAuthHookValue, ...providedAuthHookValue };
  // Set the mock return value for the useAuth hook before rendering
  useAuth.mockImplementation(() => authHookValue);

  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider theme={createTheme()}>
        <AllTheProviders initialEntries={initialEntries}>{children}</AllTheProviders>
      </ThemeProvider>
    ),
    ...renderOptions,
  });
};

// Re-export everything from testing-library
export * from '@testing-library/react';
// Override the render method with our custom one
export { renderWithProviders as render };
