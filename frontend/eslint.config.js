import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactPlugin from 'eslint-plugin-react';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import boundaries from 'eslint-plugin-boundaries';
import langRules from './eslint-plugin-lang-rules/index.js';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  // Architecture boundaries rules
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app/*' },
        { type: 'core', pattern: 'src/core/*' },
        { type: 'shared', pattern: 'src/shared/*' },
        { type: 'module', pattern: 'src/modules/*', capture: ['module'] },
        { type: 'tests', pattern: 'src/__tests__/*' },
        { type: 'mocks', pattern: 'src/mocks/*' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            // app может импортировать всё
            { from: 'app', allow: ['app', 'core', 'shared', 'module'] },
            // core может импортировать shared и modules (для UI-интеграции в Navbar)
            { from: 'core', allow: ['core', 'shared', 'module'] },
            // modules могут импортировать shared, core и другие modules
            { from: 'module', allow: ['shared', 'core', 'module'] },
            // shared может импортировать только shared (изоляция)
            { from: 'shared', allow: ['shared'] },
            // tests могут импортировать всё
            { from: 'tests', allow: ['app', 'core', 'shared', 'module', 'tests', 'mocks'] },
            // mocks могут импортировать shared и modules
            { from: 'mocks', allow: ['shared', 'module', 'mocks', 'core'] },
          ],
        },
      ],
      // Запретить импорт внутренностей модуля напрямую (только через index.ts)
      'boundaries/entry-point': [
        'warn',
        {
          default: 'disallow',
          rules: [
            // Разрешить импорт из index файлов модуля
            { target: 'module', allow: ['index.ts', 'index.tsx', '**/*'] },
            // Разрешить всё для остальных
            { target: ['app', 'core', 'shared', 'tests', 'mocks'], allow: '**/*' },
          ],
        },
      ],
    },
  },
  // JavaScript files (legacy, для постепенной миграции)
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
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
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'react-refresh/only-export-components': 'warn',
      'react/prop-types': 'off',
      'react/display-name': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.eslint.json',
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      // Отключаем JS правила в пользу TS-версий
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-refresh/only-export-components': 'warn',
      'react/prop-types': 'off',
      'react/display-name': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // Test files
  {
    files: ['**/*.test.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
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
      'no-console': 'off',
    },
  },
  // Language rules - комментарии на русском, логи и ошибки на английском
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'lang-rules': langRules,
    },
    rules: {
      'lang-rules/comments-in-russian': 'warn',
      'lang-rules/logs-in-english': 'warn',
      'lang-rules/errors-in-english': 'warn',
    },
  },
]);