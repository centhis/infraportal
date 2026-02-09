/**
 * ESLint Plugin: lang-rules
 * Плагин для проверки языковых требований кода.
 *
 * Правила:
 * - comments-in-russian: Комментарии должны быть на русском
 * - logs-in-english: console.* должны быть на английском
 * - errors-in-english: throw new Error() должны быть на английском
 */

import commentsInRussian from './rules/comments-in-russian.js';
import logsInEnglish from './rules/logs-in-english.js';
import errorsInEnglish from './rules/errors-in-english.js';

export default {
    meta: {
        name: 'eslint-plugin-lang-rules',
        version: '1.0.0',
    },
    rules: {
        'comments-in-russian': commentsInRussian,
        'logs-in-english': logsInEnglish,
        'errors-in-english': errorsInEnglish,
    },
    configs: {
        recommended: {
            rules: {
                'lang-rules/comments-in-russian': 'warn',
                'lang-rules/logs-in-english': 'warn',
                'lang-rules/errors-in-english': 'warn',
            },
        },
    },
};
