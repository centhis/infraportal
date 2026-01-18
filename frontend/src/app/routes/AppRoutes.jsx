import { Routes, Route, Navigate } from "react-router-dom"

import { ROUTES } from "../../shared/constants/routes";
import { useAuthContext } from "../providers/AuthProvider";
import ProtectedRoute from "./ProtectedRoute";

import Navbar from "../../components/layout/Navbar/Navbar";

import Login from "../../features/auth/pages/Login";
import Home from "../../features/contentPages/pages/Home";
import About from "../../features/contentPages/pages/About";
import UserManagementPage from "../../features/userManagement/pages/UserManagementPage";
import SettingsPage from "../../features/settings/pages/SettingsPage";


export default function AppRoutes() {
    console.log("AppRoutes render");
    const { user, loading } = useAuthContext();

    if (loading) return null;

    return (
        <Routes>
            <Route path={ROUTES.LOGIN} element={user ? < Navigate to={ROUTES.HOME} /> : <Login />} />

            <Route element={<ProtectedRoute />}>
                <Route element={<Navbar />}>
                    <Route path={ROUTES.HOME} element={<Home />} />
                    <Route path={ROUTES.ABOUT} element={<About />} />
                    <Route path={ROUTES.USER_MANAGEMENT} element={<UserManagementPage />} />
                    <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
                </Route>
            </Route>
        </Routes>

    )
}