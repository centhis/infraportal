import { useState, useEffect } from "react";
import { authApi } from "../api/authApi";
import { ROUTES } from "../../../shared/constants/routes";
import { TOKEN_KEY } from "../../../shared/constants/keys";

export function useAuth() {
    const [user, setUser] = useState(null);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUser = async () => {
        try {
            const userData = await authApi.getCurrentUser();
            setUser(userData);
            setPermissions(userData.permissions || []);
        } catch {
            setUser(null);
            setPermissions([]);
        } finally {
            setLoading(false)
        }
    };

    const login = async ({ login, password }) => {
        try {
            setLoading(true);
            const loginData = await authApi.login(login, password);
            localStorage.setItem(TOKEN_KEY, loginData.access_token);
            setPermissions(loginData.permissions); // Set permissions immediately from login response

            const userData = await authApi.getCurrentUser();
            setUser(userData);
            
            // Permissions from /me should be the most up-to-date
            setPermissions(userData.permissions || []); 

            setError(null);
            return true;
        } catch (err) {
            console.error("Login error:", err);
            const message = err.response?.data?.detail || "Authorization error";
            setError(message);
            // Cleanup on failure
            localStorage.removeItem(TOKEN_KEY);
            setUser(null);
            setPermissions([]);
            return false;
        } finally {
            setLoading(false);
        }
    }

    const logout = async () => {
        try {
            await authApi.logout();
        } catch {
            // Suppress errors during logout, as cleanup is handled in finally.
        } finally {
            localStorage.removeItem(TOKEN_KEY);
            setUser(null);
            setPermissions([]); // Clear permissions on logout
            window.location.href = ROUTES.LOGIN
        }
    };

    const clearError = () => {
        setError(null);
    };

    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY)
        if (token){
            fetchUser();
        } else {
            setLoading(false);
            setPermissions([]); // Ensure permissions are empty if no token
        }
        
    }, []);

    // Add permissions to the returned object
    return {user, setUser, permissions, setPermissions, loading, error, login, logout, clearError};
}