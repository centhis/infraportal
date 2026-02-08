/**
 * Интеграционный тест: Поток настроек LDAP
 * 
 * Тестирует страницу настроек LDAP и процесс проверки соединения
 */
import { render, screen, fireEvent, waitFor } from '../../mocks/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LdapSettingsPage } from '../../modules/settings/ui/pages/LdapSettingsPage';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';

const apiPrefix = '/api/v1';

// Мокаем переводы
vi.mock('react-i18next', async () => {
    const original = await vi.importActual('react-i18next');
    return {
        ...original,
        useTranslation: () => ({
            t: (key: string) => key,
        }),
    };
});

describe('LDAP Settings Integration', () => {
    const mockLdapSettings = {
        LDAP_ENABLED: { key: 'LDAP_ENABLED', value: 'true', type: 'boolean' },
        LDAP_URI: { key: 'LDAP_URI', value: 'ldap://localhost:389', type: 'string' },
        LDAP_BIND_DN: { key: 'LDAP_BIND_DN', value: 'cn=admin,dc=example,dc=com', type: 'string' },
        LDAP_BIND_PASSWORD: { key: 'LDAP_BIND_PASSWORD', value: '', type: 'password' },
        LDAP_USER_SEARCH_BASE: { key: 'LDAP_USER_SEARCH_BASE', value: 'ou=users,dc=example,dc=com', type: 'string' },
        LDAP_USER_FILTER: { key: 'LDAP_USER_FILTER', value: '(uid={username})', type: 'string' },
    };

    beforeEach(() => {
        server.use(
            // Получение настроек LDAP - используется /settings/ldap
            http.get(`*${apiPrefix}/settings/ldap`, () => {
                return HttpResponse.json(Object.values(mockLdapSettings));
            }),
            // Получение статуса включения LDAP - используется /settings/ldap/is_enabled
            http.get(`*${apiPrefix}/settings/ldap/is_enabled`, () => {
                return HttpResponse.json({ enabled: true });
            }),
            // Обновление настройки LDAP
            http.put(`*${apiPrefix}/settings/ldap/:key`, async ({ params, request }) => {
                const body = await request.json() as { value: string };
                return HttpResponse.json({
                    key: params['key'],
                    value: body.value,
                    type: 'string',
                });
            }),
            // Тест соединения LDAP - используется /settings/ldap/test
            http.post(`*${apiPrefix}/settings/ldap/test`, () => {
                return HttpResponse.json({ success: true, message: 'Connection successful' });
            })
        );
    });

    it('should render LDAP settings page with settings', async () => {
        render(<LdapSettingsPage />, {
            authHookValue: {
                user: { id: 1, permissions: ['settings:view', 'settings:update'] },
                permissions: ['settings:view', 'settings:update'],
            },
        });

        // Ожидание загрузки настроек
        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        // Проверка заголовка страницы
        expect(await screen.findByText(/ldap.title/i)).toBeInTheDocument();
    });

    it('should display test connection button', async () => {
        render(<LdapSettingsPage />, {
            authHookValue: {
                user: { id: 1, permissions: ['settings:view', 'settings:update'] },
                permissions: ['settings:view', 'settings:update'],
            },
        });

        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        // Поиск кнопки проверки соединения по ключу перевода
        // LdapSettingsPage использует t('ldap.test_connection', 'Test Connection')
        const testButton = await screen.findByRole('button', { name: /ldap.test_connection/i });
        expect(testButton).toBeInTheDocument();
    });

    it('should test LDAP connection successfully', async () => {
        render(<LdapSettingsPage />, {
            authHookValue: {
                user: { id: 1, permissions: ['settings:view', 'settings:update'] },
                permissions: ['settings:view', 'settings:update'],
            },
        });

        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        const testButton = await screen.findByRole('button', { name: /ldap.test_connection/i });
        fireEvent.click(testButton);

        // Проверка появления сообщения об успехе
        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument();
            expect(screen.getByText(/Connection successful/i)).toBeInTheDocument();
        }, { timeout: 5000 });
    });

    it('should handle LDAP connection test failure', async () => {
        server.use(
            http.post(`*${apiPrefix}/settings/ldap/test`, () => {
                return HttpResponse.json(
                    { success: false, message: 'Connection failed: timeout' },
                    { status: 200 }
                );
            })
        );

        render(<LdapSettingsPage />, {
            authHookValue: {
                user: { id: 1, permissions: ['settings:view', 'settings:update'] },
                permissions: ['settings:view', 'settings:update'],
            },
        });

        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        const testButton = await screen.findByRole('button', { name: /ldap.test_connection/i });
        fireEvent.click(testButton);

        // Проверка предупреждения об ошибке
        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument();
            expect(screen.getByText(/Connection failed|timeout/i)).toBeInTheDocument();
        }, { timeout: 5000 });
    });
});
