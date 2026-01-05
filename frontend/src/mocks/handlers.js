import { http, HttpResponse } from 'msw';
import { API_ENDPOINTS } from '../shared/constants/apiEndpoints';
import { MOCK_API_MESSAGES } from './mockData';

// --- Users Mock Data ---
let users = [];
let nextUserId = 3;

// --- Roles Mock Data ---
let roles = [];
let nextRoleId = 3;

// --- Permissions Mock Data ---
let permissions = [];

const apiPrefix = '/api/v1';

// --- Reset Utilities ---
export const resetUsers = () => {
    users = [
        { id: 1, login: 'mockuser1', name: 'Mock User One', auth_type: 'local', created_at: '2025-01-01', is_active: true },
        { id: 2, login: 'mockuser2', name: 'Mock User Two', auth_type: 'ldap', created_at: '2025-01-02', is_active: false },
    ];
    nextUserId = 3;
};

export const resetPermissions = () => {
    permissions = [
        { id: 1, name: 'users:view', description: 'View users, roles, and groups' },
        { id: 2, name: 'users:create', description: 'Create users, roles, and groups' },
        { id: 3, name: 'users:update', description: 'Update users, roles, and groups' },
        { id: 4, name: 'users:delete', description: 'Delete users, roles, and groups' },
    ];
};

export const resetRoles = () => {
    roles = [
        { id: 1, name: 'Admin', description: 'Administrator role', built_in: true, created_at: '2025-01-01', permissions: [
            { id: 1, name: 'users:view', description: 'View users, roles, and groups' },
            { id: 2, name: 'users:create', description: 'Create users, roles, and groups' },
            { id: 3, name: 'users:update', description: 'Update users, roles, and groups' },
            { id: 4, name: 'users:delete', description: 'Delete users, roles, and groups' },
        ]},
        { id: 2, name: 'Viewer', description: 'Read-only role', built_in: false, created_at: '2025-01-02', permissions: [
            { id: 1, name: 'users:view', description: 'View users, roles, and groups' },
        ]},
    ];
    nextRoleId = 3;
};

// Initialize data on load
resetUsers();
resetRoles();
resetPermissions();


export const handlers = [
    // Auth handlers
    http.post(`*${apiPrefix}${API_ENDPOINTS.AUTH.LOGIN}`, async ({ request }) => {
        const { login, password } = await request.json();
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

    // --- User Management Handlers ---
    http.get(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.USERS}`, ({ request }) => {
        const url = new URL(request.url);
        const skip = parseInt(url.searchParams.get('skip') || '0', 10);
        const limit = parseInt(url.searchParams.get('limit') || '10', 10);
        const paginatedUsers = users.slice(skip, skip + limit);
        return HttpResponse.json({ users: paginatedUsers, total: users.length });
    }),

    http.post(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.USERS}`, async ({ request }) => {
        const newUser = await request.json();
        const user = { id: nextUserId++, ...newUser, created_at: new Date().toISOString(), is_active: true, auth_type: 'local' };
        users.push(user);
        return HttpResponse.json(user, { status: 201 });
    }),

    http.delete(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.USERS}/:id`, ({ params }) => {
        const { id } = params;
        const initialLength = users.length;
        users = users.filter(user => user.id !== parseInt(id, 10));
        return new HttpResponse(null, { status: users.length < initialLength ? 204 : 404 });
    }),
    
    // --- Role Management Handlers ---
    http.get(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.ROLES}`, ({ request }) => {
        const url = new URL(request.url);
        const skip = parseInt(url.searchParams.get('skip') || '0', 10);
        const limit = parseInt(url.searchParams.get('limit') || '10', 10);
        const paginatedRoles = roles.slice(skip, skip + limit);
        return HttpResponse.json({ roles: paginatedRoles, total: roles.length });
    }),

    http.post(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.ROLES}`, async ({ request }) => {
        const newRole = await request.json();
        const role = { id: nextRoleId++, ...newRole, built_in: false, created_at: new Date().toISOString(), permissions: [] };
        roles.push(role);
        return HttpResponse.json(role, { status: 201 });
    }),
    
    http.put(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.ROLES}/:id`, async ({ params, request }) => {
        const { id } = params;
        const updatedData = await request.json();
        let roleFound = false;
        roles = roles.map(role => {
            if (role.id === parseInt(id, 10)) {
                roleFound = true;
                const newPermissions = permissions.filter(p => updatedData.permissions.includes(p.id));
                return { ...role, ...updatedData, permissions: newPermissions };
            }
            return role;
        });
        const updatedRole = roles.find(role => role.id === parseInt(id, 10));
        return HttpResponse.json(updatedRole, { status: roleFound ? 200 : 404 });
    }),

    http.delete(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.ROLES}/:id`, ({ params }) => {
        const { id } = params;
        const initialLength = roles.length;
        roles = roles.filter(role => role.id !== parseInt(id, 10));
        return new HttpResponse(null, { status: roles.length < initialLength ? 204 : 404 });
    }),

    // --- Permission Management Handlers ---
    http.get(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.PERMISSIONS}`, () => {
        return HttpResponse.json(permissions);
    }),
];
