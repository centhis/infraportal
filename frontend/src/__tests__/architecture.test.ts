/**
 * Архитектурные тесты
 *
 * Эти тесты проверяют, что кодовая база следует архитектурным правилам
 * относительно зависимостей модулей и импортов.
 *
 * Основной контроль осуществляется через eslint-plugin-boundaries,
 * но эти тесты служат документацией и дополнительной проверкой.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '../..');


/**
 * Рекурсивно получает все TypeScript/JavaScript файлы в директории
 */
function getFiles(dir: string, extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
        return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
            files.push(...getFiles(fullPath, extensions));
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
            files.push(fullPath);
        }
    }

    return files;
}

/**
 * Проверяет, содержит ли файл импорт, соответствующий определенному шаблону
 */
function hasImportFrom(filePath: string, pattern: RegExp): boolean {
    const content = fs.readFileSync(filePath, 'utf-8');
    return pattern.test(content);
}

describe('Architecture Rules', () => {
    describe('shared/ layer isolation', () => {
        it('shared/ should not import from modules/', () => {
            const sharedDir = path.join(SRC_DIR, 'shared');
            const sharedFiles = getFiles(sharedDir);

            const violations: string[] = [];

            for (const file of sharedFiles) {
                // Проверяем шаблоны @modules/ или from 'modules/ или from '../modules/
                if (hasImportFrom(file, /@modules\//)) {
                    violations.push(`${path.relative(SRC_DIR, file)}: imports from @modules/`);
                }
                if (hasImportFrom(file, /from\s+['"]\.\.\/modules\//)) {
                    violations.push(`${path.relative(SRC_DIR, file)}: imports from ../modules/`);
                }
            }

            expect(violations, `Found ${violations.length} violations:\n${violations.join('\n')}`).toHaveLength(0);
        });

        it('shared/ should not import from core/', () => {
            const sharedDir = path.join(SRC_DIR, 'shared');
            const sharedFiles = getFiles(sharedDir);

            const violations: string[] = [];

            for (const file of sharedFiles) {
                if (hasImportFrom(file, /@core\//)) {
                    violations.push(`${path.relative(SRC_DIR, file)}: imports from @core/`);
                }
                if (hasImportFrom(file, /from\s+['"]\.\.\/core\//)) {
                    violations.push(`${path.relative(SRC_DIR, file)}: imports from ../core/`);
                }
            }

            expect(violations, `Found ${violations.length} violations:\n${violations.join('\n')}`).toHaveLength(0);
        });
    });

    describe('Module structure', () => {
        it('all modules should have an index.ts or index.tsx file', () => {
            const modulesDir = path.join(SRC_DIR, 'modules');

            if (!fs.existsSync(modulesDir)) {
                return; // Пропускаем, если директория modules не существует
            }

            const modules = fs.readdirSync(modulesDir, { withFileTypes: true })
                .filter((entry: fs.Dirent) => entry.isDirectory())
                .map((entry: fs.Dirent) => entry.name);

            const missingIndex: string[] = [];

            for (const mod of modules) {
                const indexTs = path.join(modulesDir, mod, 'index.ts');
                const indexTsx = path.join(modulesDir, mod, 'index.tsx');

                if (!fs.existsSync(indexTs) && !fs.existsSync(indexTsx)) {
                    missingIndex.push(mod);
                }
            }

            // Это предупреждение, а не ошибка - некоторым модулям могут не потребоваться экспорты
            if (missingIndex.length > 0) {
                console.warn(`Modules without index.ts: ${missingIndex.join(', ')}`);
            }
        });
    });
});
