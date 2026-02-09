/**
 * Правило: logs-in-english
 * Проверяет, что сообщения в console.log/warn/error/info/debug на английском языке.
 */

// Регулярка для кириллицы
const CYRILLIC_REGEX = /[\u0400-\u04FF]/;

// Методы console, которые проверяем
const CONSOLE_METHODS = ['log', 'warn', 'error', 'info', 'debug'];

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
            description: 'Сообщения в console.* должны быть на английском языке',
            category: 'Stylistic Issues',
        },
        messages: {
            shouldBeEnglish:
                'Сообщение в console.{{method}}() должно быть на английском: "{{text}}"',
        },
        schema: [],
    },

    create(context) {
        return {
            CallExpression(node) {
                // Проверяем, что это console.method()
                if (
                    node.callee.type !== 'MemberExpression' ||
                    node.callee.object.type !== 'Identifier' ||
                    node.callee.object.name !== 'console' ||
                    node.callee.property.type !== 'Identifier' ||
                    !CONSOLE_METHODS.includes(node.callee.property.name)
                ) {
                    return;
                }

                const method = node.callee.property.name;

                // Проверяем все аргументы
                for (const arg of node.arguments) {
                    const text = extractStringValue(arg);

                    if (text && CYRILLIC_REGEX.test(text)) {
                        context.report({
                            node: arg,
                            messageId: 'shouldBeEnglish',
                            data: {
                                method,
                                text: text.length > 50 ? text.substring(0, 50) + '...' : text,
                            },
                        });
                    }
                }
            },
        };
    },
};
