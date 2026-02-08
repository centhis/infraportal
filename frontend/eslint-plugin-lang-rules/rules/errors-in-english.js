/**
 * Правило: errors-in-english
 * Проверяет, что сообщения в throw new Error() на английском языке.
 */

// Регулярка для кириллицы
const CYRILLIC_REGEX = /[\u0400-\u04FF]/;

// Классы ошибок, которые проверяем
const ERROR_CLASSES = [
    'Error',
    'TypeError',
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'URIError',
    'EvalError',
];

// Извлекает строковое значение из литерала или шаблонной строки
const extractStringValue = (node) => {
    if (node.type === 'Literal' && typeof node.value === 'string') {
        return node.value;
    }
    if (node.type === 'TemplateLiteral') {
        // Собираем только статические части шаблона
        return node.quasis.map((q) => q.value.raw).join('');
    }
    return null;
};

export default {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Сообщения об ошибках должны быть на английском языке',
            category: 'Stylistic Issues',
        },
        messages: {
            shouldBeEnglish:
                'Сообщение об ошибке должно быть на английском: "{{text}}"',
        },
        schema: [],
    },

    create(context) {
        return {
            ThrowStatement(node) {
                // Проверяем throw new Error(...)
                if (
                    node.argument?.type !== 'NewExpression' ||
                    node.argument.callee?.type !== 'Identifier' ||
                    !ERROR_CLASSES.includes(node.argument.callee.name)
                ) {
                    return;
                }

                // Проверяем первый аргумент (сообщение об ошибке)
                const firstArg = node.argument.arguments?.[0];
                if (!firstArg) return;

                const text = extractStringValue(firstArg);

                if (text && CYRILLIC_REGEX.test(text)) {
                    context.report({
                        node: firstArg,
                        messageId: 'shouldBeEnglish',
                        data: {
                            text: text.length > 50 ? text.substring(0, 50) + '...' : text,
                        },
                    });
                }
            },
        };
    },
};
