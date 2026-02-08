/**
 * Правило: comments-in-russian
 * Проверяет, что комментарии в коде написаны на русском языке.
 *
 * Исключения:
 * - URL (http://, https://)
 * - ESLint директивы (eslint-disable, eslint-enable)
 * - Комментарии без текста (только символы, числа)
 */

// Регулярка для кириллицы
const CYRILLIC_REGEX = /[\u0400-\u04FF]/;

// Регулярка для латиницы (для определения, что есть слова на английском)
const LATIN_WORD_REGEX = /[a-zA-Z]{2,}/;

// Паттерны исключений
const EXCLUSION_PATTERNS = [
    /^https?:\/\//i, // URL
    /eslint-disable/i, // ESLint disable
    /eslint-enable/i, // ESLint enable
    /^@ts-/i, // TypeScript директивы
    /^prettier-ignore/i, // Prettier
    /^vitest-environment/i, // Vitest
];

// Проверяет, содержит ли текст только символы без слов
const hasNoWords = (text) => {
    // Убираем все не-буквенные символы и проверяем, осталось ли что-то
    const words = text.replace(/[^a-zA-Zа-яА-ЯёЁ]/g, '');
    return words.length < 2;
};

// Проверяет, является ли текст исключением
const isExcluded = (text) => {
    const trimmed = text.trim();
    return EXCLUSION_PATTERNS.some((pattern) => pattern.test(trimmed));
};

// Извлекает текстовое содержимое комментария (убирает маркеры //, /*, */, *)
const extractCommentText = (value, type) => {
    let text = value;

    if (type === 'Block') {
        // Убираем начальные и конечные * в блочных комментариях
        text = text
            .split('\n')
            .map((line) => line.replace(/^\s*\*\s?/, '').trim())
            .join(' ');
    }

    return text.trim();
};

export default {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Комментарии должны быть на русском языке',
            category: 'Stylistic Issues',
        },
        messages: {
            shouldBeRussian:
                'Комментарий должен быть на русском языке: "{{text}}"',
        },
        schema: [],
    },

    create(context) {
        const sourceCode = context.sourceCode || context.getSourceCode();

        return {
            Program() {
                const comments = sourceCode.getAllComments();

                for (const comment of comments) {
                    const text = extractCommentText(comment.value, comment.type);

                    // Пропускаем пустые комментарии или без слов
                    if (!text || hasNoWords(text)) {
                        continue;
                    }

                    // Пропускаем исключения
                    if (isExcluded(text)) {
                        continue;
                    }

                    // Если есть латинские слова и НЕТ кириллицы — это нарушение
                    if (LATIN_WORD_REGEX.test(text) && !CYRILLIC_REGEX.test(text)) {
                        context.report({
                            loc: comment.loc,
                            messageId: 'shouldBeRussian',
                            data: {
                                text: text.length > 50 ? text.substring(0, 50) + '...' : text,
                            },
                        });
                    }
                }
            },
        };
    },
};
