import { useState, useEffect } from "react";
import { authApi } from "../api/authApi";
import { ROUTES } from "../../../shared/constants/routes";
import { TOKEN_KEY } from "../../../shared/constants/keys";

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUser = async () => {
        try {
            const userData = await authApi.getCurrentUser();
            setUser(userData);
        } catch {
            setUser(null);
        } finally {
            setLoading(false)
        }
    };

    const login = async ({ login, password }) => {
        try {
            const data = await authApi.login(login, password);
            localStorage.setItem(TOKEN_KEY, data.access_token);
            setError(null);
            await fetchUser();
            return true;
        } catch (err) {
            console.error("Login error", err);
            const message = err.response?.data?.detail || "Authorization error"
            setError(message);
            return false;
        }
    }

    const logout = async () => {
        try {
            await authApi.logout();
        } catch {

        } finally {
            localStorage.removeItem(TOKEN_KEY);
            setUser(null);
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
        }
        
    }, []);

    return {user, setUser, loading, error, login, logout, clearError};
}