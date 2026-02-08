import { http, HttpResponse } from 'msw';
import { API_ENDPOINTS } from '../shared/constants/apiEndpoints';
import { MOCK_API_MESSAGES, type MockUser, type MockRole, type MockPermission } from './mockData';

// --- Мок-данные пользователей ---
let users: MockUser[] = [];
let nextUserId = 3;

// --- Мок-данные ролей ---
let roles: MockRole[] = [];
let nextRoleId = 3;

// --- Мок-данные разрешений ---
let permissions: MockPermission[] = [];

const apiPrefix = '/api/v1';

// --- Утилиты сброса ---
export const resetUsers = (): void => {
    users = [
        { id: 1, login: 'mockuser1', name: 'Mock User One', auth_type: 'local', created_at: '2025-01-01', is_active: true },
        { id: 2, login: 'mockuser2', name: 'Mock User Two', auth_type: 'ldap', created_at: '2025-01-02', is_active: false },
    ];
    nextUserId = 3;
};

export const resetPermissions = (): void => {
    permissions = [
        { id: 1, name: 'users:view', description: 'View users, roles, and groups' },
        { id: 2, name: 'users:create', description: 'Create users, roles, and groups' },
        { id: 3, name: 'users:update', description: 'Update users, roles, and groups' },
        { id: 4, name: 'users:delete', description: 'Delete users, roles, and groups' },
    ];
};

export const resetRoles = (): void => {
    roles = [
        {
            id: 1, name: 'Admin', description: 'Administrator role', built_in: true, created_at: '2025-01-01', permissions: [
                { id: 1, name: 'users:view', description: 'View users, roles, and groups' },
                { id: 2, name: 'users:create', description: 'Create users, roles, and groups' },
                { id: 3, name: 'users:update', description: 'Update users, roles, and groups' },
                { id: 4, name: 'users:delete', description: 'Delete users, roles, and groups' },
            ]
        },
        {
            id: 2, name: 'Viewer', description: 'Read-only role', built_in: false, created_at: '2025-01-02', permissions: [
                { id: 1, name: 'users:view', description: 'View users, roles, and groups' },
            ]
        },
    ];
    nextRoleId = 3;
};

// Инициализация данных при загрузке
resetUsers();
resetRoles();
resetPermissions();


export const handlers = [
    // Обработчики авторизации
    http.post(`*${apiPrefix}${API_ENDPOINTS.AUTH.LOGIN}`, async ({ request }) => {
        const body = await request.json() as { login?: string; password?: string };
        const { login, password } = body;

        if (login === 'testuser' && password === 'password') {
            return HttpResponse.json({ access_token: 'mock-token' });
        } else {
            return HttpResponse.json({ detail: MOCK_API_MESSAGES.LOGIN_ERROR }, { status: 401 });
        }
    }),
    http.get(`*${apiPrefix}${API_ENDPOINTS.AUTH.PROFILE}`, () => {
        return HttpResponse.json({ id: 1, login: 'testuser', name: 'Test User' });
    }),
    http.get(`*${apiPrefix}${API_ENDPOINTS.AUTH.REFRESH}`, () => {
        return HttpResponse.json({ detail: 'Could not refresh token' }, { status: 401 });
    }),

    // --- Обработчики управления пользователями ---
    http.get(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.USERS}`, ({ request }) => {
        const url = new URL(request.url);
        const skip = parseInt(url.searchParams.get('skip') || '0', 10);
        const limit = parseInt(url.searchParams.get('limit') || '10', 10);
        const paginatedUsers = users.slice(skip, skip + limit);
        return HttpResponse.json({ users: paginatedUsers, total: users.length });
    }),

    http.post(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.USERS}`, async ({ request }) => {
        const newUser = await request.json() as Partial<MockUser>;
        // Гарантируем, что обязательные поля обработаны или замоканы, если отсутствуют в запросе
        const user: MockUser = {
            id: nextUserId++,
            login: newUser.login || 'unknown',
            name: newUser.name || 'Unknown',
            auth_type: 'local',
            created_at: new Date().toISOString(),
            is_active: true,
            ...newUser
        };
        users.push(user);
        return HttpResponse.json(user, { status: 201 });
    }),

    http.delete(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.USERS}/:id`, ({ params }) => {
        const { id } = params;
        const initialLength = users.length;
        if (typeof id === 'string') {
            users = users.filter(user => user.id !== parseInt(id, 10));
        }
        return new HttpResponse(null, { status: users.length < initialLength ? 204 : 404 });
    }),

    // --- Обработчики управления ролями ---
    http.get(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.ROLES}`, ({ request }) => {
        const url = new URL(request.url);
        const skip = parseInt(url.searchParams.get('skip') || '0', 10);
        const limit = parseInt(url.searchParams.get('limit') || '10', 10);
        const paginatedRoles = roles.slice(skip, skip + limit);
        return HttpResponse.json({ roles: paginatedRoles, total: roles.length });
    }),

    http.post(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.ROLES}`, async ({ request }) => {
        const newRole = await request.json() as Partial<MockRole>;
        const role: MockRole = {
            id: nextRoleId++,
            name: newRole.name || 'New Role',
            description: newRole.description || '',
            built_in: false,
            created_at: new Date().toISOString(),
            permissions: []
        };
        roles.push(role);
        return HttpResponse.json(role, { status: 201 });
    }),

    http.put(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.ROLES}/:id`, async ({ params, request }) => {
        const { id } = params;
        const updatedData = await request.json() as { permissions: number[] } & Partial<MockRole>;

        if (typeof id !== 'string') return new HttpResponse(null, { status: 400 });

        let roleFound = false;
        roles = roles.map(role => {
            if (role.id === parseInt(id, 10)) {
                roleFound = true;
                // Предлагаем, что updatedData.permissions - это массив ID
                const newPermissions = permissions.filter(p => updatedData.permissions?.includes(p.id));
                return { ...role, ...updatedData, permissions: newPermissions };
            }
            return role;
        });
        const updatedRole = roles.find(role => role.id === parseInt(id, 10));
        return HttpResponse.json(updatedRole, { status: roleFound ? 200 : 404 });
    }),

    http.delete(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.ROLES}/:id`, ({ params }) => {
        const { id } = params;
        if (typeof id !== 'string') return new HttpResponse(null, { status: 400 });

        const initialLength = roles.length;
        roles = roles.filter(role => role.id !== parseInt(id, 10));
        return new HttpResponse(null, { status: roles.length < initialLength ? 204 : 404 });
    }),

    // --- Обработчики управления разрешениями ---
    http.get(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.PERMISSIONS}`, () => {
        return HttpResponse.json(permissions);
    }),
];
