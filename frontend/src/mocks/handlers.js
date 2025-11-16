import { http, HttpResponse } from 'msw';
import { API_ENDPOINTS } from '../shared/constants/apiEndpoints';
import { MOCK_API_MESSAGES } from './mockData';

// Define the initial mock data
let users = [
    { id: 1, login: 'mockuser1', name: 'Mock User One', auth_type: 'local', created_at: '2025-01-01', is_active: true },
    { id: 2, login: 'mockuser2', name: 'Mock User Two', auth_type: 'ldap', created_at: '2025-01-02', is_active: false },
];

let nextUserId = 3;
const apiPrefix = '/api/v1';

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

    // User management handlers
    http.get(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.USERS}`, ({ request }) => {
        const url = new URL(request.url);
        const skip = parseInt(url.searchParams.get('skip') || '0', 10);
        const limit = parseInt(url.searchParams.get('limit') || '10', 10);
        
        const paginatedUsers = users.slice(skip, skip + limit);

        return HttpResponse.json({
            users: paginatedUsers,
            total: users.length,
        });
    }),

    http.post(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.USERS}`, async ({ request }) => {
        const newUser = await request.json();
        const user = {
            id: nextUserId++,
            ...newUser,
            created_at: new Date().toISOString(),
            is_active: true,
            auth_type: 'local', // Assuming default
        };
        users.push(user);
        return HttpResponse.json(user, { status: 201 });
    }),

    http.delete(`*${apiPrefix}${API_ENDPOINTS.USER_MANAGEMENT.USERS}/:id`, ({ params }) => {
        const { id } = params;
        const initialLength = users.length;
        users = users.filter(user => user.id !== parseInt(id, 10));
        
        if (users.length < initialLength) {
            return new HttpResponse(null, { status: 204 });
        } else {
            return new HttpResponse(null, { status: 404 });
        }
    }),
];

// Utility to reset users for clean tests
export const resetUsers = () => {
    users = [
        { id: 1, login: 'mockuser1', name: 'Mock User One', auth_type: 'local', created_at: '2025-01-01', is_active: true },
        { id: 2, login: 'mockuser2', name: 'Mock User Two', auth_type: 'ldap', created_at: '2025-01-02', is_active: false },
    ];
    nextUserId = 3;
};
