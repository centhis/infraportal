export const MOCK_API_MESSAGES = {
    LOGIN_ERROR: 'Incorrect username or password',
} as const;

export interface MockPermission {
    id: number;
    name: string;
    description: string;
}

export interface MockRole {
    id: number;
    name: string;
    description: string;
    built_in: boolean;
    created_at: string;
    permissions: MockPermission[];
}

export interface MockUser {
    id: number;
    login: string;
    name: string;
    auth_type: 'local' | 'ldap';
    created_at: string;
    is_active: boolean;
}
