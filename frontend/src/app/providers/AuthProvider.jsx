import React, { Children, createContext, useContext } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const { user, setUser, logout, loading, login } = useAuth();

    return (
        <AuthContext.Provider value={{ user, setUser, logout, loading, login }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuthContext must be used within an AuthProvider");
    }
    return context;
};