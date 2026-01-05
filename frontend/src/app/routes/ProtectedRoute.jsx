import { Navigate, Outlet } from "react-router-dom";
import { useAuthContext } from "../providers/AuthProvider";
import { ROUTES } from "../../shared/constants/routes";

export default function ProtectedRoute() {
    const { user, loading } = useAuthContext();

    console.log("ProtectedRoute render", { user, loading });

    if (loading) return null;

    if (!user) {
        return <Navigate to={ROUTES.LOGIN} replace />;
    }

    return <Outlet />;
}