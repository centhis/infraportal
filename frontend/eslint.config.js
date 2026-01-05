import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactPlugin from 'eslint-plugin-react'; // Import reactPlugin
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: ['dist/**'],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react': reactPlugin, // Add reactPlugin here
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['error', { 'varsIgnorePattern': '^_', 'argsIgnorePattern': '^_', 'caughtErrorsIgnorePattern': '^_', 'ignoreRestSiblings': true }],
      'react-refresh/only-export-components': 'warn',
      // Rules for React 17+ where React import is not always needed
      'react/prop-types': 'off', // Temporarily turn off prop-types to focus on other errors
      'react/display-name': 'off', // Temporarily turn off display-name to focus on other errors
    },
    settings: {
        react: {
            version: 'detect', // Automatically detect the React version
        },
    },
  },
  {
    files: ['**/*.test.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node, // Test files often use Node.js globals like 'module'
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    rules: {
        'no-console': 'off', // Allow console.log in tests
    },
  },
]);