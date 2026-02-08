import { createContext, useContext, type ReactNode, useMemo } from 'react';
import { useAuth } from '../../modules/auth/ui/hooks/useAuth';
import type { CurrentUser } from '../../modules/auth/api/auth.dto';

export interface AuthContextValue {
    user: CurrentUser | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    permissions: string[];
}

const AuthContext = createContext<AuthContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthContext(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
}

export interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const { user, loading, login: hookLogin, logout: hookLogout } = useAuth();

    const value: AuthContextValue = useMemo(() => ({
        user: user as CurrentUser | null,
        loading,
        login: async (username, password) => {
            await hookLogin({ login: username, password });
        },
        logout: async () => {
            await hookLogout();
        },
        permissions: (user as CurrentUser)?.permissions || [],
    }), [user, loading, hookLogin, hookLogout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
